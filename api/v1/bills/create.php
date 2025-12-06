<?php
/**
 * Create Bill Endpoint
 * POST /api/v1/bills/create
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/BillService.php';
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

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);

    // If vendor_name provided without vendor_id, create or find vendor
    if (empty($input['vendor_id']) && !empty($input['vendor_name'])) {
        $db = Database::getInstance()->getConnection();

        // Check if vendor exists
        $stmt = $db->prepare("SELECT id FROM contacts WHERE company_id = :company_id AND display_name = :name AND contact_type = 'vendor' LIMIT 1");
        $stmt->execute(['company_id' => $companyId, 'name' => $input['vendor_name']]);
        $vendor = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($vendor) {
            $input['vendor_id'] = $vendor['id'];
        } else {
            // Create new vendor
            $stmt = $db->prepare("INSERT INTO contacts (company_id, display_name, contact_type) VALUES (:company_id, :name, 'vendor') RETURNING id");
            $stmt->execute(['company_id' => $companyId, 'name' => $input['vendor_name']]);
            $input['vendor_id'] = $stmt->fetch(PDO::FETCH_ASSOC)['id'];
        }
    }

    // Validate vendor
    if (empty($input['vendor_id'])) {
        throw new Exception('Vendor ID or vendor_name is required');
    }

    // If simple amount provided without line_items, create single line item
    if ((empty($input['line_items']) || !is_array($input['line_items'])) && !empty($input['amount'])) {
        $input['line_items'] = [[
            'description' => $input['description'] ?? 'Bill item',
            'quantity' => 1,
            'unit_price' => $input['amount'],
            'amount' => $input['amount']
        ]];
    }

    if (empty($input['line_items']) || !is_array($input['line_items'])) {
        throw new Exception('At least one line item or amount is required');
    }

    $billService = new BillService();
    $bill = $billService->createBill($companyId, $input);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Bill created successfully',
        'data' => $bill
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
