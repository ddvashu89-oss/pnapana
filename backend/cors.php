<?php
/**
 * Central CORS policy.
 *
 * One place decides which origins may call this API. Previously every endpoint
 * hardcoded `Access-Control-Allow-Origin: *`, which let any site on the internet
 * call the API from a visitor's browser.
 *
 * Configure the real origins in config.php:
 *     define('ALLOWED_ORIGINS', 'https://pnapana.com,https://www.pnapana.com');
 * or via the ALLOWED_ORIGINS environment variable (comma-separated).
 */

if (!function_exists('pnapana_cors')) {

    require_once __DIR__ . '/env.php';

    if (file_exists(__DIR__ . '/config.php')) {
        require_once __DIR__ . '/config.php';
    }

    function pnapana_allowed_origins() {
        $raw = null;

        if (defined('ALLOWED_ORIGINS')) {
            $raw = ALLOWED_ORIGINS;
        } elseif (getenv('ALLOWED_ORIGINS') !== false && getenv('ALLOWED_ORIGINS') !== '') {
            $raw = getenv('ALLOWED_ORIGINS');
        }

        if ($raw === null || $raw === '') {
            // Local development fallback. Production must set ALLOWED_ORIGINS.
            return ['http://localhost:3000', 'http://127.0.0.1:3000'];
        }

        if (is_string($raw)) {
            $raw = explode(',', $raw);
        }

        return array_values(array_filter(array_map('trim', (array)$raw), 'strlen'));
    }

    /**
     * Emits the CORS headers and answers the preflight.
     * Must be called before any output, and before the endpoint does real work.
     */
    function pnapana_cors($methods = 'GET, POST, OPTIONS') {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

        // An unlisted origin simply receives no allow header, so the browser
        // blocks the response. Same-origin and server-to-server callers send no
        // Origin at all and are unaffected.
        if ($origin !== '' && in_array($origin, pnapana_allowed_origins(), true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }

        // The response now depends on the request's Origin, so caches must vary.
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: ' . $methods);
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');

        if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
