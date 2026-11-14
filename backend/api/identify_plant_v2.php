<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../activity_logger.php';
if (file_exists(__DIR__ . '/../config.php')) require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../gemini_helper.php';
require_once __DIR__ . '/../kindwise_helper.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
check_rate_limit('plant_identification', 40, 3600);
$data = json_decode(file_get_contents('php://input'), true) ?: [];

function pnapana_identification_images(array $data): array {
    $raw = [];
    if (!empty($data['images']) && is_array($data['images'])) {
        foreach ($data['images'] as $image) {
            if (is_string($image)) $raw[] = $image;
            elseif (is_array($image) && is_string($image['image_base64'] ?? null)) $raw[] = $image['image_base64'];
        }
    } elseif (is_string($data['image_base64'] ?? null)) $raw[] = $data['image_base64'];
    elseif (is_string($data['image'] ?? null)) $raw[] = $data['image'];
    elseif (is_string($data['image_url'] ?? null) && strpos($data['image_url'], 'data:image') === 0) $raw[] = $data['image_url'];
    $valid = [];
    foreach (array_slice($raw, 0, 4) as $image) if (kindwise_image_payload($image) !== null) $valid[] = $image;
    return $valid;
}

function pnapana_normalized_species(string $value): string {
    return preg_replace('/[^a-z0-9]+/', ' ', strtolower(trim($value))) ?: '';
}

function pnapana_species_agree(string $left, string $right): bool {
    $a = pnapana_normalized_species($left); $b = pnapana_normalized_species($right);
    if ($a === '' || $b === '') return false;
    if ($a === $b) return true;
    $aGenus = explode(' ', $a)[0] ?? ''; $bGenus = explode(' ', $b)[0] ?? '';
    return strlen($aGenus) >= 4 && $aGenus === $bGenus;
}

function pnapana_safe_probability($value): float {
    return max(0, min(1, is_numeric($value) ? (float)$value : 0));
}

$images = pnapana_identification_images($data);
if (!$images) {
    pnapana_write_application_log($pdo, 'warning', 'plant_identification_rejected', 'No valid plant images supplied.', (int)$user['id'], ['image_count' => 0], 400);
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Add at least one clear plant photo.']);
    exit;
}
try {
    $pdo->prepare("INSERT INTO analytics_events (user_id, event_name, metadata) VALUES (?, 'plant_scan_attempted', ?)")
        ->execute([$user['id'], json_encode(['image_count' => count($images)])]);
} catch (Throwable $ignored) {}
pnapana_log_user_activity($pdo, (int)$user['id'], 'plant_identification_requested', ['image_count' => count($images)]);

$lang = strtolower(trim((string)($data['lang'] ?? 'en')));
$kindwiseStarted = microtime(true);
$kindwiseResponse = kindwise_identify($images, $lang);
$kindwiseDuration = (int)round((microtime(true) - $kindwiseStarted) * 1000);
$kindwiseCandidates = !empty($kindwiseResponse['ok']) ? kindwise_identification_candidates($kindwiseResponse['data'], 3) : [];
$kindwisePlant = $kindwiseResponse['data']['result']['is_plant'] ?? [];
$geminiPrompt = 'Independently identify the same plant shown across these photos. Do not assume another provider is correct. '
    . 'Use whole-plant shape, leaf arrangement and venation, stem, flower, and growth habit. Return only JSON: '
    . '{"is_plant":boolean,"species":string,"common_name":string,"confidence_score":number,"description":string,'
    . '"distinguishing_features":[string],"alternatives":[{"species":string,"common_name":string,"confidence_score":number}]}. '
    . 'Confidence must be between 0 and 1. Be conservative for juvenile plants, cultivars, blur, or missing diagnostic features.';
