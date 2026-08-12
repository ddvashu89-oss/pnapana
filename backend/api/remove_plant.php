<?php
require_once '../db.php';

$data = json_decode(file_get_contents("php://input"));
$plant_id = isset($data->id) ? intval($data->id) : 0;

if ($plant_id > 0) {
    $stmt = $conn->prepare("DELETE FROM plants WHERE id = :id");
    $stmt->bindParam(':id', $plant_id);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Plant removed."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to remove plant."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid plant ID."]);
}
?>
