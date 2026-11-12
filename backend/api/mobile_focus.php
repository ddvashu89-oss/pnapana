<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET', 'POST']);
$user = mobile_user($pdo);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = mobile_body();
    $key = $data['session_id'] ?? '';
    $duration = filter_var($data['duration_minutes'] ?? null, FILTER_VALIDATE_INT);
    $started = strtotime((string)($data['started_at'] ?? ''));
    $completed = strtotime((string)($data['completed_at'] ?? ''));
    if (!is_string($key) || !preg_match('/^[a-zA-Z0-9-]{8,80}$/', $key) || $duration === false || $duration < 5 || $duration > 120 || !$started || !$completed) mobile_fail('The focus session is invalid.');
    if ($completed - $started < ($duration * 60) - 30 || $completed > time() + 300 || $started < time() - 86400) mobile_fail('The focus session has not completed yet.');
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT IGNORE INTO mobile_focus_sessions (user_id, session_key, duration_minutes, started_at, completed_at, completed_day, coins_earned) VALUES (?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?), DATE(FROM_UNIXTIME(?)), 5)');
        $stmt->execute([$user['id'], $key, $duration, $started, $completed, $completed]);
        if ($stmt->rowCount() === 1) $pdo->prepare('UPDATE users SET coins = coins + 5 WHERE id = ?')->execute([$user['id']]);
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}
$summary = $pdo->prepare('SELECT COUNT(*) AS sessions, COALESCE(SUM(duration_minutes), 0) AS total_minutes, COALESCE(SUM(CASE WHEN completed_day = CURRENT_DATE THEN duration_minutes ELSE 0 END), 0) AS today_minutes, COALESCE(SUM(coins_earned), 0) AS coins_earned FROM mobile_focus_sessions WHERE user_id = ?');
$summary->execute([$user['id']]);
$stats = $summary->fetch(PDO::FETCH_ASSOC);
$dates = $pdo->prepare('SELECT DISTINCT completed_day FROM mobile_focus_sessions WHERE user_id = ? ORDER BY completed_day DESC');
$dates->execute([$user['id']]);
$days = array_flip($dates->fetchAll(PDO::FETCH_COLUMN));
$cursor = new DateTimeImmutable('today');
if (!isset($days[$cursor->format('Y-m-d')])) $cursor = $cursor->modify('-1 day');
$streak = 0;
while (isset($days[$cursor->format('Y-m-d')])) { $streak++; $cursor = $cursor->modify('-1 day'); }
foreach (['sessions', 'total_minutes', 'today_minutes', 'coins_earned'] as $field) $stats[$field] = (int)$stats[$field];
$stats['streak_days'] = $streak;
echo json_encode(['status' => 'success', 'stats' => $stats]);
