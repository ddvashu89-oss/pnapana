<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json');
require_once '../db.php';
require_once __DIR__ . '/../growth_schema.php';
require_once 'auth.php';

$user = authenticate($pdo);
$user_id = $user['id'];
pnapana_ensure_growth_schema($pdo);

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

    $profileStmt = $pdo->prepare("SELECT c.plant_id, p.name, c.next_repot_on, c.next_fertilizer_on FROM plant_care_profiles c JOIN plants p ON p.id=c.plant_id WHERE c.user_id=? AND (c.next_repot_on <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) OR c.next_fertilizer_on <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))");
    $profileStmt->execute([$user_id]);
    foreach ($profileStmt->fetchAll(PDO::FETCH_ASSOC) as $profile) {
        if (!empty($profile['next_repot_on']) && $profile['next_repot_on'] <= date('Y-m-d', strtotime('+7 days'))) $careReminders[] = ['plant_id' => (int)$profile['plant_id'], 'name' => $profile['name'], 'type' => 'repotting', 'title' => 'Repotting check', 'message' => 'Review pot size, roots, and drainage before repotting.', 'due_on' => $profile['next_repot_on'], 'notification_mode' => 'in-app'];
        if (!empty($profile['next_fertilizer_on']) && $profile['next_fertilizer_on'] <= date('Y-m-d', strtotime('+7 days'))) $careReminders[] = ['plant_id' => (int)$profile['plant_id'], 'name' => $profile['name'], 'type' => 'fertilizer', 'title' => 'Fertilizer check', 'message' => 'Review the plant and season before applying fertilizer.', 'due_on' => $profile['next_fertilizer_on'], 'notification_mode' => 'in-app'];
    }

    $recoveryStmt = $pdo->prepare("SELECT d.id, d.plant_id, p.name, d.diagnosis, d.follow_up_due_at FROM disease_cases d JOIN plants p ON p.id=d.plant_id WHERE d.user_id=? AND d.status IN ('monitoring','improving') AND d.follow_up_due_at <= DATE_ADD(NOW(), INTERVAL 1 DAY)");
    $recoveryStmt->execute([$user_id]);
    foreach ($recoveryStmt->fetchAll(PDO::FETCH_ASSOC) as $case) $careReminders[] = ['plant_id' => (int)$case['plant_id'], 'case_id' => (int)$case['id'], 'name' => $case['name'], 'type' => 'disease_followup', 'title' => 'Recovery photo due', 'message' => 'Upload a new photo to check progress after treatment for ' . $case['diagnosis'] . '.', 'due_at' => $case['follow_up_due_at'], 'notification_mode' => 'in-app'];

    $caregiverStmt = $pdo->prepare("SELECT t.id AS task_id, t.plant_id, p.name, t.task_type, t.instructions, t.due_on FROM caregiver_tasks t JOIN caregiver_invites i ON i.id=t.invite_id JOIN plants p ON p.id=t.plant_id WHERE i.caregiver_user_id=? AND i.status='accepted' AND t.completed_at IS NULL AND t.due_on <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)");
    $caregiverStmt->execute([$user_id]);
    foreach ($caregiverStmt->fetchAll(PDO::FETCH_ASSOC) as $task) $careReminders[] = ['plant_id' => (int)$task['plant_id'], 'task_id' => (int)$task['task_id'], 'name' => $task['name'], 'type' => 'caregiver_' . $task['task_type'], 'title' => 'Assigned care task', 'message' => $task['instructions'] ?: ucfirst(str_replace('_', ' ', $task['task_type'])) . ' for this plant.', 'due_on' => $task['due_on'], 'notification_mode' => 'in-app'];
    
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
