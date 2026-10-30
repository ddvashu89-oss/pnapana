<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['POST']);
$user = mobile_user($pdo, true);
$pdo->prepare('UPDATE users SET token = ? WHERE id = ? AND token = ?')->execute([bin2hex(random_bytes(32)), $user['id'], $user['token']]);
echo json_encode(['status' => 'success']);
