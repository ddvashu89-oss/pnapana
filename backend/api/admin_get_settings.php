<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

try {
    $stmt = $pdo->query("SELECT site_name, support_email, allow_signups, ai_scanning_enabled, community_enabled, maintenance_mode FROM app_settings WHERE id = 1");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    foreach (['allow_signups', 'ai_scanning_enabled', 'community_enabled', 'maintenance_mode'] as $flag) {
        $settings[$flag] = (bool)$settings[$flag];
    }

    echo json_encode(["status" => "success", "settings" => $settings]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
