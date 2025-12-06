<?php
/**
 * e-Factura Generate XML Endpoint
 * GET /api/v1/efactura/generate-xml.php?invoice_id=xxx
 * Returns UBL 2.1 XML for invoice preview/download
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/EFacturaService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $auth = authenticate();
    $pdo = Database::getInstance()->getConnection();

    $invoiceId = $_GET['invoice_id'] ?? null;
    $download = isset($_GET['download']) && $_GET['download'] === 'true';

    if (!$invoiceId) {
        header('Content-Type: application/json');
        throw new Exception('Invoice ID is required', 400);
    }

    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        header('Content-Type: application/json');
        throw new Exception('Company ID required', 400);
    }

    // Verify access
    $stmt = $pdo->prepare("
        SELECT i.invoice_number FROM invoices i
        JOIN company_users cu ON i.company_id = cu.company_id
        WHERE i.id = :invoice_id AND cu.user_id = :user_id AND i.company_id = :company_id
    ");
    $stmt->execute([
        'invoice_id' => $invoiceId,
        'user_id' => $auth['user_id'],
        'company_id' => $companyId
    ]);
    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$invoice) {
        header('Content-Type: application/json');
        throw new Exception('Invoice not found or access denied', 404);
    }

    $service = EFacturaService::getInstance();
    $xml = $service->generateXML($invoiceId);

    if ($download) {
        header('Content-Type: application/xml');
        header('Content-Disposition: attachment; filename="efactura_' . $invoice['invoice_number'] . '.xml"');
    } else {
        header('Content-Type: application/xml');
    }

    echo $xml;

} catch (Exception $e) {
    header('Content-Type: application/json');
    $code = $e->getCode() ?: 500;
    http_response_code($code > 99 && $code < 600 ? $code : 500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
