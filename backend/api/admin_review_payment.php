<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

$data = json_decode(file_get_contents('php://input'), true);
$paymentId = isset($data['id']) ? (int)$data['id'] : 0;
$decision = isset($data['decision']) ? strtoupper(trim($data['decision'])) : '';
$note = isset($data['note']) ? substr(trim($data['note']), 0, 500) : null;

if (!$paymentId || !in_array($decision, ['APPROVED', 'REJECTED'], true)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "A payment id and a decision of APPROVED or REJECTED are required."]);
    exit();
}

try {
    $stmt = $pdo->prepare(
        "SELECT pr.*, sp.billing_days, sp.code AS plan_code
         FROM payment_requests pr
         JOIN subscription_plans sp ON sp.id = pr.plan_id
         WHERE pr.id = ?"
    );
    $stmt->execute([$paymentId]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$payment) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Payment not found"]);
        exit();
    }

    // Reviewing an already-decided payment would double-extend a subscription.
    if ($payment['status'] !== 'PENDING') {
        http_response_code(409);
        echo json_encode([
            "status" => "error",
            "message" => "This payment was already " . strtolower($payment['status']) . "."
        ]);
        exit();
    }

    $pdo->beginTransaction();

    $update = $pdo->prepare(
        "UPDATE payment_requests
         SET status = ?, admin_note = ?, verified_at = NOW(), verified_by = ?
         WHERE id = ? AND status = 'PENDING'"
    );
    $update->execute([$decision, $note ?: null, (int)$user['id'], $paymentId]);

    // Guard against two admins approving the same payment simultaneously.
    if ($update->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "This payment was just reviewed by someone else."]);
        exit();
    }

    $subscription = null;
    if ($decision === 'APPROVED') {
        $billingDays = max(1, (int)$payment['billing_days']);
        $targetUser = (int)$payment['user_id'];
        $planId = (int)$payment['plan_id'];

        // If the user already holds this plan and it has not lapsed, extend from
        // its current expiry rather than from today, so they lose no paid days.
        $existing = $pdo->prepare(
            "SELECT id, expires_at FROM subscriptions
             WHERE user_id = ? AND plan_id = ? AND status = 'ACTIVE'
             ORDER BY id DESC LIMIT 1"
        );
        $existing->execute([$targetUser, $planId]);
        $current = $existing->fetch(PDO::FETCH_ASSOC);

        $base = 'NOW()';
        if ($current && $current['expires_at'] && strtotime($current['expires_at']) > time()) {
            $base = '?';
        }

        if ($current) {
            $sql = "UPDATE subscriptions SET status = 'ACTIVE',
                    expires_at = DATE_ADD(" . $base . ", INTERVAL ? DAY) WHERE id = ?";
            $args = $base === '?'
                ? [$current['expires_at'], $billingDays, $current['id']]
                : [$billingDays, $current['id']];
            $pdo->prepare($sql)->execute($args);
        } else {
            $pdo->prepare(
                "INSERT INTO subscriptions (user_id, plan_id, status, expires_at)
                 VALUES (?, ?, 'ACTIVE', DATE_ADD(NOW(), INTERVAL ? DAY))"
            )->execute([$targetUser, $planId, $billingDays]);
        }

        // Any other active paid plan is superseded by the one just approved.
        $pdo->prepare(
            "UPDATE subscriptions SET status = 'CANCELLED'
             WHERE user_id = ? AND plan_id != ? AND status = 'ACTIVE'
               AND plan_id IN (SELECT id FROM subscription_plans WHERE price_inr > 0)"
        )->execute([$targetUser, $planId]);

        $subStmt = $pdo->prepare(
            "SELECT s.id, s.status, s.expires_at, sp.code, sp.name
             FROM subscriptions s JOIN subscription_plans sp ON sp.id = s.plan_id
             WHERE s.user_id = ? AND s.plan_id = ? ORDER BY s.id DESC LIMIT 1"
        );
        $subStmt->execute([$targetUser, $planId]);
        $subscription = $subStmt->fetch(PDO::FETCH_ASSOC);
    }

    $pdo->commit();

    echo json_encode([
        "status" => "success",
        "message" => $decision === 'APPROVED' ? "Payment approved and subscription activated." : "Payment rejected.",
        "payment_status" => $decision,
        "subscription" => $subscription
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("admin_review_payment error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Could not review the payment. Please try again."]);
}
?>
