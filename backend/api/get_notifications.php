<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');
require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$user_id = $user['id'];

try {
    // Find plants where last_watered + water_freq days is in the past
    // water_freq is in days
    $stmt = $pdo->prepare("SELECT id, name, species, image_url, last_watered, water_freq FROM plants WHERE user_id = ? AND DATE_ADD(last_watered, INTERVAL water_freq DAY) <= CURRENT_TIMESTAMP");
    $stmt->execute([$user_id]);
    $thirsty_plants = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "status" => "success", 
        "notifications" => $thirsty_plants
    ]);
} catch(PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("get_notifications error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
