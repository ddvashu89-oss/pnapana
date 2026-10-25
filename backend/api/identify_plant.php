<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../db.php';
if (file_exists(__DIR__ . '/../config.php')) {
    require_once __DIR__ . '/../config.php';
}
require_once __DIR__ . '/../gemini_helper.php';
require_once __DIR__ . '/../botanical_catalog.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);

$rawInput = file_get_contents('php://input');
if (empty($rawInput) && php_sapi_name() === 'cli') {
    $rawInput = file_get_contents('php://stdin');
}
$data = json_decode($rawInput, true) ?? [];

// Support multiple ways image can be passed across mobile/web frontends
$imageBase64 = null;
if (!empty($data['image_base64'])) {
    $imageBase64 = $data['image_base64'];
} elseif (!empty($data['images']) && is_array($data['images'])) {
    if (isset($data['images'][0]['image_base64'])) {
        $imageBase64 = $data['images'][0]['image_base64'];
    } elseif (is_string($data['images'][0])) {
        $imageBase64 = $data['images'][0];
    }
} elseif (!empty($data['image'])) {
    $imageBase64 = $data['image'];
} elseif (!empty($data['image_url']) && strpos($data['image_url'], 'data:image') === 0) {
    $imageBase64 = $data['image_url'];
}

if (empty($imageBase64)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Image is required."]);
    exit;
}

$hint = trim($data['hint'] ?? $data['name'] ?? '');
$lang = strtolower(trim($data['lang'] ?? 'en'));
$metrics = $data['metrics'] ?? null;

$prompt = "You are an expert botanist. Identify the plant in this photo and provide a complete care plan. "
    . (!empty($hint) ? "The user suggests this plant may be: '$hint'. Verify and prioritize if accurate. " : "")
    . "Respond with ONLY a JSON object matching exactly this shape (no markdown, no commentary): "
    . '{"is_plant": boolean, "species": string, "common_name": string, "confidence": "high"|"medium"|"low", '
    . '"description": string, "care_plan": {"native_region": string, '
    . '"light": {"level": "High"|"Medium"|"Low", "detail": string}, '
    . '"water": {"frequency_days": number, "instructions": string}, '
    . '"humidity": {"level": "High"|"Medium"|"Low", "detail": string}, '
    . '"soil": string, "temperature": string, "fertilizing": string, "pruning": string, '
    . '"toxicity": {"pet_friendly": boolean, "detail": string}, '
    . '"common_issues": [{"issue": string, "solution": string}]}}. '
    . "If the image does not clearly show a plant, set is_plant to false and leave other fields as best-effort or empty strings.";

$userApiKey = !empty($user['gemini_api_key']) ? $user['gemini_api_key'] : null;
$systemApiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : (getenv('GEMINI_API_KEY') ?: '');
$activeKey = $userApiKey ?: $systemApiKey;

$result = null;

if (!empty($activeKey)) {
    $result = gemini_vision_json_call($imageBase64, $prompt, $activeKey);
}

// If AI determined it is explicitly not a plant and no hint was provided
if ($result !== null && isset($result['is_plant']) && $result['is_plant'] === false && empty($hint)) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "That doesn't look like a plant. Try a clearer photo."]);
    exit;
}

// If AI vision failed, was unconfigured, or returned an incomplete shape, seamlessly use the botanical classifier
if ($result === null || empty($result['species']) || !isset($result['care_plan'])) {
    $result = identify_plant_fallback($imageBase64, $hint, $lang, $metrics);
}

// Log care event for user streak and activity tracking
try {
    $eventStmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, NULL, 'ai_scan')");
    $eventStmt->execute([$user['id']]);
} catch (Exception $e) {
    // Continue even if logging fails
}

echo json_encode([
    "status" => "success",
    "identification" => [
        "species" => $result['species'] ?? '',
        "common_name" => $result['common_name'] ?? ($result['species'] ?? ''),
        "confidence" => $result['confidence'] ?? 'high',
        "description" => $result['description'] ?? ''
    ],
    "care_plan" => $result['care_plan'] ?? [],
    "alternatives" => $result['alternatives'] ?? [],
    "uncertain" => !empty($result['uncertain']),
    "hint_applied" => !empty($result['hint_applied'])
]);
