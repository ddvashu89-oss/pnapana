<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
$stmt = $pdo->prepare("SELECT id, name, species, image_url, placement, light_req, water_freq, care_plan, setup_data
    FROM plants WHERE user_id = ? AND setup_completed = 0 ORDER BY id ASC");
$stmt->execute([$user['id']]);
$plants = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($plants as &$plant) {
    $plant['care_plan'] = json_decode((string)($plant['care_plan'] ?? ''), true) ?: [];
    $plant['setup_data'] = json_decode((string)($plant['setup_data'] ?? ''), true) ?: null;
}
unset($plant);

echo json_encode(['status' => 'success', 'plants' => $plants, 'remaining' => count($plants)]);
