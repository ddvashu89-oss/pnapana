<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$user_id = $user['id'];

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id'])) {
    echo json_encode(["status" => "error", "message" => "Plant ID is required"]);
    exit();
}

$plant_id = $data['id'];

try {
    $ownerStmt = $pdo->prepare("SELECT p.id, p.user_id, u.name AS owner_name FROM plants p JOIN users u ON u.id = p.user_id WHERE p.id = ?");
    $ownerStmt->execute([$plant_id]);
    $plantOwner = $ownerStmt->fetch(PDO::FETCH_ASSOC);
    if (!$plantOwner) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Plant not found."]);
        exit();
    }
    $ownerId = (int)$plantOwner['user_id'];
    $byBuddy = $ownerId !== (int)$user_id;
    if ($byBuddy) {
        $delegate = $pdo->prepare("SELECT 1 FROM vacation_modes vm
            JOIN plant_buddies b ON b.status = 'accepted' AND ((b.requester_id = vm.user_id AND b.recipient_id = vm.buddy_id) OR (b.recipient_id = vm.user_id AND b.requester_id = vm.buddy_id))
            WHERE vm.user_id = ? AND vm.buddy_id = ? AND vm.enabled = 1 AND vm.starts_on <= CURDATE() AND vm.ends_on >= CURDATE()");
        $delegate->execute([$ownerId, $user_id]);
        if (!$delegate->fetchColumn()) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "You can water another garden only during an active vacation plan shared with you."]);
            exit();
        }
    }
    $stmt = $pdo->prepare("UPDATE plants SET last_watered = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?");
    $stmt->execute([$plant_id, $ownerId]);

    $eventStmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type, details) VALUES (?, ?, 'water', ?)");
    $eventStmt->execute([$ownerId, $plant_id, $byBuddy ? 'Watered by ' . $user['name'] . ' during vacation care.' : null]);

    echo json_encode([
        "status" => "success",
        "message" => "Plant watered successfully!"
    ]);
} catch(PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("water_plant error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
