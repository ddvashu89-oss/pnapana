<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET', 'POST']);
$user = mobile_user($pdo);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = mobile_body();
    $time = $data['reminder_time'] ?? '09:00';
    $language = $data['language'] ?? 'en';
    $fertilizerDays = filter_var($data['fertilizer_interval_days'] ?? 30, FILTER_VALIDATE_INT);
    if (!is_string($time) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) mobile_fail('Use a valid 24-hour reminder time.');
    if (!in_array($language, ['en', 'hi'], true)) mobile_fail('Choose English or Hindi.');
    if ($fertilizerDays === false || $fertilizerDays < 7 || $fertilizerDays > 365) mobile_fail('Choose a fertilizer interval between 7 and 365 days.');
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO mobile_preferences (user_id, reminders, reminder_time, language) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE reminders = VALUES(reminders), reminder_time = VALUES(reminder_time), language = VALUES(language)')->execute([$user['id'], !empty($data['reminders']) ? 1 : 0, $time, $language]);
        $pdo->prepare('INSERT INTO mobile_feature_preferences (user_id, weather_reminders, push_enabled, fertilizer_interval_days) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE weather_reminders = VALUES(weather_reminders), push_enabled = VALUES(push_enabled), fertilizer_interval_days = VALUES(fertilizer_interval_days)')->execute([$user['id'], !empty($data['weather_reminders']) ? 1 : 0, !empty($data['push_enabled']) ? 1 : 0, $fertilizerDays]);
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}
$stmt = $pdo->prepare('SELECT p.reminders, p.reminder_time, p.language, COALESCE(f.weather_reminders, 1) AS weather_reminders, COALESCE(f.push_enabled, 0) AS push_enabled, COALESCE(f.fertilizer_interval_days, 30) AS fertilizer_interval_days FROM mobile_preferences p LEFT JOIN mobile_feature_preferences f ON f.user_id = p.user_id WHERE p.user_id = ?');
$stmt->execute([$user['id']]);
$prefs = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['reminders' => false, 'weather_reminders' => true, 'push_enabled' => false, 'reminder_time' => '09:00', 'fertilizer_interval_days' => 30, 'language' => 'en'];
$prefs['reminders'] = (bool)$prefs['reminders'];
$prefs['weather_reminders'] = (bool)$prefs['weather_reminders'];
$prefs['push_enabled'] = (bool)$prefs['push_enabled'];
$prefs['fertilizer_interval_days'] = (int)$prefs['fertilizer_interval_days'];
echo json_encode(['status' => 'success', 'preferences' => $prefs]);
