<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';

$data = json_decode(file_get_contents('php://input'), true);

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$category = trim($data['category'] ?? 'general');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');

if ($name === '' || $email === '' || $message === '') {
    echo json_encode(["status" => "error", "message" => "Name, email, and message are required."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["status" => "error", "message" => "Please enter a valid email address."]);
    exit;
}

$allowedCategories = ['general', 'support', 'feedback'];
if (!in_array($category, $allowedCategories)) {
    $category = 'general';
}

try {
    $stmt = $pdo->prepare("INSERT INTO contact_messages (name, email, category, subject, message) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $category, $subject, $message]);

    echo json_encode([
        "status" => "success",
        "message" => "Thanks for reaching out! We'll get back to you within 24 hours.",
        "id" => $pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
