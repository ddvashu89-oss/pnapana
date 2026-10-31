<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');
require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$plantId = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
$purchaseDate = trim((string)($data['purchased_on'] ?? ''));
$parsedDate = $purchaseDate === '' ? null : DateTime::createFromFormat('!Y-m-d', $purchaseDate);
$validDate = $purchaseDate === '' || ($parsedDate && $parsedDate->format('Y-m-d') === $purchaseDate && $purchaseDate <= date('Y-m-d'));
if (!$plantId || !$validDate) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Choose a valid purchase date.']);
    exit;
}
$stmt = $pdo->prepare('UPDATE plants SET purchased_on = ? WHERE id = ? AND user_id = ?');
$stmt->execute([$purchaseDate === '' ? null : $purchaseDate, $plantId, $user['id']]);
$check = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?');
$check->execute([$plantId, $user['id']]);
if (!$check->fetch()) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Plant not found.']);
    exit;
}
echo json_encode(['status' => 'success', 'purchased_on' => $purchaseDate ?: null]);
?>
