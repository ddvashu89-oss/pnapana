<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET']);
$user = mobile_user($pdo, true);
echo json_encode([
    'status' => 'success', 'version' => 1,
    'user' => [
        'id' => (int)$user['id'], 'name' => $user['name'], 'email' => $user['email'],
        'is_admin' => (bool)$user['is_admin'], 'customer_id' => $user['customer_id'] ?? null,
        'has_gemini_key' => !empty($user['gemini_api_key'])
    ],
    'settings' => mobile_settings($pdo),
    'plan' => get_active_plan($pdo, $user['id']),
]);
