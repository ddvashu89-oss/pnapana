<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

$data = json_decode(file_get_contents('php://input'), true);
$plant_id = isset($data['id']) ? (int)$data['id'] : 0;

if (!$plant_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Plant id is required"]);
    exit();
}

try {
    $stmt = $pdo->prepare("DELETE FROM plants WHERE id = ?");
    $stmt->execute([$plant_id]);

    echo json_encode(["status" => "success", "message" => "Plant deleted"]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("admin_delete_plant error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
