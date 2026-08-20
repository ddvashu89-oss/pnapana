<?php
/**
 * One-time admin creation, runnable from a browser.
 *
 * Shared cPanel plans often have no SSH, so the CLI script in
 * migrations/create_admin.php cannot be used. This does the same job over HTTP
 * with three locks on it:
 *
 *   1. It refuses to run once ANY admin account exists.
 *   2. It requires SETUP_KEY from config.php in the URL.
 *   3. It tells you to delete this file the moment it succeeds.
 *
 * Usage:  https://your-domain.com/backend/setup_admin.php?key=<SETUP_KEY>
 *
 * DELETE THIS FILE once your admin account exists.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/account_helper.php';

// db.php emits JSON headers; this page is HTML.
header('Content-Type: text/html; charset=UTF-8');

function page($title, $body, $code = 200) {
    http_response_code($code);
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<title>Pnapana setup</title>'
       . '<style>body{font-family:system-ui,sans-serif;background:#070908;color:#fff;'
       . 'display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:2rem}'
       . 'main{max-width:34rem;width:100%}h1{font-size:1.5rem;margin:0 0 1rem}'
       . 'p{color:#9db2a5;line-height:1.6}label{display:block;margin:1rem 0 .3rem;font-size:.9rem}'
       . 'input{width:100%;padding:.8rem;border-radius:8px;border:1px solid #2a3a31;background:#0f1311;color:#fff;font-size:1rem}'
       . 'button{margin-top:1.4rem;width:100%;padding:.9rem;border:0;border-radius:999px;font-size:1rem;font-weight:700;'
       . 'background:linear-gradient(135deg,#52bf78,#ff9d66);color:#000;cursor:pointer}'
       . 'code{background:#0f1311;padding:.2rem .45rem;border-radius:5px;color:#74e59c;word-break:break-all}'
       . '.warn{color:#ff9d66}.ok{color:#52bf78}</style>'
       . '<main><h1>' . $title . '</h1>' . $body . '</main>';
    exit;
}

// --- Lock 1: an existing admin means setup is already done -------------------
try {
    $adminCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE is_admin = 1")->fetchColumn();
} catch (PDOException $e) {
    page('Database not ready',
        '<p>Could not read the users table. Import <code>backend/install.sql</code> through phpMyAdmin first, '
        . 'and check the database settings in <code>backend/config.php</code>.</p>', 500);
}

if ($adminCount > 0) {
    page('Setup already complete',
        '<p>An admin account already exists, so this page is disabled.</p>'
        . '<p class="warn">Delete <code>backend/setup_admin.php</code> from your server now.</p>', 403);
}

// --- Lock 2: the shared secret ----------------------------------------------
if (!defined('SETUP_KEY') || SETUP_KEY === '' || SETUP_KEY === 'CHANGE_ME') {
    page('Setup key not configured',
        '<p>Add a long random value to <code>backend/config.php</code>:</p>'
        . '<p><code>define(\'SETUP_KEY\', \'' . bin2hex(random_bytes(16)) . '\');</code></p>'
        . '<p>Then reload this page with <code>?key=</code> followed by that value.</p>', 403);
}

$providedKey = isset($_GET['key']) ? (string)$_GET['key'] : '';
if (!hash_equals(SETUP_KEY, $providedKey)) {
    page('Setup key required',
        '<p>Append your <code>SETUP_KEY</code> to the address:</p>'
        . '<p><code>setup_admin.php?key=YOUR_SETUP_KEY</code></p>', 403);
}

// --- Create the account ------------------------------------------------------
$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim((string)($_POST['name'] ?? ''));
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $password = (string)($_POST['password'] ?? '');

    if ($name === '')                                   $errors[] = 'Name is required.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))     $errors[] = 'Enter a valid email address.';
    if (strlen($password) < 12)                         $errors[] = 'Use at least 12 characters for an admin password.';

    if (!$errors) {
        try {
            $dupe = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $dupe->execute([$email]);

            if ($row = $dupe->fetch(PDO::FETCH_ASSOC)) {
                $pdo->prepare("UPDATE users SET name = ?, password = ?, is_admin = 1, token = NULL WHERE id = ?")
                    ->execute([$name, password_hash($password, PASSWORD_DEFAULT), $row['id']]);
                $id = (int)$row['id'];
            } else {
                $pdo->prepare("INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 1)")
                    ->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
                $id = (int)$pdo->lastInsertId();
                provision_new_account($pdo, $id);
            }

            $cid = $pdo->prepare("SELECT customer_id FROM users WHERE id = ?");
            $cid->execute([$id]);

            page('Admin created <span class="ok">&#10003;</span>',
                '<p>Sign in with <code>' . htmlspecialchars($email, ENT_QUOTES) . '</code>.</p>'
                . '<p>Customer ID: <code>' . htmlspecialchars((string)$cid->fetchColumn(), ENT_QUOTES) . '</code></p>'
                . '<p class="warn"><strong>Delete <code>backend/setup_admin.php</code> from your server now.</strong> '
                . 'This page has locked itself, but the file should not stay on a live site.</p>');
        } catch (PDOException $e) {
            error_log('setup_admin error: ' . $e->getMessage());
            $errors[] = 'Could not create the account. Check the server error log.';
        }
    }
}

$errorHtml = '';
foreach ($errors as $err) {
    $errorHtml .= '<p class="warn">' . htmlspecialchars($err, ENT_QUOTES) . '</p>';
}

page('Create your admin account',
    '<p>This runs once. The page disables itself as soon as an admin exists.</p>'
    . $errorHtml
    . '<form method="post">'
    . '<label>Name</label><input name="name" required value="' . htmlspecialchars($_POST['name'] ?? '', ENT_QUOTES) . '">'
    . '<label>Email</label><input type="email" name="email" required value="' . htmlspecialchars($_POST['email'] ?? '', ENT_QUOTES) . '">'
    . '<label>Password (minimum 12 characters)</label><input type="password" name="password" required minlength="12" autocomplete="new-password">'
    . '<button type="submit">Create admin</button>'
    . '</form>');
