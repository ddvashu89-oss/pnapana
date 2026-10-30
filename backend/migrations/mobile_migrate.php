<?php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only.'); }
require_once __DIR__ . '/../db.php';
$sql = file_get_contents(__DIR__ . '/003_mobile.sql');
try {
    $pdo->exec($sql);
    echo "Mobile schema ready. Existing users and data were retained.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Mobile migration failed. Check database access and schema permissions.\n");
    exit(1);
}
