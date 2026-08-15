<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';

// Public, unauthenticated: any visitor (including anonymous ones on marketing
// pages) needs to know whether the site is in maintenance mode.
try {
    $stmt = $pdo->query("SELECT site_name, support_email, maintenance_mode FROM app_settings WHERE id = 1");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    $settings['maintenance_mode'] = (bool)$settings['maintenance_mode'];

    echo json_encode(["status" => "success", "settings" => $settings]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
