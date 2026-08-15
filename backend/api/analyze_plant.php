<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

require_once '../db.php';
require_once '../config.php';
require_once 'auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$user = authenticate($pdo);

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->plant_id) || !isset($data->image_url)) {
    echo json_encode(["status" => "error", "message" => "Plant ID and image are required."]);
    exit;
}

$plant_id = $data->plant_id;
$image_url = $data->image_url;

// Only the plant's owner can submit a scan for it — otherwise anyone with a
// plant_id could write fake scans into another user's history and burn the
// site's paid Gemini API quota on arbitrary attacker-supplied images.
$ownerCheckStmt = $pdo->prepare("SELECT user_id FROM plants WHERE id = ?");
$ownerCheckStmt->execute([$plant_id]);
$ownerId = $ownerCheckStmt->fetchColumn();

if (!$ownerId || (int)$ownerId !== (int)$user['id']) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "You don't have permission to scan this plant."]);
    exit;
}

$GEMINI_API_KEY = GEMINI_API_KEY;

$ai_status = 'healthy';
$ai_analysis = '';

if (!empty($GEMINI_API_KEY)) {
    // Strip data:image/jpeg;base64, prefix to get raw base64
    $base64_data = preg_replace('/^data:image\/\w+;base64,/', '', $image_url);
    
    $prompt = "You are an expert botanist and plant care AI. Analyze this plant photo. Answer in exactly two parts separated by a pipe character '|'. Part 1: Status (must be exactly 'healthy' or 'issue'). Part 2: A short 2-3 sentence analysis of what you see and what the user should do.";

    $payload = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $prompt],
                    [
                        "inline_data" => [
                            "mime_type" => "image/jpeg",
                            "data" => $base64_data
                        ]
                    ]
                ]
            ]
        ]
    ];

    $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/' . GEMINI_MODEL . ':generateContent?key=' . $GEMINI_API_KEY);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 45);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $res_data = json_decode($response, true);
    if (isset($res_data['candidates'][0]['content']['parts'][0]['text'])) {
        $text = trim($res_data['candidates'][0]['content']['parts'][0]['text']);
        $parts = explode('|', $text);
        if (count($parts) >= 2) {
            $ai_status = strtolower(trim($parts[0]));
            if ($ai_status !== 'healthy' && $ai_status !== 'issue') $ai_status = 'issue';
            $ai_analysis = trim($parts[1]);
        } else {
            $ai_analysis = $text;
            $ai_status = 'issue'; // default to issue if parsing fails somewhat
        }
    } else {
        $ai_analysis = "Failed to parse AI response. Check API Key.";
        $ai_status = 'issue';
    }
} else {
    // Simulated AI Processing time (Fallback if no API key provided)
    sleep(2);
    
    $rand = rand(1, 100);
    if ($rand <= 70) {
        $ai_status = 'healthy';
        $ai_analysis = "All good! Your plant is thriving and looks perfectly healthy. Keep up the great work! (Simulated)";
    } else {
        $ai_status = 'issue';
        $issues = [
            "The leaves look a bit dry at the tips. Consider increasing humidity around the plant. (Simulated)",
            "Slight drooping detected. It might be thirsty or need a bit more indirect sunlight. (Simulated)",
            "Some yellowing observed on the lower leaves. Ensure the soil is draining properly and you aren't overwatering. (Simulated)"
        ];
        $ai_analysis = $issues[array_rand($issues)];
    }
}

try {
    $stmt = $pdo->prepare("INSERT INTO plant_scans (plant_id, image_url, ai_analysis, status) VALUES (?, ?, ?, ?)");
    $stmt->execute([$plant_id, $image_url, $ai_analysis, $ai_status]);
    $scan_id = $pdo->lastInsertId();

    // Optionally update the plant's overall status based on the scan
    $plant_status_text = ($ai_status === 'healthy') ? 'Thriving' : 'Needs Attention';
    $plant_color = ($ai_status === 'healthy') ? 'green' : 'orange';
    
    $updateStmt = $pdo->prepare("UPDATE plants SET status = ?, status_color = ? WHERE id = ?");
    $updateStmt->execute([$plant_status_text, $plant_color, $plant_id]);

    $ownerStmt = $pdo->prepare("SELECT user_id FROM plants WHERE id = ?");
    $ownerStmt->execute([$plant_id]);
    $owner = $ownerStmt->fetchColumn();
    if ($owner) {
        $eventStmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'ai_scan')");
        $eventStmt->execute([$owner, $plant_id]);
    }

    echo json_encode([
        "status" => "success",
        "scan" => [
            "id" => $scan_id,
            "status" => $ai_status,
            "analysis" => $ai_analysis,
            "created_at" => date('Y-m-d H:i:s')
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
