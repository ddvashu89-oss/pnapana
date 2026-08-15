<?php
require_once '../db.php';
require_once '../config.php';
require_once '../jwt_helper.php';

$data = json_decode(file_get_contents("php://input"));
$name = isset($data->name) ? trim($data->name) : '';
$email = isset($data->email) ? trim($data->email) : '';
$password = isset($data->password) ? trim($data->password) : '';

if (empty($name) || empty($email) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Name, email, and password are required."]);
    exit;
}

$settingsStmt = $conn->query("SELECT allow_signups FROM app_settings WHERE id = 1");
$settings = $settingsStmt->fetch(PDO::FETCH_ASSOC);
if ($settings && !(bool)$settings['allow_signups']) {
    echo json_encode(["status" => "error", "message" => "New signups are currently disabled."]);
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
$sessionId = bin2hex(random_bytes(32));

$stmt = $conn->prepare("INSERT INTO users (name, email, password, token) VALUES (:name, :email, :password, :token)");
$stmt->bindParam(':name', $name);
$stmt->bindParam(':email', $email);
$stmt->bindParam(':password', $hashed_password);
$stmt->bindParam(':token', $sessionId);

if ($stmt->execute()) {
    $user_id = $conn->lastInsertId();

    $jwt = jwt_encode([
        'sub' => (int)$user_id,
        'email' => $email,
        'sid' => $sessionId,
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ], JWT_SECRET);

    echo json_encode(["status" => "success", "user" => ["id" => $user_id, "name" => $name, "email" => $email, "token" => $jwt, "is_admin" => false]]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to create account."]);
}
?>
