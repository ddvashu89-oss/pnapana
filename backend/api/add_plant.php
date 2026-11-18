<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');

require_once '../db.php';
require_once '../account_helper.php';
require_once '../plant_setup_helper.php';
require_once '../gemini_helper.php';
require_once '../care_weather_helper.php';
require_once '../activity_logger.php';
require_once '../botanical_catalog.php';
require_once 'auth.php';

// Authenticate user using token
$user = authenticate($pdo);
$user_id = $user['id'];

// Get POST body
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['name']) || !isset($data['species'])) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit();
}

try {
    $setup = pnapana_normalize_plant_setup($data['setup'] ?? null);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(["status" => "error", "code" => "SETUP_REQUIRED", "message" => $e->getMessage()]);
    exit();
}

// Enforce the plant allowance of the user's current plan. max_plants NULL
// means unlimited, which is what the paid tier grants.
$plan = get_active_plan($pdo, $user_id);
$maxPlants = ($plan && array_key_exists('max_plants', $plan)) ? $plan['max_plants'] : 5;
if ($maxPlants !== null) {
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM plants WHERE user_id = ?");
    $countStmt->execute([$user_id]);
    $currentCount = (int)$countStmt->fetchColumn();
    if ($currentCount >= (int)$maxPlants) {
        http_response_code(402);
        echo json_encode([
            "status" => "error",
            "code" => "PLAN_LIMIT_REACHED",
            "message" => "Your " . ($plan['name'] ?? 'Free') . " plan covers " . $maxPlants
                . " plants. Upgrade to Premium to add more.",
            "limit" => (int)$maxPlants,
            "current_count" => $currentCount
        ]);
        exit();
    }
}

$name = $data['name'];
$species = $data['species'];
$image_url = isset($data['image_url']) && !empty($data['image_url']) ? $data['image_url'] : 'https://images.unsplash.com/photo-1485955900006-10f4d324d411';
$water_freq = $setup['soil_check_days'];
$light_req = $setup['light'];

$location = is_array($data['weather_location'] ?? null) ? $data['weather_location'] : [];
$latitude = filter_var($location['lat'] ?? null, FILTER_VALIDATE_FLOAT);
$longitude = filter_var($location['lon'] ?? null, FILTER_VALIDATE_FLOAT);
$weather = null;
$weatherAvailable = false;
$city = mb_substr(trim((string)($location['city'] ?? 'your area')), 0, 100);
if ($latitude !== false && $longitude !== false && $latitude !== null && $longitude !== null) {
    $weather = pnapana_care_weather_context((float)$latitude, (float)$longitude);
    $weatherAvailable = is_array($weather);
}
$weatherInstruction = $weatherAvailable
    ? 'Current weather near ' . $city . ': ' . json_encode($weather) . '. Adjust today\'s guidance to these conditions.'
    : 'Current weather is temporarily unavailable or the customer did not share a location. Create a safe species-specific baseline plan from the confirmed plant and setup. State in weather_note that weather adjustments will appear when local weather becomes available.';
