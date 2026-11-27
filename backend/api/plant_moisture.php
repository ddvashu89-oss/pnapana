<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth.php';
$user = authenticate($pdo);
$data = json_decode(file_get_contents('php://input'), true) ?: [];
$level = $data['moisture'] ?? '';
if (!in_array($level, ['dry','moist','wet'], true)) { http_response_code(400); echo json_encode(['status'=>'error','message'=>'Choose dry, moist or wet soil.']); exit; }
try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT setup_data FROM plants WHERE id=? AND user_id=? FOR UPDATE');
    $stmt->execute([(int)($data['plant_id'] ?? 0),$user['id']]);
    $plant = $stmt->fetch();
    if (!$plant) { $pdo->rollBack(); http_response_code(404); echo json_encode(['status'=>'error','message'=>'Plant not found.']); exit; }
    $setup = json_decode((string)$plant['setup_data'],true) ?: [];
    $setup['moisture_level'] = $level;
    $setup['moisture_checked_at'] = date(DATE_ATOM);
    $pdo->prepare('UPDATE plants SET setup_data=? WHERE id=? AND user_id=?')->execute([json_encode($setup),(int)$data['plant_id'],$user['id']]);
    $pdo->prepare("INSERT INTO care_events (user_id,plant_id,event_type,details) VALUES (?,?,'soil_check',?)")->execute([$user['id'],(int)$data['plant_id'],json_encode(['moisture'=>$level])]);
    $pdo->commit();
    echo json_encode(['status'=>'success','setup'=>$setup]);
} catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); http_response_code(500); echo json_encode(['status'=>'error','message'=>'Could not save soil check.']); }