$activeKey = pnapana_shared_gemini_key($pdo);
$geminiDiagnostic = gemini_vision_json_call_detailed($images, $geminiPrompt, $activeKey);
$gemini = $geminiDiagnostic['data'];
$kindwiseSuccess = !empty($kindwiseResponse['ok']);
pnapana_log_api_request($pdo, (int)$user['id'], 'kindwise', 'plant_identification', $kindwiseResponse['http_status'] ?? null,
    $kindwiseDuration, $kindwiseSuccess, $kindwiseResponse['error_code'] ?? null, ['image_count' => count($images), 'candidate_count' => count($kindwiseCandidates)]);
pnapana_log_api_request($pdo, (int)$user['id'], 'gemini', 'plant_identification', $geminiDiagnostic['http_status'] ?? null,
    (int)($geminiDiagnostic['duration_ms'] ?? 0), is_array($gemini), $geminiDiagnostic['error_code'] ?? null,
    ['image_count' => count($images), 'model' => $geminiDiagnostic['model'] ?? null]);
$geminiSpecies = trim((string)($gemini['species'] ?? ''));
$geminiCommonName = trim((string)($gemini['common_name'] ?? $geminiSpecies));
$geminiConfidence = pnapana_safe_probability($gemini['confidence_score'] ?? 0);

$candidates = $kindwiseCandidates;
if (!$candidates && $geminiSpecies !== '' && ($gemini['is_plant'] ?? true) !== false) {
    $candidates[] = ['species' => $geminiSpecies, 'common_name' => $geminiCommonName ?: $geminiSpecies,
        'probability' => $geminiConfidence, 'description' => (string)($gemini['description'] ?? ''), 'source' => 'gemini'];
}
if ($geminiSpecies !== '' && !array_filter($candidates, fn($candidate) => pnapana_species_agree((string)$candidate['species'], $geminiSpecies))) {
    $candidates[] = ['species' => $geminiSpecies, 'common_name' => $geminiCommonName ?: $geminiSpecies,
        'probability' => $geminiConfidence, 'description' => (string)($gemini['description'] ?? ''), 'source' => 'gemini'];
}
foreach (($gemini['alternatives'] ?? []) as $alternative) {
    if (count($candidates) >= 3 || !is_array($alternative) || empty($alternative['species'])) break;
    $species = trim((string)$alternative['species']);
    if (array_filter($candidates, fn($candidate) => pnapana_species_agree((string)$candidate['species'], $species))) continue;
    $candidates[] = ['species' => $species, 'common_name' => trim((string)($alternative['common_name'] ?? $species)),
        'probability' => pnapana_safe_probability($alternative['confidence_score'] ?? 0), 'description' => '', 'source' => 'gemini'];
}
$candidates = array_slice($candidates, 0, 3);

if (!$candidates) {
    $bothSayNotPlant = (($kindwisePlant['binary'] ?? null) === false) && (($gemini['is_plant'] ?? null) === false);
    http_response_code($bothSayNotPlant ? 422 : 503);
    try {
        $pdo->prepare("INSERT INTO ai_usage_events (user_id, operation, provider, success) VALUES (?, 'identify', ?, 0)")
            ->execute([$user['id'], !empty($kindwiseResponse['ok']) ? 'kindwise+gemini' : ($gemini ? 'gemini' : 'unavailable')]);
    } catch (Throwable $ignored) {}
    $unavailable = !$kindwiseSuccess && !is_array($gemini);
    $message = $bothSayNotPlant
        ? 'We could not clearly see a plant. Retake the whole plant and leaf photos in good light.'
        : ($unavailable
            ? 'Plant identification is temporarily unavailable. Your photos were not saved. Please try again shortly.'
            : 'We could not identify this plant confidently. Retake the photos in good light and include a clear leaf.');
    pnapana_write_application_log($pdo, $bothSayNotPlant ? 'warning' : 'error', 'plant_identification_failed', $message, (int)$user['id'], [
        'image_count' => count($images),
        'kindwise' => ['configured' => !empty($kindwiseResponse['configured']), 'status' => $kindwiseResponse['http_status'] ?? null, 'error' => $kindwiseResponse['error_code'] ?? null],
        'gemini' => ['configured' => !empty($geminiDiagnostic['configured']), 'status' => $geminiDiagnostic['http_status'] ?? null, 'error' => $geminiDiagnostic['error_code'] ?? null]
    ], $bothSayNotPlant ? 422 : 503);
    echo json_encode(['status' => 'error', 'message' => $bothSayNotPlant
        ? $message
        : $message, 'reference_id' => pnapana_log_request_id()]);
    exit;
}

