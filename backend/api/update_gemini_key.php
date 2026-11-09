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
$clearGeminiApiKey = is_array($data) && ($data['clear_gemini_api_key'] ?? false) === true;
$providedGeminiApiKey = is_array($data) ? ($data['gemini_api_key'] ?? null) : null;

if (!$clearGeminiApiKey && (!is_string($providedGeminiApiKey) || trim($providedGeminiApiKey) === '')) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Enter a Gemini API key to save, or choose Remove saved key."]);
    exit;
}

$geminiApiKey = $clearGeminiApiKey ? null : trim($providedGeminiApiKey);

try {
    $stmt = $conn->prepare("UPDATE users SET gemini_api_key = :key WHERE id = :id");
    $stmt->bindParam(':key', $geminiApiKey);
    $stmt->bindParam(':id', $userId);
    $stmt->execute();

    echo json_encode([
        "status" => "success",
        "message" => $clearGeminiApiKey ? "Gemini API key removed." : "Gemini API key updated successfully.",
        "has_gemini_api_key" => !empty($geminiApiKey)
    ]);
} catch (PDOException $e) {
    error_log("Failed to update Gemini API key: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to update Gemini API key. Please try again later."]);
}
?>
