<?php
/**
 * Verify Stripe Checkout Session
 *
 * Used to verify payment after redirect from Stripe
 *
 * @endpoint GET /verify-session.php?session_id=xxx
 * @version 1.0.0
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/PaymentService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $sessionId = $_GET['session_id'] ?? null;

        if (!$sessionId) {
            throw new Exception('Session ID required');
        }

        $paymentService = new PaymentService();
        $result = $paymentService->verifyPaymentSession($sessionId);

        if (!$result['success']) {
            throw new Exception($result['error']);
        }

        echo json_encode([
            'success' => true,
            'data' => $result,
            'message' => 'Payment verified'
        ]);
    } else {
        throw new Exception('Method not allowed');
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
