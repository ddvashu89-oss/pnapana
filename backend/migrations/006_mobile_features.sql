-- Additive mobile feature storage. Existing Pnapana records are retained.
CREATE TABLE IF NOT EXISTS mobile_feature_preferences (
    user_id INT NOT NULL PRIMARY KEY,
    weather_reminders TINYINT(1) NOT NULL DEFAULT 1,
    push_enabled TINYINT(1) NOT NULL DEFAULT 0,
    fertilizer_interval_days SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_mobile_feature_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mobile_plant_health_entries (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plant_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    note VARCHAR(500) DEFAULT NULL,
    health_status VARCHAR(20) NOT NULL DEFAULT 'healthy',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mobile_health_plant_date (plant_id, created_at),
    CONSTRAINT fk_mobile_health_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mobile_health_plant FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mobile_focus_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_key VARCHAR(80) NOT NULL,
    duration_minutes SMALLINT UNSIGNED NOT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME NOT NULL,
    completed_day DATE NOT NULL,
    coins_earned SMALLINT UNSIGNED NOT NULL DEFAULT 5,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_mobile_focus_session (user_id, session_key),
    INDEX idx_mobile_focus_streak (user_id, completed_day),
    CONSTRAINT fk_mobile_focus_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mobile_push_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    app_version VARCHAR(30) DEFAULT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_mobile_push_token (expo_push_token),
    INDEX idx_mobile_push_user (user_id, enabled),
    CONSTRAINT fk_mobile_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
