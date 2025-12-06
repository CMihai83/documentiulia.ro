<?php
/**
 * Send Invoice Email with PDF Attachment
 *
 * Generates PDF and sends invoice via email
 *
 * @endpoint POST /send-email.php
 * @version 1.0.0
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/InvoicePDFService.php';
require_once __DIR__ . '/../../services/EmailService.php';

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

    // Get company from header
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['invoice_id'])) {
            throw new Exception('Invoice ID required');
        }

        $invoiceId = $input['invoice_id'];
        $db = Database::getInstance();

        // Verify invoice belongs to company
        $invoice = $db->fetchOne(
            "SELECT i.*, c.display_name as customer_name, c.email as customer_email, co.name as company_name
             FROM invoices i
             JOIN contacts c ON i.customer_id = c.id
             JOIN companies co ON i.company_id = co.id
             WHERE i.id = $1 AND i.company_id = $2",
            [$invoiceId, $companyId]
        );

        if (!$invoice) {
            throw new Exception('Invoice not found');
        }

        if (!$invoice['customer_email']) {
            throw new Exception('Customer email not found');
        }

        // Generate PDF
        $pdfService = new InvoicePDFService();
        $pdfPath = $pdfService->generatePDF($invoiceId);

        // Send email
        $emailService = new EmailService();
        $result = $emailService->sendInvoiceEmail($invoice, $pdfPath);

        // Update invoice last sent date
        $db->query(
            "UPDATE invoices SET last_sent_at = NOW() WHERE id = $1",
            [$invoiceId]
        );

        echo json_encode([
            'success' => true,
            'data' => [
                'pdf_path' => basename($pdfPath),
                'email_sent' => $result['success'],
                'recipient' => $invoice['customer_email']
            ],
            'message' => 'Invoice sent successfully'
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
