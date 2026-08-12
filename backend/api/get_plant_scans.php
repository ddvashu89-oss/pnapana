<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once '../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isset($_GET['plant_id'])) {
    echo json_encode(["status" => "error", "message" => "Plant ID is required."]);
    exit;
}

$plant_id = $_GET['plant_id'];

try {
    $stmt = $pdo->prepare("SELECT * FROM plant_scans WHERE plant_id = ? ORDER BY created_at DESC");
    $stmt->execute([$plant_id]);
    $scans = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "scans" => $scans]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
