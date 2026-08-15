<?php
require_once '../db.php';
require_once 'auth.php';

$user = authenticate($conn);
$user_id = $user['id'];

$stmt = $conn->prepare("SELECT * FROM plants WHERE user_id = :user_id ORDER BY id ASC");
$stmt->bindParam(':user_id', $user_id);
$stmt->execute();

$plants = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(["status" => "success", "plants" => $plants]);
?>
