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
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
check_rate_limit('plant_diagnosis', 60, 3600);
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$image = $data['image_base64'] ?? $data['image_url'] ?? $data['image'] ?? '';

function log_diagnosis_usage(PDO $pdo, int $userId, string $provider, bool $success): void {
    try {
        $cost = $provider === 'kindwise'
            ? (float)(getenv('KINDWISE_COST_PER_SCAN_USD') ?: 0)
            : ($provider === 'gemini' ? (float)(getenv('GEMINI_COST_PER_SCAN_USD') ?: 0) : 0);
        $pdo->prepare("INSERT INTO ai_usage_events (user_id, operation, provider, success, estimated_cost_usd) VALUES (?, 'diagnose', ?, ?, ?)")->execute([$userId, $provider, $success ? 1 : 0, $cost]);
        $pdo->prepare('INSERT INTO analytics_events (user_id, event_name, metadata) VALUES (?, ?, ?)')->execute([$userId, $success ? 'diagnosis_succeeded' : 'diagnosis_failed', json_encode(['provider' => $provider])]);
    } catch (Throwable $ignored) {}
}

if (kindwise_image_payload($image) === null) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'A valid plant photo is required.']);
    exit;
}

try { $pdo->prepare("INSERT INTO analytics_events (user_id, event_name) VALUES (?, 'diagnosis_attempted')")->execute([$user['id']]); } catch (Throwable $ignored) {}

$healthResponse = kindwise_health_assessment($image);
if (!empty($healthResponse['ok'])) {
    $summary = kindwise_health_summary($healthResponse['data']);
    log_diagnosis_usage($pdo, (int)$user['id'], 'kindwise', true);
    echo json_encode([
        'status' => 'success',
        'diagnosis' => $summary['diagnosis'],
        'treatment' => $summary['analysis'],
        'health_status' => $summary['status'],
        'provider' => 'kindwise'
    ]);
    exit;
}

$activeKey = pnapana_shared_gemini_key($pdo);
if ($activeKey !== '') {
    $prompt = 'Assess this plant photo for visible health problems. Return only JSON with keys is_healthy (boolean), diagnosis (short string), and treatment (practical short guidance). If the image is not a plant, set is_healthy to false and diagnosis to "Not a plant".';
    $result = gemini_vision_json_call($image, $prompt, $activeKey);
    if (is_array($result) && isset($result['diagnosis'])) {
        log_diagnosis_usage($pdo, (int)$user['id'], 'gemini', true);
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

log_diagnosis_usage($pdo, (int)$user['id'], 'unavailable', false);
http_response_code(503);
echo json_encode([
    'status' => 'error',
    'message' => 'Plant diagnosis is unavailable. Configure a Kindwise or Gemini API key on the server and try again.'
]);
