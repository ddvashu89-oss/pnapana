<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once '../db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->plant_id) || !isset($data->image_url)) {
    echo json_encode(["status" => "error", "message" => "Plant ID and image are required."]);
    exit;
}

$plant_id = $data->plant_id;
$image_url = $data->image_url;

// To use real AI, place your Gemini API key here:
$GEMINI_API_KEY = ""; // e.g. "AIzaSy..."

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
    
    $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . $GEMINI_API_KEY);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
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
