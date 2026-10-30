<?php
// Companion endpoints are installed beside Pnapana's existing backend/api files.
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/../account_helper.php';

function mobile_fail($message, $status = 400, $code = null) {
    http_response_code($status);
    echo json_encode(['status' => 'error', 'message' => $message, 'code' => $code]);
    exit;
}
function mobile_body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) mobile_fail('A JSON object is required.');
    return $data;
}
function mobile_settings($pdo) {
    $settings = $pdo->query('SELECT site_name, support_email, maintenance_mode, allow_signups, ai_scanning_enabled, community_enabled FROM app_settings WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
    if (!$settings) mobile_fail('Site settings are unavailable.', 503);
    foreach (['maintenance_mode', 'allow_signups', 'ai_scanning_enabled', 'community_enabled'] as $flag) $settings[$flag] = (bool)$settings[$flag];
    return $settings;
}
function mobile_user($pdo, $allowMaintenance = false) {
    $user = authenticate($pdo);
    if (isset($user['status']) && strtoupper($user['status']) !== 'ACTIVE') mobile_fail('This account is not active. Please contact support.', 403, 'ACCOUNT_INACTIVE');
    if (!$allowMaintenance && empty($user['is_admin']) && mobile_settings($pdo)['maintenance_mode']) mobile_fail('Pnapana is taking a little maintenance break.', 503, 'MAINTENANCE');
    return $user;
}
function mobile_method($methods) {
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) mobile_fail('Method not allowed.', 405);
}
set_exception_handler(function ($error) {
    error_log('Pnapana mobile endpoint: ' . get_class($error));
    mobile_fail('The mobile service is unavailable. Check that its database migration has been installed.', 503);
});
