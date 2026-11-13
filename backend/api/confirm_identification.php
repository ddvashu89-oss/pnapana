<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../db.php';
if (file_exists(__DIR__ . '/../config.php')) require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../gemini_helper.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/../rate_limiter.php';
require_once __DIR__ . '/auth.php';

$user = authenticate($pdo);
pnapana_ensure_growth_schema($pdo);
check_rate_limit('confirm_plant_identification', 40, 3600);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$scanId = strtolower(trim((string)($data['scan_id'] ?? '')));
$species = trim((string)($data['species'] ?? ''));
$commonName = trim((string)($data['common_name'] ?? $species));
$customCorrection = !empty($data['custom_correction']);
if (!preg_match('/^[a-f0-9]{32}$/', $scanId) || $species === '' || mb_strlen($species) > 180 || mb_strlen($commonName) > 180) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Choose or enter the plant you want to confirm.']);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM plant_identification_events WHERE id=? AND user_id=? AND confirmed_at IS NULL');
$stmt->execute([$scanId, $user['id']]);
$scan = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$scan) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'This identification has expired or was already confirmed.']);
    exit;
}

function confirmation_normalize(string $value): string {
    return preg_replace('/[^a-z0-9]+/', ' ', strtolower(trim($value))) ?: '';
}

$knownCandidates = json_decode((string)$scan['kindwise_candidates'], true) ?: [];
if (!empty($scan['gemini_species'])) $knownCandidates[] = ['species' => $scan['gemini_species'], 'common_name' => $scan['gemini_species'], 'probability' => $scan['gemini_confidence']];
$selectedProbability = null;
$knownSelection = false;
foreach ($knownCandidates as $candidate) {
    if (confirmation_normalize((string)($candidate['species'] ?? '')) !== confirmation_normalize($species)) continue;
    $knownSelection = true;
    $selectedProbability = is_numeric($candidate['probability'] ?? null) ? max(0, min(1, (float)$candidate['probability'])) : null;
    if ($commonName === $species && !empty($candidate['common_name'])) $commonName = (string)$candidate['common_name'];
    break;
}
if (!$knownSelection && !$customCorrection) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Select a suggestion or mark your entry as a correction.']);
    exit;
}

$prompt = "The customer explicitly confirmed '{$species}' (common name '{$commonName}'). Do not change the species. "
    . 'Return only JSON: {"description":string,"care_plan":{"native_region":string,"light":{"level":"High"|"Medium"|"Low","detail":string},'
    . '"water":{"frequency_days":number,"instructions":string},"humidity":{"level":"High"|"Medium"|"Low","detail":string},'
    . '"soil":string,"temperature":string,"fertilizing":string,"pruning":string,"toxicity":{"pet_friendly":boolean,"detail":string},'
    . '"common_issues":[{"issue":string,"solution":string}]}}. Make guidance conservative and tell the customer to check soil moisture.';
$key = pnapana_shared_gemini_key($pdo);
$result = $key !== '' ? gemini_text_json_call($prompt, $key) : null;
if (!is_array($result) || !is_array($result['care_plan'] ?? null)) {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'Your choice is safe, but the care plan could not be generated. Please retry.']);
    exit;
}

$recommended = (string)($scan['kindwise_top_species'] ?: $scan['gemini_species']);
$corrected = confirmation_normalize($recommended) !== confirmation_normalize($species);
$pdo->beginTransaction();
try {
    $pdo->prepare('UPDATE plant_identification_events SET selected_species=?,selected_common_name=?,selected_probability=?,corrected=?,confirmed_at=NOW() WHERE id=? AND user_id=? AND confirmed_at IS NULL')
        ->execute([$species, $commonName ?: $species, $selectedProbability, $corrected ? 1 : 0, $scanId, $user['id']]);
    $eventName = $corrected ? 'plant_identification_corrected' : 'plant_identification_confirmed';
    $pdo->prepare('INSERT INTO analytics_events (user_id,event_name,metadata) VALUES (?,?,?)')
        ->execute([$user['id'], $eventName, json_encode(['scan_id' => $scanId, 'recommended' => $recommended, 'selected' => $species, 'custom' => $customCorrection])]);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}

echo json_encode(['status' => 'success', 'identification' => ['species' => $species, 'common_name' => $commonName ?: $species,
    'confidence_score' => $selectedProbability, 'description' => (string)($result['description'] ?? '')],
    'care_plan' => $result['care_plan'], 'correction_recorded' => $corrected]);
