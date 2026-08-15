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
$user_id = (int)$user['id'];

$data = json_decode(file_get_contents('php://input'), true);
$post_id = isset($data['post_id']) ? (int)$data['post_id'] : 0;

if (!$post_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "post_id is required"]);
    exit();
}

const LIKE_COINS_REWARD = 2;

try {
    $postStmt = $pdo->prepare("SELECT user_id FROM community_posts WHERE id = ?");
    $postStmt->execute([$post_id]);
    $post = $postStmt->fetch(PDO::FETCH_ASSOC);

    if (!$post) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Post not found"]);
        exit();
    }

    $existingStmt = $pdo->prepare("SELECT id, active FROM post_likes WHERE post_id = ? AND user_id = ?");
    $existingStmt->execute([$post_id, $user_id]);
    $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

    if ($existing && (int)$existing['active'] === 1) {
        // Currently liked -> unlike. Keep the row (so re-liking never re-earns coins), just mark inactive.
        $pdo->prepare("UPDATE post_likes SET active = 0 WHERE id = ?")->execute([$existing['id']]);
        $pdo->prepare("UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?")->execute([$post_id]);
        $liked = false;
    } else {
        // Reward the post's author, not the liker, and never for liking your own post.
        // Only ever awarded the first time this user likes this post (row didn't exist before).
        $isFirstLike = !$existing;
        if ($existing) {
            $pdo->prepare("UPDATE post_likes SET active = 1 WHERE id = ?")->execute([$existing['id']]);
        } else {
            $pdo->prepare("INSERT INTO post_likes (post_id, user_id, active) VALUES (?, ?, 1)")->execute([$post_id, $user_id]);
        }
        $pdo->prepare("UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?")->execute([$post_id]);
        if ($isFirstLike && (int)$post['user_id'] !== $user_id) {
            $pdo->prepare("UPDATE users SET coins = coins + ? WHERE id = ?")->execute([LIKE_COINS_REWARD, $post['user_id']]);
        }
        $liked = true;
    }

    $countStmt = $pdo->prepare("SELECT likes_count FROM community_posts WHERE id = ?");
    $countStmt->execute([$post_id]);
    $likes_count = (int)$countStmt->fetchColumn();

    echo json_encode([
        "status" => "success",
        "liked" => $liked,
        "likes_count" => $likes_count
    ]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
