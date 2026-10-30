-- Additive migration: existing tables, users and records are retained.
CREATE TABLE IF NOT EXISTS mobile_preferences (
    user_id INT NOT NULL PRIMARY KEY,
    reminders TINYINT(1) NOT NULL DEFAULT 0,
    reminder_time CHAR(5) NOT NULL DEFAULT '09:00',
    language CHAR(2) NOT NULL DEFAULT 'en',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_mobile_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mobile_ritual_events (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ritual VARCHAR(20) NOT NULL,
    local_day DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_daily_ritual (user_id, ritual, local_day),
    CONSTRAINT fk_mobile_ritual_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mobile_request_keys (
    user_id INT NOT NULL,
    request_key VARCHAR(80) NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    response_body MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, request_key),
    INDEX idx_mobile_request_date (created_at),
    CONSTRAINT fk_mobile_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
