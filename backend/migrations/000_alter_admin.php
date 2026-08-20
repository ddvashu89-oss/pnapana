<?php
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "Forbidden: Database migration scripts can only be run via CLI.";
    exit;
}

require_once __DIR__ . '/../db.php';

try {
    $conn->exec("ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0");
    echo "Column 'is_admin' added to users successfully.\n";
} catch(PDOException $e) {
    echo "Note (is_admin column): " . $e->getMessage() . "\n";
}

try {
    $conn->exec("ALTER TABLE users ADD COLUMN gemini_api_key VARCHAR(255) DEFAULT NULL");
    echo "Column 'gemini_api_key' added to users successfully.\n";
} catch(PDOException $e) {
    echo "Note (gemini_api_key column): " . $e->getMessage() . "\n";
}

try {
    // Seed admin accounts: the original demo user, and whichever real account is testing this.
    $conn->exec("UPDATE users SET is_admin = 1 WHERE id = 1 OR email = 'ddvashu89@gmail.com'");
    echo "Granted admin to seed accounts.\n";
} catch(PDOException $e) {
    echo "Error granting admin: " . $e->getMessage() . "\n";
}

try {
    $conn->exec("CREATE TABLE IF NOT EXISTS app_settings (
        id INT PRIMARY KEY DEFAULT 1,
        site_name VARCHAR(255) NOT NULL DEFAULT 'Pnapana',
        support_email VARCHAR(255) NOT NULL DEFAULT 'support@pnapana.com',
        allow_signups TINYINT(1) NOT NULL DEFAULT 1,
        ai_scanning_enabled TINYINT(1) NOT NULL DEFAULT 1,
        community_enabled TINYINT(1) NOT NULL DEFAULT 1,
        maintenance_mode TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
    echo "Table 'app_settings' created successfully.\n";
} catch(PDOException $e) {
    echo "Error creating app_settings: " . $e->getMessage() . "\n";
}

try {
    $conn->exec("INSERT INTO app_settings (id) VALUES (1) ON DUPLICATE KEY UPDATE id = id");
    echo "Default settings row ensured.\n";
} catch(PDOException $e) {
    echo "Error seeding app_settings: " . $e->getMessage() . "\n";
}
?>
