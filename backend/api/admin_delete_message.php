<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

$data = json_decode(file_get_contents('php://input'), true);
$message_id = isset($data['id']) ? (int)$data['id'] : 0;

if (!$message_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Message id is required"]);
    exit();
}

try {
    $stmt = $pdo->prepare("DELETE FROM contact_messages WHERE id = ?");
    $stmt->execute([$message_id]);

    echo json_encode(["status" => "success", "message" => "Message deleted"]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
