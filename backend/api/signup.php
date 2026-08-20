<?php
require_once '../db.php';
require_once '../config.php';
require_once '../jwt_helper.php';
require_once '../rate_limiter.php';
require_once '../account_helper.php';

// Rate limit: max 5 signups per 5 minutes
check_rate_limit('signup', 5, 300);

$data = json_decode(file_get_contents("php://input"));
$name = isset($data->name) ? strip_tags(trim($data->name)) : '';
$email = isset($data->email) ? strtolower(trim($data->email)) : '';
$password = isset($data->password) ? (string)$data->password : '';
$gemini_api_key = isset($data->gemini_api_key) ? trim($data->gemini_api_key) : null;
if (empty($gemini_api_key)) {
    $gemini_api_key = null;
}

if (empty($name) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Name, email, and password are required."]);
    exit;
}

if (mb_strlen($name) > 100) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Name cannot exceed 100 characters."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please enter a valid email address."]);
    exit;
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters long."]);
    exit;
}

$settingsStmt = $conn->query("SELECT allow_signups FROM app_settings WHERE id = 1");
$settings = $settingsStmt->fetch(PDO::FETCH_ASSOC);
if ($settings && !(bool)$settings['allow_signups']) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "New signups are currently disabled."]);
    exit;
}

// Check if email already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE email = :email");
$stmt->bindParam(':email', $email);
$stmt->execute();

if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(["status" => "error", "message" => "Email already in use."]);
    exit;
}

$hashed_password = password_hash($password, PASSWORD_DEFAULT);
$sessionId = bin2hex(random_bytes(32));

$stmt = $conn->prepare("INSERT INTO users (name, email, password, token, gemini_api_key) VALUES (:name, :email, :password, :token, :gemini_api_key)");
$stmt->bindParam(':name', $name);
$stmt->bindParam(':email', $email);
$stmt->bindParam(':password', $hashed_password);
$stmt->bindParam(':token', $sessionId);
$stmt->bindParam(':gemini_api_key', $gemini_api_key);

if ($stmt->execute()) {
    $user_id = $conn->lastInsertId();
    $customer_id = provision_new_account($conn, $user_id);

    $jwt = jwt_encode([
        'sub' => (int)$user_id,
        'email' => $email,
        'sid' => $sessionId,
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ], JWT_SECRET);

    echo json_encode([
        "status" => "success",
        "user" => [
            "id" => (int)$user_id,
            "customer_id" => $customer_id,
            "name" => $name,
            "email" => $email,
            "gemini_api_key" => $gemini_api_key,
            "token" => $jwt,
            "is_admin" => false
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to create account."]);
}
?>
