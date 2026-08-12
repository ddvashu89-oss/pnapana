<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET');

require_once '../db.php';

if (!isset($_GET['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Missing user_id"]);
    exit();
}

$user_id = $_GET['user_id'];

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
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
