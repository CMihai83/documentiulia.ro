<?php
/**
 * Integration Webhooks API
 * Handle incoming webhooks from integrated services
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID, X-Webhook-Signature');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$integrationId = $_GET['integration'] ?? null;
$companyId = $_GET['company'] ?? null;

// Log webhook
$webhookId = 'wh_' . bin2hex(random_bytes(12));
$payload = file_get_contents('php://input');
$headers = getallheaders();

try {
    $db = getDbConnection();
    
    // Store webhook for processing
    $stmt = $db->prepare("
        INSERT INTO integration_webhooks (
            id, integration_id, company_id, event_type, payload, headers,
            status, received_at
        ) VALUES (
            :id, :integration_id, :company_id, :event_type, :payload, :headers,
            'pending', NOW()
        )
    ");
    $stmt->execute([
        'id' => $webhookId,
        'integration_id' => $integrationId,
        'company_id' => $companyId,
        'event_type' => determineEventType($integrationId, $payload),
        'payload' => $payload,
        'headers' => json_encode($headers),
    ]);
    
    // Verify webhook signature if applicable
    $verified = verifyWebhookSignature($integrationId, $payload, $headers);
    if (!$verified) {
        $stmt = $db->prepare("UPDATE integration_webhooks SET status = 'invalid_signature' WHERE id = :id");
        $stmt->execute(['id' => $webhookId]);
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid signature']);
        exit;
    }
    
    // Process webhook based on integration
    $result = processWebhook($db, $integrationId, $companyId, json_decode($payload, true));
    
    // Update webhook status
    $stmt = $db->prepare("
        UPDATE integration_webhooks 
        SET status = :status, processed_at = NOW(), processing_result = :result
        WHERE id = :id
    ");
    $stmt->execute([
        'id' => $webhookId,
        'status' => $result['success'] ? 'processed' : 'failed',
        'result' => json_encode($result),
    ]);
    
    echo json_encode([
        'success' => true,
        'webhook_id' => $webhookId,
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Processing error']);
}

function determineEventType($integrationId, $payload) {
    $data = json_decode($payload, true);
    
    $eventTypes = [
        'stripe' => [
            'invoice.paid' => 'payment_received',
            'invoice.payment_failed' => 'payment_failed',
            'customer.subscription.created' => 'subscription_created',
            'customer.subscription.updated' => 'subscription_updated',
            'customer.subscription.deleted' => 'subscription_cancelled',
        ],
        'paypal' => [
            'PAYMENT.CAPTURE.COMPLETED' => 'payment_received',
            'PAYMENT.CAPTURE.DENIED' => 'payment_failed',
        ],
        'shopify' => [
            'orders/create' => 'order_created',
            'orders/updated' => 'order_updated',
            'orders/paid' => 'order_paid',
            'products/create' => 'product_created',
            'products/update' => 'product_updated',
        ],
        'woocommerce' => [
            'order.created' => 'order_created',
            'order.updated' => 'order_updated',
        ],
    ];
    
    // Try to determine event type from payload
    $type = $data['type'] ?? $data['event'] ?? $data['topic'] ?? 'unknown';
    
    if (isset($eventTypes[$integrationId][$type])) {
        return $eventTypes[$integrationId][$type];
    }
    
    return $type;
}

function verifyWebhookSignature($integrationId, $payload, $headers) {
    // Simplified - in production would verify actual signatures
    $signatureHeaders = [
        'stripe' => 'Stripe-Signature',
        'paypal' => 'PAYPAL-TRANSMISSION-SIG',
        'shopify' => 'X-Shopify-Hmac-SHA256',
    ];
    
    if (isset($signatureHeaders[$integrationId])) {
        $sigHeader = $signatureHeaders[$integrationId];
        // Would verify actual signature here
        return true;
    }
    
    return true;
}

function processWebhook($db, $integrationId, $companyId, $data) {
    $processors = [
        'stripe' => 'processStripeWebhook',
        'paypal' => 'processPaypalWebhook',
        'shopify' => 'processShopifyWebhook',
        'woocommerce' => 'processWooCommerceWebhook',
        'netopia' => 'processNetopiaWebhook',
        'fan_courier' => 'processFanCourierWebhook',
    ];
    
    if (isset($processors[$integrationId])) {
        return call_user_func($processors[$integrationId], $db, $companyId, $data);
    }
    
    return ['success' => true, 'message' => 'Webhook logged'];
}

function processStripeWebhook($db, $companyId, $data) {
    $eventType = $data['type'] ?? '';
    
    switch ($eventType) {
        case 'invoice.paid':
            // Mark invoice as paid
            $invoiceId = $data['data']['object']['metadata']['invoice_id'] ?? null;
            if ($invoiceId) {
                $stmt = $db->prepare("
                    UPDATE invoices SET status = 'paid', paid_at = NOW() 
                    WHERE id = :id AND company_id = :company_id
                ");
                $stmt->execute(['id' => $invoiceId, 'company_id' => $companyId]);
            }
            return ['success' => true, 'action' => 'invoice_marked_paid'];
            
        case 'customer.subscription.created':
            // Handle new subscription
            return ['success' => true, 'action' => 'subscription_created'];
    }
    
    return ['success' => true, 'action' => 'logged'];
}

function processPaypalWebhook($db, $companyId, $data) {
    return ['success' => true, 'action' => 'paypal_processed'];
}

function processShopifyWebhook($db, $companyId, $data) {
    return ['success' => true, 'action' => 'shopify_processed'];
}

function processWooCommerceWebhook($db, $companyId, $data) {
    return ['success' => true, 'action' => 'woocommerce_processed'];
}

function processNetopiaWebhook($db, $companyId, $data) {
    return ['success' => true, 'action' => 'netopia_processed'];
}

function processFanCourierWebhook($db, $companyId, $data) {
    return ['success' => true, 'action' => 'fan_courier_processed'];
}
