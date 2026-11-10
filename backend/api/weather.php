<?php
require_once __DIR__ . '/../cors.php';
pnapana_cors('GET, OPTIONS');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: public, max-age=120, stale-while-revalidate=300');

function weather_fetch_json(string $url): ?array {
    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
            CURLOPT_USERAGENT => 'PnapanaWeather/1.0 (+https://pnapana.live)',
        ]);
        $body = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        if (!is_string($body) || $status < 200 || $status >= 300) return null;
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 8,
                'ignore_errors' => true,
                'header' => "Accept: application/json\r\nUser-Agent: PnapanaWeather/1.0 (+https://pnapana.live)\r\n",
            ],
        ]);
        $body = @file_get_contents($url, false, $context);
        $status = 0;
        foreach ($http_response_header ?? [] as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $match)) $status = (int)$match[1];
        }
        if (!is_string($body) || $status < 200 || $status >= 300) return null;
    }
    $decoded = json_decode($body, true);
    return is_array($decoded) ? $decoded : null;
}

function weather_model_data(float $lat, float $lon): ?array {
    $query = http_build_query([
        'latitude' => $lat,
        'longitude' => $lon,
        'current' => 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,is_day,shortwave_radiation',
        'hourly' => 'shortwave_radiation',
        'daily' => 'sunrise,sunset',
        'forecast_days' => 1,
        'timezone' => 'auto',
    ]);
    return weather_fetch_json('https://api.open-meteo.com/v1/forecast?' . $query);
}

function weather_wmo(int $code): array {
    if ($code === 0) return ['Clear sky', 'clear'];
    if ($code === 1) return ['Mainly clear', 'partly-cloudy'];
    if ($code === 2) return ['Partly cloudy', 'partly-cloudy'];
    if ($code === 3) return ['Overcast', 'cloudy'];
    if ($code === 45 || $code === 48) return ['Fog', 'fog'];
    if (in_array($code, [51, 53, 55, 56, 57], true)) return ['Drizzle', 'rain'];
    if (in_array($code, [61, 63, 65, 66, 67, 80, 81, 82], true)) return ['Rain', 'rain'];
    if (in_array($code, [71, 73, 75, 77, 85, 86], true)) return ['Snow', 'snow'];
    if (in_array($code, [95, 96, 99], true)) return ['Thunderstorm', 'thunder'];
    return ['Conditions unavailable', 'cloudy'];
}

function metar_condition(array $report): array {
    $weather = strtoupper((string)($report['wxString'] ?? ''));
    if (preg_match('/\bTS/', $weather)) return ['Thunderstorm', 'thunder'];
    if (preg_match('/\b(?:SN|SG|PL|GR|GS|IC)\b/', $weather)) return ['Snow or ice', 'snow'];
    if (preg_match('/\b(?:RA|DZ)\b/', $weather)) return [preg_match('/DZ/', $weather) ? 'Drizzle' : 'Rain', 'rain'];
    if (preg_match('/\bFG\b/', $weather)) return ['Fog', 'fog'];
    if (preg_match('/\bBR\b/', $weather)) return ['Mist', 'fog'];
    if (preg_match('/\bHZ\b/', $weather)) return ['Haze', 'haze'];
    if (preg_match('/\b(?:DU|SA|DS|SS)\b/', $weather)) return ['Dust or sand', 'haze'];
    if (preg_match('/\bSH\b/', $weather)) return ['Showers', 'rain'];

    $cover = strtoupper((string)($report['cover'] ?? ''));
    if (in_array($cover, ['CLR', 'SKC', 'NSC', 'NCD'], true)) return ['Clear sky', 'clear'];
    if ($cover === 'FEW') return ['Mainly clear', 'partly-cloudy'];
    if ($cover === 'SCT') return ['Partly cloudy', 'partly-cloudy'];
    if (in_array($cover, ['BKN', 'OVC', 'VV'], true)) return ['Cloudy', 'cloudy'];
    return ['Conditions unavailable', 'cloudy'];
}

function weather_distance_km(float $lat1, float $lon1, float $lat2, float $lon2): float {
    $earth = 6371.0;
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
    return $earth * 2 * atan2(sqrt($a), sqrt(max(0.0, 1.0 - $a)));
}

function weather_humidity(float $temp, ?float $dewPoint): ?int {
    if ($dewPoint === null) return null;
    $satTemp = 6.112 * exp((17.67 * $temp) / ($temp + 243.5));
    $satDew = 6.112 * exp((17.67 * $dewPoint) / ($dewPoint + 243.5));
    return (int)round(max(0.0, min(100.0, 100 * $satDew / $satTemp)));
}

