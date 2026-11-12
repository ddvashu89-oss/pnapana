<?php
require_once __DIR__ . '/mobile_common.php';
require_once __DIR__ . '/../rate_limiter.php';
mobile_method(['POST']);
check_rate_limit('mobile_login', 10, 60);

$data = mobile_body();
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    mobile_fail('Enter a valid email address and password.');
}

$stmt = $pdo->prepare('SELECT id, name, email, password, is_admin, customer_id, status FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user || !password_verify($password, $user['password'])) {
    mobile_fail('Invalid email or password.', 401);
}
if (isset($user['status']) && strtoupper($user['status']) !== 'ACTIVE') {
    mobile_fail('This account is not active. Please contact support.', 403, 'ACCOUNT_INACTIVE');
}
if (empty($user['is_admin']) && mobile_settings($pdo)['maintenance_mode']) {
    mobile_fail('Pnapana is currently down for maintenance. Please check back soon.', 503, 'MAINTENANCE');
}

$sessionId = bin2hex(random_bytes(32));
$pdo->prepare('UPDATE users SET token = ? WHERE id = ?')->execute([$sessionId, $user['id']]);
$jwt = jwt_encode([
    'sub' => (int)$user['id'],
    'email' => $user['email'],
    'sid' => $sessionId,
    'iat' => time(),
    'exp' => time() + (7 * 24 * 60 * 60)
], JWT_SECRET);

echo json_encode(['status' => 'success', 'user' => [
    'id' => (int)$user['id'],
    'name' => $user['name'],
    'email' => $user['email'],
    'is_admin' => (bool)$user['is_admin'],
    'customer_id' => $user['customer_id'] ?? null,
    'token' => $jwt
]]);
