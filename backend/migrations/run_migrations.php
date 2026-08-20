<?php
/**
 * Applies the subscription/payment migration. CLI only.
 *
 *   php backend/migrations/run_migrations.php
 *
 * Every step is idempotent, so running it twice is harmless.
 */
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "Forbidden: migrations can only be run from the command line.";
    exit;
}

require_once __DIR__ . '/../db.php';

function step($label, callable $fn) {
    try {
        $result = $fn();
        echo "  [ok]   $label" . ($result ? " ($result)" : "") . "\n";
    } catch (PDOException $e) {
        echo "  [skip] $label -- " . $e->getMessage() . "\n";
    }
}

echo "\nPnapana migration: subscriptions & payments\n";
echo str_repeat('-', 60) . "\n";

// --- Tables -----------------------------------------------------------------
echo "Tables:\n";
// Every .sql file in this directory, applied in filename order.
$files = glob(__DIR__ . '/*.sql');
sort($files);
$sql = '';
foreach ($files as $file) {
    $sql .= file_get_contents($file) . "\n";
}
// Split on semicolons at end of line so the COMMENT strings survive intact.
foreach (preg_split('/;\s*\n/', $sql) as $statement) {
    // Strip whole-line comments; a leading comment block must not disqualify
    // the real statement that follows it.
    $statement = trim(preg_replace('/^\s*--[^\n]*$/m', '', $statement));
    if ($statement === '') continue;
    step(substr(preg_replace('/\s+/', ' ', $statement), 0, 58), function () use ($pdo, $statement) {
        $pdo->exec($statement);
        return null;
    });
}

// --- User columns -----------------------------------------------------------
echo "\nUser columns:\n";
step("add users.customer_id", function () use ($pdo) {
    $pdo->exec("ALTER TABLE users ADD COLUMN customer_id VARCHAR(20) DEFAULT NULL");
    return null;
});
step("add unique index on users.customer_id", function () use ($pdo) {
    $pdo->exec("ALTER TABLE users ADD UNIQUE KEY uniq_customer_id (customer_id)");
    return null;
});
step("add users.status", function () use ($pdo) {
    $pdo->exec("ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'");
    return null;
});

// --- Backfill customer IDs --------------------------------------------------
// PNP-<year the account was created>-<zero-padded internal id>. Deriving it from
// the auto-increment id makes it unique by construction, with no counter to race.
echo "\nBackfill:\n";
step("generate customer IDs for existing users", function () use ($pdo) {
    $stmt = $pdo->query("SELECT id, created_at FROM users WHERE customer_id IS NULL ORDER BY id");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $update = $pdo->prepare("UPDATE users SET customer_id = ? WHERE id = ?");
    foreach ($rows as $row) {
        $year = date('Y', strtotime($row['created_at']));
        $update->execute(['PNP-' . $year . '-' . str_pad($row['id'], 6, '0', STR_PAD_LEFT), $row['id']]);
    }
    return count($rows) . " updated";
});

step("put existing users on the Free plan", function () use ($pdo) {
    $freeId = $pdo->query("SELECT id FROM subscription_plans WHERE code = 'FREE'")->fetchColumn();
    if (!$freeId) return "no FREE plan found";
    $stmt = $pdo->prepare(
        "INSERT INTO subscriptions (user_id, plan_id, status, expires_at)
         SELECT u.id, ?, 'ACTIVE', NULL FROM users u
         WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id)"
    );
    $stmt->execute([$freeId]);
    return $stmt->rowCount() . " subscribed";
});

// --- UPI payee settings -----------------------------------------------------
echo "\nSettings:\n";
foreach ([
    "upi_id VARCHAR(255) NOT NULL DEFAULT ''",
    "upi_payee_name VARCHAR(255) NOT NULL DEFAULT 'Pnapana'",
] as $column) {
    $name = strtok($column, ' ');
    step("add app_settings.$name", function () use ($pdo, $column) {
        $pdo->exec("ALTER TABLE app_settings ADD COLUMN $column");
        return null;
    });
}

// --- Private storage --------------------------------------------------------
// Payment screenshots must never be fetchable by URL, so they live outside the
// served tree and are streamed by an authenticated endpoint instead.
echo "\nStorage:\n";
$storage = __DIR__ . '/../storage/payment_screenshots';
step("create private screenshot directory", function () use ($storage) {
    if (!is_dir($storage) && !mkdir($storage, 0770, true)) {
        throw new PDOException("could not create $storage");
    }
    // Belt and braces: deny direct access even if the tree is ever served.
    file_put_contents(
        dirname($storage) . '/.htaccess',
        "Require all denied\n<IfModule !mod_authz_core.c>\n  Order deny,allow\n  Deny from all\n</IfModule>\n"
    );
    return $storage;
});

echo "\nDone.\n\n";
