<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['POST']);
$user = mobile_user($pdo, true);
$data = mobile_body();
$password = trim((string)($data['password'] ?? ''));
if ($password === '' || !password_verify($password, $user['password'])) mobile_fail('Incorrect password. Account deletion aborted.', 401);
$plantImages = $pdo->prepare("SELECT image_url FROM plants WHERE user_id = ? AND image_url LIKE '%/uploads/plants/%'"); $plantImages->execute([$user['id']]);
$healthImages = $pdo->prepare("SELECT image_url FROM mobile_plant_health_entries WHERE user_id = ? AND image_url LIKE '%/uploads/health/%'"); $healthImages->execute([$user['id']]);
$files = array_merge($plantImages->fetchAll(PDO::FETCH_COLUMN), $healthImages->fetchAll(PDO::FETCH_COLUMN));
$paymentFiles = $pdo->prepare('SELECT screenshot_path FROM payment_requests WHERE user_id = ?'); $paymentFiles->execute([$user['id']]);
$paymentFiles = $paymentFiles->fetchAll(PDO::FETCH_COLUMN);
$pdo->beginTransaction();
try {
    $pdo->prepare('DELETE ps FROM plant_scans ps JOIN plants p ON p.id = ps.plant_id WHERE p.user_id = ?')->execute([$user['id']]);
    $pdo->prepare('DELETE FROM care_events WHERE user_id = ?')->execute([$user['id']]);
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$user['id']]);
    $pdo->commit();
} catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
$root = realpath(__DIR__ . '/..');
foreach ($files as $url) {
    $relative = parse_url($url, PHP_URL_PATH); $marker = '/backend/'; $at = strpos($relative, $marker);
    if ($at === false) continue;
    $candidate = $root . '/' . substr($relative, $at + strlen($marker));
    $realDir = realpath(dirname($candidate));
    if ($realDir && strpos($realDir, $root . '/uploads/') === 0 && is_file($candidate)) @unlink($candidate);
}
foreach ($paymentFiles as $filename) {
    if (!is_string($filename) || basename($filename) !== $filename) continue;
    $candidate = $root . '/storage/payment_screenshots/' . $filename;
    $storage = realpath(dirname($candidate));
    if ($storage && $storage === realpath($root . '/storage/payment_screenshots') && is_file($candidate)) @unlink($candidate);
}
echo json_encode(['status' => 'success', 'message' => 'Account and associated data deleted.']);
