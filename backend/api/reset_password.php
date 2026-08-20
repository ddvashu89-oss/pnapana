<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once '../rate_limiter.php';

check_rate_limit('password_reset_submit', 10, 900);

$data = json_decode(file_get_contents('php://input'), true);
$token = isset($data['token']) ? trim($data['token']) : '';
$password = isset($data['password']) ? (string)$data['password'] : '';
$confirm = isset($data['confirm_password']) ? (string)$data['confirm_password'] : '';

if ($token === '' || $password === '') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "A reset link and a new password are required."]);
    exit();
}

if ($confirm !== '' && $password !== $confirm) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "The two passwords do not match."]);
    exit();
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters long."]);
    exit();
}

try {
    // Look the token up by its hash; the raw value is never stored.
    $stmt = $pdo->prepare(
        "SELECT id, user_id FROM password_resets
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()"
    );
    $stmt->execute([hash('sha256', $token)]);
    $reset = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reset) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "That reset link is invalid or has expired. Please request a new one."
        ]);
        exit();
    }

    $pdo->beginTransaction();

    // Mark used first, and only if still unused: two submissions racing on the
    // same link must not both succeed.
    $consume = $pdo->prepare("UPDATE password_resets SET used_at = NOW() WHERE id = ? AND used_at IS NULL");
    $consume->execute([$reset['id']]);

    if ($consume->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "That reset link has already been used."]);
        exit();
    }

    // Rotating the session id signs out every existing login, which is the point
    // of a reset: whoever knew the old password loses access immediately.
    $pdo->prepare("UPDATE users SET password = ?, token = ? WHERE id = ?")
        ->execute([
            password_hash($password, PASSWORD_DEFAULT),
            bin2hex(random_bytes(32)),
            $reset['user_id'],
        ]);

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Your password has been changed. You can sign in now."
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("reset_password error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Could not reset your password. Please try again."]);
}
?>
