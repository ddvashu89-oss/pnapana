<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');
require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$plantId = filter_var($data['plant_id'] ?? null, FILTER_VALIDATE_INT);
$details = trim((string)($data['details'] ?? ''));
if (!$plantId || mb_strlen($details) > 500) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Choose a plant and keep notes under 500 characters.']);
    exit;
}
$owner = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?');
$owner->execute([$plantId, $user['id']]);
if (!$owner->fetch()) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Plant not found.']);
    exit;
}
$stmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type, details) VALUES (?, ?, 'fertilize', ?)");
$stmt->execute([$user['id'], $plantId, $details ?: null]);
echo json_encode(['status' => 'success', 'message' => 'Fertilizer application saved.']);
?>
