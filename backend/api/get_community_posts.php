<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

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
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("get_community_posts error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
