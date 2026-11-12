<?php
require_once __DIR__ . '/mobile_common.php';
require_once __DIR__ . '/../rate_limiter.php';
mobile_method(['POST']);
check_rate_limit('mobile_signup', 5, 300);

$data = mobile_body();
$name = strip_tags(trim((string)($data['name'] ?? '')));
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    mobile_fail('Name, a valid email address, and password are required.');
}
if (mb_strlen($name) > 100) mobile_fail('Name cannot exceed 100 characters.');
if (strlen($password) < 8) mobile_fail('Password must be at least 8 characters long.');
if (!mobile_settings($pdo)['allow_signups']) mobile_fail('New signups are currently disabled.', 403);

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetchColumn()) mobile_fail('Email already in use.', 409);

$sessionId = bin2hex(random_bytes(32));
$stmt = $pdo->prepare('INSERT INTO users (name, email, password, token) VALUES (?, ?, ?, ?)');
$stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $sessionId]);
$userId = (int)$pdo->lastInsertId();
$customerId = provision_new_account($pdo, $userId);
$jwt = jwt_encode([
    'sub' => $userId,
    'email' => $email,
    'sid' => $sessionId,
    'iat' => time(),
    'exp' => time() + (7 * 24 * 60 * 60)
], JWT_SECRET);

echo json_encode(['status' => 'success', 'user' => [
    'id' => $userId,
    'name' => $name,
    'email' => $email,
    'is_admin' => false,
    'customer_id' => $customerId,
    'token' => $jwt
]]);
