<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../plant_setup_helper.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$plantId = filter_var($data['plant_id'] ?? null, FILTER_VALIDATE_INT);
$name = trim((string)($data['name'] ?? ''));
if ($plantId === false || $plantId < 1 || $name === '' || mb_strlen($name) > 255) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'A valid plant and nickname are required.']);
    exit;
}

try {
    $setup = pnapana_normalize_plant_setup($data['setup'] ?? null);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    exit;
}

$owned = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?');
$owned->execute([$plantId, $user['id']]);
if (!$owned->fetchColumn()) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Plant not found.']);
    exit;
}

$lastWatered = pnapana_setup_last_watered_at($setup['last_watered']);
$sql = 'UPDATE plants SET name = ?, placement = ?, light_req = ?, water_freq = ?, setup_data = ?, setup_completed = 1, setup_completed_at = NOW()';
$params = [$name, $setup['placement'], $setup['light'], $setup['soil_check_days'], json_encode($setup)];
if ($lastWatered !== null) {
    $sql .= ', last_watered = ?';
    $params[] = $lastWatered;
}
$sql .= ' WHERE id = ? AND user_id = ?';
$params[] = $plantId;
$params[] = $user['id'];
$pdo->prepare($sql)->execute($params);

echo json_encode(['status' => 'success', 'message' => 'Plant setup completed.', 'plant_id' => (int)$plantId]);
