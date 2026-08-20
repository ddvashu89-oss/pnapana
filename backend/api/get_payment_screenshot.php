<?php
// Streams a payment screenshot to the admin reviewing it, or to the user who
// uploaded it. The files live in a directory that is not served directly, so
// this endpoint is the only way to read one and it always checks ownership.

require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$paymentId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$paymentId) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(["status" => "error", "message" => "Payment id is required"]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT user_id, screenshot_path FROM payment_requests WHERE id = ?");
    $stmt->execute([$paymentId]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$payment) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(["status" => "error", "message" => "Payment not found"]);
        exit();
    }

    if (empty($user['is_admin']) && (int)$payment['user_id'] !== (int)$user['id']) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(["status" => "error", "message" => "Forbidden"]);
        exit();
    }

    // basename() defends against any traversal that reached the column.
    $path = __DIR__ . '/../storage/payment_screenshots/' . basename($payment['screenshot_path']);
    if (!is_file($path)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(["status" => "error", "message" => "Screenshot file is missing"]);
        exit();
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($path);
    if (strpos($mime, 'image/') !== 0) {
        http_response_code(415);
        header('Content-Type: application/json');
        echo json_encode(["status" => "error", "message" => "Unsupported file"]);
        exit();
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: inline; filename="payment-' . $paymentId . '"');
    header('Cache-Control: private, no-store');
    readfile($path);
} catch (PDOException $e) {
    error_log("get_payment_screenshot error: " . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(["status" => "error", "message" => "Could not load the screenshot."]);
}
?>
