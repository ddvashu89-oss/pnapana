<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$user_id = $user['id'];

try {
    $stmt = $pdo->prepare("SELECT cp.*, u.name AS user_name,
            EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = cp.id AND pl.user_id = ? AND pl.active = 1) AS liked_by_me
        FROM community_posts cp
        JOIN users u ON cp.user_id = u.id
        ORDER BY cp.created_at DESC
        LIMIT 50");
    $stmt->execute([$user_id]);
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($posts as &$post) {
        $post['liked_by_me'] = (bool)$post['liked_by_me'];
        $post['likes_count'] = (int)$post['likes_count'];
        $post['coins_earned'] = (int)$post['coins_earned'];
    }

    echo json_encode(["status" => "success", "posts" => $posts]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
