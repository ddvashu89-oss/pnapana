<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth.php';
$user = authenticate($pdo);
$stmt = $pdo->prepare("SELECT p.id, p.name, p.species, p.image_url, p.water_freq, p.last_watered, p.placement,
        owner.id AS owner_id, owner.name AS owner_name, vm.starts_on, vm.ends_on, vm.instructions
    FROM vacation_modes vm
    JOIN users owner ON owner.id = vm.user_id
    JOIN plant_buddies b ON b.status = 'accepted' AND ((b.requester_id = owner.id AND b.recipient_id = ?) OR (b.recipient_id = owner.id AND b.requester_id = ?))
    JOIN plants p ON p.user_id = owner.id
    WHERE vm.buddy_id = ? AND vm.enabled = 1 AND vm.starts_on <= CURDATE() AND vm.ends_on >= CURDATE()
    ORDER BY owner.name, p.name");
$stmt->execute([$user['id'], $user['id'], $user['id']]);
echo json_encode(['status' => 'success', 'care_tasks' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
?>
