<?php
// Internal client for the separate Pnapana FastAPI service. The mobile app
// never receives this URL or secret, and FastAPI never receives DB credentials.

function pnapana_ai_url() {
    $value = defined('PNAPANA_AI_URL') ? PNAPANA_AI_URL : (getenv('PNAPANA_AI_URL') ?: '');
    $value = is_string($value) ? rtrim(trim($value), '/') : '';
    if ($value === '' || !preg_match('#^https?://#i', $value)) return '';
    return $value;
}

function pnapana_ai_key() {
    $value = defined('PNAPANA_AI_API_KEY') ? PNAPANA_AI_API_KEY : (getenv('PNAPANA_AI_API_KEY') ?: '');
    return is_string($value) ? trim($value) : '';
}

function pnapana_ai_configured() {
    return pnapana_ai_url() !== '' && strlen(pnapana_ai_key()) >= 16;
}

function pnapana_ai_image_bytes($image) {
    if (!is_string($image) || !preg_match('#^data:image/(jpeg|png|webp);base64,(.+)$#s', $image, $parts)) return null;
    $bytes = base64_decode(str_replace(["\r", "\n", ' '], '', $parts[2]), true);
    if ($bytes === false || strlen($bytes) === 0 || strlen($bytes) > 5 * 1024 * 1024) return null;
    $info = @getimagesizefromstring($bytes);
    $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!$info || !isset($types[$info['mime']])) return null;
    return ['bytes' => $bytes, 'mime' => $info['mime'], 'extension' => $types[$info['mime']]];
}

function pnapana_ai_request($endpoint, $image, $fields = []) {
    $allowed = ['/api/v1/identify', '/api/v1/disease-detect', '/api/v1/analyze'];
    if (!in_array($endpoint, $allowed, true) || !pnapana_ai_configured()) {
        return ['ok' => false, 'configured' => pnapana_ai_configured(), 'status' => 0, 'data' => null];
    }
    $validated = pnapana_ai_image_bytes($image);
    if ($validated === null) return ['ok' => false, 'configured' => true, 'status' => 422, 'data' => null];
    $temporary = tempnam(sys_get_temp_dir(), 'pnapana-ai-');
    if ($temporary === false) return ['ok' => false, 'configured' => true, 'status' => 0, 'data' => null];
    try {
        if (file_put_contents($temporary, $validated['bytes'], LOCK_EX) === false) return ['ok' => false, 'configured' => true, 'status' => 0, 'data' => null];
        @chmod($temporary, 0600);
        $payload = ['file' => new CURLFile($temporary, $validated['mime'], 'plant.' . $validated['extension'])];
        foreach ($fields as $key => $value) {
            if (is_string($key) && is_scalar($value) && strlen((string)$value) <= 500) $payload[$key] = (string)$value;
        }
        $ch = curl_init(pnapana_ai_url() . $endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Accept: application/json', 'X-API-Key: ' . pnapana_ai_key()],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 35,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        ]);
        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        $decoded = is_string($body) ? json_decode($body, true) : null;
        if ($error !== '' || $status < 200 || $status >= 300 || !is_array($decoded)) {
            error_log('Pnapana AI request unavailable: endpoint=' . $endpoint . ' status=' . $status);
            return ['ok' => false, 'configured' => true, 'status' => $status, 'data' => $decoded];
        }
        return ['ok' => true, 'configured' => true, 'status' => $status, 'data' => $decoded];
    } finally {
        if (is_file($temporary)) @unlink($temporary);
    }
}
