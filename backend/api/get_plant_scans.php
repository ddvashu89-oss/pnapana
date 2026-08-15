<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
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
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
