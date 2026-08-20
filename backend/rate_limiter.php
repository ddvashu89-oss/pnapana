<?php
/**
 * Simple file-based sliding window rate limiter for PHP.
 * Works seamlessly in XAMPP without Redis or Memcached dependencies.
 */

function check_rate_limit(string $action, int $maxRequests = 10, int $decaySeconds = 60): bool {
    // Get client IP address
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $forwarded = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($forwarded[0]);
    }

    $hash = md5($ip . '_' . $action);
    $storageDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pnapana_ratelimits';
    if (!is_dir($storageDir)) {
        @mkdir($storageDir, 0777, true);
    }

    $filePath = $storageDir . DIRECTORY_SEPARATOR . $hash . '.json';
    $now = time();
    $timestamps = [];

    if (file_exists($filePath)) {
        $content = @file_get_contents($filePath);
        if ($content) {
            $data = json_decode($content, true);
            if (is_array($data)) {
                // Filter out timestamps older than $decaySeconds
                $timestamps = array_filter($data, function($t) use ($now, $decaySeconds) {
                    return ($now - $t) < $decaySeconds;
                });
            }
        }
    }

    if (count($timestamps) >= $maxRequests) {
        http_response_code(429);
        header('Retry-After: ' . $decaySeconds);
        echo json_encode([
            "status" => "error",
            "message" => "Too many requests. Please slow down and try again in " . $decaySeconds . " seconds."
        ]);
        exit;
    }

    $timestamps[] = $now;
    @file_put_contents($filePath, json_encode(array_values($timestamps)));
    return true;
}
?>
