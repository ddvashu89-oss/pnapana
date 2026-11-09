-- Portable to MySQL 5.7+ and safe to import again.
SET @pnapana_add_placement = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plants' AND COLUMN_NAME = 'placement') = 0,
  'ALTER TABLE plants ADD COLUMN placement VARCHAR(20) DEFAULT NULL',
  'SELECT ''plants.placement already exists'''
);
PREPARE pnapana_migration FROM @pnapana_add_placement;
EXECUTE pnapana_migration;
DEALLOCATE PREPARE pnapana_migration;

CREATE TABLE IF NOT EXISTS vacation_modes (
  user_id INT PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  starts_on DATE DEFAULT NULL,
  ends_on DATE DEFAULT NULL,
  instructions VARCHAR(1000) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
