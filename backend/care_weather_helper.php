<?php
function pnapana_care_weather_context(float $lat, float $lon): ?array {
    if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) return null;
    if (!function_exists('curl_init')) return null;
    $cacheKey = sprintf('%.2f,%.2f', $lat, $lon);
    $query = http_build_query(['latitude' => $lat, 'longitude' => $lon,
        'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m',
        'hourly' => 'precipitation_probability,precipitation,rain,wind_speed_10m,uv_index',
        'daily' => 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset,weather_code',
        'forecast_days' => 7, 'timezone' => 'auto']);
    $cacheFile = sys_get_temp_dir() . '/pnapana-care-weather-' . hash('sha256', $cacheKey) . '.json';
    if (is_file($cacheFile) && filemtime($cacheFile) > time() - 600) {
        $cached = json_decode((string)file_get_contents($cacheFile), true);
        if (is_array($cached)) return $cached;
    }
    $ch = curl_init('https://api.open-meteo.com/v1/forecast?' . $query);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10, CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    $body = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $data = is_string($body) && $status >= 200 && $status < 300 ? json_decode($body, true) : null;
    if (!is_array($data) || !is_array($data['current'] ?? null)) return null;
    $context = ['temperature_c' => $data['current']['temperature_2m'] ?? null, 'humidity_percent' => $data['current']['relative_humidity_2m'] ?? null,
        'feels_like_c' => $data['current']['apparent_temperature'] ?? null, 'weather_code' => $data['current']['weather_code'] ?? null,
        'precipitation_mm' => $data['current']['precipitation'] ?? null, 'rain_mm' => $data['current']['rain'] ?? null,
        'cloud_cover_percent' => $data['current']['cloud_cover'] ?? null, 'wind_speed_kmh' => $data['current']['wind_speed_10m'] ?? null,
        'wind_direction_degrees' => $data['current']['wind_direction_10m'] ?? null,
        'hourly_forecast' => array_slice(array_map(static function ($time, $index) use ($data) { return ['time' => $time, 'rain_probability_percent' => $data['hourly']['precipitation_probability'][$index] ?? null, 'precipitation_mm' => $data['hourly']['precipitation'][$index] ?? null, 'wind_speed_kmh' => $data['hourly']['wind_speed_10m'][$index] ?? null, 'uv_index' => $data['hourly']['uv_index'][$index] ?? null]; }, $data['hourly']['time'] ?? [], array_keys($data['hourly']['time'] ?? [])), 0, 24),
        'daily_forecast' => array_map(static function ($date, $index) use ($data) { return ['date' => $date, 'min_c' => $data['daily']['temperature_2m_min'][$index] ?? null, 'max_c' => $data['daily']['temperature_2m_max'][$index] ?? null, 'rain_probability_percent' => $data['daily']['precipitation_probability_max'][$index] ?? null, 'rain_mm' => $data['daily']['precipitation_sum'][$index] ?? null, 'wind_speed_kmh' => $data['daily']['wind_speed_10m_max'][$index] ?? null, 'wind_direction_degrees' => $data['daily']['wind_direction_10m_dominant'][$index] ?? null, 'uv_index_max' => $data['daily']['uv_index_max'][$index] ?? null, 'sunrise' => $data['daily']['sunrise'][$index] ?? null, 'sunset' => $data['daily']['sunset'][$index] ?? null, 'weather_code' => $data['daily']['weather_code'][$index] ?? null]; }, $data['daily']['time'] ?? [], array_keys($data['daily']['time'] ?? [])),
        'timezone' => $data['timezone'] ?? null];
    @file_put_contents($cacheFile, json_encode($context), LOCK_EX);
    return $context;
}
