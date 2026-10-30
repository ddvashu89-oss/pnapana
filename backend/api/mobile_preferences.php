<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET', 'POST']);
$user = mobile_user($pdo);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = mobile_body();
    $time = $data['reminder_time'] ?? '09:00';
    $language = $data['language'] ?? 'en';
    if (!is_string($time) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) mobile_fail('Use a valid 24-hour reminder time.');
    if (!in_array($language, ['en', 'hi'], true)) mobile_fail('Choose English or Hindi.');
    $pdo->prepare('INSERT INTO mobile_preferences (user_id, reminders, reminder_time, language) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE reminders = VALUES(reminders), reminder_time = VALUES(reminder_time), language = VALUES(language)')->execute([$user['id'], !empty($data['reminders']) ? 1 : 0, $time, $language]);
}
$stmt = $pdo->prepare('SELECT reminders, reminder_time, language FROM mobile_preferences WHERE user_id = ?');
$stmt->execute([$user['id']]);
$prefs = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['reminders' => false, 'reminder_time' => '09:00', 'language' => 'en'];
$prefs['reminders'] = (bool)$prefs['reminders'];
echo json_encode(['status' => 'success', 'preferences' => $prefs]);
