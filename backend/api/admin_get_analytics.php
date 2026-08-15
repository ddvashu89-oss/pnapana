<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

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

    echo json_encode([
        "status" => "success",
        "metrics" => $result,
        "top_species" => $species
    ]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
