-- =====================================================================
--  Pnapana - complete database install
--
--  Import this ONE file through phpMyAdmin. It creates every table and
--  seeds the subscription plans and default settings.
--
--  It replaces the CLI migration scripts, which need SSH that most shared
--  cPanel plans do not provide.
--
--  Safe to re-run: every statement is guarded.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` int(11) NOT NULL DEFAULT 1,
  `site_name` varchar(255) NOT NULL DEFAULT 'Pnapana',
  `support_email` varchar(255) NOT NULL DEFAULT 'support@pnapana.com',
  `allow_signups` tinyint(1) NOT NULL DEFAULT 1,
  `ai_scanning_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `community_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `maintenance_mode` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `upi_id` varchar(255) NOT NULL DEFAULT '',
  `upi_payee_name` varchar(255) NOT NULL DEFAULT 'Pnapana',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `care_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `plant_id` int(11) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `care_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plant_id` int(11) NOT NULL,
  `action` varchar(255) NOT NULL,
  `log_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `plant_id` (`plant_id`),
  CONSTRAINT `care_logs_ibfk_1` FOREIGN KEY (`plant_id`) REFERENCES `plants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `community_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `plant_id` int(11) DEFAULT NULL,
  `plant_name` varchar(255) DEFAULT NULL,
  `caption` text NOT NULL,
  `image_url` mediumtext DEFAULT NULL,
  `likes_count` int(11) NOT NULL DEFAULT 0,
  `coins_earned` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plant_id` (`plant_id`),
  CONSTRAINT `community_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `community_posts_ibfk_2` FOREIGN KEY (`plant_id`) REFERENCES `plants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `category` varchar(50) DEFAULT 'general',
  `subject` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `requested_ip` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_token_hash` (`token_hash`),
  KEY `idx_resets_user` (`user_id`),
  CONSTRAINT `fk_resets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payment_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference` varchar(100) DEFAULT NULL COMMENT 'UPI transaction reference typed by the user',
  `screenshot_path` varchar(255) NOT NULL COMMENT 'Filename only; files live outside the web root',
  `status` varchar(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / APPROVED / REJECTED / EXPIRED',
  `admin_note` text DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `verified_at` datetime DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_user` (`user_id`),
  KEY `fk_payments_plan` (`plan_id`),
  KEY `fk_payments_verifier` (`verified_by`),
  CONSTRAINT `fk_payments_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`),
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `plant_scans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plant_id` int(11) DEFAULT NULL,
  `image_url` mediumtext DEFAULT NULL,
  `ai_analysis` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `plants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `species` varchar(255) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Thriving',
  `status_color` varchar(50) DEFAULT 'green',
  `native_region` varchar(255) DEFAULT NULL,
  `light_requirement` varchar(255) DEFAULT NULL,
  `water_requirement` varchar(255) DEFAULT NULL,
  `humidity` varchar(255) DEFAULT NULL,
  `pet_friendly` tinyint(1) DEFAULT 0,
  `water_freq` int(11) DEFAULT 7,
  `light_req` varchar(50) DEFAULT 'Medium',
  `last_watered` datetime DEFAULT current_timestamp(),
  `care_plan` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `plants_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `post_likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_like` (`post_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price_inr` decimal(10,2) NOT NULL DEFAULT 0.00,
  `billing_days` int(11) NOT NULL DEFAULT 30,
  `max_plants` int(11) DEFAULT NULL COMMENT 'NULL means unlimited',
  `ai_diagnosis` tinyint(1) NOT NULL DEFAULT 0,
  `ai_chat` tinyint(1) NOT NULL DEFAULT 0,
  `weather_care` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE / EXPIRED / CANCELLED',
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime DEFAULT NULL COMMENT 'NULL means never expires (free tier)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_subscriptions_user` (`user_id`),
  KEY `idx_subscriptions_status` (`status`),
  KEY `fk_subscriptions_plan` (`plan_id`),
  CONSTRAINT `fk_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`),
  CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `token` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `coins` int(11) NOT NULL DEFAULT 0,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `gemini_api_key` varchar(255) DEFAULT NULL,
  `customer_id` varchar(20) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uniq_customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
--  Seed data
-- ---------------------------------------------------------------------

-- Subscription plans. Change the price here, not in code.
INSERT INTO subscription_plans (code, name, price_inr, billing_days, max_plants, ai_diagnosis, ai_chat, weather_care)
VALUES
    ('FREE',    'Free',    0.00,  0,  2,    0, 0, 0),
    ('PREMIUM', 'Premium', 29.00, 30, NULL, 1, 1, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Default site settings. Set your UPI ID from Admin > Settings after logging in.
INSERT INTO app_settings (id) VALUES (1)
ON DUPLICATE KEY UPDATE id = id;

-- ---------------------------------------------------------------------
--  Backfill (harmless on a fresh install, useful when upgrading)
-- ---------------------------------------------------------------------

-- Human-facing customer IDs: PNP-<year>-<zero-padded id>
UPDATE users
   SET customer_id = CONCAT('PNP-', YEAR(created_at), '-', LPAD(id, 6, '0'))
 WHERE customer_id IS NULL;

-- Put every account without a subscription on the Free plan.
INSERT INTO subscriptions (user_id, plan_id, status, expires_at)
SELECT u.id, (SELECT id FROM subscription_plans WHERE code = 'FREE'), 'ACTIVE', NULL
  FROM users u
 WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id);

-- No admin account is created here on purpose. Create yours through
-- setup_admin.php once, then delete that file. See DEPLOYMENT.md.
