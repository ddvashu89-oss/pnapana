<?php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only.'); }
require_once __DIR__ . '/../db.php';
try {
    foreach (['003_mobile.sql', '006_mobile_features.sql', '007_ai_backend.sql'] as $file) {
        $pdo->exec(file_get_contents(__DIR__ . '/' . $file));
    }
    $sharedKey = $pdo->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_settings' AND COLUMN_NAME = 'gemini_api_key'")->fetchColumn();
    if (!(int)$sharedKey) $pdo->exec('ALTER TABLE app_settings ADD COLUMN gemini_api_key VARCHAR(255) DEFAULT NULL');
    $details = $pdo->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'care_events' AND COLUMN_NAME = 'details'")->fetchColumn();
    if (!(int)$details) $pdo->exec('ALTER TABLE care_events ADD COLUMN details TEXT DEFAULT NULL');
    $setupColumns = [
        'setup_completed' => 'TINYINT(1) NOT NULL DEFAULT 0',
        'setup_completed_at' => 'DATETIME DEFAULT NULL',
        'setup_data' => 'LONGTEXT DEFAULT NULL',
    ];
    foreach ($setupColumns as $column => $definition) {
        $exists = $pdo->query("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plants' AND COLUMN_NAME = " . $pdo->quote($column))->fetchColumn();
        if (!(int)$exists) $pdo->exec("ALTER TABLE plants ADD COLUMN {$column} {$definition}");
    }
    $pdo->exec('ALTER TABLE plants MODIFY COLUMN image_url MEDIUMTEXT DEFAULT NULL');
    echo "Mobile schema ready. Existing users and data were retained.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Mobile migration failed. Check database access and schema permissions.\n");
    exit(1);
}
