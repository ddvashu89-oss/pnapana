<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';
require_once '../config.php';
require_once '../gemini_helper.php';
require_once 'auth.php';

$user = authenticate($pdo);

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['image_base64']) || empty($data['image_base64'])) {
    echo json_encode(["status" => "error", "message" => "Image is required."]);
    exit;
}

$prompt = "You are an expert botanist. Identify the plant in this photo and provide a complete care plan. "
    . "Respond with ONLY a JSON object matching exactly this shape (no markdown, no commentary): "
    . '{"is_plant": boolean, "species": string, "common_name": string, "confidence": "high"|"medium"|"low", '
    . '"description": string, "care_plan": {"native_region": string, '
    . '"light": {"level": string, "detail": string}, '
    . '"water": {"frequency_days": number, "instructions": string}, '
    . '"humidity": {"level": string, "detail": string}, '
    . '"soil": string, "temperature": string, "fertilizing": string, "pruning": string, '
    . '"toxicity": {"pet_friendly": boolean, "detail": string}, '
    . '"common_issues": [{"issue": string, "solution": string}]}}. '
    . "If the image does not clearly show a plant, set is_plant to false and leave other fields as best-effort or empty strings.";

$result = gemini_vision_json_call($data['image_base64'], $prompt);

if ($result === null || !isset($result['is_plant']) || !isset($result['care_plan'])) {
    echo json_encode(["status" => "error", "message" => "AI identification is temporarily unavailable. Please enter details manually."]);
    exit;
}

if ($result['is_plant'] === false) {
    echo json_encode(["status" => "error", "message" => "That doesn't look like a plant. Try a clearer photo."]);
    exit;
}

$eventStmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, NULL, 'ai_scan')");
$eventStmt->execute([$user['id']]);

echo json_encode([
    "status" => "success",
    "identification" => [
        "species" => $result['species'] ?? '',
        "common_name" => $result['common_name'] ?? '',
        "confidence" => $result['confidence'] ?? 'medium',
        "description" => $result['description'] ?? ''
    ],
    "care_plan" => $result['care_plan']
]);
