<?php
// Run daily from cPanel Cron: php /absolute/path/backend/process_account_deletions.php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/growth_schema.php';
pnapana_ensure_growth_schema($pdo);

$stmt = $pdo->query("SELECT r.user_id FROM account_deletion_requests r WHERE r.status='pending' AND r.scheduled_for <= NOW() LIMIT 100");
$ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
foreach ($ids as $userId) {
    try {
        $pdo->beginTransaction();
        $paths = [];
        foreach (['SELECT image_url FROM plants WHERE user_id=?', 'SELECT image_url FROM plant_journal_entries WHERE user_id=?', 'SELECT initial_image_url FROM disease_cases WHERE user_id=?', 'SELECT follow_up_image_url FROM disease_cases WHERE user_id=?', 'SELECT image_url FROM community_posts WHERE user_id=?'] as $sql) {
            $q = $pdo->prepare($sql); $q->execute([$userId]); $paths = array_merge($paths, $q->fetchAll(PDO::FETCH_COLUMN));
        }
        $paymentStmt = $pdo->prepare('SELECT screenshot_path FROM payment_requests WHERE user_id=?');
        $paymentStmt->execute([$userId]);
        $paymentFiles = $paymentStmt->fetchAll(PDO::FETCH_COLUMN);
        $pdo->prepare('DELETE s FROM plant_scans s JOIN plants p ON p.id=s.plant_id WHERE p.user_id=?')->execute([$userId]);
        $pdo->prepare('DELETE FROM care_events WHERE user_id=?')->execute([$userId]);
        $pdo->prepare('DELETE FROM users WHERE id=?')->execute([$userId]);
        $pdo->commit();
        foreach ($paths as $url) {
            if (!$url || strpos($url, '/uploads/') === false) continue;
            $relative = substr(parse_url($url, PHP_URL_PATH) ?: '', strpos(parse_url($url, PHP_URL_PATH) ?: '', '/uploads/'));
            $candidate = realpath(__DIR__ . $relative);
            $root = realpath(__DIR__ . '/uploads');
            if ($candidate && $root && strpos($candidate, $root . DIRECTORY_SEPARATOR) === 0 && is_file($candidate)) @unlink($candidate);
        }
        $paymentRoot = realpath(__DIR__ . '/storage/payment_screenshots');
        if ($paymentRoot) foreach ($paymentFiles as $filename) {
            if (!is_string($filename) || basename($filename) !== $filename) continue;
            $candidate = $paymentRoot . DIRECTORY_SEPARATOR . $filename;
            if (is_file($candidate)) @unlink($candidate);
        }
        echo "Deleted user $userId\n";
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log("Scheduled deletion failed for user $userId: " . $e->getMessage());
    }
}
