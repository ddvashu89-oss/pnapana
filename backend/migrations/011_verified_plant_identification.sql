-- Guided multi-angle identification, provider agreement, and correction tracking.
CREATE TABLE IF NOT EXISTS plant_identification_events (
  id CHAR(32) PRIMARY KEY,
  user_id INT NOT NULL,
  image_count TINYINT UNSIGNED NOT NULL,
  kindwise_top_species VARCHAR(180) DEFAULT NULL,
  kindwise_probability DECIMAL(7,6) DEFAULT NULL,
  kindwise_candidates LONGTEXT DEFAULT NULL,
  gemini_species VARCHAR(180) DEFAULT NULL,
  gemini_confidence DECIMAL(7,6) DEFAULT NULL,
  providers_agree TINYINT(1) NOT NULL DEFAULT 0,
  auto_accepted TINYINT(1) NOT NULL DEFAULT 0,
  selected_species VARCHAR(180) DEFAULT NULL,
  selected_common_name VARCHAR(180) DEFAULT NULL,
  selected_probability DECIMAL(7,6) DEFAULT NULL,
  corrected TINYINT(1) DEFAULT NULL,
  confirmed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_identification_user_date (user_id, created_at),
  INDEX idx_identification_corrections (corrected, created_at),
  CONSTRAINT fk_identification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
