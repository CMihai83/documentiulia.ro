<?php
/**
 * e-Factura Batch Upload Endpoint
 * Uploads multiple invoices to ANAF in one operation
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../services/DatabaseService.php';
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../../includes/services/efactura/EFacturaService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    $invoiceIds = $input['invoice_ids'] ?? [];
    $companyId = getHeader('x-company-id') ?? $input['company_id'] ?? null;
    $continueOnError = $input['continue_on_error'] ?? true;

    if (empty($invoiceIds) || !is_array($invoiceIds)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invoice IDs array is required']);
        exit();
    }

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Company ID is required']);
        exit();
    }

    // Get database connection
    $db = DatabaseService::getInstance();
    $pdo = $db->getConnection();

    // Verify user has access to company
    $stmt = $pdo->prepare("
        SELECT 1 FROM company_users
        WHERE company_id = ? AND user_id = ?
    ");
    $stmt->execute([$companyId, $userData['id']]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied to this company']);
        exit();
    }

    // Verify all invoices belong to company and user has access
    $placeholders = str_repeat('?,', count($invoiceIds) - 1) . '?';
    $stmt = $pdo->prepare("
        SELECT i.id FROM invoices i
        JOIN company_users cu ON i.company_id = cu.company_id
        WHERE i.id IN ($placeholders)
        AND cu.company_id = ?
        AND cu.user_id = ?
    ");
    $stmt->execute(array_merge($invoiceIds, [$companyId, $userData['id']]));
    $accessibleInvoices = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($accessibleInvoices) !== count($invoiceIds)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied to some invoices']);
        exit();
    }

    // Initialize e-Factura service
    $service = new \DocumentIulia\Services\EFactura\EFacturaService($pdo);

    // Batch upload
    $result = $service->batchUploadInvoices($invoiceIds, $companyId, [
        'continue_on_error' => $continueOnError
    ]);

    $result['success'] = true;
    echo json_encode($result);

} catch (Exception $e) {
    error_log("e-Factura Batch Upload Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Batch upload failed',
        'error' => $e->getMessage()
    ]);
}
