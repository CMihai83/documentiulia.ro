<?php
/**
 * Delete Invoice Endpoint
 * DELETE /api/v1/invoices/{id}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/InvoiceService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company from header
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    // Get invoice ID from JSON body, query string, or URL path
    $input = json_decode(file_get_contents('php://input'), true);
    $invoiceId = null;

    if (!empty($input['id'])) {
        $invoiceId = $input['id'];
    } elseif (!empty($_GET['id'])) {
        $invoiceId = $_GET['id'];
    } else {
        // Try to get from URL path (but not if it's delete.php)
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        $lastPart = end($pathParts);
        // Only use if it looks like a UUID, not a filename
        if (!str_contains($lastPart, '.php') && preg_match('/^[a-f0-9-]{36}$/i', $lastPart)) {
            $invoiceId = $lastPart;
        }
    }

    if (empty($invoiceId)) {
        throw new Exception('Invoice ID is required (provide in body as "id" or query string ?id=UUID)');
    }

    $invoiceService = new InvoiceService();

    // Verify invoice belongs to company
    $existingInvoice = $invoiceService->getInvoice($invoiceId);
    if ($existingInvoice['company_id'] !== $companyId) {
        throw new Exception('Invoice not found');
    }

    $invoiceService->deleteInvoice($invoiceId);

    echo json_encode([
        'success' => true,
        'message' => 'Invoice deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
