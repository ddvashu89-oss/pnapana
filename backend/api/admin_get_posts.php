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
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
