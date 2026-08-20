<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once '../account_helper.php';
require_once 'auth.php';

$user = authenticate($pdo);
$userId = (int)$user['id'];

try {
    $plan = get_active_plan($pdo, $userId);

    $plansStmt = $pdo->query(
        "SELECT id, code, name, price_inr, billing_days, max_plants, ai_diagnosis, ai_chat, weather_care
         FROM subscription_plans WHERE is_active = 1 ORDER BY price_inr ASC"
    );
    $plans = $plansStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($plans as &$p) {
        $p['id'] = (int)$p['id'];
        $p['price_inr'] = (float)$p['price_inr'];
        $p['billing_days'] = (int)$p['billing_days'];
        $p['max_plants'] = $p['max_plants'] === null ? null : (int)$p['max_plants'];
        $p['ai_diagnosis'] = (bool)$p['ai_diagnosis'];
        $p['ai_chat'] = (bool)$p['ai_chat'];
        $p['weather_care'] = (bool)$p['weather_care'];
    }
    unset($p);

    // The screenshot itself is deliberately not exposed here; it is streamed by
    // get_payment_screenshot.php behind an ownership check.
    $payStmt = $pdo->prepare(
        "SELECT pr.id, pr.amount, pr.reference, pr.status, pr.admin_note, pr.submitted_at, pr.verified_at,
                sp.code AS plan_code, sp.name AS plan_name
         FROM payment_requests pr
         JOIN subscription_plans sp ON sp.id = pr.plan_id
         WHERE pr.user_id = ? ORDER BY pr.id DESC"
    );
    $payStmt->execute([$userId]);
    $payments = $payStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($payments as &$row) {
        $row['id'] = (int)$row['id'];
        $row['amount'] = (float)$row['amount'];
    }
    unset($row);

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM plants WHERE user_id = ?");
    $countStmt->execute([$userId]);
    $plantCount = (int)$countStmt->fetchColumn();

    $settings = $pdo->query("SELECT upi_id, upi_payee_name FROM app_settings WHERE id = 1")->fetch(PDO::FETCH_ASSOC);

    $customerStmt = $pdo->prepare("SELECT customer_id FROM users WHERE id = ?");
    $customerStmt->execute([$userId]);

    echo json_encode([
        "status" => "success",
        "customer_id" => $customerStmt->fetchColumn(),
        "current_plan" => $plan,
        "plans" => $plans,
        "payments" => $payments,
        "plant_count" => $plantCount,
        "plant_limit" => $plan['max_plants'],
        "upi" => [
            "id" => $settings['upi_id'] ?? '',
            "payee_name" => $settings['upi_payee_name'] ?? 'Pnapana'
        ]
    ]);
} catch (PDOException $e) {
    error_log("get_subscription error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Could not load your subscription."]);
}
?>
