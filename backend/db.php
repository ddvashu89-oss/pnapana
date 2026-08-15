<?php
date_default_timezone_set('Asia/Kolkata');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
$host = 'localhost';
$db_name = 'pnapana_db';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Also define $conn for backwards compatibility with any old scripts
    $conn = $pdo;
} catch(PDOException $e) {
    echo json_encode(["error" => "Connection Error: " . $e->getMessage()]);
    exit;
}
?>
