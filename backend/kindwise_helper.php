<?php
// Server-side Kindwise client. Keep KINDWISE_API_KEY out of frontend code.

function kindwise_api_key() {
    if (defined('KINDWISE_API_KEY') && KINDWISE_API_KEY !== '') {
        return trim(KINDWISE_API_KEY);
    }
    return trim(getenv('KINDWISE_API_KEY') ?: '');
}

function kindwise_image_payload($image) {
    if (!is_string($image) || $image === '') {
        return null;
    }

    if (preg_match('/^data:image\/[a-zA-Z0-9.+-]+;base64,/', $image)) {
        $image = preg_replace('/^data:image\/[a-zA-Z0-9.+-]+;base64,/', '', $image);
    }
    $image = str_replace(["\r", "\n", ' '], '', $image);

    // Reject malformed and excessively large payloads before making a paid call.
    if ($image === '' || strlen($image) > 12 * 1024 * 1024 || base64_decode($image, true) === false) {
        return null;
    }

    return $image;
}

function kindwise_request($endpoint, $payload) {
    $apiKey = kindwise_api_key();
    if ($apiKey === '') {
        return ['ok' => false, 'configured' => false, 'data' => null];
    }

    $ch = curl_init('https://api.plant.id/v3/' . ltrim($endpoint, '/'));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Api-Key: ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 45
    ]);

    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($body === false || $curlError !== '' || $status < 200 || $status >= 300) {
        error_log('Kindwise request failed: endpoint=' . $endpoint . ' status=' . $status . ($curlError !== '' ? ' transport_error' : ''));
        return ['ok' => false, 'configured' => true, 'data' => null];
    }

    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        error_log('Kindwise returned invalid JSON for endpoint=' . $endpoint);
        return ['ok' => false, 'configured' => true, 'data' => null];
    }

    return ['ok' => true, 'configured' => true, 'data' => $decoded];
}

function kindwise_identify($image, $language = 'en') {
    $imageData = kindwise_image_payload($image);
    if ($imageData === null) {
        return ['ok' => false, 'configured' => kindwise_api_key() !== '', 'data' => null];
    }

    $payload = [
        'images' => [$imageData],
        'similar_images' => false,
        'details' => ['common_names', 'url', 'description', 'taxonomy', 'image']
    ];
    if (in_array($language, ['en', 'hi', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'uk', 'zh', 'ja', 'ko'], true)) {
        $payload['preferred_language'] = $language;
    }

    return kindwise_request('identification', $payload);
}

function kindwise_health_assessment($image) {
    $imageData = kindwise_image_payload($image);
    if ($imageData === null) {
        return ['ok' => false, 'configured' => kindwise_api_key() !== '', 'data' => null];
    }

    return kindwise_request('health_assessment', [
        'images' => [$imageData],
        'similar_images' => false,
        'details' => ['local_name', 'description', 'treatment', 'url']
    ]);
}

function kindwise_top_identification($response) {
    $result = $response['result'] ?? [];
    $plantProbability = (float) ($result['is_plant']['probability'] ?? 0);
    $isPlant = $result['is_plant']['binary'] ?? ($plantProbability >= 0.5);
    $suggestion = $result['classification']['suggestions'][0] ?? null;

    if (!$isPlant || !is_array($suggestion) || empty($suggestion['name'])) {
        return ['is_plant' => (bool) $isPlant, 'suggestion' => null];
    }

    $details = $suggestion['details'] ?? [];
    $names = $details['common_names'] ?? [];
    if (is_string($names)) {
        $names = [$names];
    }
    $description = $details['description'] ?? '';
    if (is_array($description)) {
        $description = $description['value'] ?? '';
    }

    $probability = (float) ($suggestion['probability'] ?? 0);
    return [
        'is_plant' => true,
        'suggestion' => [
            'species' => $suggestion['name'],
            'common_name' => $names[0] ?? $suggestion['name'],
            'confidence' => $probability >= 0.75 ? 'high' : ($probability >= 0.45 ? 'medium' : 'low'),
            'probability' => $probability,
            'description' => is_string($description) ? $description : '',
            'url' => $details['url'] ?? ''
        ]
    ];
}

function kindwise_health_summary($response) {
    $result = $response['result'] ?? [];
    if (($result['is_plant']['binary'] ?? null) === false) {
        return [
            'status' => 'issue',
            'diagnosis' => 'No plant detected',
            'analysis' => 'This photo does not appear to show a plant clearly. Try again with the leaves and affected area in focus.'
        ];
    }
    $isHealthy = $result['is_healthy']['binary'] ?? null;
    $suggestions = $result['disease']['suggestions'] ?? [];
    $top = is_array($suggestions) ? array_slice($suggestions, 0, 3) : [];

    if ($isHealthy === true || ($isHealthy === null && count($top) === 0)) {
        return [
            'status' => 'healthy',
            'diagnosis' => 'Looks healthy',
            'analysis' => 'No clear signs of a disease or pest were detected in this photo. Continue the plant’s normal care and monitor new growth.'
        ];
    }

    $diagnoses = [];
    $notes = [];
    foreach ($top as $suggestion) {
        if (!is_array($suggestion)) continue;
        $details = $suggestion['details'] ?? [];
        $name = $details['local_name'] ?? $suggestion['name'] ?? '';
        if ($name !== '') $diagnoses[] = $name;

        $description = $details['description'] ?? '';
        if (is_array($description)) $description = $description['value'] ?? '';
        if (is_string($description) && $description !== '') $notes[] = $description;

        $treatment = $details['treatment'] ?? '';
        if (is_array($treatment)) {
            foreach (['biological', 'prevention', 'chemical'] as $method) {
                $value = $treatment[$method] ?? '';
                if (is_array($value)) $value = implode(' ', array_filter($value, 'is_string'));
                if (is_string($value) && $value !== '') $notes[] = $value;
            }
        } elseif (is_string($treatment) && $treatment !== '') {
            $notes[] = $treatment;
        }
    }

    return [
        'status' => 'issue',
        'diagnosis' => count($diagnoses) ? implode(' / ', array_unique($diagnoses)) : 'Possible plant health issue',
        'analysis' => count($notes) ? implode(' ', array_unique($notes)) : 'The photo may show a plant health issue. Take a close, well-lit photo of the affected leaves and compare the result with the plant in person before treating it.'
    ];
}
