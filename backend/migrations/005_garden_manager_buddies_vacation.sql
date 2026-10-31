-- Portable to MySQL 5.7+ and safe to import again.
SET @pnapana_add_placement = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plants' AND COLUMN_NAME = 'placement') = 0,
  'ALTER TABLE plants ADD COLUMN placement VARCHAR(20) DEFAULT NULL',
  'SELECT ''plants.placement already exists'''
);
PREPARE pnapana_migration FROM @pnapana_add_placement;
EXECUTE pnapana_migration;
DEALLOCATE PREPARE pnapana_migration;

CREATE TABLE IF NOT EXISTS plant_buddies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  recipient_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_buddy_request (requester_id, recipient_id),
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vacation_modes (
  user_id INT PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  starts_on DATE DEFAULT NULL,
  ends_on DATE DEFAULT NULL,
  buddy_id INT DEFAULT NULL,
  instructions VARCHAR(1000) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buddy_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
