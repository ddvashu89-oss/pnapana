<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$user_id = $user['id'];

$data = json_decode(file_get_contents('php://input'), true);
$caption = isset($data['caption']) ? trim($data['caption']) : '';

if ($caption === '') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Caption is required"]);
    exit();
}

$plant_id = isset($data['plant_id']) && $data['plant_id'] !== '' ? (int)$data['plant_id'] : null;
$plant_name = isset($data['plant_name']) && $data['plant_name'] !== '' ? $data['plant_name'] : null;
$image_url = isset($data['image_url']) && $data['image_url'] !== '' ? $data['image_url'] : null;

const POST_COINS_REWARD = 15;

try {
    // If a plant is referenced, make sure it actually belongs to this user.
    if ($plant_id !== null) {
        $ownStmt = $pdo->prepare("SELECT name, image_url FROM plants WHERE id = ? AND user_id = ?");
        $ownStmt->execute([$plant_id, $user_id]);
        $owned = $ownStmt->fetch(PDO::FETCH_ASSOC);
        if (!$owned) {
            $plant_id = null;
        } else {
            if (!$plant_name) $plant_name = $owned['name'];
            if (!$image_url) $image_url = $owned['image_url'];
        }
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("INSERT INTO community_posts (user_id, plant_id, plant_name, caption, image_url, coins_earned)
        VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$user_id, $plant_id, $plant_name, $caption, $image_url, POST_COINS_REWARD]);
    $post_id = $pdo->lastInsertId();

    $pdo->prepare("UPDATE users SET coins = coins + ? WHERE id = ?")->execute([POST_COINS_REWARD, $user_id]);

    $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'community_post')")
        ->execute([$user_id, $plant_id]);

    $pdo->commit();

    $coinsStmt = $pdo->prepare("SELECT coins FROM users WHERE id = ?");
    $coinsStmt->execute([$user_id]);
    $coins = (int)$coinsStmt->fetchColumn();

    echo json_encode([
        "status" => "success",
        "message" => "Post shared successfully",
        "post_id" => $post_id,
        "coins_earned" => POST_COINS_REWARD,
        "coins" => $coins
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("create_post error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
