<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';

try {
    // Fetch all plants from all users to show in the Explore feed
    $stmt = $conn->prepare("SELECT * FROM plants ORDER BY id DESC LIMIT 50");
    $stmt->execute();
    
    $plants = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["status" => "success", "plants" => $plants]);
} catch(PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("get_all_plants error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
