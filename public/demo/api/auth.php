<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Demo credentials
define('DEMO_USERNAME', 'demo@business.com');
define('DEMO_PASSWORD', 'Demo2025');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Handle login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw_input = file_get_contents('php://input');
    $input = json_decode($raw_input, true);

    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if ($username === DEMO_USERNAME && $password === DEMO_PASSWORD) {
        // Generate session token
        $token = bin2hex(random_bytes(32));

        // Store session (in production, use proper session management)
        $sessionFile = __DIR__ . '/../data/session_' . md5($token) . '.json';
        file_put_contents($sessionFile, json_encode([
            'token' => $token,
            'username' => $username,
            'created' => time(),
            'expires' => time() + 86400 // 24 hours
        ]));

        echo json_encode([
            'success' => true,
            'token' => $token,
            'user' => [
                'username' => $username,
                'name' => 'Demo Business',
                'email' => $username,
                'company' => 'Tech Innovations Ltd',
                'industry' => 'Technology Services',
                'employees' => 12,
                'founded' => '2020'
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid credentials'
        ]);
    }
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
