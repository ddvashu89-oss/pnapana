-- Pnapana: customer IDs, subscription plans, and manual UPI payment verification.
-- Safe to re-run: every statement is guarded or idempotent.

-- ---------------------------------------------------------------------------
-- 1. Customer IDs and account status on users
-- ---------------------------------------------------------------------------
-- customer_id is the human-facing identifier used for admin search and support
-- (PNP-2026-000001). It is derived from the internal auto-increment id, which
-- keeps it unique without a separate counter table or a race window.

CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    price_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    billing_days INT NOT NULL DEFAULT 30,
    max_plants INT DEFAULT NULL COMMENT 'NULL means unlimited',
    ai_diagnosis TINYINT(1) NOT NULL DEFAULT 0,
    ai_chat TINYINT(1) NOT NULL DEFAULT 0,
    weather_care TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO subscription_plans (code, name, price_inr, billing_days, max_plants, ai_diagnosis, ai_chat, weather_care)
VALUES
    ('FREE', 'Free', 0.00, 0, 2, 0, 0, 0),
    ('PREMIUM', 'Premium', 29.00, 30, NULL, 1, 1, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE / EXPIRED / CANCELLED',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL COMMENT 'NULL means never expires (free tier)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subscriptions_user (user_id),
    INDEX idx_subscriptions_status (status),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference VARCHAR(100) DEFAULT NULL COMMENT 'UPI transaction reference typed by the user',
    screenshot_path VARCHAR(255) NOT NULL COMMENT 'Filename only; files live outside the web root',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / APPROVED / REJECTED / EXPIRED',
    admin_note TEXT DEFAULT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME DEFAULT NULL,
    verified_by INT DEFAULT NULL,
    INDEX idx_payments_status (status),
    INDEX idx_payments_user (user_id),
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    CONSTRAINT fk_payments_verifier FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
