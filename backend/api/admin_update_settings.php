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

$site_name = isset($data['site_name']) ? trim($data['site_name']) : 'Pnapana';
$support_email = isset($data['support_email']) ? trim($data['support_email']) : 'support@pnapana.com';
$allow_signups = !empty($data['allow_signups']) ? 1 : 0;
$ai_scanning_enabled = !empty($data['ai_scanning_enabled']) ? 1 : 0;
$community_enabled = !empty($data['community_enabled']) ? 1 : 0;
$maintenance_mode = !empty($data['maintenance_mode']) ? 1 : 0;

try {
    $stmt = $pdo->prepare("UPDATE app_settings SET
        site_name = ?, support_email = ?, allow_signups = ?,
        ai_scanning_enabled = ?, community_enabled = ?, maintenance_mode = ?
        WHERE id = 1");
    $stmt->execute([$site_name, $support_email, $allow_signups, $ai_scanning_enabled, $community_enabled, $maintenance_mode]);

    echo json_encode(["status" => "success", "message" => "Settings saved"]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
