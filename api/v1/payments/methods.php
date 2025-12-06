<?php
/**
 * Payment Methods API Endpoint
 *
 * GET /api/v1/payments/methods.php
 *
 * Returns list of available payment methods for the company
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Authenticate request
$auth = authenticate();
$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

try {
    // Return available payment methods
    // These could be stored in database or configured per company
    $paymentMethods = [
        [
            'id' => 'card',
            'name' => 'Card de credit/debit',
            'description' => 'Visa, Mastercard, American Express',
            'type' => 'card',
            'enabled' => true,
            'icon' => 'credit-card',
            'processing_fee' => 1.5,
            'fee_type' => 'percentage'
        ],
        [
            'id' => 'bank_transfer',
            'name' => 'Transfer bancar',
            'description' => 'Transfer direct din contul bancar',
            'type' => 'bank',
            'enabled' => true,
            'icon' => 'building-columns',
            'processing_fee' => 0,
            'fee_type' => 'fixed'
        ],
        [
            'id' => 'cash',
            'name' => 'Numerar',
            'description' => 'Plata in numerar',
            'type' => 'cash',
            'enabled' => true,
            'icon' => 'money-bill',
            'processing_fee' => 0,
            'fee_type' => 'fixed'
        ],
        [
            'id' => 'stripe',
            'name' => 'Stripe',
            'description' => 'Plata online prin Stripe',
            'type' => 'online',
            'enabled' => true,
            'icon' => 'stripe',
            'processing_fee' => 2.9,
            'fee_type' => 'percentage'
        ]
    ];

    // Note: Stripe configuration check removed - external integration
    // In production, would check company's Stripe account status
    // For now, mark Stripe as requiring configuration
    foreach ($paymentMethods as &$method) {
        if ($method['id'] === 'stripe') {
            $method['enabled'] = false;
            $method['description'] = 'Necesita configurare Stripe';
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $paymentMethods,
        'count' => count($paymentMethods)
    ]);

} catch (Exception $e) {
    error_log("Payment methods error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve payment methods'
    ]);
}
