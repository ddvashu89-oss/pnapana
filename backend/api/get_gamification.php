<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$user_id = $user['id'];

try {
    $totalPlantsStmt = $pdo->prepare("SELECT COUNT(*) FROM plants WHERE user_id = ?");
    $totalPlantsStmt->execute([$user_id]);
    $totalPlants = (int)$totalPlantsStmt->fetchColumn();

    $totalWateringsStmt = $pdo->prepare("SELECT COUNT(*) FROM care_events WHERE user_id = ? AND event_type = 'water'");
    $totalWateringsStmt->execute([$user_id]);
    $totalWaterings = (int)$totalWateringsStmt->fetchColumn();

    $totalAiScansStmt = $pdo->prepare("SELECT COUNT(*) FROM care_events WHERE user_id = ? AND event_type = 'ai_scan'");
    $totalAiScansStmt->execute([$user_id]);
    $totalAiScans = (int)$totalAiScansStmt->fetchColumn();

    $totalPostsStmt = $pdo->prepare("SELECT COUNT(*) FROM community_posts WHERE user_id = ?");
    $totalPostsStmt->execute([$user_id]);
    $totalPosts = (int)$totalPostsStmt->fetchColumn();

    $coinsStmt = $pdo->prepare("SELECT coins FROM users WHERE id = ?");
    $coinsStmt->execute([$user_id]);
    $coins = (int)$coinsStmt->fetchColumn();

    // Streak: consecutive calendar days with at least one watering event.
    // A streak still counts as "active" if yesterday had a watering even if today doesn't yet.
    $dateStmt = $pdo->prepare("SELECT DISTINCT DATE(created_at) as d FROM care_events WHERE user_id = ? AND event_type = 'water' ORDER BY d DESC");
    $dateStmt->execute([$user_id]);
    $wateredDates = array_flip($dateStmt->fetchAll(PDO::FETCH_COLUMN));

    $streak = 0;
    $cursor = new DateTime('today');
    if (!isset($wateredDates[$cursor->format('Y-m-d')])) {
        $cursor->modify('-1 day');
    }
    while (isset($wateredDates[$cursor->format('Y-m-d')])) {
        $streak++;
        $cursor->modify('-1 day');
    }

    $badges = [
        [
            "id" => "first_sprout",
            "label" => "First Sprout",
            "icon" => "🌱",
            "description" => "Add your first plant",
            "unlocked" => $totalPlants >= 1,
            "progress" => min($totalPlants, 1) . "/1"
        ],
        [
            "id" => "green_thumb",
            "label" => "Green Thumb",
            "icon" => "🌿",
            "description" => "Grow a collection of 5 plants",
            "unlocked" => $totalPlants >= 5,
            "progress" => min($totalPlants, 5) . "/5"
        ],
        [
            "id" => "plant_whisperer",
            "label" => "Plant Whisperer",
            "icon" => "🌳",
            "description" => "Grow a collection of 10 plants",
            "unlocked" => $totalPlants >= 10,
            "progress" => min($totalPlants, 10) . "/10"
        ],
        [
            "id" => "hydration_hero",
            "label" => "Hydration Hero",
            "icon" => "💧",
            "description" => "Keep a 7-day watering streak",
            "unlocked" => $streak >= 7,
            "progress" => min($streak, 7) . "/7"
        ],
        [
            "id" => "dedicated_gardener",
            "label" => "Dedicated Gardener",
            "icon" => "🔥",
            "description" => "Keep a 30-day watering streak",
            "unlocked" => $streak >= 30,
            "progress" => min($streak, 30) . "/30"
        ],
        [
            "id" => "ai_pioneer",
            "label" => "AI Pioneer",
            "icon" => "✨",
            "description" => "Run your first AI scan or identification",
            "unlocked" => $totalAiScans >= 1,
            "progress" => min($totalAiScans, 1) . "/1"
        ],
        [
            "id" => "bloom_influencer",
            "label" => "Bloom Influencer",
            "icon" => "🌟",
            "description" => "Share 3 plants with the community",
            "unlocked" => $totalPosts >= 3,
            "progress" => min($totalPosts, 3) . "/3"
        ],
    ];

    echo json_encode([
        "status" => "success",
        "streak_days" => $streak,
        "coins" => $coins,
        "stats" => [
            "total_plants" => $totalPlants,
            "total_waterings" => $totalWaterings,
            "total_ai_scans" => $totalAiScans,
            "total_posts" => $totalPosts
        ],
        "badges" => $badges
    ]);
} catch (PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("get_gamification error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
