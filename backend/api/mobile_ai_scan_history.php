<?php
require_once __DIR__ . '/mobile_common.php';
mobile_method(['GET']);
$user = mobile_user($pdo, true);
$limit = filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT);
$limit = $limit === false || $limit === null ? 20 : max(1, min(100, (int)$limit));
$stmt = $pdo->prepare('SELECT id, plant_id, scan_type, provider, model_version, confidence, uncertain, result_json, created_at FROM mobile_ai_scan_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ' . $limit);
$stmt->execute([$user['id']]);
$history = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $result = json_decode($row['result_json'], true);
    unset($row['result_json']);
    $row['result'] = is_array($result) ? $result : [];
    $row['uncertain'] = (bool)$row['uncertain'];
    $row['confidence'] = $row['confidence'] === null ? null : (float)$row['confidence'];
    $history[] = $row;
}
echo json_encode(['status' => 'success', 'history' => $history]);
