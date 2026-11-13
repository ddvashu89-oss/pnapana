<?php

/**
 * Idempotent schema bootstrap for the growth, recovery, caregiver, analytics,
 * and privacy features. The matching SQL migration remains the canonical
 * deployment path; this guard keeps shared-hosting installs self-healing.
 */
function pnapana_ensure_growth_schema(PDO $pdo): void {
    static $ready = false;
    if ($ready) return;

    // Normal production requests should never need DDL privileges. The
    // migration creates these tables; this check returns before CREATE calls.
    $required = ['plant_journal_entries', 'disease_cases', 'plant_care_profiles', 'caregiver_invites', 'caregiver_tasks', 'analytics_events', 'ai_usage_events', 'account_deletion_requests', 'plant_identification_events'];
    try {
        $placeholders = implode(',', array_fill(0, count($required), '?'));
        $check = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ($placeholders)");
        $check->execute($required);
        if ((int)$check->fetchColumn() === count($required)) { $ready = true; return; }
    } catch (Throwable $ignored) {
        // Shared hosts sometimes restrict information_schema; fall through to
        // the idempotent bootstrap for installations whose DB user can create.
    }

    $statements = [
        "CREATE TABLE IF NOT EXISTS plant_journal_entries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            plant_id INT NOT NULL,
            entry_type VARCHAR(30) NOT NULL DEFAULT 'growth',
            title VARCHAR(120) NOT NULL,
            notes TEXT DEFAULT NULL,
            image_url VARCHAR(500) DEFAULT NULL,
            height_cm DECIMAL(7,2) DEFAULT NULL,
            compared_entry_id INT DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_journal_user_plant (user_id, plant_id, created_at),
            CONSTRAINT fk_journal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_journal_plant FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE,
            CONSTRAINT fk_journal_compare FOREIGN KEY (compared_entry_id) REFERENCES plant_journal_entries(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS disease_cases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            plant_id INT NOT NULL,
            diagnosis VARCHAR(255) NOT NULL,
            treatment TEXT DEFAULT NULL,
            initial_image_url VARCHAR(500) DEFAULT NULL,
            follow_up_due_at DATETIME NOT NULL,
            follow_up_image_url VARCHAR(500) DEFAULT NULL,
            follow_up_notes TEXT DEFAULT NULL,
            followed_up_at DATETIME DEFAULT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'monitoring',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_disease_due (user_id, status, follow_up_due_at),
            CONSTRAINT fk_disease_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_disease_plant FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS plant_care_profiles (
            plant_id INT PRIMARY KEY,
            user_id INT NOT NULL,
            soil_type VARCHAR(120) DEFAULT NULL,
            pot_size_cm DECIMAL(6,2) DEFAULT NULL,
            pot_material VARCHAR(40) DEFAULT NULL,
            has_drainage TINYINT(1) NOT NULL DEFAULT 1,
            last_repotted_on DATE DEFAULT NULL,
            repot_interval_months SMALLINT DEFAULT 12,
            next_repot_on DATE DEFAULT NULL,
            fertilizer_name VARCHAR(120) DEFAULT NULL,
            fertilizer_interval_days SMALLINT DEFAULT 30,
            last_fertilized_on DATE DEFAULT NULL,
            next_fertilizer_on DATE DEFAULT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_care_profile_due (user_id, next_repot_on, next_fertilizer_on),
            CONSTRAINT fk_care_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_care_profile_plant FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS caregiver_invites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            owner_user_id INT NOT NULL,
            caregiver_user_id INT NOT NULL,
            starts_on DATE NOT NULL,
            ends_on DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            message VARCHAR(500) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            responded_at DATETIME DEFAULT NULL,
            UNIQUE KEY uniq_caregiver_trip (owner_user_id, caregiver_user_id, starts_on, ends_on),
            INDEX idx_caregiver_inbox (caregiver_user_id, status),
            CONSTRAINT fk_caregiver_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_caregiver_user FOREIGN KEY (caregiver_user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS caregiver_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invite_id INT NOT NULL,
            plant_id INT NOT NULL,
            task_type VARCHAR(40) NOT NULL,
            instructions VARCHAR(500) DEFAULT NULL,
            due_on DATE NOT NULL,
            completed_at DATETIME DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_caregiver_tasks_due (invite_id, due_on, completed_at),
            CONSTRAINT fk_caregiver_task_invite FOREIGN KEY (invite_id) REFERENCES caregiver_invites(id) ON DELETE CASCADE,
            CONSTRAINT fk_caregiver_task_plant FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS analytics_events (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            event_name VARCHAR(80) NOT NULL,
            metadata TEXT DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_analytics_name_date (event_name, created_at),
            INDEX idx_analytics_user_date (user_id, created_at),
            CONSTRAINT fk_analytics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS ai_usage_events (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            operation VARCHAR(50) NOT NULL,
            provider VARCHAR(30) NOT NULL,
            success TINYINT(1) NOT NULL DEFAULT 1,
            confidence DECIMAL(5,4) DEFAULT NULL,
            estimated_cost_usd DECIMAL(12,6) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ai_usage_date (created_at, operation, provider),
            CONSTRAINT fk_ai_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS account_deletion_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            scheduled_for DATETIME NOT NULL,
            cancelled_at DATETIME DEFAULT NULL,
            completed_at DATETIME DEFAULT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            UNIQUE KEY uniq_active_deletion_user (user_id),
            INDEX idx_deletion_schedule (status, scheduled_for),
            CONSTRAINT fk_deletion_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS plant_identification_events (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    ];

    foreach ($statements as $sql) $pdo->exec($sql);
    $ready = true;
}
