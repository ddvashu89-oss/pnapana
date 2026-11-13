<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header("Content-Type: application/json");

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../kindwise_helper.php';
require_once __DIR__ . '/../gemini_helper.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/feature_upload.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
check_rate_limit('plant_health_scan', 60, 3600);
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->plant_id) || !isset($data->image_url)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Plant ID and image are required."]);
    exit;
}

$plant_id = $data->plant_id;
$image_url = $data->image_url;
if (!is_string($image_url) || kindwise_image_payload($image_url) === null) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "A valid plant photo is required."]);
    exit;
}

// Only the plant's owner can submit a scan for it — otherwise anyone with a
// plant_id could write fake scans into another user's history and burn the
// site's paid AI quota on arbitrary attacker-supplied images.
$ownerCheckStmt = $pdo->prepare("SELECT user_id FROM plants WHERE id = ?");
$ownerCheckStmt->execute([$plant_id]);
$ownerId = $ownerCheckStmt->fetchColumn();

if (!$ownerId || (int)$ownerId !== (int)$user['id']) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You don't have permission to scan this plant."]);
    exit;
}

$activeApiKey = pnapana_shared_gemini_key($pdo);
$ai_status = null;
$ai_analysis = '';
$provider = 'unavailable';
$kindwiseHealth = kindwise_health_assessment($image_url);

if (!empty($kindwiseHealth['ok'])) {
    $summary = kindwise_health_summary($kindwiseHealth['data']);
    $ai_status = $summary['status'] ?? null;
    $ai_analysis = trim((string)($summary['diagnosis'] ?? '') . '. ' . (string)($summary['analysis'] ?? ''));
    $provider = 'kindwise';
} elseif (!empty($activeApiKey)) {
    $prompt = 'Assess this plant photo for visible health problems. Return only JSON with keys is_healthy (boolean), diagnosis (short string), and treatment (practical short guidance). If the image is not a plant, set is_healthy to false and diagnosis to "Not a plant".';
    $result = gemini_vision_json_call($image_url, $prompt, $activeApiKey);

    if (is_array($result) && array_key_exists('is_healthy', $result) && !empty($result['diagnosis'])) {
        $ai_status = !empty($result['is_healthy']) ? 'healthy' : 'issue';
        $ai_analysis = trim((string)$result['diagnosis'] . '. ' . (string)($result['treatment'] ?? ''));
        $provider = 'gemini';
    }
}

// Never save or report a failed provider call as a successful health result.
if (!in_array($ai_status, ['healthy', 'issue', 'unhealthy'], true) || $ai_analysis === '') {
    http_response_code(503);
    echo json_encode(["status" => "error", "message" => "Plant health scan is unavailable. Check the configured Kindwise or Gemini service and try again."]);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO plant_scans (plant_id, image_url, ai_analysis, status) VALUES (?, ?, ?, ?)");
    $stmt->execute([$plant_id, $image_url, $ai_analysis, $ai_status]);
    $scan_id = $pdo->lastInsertId();

    $plant_status_text = ($ai_status === 'healthy') ? 'Thriving' : 'Needs Attention';
    $plant_color = ($ai_status === 'healthy') ? 'green' : 'orange';
    $updateStmt = $pdo->prepare("UPDATE plants SET status = ?, status_color = ? WHERE id = ?");
    $updateStmt->execute([$plant_status_text, $plant_color, $plant_id]);

    $eventStmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'ai_scan')");
    $eventStmt->execute([$user['id'], $plant_id]);

    $cost = $provider === 'kindwise' ? (float)(getenv('KINDWISE_COST_PER_SCAN_USD') ?: 0) : (float)(getenv('GEMINI_COST_PER_SCAN_USD') ?: 0);
    $pdo->prepare("INSERT INTO ai_usage_events (user_id, operation, provider, success, estimated_cost_usd) VALUES (?, 'diagnose', ?, 1, ?)")->execute([$user['id'], $provider, $cost]);
    $pdo->prepare("INSERT INTO analytics_events (user_id, event_name, metadata) VALUES (?, 'diagnosis_succeeded', ?)")->execute([$user['id'], json_encode(['plant_id' => (int)$plant_id, 'provider' => $provider])]);

    if (in_array($ai_status, ['issue', 'unhealthy'], true)) {
        try {
            $open = $pdo->prepare("SELECT id FROM disease_cases WHERE user_id=? AND plant_id=? AND status IN ('monitoring','improving') ORDER BY id DESC LIMIT 1");
            $open->execute([$user['id'], $plant_id]);
            if (!$open->fetchColumn()) {
                $savedImage = pnapana_save_feature_data_url($image_url);
                $caseStmt = $pdo->prepare("INSERT INTO disease_cases (user_id, plant_id, diagnosis, treatment, initial_image_url, follow_up_due_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 DAY))");
                $caseStmt->execute([$user['id'], $plant_id, mb_substr($ai_analysis, 0, 255), $ai_analysis, $savedImage]);
            }
        } catch (Throwable $followupError) {
            error_log('recovery follow-up scheduling error: ' . $followupError->getMessage());
        }
    }

    echo json_encode([
        "status" => "success",
        "scan" => [
            "id" => $scan_id,
            "status" => $ai_status,
            "analysis" => $ai_analysis,
            "created_at" => date('Y-m-d H:i:s')
        ],
        "follow_up_scheduled" => in_array($ai_status, ['issue', 'unhealthy'], true)
    ]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("analyze_plant error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
