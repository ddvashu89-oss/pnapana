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
$hasPlacement = array_key_exists('placement', $data);
$placement = $data['placement'] ?? null;
$hasLight = array_key_exists('light_req', $data);
$lightReq = $data['light_req'] ?? null;
$parsedDate = $purchaseDate === '' ? null : DateTime::createFromFormat('!Y-m-d', $purchaseDate);
$validDate = $purchaseDate === '' || ($parsedDate && $parsedDate->format('Y-m-d') === $purchaseDate && $purchaseDate <= date('Y-m-d'));
if (!$plantId || !$validDate || ($placement !== null && !in_array($placement, ['', 'indoor', 'outdoor'], true)) || ($hasLight && (!is_string($lightReq) || mb_strlen(trim($lightReq)) > 50))) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Choose a valid purchase date.']);
    exit;
}
$profileFields = [];
$params = [$purchaseDate === '' ? null : $purchaseDate];
if ($hasPlacement) { $profileFields[] = 'placement = ?'; $params[] = $placement === '' ? null : $placement; }
if ($hasLight) { $profileFields[] = 'light_req = ?'; $params[] = $lightReq; }
$sql = 'UPDATE plants SET purchased_on = ?' . ($profileFields ? ', ' . implode(', ', $profileFields) : '') . ' WHERE id = ? AND user_id = ?';
$params[] = $plantId; $params[] = $user['id'];
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$check = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?');
$check->execute([$plantId, $user['id']]);
if (!$check->fetch()) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Plant not found.']);
    exit;
}
echo json_encode(['status' => 'success', 'purchased_on' => $purchaseDate ?: null, 'placement' => $hasPlacement ? ($placement ?: null) : null, 'light_req' => $hasLight ? $lightReq : null]);
?>
