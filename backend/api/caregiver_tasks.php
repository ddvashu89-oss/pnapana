<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';
$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') check_rate_limit('caregiver_write', 20, 3600);

function caregiver_body(): array { return json_decode(file_get_contents('php://input'), true) ?: []; }

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $owned = $pdo->prepare('SELECT i.id, i.starts_on, i.ends_on, i.status, i.message, u.name AS caregiver_name, u.email AS caregiver_email, COUNT(t.id) AS task_count, SUM(t.completed_at IS NOT NULL) AS completed_count FROM caregiver_invites i JOIN users u ON u.id = i.caregiver_user_id LEFT JOIN caregiver_tasks t ON t.invite_id = i.id WHERE i.owner_user_id = ? GROUP BY i.id ORDER BY i.created_at DESC');
        $owned->execute([$user['id']]);
        $assigned = $pdo->prepare('SELECT i.id AS invite_id, i.starts_on, i.ends_on, i.status, i.message, o.name AS owner_name, o.email AS owner_email, t.id AS task_id, t.task_type, t.instructions, t.due_on, t.completed_at, p.id AS plant_id, p.name AS plant_name, p.species, p.image_url FROM caregiver_invites i JOIN users o ON o.id = i.owner_user_id LEFT JOIN caregiver_tasks t ON t.invite_id = i.id LEFT JOIN plants p ON p.id = t.plant_id WHERE i.caregiver_user_id = ? ORDER BY i.created_at DESC, t.due_on ASC');
        $assigned->execute([$user['id']]);
        echo json_encode(['status' => 'success', 'sent_invites' => $owned->fetchAll(PDO::FETCH_ASSOC), 'assigned_tasks' => $assigned->fetchAll(PDO::FETCH_ASSOC)]); exit;
    }

    $data = caregiver_body();
    $action = trim((string)($data['action'] ?? 'invite'));
    if ($action === 'invite') {
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $start = trim((string)($data['starts_on'] ?? ''));
        $end = trim((string)($data['ends_on'] ?? ''));
        $message = trim((string)($data['message'] ?? ''));
        $tasks = is_array($data['tasks'] ?? null) ? $data['tasks'] : [];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Enter a valid Pnapana account email.');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end) || $start < date('Y-m-d') || $end < $start || $end > date('Y-m-d', strtotime($start . ' +120 days'))) throw new InvalidArgumentException('Choose a valid trip up to 120 days.');
        if (mb_strlen($message) > 500) throw new InvalidArgumentException('Keep the message under 500 characters.');
        if (!$tasks || count($tasks) > 100) throw new InvalidArgumentException('Assign at least one care task.');
        $caregiverStmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? AND status = 'ACTIVE'");
        $caregiverStmt->execute([$email]);
        $caregiverId = (int)$caregiverStmt->fetchColumn();
        if (!$caregiverId) throw new InvalidArgumentException('That email does not belong to an active Pnapana account.');
        if ($caregiverId === (int)$user['id']) throw new InvalidArgumentException('Choose another Pnapana member as caregiver.');
        $pdo->beginTransaction();
        $invite = $pdo->prepare('INSERT INTO caregiver_invites (owner_user_id, caregiver_user_id, starts_on, ends_on, message) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE message=VALUES(message), status=\'pending\', responded_at=NULL, id=LAST_INSERT_ID(id)');
        $invite->execute([$user['id'], $caregiverId, $start, $end, $message ?: null]);
        $inviteId = (int)$pdo->lastInsertId();
        $pdo->prepare('DELETE FROM caregiver_tasks WHERE invite_id = ?')->execute([$inviteId]);
        $plantCheck = $pdo->prepare('SELECT 1 FROM plants WHERE id = ? AND user_id = ?');
        $taskInsert = $pdo->prepare('INSERT INTO caregiver_tasks (invite_id, plant_id, task_type, instructions, due_on) VALUES (?, ?, ?, ?, ?)');
        foreach ($tasks as $task) {
            $plantId = (int)($task['plant_id'] ?? 0);
            $plantCheck->execute([$plantId, $user['id']]);
            if (!$plantCheck->fetchColumn()) throw new InvalidArgumentException('One assigned plant is not available.');
            $type = trim((string)($task['task_type'] ?? 'care'));
            $instructions = trim((string)($task['instructions'] ?? ''));
            $due = trim((string)($task['due_on'] ?? ''));
            if (!in_array($type, ['water', 'soil_check', 'fertilize', 'rotate', 'health_check', 'care'], true)) $type = 'care';
            if ($due < $start || $due > $end || mb_strlen($instructions) > 500) throw new InvalidArgumentException('Review the assigned task dates and instructions.');
            $taskInsert->execute([$inviteId, $plantId, $type, $instructions ?: null, $due]);
        }
        $pdo->commit();
        echo json_encode(['status' => 'success', 'message' => 'Caregiver invitation sent inside Pnapana.']); exit;
    }

    if ($action === 'respond') {
        $inviteId = (int)($data['invite_id'] ?? 0);
        $response = ($data['response'] ?? '') === 'accept' ? 'accepted' : 'declined';
        $stmt = $pdo->prepare("UPDATE caregiver_invites SET status = ?, responded_at = NOW() WHERE id = ? AND caregiver_user_id = ? AND status = 'pending'");
        $stmt->execute([$response, $inviteId, $user['id']]);
        if (!$stmt->rowCount()) throw new InvalidArgumentException('Invitation is no longer available.');
        echo json_encode(['status' => 'success', 'message' => $response === 'accepted' ? 'Care plan accepted.' : 'Invitation declined.']); exit;
    }

    if ($action === 'complete') {
        $taskId = (int)($data['task_id'] ?? 0);
        $stmt = $pdo->prepare("UPDATE caregiver_tasks t JOIN caregiver_invites i ON i.id=t.invite_id SET t.completed_at=COALESCE(t.completed_at, NOW()) WHERE t.id=? AND i.caregiver_user_id=? AND i.status='accepted'");
        $stmt->execute([$taskId, $user['id']]);
        if (!$stmt->rowCount()) throw new InvalidArgumentException('Task could not be completed.');
        echo json_encode(['status' => 'success', 'message' => 'Care task completed.']); exit;
    }
    throw new InvalidArgumentException('Unsupported caregiver action.');
} catch (InvalidArgumentException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(422); echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('caregiver_tasks error: ' . $e->getMessage());
    http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Caregiver tasks are temporarily unavailable.']);
}
