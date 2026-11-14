<?php
function pnapana_care_weather_context(float $lat, float $lon): ?array {
    if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) return null;
    if (!function_exists('curl_init')) return null;
    $query = http_build_query(['latitude' => $lat, 'longitude' => $lon,
        'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code',
        'daily' => 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code',
        'forecast_days' => 2, 'timezone' => 'auto']);
    $ch = curl_init('https://api.open-meteo.com/v1/forecast?' . $query);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10, CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    $body = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $data = is_string($body) && $status >= 200 && $status < 300 ? json_decode($body, true) : null;
    if (!is_array($data) || !is_array($data['current'] ?? null)) return null;
    return ['temperature_c' => $data['current']['temperature_2m'] ?? null, 'humidity_percent' => $data['current']['relative_humidity_2m'] ?? null,
        'feels_like_c' => $data['current']['apparent_temperature'] ?? null, 'weather_code' => $data['current']['weather_code'] ?? null,
        'tomorrow_high_c' => $data['daily']['temperature_2m_max'][1] ?? null, 'tomorrow_low_c' => $data['daily']['temperature_2m_min'][1] ?? null,
        'tomorrow_rain_probability' => $data['daily']['precipitation_probability_max'][1] ?? null, 'tomorrow_rain_mm' => $data['daily']['precipitation_sum'][1] ?? null,
        'timezone' => $data['timezone'] ?? null];
}
