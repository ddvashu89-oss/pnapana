<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth.php';
$user = authenticate($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("SELECT u.id, u.name FROM plant_buddies b JOIN users u ON u.id = CASE WHEN b.requester_id = ? THEN b.recipient_id ELSE b.requester_id END
        WHERE (b.requester_id = ? OR b.recipient_id = ?) AND b.status = 'accepted' ORDER BY u.name");
    $stmt->execute([$user['id'], $user['id'], $user['id']]); $friends = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt = $pdo->prepare("SELECT b.id, u.name, u.email, b.created_at FROM plant_buddies b JOIN users u ON u.id = b.requester_id WHERE b.recipient_id = ? AND b.status = 'pending' ORDER BY b.created_at DESC");
    $stmt->execute([$user['id']]); $incoming = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt = $pdo->prepare("SELECT b.id, u.name, b.created_at FROM plant_buddies b JOIN users u ON u.id = b.recipient_id WHERE b.requester_id = ? AND b.status = 'pending' ORDER BY b.created_at DESC");
    $stmt->execute([$user['id']]); $outgoing = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['status' => 'success', 'friends' => $friends, 'incoming' => $incoming, 'outgoing' => $outgoing]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $data['action'] ?? '';
if ($action === 'request') {
    $email = strtolower(trim((string)($data['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Enter a valid email address.']); exit;
    }
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?'); $stmt->execute([$email]); $recipientId = (int)$stmt->fetchColumn();
    if (!$recipientId || $recipientId === (int)$user['id']) {
        http_response_code(404); echo json_encode(['status' => 'error', 'message' => 'That account could not be added.']); exit;
    }
    $reverse = $pdo->prepare("SELECT id, status FROM plant_buddies WHERE requester_id = ? AND recipient_id = ?");
    $reverse->execute([$recipientId, $user['id']]); $existingReverse = $reverse->fetch(PDO::FETCH_ASSOC);
    if ($existingReverse && $existingReverse['status'] === 'pending') {
        $pdo->prepare("UPDATE plant_buddies SET status = 'accepted' WHERE id = ?")->execute([$existingReverse['id']]);
        echo json_encode(['status' => 'success', 'message' => 'You are now plant buddies.']); exit;
    }
    if ($existingReverse && $existingReverse['status'] === 'accepted') {
        echo json_encode(['status' => 'success', 'message' => 'You are already plant buddies.']); exit;
    }
    $stmt = $pdo->prepare("INSERT INTO plant_buddies (requester_id, recipient_id, status) VALUES (?, ?, 'pending') ON DUPLICATE KEY UPDATE status = IF(status = 'declined', 'pending', status), updated_at = CURRENT_TIMESTAMP");
    $stmt->execute([$user['id'], $recipientId]);
    echo json_encode(['status' => 'success', 'message' => 'Buddy request sent.']); exit;
}

if ($action === 'respond') {
    $requestId = filter_var($data['request_id'] ?? null, FILTER_VALIDATE_INT);
    $accept = !empty($data['accept']);
    if (!$requestId) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'A request ID is required.']); exit; }
    $stmt = $pdo->prepare("UPDATE plant_buddies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND recipient_id = ? AND status = 'pending'");
    $stmt->execute([$accept ? 'accepted' : 'declined', $requestId, $user['id']]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404); echo json_encode(['status' => 'error', 'message' => 'That buddy request is no longer available.']); exit;
    }
    echo json_encode(['status' => 'success', 'message' => $accept ? 'Buddy request accepted.' : 'Request declined.']); exit;
}

if ($action === 'remove') {
    $friendId = filter_var($data['friend_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$friendId) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'A buddy is required.']); exit; }
    $stmt = $pdo->prepare("DELETE FROM plant_buddies WHERE status = 'accepted' AND ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))");
    $stmt->execute([$user['id'], $friendId, $friendId, $user['id']]);
    echo json_encode(['status' => 'success', 'message' => 'Buddy removed.']); exit;
}

http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Choose a valid buddy action.']);
?>
