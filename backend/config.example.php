<?php
// Copy this file to config.php and fill in your credentials.
// config.php is gitignored and must never be committed.

// --- Environment ------------------------------------------------------------
// 'production' hides PHP errors from visitors and requires real DB credentials.
// Use 'development' only on your own machine.
define('APP_ENV', getenv('APP_ENV') ?: 'production');

// --- Database ---------------------------------------------------------------
// Create a dedicated user for this app. Do NOT use the database root account,
// and never leave the password blank on a server.
//
//   CREATE DATABASE pnapana_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
//   CREATE USER 'pnapana'@'localhost' IDENTIFIED BY 'a-long-random-password';
//   GRANT SELECT, INSERT, UPDATE, DELETE ON pnapana_db.* TO 'pnapana'@'localhost';
//   FLUSH PRIVILEGES;
//
// Note the grant deliberately excludes DROP/ALTER: schema changes are applied
// by running the migration scripts as an admin user, not by the running app.
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'pnapana_db');
define('DB_USER', getenv('DB_USER') ?: 'pnapana');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'CHANGE_ME');

// --- Which sites may call this API ------------------------------------------
// Comma-separated list of exact origins (scheme + host + optional port).
// Anything not listed is refused by the browser. No wildcards.
define('ALLOWED_ORIGINS', getenv('ALLOWED_ORIGINS') ?: 'https://your-domain.com,https://www.your-domain.com');

// --- Gemini AI --------------------------------------------------------------
define('GEMINI_API_KEY', getenv('GEMINI_API_KEY') ?: 'YOUR_KEY_HERE');
define('GEMINI_MODEL', getenv('GEMINI_MODEL') ?: 'gemini-flash-lite-latest');

// --- Auth -------------------------------------------------------------------
// Generate your own with: php -r "echo bin2hex(random_bytes(32));"
// Changing this signs every user out immediately.
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'YOUR_RANDOM_SECRET_HERE');

// Public URL of the frontend. Used to build password-reset links.
define('APP_URL', getenv('APP_URL') ?: 'https://your-domain.com');

// Transactional email. On most shared hosts PHP's mail() works as-is.
define('MAIL_FROM', getenv('MAIL_FROM') ?: 'no-reply@your-domain.com');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'Pnapana');

// One-time key for backend/setup_admin.php, which creates your first admin
// account when the host has no SSH. Delete that file after using it.
define('SETUP_KEY', getenv('SETUP_KEY') ?: 'CHANGE_ME');
