<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['POST']); $user = mobile_user($pdo); $data = mobile_body();
$name = trim((string)($data['name'] ?? '')); $species = trim((string)($data['species'] ?? ''));
$frequency = filter_var($data['water_freq'] ?? 7, FILTER_VALIDATE_INT);
if ($name === '' || $species === '' || mb_strlen($name) > 255 || mb_strlen($species) > 255) mobile_fail('A plant name and species of at most 255 characters are required.');
if ($frequency === false || $frequency < 1 || $frequency > 365) mobile_fail('Choose a watering interval between 1 and 365 days.');
$image = $data['image_url'] ?? '/leaf.png';
if (!is_string($image) || strlen($image) > 8 * 1024 * 1024) mobile_fail('The plant image is too large.');
$imageBytes = null; $imageExtension = null; $imageFile = null;
if (strpos($image, 'data:image/') === 0) {
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,(.+)$#s', $image, $parts)) mobile_fail('Choose a JPG, PNG or WEBP photo.');
    $imageBytes = base64_decode($parts[2], true);
    if ($imageBytes === false || strlen($imageBytes) > 5 * 1024 * 1024) mobile_fail('Choose a plant photo under 5 MB.');
    $info = @getimagesizefromstring($imageBytes);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!$info || !isset($extensions[$info['mime']])) mobile_fail('The photo is not a supported image.');
    $imageExtension = $extensions[$info['mime']];
} elseif (strlen($image) > 255 || ($image && !preg_match('#^(https?://|/)#i', $image))) {
    mobile_fail('Choose a valid plant image.');
}
$planJson = isset($data['care_plan']) && is_array($data['care_plan']) ? json_encode($data['care_plan']) : null;
$pdo->beginTransaction();
try {
    // Serialize additions for this account so concurrent requests cannot exceed its plan limit.
    $lock = $pdo->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE'); $lock->execute([$user['id']]);
    $plan = get_active_plan($pdo, $user['id']);
    $count = $pdo->prepare('SELECT COUNT(*) FROM plants WHERE user_id = ?'); $count->execute([$user['id']]);
    if ($plan['max_plants'] !== null && (int)$count->fetchColumn() >= (int)$plan['max_plants']) {
        $pdo->rollBack(); mobile_fail('Your ' . $plan['name'] . ' plan covers ' . $plan['max_plants'] . ' plants. Choose a larger plan to add more.', 402, 'PLAN_LIMIT_REACHED');
    }
    // plants.image_url is VARCHAR(255) in the existing schema. Store a file path,
    // not the camera's multi-kilobyte data URI, without altering the shared table.
    if ($imageBytes !== null) {
        $dir = __DIR__ . '/../uploads/plants';
        if (!is_dir($dir) && !mkdir($dir, 0770, true)) throw new RuntimeException('Plant upload directory unavailable');
        $filename = bin2hex(random_bytes(20)) . '.' . $imageExtension; $imageFile = $dir . '/' . $filename;
        if (file_put_contents($imageFile, $imageBytes, LOCK_EX) === false) throw new RuntimeException('Plant upload failed');
        $image = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/') . '/uploads/plants/' . $filename;
    }
    $placement = in_array($data['placement'] ?? '', ['indoor', 'outdoor'], true) ? $data['placement'] : null;
    $stmt = $pdo->prepare('INSERT INTO plants (user_id, name, species, image_url, water_freq, light_req, native_region, light_requirement, water_requirement, humidity, pet_friendly, care_plan, placement) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    // PDO array binding turns PHP false into an empty string on strict MySQL. Bind 0/1 explicitly.
    $stmt->execute([$user['id'], $name, $species, $image ?: '/leaf.png', $frequency, $data['light_req'] ?? 'Medium', $data['native_region'] ?? null, $data['light_requirement'] ?? null, $data['water_requirement'] ?? null, $data['humidity'] ?? null, !empty($data['pet_friendly']) ? 1 : 0, $planJson, $placement]);
    $id = $pdo->lastInsertId();
    $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'add_plant')")->execute([$user['id'], $id]);
    $pdo->commit();
} catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); if ($imageFile && is_file($imageFile)) unlink($imageFile); throw $e; }
echo json_encode(['status' => 'success', 'plant_id' => $id, 'message' => 'Plant added to your garden.']);
