<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header("Content-Type: application/json; charset=UTF-8");

define('ALLOW_DB_FALLBACK', true);
require_once __DIR__ . '/../db.php';
if (file_exists(__DIR__ . '/../config.php')) {
    require_once __DIR__ . '/../config.php';
}
require_once __DIR__ . '/../trefle_helper.php';
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

$hint = trim($data['hint'] ?? $data['name'] ?? $data['species'] ?? '');
$lang = strtolower(trim($data['lang'] ?? 'en'));
$metrics = $data['metrics'] ?? null;

// Identify plant using Trefle Botanical API with system master key
$result = trefle_identify_plant($imageBase64, $hint, $lang, null, $metrics);

// Log care event for user streak and activity tracking
if ($pdo) {
    try {
        $eventStmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, NULL, 'ai_scan')");
        $eventStmt->execute([$user['id']]);
    } catch (Exception $e) {
        // Continue even if logging fails
    }
}

echo json_encode([
    "status" => "success",
    "source" => $result['source'] ?? "Pnapana Botanical AI",
    "identification" => [
        "species" => $result['identification']['species'] ?? '',
        "common_name" => $result['identification']['common_name'] ?? ($result['identification']['species'] ?? ''),
        "scientific_name" => $result['identification']['scientific_name'] ?? ($result['identification']['species'] ?? ''),
        "family" => $result['identification']['family'] ?? '',
        "genus" => $result['identification']['genus'] ?? '',
        "confidence" => $result['identification']['confidence'] ?? 'high',
        "description" => $result['identification']['description'] ?? '',
        "image_url" => $result['identification']['image_url'] ?? null
    ],
    "care_plan" => $result['care_plan'] ?? [],
    "alternatives" => $result['alternatives'] ?? [],
    "uncertain" => !empty($result['uncertain']),
    "hint_applied" => !empty($result['hint_applied'])
]);
