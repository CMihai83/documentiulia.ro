<?php
/**
 * Rate Limiting Middleware
 * Prevents API abuse with configurable limits per endpoint
 */

class RateLimiter {
    private $redis;
    private $prefix = 'ratelimit:';
    private $enabled = true;

    // Default limits (requests per window)
    private $limits = [
        'default' => ['requests' => 100, 'window' => 60],      // 100 req/min
        'auth' => ['requests' => 10, 'window' => 60],          // 10 req/min for auth
        'upload' => ['requests' => 20, 'window' => 60],        // 20 req/min for uploads
        'ai' => ['requests' => 30, 'window' => 60],            // 30 req/min for AI endpoints
        'report' => ['requests' => 10, 'window' => 60],        // 10 req/min for reports
        'export' => ['requests' => 5, 'window' => 60],         // 5 req/min for exports
    ];

    public function __construct() {
        // Try to connect to Redis, fallback to file-based if not available
        try {
            $this->redis = new Redis();
            $this->redis->connect('127.0.0.1', 6379);
            $this->redis->setOption(Redis::OPT_PREFIX, $this->prefix);
        } catch (Exception $e) {
            $this->redis = null;
            error_log('RateLimiter: Redis not available, using file-based limiting');
        }
    }

    /**
     * Check if request is allowed
     * @param string $identifier - User ID or IP address
     * @param string $endpoint - Endpoint category (auth, upload, ai, etc.)
     * @return array ['allowed' => bool, 'remaining' => int, 'reset' => int]
     */
    public function check(string $identifier, string $endpoint = 'default'): array {
        if (!$this->enabled) {
            return ['allowed' => true, 'remaining' => 999, 'reset' => 0];
        }

        $limit = $this->limits[$endpoint] ?? $this->limits['default'];
        $key = $this->getKey($identifier, $endpoint);

        if ($this->redis) {
            return $this->checkRedis($key, $limit);
        } else {
            return $this->checkFile($key, $limit);
        }
    }

    /**
     * Redis-based rate limiting (sliding window)
     */
    private function checkRedis(string $key, array $limit): array {
        $now = time();
        $windowStart = $now - $limit['window'];

        // Remove old entries
        $this->redis->zRemRangeByScore($key, 0, $windowStart);

        // Count current requests
        $count = $this->redis->zCard($key);

        if ($count >= $limit['requests']) {
            // Get oldest request timestamp for reset time
            $oldest = $this->redis->zRange($key, 0, 0, true);
            $reset = !empty($oldest) ? (int)(array_values($oldest)[0] + $limit['window'] - $now) : $limit['window'];

            return [
                'allowed' => false,
                'remaining' => 0,
                'reset' => max(1, $reset)
            ];
        }

        // Add current request
        $this->redis->zAdd($key, $now, $now . '-' . mt_rand());
        $this->redis->expire($key, $limit['window'] + 1);

        return [
            'allowed' => true,
            'remaining' => $limit['requests'] - $count - 1,
            'reset' => $limit['window']
        ];
    }

    /**
     * File-based rate limiting (for when Redis is unavailable)
     */
    private function checkFile(string $key, array $limit): array {
        $file = '/tmp/ratelimit_' . md5($key) . '.json';
        $now = time();
        $data = ['requests' => [], 'created' => $now];

        if (file_exists($file)) {
            $content = file_get_contents($file);
            $data = json_decode($content, true) ?: $data;
        }

        // Filter out old requests
        $windowStart = $now - $limit['window'];
        $data['requests'] = array_filter($data['requests'], fn($ts) => $ts > $windowStart);
        $count = count($data['requests']);

        if ($count >= $limit['requests']) {
            $oldestTs = min($data['requests']);
            $reset = max(1, $oldestTs + $limit['window'] - $now);

            return [
                'allowed' => false,
                'remaining' => 0,
                'reset' => $reset
            ];
        }

        // Add current request
        $data['requests'][] = $now;
        file_put_contents($file, json_encode($data));

        return [
            'allowed' => true,
            'remaining' => $limit['requests'] - $count - 1,
            'reset' => $limit['window']
        ];
    }

    /**
     * Generate rate limit key
     */
    private function getKey(string $identifier, string $endpoint): string {
        return "{$endpoint}:{$identifier}";
    }

    /**
     * Apply rate limiting to current request
     * Call this at the start of API endpoints
     */
    public static function apply(string $endpoint = 'default'): void {
        $limiter = new self();

        // Get identifier (user ID from JWT or IP address)
        $identifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

        // Try to get user ID from Authorization header
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            // Use a hash of the token as identifier for logged-in users
            $identifier = 'user:' . substr(hash('sha256', $matches[1]), 0, 16);
        }

        $result = $limiter->check($identifier, $endpoint);

        // Set rate limit headers
        header('X-RateLimit-Limit: ' . ($limiter->limits[$endpoint]['requests'] ?? 100));
        header('X-RateLimit-Remaining: ' . $result['remaining']);
        header('X-RateLimit-Reset: ' . (time() + $result['reset']));

        if (!$result['allowed']) {
            http_response_code(429);
            header('Retry-After: ' . $result['reset']);
            echo json_encode([
                'success' => false,
                'error' => 'Rate limit exceeded',
                'message' => "Too many requests. Please try again in {$result['reset']} seconds.",
                'retry_after' => $result['reset']
            ]);
            exit();
        }
    }

    /**
     * Set custom limits
     */
    public function setLimit(string $endpoint, int $requests, int $window): void {
        $this->limits[$endpoint] = ['requests' => $requests, 'window' => $window];
    }

    /**
     * Disable rate limiting (for testing)
     */
    public function disable(): void {
        $this->enabled = false;
    }

    /**
     * Enable rate limiting
     */
    public function enable(): void {
        $this->enabled = true;
    }

    /**
     * Clear rate limit for an identifier
     */
    public function clear(string $identifier, string $endpoint = 'default'): void {
        $key = $this->getKey($identifier, $endpoint);

        if ($this->redis) {
            $this->redis->del($key);
        } else {
            $file = '/tmp/ratelimit_' . md5($key) . '.json';
            if (file_exists($file)) {
                unlink($file);
            }
        }
    }
}
