<?php
require_once '../db.php';
require_once '../config.php';
require_once '../jwt_helper.php';
require_once '../rate_limiter.php';
require_once 'auth.php';

// Rate limit: max 5 attempts per 10 minutes
check_rate_limit('delete_account', 5, 600);

$user = authenticate($conn);
$userId = (int)$user['id'];

$data = json_decode(file_get_contents("php://input"), true);
$password = isset($data['password']) ? trim($data['password']) : '';

if (empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password confirmation is required to delete your account."]);
    exit;
}

// Fetch user password hash
$stmt = $conn->prepare("SELECT password FROM users WHERE id = :id");
$stmt->bindParam(':id', $userId);
$stmt->execute();
$dbUser = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$dbUser || !password_verify($password, $dbUser['password'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Incorrect password. Account deletion aborted."]);
    exit;
}

try {
    $deleteStmt = $conn->prepare("DELETE FROM users WHERE id = :id");
    $deleteStmt->bindParam(':id', $userId);
    $deleteStmt->execute();

    echo json_encode([
        "status" => "success",
        "message" => "Account successfully deleted."
    ]);
} catch (PDOException $e) {
    error_log("Account deletion error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to delete account. Please try again later."]);
}
?>
