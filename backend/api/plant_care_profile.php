<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';
$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') check_rate_limit('care_profile_write', 30, 3600);

function pnapana_season_for_month(int $month): array {
    if ($month >= 6 && $month <= 9) return ['key' => 'monsoon', 'label' => 'Monsoon', 'water_factor' => 0.75, 'message' => 'Humidity is usually higher. Check soil before watering, improve airflow, and watch for fungal spots.'];
    if ($month >= 11 || $month <= 2) return ['key' => 'winter', 'label' => 'Winter', 'water_factor' => 0.7, 'message' => 'Growth is often slower. Water less frequently, maximise gentle light, and pause heavy feeding.'];
    return ['key' => 'summer', 'label' => 'Summer', 'water_factor' => 1.2, 'message' => 'Soil may dry faster. Check moisture more often, protect leaves from harsh afternoon sun, and monitor humidity.'];
}
try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $plantId = max(0, (int)($_GET['plant_id'] ?? 0));
        $params = [$user['id']];
        $where = 'p.user_id = ?';
        if ($plantId) { $where .= ' AND p.id = ?'; $params[] = $plantId; }
        $stmt = $pdo->prepare("SELECT p.id AS plant_id, p.name AS plant_name, p.species, p.water_freq, p.placement, c.* FROM plants p LEFT JOIN plant_care_profiles c ON c.plant_id = p.id WHERE $where ORDER BY p.name");
        $stmt->execute($params);
        $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $season = pnapana_season_for_month((int)date('n'));
        foreach ($profiles as &$profile) {
            $base = max(1, (int)($profile['water_freq'] ?? 7));
            $profile['seasonal_soil_check_days'] = max(1, (int)round($base / $season['water_factor']));
        }
        echo json_encode(['status' => 'success', 'profiles' => $profiles, 'season' => $season]); exit;
    }

    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $plantId = (int)($data['plant_id'] ?? 0);
    $check = $pdo->prepare('SELECT 1 FROM plants WHERE id = ? AND user_id = ?');
    $check->execute([$plantId, $user['id']]);
    if (!$check->fetchColumn()) throw new InvalidArgumentException('Choose one of your plants.');
    $soil = trim((string)($data['soil_type'] ?? ''));
    $potSize = !isset($data['pot_size_cm']) || $data['pot_size_cm'] === '' ? null : (float)$data['pot_size_cm'];
    $potMaterial = trim((string)($data['pot_material'] ?? ''));
    $hasDrainage = !empty($data['has_drainage']) ? 1 : 0;
    $repotMonths = max(1, min(60, (int)($data['repot_interval_months'] ?? 12)));
    $lastRepot = trim((string)($data['last_repotted_on'] ?? '')) ?: null;
    $fertilizer = trim((string)($data['fertilizer_name'] ?? ''));
    $fertDays = max(7, min(365, (int)($data['fertilizer_interval_days'] ?? 30)));
    $lastFertilized = trim((string)($data['last_fertilized_on'] ?? '')) ?: null;
    if (mb_strlen($soil) > 120 || mb_strlen($potMaterial) > 40 || mb_strlen($fertilizer) > 120) throw new InvalidArgumentException('One of the care details is too long.');
    if ($potSize !== null && ($potSize < 1 || $potSize > 500)) throw new InvalidArgumentException('Enter a valid pot size in centimetres.');
    foreach ([$lastRepot, $lastFertilized] as $date) if ($date && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) throw new InvalidArgumentException('Use a valid date.');
    $nextRepot = $lastRepot ? date('Y-m-d', strtotime($lastRepot . " +$repotMonths months")) : null;
    $nextFertilizer = $lastFertilized ? date('Y-m-d', strtotime($lastFertilized . " +$fertDays days")) : null;
    $stmt = $pdo->prepare('INSERT INTO plant_care_profiles (plant_id, user_id, soil_type, pot_size_cm, pot_material, has_drainage, last_repotted_on, repot_interval_months, next_repot_on, fertilizer_name, fertilizer_interval_days, last_fertilized_on, next_fertilizer_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE soil_type=VALUES(soil_type), pot_size_cm=VALUES(pot_size_cm), pot_material=VALUES(pot_material), has_drainage=VALUES(has_drainage), last_repotted_on=VALUES(last_repotted_on), repot_interval_months=VALUES(repot_interval_months), next_repot_on=VALUES(next_repot_on), fertilizer_name=VALUES(fertilizer_name), fertilizer_interval_days=VALUES(fertilizer_interval_days), last_fertilized_on=VALUES(last_fertilized_on), next_fertilizer_on=VALUES(next_fertilizer_on)');
    $stmt->execute([$plantId, $user['id'], $soil ?: null, $potSize, $potMaterial ?: null, $hasDrainage, $lastRepot, $repotMonths, $nextRepot, $fertilizer ?: null, $fertDays, $lastFertilized, $nextFertilizer]);
    $pdo->prepare("INSERT INTO analytics_events (user_id, event_name, metadata) VALUES (?, 'care_profile_updated', ?)")->execute([$user['id'], json_encode(['plant_id' => $plantId])]);
    echo json_encode(['status' => 'success', 'message' => 'Plant care details saved.']);
} catch (InvalidArgumentException $e) {
    http_response_code(422); echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('plant_care_profile error: ' . $e->getMessage());
    http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Care details are temporarily unavailable.']);
}
