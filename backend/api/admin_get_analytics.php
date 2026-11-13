<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once __DIR__ . '/../growth_schema.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);
pnapana_ensure_growth_schema($pdo);

const DAYS = 30;

// Builds a complete day-by-day series (zero-filled) so a quiet day doesn't break the line.
function daily_series($pdo, $table, $dateColumn, $extraWhere = '') {
    $start = date('Y-m-d', strtotime('-' . (DAYS - 1) . ' days'));
    $sql = "SELECT DATE($dateColumn) AS d, COUNT(*) AS c FROM $table
            WHERE $dateColumn >= ? $extraWhere
            GROUP BY DATE($dateColumn)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start]);
    $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $series = [];
    for ($i = DAYS - 1; $i >= 0; $i--) {
        $day = date('Y-m-d', strtotime("-$i days"));
        $series[] = ['date' => $day, 'value' => isset($rows[$day]) ? (int)$rows[$day] : 0];
    }
    return $series;
}

try {
    $users = daily_series($pdo, 'users', 'created_at');
    $plants = daily_series($pdo, 'plants', 'created_at');
    $waterings = daily_series($pdo, 'care_events', 'created_at', "AND event_type = 'water'");
    $posts = daily_series($pdo, 'community_posts', 'created_at');

    $prevStart = date('Y-m-d', strtotime('-' . (DAYS * 2 - 1) . ' days'));
    $prevEnd = date('Y-m-d', strtotime('-' . DAYS . ' days'));

    function previous_total($pdo, $table, $dateColumn, $extraWhere, $prevStart, $prevEnd) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM $table WHERE $dateColumn >= ? AND $dateColumn < ? $extraWhere");
        $stmt->execute([$prevStart, $prevEnd]);
        return (int)$stmt->fetchColumn();
    }

    $metrics = [
        'users' => ['series' => $users, 'where' => ''],
        'plants' => ['series' => $plants, 'where' => ''],
        'waterings' => ['series' => $waterings, 'where' => "AND event_type = 'water'"],
        'posts' => ['series' => $posts, 'where' => ''],
    ];
    $tableFor = ['users' => 'users', 'plants' => 'plants', 'waterings' => 'care_events', 'posts' => 'community_posts'];

    $result = [];
    foreach ($metrics as $key => $m) {
        $current = array_sum(array_column($m['series'], 'value'));
        $previous = previous_total($pdo, $tableFor[$key], 'created_at', $m['where'], $prevStart, $prevEnd);
        $delta = $previous > 0 ? round((($current - $previous) / $previous) * 100, 1) : ($current > 0 ? 100 : 0);
        $result[$key] = ['series' => $m['series'], 'total' => $current, 'delta_pct' => $delta];
    }

    $speciesStmt = $pdo->query("SELECT species, COUNT(*) AS c FROM plants GROUP BY species ORDER BY c DESC LIMIT 6");
    $species = $speciesStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($species as &$s) { $s['c'] = (int)$s['c']; }

    $setupStmt = $pdo->query('SELECT COUNT(*) AS total, SUM(setup_completed = 1) AS completed FROM plants');
    $setup = $setupStmt->fetch(PDO::FETCH_ASSOC) ?: ['total' => 0, 'completed' => 0];
    $attempts = (int)$pdo->query("SELECT COUNT(*) FROM analytics_events WHERE event_name='plant_scan_attempted' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    $scanSuccesses = (int)$pdo->query("SELECT COUNT(*) FROM analytics_events WHERE event_name='plant_scan_succeeded' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    $inactiveUsers = (int)$pdo->query("SELECT COUNT(*) FROM users u WHERE u.is_admin=0 AND u.status='ACTIVE' AND u.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) AND NOT EXISTS (SELECT 1 FROM care_events c WHERE c.user_id=u.id AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AND NOT EXISTS (SELECT 1 FROM analytics_events a WHERE a.user_id=u.id AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))")->fetchColumn();
    $aiStmt = $pdo->query("SELECT operation, provider, COUNT(*) AS requests, SUM(success) AS successes, ROUND(SUM(estimated_cost_usd), 6) AS estimated_cost_usd FROM ai_usage_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY operation, provider ORDER BY requests DESC");
    $aiUsage = $aiStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($aiUsage as &$row) { $row['requests'] = (int)$row['requests']; $row['successes'] = (int)$row['successes']; $row['estimated_cost_usd'] = (float)$row['estimated_cost_usd']; }
    $confirmedIdentifications = (int)$pdo->query("SELECT COUNT(*) FROM plant_identification_events WHERE confirmed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    $correctedIdentifications = (int)$pdo->query("SELECT COUNT(*) FROM plant_identification_events WHERE corrected=1 AND confirmed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    $multiAngleScans = (int)$pdo->query("SELECT COUNT(*) FROM plant_identification_events WHERE image_count >= 3 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    $identificationScans = (int)$pdo->query("SELECT COUNT(*) FROM plant_identification_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    $product = [
        'scan_attempts_30d' => $attempts,
        'scan_success_rate' => $attempts > 0 ? round($scanSuccesses * 100 / $attempts, 1) : 0,
        'setup_completion_rate' => (int)$setup['total'] > 0 ? round((int)$setup['completed'] * 100 / (int)$setup['total'], 1) : 0,
        'inactive_users_30d' => $inactiveUsers,
        'journal_entries_30d' => (int)$pdo->query("SELECT COUNT(*) FROM plant_journal_entries WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn(),
        'open_disease_followups' => (int)$pdo->query("SELECT COUNT(*) FROM disease_cases WHERE status IN ('monitoring','improving')")->fetchColumn(),
        'pending_deletions' => (int)$pdo->query("SELECT COUNT(*) FROM account_deletion_requests WHERE status='pending'")->fetchColumn(),
        'estimated_ai_cost_usd_30d' => array_sum(array_column($aiUsage, 'estimated_cost_usd')),
        'identification_confirmations_30d' => $confirmedIdentifications,
        'identification_correction_rate' => $confirmedIdentifications > 0 ? round($correctedIdentifications * 100 / $confirmedIdentifications, 1) : 0,
        'multi_angle_scan_rate' => $identificationScans > 0 ? round($multiAngleScans * 100 / $identificationScans, 1) : 0,
    ];

    echo json_encode([
        "status" => "success",
        "metrics" => $result,
        "top_species" => $species,
        "product_metrics" => $product,
        "ai_usage" => $aiUsage
    ]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("admin_get_analytics error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
