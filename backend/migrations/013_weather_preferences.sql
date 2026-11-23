-- Per-account opt-in for weather-based in-app alerts. Coordinates remain
-- transient in the browser and are not stored in this table.
CREATE TABLE IF NOT EXISTS user_weather_preferences (
  user_id INT NOT NULL PRIMARY KEY,
  alerts_enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weather_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

