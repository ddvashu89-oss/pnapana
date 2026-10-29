<?php
date_default_timezone_set('Asia/Kolkata');

// OWASP Security & CORS Headers
require_once __DIR__ . '/cors.php';
pnapana_cors('GET, POST, PUT, DELETE, OPTIONS');
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");

require_once __DIR__ . '/env.php';

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

$appEnv = getenv('APP_ENV') ?: (defined('APP_ENV') ? APP_ENV : 'production');
$isProduction = ($appEnv !== 'development');

// Never render PHP notices or stack traces into an API response: they leak
// file paths and query fragments to whoever triggered them.
ini_set('display_errors', $isProduction ? '0' : '1');
ini_set('log_errors', '1');
error_reporting($isProduction ? (E_ALL & ~E_DEPRECATED & ~E_NOTICE) : E_ALL);

$host = getenv('DB_HOST') ?: (defined('DB_HOST') ? DB_HOST : 'localhost');
$db_name = getenv('DB_NAME') ?: (defined('DB_NAME') ? DB_NAME : 'pnapana_db');
$username = getenv('DB_USER') ?: (defined('DB_USER') ? DB_USER : 'root');
$password = getenv('DB_PASS') !== false ? getenv('DB_PASS') : (defined('DB_PASS') ? DB_PASS : '');

// Refuse to run in production on the credentials that ship as defaults. Failing
// loudly here is far better than silently serving traffic as database root.
if ($isProduction && ($username === 'root' || $password === '' || $password === 'CHANGE_ME')) {
    error_log('Refusing to start: production requires a dedicated DB user with a real password. See backend/config.example.php');
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server is not configured. Please contact the administrator."]);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    // Also define $conn for backwards compatibility with any old scripts
    $conn = $pdo;
} catch(PDOException $e) {
    error_log("Database Connection Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection unavailable. Please try again later."]);
    exit;
}
?>
