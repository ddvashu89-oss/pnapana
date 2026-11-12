-- Additive history for AI requests made through authenticated PHP endpoints.
-- Raw images and provider secrets are deliberately not stored in this table.
CREATE TABLE IF NOT EXISTS mobile_ai_scan_history (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plant_id INT DEFAULT NULL,
    scan_type VARCHAR(24) NOT NULL,
    provider VARCHAR(40) NOT NULL,
    model_version VARCHAR(100) DEFAULT NULL,
    confidence DECIMAL(7,6) DEFAULT NULL,
    uncertain TINYINT(1) NOT NULL DEFAULT 0,
    image_sha256 CHAR(64) NOT NULL,
    result_json LONGTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mobile_ai_history_user_date (user_id, created_at),
    INDEX idx_mobile_ai_history_plant_date (plant_id, created_at),
    CONSTRAINT fk_mobile_ai_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mobile_ai_history_plant FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
