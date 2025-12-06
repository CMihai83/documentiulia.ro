<?php
/**
 * Create Invoice Endpoint
 * POST /api/v1/invoices/create
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/InvoiceService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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
    // Use case-insensitive header lookup
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company from header or request
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);

    // Accept 'client_name' as alias for 'customer_name'
    if (!empty($input['client_name']) && empty($input['customer_name'])) {
        $input['customer_name'] = $input['client_name'];
    }

    // If customer_name provided without customer_id, create or find customer
    if (empty($input['customer_id']) && !empty($input['customer_name'])) {
        require_once __DIR__ . '/../../config/database.php';
        $db = Database::getInstance()->getConnection();

        // Check if customer exists
        $stmt = $db->prepare("SELECT id FROM contacts WHERE company_id = :company_id AND display_name = :name AND contact_type = 'customer' LIMIT 1");
        $stmt->execute(['company_id' => $companyId, 'name' => $input['customer_name']]);
        $customer = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($customer) {
            $input['customer_id'] = $customer['id'];
        } else {
            // Create new customer
            $stmt = $db->prepare("INSERT INTO contacts (company_id, display_name, contact_type) VALUES (:company_id, :name, 'customer') RETURNING id");
            $stmt->execute(['company_id' => $companyId, 'name' => $input['customer_name']]);
            $input['customer_id'] = $stmt->fetch(PDO::FETCH_ASSOC)['id'];
        }
    }

    // Validate required fields
    if (empty($input['customer_id'])) {
        throw new Exception('Customer ID or customer_name is required');
    }

    // Accept 'items' as alias for 'line_items'
    if (empty($input['line_items']) && !empty($input['items'])) {
        $input['line_items'] = $input['items'];
    }

    if (empty($input['line_items']) || !is_array($input['line_items'])) {
        throw new Exception('At least one line item is required');
    }

    $invoiceService = new InvoiceService();
    $invoice = $invoiceService->createInvoice($companyId, $input);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Invoice created successfully',
        'data' => $invoice
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
