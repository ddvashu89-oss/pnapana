<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET', 'POST']);
$user = mobile_user($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = mobile_body();
    $plantId = filter_var($data['plant_id'] ?? null, FILTER_VALIDATE_INT);
    $action = $data['action'] ?? '';
    $details = trim((string)($data['details'] ?? ''));
    if (!$plantId || $action !== 'fertilize' || mb_strlen($details) > 500) mobile_fail('Choose a valid plant and fertilizer action.');
    $owner = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?');
    $owner->execute([$plantId, $user['id']]);
    if (!$owner->fetchColumn()) mobile_fail('Plant not found.', 404);
    $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type, details) VALUES (?, ?, 'fertilize', ?)")->execute([$user['id'], $plantId, $details ?: null]);
}

$preference = $pdo->prepare('SELECT fertilizer_interval_days FROM mobile_feature_preferences WHERE user_id = ?');
$preference->execute([$user['id']]);
$fertilizerDays = (int)($preference->fetchColumn() ?: 30);
$stmt = $pdo->prepare("SELECT p.id, p.name, p.species, p.image_url, p.water_freq, p.created_at,
    COALESCE(MAX(CASE WHEN ce.event_type = 'water' THEN ce.created_at END), p.last_watered, p.created_at) AS last_water,
    COALESCE(MAX(CASE WHEN ce.event_type = 'fertilize' THEN ce.created_at END), p.created_at) AS last_fertilizer
    FROM plants p LEFT JOIN care_events ce ON ce.plant_id = p.id AND ce.user_id = p.user_id
    WHERE p.user_id = ? GROUP BY p.id ORDER BY p.name");
$stmt->execute([$user['id']]);
$tasks = [];
$now = new DateTimeImmutable('now');
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $plant) {
    $water = (new DateTimeImmutable($plant['last_water']))->modify('+' . max(1, (int)$plant['water_freq']) . ' days');
    $fertilizer = (new DateTimeImmutable($plant['last_fertilizer']))->modify('+' . $fertilizerDays . ' days');
    foreach ([['water', $water], ['fertilize', $fertilizer]] as $item) {
        $tasks[] = [
            'plant_id' => (int)$plant['id'], 'plant_name' => $plant['name'], 'species' => $plant['species'],
            'image_url' => $plant['image_url'], 'action' => $item[0], 'due_at' => $item[1]->format(DATE_ATOM),
            'overdue' => $item[1] <= $now,
        ];
    }
}
usort($tasks, function ($a, $b) { return strcmp($a['due_at'], $b['due_at']); });
$events = $pdo->prepare("SELECT ce.id, ce.plant_id, p.name AS plant_name, ce.event_type, ce.details, ce.created_at
    FROM care_events ce JOIN plants p ON p.id = ce.plant_id AND p.user_id = ce.user_id
    WHERE ce.user_id = ? AND ce.event_type IN ('water', 'fertilize') ORDER BY ce.created_at DESC LIMIT 100");
$events->execute([$user['id']]);
echo json_encode(['status' => 'success', 'fertilizer_interval_days' => $fertilizerDays, 'tasks' => $tasks, 'events' => $events->fetchAll(PDO::FETCH_ASSOC)]);
