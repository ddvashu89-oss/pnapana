<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth.php';
$user = authenticate($pdo);
$buddyId = filter_var($_GET['buddy_id'] ?? null, FILTER_VALIDATE_INT);
if (!$buddyId) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Choose a buddy.']); exit; }
$friendship = $pdo->prepare("SELECT 1 FROM plant_buddies WHERE status = 'accepted' AND ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))");
$friendship->execute([$user['id'], $buddyId, $buddyId, $user['id']]);
if (!$friendship->fetchColumn()) { http_response_code(403); echo json_encode(['status' => 'error', 'message' => 'This garden is only visible to accepted plant buddies.']); exit; }
$owner = $pdo->prepare('SELECT id, name FROM users WHERE id = ?'); $owner->execute([$buddyId]); $buddy = $owner->fetch(PDO::FETCH_ASSOC);
$stmt = $pdo->prepare("SELECT p.id, p.name, p.species, p.image_url, p.placement, p.light_req, p.light_requirement, p.water_freq,
        (SELECT ce.created_at FROM care_events ce WHERE ce.plant_id = p.id AND ce.user_id = p.user_id AND ce.event_type = 'water' ORDER BY ce.created_at DESC LIMIT 1) AS last_watered,
        p.status, p.status_color FROM plants p WHERE p.user_id = ? ORDER BY p.name");
$stmt->execute([$buddyId]);
echo json_encode(['status' => 'success', 'buddy' => $buddy, 'plants' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
?>
