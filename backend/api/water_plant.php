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

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id'])) {
    echo json_encode(["status" => "error", "message" => "Plant ID is required"]);
    exit();
}

$plant_id = $data['id'];

try {
    $stmt = $pdo->prepare("UPDATE plants SET last_watered = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->execute([$plant_id]);
    
    echo json_encode([
        "status" => "success", 
        "message" => "Plant watered successfully!"
    ]);
} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
