<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
    // Plants, care_events, community_posts, post_likes all cascade via FK ON DELETE CASCADE.
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$target_id]);

    echo json_encode(["status" => "success", "message" => "User deleted"]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
