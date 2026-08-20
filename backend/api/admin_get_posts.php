<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

try {
    $stmt = $pdo->query("SELECT cp.id, cp.caption, cp.image_url, cp.plant_name, cp.likes_count, cp.coins_earned, cp.created_at,
            u.id AS author_id, u.name AS author_name, u.email AS author_email
        FROM community_posts cp
        JOIN users u ON cp.user_id = u.id
        ORDER BY cp.created_at DESC");
    $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "posts" => $posts]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("admin_get_posts error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
