<?php
/**
 * Download Invoice PDF
 *
 * Generates and downloads invoice as PDF
 *
 * @endpoint GET /download-pdf.php?invoice_id=xxx
 * @version 1.0.0
 */

require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/InvoicePDFService.php';

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

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $invoiceId = $_GET['invoice_id'] ?? null;

        if (!$invoiceId) {
            throw new Exception('Invoice ID required');
        }

        $db = Database::getInstance();

        // Verify invoice belongs to company
        $invoice = $db->fetchOne(
            "SELECT id, invoice_number FROM invoices
             WHERE id = $1 AND company_id = $2",
            [$invoiceId, $companyId]
        );

        if (!$invoice) {
            throw new Exception('Invoice not found');
        }

        // Generate PDF
        $pdfService = new InvoicePDFService();
        $pdfPath = $pdfService->generatePDF($invoiceId);

        // Send file to browser
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="invoice_' . $invoice['invoice_number'] . '.pdf"');
        header('Content-Length: ' . filesize($pdfPath));
        readfile($pdfPath);
        exit;

    } else {
        throw new Exception('Method not allowed');
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
