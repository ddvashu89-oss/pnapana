-- Portable to MySQL 5.7+ and safe to import again.
SET @pnapana_add_purchase_date = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plants' AND COLUMN_NAME = 'purchased_on') = 0,
  'ALTER TABLE plants ADD COLUMN purchased_on DATE DEFAULT NULL',
  'SELECT ''plants.purchased_on already exists'''
);
PREPARE pnapana_migration FROM @pnapana_add_purchase_date;
EXECUTE pnapana_migration;
DEALLOCATE PREPARE pnapana_migration;

SET @pnapana_add_favorite = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plants' AND COLUMN_NAME = 'is_favorite') = 0,
  'ALTER TABLE plants ADD COLUMN is_favorite TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT ''plants.is_favorite already exists'''
);
PREPARE pnapana_migration FROM @pnapana_add_favorite;
EXECUTE pnapana_migration;
DEALLOCATE PREPARE pnapana_migration;

SET @pnapana_add_event_details = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'care_events' AND COLUMN_NAME = 'details') = 0,
  'ALTER TABLE care_events ADD COLUMN details TEXT DEFAULT NULL',
  'SELECT ''care_events.details already exists'''
);
PREPARE pnapana_migration FROM @pnapana_add_event_details;
EXECUTE pnapana_migration;
DEALLOCATE PREPARE pnapana_migration;
