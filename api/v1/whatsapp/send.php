<?php
/**
 * WhatsApp Send Message API
 * POST - Send various types of WhatsApp messages
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/WhatsAppBusinessService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Authenticate
$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    $messageType = $input['type'] ?? 'text';
    $phone = $input['phone'] ?? '';
    $contactId = $input['contact_id'] ?? null;

    if (empty($phone)) {
        throw new Exception('Phone number required');
    }

    $whatsappService = WhatsAppBusinessService::getInstance();

    $result = match($messageType) {
        'invoice' => $whatsappService->sendInvoiceNotification(
            $companyId,
            $phone,
            $input['invoice_data'] ?? [],
            $contactId
        ),
        'payment_reminder' => $whatsappService->sendPaymentReminder(
            $companyId,
            $phone,
            $input['invoice_data'] ?? [],
            $contactId
        ),
        'payment_received' => $whatsappService->sendPaymentConfirmation(
            $companyId,
            $phone,
            $input['payment_data'] ?? [],
            $contactId
        ),
        'estimate' => $whatsappService->sendEstimateNotification(
            $companyId,
            $phone,
            $input['estimate_data'] ?? [],
            $contactId
        ),
        'appointment' => $whatsappService->sendAppointmentReminder(
            $companyId,
            $phone,
            $input['appointment_data'] ?? [],
            $contactId
        ),
        'document' => $whatsappService->sendDocument(
            $companyId,
            $phone,
            $input['document_url'] ?? '',
            $input['filename'] ?? 'document.pdf',
            $input['caption'] ?? null,
            $contactId
        ),
        'text' => $whatsappService->sendTextMessage(
            $companyId,
            $phone,
            $input['message'] ?? '',
            $contactId
        ),
        'template' => $whatsappService->sendTemplateMessage(
            $companyId,
            $phone,
            $input['template_key'] ?? '',
            $input['parameters'] ?? [],
            $contactId
        ),
        default => throw new Exception("Unknown message type: {$messageType}")
    };

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
