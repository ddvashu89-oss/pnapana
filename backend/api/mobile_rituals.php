<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET', 'POST']);
$user = mobile_user($pdo);
$data = $_SERVER['REQUEST_METHOD'] === 'POST' ? mobile_body() : $_GET;
$day = $data['day'] ?? date('Y-m-d');
$parsed = is_string($day) ? DateTimeImmutable::createFromFormat('!Y-m-d', $day) : false;
if (!$parsed || $parsed->format('Y-m-d') !== $day) mobile_fail('Use a valid calendar date.');
// Client-local days may differ from the server by one day, but cannot be backdated arbitrarily.
if (abs($parsed->getTimestamp() - (new DateTimeImmutable('today'))->getTimestamp()) > 86400) mobile_fail('The ritual date must be today in your local timezone.');
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ritual = $data['ritual'] ?? '';
    if (!in_array($ritual, ['morning', 'evening', 'weekly'], true)) mobile_fail('Choose a valid ritual.');
    $pdo->prepare('INSERT IGNORE INTO mobile_ritual_events (user_id, ritual, local_day) VALUES (?, ?, ?)')->execute([$user['id'], $ritual, $day]);
}
$stmt = $pdo->prepare('SELECT ritual FROM mobile_ritual_events WHERE user_id = ? AND local_day = ?');
$stmt->execute([$user['id'], $day]); $completed = $stmt->fetchAll(PDO::FETCH_COLUMN);
$stmt = $pdo->prepare('SELECT DISTINCT local_day FROM mobile_ritual_events WHERE user_id = ? AND local_day <= ? ORDER BY local_day DESC');
$stmt->execute([$user['id'], $day]); $days = array_flip($stmt->fetchAll(PDO::FETCH_COLUMN));
$streak = 0; $cursor = $parsed;
if (!isset($days[$cursor->format('Y-m-d')])) $cursor = $cursor->modify('-1 day');
while (isset($days[$cursor->format('Y-m-d')])) { $streak++; $cursor = $cursor->modify('-1 day'); }
echo json_encode(['status' => 'success', 'day' => $day, 'completed' => $completed, 'streak_days' => $streak]);
