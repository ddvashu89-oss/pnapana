<?php
require_once __DIR__ . '/mobile_common.php';
require_once __DIR__ . '/../growth_schema.php';
mobile_method(['POST']);
$user = mobile_user($pdo, true);
pnapana_ensure_growth_schema($pdo);
$data = mobile_body();
$password = trim((string)($data['password'] ?? ''));
if ($password === '' || !password_verify($password, $user['password'])) mobile_fail('Incorrect password. Account deletion aborted.', 401);
$stmt = $pdo->prepare("INSERT INTO account_deletion_requests (user_id, scheduled_for, status, cancelled_at, completed_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 30 DAY), 'pending', NULL, NULL) ON DUPLICATE KEY UPDATE requested_at=NOW(), scheduled_for=DATE_ADD(NOW(), INTERVAL 30 DAY), status='pending', cancelled_at=NULL, completed_at=NULL");
$stmt->execute([$user['id']]);
$date = $pdo->prepare('SELECT scheduled_for FROM account_deletion_requests WHERE user_id=?'); $date->execute([$user['id']]);
echo json_encode(['status' => 'success', 'scheduled_for' => $date->fetchColumn(), 'message' => 'Account deletion scheduled in 30 days.']);
