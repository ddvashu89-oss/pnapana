<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';

// Get POST body
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['user_id']) || !isset($data['name']) || !isset($data['species'])) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit();
}

$user_id = $data['user_id'];
$name = $data['name'];
$species = $data['species'];
$image_url = isset($data['image_url']) && !empty($data['image_url']) ? $data['image_url'] : 'https://images.unsplash.com/photo-1485955900006-10f4d324d411';
$water_freq = isset($data['water_freq']) ? $data['water_freq'] : 7;
$light_req = isset($data['light_req']) ? $data['light_req'] : 'Medium';

try {
    $stmt = $pdo->prepare("INSERT INTO plants (user_id, name, species, image_url, water_freq, light_req) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$user_id, $name, $species, $image_url, $water_freq, $light_req]);
    
    echo json_encode([
        "status" => "success", 
        "message" => "Plant added successfully",
        "plant_id" => $pdo->lastInsertId()
    ]);
} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
