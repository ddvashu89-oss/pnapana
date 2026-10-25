<?php
// Shared helper for calling Gemini's vision API with structured JSON output.
// Returns the decoded response array (Gemini's candidate text, json_decode'd), or null on any failure.
function gemini_vision_json_call($base64Image, $prompt, $apiKey = null) {
    $activeKey = !empty($apiKey) ? $apiKey : (defined('GEMINI_API_KEY') ? GEMINI_API_KEY : (getenv('GEMINI_API_KEY') ?: ''));
    if (empty($activeKey)) {
        return null;
    }

    $mimeType = 'image/jpeg';
    if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,/', $base64Image, $m)) {
        $mimeType = $m[1];
    }

    $base64Data = preg_replace('/^data:image\/[a-zA-Z0-9.+-]+;base64,/', '', $base64Image);
    $base64Data = str_replace(["\r", "\n", ' '], '', $base64Data);

    if (empty($base64Data)) {
        return null;
    }

    $payload = [
        "contents" => [[
            "parts" => [
                ["text" => $prompt],
                ["inline_data" => ["mime_type" => $mimeType, "data" => $base64Data]]
            ]
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

        $resData = json_decode($response, true);
        $text = $resData['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if ($text === null) {
            continue;
        }

        $text = trim($text);
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $matches)) {
            $text = trim($matches[1]);
        } else {
            $text = preg_replace('/^```(?:json)?\s*/', '', $text);
            $text = preg_replace('/\s*```$/', '', $text);
            $text = trim($text);
        }

        $parsed = json_decode($text, true);
        if (is_array($parsed) && (isset($parsed['is_plant']) || isset($parsed['species']))) {
            return $parsed;
        }
    }

    return null;
}
