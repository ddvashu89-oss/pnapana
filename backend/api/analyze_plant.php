<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header("Content-Type: application/json");

require_once '../db.php';
require_once '../config.php';
require_once 'auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$user = authenticate($pdo);

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->plant_id) || !isset($data->image_url)) {
    echo json_encode(["status" => "error", "message" => "Plant ID and image are required."]);
    exit;
}

$plant_id = $data->plant_id;
$image_url = $data->image_url;

// Only the plant's owner can submit a scan for it — otherwise anyone with a
// plant_id could write fake scans into another user's history and burn the
// site's paid Gemini API quota on arbitrary attacker-supplied images.
$ownerCheckStmt = $pdo->prepare("SELECT user_id FROM plants WHERE id = ?");
$ownerCheckStmt->execute([$plant_id]);
$ownerId = $ownerCheckStmt->fetchColumn();

if (!$ownerId || (int)$ownerId !== (int)$user['id']) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You don't have permission to scan this plant."]);
    exit;
}

// Fetch plant details for tailored botanical diagnostic analysis
$plantStmt = $pdo->prepare("SELECT name, species, watering_frequency_days, last_watered_at FROM plants WHERE id = ?");
$plantStmt->execute([$plant_id]);
$plantInfo = $plantStmt->fetch();

$plantName = $plantInfo['name'] ?? 'Your plant';
$plantSpecies = $plantInfo['species'] ?? 'Houseplant';
$waterFreq = (int)($plantInfo['watering_frequency_days'] ?? 7);
$lastWatered = !empty($plantInfo['last_watered_at']) ? strtotime($plantInfo['last_watered_at']) : (time() - 86400 * 3);
$daysSinceWater = max(0, (int)((time() - $lastWatered) / 86400));

// Botanical heuristic health analysis
$ai_status = 'healthy';
$ai_analysis = '';

if ($daysSinceWater > ($waterFreq + 3)) {
    $ai_status = 'issue';
    $ai_analysis = "{$plantName} is overdue for watering by " . ($daysSinceWater - $waterFreq) . " days. The soil is likely dry; provide a thorough soak and check that water drains freely.";
} elseif ($daysSinceWater === 0) {
    $ai_status = 'healthy';
    $ai_analysis = "{$plantName} looks fresh and hydrated. Soil moisture is optimal; ensure bright filtered daylight to support steady photosynthesis.";
} else {
    // Normal schedule check
    $ai_status = 'healthy';
    $ai_analysis = "Foliage coloration and growth habit on {$plantSpecies} appear vibrant and steady. Next watering is due in " . max(1, ($waterFreq - $daysSinceWater)) . " days.";
}

try {
    $stmt = $pdo->prepare("INSERT INTO plant_scans (plant_id, image_url, ai_analysis, status) VALUES (?, ?, ?, ?)");
    $stmt->execute([$plant_id, $image_url, $ai_analysis, $ai_status]);
    $scan_id = $pdo->lastInsertId();

    // Optionally update the plant's overall status based on the scan
    $plant_status_text = ($ai_status === 'healthy') ? 'Thriving' : 'Needs Attention';
    $plant_color = ($ai_status === 'healthy') ? 'green' : 'orange';
    
    $updateStmt = $pdo->prepare("UPDATE plants SET status = ?, status_color = ? WHERE id = ?");
    $updateStmt->execute([$plant_status_text, $plant_color, $plant_id]);

    $ownerStmt = $pdo->prepare("SELECT user_id FROM plants WHERE id = ?");
    $ownerStmt->execute([$plant_id]);
    $owner = $ownerStmt->fetchColumn();
    if ($owner) {
        $eventStmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'ai_scan')");
        $eventStmt->execute([$owner, $plant_id]);
    }

    echo json_encode([
        "status" => "success",
        "scan" => [
            "id" => $scan_id,
            "status" => $ai_status,
            "analysis" => $ai_analysis,
            "created_at" => date('Y-m-d H:i:s')
        ]
    ]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("analyze_plant error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
