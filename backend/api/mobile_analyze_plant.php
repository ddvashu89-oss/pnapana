<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['POST']);
$user = mobile_user($pdo);
require_once __DIR__ . '/../kindwise_helper.php';
require_once __DIR__ . '/../gemini_helper.php';
require_once __DIR__ . '/../ai_client.php';
require_once __DIR__ . '/../growth_schema.php';
require_once __DIR__ . '/feature_upload.php';
pnapana_ensure_growth_schema($pdo);
$data = mobile_body(); $plantId = (int)($data['plant_id'] ?? 0); $image = $data['image_url'] ?? '';
if (!is_string($image) || strlen($image) > 8 * 1024 * 1024 || kindwise_image_payload($image) === null) mobile_fail('A valid plant photo under 5 MB is required.');
$stmt = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?'); $stmt->execute([$plantId, $user['id']]);
if (!$stmt->fetchColumn()) mobile_fail('This plant does not belong to your garden.', 403);
if (empty($user['is_admin']) && !get_active_plan($pdo, $user['id'])['ai_diagnosis']) mobile_fail('Your plan does not include health diagnosis.', 402, 'PLAN_REQUIRED');
if (!mobile_settings($pdo)['ai_scanning_enabled']) mobile_fail('Plant scanning is currently paused.', 503);
$assessment = null; $provider = null; $modelVersion = null; $confidence = null; $uncertain = false; $fullResult = null;
$localAi = pnapana_ai_request('/api/v1/disease-detect', $image);
if (!empty($localAi['ok'])) {
    $fullResult = $localAi['data'];
    $recommendations = is_array($fullResult['recommendations'] ?? null) ? implode(' ', array_filter($fullResult['recommendations'], 'is_string')) : '';
    $assessment = [
        'status' => ($fullResult['health_status'] ?? '') === 'healthy' ? 'healthy' : (($fullResult['health_status'] ?? '') === 'uncertain' ? 'uncertain' : 'issue'),
        'analysis' => trim((string)($fullResult['disease'] ?? 'Uncertain plant health result') . '. ' . $recommendations)
    ];
    $provider = 'pnapana-tensorflow';
    $modelVersion = $fullResult['model_version'] ?? null;
    $confidence = isset($fullResult['confidence']) ? (float)$fullResult['confidence'] : null;
    $uncertain = !empty($fullResult['uncertain']);
}
$response = $assessment === null ? kindwise_health_assessment($image) : ['ok' => false];
if ($assessment === null && !empty($response['ok'])) {
    $summary = kindwise_health_summary($response['data']);
    $assessment = ['status' => $summary['status'], 'analysis' => trim($summary['diagnosis'] . '. ' . $summary['analysis'])];
    $provider = 'kindwise';
} elseif ($assessment === null) {
    $key = mobile_shared_gemini_key();
    if ($key) {
        $result = gemini_vision_json_call($image, 'Assess this plant photo. Return only JSON: is_plant (boolean), is_healthy (boolean), diagnosis (string), treatment (string). Never invent observations if the photo is unclear.', $key);
        if (is_array($result) && isset($result['diagnosis'])) {
            if (isset($result['is_plant']) && !$result['is_plant']) mobile_fail('This photo does not clearly show a plant.', 422);
            $assessment = ['status' => !empty($result['is_healthy']) ? 'healthy' : 'issue', 'analysis' => trim($result['diagnosis'] . '. ' . ($result['treatment'] ?? ''))];
            $provider = 'gemini';
        }
    }
}
if (!$assessment) mobile_fail('Plant diagnosis is unavailable. Please check the configured Kindwise or Gemini service.', 503);
$recoveryImage = null;
if ($assessment['status'] === 'issue') {
    try { $recoveryImage = pnapana_save_feature_data_url($image); } catch (Throwable $e) { error_log('mobile recovery image error: ' . $e->getMessage()); }
}
$pdo->beginTransaction();
try {
    $pdo->prepare('INSERT INTO plant_scans (plant_id, image_url, ai_analysis, status) VALUES (?, ?, ?, ?)')->execute([$plantId, $image, $assessment['analysis'], $assessment['status']]);
    $scanId = $pdo->lastInsertId();
    $pdo->prepare('UPDATE plants SET status = ?, status_color = ? WHERE id = ? AND user_id = ?')->execute([$assessment['status'] === 'healthy' ? 'Thriving' : ($assessment['status'] === 'uncertain' ? 'Check Again' : 'Needs Attention'), $assessment['status'] === 'healthy' ? 'green' : 'orange', $plantId, $user['id']]);
    $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'ai_scan')")->execute([$user['id'], $plantId]);
    $cost = $provider === 'kindwise' ? (float)(getenv('KINDWISE_COST_PER_SCAN_USD') ?: 0) : ($provider === 'gemini' ? (float)(getenv('GEMINI_COST_PER_SCAN_USD') ?: 0) : 0);
    $pdo->prepare("INSERT INTO ai_usage_events (user_id, operation, provider, success, confidence, estimated_cost_usd) VALUES (?, 'diagnose', ?, 1, ?, ?)")->execute([$user['id'], $provider ?: 'unknown', $confidence, $cost]);
    $pdo->prepare("INSERT INTO analytics_events (user_id, event_name, metadata) VALUES (?, 'diagnosis_succeeded', ?)")->execute([$user['id'], json_encode(['plant_id' => $plantId, 'provider' => $provider])]);
    if ($assessment['status'] === 'issue') {
        $open = $pdo->prepare("SELECT id FROM disease_cases WHERE user_id=? AND plant_id=? AND status IN ('monitoring','improving') LIMIT 1");
        $open->execute([$user['id'], $plantId]);
        if (!$open->fetchColumn()) $pdo->prepare("INSERT INTO disease_cases (user_id, plant_id, diagnosis, treatment, initial_image_url, follow_up_due_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 DAY))")->execute([$user['id'], $plantId, mb_substr($assessment['analysis'], 0, 255), $assessment['analysis'], $recoveryImage]);
    }
    $pdo->commit();
} catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
$historyResult = $fullResult ?: ['status' => $assessment['status'], 'analysis' => $assessment['analysis']];
$historyId = mobile_record_ai_scan($pdo, $user['id'], $plantId, 'plant_health', $provider ?: 'unknown', $image, $historyResult, $confidence, $uncertain, $modelVersion);
echo json_encode(['status' => 'success', 'scan' => ['id' => $scanId, 'status' => $assessment['status'], 'analysis' => $assessment['analysis'], 'created_at' => date('Y-m-d H:i:s')], 'provider' => $provider, 'model_version' => $modelVersion, 'confidence' => $confidence, 'uncertain' => $uncertain, 'scan_history_id' => $historyId, 'follow_up_scheduled' => $assessment['status'] === 'issue']);
