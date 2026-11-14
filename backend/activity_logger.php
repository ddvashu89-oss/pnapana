<?php
/**
 * Privacy-safe observability helpers.
 *
 * These records are intentionally metadata-only: never store request bodies,
 * photos, JWTs, passwords, API keys, email addresses, or IP addresses here.
 */

function pnapana_log_request_id(): string {
    static $requestId = null;
    if ($requestId === null) $requestId = bin2hex(random_bytes(16));
    return $requestId;
}

function pnapana_ensure_observability_schema(PDO $pdo): void {
    static $ready = false;
    if ($ready) return;
    $tables = ['application_logs', 'api_request_logs', 'user_activity_logs'];
    try {
        $placeholders = implode(',', array_fill(0, count($tables), '?'));
        $check = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ($placeholders)");
        $check->execute($tables);
        if ((int)$check->fetchColumn() === count($tables)) { $ready = true; return; }
        $pdo->exec("CREATE TABLE IF NOT EXISTS application_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, request_id CHAR(32) NOT NULL, user_id INT DEFAULT NULL, level VARCHAR(16) NOT NULL DEFAULT 'info', event_name VARCHAR(100) NOT NULL, endpoint VARCHAR(255) NOT NULL, http_status SMALLINT UNSIGNED DEFAULT NULL, message VARCHAR(500) NOT NULL, context TEXT DEFAULT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_app_log_date (created_at), INDEX idx_app_log_request (request_id), INDEX idx_app_log_event (event_name, created_at), INDEX idx_app_log_user (user_id, created_at), CONSTRAINT fk_application_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec("CREATE TABLE IF NOT EXISTS api_request_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, request_id CHAR(32) NOT NULL, user_id INT DEFAULT NULL, provider VARCHAR(50) NOT NULL, operation VARCHAR(100) NOT NULL, http_status SMALLINT UNSIGNED DEFAULT NULL, duration_ms INT UNSIGNED NOT NULL DEFAULT 0, success TINYINT(1) NOT NULL DEFAULT 0, error_code VARCHAR(80) DEFAULT NULL, metadata TEXT DEFAULT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_api_log_date (created_at), INDEX idx_api_log_provider (provider, operation, created_at), INDEX idx_api_log_request (request_id), INDEX idx_api_log_user (user_id, created_at), CONSTRAINT fk_api_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_activity_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY, request_id CHAR(32) NOT NULL, user_id INT DEFAULT NULL, action VARCHAR(100) NOT NULL, endpoint VARCHAR(255) NOT NULL, metadata TEXT DEFAULT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_activity_date (created_at), INDEX idx_activity_user (user_id, created_at), INDEX idx_activity_action (action, created_at), INDEX idx_activity_request (request_id), CONSTRAINT fk_activity_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $ready = true;
    } catch (Throwable $ignored) {
        // Production normally uses the SQL migration. Lack of DDL privilege
        // must not make customer traffic fail.
    }
}

function pnapana_log_endpoint(): string {
    $script = (string)($_SERVER['SCRIPT_NAME'] ?? 'cli');
    return substr($script, 0, 255);
}

function pnapana_log_safe_context($value, int $depth = 0) {
    if ($depth > 3) return '[truncated]';
    if (is_array($value)) {
        $safe = [];
        foreach ($value as $key => $item) {
            $name = strtolower((string)$key);
            if (preg_match('/pass|token|secret|api.?key|authorization|cookie|image|base64|email|phone|address/', $name)) {
                $safe[$key] = '[redacted]';
            } else {
                $safe[$key] = pnapana_log_safe_context($item, $depth + 1);
            }
        }
        return $safe;
    }
    if (is_object($value)) return '[object]';
    if (is_string($value)) return mb_substr($value, 0, 500);
    if (is_scalar($value) || $value === null) return $value;
    return '[unsupported]';
}

function pnapana_log_json($context): ?string {
    if ($context === null || $context === []) return null;
    $encoded = json_encode(pnapana_log_safe_context($context), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    return $encoded === false ? null : mb_substr($encoded, 0, 4000);
}

function pnapana_write_application_log(PDO $pdo, string $level, string $event, string $message, ?int $userId = null, $context = null, ?int $httpStatus = null): void {
    try {
        $stmt = $pdo->prepare('INSERT INTO application_logs (request_id, user_id, level, event_name, endpoint, http_status, message, context)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([pnapana_log_request_id(), $userId, substr($level, 0, 16), substr($event, 0, 100),
            pnapana_log_endpoint(), $httpStatus, mb_substr($message, 0, 500), pnapana_log_json($context)]);
    } catch (Throwable $ignored) {
        // Logs must never interrupt a customer request.
    }
}

function pnapana_log_user_activity(PDO $pdo, ?int $userId, string $action, $metadata = null): void {
    try {
        $stmt = $pdo->prepare('INSERT INTO user_activity_logs (request_id, user_id, action, endpoint, metadata) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([pnapana_log_request_id(), $userId, substr($action, 0, 100), pnapana_log_endpoint(), pnapana_log_json($metadata)]);
    } catch (Throwable $ignored) {}
}

function pnapana_log_api_request(PDO $pdo, ?int $userId, string $provider, string $operation, ?int $httpStatus, int $durationMs, bool $success, ?string $errorCode = null, $metadata = null): void {
    try {
        $stmt = $pdo->prepare('INSERT INTO api_request_logs (request_id, user_id, provider, operation, http_status, duration_ms, success, error_code, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([pnapana_log_request_id(), $userId, substr($provider, 0, 50), substr($operation, 0, 100),
            $httpStatus, max(0, $durationMs), $success ? 1 : 0, $errorCode ? substr($errorCode, 0, 80) : null, pnapana_log_json($metadata)]);
    } catch (Throwable $ignored) {}
}
