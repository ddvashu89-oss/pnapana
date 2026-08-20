<?php
/**
 * Creates (or promotes) an admin account. CLI only.
 *
 *   php backend/migrations/create_admin.php you@example.com "Your Name"
 *
 * The password is typed at the prompt, never passed as an argument — command
 * arguments are visible to other users via the process list and land in shell
 * history. A random password is generated if you press Enter.
 */
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "Forbidden: this script can only be run from the command line.";
    exit;
}

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../account_helper.php';

$email = isset($argv[1]) ? strtolower(trim($argv[1])) : '';
$name  = isset($argv[2]) ? trim($argv[2]) : 'Administrator';

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage: php create_admin.php <email> [name]\n");
    exit(1);
}

// Read without echoing where the platform allows it.
fwrite(STDOUT, "Password (leave blank to generate one): ");
$isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
if (!$isWindows) {
    shell_exec('stty -echo 2>/dev/null');
}
$password = trim((string)fgets(STDIN));
if (!$isWindows) {
    shell_exec('stty echo 2>/dev/null');
    fwrite(STDOUT, "\n");
}

$generated = false;
if ($password === '') {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    $password = '';
    for ($i = 0; $i < 20; $i++) {
        $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    $generated = true;
} elseif (strlen($password) < 12) {
    fwrite(STDERR, "Password must be at least 12 characters for an admin account.\n");
    exit(1);
}

try {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    $hash = password_hash($password, PASSWORD_DEFAULT);

    if ($existing) {
        $pdo->prepare("UPDATE users SET password = ?, is_admin = 1, token = NULL WHERE id = ?")
            ->execute([$hash, $existing['id']]);
        $id = (int)$existing['id'];
        fwrite(STDOUT, "Updated existing account and granted admin.\n");
    } else {
        $pdo->prepare("INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 1)")
            ->execute([$name, $email, $hash]);
        $id = (int)$pdo->lastInsertId();
        provision_new_account($pdo, $id);
        fwrite(STDOUT, "Created admin account.\n");
    }

    $stmt = $pdo->prepare("SELECT customer_id FROM users WHERE id = ?");
    $stmt->execute([$id]);

    fwrite(STDOUT, "  email:       $email\n");
    fwrite(STDOUT, "  customer id: " . $stmt->fetchColumn() . "\n");
    if ($generated) {
        fwrite(STDOUT, "  password:    $password\n");
        fwrite(STDOUT, "\nStore this now - it is not recoverable. Change it after first login.\n");
    }
} catch (PDOException $e) {
    fwrite(STDERR, "Failed: " . $e->getMessage() . "\n");
    exit(1);
}
