<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($conn);

$plant_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($plant_id > 0) {
    // Scoped to the authenticated owner — this is the private management view
    // (care plan, AI scan history), not the public Explore listing.
    $stmt = $conn->prepare("SELECT * FROM plants WHERE id = :id AND user_id = :user_id");
    $stmt->bindParam(':id', $plant_id);
    $stmt->bindParam(':user_id', $user['id']);
    $stmt->execute();

    $plant = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($plant) {
        echo json_encode(["status" => "success", "plant" => $plant]);
    } else {
        echo json_encode(["status" => "error", "message" => "Plant not found."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid plant ID."]);
}
?>
