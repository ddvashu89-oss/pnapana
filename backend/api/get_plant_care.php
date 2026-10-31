<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');
require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$plantId = filter_var($_GET['plant_id'] ?? null, FILTER_VALIDATE_INT);
if (!$plantId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Plant ID is required.']);
    exit;
}
$stmt = $pdo->prepare("SELECT e.id, e.event_type, e.details, e.created_at
    FROM care_events e JOIN plants p ON p.id = e.plant_id
    WHERE e.plant_id = ? AND e.user_id = ? AND p.user_id = ? AND e.event_type IN ('water', 'fertilize')
    ORDER BY e.created_at DESC, e.id DESC LIMIT 100");
$stmt->execute([$plantId, $user['id'], $user['id']]);
echo json_encode(['status' => 'success', 'events' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
?>
