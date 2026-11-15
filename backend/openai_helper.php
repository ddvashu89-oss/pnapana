<?php
// Server-side OpenAI vision helper for plant identification. The API key must
// remain in backend/.env as OPENAI_API_KEY and is never exposed to browsers.

function pnapana_openai_api_key(): string {
    $key = defined('OPENAI_API_KEY') ? OPENAI_API_KEY : (getenv('OPENAI_API_KEY') ?: '');
    return is_string($key) ? trim($key) : '';
}

function pnapana_openai_model(): string {
    $model = defined('OPENAI_IDENTIFICATION_MODEL') ? OPENAI_IDENTIFICATION_MODEL : (getenv('OPENAI_IDENTIFICATION_MODEL') ?: 'gpt-4.1-mini');
    return is_string($model) && trim($model) !== '' ? trim($model) : 'gpt-4.1-mini';
}

function pnapana_openai_image_payload(string $image): ?array {
    if (!preg_match('/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+\/=\r\n]+)$/', $image, $match)) return null;
    $bytes = base64_decode(preg_replace('/\s+/', '', $match[2]), true);
    if ($bytes === false || strlen($bytes) < 100 || strlen($bytes) > 6 * 1024 * 1024) return null;
    return ['mime' => $match[1], 'data_url' => 'data:' . $match[1] . ';base64,' . base64_encode($bytes)];
}

function pnapana_openai_response_text(array $response): ?string {
    foreach (($response['output'] ?? []) as $item) {
        foreach (($item['content'] ?? []) as $content) {
            if (($content['type'] ?? '') === 'output_text' && is_string($content['text'] ?? null)) return $content['text'];
        }
    }
    return is_string($response['output_text'] ?? null) ? $response['output_text'] : null;
}

function pnapana_openai_clip(string $value, int $limit): string {
    return function_exists('mb_substr') ? mb_substr($value, 0, $limit) : substr($value, 0, $limit);
}

function pnapana_openai_identify_plant(array $images, string $language = 'en'): array {
    $key = pnapana_openai_api_key();
    if ($key === '') return ['ok' => false, 'configured' => false, 'data' => null, 'http_status' => null, 'duration_ms' => 0, 'error_code' => 'not_configured', 'model' => pnapana_openai_model()];

    $content = [[
        'type' => 'input_text',
        'text' => "Identify the living plant shown across these photos. They are different angles of the same plant. Use visual botanical evidence only; do not infer a species from care, location, or an unsupported guess. Return no more than three plausible candidates, ordered most likely first. If the images are insufficient, blurred, show multiple plants, or are not a plant, set is_plant false or uncertain true and keep every probability at or below 0.45. Never report a probability above 0.90. Common names must be short. Write in " . ($language === 'hi' ? 'Hindi' : 'English') . '.'
    ]];
    foreach (array_slice($images, 0, 4) as $image) {
        if (!is_string($image) || !($payload = pnapana_openai_image_payload($image))) continue;
        $content[] = ['type' => 'input_image', 'image_url' => $payload['data_url'], 'detail' => 'high'];
    }
    if (count($content) < 3) return ['ok' => false, 'configured' => true, 'data' => null, 'http_status' => null, 'duration_ms' => 0, 'error_code' => 'invalid_image', 'model' => pnapana_openai_model()];

    $schema = [
        'type' => 'object', 'additionalProperties' => false,
        'required' => ['is_plant', 'uncertain', 'candidates'],
        'properties' => [
            'is_plant' => ['type' => 'boolean'],
            'uncertain' => ['type' => 'boolean'],
            'candidates' => ['type' => 'array', 'maxItems' => 3, 'items' => [
                'type' => 'object', 'additionalProperties' => false,
                'required' => ['species', 'common_name', 'probability', 'description'],
                'properties' => [
                    'species' => ['type' => 'string'], 'common_name' => ['type' => 'string'],
                    'probability' => ['type' => 'number'], 'description' => ['type' => 'string']
                ]
            ]]
        ]
    ];
    $request = json_encode([
        'model' => pnapana_openai_model(),
        'input' => [['role' => 'user', 'content' => $content]],
        'text' => ['format' => ['type' => 'json_schema', 'name' => 'plant_identification', 'strict' => true, 'schema' => $schema]],
        'max_output_tokens' => 700
    ]);
    $started = microtime(true);
    $ch = curl_init('https://api.openai.com/v1/responses');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key], CURLOPT_POSTFIELDS => $request, CURLOPT_TIMEOUT => 35]);
    $body = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $curlError = curl_error($ch); curl_close($ch);
    $duration = (int)round((microtime(true) - $started) * 1000);
    if ($body === false || $curlError !== '' || $status < 200 || $status >= 300) {
        $error = $curlError !== '' ? 'transport_error' : ($status === 401 || $status === 403 ? 'authorization_failed' : ($status === 429 ? 'rate_limited' : 'provider_error'));
        return ['ok' => false, 'configured' => true, 'data' => null, 'http_status' => $status ?: null, 'duration_ms' => $duration, 'error_code' => $error, 'model' => pnapana_openai_model()];
    }
    $decoded = json_decode($body, true); $text = is_array($decoded) ? pnapana_openai_response_text($decoded) : null; $data = is_string($text) ? json_decode($text, true) : null;
    if (!is_array($data)) return ['ok' => false, 'configured' => true, 'data' => null, 'http_status' => $status, 'duration_ms' => $duration, 'error_code' => 'invalid_response', 'model' => pnapana_openai_model()];
    return ['ok' => true, 'configured' => true, 'data' => $data, 'http_status' => $status, 'duration_ms' => $duration, 'error_code' => null, 'model' => pnapana_openai_model()];
}

function pnapana_openai_candidates(array $data): array {
    if (empty($data['is_plant'])) return [];
    $candidates = [];
    foreach (array_slice(is_array($data['candidates'] ?? null) ? $data['candidates'] : [], 0, 3) as $candidate) {
        $species = trim((string)($candidate['species'] ?? '')); if ($species === '') continue;
        $probability = is_numeric($candidate['probability'] ?? null) ? (float)$candidate['probability'] : 0;
        $candidates[] = ['species' => pnapana_openai_clip($species, 180), 'common_name' => pnapana_openai_clip(trim((string)($candidate['common_name'] ?? $species)), 180), 'probability' => max(0, min(.90, $probability)), 'description' => pnapana_openai_clip(trim((string)($candidate['description'] ?? '')), 1000), 'source' => 'openai'];
    }
    usort($candidates, fn($a, $b) => $b['probability'] <=> $a['probability']);
    return $candidates;
}
