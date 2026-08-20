<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
require_admin($user);

try {
    $totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $totalPlants = (int)$pdo->query("SELECT COUNT(*) FROM plants")->fetchColumn();
    $thrivingPlants = (int)$pdo->query("SELECT COUNT(*) FROM plants WHERE status_color = 'green'")->fetchColumn();
    $needsWaterPlants = $totalPlants - $thrivingPlants;
    $totalPosts = (int)$pdo->query("SELECT COUNT(*) FROM community_posts")->fetchColumn();
    $openMessages = (int)$pdo->query("SELECT COUNT(*) FROM contact_messages")->fetchColumn();
    $systemHealth = $totalPlants > 0 ? round(($thrivingPlants / $totalPlants) * 100, 1) : 100;

    // Merge the last few events across activity types into one recent-activity feed.
    $activity = [];

    $signups = $pdo->query("SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($signups as $s) {
        $activity[] = ['type' => 'User Registration', 'message' => "New user '{$s['name']}' signed up", 'created_at' => $s['created_at'], 'status' => 'Log'];
    }

    $messages = $pdo->query("SELECT name, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($messages as $m) {
        $activity[] = ['type' => 'Contact Message', 'message' => "New message from '{$m['name']}'", 'created_at' => $m['created_at'], 'status' => 'Log'];
    }

    $posts = $pdo->query("SELECT u.name, cp.created_at FROM community_posts cp JOIN users u ON cp.user_id = u.id ORDER BY cp.created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($posts as $p) {
        $activity[] = ['type' => 'Community Post', 'message' => "'{$p['name']}' shared a plant update", 'created_at' => $p['created_at'], 'status' => 'Success'];
    }

    usort($activity, function ($a, $b) { return strtotime($b['created_at']) <=> strtotime($a['created_at']); });
    $activity = array_slice($activity, 0, 8);

    echo json_encode([
        "status" => "success",
        "stats" => [
            "total_users" => $totalUsers,
            "total_plants" => $totalPlants,
            "thriving_plants" => $thrivingPlants,
            "needs_water_plants" => $needsWaterPlants,
            "total_posts" => $totalPosts,
            "open_messages" => $openMessages,
            "system_health" => $systemHealth
        ],
        "activity" => $activity
    ]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("admin_get_stats error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
