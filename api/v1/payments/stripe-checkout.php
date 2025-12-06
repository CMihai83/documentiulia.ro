<?php
/**
 * Stripe Checkout Session Creator
 * POST /api/v1/payments/stripe-checkout
 *
 * Creates a Stripe checkout session for:
 * - Course purchases
 * - Subscription billing
 * - Invoice online payments
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate user
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get request body
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid request body');
    }

    // Validate required fields
    if (!isset($input['payment_type']) || !isset($input['amount'])) {
        throw new Exception('payment_type and amount are required');
    }

    $paymentType = $input['payment_type']; // 'course', 'subscription', 'invoice'
    $amount = floatval($input['amount']);
    $currency = $input['currency'] ?? 'EUR';
    $metadata = $input['metadata'] ?? [];

    // Validate amount
    if ($amount <= 0) {
        throw new Exception('Amount must be greater than 0');
    }

    // Load Stripe SDK
    require_once __DIR__ . '/../../../vendor/autoload.php';

    $db = Database::getInstance();

    // Create payment intent record in database
    $paymentIntentId = $db->insert('payment_intents', [
        'user_id' => $userData['id'],
        'payment_type' => $paymentType,
        'amount' => $amount,
        'currency' => strtoupper($currency),
        'status' => 'pending',
        'metadata' => json_encode($metadata),
        'created_at' => date('Y-m-d H:i:s')
    ]);

    // Construct success and cancel URLs
    $successUrl = $input['success_url'] ?? 'https://documentiulia.ro/payment/success';
    $cancelUrl = $input['cancel_url'] ?? 'https://documentiulia.ro/payment/cancel';

    // Get Stripe API key from environment
    $stripeSecretKey = getenv('STRIPE_SECRET_KEY');

    if (!$stripeSecretKey || strpos($stripeSecretKey, 'REPLACE') !== false) {
        // Stripe not configured yet - return placeholder response
        echo json_encode([
            'success' => true,
            'message' => 'Payment intent created (Stripe not configured)',
            'payment_intent_id' => $paymentIntentId,
            'configured' => false,
            'next_steps' => [
                'Get Stripe API keys from https://dashboard.stripe.com/apikeys',
                'Update STRIPE_SECRET_KEY in .env file',
                'Restart PHP-FPM to reload environment variables'
            ],
            'data' => [
                'payment_type' => $paymentType,
                'amount' => $amount,
                'currency' => $currency,
                'status' => 'pending'
            ]
        ]);
        exit;
    }

    // Initialize Stripe with API key
    \Stripe\Stripe::setApiKey($stripeSecretKey);

    // Create Stripe Checkout Session
    $session = \Stripe\Checkout\Session::create([
        'payment_method_types' => ['card'],
        'line_items' => [[
            'price_data' => [
                'currency' => $currency,
                'product_data' => [
                    'name' => $metadata['description'] ?? 'Payment',
                ],
                'unit_amount' => $amount * 100, // Stripe expects cents
            ],
            'quantity' => 1,
        ]],
        'mode' => $paymentType === 'subscription' ? 'subscription' : 'payment',
        'success_url' => $successUrl . '?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => $cancelUrl,
        'metadata' => array_merge($metadata, [
            'payment_intent_id' => $paymentIntentId,
            'user_id' => $userData['id']
        ]),
        'customer_email' => $userData['email'] ?? null
    ]);

    // Update payment intent with Stripe session ID
    $db->update('payment_intents', [
        'stripe_session_id' => $session->id,
        'updated_at' => date('Y-m-d H:i:s')
    ], ['id' => $paymentIntentId]);

    echo json_encode([
        'success' => true,
        'checkout_url' => $session->url,
        'session_id' => $session->id,
        'payment_intent_id' => $paymentIntentId,
        'configured' => true
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
