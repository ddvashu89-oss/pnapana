<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
require_admin($user);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$clear = ($data['clear_gemini_api_key'] ?? false) === true;
$key = is_string($data['gemini_api_key'] ?? null) ? trim($data['gemini_api_key']) : '';

if (!$clear && ($key === '' || strlen($key) < 20 || strlen($key) > 255)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Enter a valid Gemini API key.']);
    exit;
}

try {
    $stmt = $pdo->prepare('UPDATE app_settings SET gemini_api_key = ? WHERE id = 1');
    $stmt->execute([$clear ? null : $key]);
    echo json_encode([
        'status' => 'success',
        'message' => $clear ? 'Dashboard Gemini key removed.' : 'Shared Gemini key saved.',
        'gemini_api_key_configured' => !$clear
    ]);
} catch (PDOException $e) {
    error_log('admin_update_gemini_key error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not save the shared key. Run the latest database migration and try again.']);
}
