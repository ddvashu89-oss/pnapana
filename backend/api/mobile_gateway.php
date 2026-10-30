<?php
require_once __DIR__ . '/mobile_common.php';
// Explicit route/method whitelist: never include a caller-supplied filesystem path.
$read = ['get_plants.php', 'get_plant_details.php', 'get_plant_scans.php', 'get_notifications.php', 'get_gamification.php', 'get_all_plants.php', 'get_community_posts.php', 'get_subscription.php', 'admin_get_users.php', 'admin_get_plants.php', 'admin_get_posts.php', 'admin_get_messages.php', 'admin_get_payments.php', 'admin_get_stats.php', 'admin_get_analytics.php', 'admin_get_settings.php'];
$write = ['add_plant.php', 'remove_plant.php', 'water_plant.php', 'identify_plant.php', 'diagnose_plant.php', 'analyze_plant.php', 'validate_plant_name.php', 'create_post.php', 'like_post.php', 'submit_payment.php', 'change_password.php', 'update_gemini_key.php', 'delete_account.php', 'admin_create_user.php', 'admin_update_user.php', 'admin_delete_user.php', 'admin_delete_plant.php', 'admin_delete_post.php', 'admin_delete_message.php', 'admin_review_payment.php', 'admin_update_settings.php'];
$endpoint = $_GET['endpoint'] ?? '';
if (!is_string($endpoint) || !in_array($endpoint, array_merge($read, $write), true)) mobile_fail('Unknown mobile operation.', 404);
mobile_method(in_array($endpoint, $read, true) ? ['GET'] : ['POST']);
$user = mobile_user($pdo); $settings = mobile_settings($pdo);
if (strpos($endpoint, 'admin_') === 0) require_admin($user);
if (in_array($endpoint, ['identify_plant.php', 'diagnose_plant.php', 'analyze_plant.php'], true) && !$settings['ai_scanning_enabled']) mobile_fail('Plant scanning is currently paused.', 503);
if (in_array($endpoint, ['create_post.php', 'like_post.php'], true) && !$settings['community_enabled']) mobile_fail('Community interactions are currently paused.', 503);
if (in_array($endpoint, ['diagnose_plant.php', 'analyze_plant.php'], true) && empty($user['is_admin']) && !get_active_plan($pdo, $user['id'])['ai_diagnosis']) mobile_fail('Your plan does not include health diagnosis.', 402, 'PLAN_REQUIRED');

// Cache successful responses for repeat delivery of the SAME operation key.
// MySQL advisory locking covers concurrent duplicate requests across PHP workers.
$deduplicate = in_array($endpoint, ['add_plant.php', 'create_post.php', 'water_plant.php', 'submit_payment.php', 'like_post.php'], true);
if ($deduplicate) {
    $key = $_GET['_request_key'] ?? '';
    if (!is_string($key) || !preg_match('/^[a-zA-Z0-9-]{8,80}$/', $key)) mobile_fail('An operation key is required.');
    $body = file_get_contents('php://input');
    if (isset($_FILES['screenshot']['tmp_name']) && is_uploaded_file($_FILES['screenshot']['tmp_name'])) $body = json_encode($_POST) . hash_file('sha256', $_FILES['screenshot']['tmp_name']);
    $hash = hash('sha256', $endpoint . ':' . $body);
    $lock = 'pnapana-mobile-' . substr(hash('sha256', $user['id'] . ':' . $key), 0, 48);
    $stmt = $pdo->prepare('SELECT GET_LOCK(?, 5)'); $stmt->execute([$lock]);
    if ((int)$stmt->fetchColumn() !== 1) mobile_fail('That action is still being processed. Refresh before trying again.', 409);
    $stmt = $pdo->prepare('SELECT payload_hash, response_body FROM mobile_request_keys WHERE user_id = ? AND request_key = ?'); $stmt->execute([$user['id'], $key]); $cached = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($cached) {
        $pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);
        if (!hash_equals($cached['payload_hash'], $hash)) mobile_fail('This operation key was already used for a different request.', 409);
        echo $cached['response_body']; exit;
    }
    ob_start();
    register_shutdown_function(function () use ($pdo, $user, $key, $hash, $lock) {
        $output = ob_get_contents(); $result = json_decode($output ?: '', true);
        try {
            if (http_response_code() < 400 && is_array($result) && ($result['status'] ?? '') === 'success') $pdo->prepare('INSERT INTO mobile_request_keys (user_id, request_key, payload_hash, response_body) VALUES (?, ?, ?, ?)')->execute([$user['id'], $key, $hash, $output]);
        } catch (Throwable $e) { error_log('Mobile response cache write failed'); }
        finally { try { $pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]); } catch (Throwable $e) {} }
    });
}

if ($endpoint === 'add_plant.php') { require __DIR__ . '/mobile_add_plant.php'; exit; }
if ($endpoint === 'water_plant.php') {
    // The legacy endpoint records an event even when its UPDATE matches no owned plant.
    // The mobile operation checks ownership and writes both changes atomically.
    $data = mobile_body(); $id = (int)($data['id'] ?? 0);
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ? FOR UPDATE'); $stmt->execute([$id, $user['id']]);
        if (!$stmt->fetchColumn()) { $pdo->rollBack(); mobile_fail('This plant does not belong to your garden.', 403); }
        $pdo->prepare('UPDATE plants SET last_watered = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')->execute([$id, $user['id']]);
        $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'water')")->execute([$user['id'], $id]);
        $pdo->commit(); echo json_encode(['status' => 'success', 'message' => 'Plant watered successfully.']);
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    exit;
}
if ($endpoint === 'analyze_plant.php') { require __DIR__ . '/mobile_analyze_plant.php'; exit; }
// Endpoints retain their existing validation, ownership checks and response contracts.
chdir(__DIR__);
require __DIR__ . '/' . $endpoint;
