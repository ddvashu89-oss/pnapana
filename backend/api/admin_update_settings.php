<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

$data = json_decode(file_get_contents('php://input'), true);

$site_name = isset($data['site_name']) ? trim($data['site_name']) : 'Pnapana';
$support_email = isset($data['support_email']) ? trim($data['support_email']) : 'support@pnapana.com';
$allow_signups = !empty($data['allow_signups']) ? 1 : 0;
$ai_scanning_enabled = !empty($data['ai_scanning_enabled']) ? 1 : 0;
$community_enabled = !empty($data['community_enabled']) ? 1 : 0;
$maintenance_mode = !empty($data['maintenance_mode']) ? 1 : 0;
$upi_id = isset($data['upi_id']) ? trim($data['upi_id']) : '';
$upi_payee_name = isset($data['upi_payee_name']) ? trim($data['upi_payee_name']) : 'Pnapana';

try {
    $stmt = $pdo->prepare("UPDATE app_settings SET
        site_name = ?, support_email = ?, allow_signups = ?,
        ai_scanning_enabled = ?, community_enabled = ?, maintenance_mode = ?,
        upi_id = ?, upi_payee_name = ?
        WHERE id = 1");
    $stmt->execute([$site_name, $support_email, $allow_signups, $ai_scanning_enabled,
                    $community_enabled, $maintenance_mode, $upi_id, $upi_payee_name]);

    echo json_encode(["status" => "success", "message" => "Settings saved"]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("admin_update_settings error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
