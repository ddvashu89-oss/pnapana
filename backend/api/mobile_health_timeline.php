<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET', 'POST']);
$user = mobile_user($pdo);
$plantId = filter_var($_GET['plant_id'] ?? null, FILTER_VALIDATE_INT);
$data = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = mobile_body();
    $plantId = filter_var($data['plant_id'] ?? null, FILTER_VALIDATE_INT);
}
if (!$plantId) mobile_fail('Plant ID is required.');
$owner = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?');
$owner->execute([$plantId, $user['id']]);
if (!$owner->fetchColumn()) mobile_fail('Plant not found.', 404);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $note = trim((string)($data['note'] ?? ''));
    $status = $data['health_status'] ?? 'healthy';
    $image = $data['image_url'] ?? '';
    if (mb_strlen($note) > 500 || !in_array($status, ['healthy', 'watch', 'unwell'], true)) mobile_fail('Use a valid status and a note under 500 characters.');
    if (!is_string($image) || strlen($image) > 8 * 1024 * 1024 || !preg_match('#^data:image/(jpeg|png|webp);base64,(.+)$#s', $image, $parts)) mobile_fail('Choose a JPG, PNG or WEBP photo under 5 MB.');
    $bytes = base64_decode($parts[2], true);
    $info = $bytes === false ? false : @getimagesizefromstring($bytes);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!$info || !isset($extensions[$info['mime']]) || strlen($bytes) > 5 * 1024 * 1024) mobile_fail('Choose a valid plant photo under 5 MB.');
    $dir = __DIR__ . '/../uploads/health';
    if (!is_dir($dir) && !mkdir($dir, 0770, true)) throw new RuntimeException('Health upload directory unavailable');
    $filename = bin2hex(random_bytes(20)) . '.' . $extensions[$info['mime']];
    $file = $dir . '/' . $filename;
    if (file_put_contents($file, $bytes, LOCK_EX) === false) throw new RuntimeException('Health photo upload failed');
    $url = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/') . '/uploads/health/' . $filename;
    try {
        $stmt = $pdo->prepare('INSERT INTO mobile_plant_health_entries (user_id, plant_id, image_url, note, health_status) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$user['id'], $plantId, $url, $note ?: null, $status]);
    } catch (Throwable $e) { if (is_file($file)) unlink($file); throw $e; }
}
$stmt = $pdo->prepare('SELECT id, plant_id, image_url, note, health_status, created_at FROM mobile_plant_health_entries WHERE user_id = ? AND plant_id = ? ORDER BY created_at DESC, id DESC');
$stmt->execute([$user['id'], $plantId]);
echo json_encode(['status' => 'success', 'entries' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
