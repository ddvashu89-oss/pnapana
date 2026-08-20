<?php
// Shared helper for calling Gemini's vision API with structured JSON output.
// Returns the decoded response array (Gemini's candidate text, json_decode'd), or null on any failure.
function gemini_vision_json_call($base64Image, $prompt, $apiKey = null) {
    $activeKey = !empty($apiKey) ? $apiKey : (defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '');
    if (empty($activeKey)) {
        return null;
    }

    $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $base64Image);

    $payload = [
        "contents" => [[
            "parts" => [
                ["text" => $prompt],
                ["inline_data" => ["mime_type" => "image/jpeg", "data" => $base64Data]]
            ]
        ]],
        "generationConfig" => ["response_mime_type" => "application/json"]
    ];

    $model = defined('GEMINI_MODEL') ? GEMINI_MODEL : 'gemini-flash-lite-latest';
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . $activeKey;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 45);
    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || !empty($curlError)) {
        return null;
    }

    $resData = json_decode($response, true);
    $text = $resData['candidates'][0]['content']['parts'][0]['text'] ?? null;
    if ($text === null) {
        return null;
    }

    $text = trim($text);
    $text = preg_replace('/^```(?:json)?\s*/', '', $text);
    $text = preg_replace('/\s*```$/', '', $text);

    $parsed = json_decode($text, true);
    return is_array($parsed) ? $parsed : null;
}
