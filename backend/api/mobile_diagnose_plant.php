<?php
require_once __DIR__ . '/mobile_common.php';
require_once __DIR__ . '/../kindwise_helper.php';
require_once __DIR__ . '/../gemini_helper.php';
require_once __DIR__ . '/../ai_client.php';
mobile_method(['POST']);
$user = mobile_user($pdo);
if (!mobile_settings($pdo)['ai_scanning_enabled']) mobile_fail('Plant scanning is currently paused.', 503);
if (empty($user['is_admin']) && !get_active_plan($pdo, $user['id'])['ai_diagnosis']) mobile_fail('Your plan does not include health diagnosis.', 402, 'PLAN_REQUIRED');

$data = mobile_body();
$image = $data['image_base64'] ?? $data['image_url'] ?? $data['image'] ?? '';
if (!is_string($image) || strlen($image) > 8 * 1024 * 1024 || kindwise_image_payload($image) === null) {
    mobile_fail('A valid plant photo under 5 MB is required.');
}

$localAi = pnapana_ai_request('/api/v1/disease-detect', $image);
if (!empty($localAi['ok'])) {
    $value = $localAi['data'];
    $response = [
        'status' => 'success',
        'diagnosis' => $value['disease'] ?? 'Uncertain plant health result',
        'treatment' => implode(' ', array_filter($value['recommendations'] ?? [], 'is_string')),
        'health_status' => $value['health_status'] ?? 'uncertain',
        'provider' => 'pnapana-tensorflow',
        'confidence' => isset($value['confidence']) ? (float)$value['confidence'] : null,
        'uncertain' => !empty($value['uncertain']),
        'symptoms' => $value['symptoms'] ?? [],
        'recommendations' => $value['recommendations'] ?? [],
        'model_version' => $value['model_version'] ?? null,
        'uncertainty_warnings' => $value['uncertainty_warnings'] ?? []
    ];
    $response['scan_history_id'] = mobile_record_ai_scan($pdo, $user['id'], null, 'disease', $response['provider'], $image, $response, $response['confidence'], $response['uncertain'], $response['model_version']);
    echo json_encode($response);
    exit;
}

$healthResponse = kindwise_health_assessment($image);
if (!empty($healthResponse['ok'])) {
    $summary = kindwise_health_summary($healthResponse['data']);
    $response = [
        'status' => 'success',
        'diagnosis' => $summary['diagnosis'],
        'treatment' => $summary['analysis'],
        'health_status' => $summary['status'],
        'provider' => 'kindwise', 'uncertain' => false
    ];
    $response['scan_history_id'] = mobile_record_ai_scan($pdo, $user['id'], null, 'disease', 'kindwise', $image, $response);
    echo json_encode($response);
    exit;
}

$key = mobile_shared_gemini_key();
if ($key !== '') {
    $prompt = 'Assess this plant photo for visible health problems. Return only JSON with keys is_plant (boolean), is_healthy (boolean), diagnosis (short string), and treatment (practical short guidance). If the image is not a plant, set is_plant to false.';
    $result = gemini_vision_json_call($image, $prompt, $key);
    if (is_array($result) && isset($result['diagnosis'])) {
        if (isset($result['is_plant']) && !$result['is_plant']) mobile_fail('This photo does not clearly show a plant.', 422);
        $response = [
            'status' => 'success',
            'diagnosis' => (string)$result['diagnosis'],
            'treatment' => (string)($result['treatment'] ?? 'Continue normal care and monitor the plant for changes.'),
            'health_status' => !empty($result['is_healthy']) ? 'healthy' : 'issue',
            'provider' => 'gemini', 'uncertain' => false
        ];
        $response['scan_history_id'] = mobile_record_ai_scan($pdo, $user['id'], null, 'disease', 'gemini', $image, $response);
        echo json_encode($response);
        exit;
    }
}

mobile_fail('Plant diagnosis is unavailable. Configure the shared Kindwise or Gemini service on the Pnapana server.', 503);
