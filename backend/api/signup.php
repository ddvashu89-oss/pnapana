<?php
require_once '../db.php';

$data = json_decode(file_get_contents("php://input"));
$name = isset($data->name) ? trim($data->name) : '';
$email = isset($data->email) ? trim($data->email) : '';
$password = isset($data->password) ? trim($data->password) : '';

if (empty($name) || empty($email) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Name, email, and password are required."]);
    exit;
}

// Check if email already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE email = :email");
$stmt->bindParam(':email', $email);
$stmt->execute();

if ($stmt->fetch()) {
    echo json_encode(["status" => "error", "message" => "Email already in use."]);
    exit;
}

$hashed_password = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (:name, :email, :password)");
$stmt->bindParam(':name', $name);
$stmt->bindParam(':email', $email);
$stmt->bindParam(':password', $hashed_password);

if ($stmt->execute()) {
    $user_id = $conn->lastInsertId();
    echo json_encode(["status" => "success", "user" => ["id" => $user_id, "name" => $name, "email" => $email]]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to create account."]);
}
?>
