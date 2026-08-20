<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once '../rate_limiter.php';
require_once '../mailer.php';

// Tight limit: this endpoint sends mail and probes account existence.
check_rate_limit('password_reset_request', 5, 900);

$data = json_decode(file_get_contents('php://input'), true);
$email = isset($data['email']) ? strtolower(trim($data['email'])) : '';

// The same response is returned whether or not the account exists. Revealing it
// would turn this endpoint into a free account-enumeration oracle.
$genericSuccess = [
    "status" => "success",
    "message" => "If an account exists for that address, a reset link is on its way."
];

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode($genericSuccess);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT id, name FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // Invalidate any outstanding link, so only the newest one works.
        $pdo->prepare("UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL")
            ->execute([$user['id']]);

        $token = bin2hex(random_bytes(32));
        $pdo->prepare(
            "INSERT INTO password_resets (user_id, token_hash, expires_at, requested_ip)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), ?)"
        )->execute([
            $user['id'],
            hash('sha256', $token),
            isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
        ]);

        $appUrl = defined('APP_URL') && APP_URL !== '' ? rtrim(APP_URL, '/') : '';
        if ($appUrl === '') {
            // Fall back to the calling origin when APP_URL is not configured.
            $appUrl = isset($_SERVER['HTTP_ORIGIN']) ? rtrim($_SERVER['HTTP_ORIGIN'], '/') : '';
        }
        $link = $appUrl . '/reset-password/?token=' . $token;

        $body = "Hello " . $user['name'] . ",\n\n"
              . "We received a request to reset your Pnapana password.\n\n"
              . "Open this link to choose a new one:\n"
              . $link . "\n\n"
              . "The link works once and expires in one hour.\n\n"
              . "If you did not ask for this, you can ignore this email - your "
              . "password stays as it is.\n\n"
              . "- Pnapana";

        pnapana_send_mail($email, 'Reset your Pnapana password', $body);
    }

    echo json_encode($genericSuccess);
} catch (PDOException $e) {
    error_log("request_password_reset error: " . $e->getMessage());
    // Still generic: an error must not distinguish a real address either.
    echo json_encode($genericSuccess);
}
?>
