<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header("Content-Type: application/json");

require_once '../db.php';
require_once 'auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$user = authenticate($pdo);

if (!isset($_GET['plant_id'])) {
    echo json_encode(["status" => "error", "message" => "Plant ID is required."]);
    exit;
}

$plant_id = $_GET['plant_id'];

try {
    // Only the plant's owner can see its scan history.
    $ownerStmt = $pdo->prepare("SELECT user_id FROM plants WHERE id = ?");
    $ownerStmt->execute([$plant_id]);
    $ownerId = $ownerStmt->fetchColumn();

    if (!$ownerId || (int)$ownerId !== (int)$user['id']) {
        echo json_encode(["status" => "success", "scans" => []]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM plant_scans WHERE plant_id = ? ORDER BY created_at DESC");
    $stmt->execute([$plant_id]);
    $scans = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "scans" => $scans]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("get_plant_scans error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
