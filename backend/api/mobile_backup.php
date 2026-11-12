<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET']);
$user = mobile_user($pdo, true);
function mobile_backup_rows($pdo, $sql, $params) {
    $stmt = $pdo->prepare($sql); $stmt->execute($params); return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
$userId = (int)$user['id'];
$account = ['id' => $userId, 'customer_id' => $user['customer_id'] ?? null, 'name' => $user['name'], 'email' => $user['email'], 'created_at' => $user['created_at'] ?? null];
$plants = mobile_backup_rows($pdo, 'SELECT * FROM plants WHERE user_id = ? ORDER BY id', [$userId]);
echo json_encode([
    'status' => 'success', 'format' => 'pnapana-account-backup-v1', 'generated_at' => gmdate(DATE_ATOM), 'account' => $account,
    'plants' => $plants,
    'care_events' => mobile_backup_rows($pdo, 'SELECT id, plant_id, event_type, details, created_at FROM care_events WHERE user_id = ? ORDER BY created_at', [$userId]),
    'health_timeline' => mobile_backup_rows($pdo, 'SELECT id, plant_id, image_url, note, health_status, created_at FROM mobile_plant_health_entries WHERE user_id = ? ORDER BY created_at', [$userId]),
    'plant_scans' => mobile_backup_rows($pdo, 'SELECT ps.* FROM plant_scans ps JOIN plants p ON p.id = ps.plant_id WHERE p.user_id = ? ORDER BY ps.created_at', [$userId]),
    'ai_scan_history' => mobile_backup_rows($pdo, 'SELECT id, plant_id, scan_type, provider, model_version, confidence, uncertain, image_sha256, result_json, created_at FROM mobile_ai_scan_history WHERE user_id = ? ORDER BY created_at', [$userId]),
    'focus_sessions' => mobile_backup_rows($pdo, 'SELECT duration_minutes, started_at, completed_at, coins_earned FROM mobile_focus_sessions WHERE user_id = ? ORDER BY completed_at', [$userId]),
    'rituals' => mobile_backup_rows($pdo, 'SELECT ritual, local_day, created_at FROM mobile_ritual_events WHERE user_id = ? ORDER BY created_at', [$userId]),
    'community_posts' => mobile_backup_rows($pdo, 'SELECT id, plant_id, plant_name, caption, image_url, likes_count, coins_earned, created_at FROM community_posts WHERE user_id = ? ORDER BY created_at', [$userId]),
    'payments' => mobile_backup_rows($pdo, 'SELECT id, plan_id, amount, reference, status, admin_note, submitted_at, verified_at FROM payment_requests WHERE user_id = ? ORDER BY submitted_at', [$userId]),
    'preferences' => mobile_backup_rows($pdo, 'SELECT p.reminders, p.reminder_time, p.language, f.weather_reminders, f.push_enabled, f.fertilizer_interval_days FROM mobile_preferences p LEFT JOIN mobile_feature_preferences f ON f.user_id = p.user_id WHERE p.user_id = ?', [$userId]),
]);
