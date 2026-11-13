<?php
require_once '../db.php';
require_once '../config.php';
require_once '../jwt_helper.php';
require_once '../rate_limiter.php';
require_once __DIR__ . '/../growth_schema.php';
require_once 'auth.php';

// Rate limit: max 5 attempts per 10 minutes
check_rate_limit('delete_account', 5, 600);

$user = authenticate($conn);
$userId = (int)$user['id'];
pnapana_ensure_growth_schema($conn);

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
    $deleteStmt = $conn->prepare("INSERT INTO account_deletion_requests (user_id, scheduled_for, status, cancelled_at, completed_at) VALUES (:id, DATE_ADD(NOW(), INTERVAL 30 DAY), 'pending', NULL, NULL) ON DUPLICATE KEY UPDATE requested_at=NOW(), scheduled_for=DATE_ADD(NOW(), INTERVAL 30 DAY), status='pending', cancelled_at=NULL, completed_at=NULL");
    $deleteStmt->bindParam(':id', $userId);
    $deleteStmt->execute();

    echo json_encode([
        "status" => "success",
        "message" => "Account deletion scheduled in 30 days. You can cancel from Settings during the recovery period."
    ]);
} catch (PDOException $e) {
    error_log("Account deletion error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to delete account. Please try again later."]);
}
?>
