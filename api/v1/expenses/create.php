<?php
/**
 * Create Expense Endpoint
 * POST /api/v1/expenses/create
 * Supports multipart/form-data for receipt upload
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ExpenseService.php';
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

    if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company from header
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    // Handle multipart/form-data (with file upload) or JSON
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (strpos($contentType, 'multipart/form-data') !== false) {
        // Form data with file upload
        $data = $_POST;
        $receiptFile = $_FILES['receipt'] ?? null;
    } else {
        // JSON data
        $data = json_decode(file_get_contents('php://input'), true);
        $receiptFile = null;
    }

    // Validate required fields
    if (empty($data['amount'])) {
        throw new Exception('Amount is required');
    }

    if (empty($data['description'])) {
        throw new Exception('Description is required');
    }

    $expenseService = new ExpenseService();

    // Auto-categorize if category not provided
    if (empty($data['category'])) {
        $data['category'] = $expenseService->categorizeExpense($data['description'], $data['vendor_name'] ?? null);
    }

    $expense = $expenseService->createExpense($companyId, $data, $receiptFile);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Expense created successfully',
        'data' => $expense
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
