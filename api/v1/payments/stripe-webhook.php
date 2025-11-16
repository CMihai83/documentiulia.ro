<?php
/**
 * Stripe Webhook Handler
 * POST /api/v1/payments/stripe-webhook
 *
 * Handles Stripe webhook events:
 * - checkout.session.completed
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - invoice.payment_succeeded (for subscriptions)
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/database.php';

// Get raw webhook payload
$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

try {
    $db = Database::getInstance();

    // TODO: When Stripe SDK is installed, verify webhook signature
    /*
    \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
    $endpoint_secret = $_ENV['STRIPE_WEBHOOK_SECRET'];

    $event = \Stripe\Webhook::constructEvent(
        $payload, $sig_header, $endpoint_secret
    );
    */

    // FOR NOW: Parse JSON payload directly (INSECURE - MUST ADD SIGNATURE VERIFICATION)
    $event = json_decode($payload, true);

    if (!$event || !isset($event['type'])) {
        throw new Exception('Invalid webhook payload');
    }

    // Log webhook event
    $webhookLogId = $db->insert('stripe_webhook_logs', [
        'event_type' => $event['type'],
        'payload' => $payload,
        'processed' => false,
        'created_at' => date('Y-m-d H:i:s')
    ]);

    // Handle different event types
    switch ($event['type']) {
        case 'checkout.session.completed':
            handleCheckoutCompleted($db, $event['data']['object']);
            break;

        case 'payment_intent.succeeded':
            handlePaymentSucceeded($db, $event['data']['object']);
            break;

        case 'payment_intent.payment_failed':
            handlePaymentFailed($db, $event['data']['object']);
            break;

        case 'invoice.payment_succeeded':
            handleSubscriptionPayment($db, $event['data']['object']);
            break;

        default:
            // Log unhandled event type
            error_log("Unhandled Stripe event type: " . $event['type']);
    }

    // Mark webhook as processed
    $db->update('stripe_webhook_logs', [
        'processed' => true,
        'updated_at' => date('Y-m-d H:i:s')
    ], ['id' => $webhookLogId]);

    http_response_code(200);
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

/**
 * Handle completed checkout session
 */
function handleCheckoutCompleted($db, $session) {
    $paymentIntentId = $session['metadata']['payment_intent_id'] ?? null;
    $userId = $session['metadata']['user_id'] ?? null;

    if (!$paymentIntentId) {
        error_log('No payment_intent_id in checkout session metadata');
        return;
    }

    // Update payment intent
    $db->update('payment_intents', [
        'status' => 'completed',
        'stripe_session_id' => $session['id'],
        'stripe_payment_intent' => $session['payment_intent'] ?? null,
        'updated_at' => date('Y-m-d H:i:s')
    ], ['id' => $paymentIntentId]);

    // Get payment intent details
    $paymentIntent = $db->fetchOne(
        'SELECT * FROM payment_intents WHERE id = :id',
        ['id' => $paymentIntentId]
    );

    if (!$paymentIntent) {
        error_log('Payment intent not found: ' . $paymentIntentId);
        return;
    }

    $metadata = json_decode($paymentIntent['metadata'], true);

    // Handle different payment types
    switch ($paymentIntent['payment_type']) {
        case 'course':
            enrollUserInCourse($db, $userId, $metadata['course_id'] ?? null);
            break;

        case 'subscription':
            activateSubscription($db, $userId, $metadata['plan_id'] ?? null);
            break;

        case 'invoice':
            markInvoiceAsPaid($db, $metadata['invoice_id'] ?? null, $paymentIntent['amount']);
            break;
    }

    // TODO: Send confirmation email
    // sendPaymentConfirmationEmail($userId, $paymentIntent);
}

/**
 * Handle successful payment intent
 */
function handlePaymentSucceeded($db, $paymentIntent) {
    // Update any records associated with this payment intent
    error_log('Payment succeeded: ' . $paymentIntent['id']);
}

/**
 * Handle failed payment intent
 */
function handlePaymentFailed($db, $paymentIntent) {
    // Update payment intent status
    $db->query(
        'UPDATE payment_intents SET status = :status WHERE stripe_payment_intent = :stripe_id',
        ['status' => 'failed', 'stripe_id' => $paymentIntent['id']]
    );

    // TODO: Send payment failed email
    error_log('Payment failed: ' . $paymentIntent['id']);
}

/**
 * Handle subscription payment
 */
function handleSubscriptionPayment($db, $invoice) {
    // Handle recurring subscription payments
    error_log('Subscription payment succeeded: ' . $invoice['id']);
}

/**
 * Enroll user in course after payment
 */
function enrollUserInCourse($db, $userId, $courseId) {
    if (!$userId || !$courseId) {
        return;
    }

    try {
        $db->insert('course_enrollments', [
            'user_id' => $userId,
            'course_id' => $courseId,
            'enrollment_date' => date('Y-m-d H:i:s'),
            'status' => 'active',
            'progress' => 0
        ]);

        error_log("Enrolled user $userId in course $courseId");
    } catch (Exception $e) {
        error_log("Failed to enroll user: " . $e->getMessage());
    }
}

/**
 * Activate user subscription
 */
function activateSubscription($db, $userId, $planId) {
    if (!$userId || !$planId) {
        return;
    }

    try {
        $db->insert('subscriptions', [
            'user_id' => $userId,
            'plan_id' => $planId,
            'status' => 'active',
            'start_date' => date('Y-m-d'),
            'next_billing_date' => date('Y-m-d', strtotime('+1 month'))
        ]);

        error_log("Activated subscription for user $userId, plan $planId");
    } catch (Exception $e) {
        error_log("Failed to activate subscription: " . $e->getMessage());
    }
}

/**
 * Mark invoice as paid
 */
function markInvoiceAsPaid($db, $invoiceId, $amount) {
    if (!$invoiceId) {
        return;
    }

    try {
        $db->update('invoices', [
            'status' => 'paid',
            'amount_paid' => $amount,
            'amount_due' => 0,
            'payment_date' => date('Y-m-d')
        ], ['id' => $invoiceId]);

        error_log("Marked invoice $invoiceId as paid");
    } catch (Exception $e) {
        error_log("Failed to mark invoice as paid: " . $e->getMessage());
    }
}
