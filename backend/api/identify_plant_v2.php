<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../activity_logger.php';
require_once __DIR__ . '/../openai_helper.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
check_rate_limit('plant_identification', 40, 3600);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$rawImages = is_array($data['images'] ?? null) ? $data['images'] : [($data['image_base64'] ?? $data['image'] ?? null)];
$images = [];
foreach (array_slice($rawImages, 0, 4) as $image) {
    $value = is_array($image) ? ($image['image_base64'] ?? null) : $image;
    if (is_string($value) && pnapana_openai_image_payload($value)) $images[] = $value;
}
if (count($images) < 2) {
    pnapana_write_application_log($pdo, 'warning', 'openai_identification_rejected', 'Fewer than two valid plant images supplied.', (int)$user['id'], ['image_count' => count($images)], 400);
    http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Add at least 2 clear JPG or PNG plant photos: a whole-plant view and a close leaf view.']); exit;
}

pnapana_log_user_activity($pdo, (int)$user['id'], 'openai_identification_requested', ['image_count' => count($images)]);
$response = pnapana_openai_identify_plant($images, strtolower((string)($data['lang'] ?? 'en')));
$candidates = !empty($response['ok']) ? pnapana_openai_candidates($response['data']) : [];
pnapana_log_api_request($pdo, (int)$user['id'], 'openai', 'plant_identification', $response['http_status'] ?? null, $response['duration_ms'] ?? 0, !empty($response['ok']), $response['error_code'] ?? null, ['image_count' => count($images), 'candidate_count' => count($candidates), 'model' => $response['model'] ?? null]);

if (!$candidates) {
    $message = !empty($response['configured']) ? 'Plant identification is temporarily unavailable. Your photos were not saved. Please try again shortly.' : 'Plant identification is being set up. Please try again shortly.';
    pnapana_write_application_log($pdo, 'error', 'openai_identification_failed', $message, (int)$user['id'], ['image_count' => count($images), 'openai_status' => $response['http_status'] ?? null, 'openai_error' => $response['error_code'] ?? null], 503);
    http_response_code(503); echo json_encode(['status' => 'error', 'message' => $message, 'reference_id' => pnapana_log_request_id()]); exit;
}

$top = $candidates[0]; $second = (float)($candidates[1]['probability'] ?? 0);
$strong = !$response['data']['uncertain'] && $top['probability'] >= .80 && ($top['probability'] - $second) >= .15;
$scanId = bin2hex(random_bytes(16));
try {
    // Legacy database field names are retained for backwards compatibility; each candidate records source=openai.
    $pdo->prepare('INSERT INTO plant_identification_events (id,user_id,image_count,kindwise_top_species,kindwise_probability,kindwise_candidates,auto_accepted) VALUES (?,?,?,?,?,?,?)')->execute([$scanId, $user['id'], count($images), $top['species'], $top['probability'], json_encode($candidates), 0]);
    $pdo->prepare("INSERT INTO ai_usage_events (user_id,operation,provider,success,confidence,estimated_cost_usd) VALUES (?, 'identify', 'openai', 1, ?, ?)")->execute([$user['id'], $top['probability'], (float)(getenv('OPENAI_IDENTIFICATION_COST_USD') ?: 0)]);
    $pdo->prepare("INSERT INTO analytics_events (user_id,event_name,metadata) VALUES (?, 'plant_scan_succeeded', ?)")->execute([$user['id'], json_encode(['provider' => 'openai', 'model' => $response['model'] ?? null, 'image_count' => count($images), 'strong_match' => $strong])]);
} catch (Throwable $ignored) {}
pnapana_log_user_activity($pdo, (int)$user['id'], 'openai_identification_completed', ['image_count' => count($images), 'strong_match' => $strong, 'candidate_count' => count($candidates)]);
echo json_encode(['status' => 'success', 'scan_id' => $scanId, 'image_count' => count($images), 'strong_match' => $strong, 'requires_confirmation' => true, 'providers_agree' => false,
    'identification' => ['species' => $top['species'], 'common_name' => $top['common_name'], 'confidence' => $top['probability'] >= .75 ? 'high' : ($top['probability'] >= .45 ? 'medium' : 'low'), 'confidence_score' => $top['probability'], 'description' => $top['description']],
    'candidates' => $candidates, 'alternatives' => array_slice($candidates, 1), 'uncertain' => !$strong, 'care_plan' => null]);
