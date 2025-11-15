<?php
/**
 * Header Helper Functions
 * Provides case-insensitive header access
 */

/**
 * Get all headers with case-insensitive keys
 * Works in both Apache/Nginx and CLI contexts
 * @return array Headers with lowercase keys
 */
function getAllHeadersCaseInsensitive() {
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    } else {
        // Fallback for CLI or if getallheaders() not available
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
                $headers[$headerName] = $value;
            }
        }
    }
    return array_change_key_case($headers, CASE_LOWER);
}

/**
 * Get a specific header value (case-insensitive)
 * @param string $name Header name
 * @param mixed $default Default value if header not found
 * @return mixed Header value or default
 */
function getHeader($name, $default = null) {
    $headers = getAllHeadersCaseInsensitive();
    $key = strtolower($name);
    return $headers[$key] ?? $default;
}
