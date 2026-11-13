<?php
require_once __DIR__ . '/mobile_common.php';
require_once __DIR__ . '/../gemini_helper.php';
require_once __DIR__ . '/../kindwise_helper.php';
require_once __DIR__ . '/../botanical_catalog.php';
require_once __DIR__ . '/../ai_client.php';
mobile_method(['POST']);
$user = mobile_user($pdo);
if (!mobile_settings($pdo)['ai_scanning_enabled']) mobile_fail('Plant scanning is currently paused.', 503);

$data = mobile_body();
$image = $data['image_base64'] ?? $data['image'] ?? $data['image_url'] ?? '';
if ($image === '' && !empty($data['images']) && is_array($data['images'])) {
    $first = $data['images'][0] ?? '';
    $image = is_array($first) ? ($first['image_base64'] ?? '') : $first;
}
if (!is_string($image) || strlen($image) > 8 * 1024 * 1024 || kindwise_image_payload($image) === null) {
    mobile_fail('A valid plant photo under 5 MB is required.');
}
$hint = trim((string)($data['hint'] ?? $data['name'] ?? ''));
$lang = strtolower(trim((string)($data['lang'] ?? 'en')));
$metrics = $data['metrics'] ?? null;

$localAi = pnapana_ai_request('/api/v1/identify', $image, ['hint' => $hint]);
$localAiMatch = null;
if (!empty($localAi['ok']) && !empty($localAi['data']['plant_name'])) {
    $localAiMatch = $localAi['data'];
}

$kindwiseMatch = null;
$kindwiseResponse = $localAiMatch === null ? kindwise_identify($image, $lang) : ['ok' => false, 'data' => null];
if (!empty($kindwiseResponse['ok'])) {
    $parsed = kindwise_top_identification($kindwiseResponse['data']);
    if (empty($parsed['is_plant'])) mobile_fail("That doesn't look like a plant. Try a clearer photo.", 422);
    $kindwiseMatch = $parsed['suggestion'] ?? null;
}

$prompt = "You are an expert botanist. Independently identify the plant in this photo and provide a complete care plan. Do not assume another provider is correct. "
    . ($hint !== '' ? "The user suggests this plant may be '{$hint}'. Verify it. " : '')
    . 'Return only JSON with: is_plant (boolean), species (string), common_name (string), confidence (high, medium, or low), description (string), and care_plan containing native_region, light {level, detail}, water {frequency_days, instructions}, humidity {level, detail}, soil, temperature, fertilizing, pruning, toxicity {pet_friendly, detail}, and common_issues [{issue, solution}].';

$result = null; $provider = null; $modelVersion = null; $numericConfidence = null;
$key = mobile_shared_gemini_key();
if ($localAiMatch !== null) {
    $result = identify_plant_fallback($image, (string)$localAiMatch['plant_name'], $lang, $metrics);
    $result['species'] = (string)($localAiMatch['scientific_name'] ?? $localAiMatch['plant_name']);
    $result['common_name'] = (string)$localAiMatch['plant_name'];
    $result['confidence'] = (string)($localAiMatch['confidence_level'] ?? 'medium');
    $result['uncertain'] = !empty($localAiMatch['uncertain']);
    $result['alternatives'] = $localAiMatch['alternatives'] ?? [];
    $recommendations = $localAiMatch['care_recommendations'] ?? [];
    if (is_array($recommendations) && count($recommendations)) $result['description'] = implode(' ', array_filter($recommendations, 'is_string'));
    $provider = 'pnapana-tensorflow';
    $modelVersion = $localAiMatch['model_version'] ?? null;
    $numericConfidence = isset($localAiMatch['confidence']) ? (float)$localAiMatch['confidence'] : null;
}
if ($result === null && $key !== '') {
    $result = gemini_vision_json_call($image, $prompt, $key);
    if (is_array($result)) $provider = 'gemini';
}
if (is_array($result) && isset($result['is_plant']) && !$result['is_plant'] && $hint === '') {
    mobile_fail("That doesn't look like a plant. Try a clearer photo.", 422);
}
if (!is_array($result) || empty($result['species']) || !isset($result['care_plan'])) {
    $result = identify_plant_fallback($image, $hint, $lang, $metrics);
    $provider = 'catalog';
}

if ($kindwiseMatch !== null) {
    $provider = $provider === 'gemini' ? 'kindwise+gemini' : 'kindwise';
    $numericConfidence = isset($kindwiseMatch['probability']) ? (float)$kindwiseMatch['probability'] : null;
    $geminiSpecies = strtolower(trim((string)($result['species'] ?? '')));
    $kindwiseSpecies = strtolower(trim((string)$kindwiseMatch['species']));
    $geminiGenus = explode(' ', preg_replace('/[^a-z0-9 ]+/', '', $geminiSpecies))[0] ?? '';
    $kindwiseGenus = explode(' ', preg_replace('/[^a-z0-9 ]+/', '', $kindwiseSpecies))[0] ?? '';
    $providersAgree = $geminiSpecies !== '' && ($geminiSpecies === $kindwiseSpecies || (strlen($geminiGenus) >= 4 && $geminiGenus === $kindwiseGenus));
    $strongAgreement = $providersAgree && $numericConfidence !== null && $numericConfidence >= 0.75;
    if ($strongAgreement || empty($result['species'])) {
        $result['is_plant'] = true;
        $result['species'] = $kindwiseMatch['species'];
        $result['common_name'] = $kindwiseMatch['common_name'];
        $result['confidence'] = $strongAgreement ? $kindwiseMatch['confidence'] : 'low';
        if (empty($result['description'])) $result['description'] = $kindwiseMatch['description'];
    }
    $result['uncertain'] = !$strongAgreement;
    $result['alternatives'] = $result['alternatives'] ?? [];
    foreach (($kindwiseResponse['data']['result']['classification']['suggestions'] ?? []) as $alternative) {
        if (!is_array($alternative) || empty($alternative['name']) || strtolower($alternative['name']) === strtolower((string)($result['species'] ?? ''))) continue;
        $names = $alternative['details']['common_names'] ?? [];
        $result['alternatives'][] = [
            'species' => $alternative['name'],
            'common_name' => is_array($names) ? ($names[0] ?? $alternative['name']) : $alternative['name'],
            'probability' => isset($alternative['probability']) ? (float)$alternative['probability'] : null
        ];
        if (count($result['alternatives']) >= 3) break;
    }
}

try {
    $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, NULL, 'ai_scan')")->execute([$user['id']]);
} catch (Throwable $e) {
    error_log('Mobile identification activity could not be recorded.');
}

$response = [
    'status' => 'success',
    'identification' => [
        'species' => $result['species'] ?? '',
        'common_name' => $result['common_name'] ?? ($result['species'] ?? ''),
        'confidence' => $result['confidence'] ?? 'medium',
        'description' => $result['description'] ?? ''
    ],
    'care_plan' => $result['care_plan'] ?? [],
    'alternatives' => $result['alternatives'] ?? [],
    'uncertain' => !empty($result['uncertain']),
    'hint_applied' => !empty($result['hint_applied']),
    'provider' => $provider ?: 'unknown',
    'model_version' => $modelVersion,
    'confidence_score' => $numericConfidence,
    'uncertainty_warnings' => $localAiMatch['uncertainty_warnings'] ?? []
];
$response['scan_history_id'] = mobile_record_ai_scan($pdo, $user['id'], null, 'identify', $response['provider'], $image, $response, $numericConfidence, !empty($response['uncertain']), $modelVersion);
echo json_encode($response);
