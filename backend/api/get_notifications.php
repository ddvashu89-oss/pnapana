<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');
require_once '../db.php';
require_once 'auth.php';

$user = authenticate($pdo);
$user_id = $user['id'];

try {
    // Find plants where last_watered + water_freq days is in the past
    // water_freq is in days
    $stmt = $pdo->prepare("SELECT id, name, species, image_url, last_watered, water_freq FROM plants WHERE user_id = ? AND setup_completed = 1 AND DATE_ADD(last_watered, INTERVAL water_freq DAY) <= CURRENT_TIMESTAMP");
    $stmt->execute([$user_id]);
    $thirsty_plants = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $routineStmt = $pdo->prepare("SELECT id, name, setup_completed_at, setup_data FROM plants WHERE user_id = ? AND setup_completed = 1 AND setup_data IS NOT NULL");
    $routineStmt->execute([$user_id]);
    $careReminders = [];
    $today = new DateTimeImmutable('today');
    $nowTime = date('H:i');
    $definitions = [
        'fertilizer_weeks' => ['Fertilizer check', 'Review the species care plan and fertilize only if the plant is actively growing.', 7],
        'rotation_days' => ['Rotate plant', 'Rotate the pot for more even light and balanced growth.', 1],
        'light_review_days' => ['Review light', 'Check whether this plant is still receiving the light selected during setup.', 1],
        'leaf_cleaning_days' => ['Clean leaves', 'Gently clean dusty leaves so the plant can use light effectively.', 1],
        'health_check_days' => ['Plant health check', 'Inspect the leaves, stems and soil for early signs of stress or pests.', 1],
    ];
    foreach ($routineStmt->fetchAll(PDO::FETCH_ASSOC) as $plant) {
        $setup = json_decode((string)$plant['setup_data'], true);
        if (!is_array($setup) || empty($plant['setup_completed_at']) || $nowTime < ($setup['reminder_time'] ?? '09:00')) continue;
        $started = new DateTimeImmutable(substr($plant['setup_completed_at'], 0, 10));
        $elapsedDays = (int)$started->diff($today)->format('%r%a');
        if ($elapsedDays < 1) continue;
        foreach ($definitions as $key => [$title, $message, $multiplier]) {
            $interval = (int)($setup[$key] ?? 0) * $multiplier;
            if ($interval > 0 && $elapsedDays % $interval === 0) {
                $careReminders[] = [
                    'plant_id' => (int)$plant['id'],
                    'name' => $plant['name'],
                    'type' => $key,
                    'title' => $title,
                    'message' => $message,
                    'notification_mode' => $setup['notification_mode'] ?? 'in-app',
                ];
            }
        }
    }
    
    echo json_encode([
        "status" => "success", 
        "notifications" => $thirsty_plants,
        "care_reminders" => $careReminders
    ]);
} catch(PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("get_notifications error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
