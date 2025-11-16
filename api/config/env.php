<?php
/**
 * Environment Variable Loader
 * Loads and parses .env file
 */

class Env {
    private static $variables = [];
    private static $loaded = false;

    /**
     * Load environment variables from .env file
     */
    public static function load($path = null) {
        if (self::$loaded) {
            return;
        }

        if ($path === null) {
            $path = __DIR__ . '/../../.env';
        }

        if (!file_exists($path)) {
            error_log("WARNING: .env file not found at $path");
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parse KEY=VALUE
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);

                // Remove quotes if present
                if (preg_match('/^(["\'])(.*)\\1$/', $value, $matches)) {
                    $value = $matches[2];
                }

                self::$variables[$key] = $value;

                // Also set in $_ENV for compatibility
                $_ENV[$key] = $value;
            }
        }

        self::$loaded = true;
    }

    /**
     * Get environment variable
     */
    public static function get($key, $default = null) {
        self::load();
        return self::$variables[$key] ?? $_ENV[$key] ?? $default;
    }

    /**
     * Check if environment variable exists
     */
    public static function has($key) {
        self::load();
        return isset(self::$variables[$key]) || isset($_ENV[$key]);
    }

    /**
     * Get boolean environment variable
     */
    public static function getBool($key, $default = false) {
        $value = self::get($key);

        if ($value === null) {
            return $default;
        }

        return in_array(strtolower($value), ['true', '1', 'yes', 'on'], true);
    }
}

// Auto-load on include
Env::load();
