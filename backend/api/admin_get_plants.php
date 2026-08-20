<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

try {
    $stmt = $pdo->query("SELECT p.id, p.name, p.species, p.status, p.status_color, p.image_url, p.created_at,
            u.id AS owner_id, u.name AS owner_name
        FROM plants p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.id DESC");
    $plants = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "plants" => $plants]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("admin_get_plants error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
