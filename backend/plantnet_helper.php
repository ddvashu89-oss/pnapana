<?php
// Server-side Pl@ntNet client. The key must be supplied as PLANTNET_API_KEY
// in the host environment or private backend/.env file; never expose it to JS.
function plantnet_api_key(): string {
    return trim((defined('PLANTNET_API_KEY') ? PLANTNET_API_KEY : '') ?: (getenv('PLANTNET_API_KEY') ?: ''));
}

function plantnet_decode_image(string $image): ?array {
    if (!preg_match('/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+\/=\r\n]+)$/', $image, $match)) return null;
    $bytes = base64_decode(str_replace(["\r", "\n"], '', $match[2]), true);
    if ($bytes === false || strlen($bytes) < 256 || strlen($bytes) > 12 * 1024 * 1024) return null;
    return ['mime' => $match[1], 'bytes' => $bytes];
}

function plantnet_identify(array $images, string $language = 'en'): array {
    $key = plantnet_api_key();
    if ($key === '') return ['ok' => false, 'configured' => false, 'http_status' => null, 'error_code' => 'not_configured', 'data' => null];
    $parts = [];
    foreach (array_slice($images, 0, 3) as $image) {
        if (!is_string($image) || !($decoded = plantnet_decode_image($image))) continue;
        $parts[] = $decoded;
    }
    if (!$parts) return ['ok' => false, 'configured' => true, 'http_status' => null, 'error_code' => 'invalid_image', 'data' => null];
    if (!function_exists('curl_init')) return ['ok' => false, 'configured' => true, 'http_status' => null, 'error_code' => 'transport_unavailable', 'data' => null];

    $boundary = '----PnapanaPlantNet' . bin2hex(random_bytes(12));
    $body = '';
    foreach ($parts as $index => $part) {
        $ext = $part['mime'] === 'image/png' ? 'png' : 'jpg';
        $body .= "--{$boundary}\r\nContent-Disposition: form-data; name=\"organs\"\r\n\r\nauto\r\n";
        $body .= "--{$boundary}\r\nContent-Disposition: form-data; name=\"images\"; filename=\"plant-{$index}.{$ext}\"\r\nContent-Type: {$part['mime']}\r\n\r\n" . $part['bytes'] . "\r\n";
    }
    $body .= "--{$boundary}--\r\n";
    $url = 'https://my-api.plantnet.org/v2/identify/all?' . http_build_query(['api-key' => $key, 'lang' => in_array($language, ['en', 'hi'], true) ? $language : 'en', 'nb-results' => 3]);
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => ['Content-Type: multipart/form-data; boundary=' . $boundary, 'Accept: application/json'], CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 45]);
    $response = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $error = curl_error($ch); curl_close($ch);
    if ($response === false || $error !== '' || $status < 200 || $status >= 300) return ['ok' => false, 'configured' => true, 'http_status' => $status ?: null, 'error_code' => $error !== '' ? 'transport_error' : ($status === 401 || $status === 403 ? 'authorization_failed' : ($status === 429 ? 'rate_limited' : 'provider_error')), 'data' => null];
    $data = json_decode($response, true);
    if (!is_array($data)) return ['ok' => false, 'configured' => true, 'http_status' => $status, 'error_code' => 'invalid_response', 'data' => null];
    return ['ok' => true, 'configured' => true, 'http_status' => $status, 'error_code' => null, 'data' => $data];
}

function plantnet_candidates(?array $data): array {
    $candidates = [];
    foreach (array_slice($data['results'] ?? [], 0, 3) as $result) {
        $species = trim((string)($result['species']['scientificNameWithoutAuthor'] ?? $result['species']['scientificName'] ?? ''));
        if ($species === '') continue;
        $names = $result['species']['commonNames'] ?? [];
        $candidates[] = ['species' => $species, 'common_name' => trim((string)($names[0] ?? $species)),
            'probability' => max(0, min(1, (float)($result['score'] ?? 0))),
            'description' => trim((string)($result['species']['family']['scientificNameWithoutAuthor'] ?? '')),
            'source' => 'plantnet'];
    }
    return $candidates;
}
