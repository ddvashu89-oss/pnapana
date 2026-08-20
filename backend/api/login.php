<?php
require_once '../db.php';
require_once '../config.php';
require_once '../jwt_helper.php';
require_once '../rate_limiter.php';

// Rate limit: max 10 attempts per minute
check_rate_limit('login', 10, 60);

$data = json_decode(file_get_contents("php://input"));
$email = isset($data->email) ? strtolower(trim($data->email)) : '';
$password = isset($data->password) ? (string)$data->password : '';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password are required."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please enter a valid email address."]);
    exit;
}

$stmt = $conn->prepare("SELECT id, name, email, password, is_admin, gemini_api_key FROM users WHERE email = :email");
$stmt->bindParam(':email', $email);
$stmt->execute();

$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($password, $user['password'])) {
    unset($user['password']); // don't send password back
    $user['is_admin'] = (bool)$user['is_admin'];

    if (!$user['is_admin']) {
        $settingsStmt = $conn->query("SELECT maintenance_mode FROM app_settings WHERE id = 1");
        $settings = $settingsStmt->fetch(PDO::FETCH_ASSOC);
        if ($settings && (bool)$settings['maintenance_mode']) {
            http_response_code(503);
            echo json_encode(["status" => "error", "message" => "Pnapana is currently down for maintenance. Please check back soon."]);
            exit;
        }
    }

    // Generate a fresh session id and store it, so this login rotates out any
    // previously issued JWT (their embedded sid will no longer match).
    $sessionId = bin2hex(random_bytes(32));

    $updateStmt = $conn->prepare("UPDATE users SET token = :token WHERE id = :id");
    $updateStmt->bindParam(':token', $sessionId);
    $updateStmt->bindParam(':id', $user['id']);
    $updateStmt->execute();

    $jwt = jwt_encode([
        'sub' => (int)$user['id'],
        'email' => $user['email'],
        'sid' => $sessionId,
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ], JWT_SECRET);

    $user['token'] = $jwt;

    echo json_encode(["status" => "success", "user" => $user]);
} else {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
}
?>
