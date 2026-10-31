<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../feature_schema.php';
require_once __DIR__ . '/auth.php';
$user = authenticate($pdo);
pnapana_ensure_care_sharing_schema($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("SELECT enabled, starts_on, ends_on, buddy_id, instructions FROM vacation_modes WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $mode = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['enabled' => 0, 'starts_on' => null, 'ends_on' => null, 'buddy_id' => null, 'instructions' => ''];
    $mode['enabled'] = (bool)$mode['enabled'];
    echo json_encode(['status' => 'success', 'mode' => $mode]); exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$enabled = !empty($data['enabled']);
$start = trim((string)($data['starts_on'] ?? ''));
$end = trim((string)($data['ends_on'] ?? ''));
$buddyId = !empty($data['buddy_id']) ? filter_var($data['buddy_id'], FILTER_VALIDATE_INT) : null;
$instructions = trim((string)($data['instructions'] ?? ''));
if (mb_strlen($instructions) > 1000) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Keep care instructions under 1,000 characters.']); exit; }

if ($enabled) {
    $startDate = DateTimeImmutable::createFromFormat('!Y-m-d', $start);
    $endDate = DateTimeImmutable::createFromFormat('!Y-m-d', $end);
    if (!$startDate || !$endDate || $startDate->format('Y-m-d') !== $start || $endDate->format('Y-m-d') !== $end || $start < date('Y-m-d') || $end < $start || $end > date('Y-m-d', strtotime($start . ' +120 days'))) {
        http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Choose dates from today through a maximum 120-day trip.']); exit;
    }
    if ($buddyId) {
        $friendship = $pdo->prepare("SELECT 1 FROM plant_buddies WHERE status = 'accepted' AND ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))");
        $friendship->execute([$user['id'], $buddyId, $buddyId, $user['id']]);
        if (!$friendship->fetchColumn()) { http_response_code(403); echo json_encode(['status' => 'error', 'message' => 'Choose one of your accepted plant buddies.']); exit; }
    }
} else {
    $start = $end = '';
    $buddyId = null;
    $instructions = '';
}

$stmt = $pdo->prepare("INSERT INTO vacation_modes (user_id, enabled, starts_on, ends_on, buddy_id, instructions)
    VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), starts_on = VALUES(starts_on),
    ends_on = VALUES(ends_on), buddy_id = VALUES(buddy_id), instructions = VALUES(instructions)");
$stmt->execute([$user['id'], $enabled ? 1 : 0, $start ?: null, $end ?: null, $buddyId, $instructions ?: null]);
echo json_encode(['status' => 'success', 'message' => $enabled ? 'Vacation care plan saved.' : 'Vacation mode turned off.']);
?>
