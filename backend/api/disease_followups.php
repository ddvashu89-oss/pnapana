<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/feature_upload.php';
$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') check_rate_limit('disease_followup_write', 20, 3600);

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->prepare('SELECT d.*, p.name AS plant_name, p.species FROM disease_cases d JOIN plants p ON p.id = d.plant_id WHERE d.user_id = ? ORDER BY (d.status = \'monitoring\') DESC, d.follow_up_due_at ASC, d.id DESC');
        $stmt->execute([$user['id']]);
        echo json_encode(['status' => 'success', 'cases' => $stmt->fetchAll(PDO::FETCH_ASSOC)]); exit;
    }

    $action = trim((string)($_POST['action'] ?? 'create'));
    if ($action === 'create') {
        $plantId = (int)($_POST['plant_id'] ?? 0);
        $diagnosis = trim((string)($_POST['diagnosis'] ?? ''));
        $treatment = trim((string)($_POST['treatment'] ?? ''));
        $check = $pdo->prepare('SELECT 1 FROM plants WHERE id = ? AND user_id = ?');
        $check->execute([$plantId, $user['id']]);
        if (!$check->fetchColumn()) throw new InvalidArgumentException('Choose one of your plants.');
        if ($diagnosis === '' || mb_strlen($diagnosis) > 255) throw new InvalidArgumentException('Add a short diagnosis.');
        if (mb_strlen($treatment) > 5000) throw new InvalidArgumentException('Keep the treatment under 5,000 characters.');
        $image = pnapana_save_feature_upload();
        $stmt = $pdo->prepare("INSERT INTO disease_cases (user_id, plant_id, diagnosis, treatment, initial_image_url, follow_up_due_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 DAY))");
        $stmt->execute([$user['id'], $plantId, $diagnosis, $treatment ?: null, $image]);
        $id = (int)$pdo->lastInsertId();
        $pdo->prepare("INSERT INTO analytics_events (user_id, event_name, metadata) VALUES (?, 'disease_followup_created', ?)")->execute([$user['id'], json_encode(['plant_id' => $plantId, 'case_id' => $id])]);
        http_response_code(201); echo json_encode(['status' => 'success', 'id' => $id, 'message' => 'Recovery check scheduled in 3 days.']); exit;
    }

    $caseId = (int)($_POST['case_id'] ?? 0);
    $caseStmt = $pdo->prepare('SELECT * FROM disease_cases WHERE id = ? AND user_id = ?');
    $caseStmt->execute([$caseId, $user['id']]);
    $case = $caseStmt->fetch(PDO::FETCH_ASSOC);
    if (!$case) throw new InvalidArgumentException('Recovery case not found.');

    if ($action === 'follow_up') {
        $notes = trim((string)($_POST['notes'] ?? ''));
        if (mb_strlen($notes) > 3000) throw new InvalidArgumentException('Keep follow-up notes under 3,000 characters.');
        $image = pnapana_save_feature_upload();
        if (!$image) throw new InvalidArgumentException('Add a follow-up photo.');
        $status = in_array($_POST['status'] ?? '', ['monitoring', 'improving', 'recovered'], true) ? $_POST['status'] : 'improving';
        $stmt = $pdo->prepare('UPDATE disease_cases SET follow_up_image_url = ?, follow_up_notes = ?, followed_up_at = NOW(), status = ?, follow_up_due_at = CASE WHEN ? = \'monitoring\' THEN DATE_ADD(NOW(), INTERVAL 3 DAY) ELSE follow_up_due_at END WHERE id = ? AND user_id = ?');
        $stmt->execute([$image, $notes ?: null, $status, $status, $caseId, $user['id']]);
        echo json_encode(['status' => 'success', 'message' => $status === 'recovered' ? 'Plant marked recovered.' : 'Recovery update saved.']); exit;
    }

    if ($action === 'resolve') {
        $pdo->prepare("UPDATE disease_cases SET status = 'recovered', followed_up_at = COALESCE(followed_up_at, NOW()) WHERE id = ? AND user_id = ?")->execute([$caseId, $user['id']]);
        echo json_encode(['status' => 'success', 'message' => 'Plant marked recovered.']); exit;
    }
    throw new InvalidArgumentException('Unsupported recovery action.');
} catch (InvalidArgumentException $e) {
    http_response_code(422); echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('disease_followups error: ' . $e->getMessage());
    http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Recovery tracking is temporarily unavailable.']);
}
