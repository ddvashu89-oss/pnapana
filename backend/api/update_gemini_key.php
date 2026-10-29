<?php
require_once '../db.php';
require_once '../config.php';
require_once '../jwt_helper.php';
require_once '../rate_limiter.php';
require_once 'auth.php';

// Rate limit: max 10 updates per 5 minutes
check_rate_limit('update_gemini_key', 10, 300);

$user = authenticate($conn);
$userId = (int)$user['id'];

$data = json_decode(file_get_contents("php://input"), true);
$geminiApiKey = isset($data['gemini_api_key']) ? trim($data['gemini_api_key']) : null;
if (empty($geminiApiKey)) {
    $geminiApiKey = null;
}

try {
    $stmt = $conn->prepare("UPDATE users SET gemini_api_key = :key WHERE id = :id");
    $stmt->bindParam(':key', $geminiApiKey);
    $stmt->bindParam(':id', $userId);
    $stmt->execute();

    echo json_encode([
        "status" => "success",
        "message" => "Gemini API key updated successfully.",
        "gemini_api_key" => $geminiApiKey
    ]);
} catch (PDOException $e) {
    error_log("Failed to update Gemini API key: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to update Gemini API key. Please try again later."]);
}
?>