$drainage = $setup['has_drainage'] === null ? 'unknown' : ($setup['has_drainage'] ? 'yes' : 'no');
$prompt = "Create a careful, specific plant care plan. The plant was identified from photos as '{$species}'. Known setup: placement {$setup['placement']}, area {$setup['room']}, available light {$setup['light']}, pot {$setup['pot_size']}, drainage {$drainage}, soil {$setup['soil_condition']}, current moisture {$setup['moisture_level']}, last watered {$setup['last_watered']}. Treat 'not sure', 'unknown', and 'Not specified' as missing information; never claim the customer confirmed those conditions. Recommend a suitable placement and light exposure as advice, not as an observed fact. {$weatherInstruction} Never tell them to water by calendar alone; require a soil check. Return only JSON: {\"description\":string,\"care_plan\":{\"native_region\":string,\"light\":{\"level\":\"High\"|\"Medium\"|\"Low\",\"detail\":string},\"water\":{\"frequency_days\":number,\"instructions\":string},\"humidity\":{\"level\":\"High\"|\"Medium\"|\"Low\",\"detail\":string},\"soil\":string,\"temperature\":string,\"fertilizing\":string,\"pruning\":string,\"toxicity\":{\"pet_friendly\":boolean,\"detail\":string},\"common_issues\":[{\"issue\":string,\"solution\":string}],\"weather_note\":string}}.";
$started = microtime(true);
$geminiKey = pnapana_shared_gemini_key($pdo);
$generated = $geminiKey !== '' ? gemini_text_json_call($prompt, $geminiKey) : null;
$providerSucceeded = is_array($generated) && is_array($generated['care_plan'] ?? null);
$catalogPlan = null;
$normalizeName = static fn($name) => preg_replace('/[^a-z0-9]+/', ' ', strtolower(trim((string)$name)));
foreach (get_botanical_catalog('en') as $catalogPlant) {
    $names = array_merge([$catalogPlant['species'] ?? '', $catalogPlant['common_name'] ?? ''], $catalogPlant['aliases'] ?? []);
    if (in_array($normalizeName($species), array_map($normalizeName, $names), true)) {
        $catalogPlan = $catalogPlant['care_plan'] ?? null;
        break;
    }
}
if ((!is_array($generated) || !is_array($generated['care_plan'] ?? null)) && is_array($catalogPlan)) {
    $generated = ['care_plan' => $catalogPlan, 'description' => ''];
}
$duration = (int)round((microtime(true) - $started) * 1000);
pnapana_log_api_request($pdo, (int)$user_id, 'gemini', $weatherAvailable ? 'weather_aware_care_plan' : 'baseline_care_plan', null, $duration, $providerSucceeded, $providerSucceeded ? null : ($geminiKey === '' ? 'not_configured' : 'provider_error'), ['weather_available' => $weatherAvailable, 'catalog_fallback' => !$providerSucceeded && is_array($catalogPlan)]);
if (!is_array($generated) || !is_array($generated['care_plan'] ?? null)) {
    pnapana_write_application_log($pdo, 'error', 'care_plan_generation_failed', 'Plant care plan could not be generated.', (int)$user_id, ['weather_available' => $weatherAvailable], 503);
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'Your plant is confirmed, but its weather-aware care plan could not be created. Please try again shortly.', 'reference_id' => pnapana_log_request_id()]);
    exit;
}
$plan = $generated['care_plan'];
$native_region = $plan['native_region'] ?? null;
$light_requirement = $plan['light']['detail'] ?? null;
$water_requirement = $plan['water']['instructions'] ?? null;
$humidity = $plan['humidity']['level'] ?? null;
$pet_friendly = !empty($plan['toxicity']['pet_friendly']) ? 1 : 0;
$care_plan = json_encode($plan);
$water_freq = isset($plan['water']['frequency_days']) && is_numeric($plan['water']['frequency_days']) ? max(1, min(30, (int)$plan['water']['frequency_days'])) : $water_freq;
$light_req = $plan['light']['level'] ?? $light_req;
$purchased_on = isset($data['purchased_on']) && $data['purchased_on'] !== '' ? $data['purchased_on'] : null;
$placement = $setup['placement'];
$parsedPurchaseDate = $purchased_on === null ? null : DateTime::createFromFormat('!Y-m-d', $purchased_on);
if ($purchased_on !== null && (!$parsedPurchaseDate || $parsedPurchaseDate->format('Y-m-d') !== $purchased_on || $purchased_on > date('Y-m-d'))) {
    echo json_encode(["status" => "error", "message" => "Choose a valid purchase date."]);
    exit();
}
if ($care_plan === false) {
    $care_plan = null;
}

try {
    $stmt = $pdo->prepare("INSERT INTO plants (user_id, name, species, image_url, water_freq, light_req,
        native_region, light_requirement, water_requirement, humidity, pet_friendly, care_plan, purchased_on, placement,
        setup_completed, setup_completed_at, setup_data, last_watered)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?, ?)");
    $lastWatered = pnapana_setup_last_watered_at($setup['last_watered']);
    $stmt->execute([$user_id, $name, $species, $image_url, $water_freq, $light_req,
        $native_region, $light_requirement, $water_requirement, $humidity, $pet_friendly, $care_plan, $purchased_on, $placement,
        json_encode($setup), $lastWatered]);

    $plant_id = $pdo->lastInsertId();
    $eventStmt = $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'add_plant')");
    $eventStmt->execute([$user_id, $plant_id]);
    pnapana_log_user_activity($pdo, (int)$user_id, $weatherAvailable ? 'weather_aware_care_plan_created' : 'baseline_care_plan_created', ['plant_id' => (int)$plant_id, 'weather_city' => $city]);

    echo json_encode([
        "status" => "success", 
        "message" => "Plant added successfully",
        "plant_id" => $plant_id,
        "weather_available" => $weatherAvailable
    ]);
} catch(PDOException $e) {
    // Log the detail for the operator; never expose schema internals to the client.
    error_log("add_plant error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Something went wrong. Please try again."]);
}
?>
