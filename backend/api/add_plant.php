<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once '../account_helper.php';
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

// Enforce the plant allowance of the user's current plan. max_plants NULL
// means unlimited, which is what the paid tier grants.
$plan = get_active_plan($pdo, $user_id);
if ($plan && $plan['max_plants'] !== null) {
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM plants WHERE user_id = ?");
    $countStmt->execute([$user_id]);
    if ((int)$countStmt->fetchColumn() >= $plan['max_plants']) {
        http_response_code(402);
        echo json_encode([
            "status" => "error",
            "code" => "PLAN_LIMIT_REACHED",
            "message" => "Your " . $plan['name'] . " plan covers " . $plan['max_plants']
                . " plants. Upgrade to Premium to add more.",
            "limit" => (int)$plan['max_plants']
        ]);
        exit();
    }
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
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("add_plant error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
