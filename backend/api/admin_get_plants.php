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
    $stmt = $pdo->query("SELECT p.id, p.name, p.species, p.status, p.status_color, p.image_url, p.created_at,
            u.id AS owner_id, u.name AS owner_name
        FROM plants p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.id DESC");
    $plants = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "plants" => $plants]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
