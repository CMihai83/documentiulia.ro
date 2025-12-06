<?php
/**
 * WhatsApp Webhook Endpoint
 * GET - Webhook verification
 * POST - Receive webhook events
 */

header('Content-Type: application/json');

// Webhook verification (GET request from Meta)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $verifyToken = $_ENV['WHATSAPP_WEBHOOK_VERIFY_TOKEN'] ?? getenv('WHATSAPP_WEBHOOK_VERIFY_TOKEN') ?: 'documentiulia_webhook_2024';

    $mode = $_GET['hub_mode'] ?? '';
    $token = $_GET['hub_verify_token'] ?? '';
    $challenge = $_GET['hub_challenge'] ?? '';

    if ($mode === 'subscribe' && $token === $verifyToken) {
        http_response_code(200);
        echo $challenge;
    } else {
        http_response_code(403);
        echo 'Forbidden';
    }
    exit();
}

// Process webhook events (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once __DIR__ . '/../../services/WhatsAppBusinessService.php';

    $payload = json_decode(file_get_contents('php://input'), true);

    if (!$payload) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid payload']);
        exit();
    }

    try {
        $whatsappService = WhatsAppBusinessService::getInstance();
        $result = $whatsappService->processWebhook($payload);

        // Always return 200 to acknowledge receipt
        http_response_code(200);
        echo json_encode(['success' => true, 'processed' => $result['processed']]);

    } catch (Exception $e) {
        // Log error but still return 200 to prevent retries
        error_log('WhatsApp webhook error: ' . $e->getMessage());
        http_response_code(200);
        echo json_encode(['success' => true, 'note' => 'Error logged']);
    }
    exit();
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
