<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../activity_logger.php';
require_once __DIR__ . '/../kindwise_helper.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
check_rate_limit('plant_identification', 40, 3600);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$rawImages = $data['images'] ?? null;
if (!is_array($rawImages) || count($rawImages) < 1 || count($rawImages) > 4) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Add 1 to 4 clear photos of the same plant.']);
    exit;
}
$images = [];
foreach ($rawImages as $image) {
    $value = is_array($image) ? ($image['image_base64'] ?? null) : $image;
    if (!is_string($value) || kindwise_image_payload($value) === null) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Each photo must be a valid image under 9 MB.']);
        exit;
    }
    $images[] = $value;
}

pnapana_log_user_activity($pdo, (int)$user['id'], 'plant_identification_requested', ['image_count' => count($images)]);
$started = microtime(true);
$response = kindwise_identify($images, strtolower((string)($data['lang'] ?? 'en')));
$duration = (int)round((microtime(true) - $started) * 1000);
$candidates = !empty($response['ok']) ? kindwise_identification_candidates($response['data']) : [];
$isPlant = $response['data']['result']['is_plant']['binary'] ?? null;
pnapana_log_api_request($pdo, (int)$user['id'], 'kindwise', 'plant_identification', $response['http_status'] ?? null, $duration, !empty($response['ok']) && $isPlant !== false && count($candidates) > 0, $response['error_code'] ?? null, ['image_count' => count($images), 'candidate_count' => count($candidates)]);

if ($isPlant === false) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'That does not look like a plant. Try clearer photos.']);
    exit;
}
if (!$candidates) {
    $message = !empty($response['configured']) ? 'Plant identification is temporarily unavailable. Please try again shortly.' : 'Plant identification is being set up. Please try again shortly.';
    pnapana_write_application_log($pdo, 'error', 'kindwise_identification_failed', $message, (int)$user['id'], ['image_count' => count($images), 'provider_status' => $response['http_status'] ?? null, 'provider_error' => $response['error_code'] ?? null], 503);
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => $message, 'reference_id' => pnapana_log_request_id()]);
    exit;
}

$top = $candidates[0];
$second = (float)($candidates[1]['probability'] ?? 0);
$strong = $top['probability'] >= .80 && ($top['probability'] - $second) >= .15;
$scanId = bin2hex(random_bytes(16));
try {
    $pdo->prepare('INSERT INTO plant_identification_events (id,user_id,image_count,kindwise_top_species,kindwise_probability,kindwise_candidates,auto_accepted) VALUES (?,?,?,?,?,?,?)')
        ->execute([$scanId, $user['id'], count($images), $top['species'], $top['probability'], json_encode($candidates), 0]);
    $pdo->prepare("INSERT INTO ai_usage_events (user_id,operation,provider,success,confidence,estimated_cost_usd) VALUES (?, 'identify', 'kindwise', 1, ?, ?)")
        ->execute([$user['id'], $top['probability'], (float)(getenv('KINDWISE_COST_PER_SCAN_USD') ?: 0)]);
    $pdo->prepare("INSERT INTO analytics_events (user_id,event_name,metadata) VALUES (?, 'plant_scan_succeeded', ?)")
        ->execute([$user['id'], json_encode(['provider' => 'kindwise', 'image_count' => count($images), 'strong_match' => $strong])]);
} catch (Throwable $error) {
    pnapana_write_application_log($pdo, 'error', 'identification_save_failed', 'Could not save plant identification.', (int)$user['id'], ['image_count' => count($images)], 503);
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'Could not save this identification. Please try again.', 'reference_id' => pnapana_log_request_id()]);
    exit;
}
pnapana_log_user_activity($pdo, (int)$user['id'], 'plant_identification_completed', ['image_count' => count($images), 'strong_match' => $strong, 'candidate_count' => count($candidates)]);
echo json_encode([
    'status' => 'success', 'scan_id' => $scanId, 'image_count' => count($images),
    'strong_match' => $strong, 'requires_confirmation' => true, 'providers_agree' => false,
    'identification' => ['species' => $top['species'], 'common_name' => $top['common_name'],
        'confidence' => $top['probability'] >= .75 ? 'high' : ($top['probability'] >= .45 ? 'medium' : 'low'),
        'confidence_score' => $top['probability'], 'description' => $top['description']],
    'candidates' => $candidates, 'alternatives' => array_slice($candidates, 1),
    'uncertain' => !$strong, 'care_plan' => null
]);
