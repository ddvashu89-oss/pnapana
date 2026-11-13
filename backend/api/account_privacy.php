<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';
$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') check_rate_limit('account_privacy', 10, 3600);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json; charset=UTF-8');
    $stmt = $pdo->prepare('SELECT status, requested_at, scheduled_for, cancelled_at FROM account_deletion_requests WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    echo json_encode(['status' => 'success', 'deletion_request' => $stmt->fetch(PDO::FETCH_ASSOC) ?: null]); exit;
}
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$action = trim((string)($data['action'] ?? ''));
$password = trim((string)($data['password'] ?? ''));
if ($password === '' || !password_verify($password, $user['password'])) {
    header('Content-Type: application/json; charset=UTF-8');
    http_response_code(401); echo json_encode(['status' => 'error', 'message' => 'Incorrect password.']); exit;
}

try {
    if ($action === 'export') {
        $export = [
            'exported_at' => gmdate('c'),
            'account' => ['id' => (int)$user['id'], 'name' => $user['name'], 'email' => $user['email'], 'created_at' => $user['created_at']],
        ];
        $queries = [
            'plants' => 'SELECT id, name, species, image_url, status, native_region, light_requirement, water_requirement, humidity, pet_friendly, water_freq, light_req, last_watered, care_plan, purchased_on, placement, setup_completed, setup_completed_at, setup_data, created_at FROM plants WHERE user_id = ?',
            'journal' => 'SELECT plant_id, entry_type, title, notes, image_url, height_cm, compared_entry_id, created_at FROM plant_journal_entries WHERE user_id = ?',
            'disease_cases' => 'SELECT plant_id, diagnosis, treatment, initial_image_url, follow_up_due_at, follow_up_image_url, follow_up_notes, followed_up_at, status, created_at FROM disease_cases WHERE user_id = ?',
            'care_profiles' => 'SELECT plant_id, soil_type, pot_size_cm, pot_material, has_drainage, last_repotted_on, repot_interval_months, next_repot_on, fertilizer_name, fertilizer_interval_days, last_fertilized_on, next_fertilizer_on, updated_at FROM plant_care_profiles WHERE user_id = ?',
            'care_events' => 'SELECT plant_id, event_type, details, created_at FROM care_events WHERE user_id = ?',
            'community_posts' => 'SELECT plant_id, plant_name, caption, image_url, likes_count, coins_earned, created_at FROM community_posts WHERE user_id = ?',
            'subscriptions' => 'SELECT plan_id, status, started_at, expires_at, created_at FROM subscriptions WHERE user_id = ?',
            'vacation_mode' => 'SELECT enabled, starts_on, ends_on, instructions, updated_at FROM vacation_modes WHERE user_id = ?',
            'caregiver_invites_sent' => 'SELECT caregiver_user_id, starts_on, ends_on, status, message, created_at, responded_at FROM caregiver_invites WHERE owner_user_id = ?',
            'caregiver_invites_received' => 'SELECT owner_user_id, starts_on, ends_on, status, message, created_at, responded_at FROM caregiver_invites WHERE caregiver_user_id = ?',
        ];
        foreach ($queries as $key => $sql) { $stmt = $pdo->prepare($sql); $stmt->execute([$user['id']]); $export[$key] = $stmt->fetchAll(PDO::FETCH_ASSOC); }
        $scanStmt = $pdo->prepare('SELECT s.plant_id, s.ai_analysis, s.status, s.created_at FROM plant_scans s JOIN plants p ON p.id=s.plant_id WHERE p.user_id=?');
        $scanStmt->execute([$user['id']]); $export['plant_scans'] = $scanStmt->fetchAll(PDO::FETCH_ASSOC);
        $pdo->prepare("INSERT INTO analytics_events (user_id, event_name) VALUES (?, 'account_data_exported')")->execute([$user['id']]);
        header('Content-Type: application/json; charset=UTF-8');
        header('Content-Disposition: attachment; filename="pnapana-data-' . date('Y-m-d') . '.json"');
        echo json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES); exit;
    }

    header('Content-Type: application/json; charset=UTF-8');
    if ($action === 'request_deletion') {
        $stmt = $pdo->prepare("INSERT INTO account_deletion_requests (user_id, scheduled_for, status, cancelled_at, completed_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 30 DAY), 'pending', NULL, NULL) ON DUPLICATE KEY UPDATE requested_at=NOW(), scheduled_for=DATE_ADD(NOW(), INTERVAL 30 DAY), status='pending', cancelled_at=NULL, completed_at=NULL");
        $stmt->execute([$user['id']]);
        $dateStmt = $pdo->prepare('SELECT scheduled_for FROM account_deletion_requests WHERE user_id = ?');
        $dateStmt->execute([$user['id']]);
        echo json_encode(['status' => 'success', 'scheduled_for' => $dateStmt->fetchColumn(), 'message' => 'Account deletion scheduled. You can cancel during the next 30 days.']); exit;
    }
    if ($action === 'cancel_deletion') {
        $stmt = $pdo->prepare("UPDATE account_deletion_requests SET status='cancelled', cancelled_at=NOW() WHERE user_id=? AND status='pending'");
        $stmt->execute([$user['id']]);
        echo json_encode(['status' => 'success', 'message' => 'Account deletion cancelled.']); exit;
    }
    throw new InvalidArgumentException('Unsupported privacy action.');
} catch (InvalidArgumentException $e) {
    http_response_code(422); echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('account_privacy error: ' . $e->getMessage());
    http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Privacy request could not be completed.']);
}
