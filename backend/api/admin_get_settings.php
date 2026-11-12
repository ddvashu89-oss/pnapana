<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once '../gemini_helper.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

try {
    $stmt = $pdo->query("SELECT site_name, support_email, allow_signups, ai_scanning_enabled, community_enabled, maintenance_mode, upi_id, upi_payee_name FROM app_settings WHERE id = 1");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    foreach (['allow_signups', 'ai_scanning_enabled', 'community_enabled', 'maintenance_mode'] as $flag) {
        $settings[$flag] = (bool)$settings[$flag];
    }

    $dashboardKey = '';
    try {
        $dashboardKey = (string)$pdo->query("SELECT gemini_api_key FROM app_settings WHERE id = 1")->fetchColumn();
    } catch (PDOException $e) {
        // The migration has not been applied yet; server configuration still works.
    }
    $serverKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : (getenv('GEMINI_API_KEY') ?: '');
    $settings['gemini_api_key_configured'] = trim($dashboardKey) !== '' || trim((string)$serverKey) !== '';
    $settings['gemini_api_key_source'] = trim($dashboardKey) !== '' ? 'dashboard' : (trim((string)$serverKey) !== '' ? 'server' : 'none');

    echo json_encode(["status" => "success", "settings" => $settings]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("admin_get_settings error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
