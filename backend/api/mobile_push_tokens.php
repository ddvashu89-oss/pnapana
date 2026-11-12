<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET', 'POST']);
$user = mobile_user($pdo);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = mobile_body();
    $token = trim((string)($data['token'] ?? ''));
    $enabled = !empty($data['enabled']);
    if ($enabled && (!preg_match('/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/', $token) || strlen($token) > 255)) mobile_fail('A valid Expo push token is required.');
    if (!$enabled) {
        if ($token === '') $pdo->prepare('DELETE FROM mobile_push_tokens WHERE user_id = ?')->execute([$user['id']]);
        elseif (preg_match('/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/', $token)) $pdo->prepare('DELETE FROM mobile_push_tokens WHERE user_id = ? AND expo_push_token = ?')->execute([$user['id'], $token]);
        else mobile_fail('A valid Expo push token is required.');
    }
    else {
        $platform = in_array($data['platform'] ?? '', ['android', 'ios'], true) ? $data['platform'] : 'android';
        $version = substr(trim((string)($data['app_version'] ?? '')), 0, 30);
        $pdo->prepare('INSERT INTO mobile_push_tokens (user_id, expo_push_token, platform, app_version, enabled) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform), app_version = VALUES(app_version), enabled = 1')->execute([$user['id'], $token, $platform, $version ?: null]);
    }
}
$stmt = $pdo->prepare('SELECT COUNT(*) FROM mobile_push_tokens WHERE user_id = ? AND enabled = 1');
$stmt->execute([$user['id']]);
echo json_encode(['status' => 'success', 'enabled' => (int)$stmt->fetchColumn() > 0]);
