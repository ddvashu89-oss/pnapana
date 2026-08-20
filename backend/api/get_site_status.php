<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';

// Public, unauthenticated: any visitor (including anonymous ones on marketing
// pages) needs to know whether the site is in maintenance mode.
try {
    $stmt = $pdo->query("SELECT site_name, support_email, maintenance_mode FROM app_settings WHERE id = 1");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    $settings['maintenance_mode'] = (bool)$settings['maintenance_mode'];

    echo json_encode(["status" => "success", "settings" => $settings]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("get_site_status error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
