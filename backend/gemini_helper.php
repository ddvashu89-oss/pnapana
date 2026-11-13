<?php
// Shared helper for calling Gemini's vision API with structured JSON output.
// Returns the decoded response array (Gemini's candidate text, json_decode'd), or null on any failure.
function pnapana_shared_gemini_key($pdo = null) {
    if ($pdo instanceof PDO) {
        try {
            $value = $pdo->query("SELECT gemini_api_key FROM app_settings WHERE id = 1")->fetchColumn();
            if (is_string($value) && trim($value) !== '') return trim($value);
        } catch (Throwable $e) {
            // Older installations use the server environment until migrated.
        }
    }

    $key = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : (getenv('GEMINI_API_KEY') ?: '');
    return is_string($key) ? trim($key) : '';
}

function pnapana_decode_gemini_json($response) {
    $resData = json_decode($response, true);
    $text = $resData['candidates'][0]['content']['parts'][0]['text'] ?? null;
    if ($text === null) return null;

    $text = trim($text);
    if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $matches)) {
        $text = trim($matches[1]);
    } else {
        $text = preg_replace('/^```(?:json)?\s*/', '', $text);
        $text = preg_replace('/\s*```$/', '', $text);
        $text = trim($text);
    }

    $parsed = json_decode($text, true);
    return is_array($parsed) ? $parsed : null;
}

function gemini_vision_json_call($base64Image, $prompt, $apiKey = null) {
    $activeKey = !empty($apiKey) ? $apiKey : pnapana_shared_gemini_key();
    if (empty($activeKey)) {
        return null;
    }

    $images = is_array($base64Image) ? array_slice($base64Image, 0, 4) : [$base64Image];
    $imageParts = [];
    foreach ($images as $image) {
        if (!is_string($image) || $image === '') continue;
        $mimeType = 'image/jpeg';
        if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,/', $image, $m)) $mimeType = $m[1];
        $base64Data = preg_replace('/^data:image\/[a-zA-Z0-9.+-]+;base64,/', '', $image);
        $base64Data = str_replace(["\r", "\n", ' '], '', $base64Data);
        if ($base64Data !== '') $imageParts[] = ["inline_data" => ["mime_type" => $mimeType, "data" => $base64Data]];
    }
    if (!$imageParts) return null;

    $payload = [
        "contents" => [[
            "parts" => array_merge([["text" => $prompt]], $imageParts)
        ]],
        "generationConfig" => ["response_mime_type" => "application/json"]
    ];

    $configuredModel = defined('GEMINI_MODEL') ? GEMINI_MODEL : (getenv('GEMINI_MODEL') ?: null);
    $modelsToTry = array_values(array_unique(array_filter([
        $configuredModel,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-flash-lite-latest'
    ])));

    $jsonPayload = json_encode($payload);

    foreach ($modelsToTry as $model) {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . $activeKey;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_TIMEOUT, 25);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($curlError) || $httpCode < 200 || $httpCode >= 300) {
            continue;
        }

        $parsed = pnapana_decode_gemini_json($response);
        if (is_array($parsed) && (isset($parsed['is_plant']) || isset($parsed['species']) || isset($parsed['diagnosis']))) {
            return $parsed;
        }
    }

    return null;
}

/** Calls Gemini for structured JSON without an image. */
function gemini_text_json_call($prompt, $apiKey = null) {
    $activeKey = !empty($apiKey) ? $apiKey : pnapana_shared_gemini_key();
    if ($activeKey === '') return null;
    $configuredModel = defined('GEMINI_MODEL') ? GEMINI_MODEL : (getenv('GEMINI_MODEL') ?: null);
    $models = array_values(array_unique(array_filter([$configuredModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-lite-latest'])));
    $payload = json_encode([
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => ['response_mime_type' => 'application/json', 'temperature' => 0.2]
    ]);
    foreach ($models as $model) {
        $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode($activeKey));
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POSTFIELDS => $payload, CURLOPT_TIMEOUT => 25]);
        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($response === false || $httpCode < 200 || $httpCode >= 300) continue;
        $parsed = pnapana_decode_gemini_json($response);
        if (is_array($parsed)) return $parsed;
    }
    return null;
}

/** Calls Gemini for plain-text garden guidance. Returns null when unavailable. */
function gemini_text_response($prompt, $apiKey = null) {
    $activeKey = !empty($apiKey) ? $apiKey : pnapana_shared_gemini_key();
    if ($activeKey === '') return null;
    $configuredModel = defined('GEMINI_MODEL') ? GEMINI_MODEL : (getenv('GEMINI_MODEL') ?: null);
    $models = array_values(array_unique(array_filter([$configuredModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-lite-latest'])));
    $payload = json_encode(['contents' => [['parts' => [['text' => $prompt]]]], 'generationConfig' => ['temperature' => 0.35, 'maxOutputTokens' => 700]]);
    foreach ($models as $model) {
        $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode($activeKey));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_TIMEOUT, 25);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($response === false || $httpCode < 200 || $httpCode >= 300) continue;
        $decoded = json_decode($response, true);
        $text = trim((string)($decoded['candidates'][0]['content']['parts'][0]['text'] ?? ''));
        if ($text !== '') return $text;
    }
    return null;
}
