-- Privacy-safe application, provider, and customer-activity observability.
-- Retention is enforced by backend/process_log_retention.php (180 days).

CREATE TABLE IF NOT EXISTS application_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  request_id CHAR(32) NOT NULL,
  user_id INT DEFAULT NULL,
  level VARCHAR(16) NOT NULL DEFAULT 'info',
  event_name VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  http_status SMALLINT UNSIGNED DEFAULT NULL,
  message VARCHAR(500) NOT NULL,
  context TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_app_log_date (created_at),
  INDEX idx_app_log_request (request_id),
  INDEX idx_app_log_event (event_name, created_at),
  INDEX idx_app_log_user (user_id, created_at),
  CONSTRAINT fk_application_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS api_request_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  request_id CHAR(32) NOT NULL,
  user_id INT DEFAULT NULL,
  provider VARCHAR(50) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  http_status SMALLINT UNSIGNED DEFAULT NULL,
  duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
  success TINYINT(1) NOT NULL DEFAULT 0,
  error_code VARCHAR(80) DEFAULT NULL,
  metadata TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_api_log_date (created_at),
  INDEX idx_api_log_provider (provider, operation, created_at),
  INDEX idx_api_log_request (request_id),
  INDEX idx_api_log_user (user_id, created_at),
  CONSTRAINT fk_api_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  request_id CHAR(32) NOT NULL,
  user_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  metadata TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_date (created_at),
  INDEX idx_activity_user (user_id, created_at),
  INDEX idx_activity_action (action, created_at),
  INDEX idx_activity_request (request_id),
  CONSTRAINT fk_activity_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
