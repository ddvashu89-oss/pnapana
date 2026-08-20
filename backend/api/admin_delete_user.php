<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

$data = json_decode(file_get_contents('php://input'), true);
$target_id = isset($data['id']) ? (int)$data['id'] : 0;

if (!$target_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "User id is required"]);
    exit();
}

if ($target_id === (int)$user['id']) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "You cannot delete your own admin account"]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
    $stmt->execute([$target_id]);
    $target = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$target) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found"]);
        exit();
    }

    // Deleting the last admin would leave the panel permanently unreachable.
    if ((int)$target['is_admin'] === 1) {
        $count = $pdo->query("SELECT COUNT(*) FROM users WHERE is_admin = 1")->fetchColumn();
        if ((int)$count <= 1) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Cannot delete the last remaining admin."]);
            exit();
        }
    }

    // Plants, care_events, community_posts, post_likes all cascade via FK ON DELETE CASCADE.
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$target_id]);

    echo json_encode(["status" => "success", "message" => "User deleted"]);
} catch (PDOException $e) {
    error_log("admin_delete_user error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Could not delete the user. Please try again."]);
}
?>
