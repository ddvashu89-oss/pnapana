<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');
require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$plantId = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
if (!$plantId || !isset($data['is_favorite'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Plant and favorite status are required.']);
    exit;
}

$stmt = $pdo->prepare('UPDATE plants SET is_favorite = ? WHERE id = ? AND user_id = ?');
$stmt->execute([$data['is_favorite'] ? 1 : 0, $plantId, $user['id']]);
if ($stmt->rowCount() === 0) {
    $check = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?');
    $check->execute([$plantId, $user['id']]);
    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Plant not found.']);
        exit;
    }
}
echo json_encode(['status' => 'success', 'is_favorite' => (bool)$data['is_favorite']]);
?>
