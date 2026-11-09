<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
http_response_code(410);
echo json_encode(['status' => 'error', 'message' => 'Plant Buddy is no longer available.']);
?>
