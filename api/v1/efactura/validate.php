<?php
/**
 * e-Factura Validate Invoice Endpoint
 * GET /api/v1/efactura/validate.php?invoice_id=xxx
 * Validates invoice for e-Factura requirements
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/EFacturaService.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $auth = authenticate();
    $pdo = Database::getInstance()->getConnection();

    $invoiceId = $_GET['invoice_id'] ?? null;

    if (!$invoiceId) {
        throw new Exception('Invoice ID is required', 400);
    }

    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required', 400);
    }

    // Verify access
    $stmt = $pdo->prepare("
        SELECT i.id FROM invoices i
        JOIN company_users cu ON i.company_id = cu.company_id
        WHERE i.id = :invoice_id AND cu.user_id = :user_id AND i.company_id = :company_id
    ");
    $stmt->execute([
        'invoice_id' => $invoiceId,
        'user_id' => $auth['user_id'],
        'company_id' => $companyId
    ]);

    if (!$stmt->fetch()) {
        throw new Exception('Invoice not found or access denied', 404);
    }

    $service = EFacturaService::getInstance();
    $validation = $service->validateInvoice($invoiceId);

    echo json_encode([
        'success' => true,
        'data' => $validation
    ]);

} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    http_response_code($code > 99 && $code < 600 ? $code : 500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
