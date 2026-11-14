<?php
/**
 * Deletes privacy-safe observability records older than 180 days.
 * Run daily from cron: php /path/to/backend/process_log_retention.php
 */
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit("Forbidden\n");
}
require_once __DIR__ . '/db.php';

foreach (['application_logs', 'api_request_logs', 'user_activity_logs'] as $table) {
    try {
        $deleted = $pdo->exec("DELETE FROM {$table} WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY)");
        echo $table . ': ' . (int)$deleted . " deleted\n";
    } catch (Throwable $error) {
        fwrite(STDERR, $table . ': ' . $error->getMessage() . "\n");
    }
}
