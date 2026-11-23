<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../account_helper.php';
require_once __DIR__ . '/../gemini_helper.php';
require_once __DIR__ . '/../care_weather_helper.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
$plantsStmt = $pdo->prepare("SELECT p.id, p.name, p.species, p.image_url, p.placement, p.light_req, p.light_requirement,
        p.water_freq, p.last_watered, p.setup_completed_at, p.care_plan, p.status, p.status_color,
        (SELECT COUNT(*) FROM care_events ce WHERE ce.plant_id = p.id AND ce.user_id = p.user_id
            AND ce.event_type = 'water' AND ce.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS waterings_30d,
        (SELECT ps.created_at FROM plant_scans ps WHERE ps.plant_id = p.id AND ps.status IN ('issue', 'unhealthy')
            ORDER BY ps.created_at DESC LIMIT 1) AS last_issue_at,
        (SELECT ps.ai_analysis FROM plant_scans ps WHERE ps.plant_id = p.id AND ps.status IN ('issue', 'unhealthy')
            ORDER BY ps.created_at DESC LIMIT 1) AS last_issue
        ,(SELECT ce.created_at FROM care_events ce WHERE ce.plant_id = p.id AND ce.user_id = p.user_id AND ce.event_type = 'water' ORDER BY ce.created_at DESC LIMIT 1) AS last_watered_logged
    FROM plants p WHERE p.user_id = ? ORDER BY p.name");
$plantsStmt->execute([$user['id']]);
$plants = $plantsStmt->fetchAll(PDO::FETCH_ASSOC);
$indoor = $outdoor = $directSun = $due = $disease = $wateringsLogged = 0;
foreach ($plants as &$plant) {
    $plant['last_watered'] = $plant['last_watered_logged'] ?: $plant['last_watered'];
    unset($plant['last_watered_logged']);
    $plant['placement'] = in_array($plant['placement'], ['indoor', 'outdoor'], true) ? $plant['placement'] : 'unknown';
    $indoor += $plant['placement'] === 'indoor' ? 1 : 0;
    $outdoor += $plant['placement'] === 'outdoor' ? 1 : 0;
    $plant['water_freq'] = max(1, (int)$plant['water_freq']);
    $plant['waterings_30d'] = (int)$plant['waterings_30d'];
    $wateringsLogged += $plant['waterings_30d'];
    $carePlan = json_decode((string)$plant['care_plan'], true) ?: [];
    $lightText = implode(' ', array_filter([
        $plant['light_req'], $plant['light_requirement'],
        $carePlan['light']['level'] ?? '', $carePlan['light']['detail'] ?? ''
    ]));
    $avoidsDirect = preg_match('/\b(indirect|avoid direct|no direct|shade from direct)\b/i', $lightText);
    $explicitLight = strtolower(trim((string)$plant['light_req']));
    if (preg_match('/^(direct sun(?:light)?|full sun(?:light)?)$/', $explicitLight)) {
        $plant['direct_sun'] = true;
    } elseif (in_array($explicitLight, ['bright indirect', 'low light'], true)) {
        $plant['direct_sun'] = false;
    } else {
        $plant['direct_sun'] = !$avoidsDirect && (bool)preg_match('/\b(direct sun(?:light)?|full sun(?:light)?)\b/i', $lightText);
    }
    $directSun += $plant['direct_sun'] ? 1 : 0;
    $plant['last_issue_at'] = $plant['last_issue_at'] ?: null;
    $plant['last_issue'] = $plant['last_issue'] ?: null;
    $soilCheckBaseline = $plant['last_watered'] ?: $plant['setup_completed_at'];
    $due += $soilCheckBaseline && strtotime($soilCheckBaseline . ' +' . $plant['water_freq'] . ' days') <= time() ? 1 : 0;
    $disease += $plant['last_issue_at'] ? 1 : 0;
    unset($plant['care_plan']);
}
unset($plant);

$vacationStmt = $pdo->prepare("SELECT vm.enabled, vm.starts_on, vm.ends_on, vm.instructions
    FROM vacation_modes vm WHERE vm.user_id = ?");
$vacationStmt->execute([$user['id']]);
$vacation = $vacationStmt->fetch(PDO::FETCH_ASSOC) ?: ['enabled' => 0, 'starts_on' => null, 'ends_on' => null, 'instructions' => null];
$vacation['enabled'] = (bool)$vacation['enabled'];
$plan = get_active_plan($pdo, $user['id']);
$canAskAi = !empty($user['is_admin']) || !empty($plan['ai_chat']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $question = trim((string)($data['question'] ?? ''));
    if ($question === '' || mb_strlen($question) > 500) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Ask a question under 500 characters.']);
        exit;
    }
    if (!$canAskAi) {
        http_response_code(402);
        echo json_encode(['status' => 'error', 'code' => 'PLAN_REQUIRED', 'message' => 'Personal AI chat is included with Premium. Your garden overview is available here.']);
        exit;
    }
    $weatherContext = null;
    $lat = filter_var($data['weather_location']['lat'] ?? null, FILTER_VALIDATE_FLOAT);
    $lon = filter_var($data['weather_location']['lon'] ?? null, FILTER_VALIDATE_FLOAT);
    if ($lat !== false && $lon !== false && $lat !== null && $lon !== null && $lat >= -90 && $lat <= 90 && $lon >= -180 && $lon <= 180) {
        $weatherContext = pnapana_care_weather_context((float)$lat, (float)$lon);
    }
    $apiKey = pnapana_shared_gemini_key($pdo);
    $prompt = "You are Pnapana's personal plant-care manager. Answer in the language used by the user. Use only the garden data and verified Open-Meteo weather JSON supplied below for factual claims. Weather readings are observations/forecasts; recommendations are your reasoning. If weather is missing, say it is unavailable and never invent conditions. Use soil moisture and plant care history before advising watering. Give practical, concise guidance.\n\nGarden data:\n" . json_encode($plants, JSON_UNESCAPED_UNICODE) . "\n\nVerified local weather (null means unavailable):\n" . json_encode($weatherContext, JSON_UNESCAPED_UNICODE) . "\n\nQuestion: " . $question;
    $answer = gemini_text_response($prompt, $apiKey);
    if ($answer === null) {
        http_response_code(503);
        echo json_encode(['status' => 'error', 'message' => 'AI is temporarily unavailable. Check the server Gemini key and try again.']);
        exit;
    }
    echo json_encode(['status' => 'success', 'answer' => $answer]);
    exit;
}

echo json_encode([
    'status' => 'success',
    'summary' => [
        'total_plants' => count($plants), 'indoor_plants' => $indoor, 'outdoor_plants' => $outdoor,
        'direct_sun_plants' => $directSun, 'needs_watering' => $due, 'waterings_logged_30d' => $wateringsLogged,
        'plants_with_disease_history' => $disease
    ],
    'plants' => $plants, 'vacation_mode' => $vacation,
    'ai_chat_allowed' => $canAskAi
]);
?>
