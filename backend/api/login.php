<?php
require_once '../db.php';

$data = json_decode(file_get_contents("php://input"));
$email = isset($data->email) ? trim($data->email) : '';
$password = isset($data->password) ? trim($data->password) : '';

if (empty($email) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Email and password are required."]);
    exit;
}

$stmt = $conn->prepare("SELECT id, name, email, password FROM users WHERE email = :email");
$stmt->bindParam(':email', $email);
$stmt->execute();

$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($password, $user['password'])) {
    unset($user['password']); // don't send password back
    echo json_encode(["status" => "success", "user" => $user]);
} else {
    echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
}
?>
