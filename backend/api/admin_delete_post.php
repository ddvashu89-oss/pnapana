<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

$data = json_decode(file_get_contents('php://input'), true);
$post_id = isset($data['id']) ? (int)$data['id'] : 0;

if (!$post_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Post id is required"]);
    exit();
}

try {
    // Moderation delete — bypasses the ownership check that like_post.php/create_post.php enforce for regular users.
    $stmt = $pdo->prepare("DELETE FROM community_posts WHERE id = ?");
    $stmt->execute([$post_id]);

    echo json_encode(["status" => "success", "message" => "Post removed"]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("admin_delete_post error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
