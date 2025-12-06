<?php
/**
 * Stripe Configuration API Endpoint
 *
 * GET /api/v1/payments/stripe-config.php
 * Returns Stripe publishable key for frontend integration
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/StripeService.php';

try {
    $stripeService = new StripeService();

    if (!$stripeService->isConfigured()) {
        echo json_encode([
            'success' => true,
            'data' => [
                'configured' => false,
                'message' => 'Stripe is not configured. Contact administrator.'
            ]
        ]);
        exit();
    }

    $publishableKey = $stripeService->getPublishableKey();

    echo json_encode([
        'success' => true,
        'data' => [
            'configured' => true,
            'publishable_key' => $publishableKey
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to get Stripe configuration'
    ]);
}
