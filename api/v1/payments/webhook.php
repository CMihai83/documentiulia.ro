<?php
/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events:
 * - checkout.session.completed
 * - payment_intent.succeeded
 * - payment_intent.failed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 *
 * @version 1.0.0
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../services/PaymentService.php';

// Disable authentication for webhooks (Stripe handles verification)
try {
    // Get raw POST body
    $payload = @file_get_contents('php://input');
    $signature = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

    if (!$signature) {
        throw new Exception('No signature provided');
    }

    $paymentService = new PaymentService();
    $result = $paymentService->processWebhook($payload, $signature);

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