function weather_observation(float $lat, float $lon): ?array {
    $half = 0.65;
    $lat0 = max(-90.0, $lat - $half);
    $lat1 = min(90.0, $lat + $half);
    $lon0 = max(-180.0, $lon - $half);
    $lon1 = min(180.0, $lon + $half);
    $query = http_build_query([
        'bbox' => implode(',', [$lat0, $lon0, $lat1, $lon1]),
        'format' => 'json',
        'hours' => 2,
    ]);
    $reports = weather_fetch_json('https://aviationweather.gov/api/data/metar?' . $query);
    if (!is_array($reports) || isset($reports['error'])) return null;

    $now = time();
    $valid = [];
    foreach ($reports as $report) {
        if (!is_array($report) || !is_numeric($report['temp'] ?? null) || !is_numeric($report['lat'] ?? null) || !is_numeric($report['lon'] ?? null)) continue;
        $obsTime = is_numeric($report['obsTime'] ?? null) ? (int)$report['obsTime'] : 0;
        $ageMinutes = $obsTime > 0 ? max(0, ($now - $obsTime) / 60) : 999;
        // Distant airport conditions can differ materially from the user's
        // location. Use only a recent, genuinely local observation.
        if ($ageMinutes > 90) continue;
        $distance = weather_distance_km($lat, $lon, (float)$report['lat'], (float)$report['lon']);
        if ($distance > 25) continue;
        $valid[] = ['report' => $report, 'age' => $ageMinutes, 'distance' => $distance, 'score' => $distance + $ageMinutes * 0.15];
    }
    if (!$valid) return null;
    usort($valid, fn($a, $b) => $a['score'] <=> $b['score']);
    $best = $valid[0];
    $report = $best['report'];
    $temp = (float)$report['temp'];
    [$condition, $icon] = metar_condition($report);
    $obsTimestamp = is_numeric($report['obsTime'] ?? null) ? (int)$report['obsTime'] : null;

    return [
        'temp' => (int)round($temp),
        'feelsLike' => null,
        'humidity' => weather_humidity($temp, is_numeric($report['dewp'] ?? null) ? (float)$report['dewp'] : null),
        'condition' => $condition,
        'icon' => $icon,
        'cloud' => in_array(strtoupper((string)($report['cover'] ?? '')), ['CLR', 'SKC', 'NSC', 'NCD'], true) ? 0 : null,
        'location' => trim((string)($report['name'] ?? $report['icaoId'] ?? 'Nearby weather station')),
        'source' => 'station-observation',
        'updatedAt' => $obsTimestamp ? gmdate('c', $obsTimestamp) : null,
        'stationDistanceKm' => round((float)$best['distance'], 1),
        'observationText' => trim((string)($report['rawOb'] ?? '')),
    ];
}

$lat = filter_var($_GET['lat'] ?? null, FILTER_VALIDATE_FLOAT);
$lon = filter_var($_GET['lon'] ?? null, FILTER_VALIDATE_FLOAT);
if ($lat === false || $lon === false || $lat === null || $lon === null || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Valid latitude and longitude are required.']);
    exit;
}

$model = weather_model_data((float)$lat, (float)$lon);
$current = is_array($model['current'] ?? null) ? $model['current'] : [];
$solarValues = is_array($model['hourly']['shortwave_radiation'] ?? null) ? array_filter($model['hourly']['shortwave_radiation'], 'is_numeric') : [];
$sunrise = $model['daily']['sunrise'][0] ?? null;
$sunset = $model['daily']['sunset'][0] ?? null;
$timezone = is_string($model['timezone'] ?? null) ? $model['timezone'] : null;
$solarPeak = $solarValues ? max(array_map('floatval', $solarValues)) : (is_numeric($current['shortwave_radiation'] ?? null) ? (float)$current['shortwave_radiation'] : null);

$weather = weather_observation((float)$lat, (float)$lon);
if ($weather) {
    $weather['humidity'] = $weather['humidity'] ?? (is_numeric($current['relative_humidity_2m'] ?? null) ? (int)round((float)$current['relative_humidity_2m']) : 0);
} elseif (is_numeric($current['temperature_2m'] ?? null) && is_numeric($current['relative_humidity_2m'] ?? null)) {
    [$condition, $icon] = weather_wmo((int)($current['weather_code'] ?? -1));
    $updatedAt = null;
    if (is_string($current['time'] ?? null)) {
        try {
            $updatedAt = (new DateTimeImmutable($current['time'], $timezone ? new DateTimeZone($timezone) : null))->setTimezone(new DateTimeZone('UTC'))->format(DATE_ATOM);
        } catch (Throwable $e) { $updatedAt = null; }
    }
    $weather = [
        'temp' => (int)round((float)$current['temperature_2m']),
        'feelsLike' => is_numeric($current['apparent_temperature'] ?? null) ? (int)round((float)$current['apparent_temperature']) : null,
        'humidity' => (int)round((float)$current['relative_humidity_2m']),
        'condition' => $condition,
        'icon' => $icon,
        'cloud' => is_numeric($current['cloud_cover'] ?? null) ? (int)$current['cloud_cover'] : 0,
        'location' => 'Weather model near your location',
        'source' => 'forecast-model',
        'updatedAt' => $updatedAt,
        'stationDistanceKm' => null,
        'observationText' => null,
    ];
} else {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'Weather is temporarily unavailable.']);
    exit;
}

$weather['solarPeak'] = $solarPeak;
$weather['sunrise'] = $sunrise;
$weather['sunset'] = $sunset;
$weather['timezone'] = $timezone;
$weather['isDay'] = (int)($current['is_day'] ?? 1) === 1;
echo json_encode(['status' => 'success', 'weather' => $weather]);
?>
