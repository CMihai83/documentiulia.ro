<?php
/**
 * Invoice Get API
 * GET /api/v1/invoices/get.php?id=UUID - Get single invoice
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    $auth = authenticate();
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    $invoiceId = $_GET['id'] ?? null;
    if (!$invoiceId) {
        throw new Exception('Invoice ID is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    // Get invoice with customer details
    $stmt = $db->prepare("
        SELECT
            i.*,
            c.display_name as customer_name,
            c.email as customer_email,
            c.phone as customer_phone
        FROM invoices i
        LEFT JOIN contacts c ON i.customer_id = c.id
        WHERE i.id = :id AND i.company_id = :company_id
    ");

    $stmt->execute([
        'id' => $invoiceId,
        'company_id' => $companyId
    ]);

    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$invoice) {
        throw new Exception('Invoice not found', 404);
    }

    // Get line items
    $lineItemsStmt = $db->prepare("
        SELECT * FROM invoice_line_items
        WHERE invoice_id = :invoice_id
        ORDER BY line_number
    ");
    $lineItemsStmt->execute(['invoice_id' => $invoiceId]);
    $lineItems = $lineItemsStmt->fetchAll(PDO::FETCH_ASSOC);

    $invoice['line_items'] = $lineItems;

    echo json_encode([
        'success' => true,
        'data' => $invoice
    ]);

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
