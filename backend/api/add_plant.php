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
require_once 'auth.php';

// Authenticate user using token
$user = authenticate($pdo);
$user_id = $user['id'];

// Get POST body
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['name']) || !isset($data['species'])) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit();
}

$name = $data['name'];
$species = $data['species'];
$image_url = isset($data['image_url']) && !empty($data['image_url']) ? $data['image_url'] : 'https://images.unsplash.com/photo-1485955900006-10f4d324d411';
$water_freq = isset($data['water_freq']) ? $data['water_freq'] : 7;
$light_req = isset($data['light_req']) ? $data['light_req'] : 'Medium';

$native_region = $data['native_region'] ?? null;
$light_requirement = $data['light_requirement'] ?? null;
$water_requirement = $data['water_requirement'] ?? null;
$humidity = $data['humidity'] ?? null;
$pet_friendly = isset($data['pet_friendly']) ? (bool)$data['pet_friendly'] : false;
$care_plan = isset($data['care_plan']) ? json_encode($data['care_plan']) : null;
if ($care_plan === false) {
    $care_plan = null;
}

try {
    $stmt = $pdo->prepare("INSERT INTO plants (user_id, name, species, image_url, water_freq, light_req,
        native_region, light_requirement, water_requirement, humidity, pet_friendly, care_plan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$user_id, $name, $species, $image_url, $water_freq, $light_req,
        $native_region, $light_requirement, $water_requirement, $humidity, $pet_friendly, $care_plan]);

    $plant_id = $pdo->lastInsertId();
    $eventStmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'add_plant')");
    $eventStmt->execute([$user_id, $plant_id]);

    echo json_encode([
        "status" => "success", 
        "message" => "Plant added successfully",
        "plant_id" => $plant_id
    ]);
} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
