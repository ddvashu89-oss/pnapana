<?php
require_once '../db.php';

$plant_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($plant_id > 0) {
    $stmt = $conn->prepare("SELECT * FROM plants WHERE id = :id");
    $stmt->bindParam(':id', $plant_id);
    $stmt->execute();
    
    $plant = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($plant) {
        echo json_encode(["status" => "success", "plant" => $plant]);
    } else {
        echo json_encode(["status" => "error", "message" => "Plant not found."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid plant ID."]);
}
?>
