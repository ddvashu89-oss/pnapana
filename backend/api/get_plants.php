<?php
require_once '../db.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if ($user_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Valid user_id is required"]);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM plants WHERE user_id = :user_id ORDER BY id ASC");
$stmt->bindParam(':user_id', $user_id);
$stmt->execute();

$plants = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(["status" => "success", "plants" => $plants]);
?>
