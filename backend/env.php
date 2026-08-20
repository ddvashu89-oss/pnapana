<?php
/**
 * Minimal .env loader.
 *
 * PHP has no native .env support and this project uses no Composer packages, so
 * without this the file would sit there being silently ignored.
 *
 * Values already present in the real environment win, so a host that sets real
 * environment variables (or a CI runner) overrides the file rather than fighting it.
 *
 * Format: KEY=value, one per line. `#` starts a comment. Surrounding single or
 * double quotes are stripped. Everything after the first `=` is the value, so
 * passwords containing `=` are safe.
 */

if (!function_exists('pnapana_load_env')) {

    function pnapana_load_env($path = null) {
        // Track paths individually: a single boolean would make the automatic
        // load below block every later call with an explicit path.
        static $loadedPaths = [];

        $path = $path ?: __DIR__ . '/.env';
        $key = realpath($path) ?: $path;

        if (isset($loadedPaths[$key])) {
            return;
        }
        $loadedPaths[$key] = true;

        if (!is_readable($path)) {
            return;
        }

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }

            $pos = strpos($line, '=');
            if ($pos === false) {
                continue;
            }

            $key = trim(substr($line, 0, $pos));
            $value = trim(substr($line, $pos + 1));

            if ($key === '') {
                continue;
            }

            // Strip one matching pair of surrounding quotes, if present.
            $len = strlen($value);
            if ($len >= 2) {
                $first = $value[0];
                $last = $value[$len - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }

            // A real environment variable takes precedence over the file.
            if (getenv($key) !== false) {
                continue;
            }

            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }

    pnapana_load_env();
}
