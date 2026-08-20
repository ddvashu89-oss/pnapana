<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

$status = isset($_GET['status']) ? strtoupper(trim($_GET['status'])) : '';
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];

try {
    $where = [];
    $params = [];

    if ($status !== '' && in_array($status, $allowedStatuses, true)) {
        $where[] = 'pr.status = ?';
        $params[] = $status;
    }

    // Admin search covers customer id, name, email, and the UPI reference.
    if ($search !== '') {
        $where[] = '(u.customer_id LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR pr.reference LIKE ?)';
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like);
    }

    $sql = "SELECT pr.id, pr.amount, pr.reference, pr.status, pr.admin_note,
                   pr.submitted_at, pr.verified_at,
                   u.id AS user_id, u.customer_id, u.name AS user_name, u.email AS user_email,
                   sp.code AS plan_code, sp.name AS plan_name,
                   v.name AS verified_by_name
            FROM payment_requests pr
            JOIN users u ON u.id = pr.user_id
            JOIN subscription_plans sp ON sp.id = pr.plan_id
            LEFT JOIN users v ON v.id = pr.verified_by";
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    // Pending first so the admin's queue is the default view.
    $sql .= " ORDER BY (pr.status = 'PENDING') DESC, pr.id DESC LIMIT 200";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($payments as &$row) {
        $row['id'] = (int)$row['id'];
        $row['user_id'] = (int)$row['user_id'];
        $row['amount'] = (float)$row['amount'];
    }
    unset($row);

    $totals = $pdo->query(
        "SELECT
            SUM(status = 'PENDING') AS pending,
            SUM(status = 'APPROVED') AS approved,
            SUM(status = 'REJECTED') AS rejected,
            COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) AS revenue
         FROM payment_requests"
    )->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "payments" => $payments,
        "summary" => [
            "pending" => (int)$totals['pending'],
            "approved" => (int)$totals['approved'],
            "rejected" => (int)$totals['rejected'],
            "revenue" => (float)$totals['revenue']
        ]
    ]);
} catch (PDOException $e) {
    error_log("admin_get_payments error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Could not load payments."]);
}
?>
