<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!array_key_exists('alerts_enabled', $data)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Choose whether weather alerts are on or off.']);
            exit;
        }
        $enabled = filter_var($data['alerts_enabled'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($enabled === null) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid alert preference.']);
            exit;
        }
        $stmt = $pdo->prepare('INSERT INTO user_weather_preferences (user_id, alerts_enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE alerts_enabled=VALUES(alerts_enabled)');
        $stmt->execute([$user['id'], $enabled ? 1 : 0]);
        echo json_encode(['status' => 'success', 'alerts_enabled' => $enabled]);
        exit;
    }
    $stmt = $pdo->prepare('SELECT alerts_enabled FROM user_weather_preferences WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    echo json_encode(['status' => 'success', 'alerts_enabled' => (bool)$stmt->fetchColumn()]);
} catch (PDOException $error) {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'Weather alert preferences are unavailable until the latest database migration is applied.']);
}
