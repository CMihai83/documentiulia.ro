<?php
/**
 * Create Stripe Payment Intent
 *
 * POST /api/v1/payments/create-payment-intent.php
 *
 * Creates a payment intent for processing payments
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/StripeService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
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

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['amount'])) {
        throw new Exception('Amount is required');
    }

    $amount = intval($input['amount']); // Amount in smallest currency unit (bani for RON)
    $currency = $input['currency'] ?? 'ron';
    $description = $input['description'] ?? null;
    $invoiceId = $input['invoice_id'] ?? null;

    $stripeService = new StripeService();

    if (!$stripeService->isConfigured()) {
        throw new Exception('Stripe is not configured');
    }

    $result = $stripeService->createPaymentIntent($amount, $currency, [
        'description' => $description,
        'metadata' => [
            'company_id' => $companyId,
            'user_id' => $userData['user_id'],
            'invoice_id' => $invoiceId
        ]
    ]);

    if (!$result['success']) {
        throw new Exception($result['message']);
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'client_secret' => $result['client_secret'],
            'payment_intent_id' => $result['payment_intent_id']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
