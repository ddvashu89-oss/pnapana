<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('POST, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
http_response_code(403);
echo json_encode([
    'status' => 'error',
    'message' => 'Gemini is configured centrally by the Pnapana administrator.'
]);
