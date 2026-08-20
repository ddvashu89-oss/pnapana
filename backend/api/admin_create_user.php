<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once '../rate_limiter.php';
require_once '../account_helper.php';
require_once 'auth.php';

// Rate limit: max 20 account creations per 5 minutes per admin IP.
check_rate_limit('admin_create_user', 20, 300);

$user = authenticate($pdo);
require_admin($user);

$data = json_decode(file_get_contents('php://input'), true);

$name = isset($data['name']) ? strip_tags(trim($data['name'])) : '';
$email = isset($data['email']) ? strtolower(trim($data['email'])) : '';
$password = isset($data['password']) ? (string)$data['password'] : '';
$is_admin = !empty($data['is_admin']) ? 1 : 0;

if ($name === '' || $email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Name, email, and password are required."]);
    exit();
}

if (mb_strlen($name) > 100) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Name cannot exceed 100 characters."]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please enter a valid email address."]);
    exit();
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters long."]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "Email already in use."]);
        exit();
    }

    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)");
    $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $is_admin]);
    $newId = (int)$pdo->lastInsertId();
    provision_new_account($pdo, $newId);

    $stmt = $pdo->prepare("SELECT id, customer_id, name, email, is_admin, coins, created_at FROM users WHERE id = ?");
    $stmt->execute([$newId]);
    $created = $stmt->fetch(PDO::FETCH_ASSOC);
    $created['is_admin'] = (bool)$created['is_admin'];
    $created['coins'] = (int)$created['coins'];
    $created['plant_count'] = 0;

    echo json_encode(["status" => "success", "message" => "User created", "user" => $created]);
} catch (PDOException $e) {
    error_log("admin_create_user error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Could not create the user. Please try again."]);
}
?>
