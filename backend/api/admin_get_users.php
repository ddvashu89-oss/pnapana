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
    $stmt = $pdo->query("SELECT u.id, u.name, u.email, u.is_admin, u.coins, u.created_at,
            (SELECT COUNT(*) FROM plants p WHERE p.user_id = u.id) AS plant_count
        FROM users u
        ORDER BY u.id DESC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($users as &$u) {
        $u['is_admin'] = (bool)$u['is_admin'];
        $u['coins'] = (int)$u['coins'];
        $u['plant_count'] = (int)$u['plant_count'];
    }

    echo json_encode(["status" => "success", "users" => $users]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
