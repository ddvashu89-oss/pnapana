<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

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
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("admin_get_users error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
