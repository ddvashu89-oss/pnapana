<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../db.php';
if (file_exists(__DIR__ . '/../config.php')) {
    require_once __DIR__ . '/../config.php';
}
require_once __DIR__ . '/../kindwise_helper.php';
require_once __DIR__ . '/../gemini_helper.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$image = $data['image_base64'] ?? $data['image_url'] ?? $data['image'] ?? '';

if (kindwise_image_payload($image) === null) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'A valid plant photo is required.']);
    exit;
}

$healthResponse = kindwise_health_assessment($image);
if (!empty($healthResponse['ok'])) {
    $summary = kindwise_health_summary($healthResponse['data']);
    echo json_encode([
        'status' => 'success',
        'diagnosis' => $summary['diagnosis'],
        'treatment' => $summary['analysis'],
        'health_status' => $summary['status'],
        'provider' => 'kindwise'
    ]);
    exit;
}

$userApiKey = !empty($user['gemini_api_key']) ? $user['gemini_api_key'] : null;
$systemApiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : (getenv('GEMINI_API_KEY') ?: '');
$activeKey = $userApiKey ?: $systemApiKey;
if ($activeKey !== '') {
    $prompt = 'Assess this plant photo for visible health problems. Return only JSON with keys is_healthy (boolean), diagnosis (short string), and treatment (practical short guidance). If the image is not a plant, set is_healthy to false and diagnosis to "Not a plant".';
    $result = gemini_vision_json_call($image, $prompt, $activeKey);
    if (is_array($result) && isset($result['diagnosis'])) {
        echo json_encode([
            'status' => 'success',
            'diagnosis' => (string) $result['diagnosis'],
            'treatment' => (string) ($result['treatment'] ?? 'Continue normal care and monitor the plant for changes.'),
            'health_status' => !empty($result['is_healthy']) ? 'healthy' : 'issue',
            'provider' => 'gemini'
        ]);
        exit;
    }
}

http_response_code(503);
echo json_encode([
    'status' => 'error',
    'message' => 'Plant diagnosis is unavailable. Configure a Kindwise or Gemini API key on the server and try again.'
]);
