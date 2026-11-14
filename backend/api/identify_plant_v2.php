<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../activity_logger.php';
require_once __DIR__ . '/../plantnet_helper.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
check_rate_limit('plant_identification', 40, 3600);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$rawImages = is_array($data['images'] ?? null) ? $data['images'] : [($data['image_base64'] ?? $data['image'] ?? null)];
$images = [];
foreach (array_slice($rawImages, 0, 3) as $image) {
    $value = is_array($image) ? ($image['image_base64'] ?? null) : $image;
    if (is_string($value) && plantnet_decode_image($value)) $images[] = $value;
}
if (!$images) {
    pnapana_write_application_log($pdo, 'warning', 'plantnet_identification_rejected', 'No valid PlantNet images supplied.', (int)$user['id'], ['image_count' => 0], 400);
    http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Add 1–3 clear JPG or PNG plant photos.']); exit;
}

pnapana_log_user_activity($pdo, (int)$user['id'], 'plantnet_identification_requested', ['image_count' => count($images)]);
$started = microtime(true);
$response = plantnet_identify($images, strtolower((string)($data['lang'] ?? 'en')));
$duration = (int)round((microtime(true) - $started) * 1000);
$candidates = !empty($response['ok']) ? plantnet_candidates($response['data']) : [];
pnapana_log_api_request($pdo, (int)$user['id'], 'plantnet', 'plant_identification', $response['http_status'] ?? null, $duration, !empty($response['ok']), $response['error_code'] ?? null, ['image_count' => count($images), 'candidate_count' => count($candidates)]);

if (!$candidates) {
    $message = !empty($response['configured']) ? 'Plant identification is temporarily unavailable. Your photos were not saved. Please try again shortly.' : 'Plant identification is being set up. Please try again shortly.';
    pnapana_write_application_log($pdo, 'error', 'plantnet_identification_failed', $message, (int)$user['id'], ['image_count' => count($images), 'plantnet_status' => $response['http_status'] ?? null, 'plantnet_error' => $response['error_code'] ?? null], 503);
    http_response_code(503); echo json_encode(['status' => 'error', 'message' => $message, 'reference_id' => pnapana_log_request_id()]); exit;
}

$top = $candidates[0]; $second = (float)($candidates[1]['probability'] ?? 0);
$strong = $top['probability'] >= .80 && ($top['probability'] - $second) >= .15;
$scanId = bin2hex(random_bytes(16));
try {
    // Existing audit fields remain backwards compatible; candidate metadata identifies PlantNet in its source field.
    $pdo->prepare('INSERT INTO plant_identification_events (id,user_id,image_count,kindwise_top_species,kindwise_probability,kindwise_candidates,auto_accepted) VALUES (?,?,?,?,?,?,?)')->execute([$scanId, $user['id'], count($images), $top['species'], $top['probability'], json_encode($candidates), 0]);
    $pdo->prepare("INSERT INTO ai_usage_events (user_id,operation,provider,success,confidence,estimated_cost_usd) VALUES (?, 'identify', 'plantnet', 1, ?, ?)")->execute([$user['id'], $top['probability'], (float)(getenv('PLANTNET_COST_PER_SCAN_USD') ?: 0)]);
    $pdo->prepare("INSERT INTO analytics_events (user_id,event_name,metadata) VALUES (?, 'plant_scan_succeeded', ?)")->execute([$user['id'], json_encode(['provider' => 'plantnet', 'image_count' => count($images), 'strong_match' => $strong])]);
} catch (Throwable $ignored) {}
pnapana_log_user_activity($pdo, (int)$user['id'], 'plantnet_identification_completed', ['image_count' => count($images), 'strong_match' => $strong, 'candidate_count' => count($candidates)]);
echo json_encode(['status' => 'success', 'scan_id' => $scanId, 'image_count' => count($images), 'strong_match' => $strong, 'requires_confirmation' => true, 'providers_agree' => false,
    'identification' => ['species' => $top['species'], 'common_name' => $top['common_name'], 'confidence' => $top['probability'] >= .75 ? 'high' : ($top['probability'] >= .45 ? 'medium' : 'low'), 'confidence_score' => $top['probability'], 'description' => $top['description']],
    'candidates' => $candidates, 'alternatives' => array_slice($candidates, 1), 'uncertain' => !$strong, 'care_plan' => null]);
