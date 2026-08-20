<?php
require_once '../db.php';
require_once '../config.php';
require_once '../jwt_helper.php';
require_once '../rate_limiter.php';
require_once 'auth.php';

// Rate limit: max 5 attempts per 5 minutes
check_rate_limit('change_password', 5, 300);

$user = authenticate($conn);
$userId = (int)$user['id'];

$data = json_decode(file_get_contents("php://input"), true);
$currentPassword = isset($data['current_password']) ? trim($data['current_password']) : '';
$newPassword = isset($data['new_password']) ? trim($data['new_password']) : '';
$confirmPassword = isset($data['confirm_password']) ? trim($data['confirm_password']) : '';

if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "All password fields are required."]);
    exit;
}

if ($newPassword !== $confirmPassword) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "New password and confirmation do not match."]);
    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "New password must be at least 8 characters long."]);
    exit;
}

// Fetch password hash from DB
$stmt = $conn->prepare("SELECT password FROM users WHERE id = :id");
$stmt->bindParam(':id', $userId);
$stmt->execute();
$dbUser = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$dbUser || !password_verify($currentPassword, $dbUser['password'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Current password is incorrect."]);
    exit;
}

if (password_verify($newPassword, $dbUser['password'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "New password must be different from current password."]);
    exit;
}

$newHashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
$newSessionId = bin2hex(random_bytes(32));

$updateStmt = $conn->prepare("UPDATE users SET password = :password, token = :token WHERE id = :id");
$updateStmt->bindParam(':password', $newHashedPassword);
$updateStmt->bindParam(':token', $newSessionId);
$updateStmt->bindParam(':id', $userId);

if ($updateStmt->execute()) {
    $jwt = jwt_encode([
        'sub' => $userId,
        'email' => $user['email'],
        'sid' => $newSessionId,
        'iat' => time(),
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ], JWT_SECRET);

    echo json_encode([
        "status" => "success",
        "message" => "Password updated successfully.",
        "token" => $jwt
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to update password. Please try again."]);
}
?>
