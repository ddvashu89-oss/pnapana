<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, DELETE, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/feature_upload.php';

$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') check_rate_limit('plant_journal_write', 30, 3600);

function journal_owns_plant(PDO $pdo, int $userId, int $plantId): bool {
    $stmt = $pdo->prepare('SELECT 1 FROM plants WHERE id = ? AND user_id = ?');
    $stmt->execute([$plantId, $userId]);
    return (bool)$stmt->fetchColumn();
}
try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $plantId = max(0, (int)($_GET['plant_id'] ?? 0));
        $params = [$user['id']];
        $where = 'j.user_id = ?';
        if ($plantId) { $where .= ' AND j.plant_id = ?'; $params[] = $plantId; }
        $stmt = $pdo->prepare("SELECT j.*, p.name AS plant_name, p.species FROM plant_journal_entries j JOIN plants p ON p.id = j.plant_id WHERE $where ORDER BY j.created_at DESC, j.id DESC LIMIT 200");
        $stmt->execute($params);
        echo json_encode(['status' => 'success', 'entries' => $stmt->fetchAll(PDO::FETCH_ASSOC)]); exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = (int)($data['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT image_url FROM plant_journal_entries WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $user['id']]);
        $image = $stmt->fetchColumn();
        if ($image === false) { http_response_code(404); echo json_encode(['status' => 'error', 'message' => 'Journal entry not found.']); exit; }
        $pdo->prepare('DELETE FROM plant_journal_entries WHERE id = ? AND user_id = ?')->execute([$id, $user['id']]);
        pnapana_delete_feature_upload((string)$image);
        echo json_encode(['status' => 'success']); exit;
    }

    $plantId = (int)($_POST['plant_id'] ?? 0);
    if (!$plantId || !journal_owns_plant($pdo, (int)$user['id'], $plantId)) throw new InvalidArgumentException('Choose one of your plants.');
    $title = trim((string)($_POST['title'] ?? ''));
    $notes = trim((string)($_POST['notes'] ?? ''));
    $type = trim((string)($_POST['entry_type'] ?? 'growth'));
    $height = trim((string)($_POST['height_cm'] ?? ''));
    $compareId = max(0, (int)($_POST['compared_entry_id'] ?? 0));
    if ($title === '' || mb_strlen($title) > 120) throw new InvalidArgumentException('Add a short title under 120 characters.');
    if (mb_strlen($notes) > 3000) throw new InvalidArgumentException('Keep notes under 3,000 characters.');
    if (!in_array($type, ['growth', 'note', 'repotting', 'recovery', 'milestone'], true)) $type = 'growth';
    if ($height !== '' && (!is_numeric($height) || (float)$height < 0 || (float)$height > 9999)) throw new InvalidArgumentException('Enter a valid height.');
    if ($compareId) {
        $check = $pdo->prepare('SELECT 1 FROM plant_journal_entries WHERE id = ? AND plant_id = ? AND user_id = ?');
        $check->execute([$compareId, $plantId, $user['id']]);
        if (!$check->fetchColumn()) throw new InvalidArgumentException('Comparison entry is not available.');
    }
    $image = pnapana_save_feature_upload();
    $stmt = $pdo->prepare('INSERT INTO plant_journal_entries (user_id, plant_id, entry_type, title, notes, image_url, height_cm, compared_entry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$user['id'], $plantId, $type, $title, $notes ?: null, $image, $height === '' ? null : (float)$height, $compareId ?: null]);
    $pdo->prepare("INSERT INTO analytics_events (user_id, event_name, metadata) VALUES (?, 'journal_entry_created', ?)")->execute([$user['id'], json_encode(['plant_id' => $plantId, 'type' => $type])]);
    http_response_code(201);
    echo json_encode(['status' => 'success', 'id' => (int)$pdo->lastInsertId(), 'message' => 'Journal entry added.']);
} catch (InvalidArgumentException $e) {
    http_response_code(422); echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('plant_journal error: ' . $e->getMessage());
    http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Journal is temporarily unavailable.']);
}
