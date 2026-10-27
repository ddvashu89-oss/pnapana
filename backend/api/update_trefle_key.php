<?php
require_once '../db.php';
if (file_exists('../config.php')) {
    require_once '../config.php';
}
require_once '../jwt_helper.php';
require_once '../rate_limiter.php';
require_once 'auth.php';

// Rate limit: max 10 updates per 5 minutes
check_rate_limit('update_trefle_key', 10, 300);

$user = authenticate($conn);
$userId = (int)$user['id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$key = trim($data['trefle_api_key'] ?? $data['gemini_api_key'] ?? $data['key'] ?? '');
if (empty($key)) {
    $key = null;
}

try {
    // Check if trefle_api_key column exists
    $hasColumn = false;
    try {
        $checkCol = $conn->query("SHOW COLUMNS FROM users LIKE 'trefle_api_key'");
        if ($checkCol && $checkCol->rowCount() > 0) {
            $hasColumn = true;
        }
    } catch (Exception $e) {}

    if (!$hasColumn) {
        try {
            $conn->exec("ALTER TABLE users ADD COLUMN trefle_api_key VARCHAR(255) DEFAULT NULL");
            $hasColumn = true;
        } catch (Exception $e) {
            // fallback to gemini_api_key column
        }
    }

    if ($hasColumn) {
        $stmt = $conn->prepare("UPDATE users SET trefle_api_key = :key WHERE id = :id");
    } else {
        $stmt = $conn->prepare("UPDATE users SET gemini_api_key = :key WHERE id = :id");
    }

    $stmt->bindParam(':key', $key);
    $stmt->bindParam(':id', $userId);
    $stmt->execute();

    echo json_encode([
        "status" => "success",
        "message" => "Trefle API key updated successfully.",
        "trefle_api_key" => $key
    ]);
} catch (PDOException $e) {
    error_log("Failed to update Trefle API key: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to update API key. Please try again later."]);
}
