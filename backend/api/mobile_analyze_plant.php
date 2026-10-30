<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['POST']);
$user = mobile_user($pdo);
require_once __DIR__ . '/../kindwise_helper.php';
require_once __DIR__ . '/../gemini_helper.php';
$data = mobile_body(); $plantId = (int)($data['plant_id'] ?? 0); $image = $data['image_url'] ?? '';
if (!is_string($image) || strlen($image) > 8 * 1024 * 1024 || kindwise_image_payload($image) === null) mobile_fail('A valid plant photo under 5 MB is required.');
$stmt = $pdo->prepare('SELECT id FROM plants WHERE id = ? AND user_id = ?'); $stmt->execute([$plantId, $user['id']]);
if (!$stmt->fetchColumn()) mobile_fail('This plant does not belong to your garden.', 403);
if (empty($user['is_admin']) && !get_active_plan($pdo, $user['id'])['ai_diagnosis']) mobile_fail('Your plan does not include health diagnosis.', 402, 'PLAN_REQUIRED');
if (!mobile_settings($pdo)['ai_scanning_enabled']) mobile_fail('Plant scanning is currently paused.', 503);
$response = kindwise_health_assessment($image); $assessment = null;
if (!empty($response['ok'])) {
    $summary = kindwise_health_summary($response['data']);
    $assessment = ['status' => $summary['status'], 'analysis' => trim($summary['diagnosis'] . '. ' . $summary['analysis'])];
} else {
    $key = $user['gemini_api_key'] ?: (defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '');
    if ($key) {
        $result = gemini_vision_json_call($image, 'Assess this plant photo. Return only JSON: is_plant (boolean), is_healthy (boolean), diagnosis (string), treatment (string). Never invent observations if the photo is unclear.', $key);
        if (is_array($result) && isset($result['diagnosis'])) {
            if (isset($result['is_plant']) && !$result['is_plant']) mobile_fail('This photo does not clearly show a plant.', 422);
            $assessment = ['status' => !empty($result['is_healthy']) ? 'healthy' : 'issue', 'analysis' => trim($result['diagnosis'] . '. ' . ($result['treatment'] ?? ''))];
        }
    }
}
if (!$assessment) mobile_fail('Plant diagnosis is unavailable. Please check the configured Kindwise or Gemini service.', 503);
$pdo->beginTransaction();
try {
    $pdo->prepare('INSERT INTO plant_scans (plant_id, image_url, ai_analysis, status) VALUES (?, ?, ?, ?)')->execute([$plantId, $image, $assessment['analysis'], $assessment['status']]);
    $scanId = $pdo->lastInsertId();
    $pdo->prepare('UPDATE plants SET status = ?, status_color = ? WHERE id = ? AND user_id = ?')->execute([$assessment['status'] === 'healthy' ? 'Thriving' : 'Needs Attention', $assessment['status'] === 'healthy' ? 'green' : 'orange', $plantId, $user['id']]);
    $pdo->prepare("INSERT INTO care_events (user_id, plant_id, event_type) VALUES (?, ?, 'ai_scan')")->execute([$user['id'], $plantId]);
    $pdo->commit();
} catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
echo json_encode(['status' => 'success', 'scan' => ['id' => $scanId, 'status' => $assessment['status'], 'analysis' => $assessment['analysis'], 'created_at' => date('Y-m-d H:i:s')]]);
