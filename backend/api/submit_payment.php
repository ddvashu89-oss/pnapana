<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once '../rate_limiter.php';
require_once 'auth.php';

// Payment proof uploads are expensive to moderate, so keep the rate tight.
check_rate_limit('submit_payment', 5, 600);

$user = authenticate($pdo);
$userId = (int)$user['id'];

$MAX_BYTES = 5 * 1024 * 1024; // 5 MB
$ALLOWED = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

$planId = isset($_POST['plan_id']) ? (int)$_POST['plan_id'] : 0;
$reference = isset($_POST['reference']) ? substr(trim($_POST['reference']), 0, 100) : null;

if (!$planId) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Choose a plan before submitting payment."]);
    exit();
}

if (!isset($_FILES['screenshot']) || $_FILES['screenshot']['error'] !== UPLOAD_ERR_OK) {
    $phpError = isset($_FILES['screenshot']) ? $_FILES['screenshot']['error'] : UPLOAD_ERR_NO_FILE;
    $message = ($phpError === UPLOAD_ERR_INI_SIZE || $phpError === UPLOAD_ERR_FORM_SIZE)
        ? "That screenshot is too large. Please upload an image under 5 MB."
        : "A payment screenshot is required.";
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => $message]);
    exit();
}

$file = $_FILES['screenshot'];

if ($file['size'] > $MAX_BYTES) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "That screenshot is too large. Please upload an image under 5 MB."]);
    exit();
}

// Trust the file's actual content, never the client-supplied name or MIME type.
$finfo = new finfo(FILEINFO_MIME_TYPE);
$detected = $finfo->file($file['tmp_name']);
if (!isset($ALLOWED[$detected]) || getimagesize($file['tmp_name']) === false) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please upload a JPG, PNG, or WEBP image."]);
    exit();
}

try {
    $planStmt = $pdo->prepare("SELECT id, code, name, price_inr FROM subscription_plans WHERE id = ? AND is_active = 1");
    $planStmt->execute([$planId]);
    $plan = $planStmt->fetch(PDO::FETCH_ASSOC);

    if (!$plan) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "That plan is not available."]);
        exit();
    }

    if ((float)$plan['price_inr'] <= 0) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "The Free plan does not require payment."]);
        exit();
    }

    $pendingStmt = $pdo->prepare("SELECT id FROM payment_requests WHERE user_id = ? AND status = 'PENDING'");
    $pendingStmt->execute([$userId]);
    if ($pendingStmt->fetch()) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "You already have a payment awaiting review."]);
        exit();
    }

    // Random filename: the stored name must never be guessable from user input.
    $filename = 'pay_' . $userId . '_' . bin2hex(random_bytes(16)) . '.' . $ALLOWED[$detected];
    $storageDir = __DIR__ . '/../storage/payment_screenshots';
    if (!is_dir($storageDir) && !mkdir($storageDir, 0770, true)) {
        throw new RuntimeException("storage directory unavailable");
    }

    if (!move_uploaded_file($file['tmp_name'], $storageDir . DIRECTORY_SEPARATOR . $filename)) {
        throw new RuntimeException("could not persist upload");
    }

    $stmt = $pdo->prepare(
        "INSERT INTO payment_requests (user_id, plan_id, amount, reference, screenshot_path, status)
         VALUES (?, ?, ?, ?, ?, 'PENDING')"
    );
    $stmt->execute([$userId, $planId, $plan['price_inr'], $reference ?: null, $filename]);

    echo json_encode([
        "status" => "success",
        "message" => "Payment submitted. An admin will review it shortly.",
        "payment" => [
            "id" => (int)$pdo->lastInsertId(),
            "amount" => (float)$plan['price_inr'],
            "plan_name" => $plan['name'],
            "status" => "PENDING"
        ]
    ]);
} catch (Exception $e) {
    error_log("submit_payment error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Could not submit your payment. Please try again."]);
}
?>