$top = $candidates[0];
$topProbability = pnapana_safe_probability($top['probability'] ?? 0);
$secondProbability = pnapana_safe_probability($candidates[1]['probability'] ?? 0);
$agreement = $geminiSpecies !== '' && pnapana_species_agree((string)$top['species'], $geminiSpecies);
$strongMatch = count($images) >= 3 && ($top['source'] ?? '') === 'kindwise' && $topProbability >= 0.75
    && ($topProbability - $secondProbability) >= 0.15 && $agreement && $geminiConfidence >= 0.65;
foreach ($candidates as &$candidate) {
    $candidate['probability'] = pnapana_safe_probability($candidate['probability'] ?? 0);
    $candidate['providers_agree'] = $geminiSpecies !== '' && pnapana_species_agree((string)$candidate['species'], $geminiSpecies);
}
unset($candidate);

$scanId = bin2hex(random_bytes(16));
$stmt = $pdo->prepare('INSERT INTO plant_identification_events
    (id, user_id, image_count, kindwise_top_species, kindwise_probability, kindwise_candidates, gemini_species, gemini_confidence, providers_agree, auto_accepted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([$scanId, $user['id'], count($images), $kindwiseCandidates[0]['species'] ?? null,
    isset($kindwiseCandidates[0]) ? pnapana_safe_probability($kindwiseCandidates[0]['probability']) : null,
    json_encode($candidates), $geminiSpecies ?: null, $gemini ? $geminiConfidence : null,
    $agreement ? 1 : 0, $strongMatch ? 1 : 0]);

$provider = $kindwiseCandidates && $gemini ? 'kindwise+gemini' : ($kindwiseCandidates ? 'kindwise' : 'gemini');
try {
    $cost = ($kindwiseCandidates ? (float)(getenv('KINDWISE_COST_PER_SCAN_USD') ?: 0) : 0)
        + ($gemini ? (float)(getenv('GEMINI_COST_PER_SCAN_USD') ?: 0) : 0);
    $pdo->prepare("INSERT INTO ai_usage_events (user_id, operation, provider, success, confidence, estimated_cost_usd) VALUES (?, 'identify', ?, 1, ?, ?)")
        ->execute([$user['id'], $provider, $topProbability, $cost]);
    $pdo->prepare("INSERT INTO analytics_events (user_id, event_name, metadata) VALUES (?, 'plant_scan_succeeded', ?)")
        ->execute([$user['id'], json_encode(['provider' => $provider, 'strong_match' => $strongMatch, 'image_count' => count($images)])]);
} catch (Throwable $ignored) {}
pnapana_log_user_activity($pdo, (int)$user['id'], 'plant_identification_completed', [
    'image_count' => count($images), 'provider' => $provider, 'strong_match' => $strongMatch, 'candidate_count' => count($candidates)
]);

echo json_encode([
    'status' => 'success', 'scan_id' => $scanId, 'image_count' => count($images), 'strong_match' => $strongMatch,
    'requires_confirmation' => true, 'providers_agree' => $agreement,
    'identification' => ['species' => $top['species'], 'common_name' => $top['common_name'],
        'confidence' => $topProbability >= 0.75 ? 'high' : ($topProbability >= 0.45 ? 'medium' : 'low'),
        'confidence_score' => $topProbability, 'description' => $top['description'] ?? (string)($gemini['description'] ?? '')],
    'candidates' => $candidates, 'alternatives' => array_slice($candidates, 1), 'uncertain' => !$strongMatch, 'care_plan' => null
]);
