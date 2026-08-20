<?php
require_once '../db.php';
require_once '../rate_limiter.php';

// Rate limit: max 5 contact submissions per 10 minutes
check_rate_limit('submit_contact', 5, 600);

$data = json_decode(file_get_contents('php://input'), true);

$name = strip_tags(trim($data['name'] ?? ''));
$email = strtolower(trim($data['email'] ?? ''));
$category = trim($data['category'] ?? 'general');
$subject = strip_tags(trim($data['subject'] ?? ''));
$message = strip_tags(trim($data['message'] ?? ''));

if ($name === '' || $email === '' || $message === '') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Name, email, and message are required."]);
    exit;
}

if (mb_strlen($name) > 100 || mb_strlen($subject) > 200 || mb_strlen($message) > 5000) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Input character limit exceeded."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
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
        "id" => (int)$pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    error_log("Contact message submission error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to submit message. Please try again later."]);
}
?>
