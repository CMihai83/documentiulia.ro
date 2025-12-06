<?php
/**
 * Update Expense Endpoint
 * PUT /api/v1/expenses/{id}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ExpenseService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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

    if (empty($input)) {
        throw new Exception('No data provided');
    }

    // Get expense ID from request body
    if (empty($input['id'])) {
        throw new Exception('Expense ID is required');
    }

    $expenseId = $input['id'];

    $expenseService = new ExpenseService();

    // Verify expense belongs to company
    $existingExpense = $expenseService->getExpense($expenseId);
    if (!$existingExpense || $existingExpense['company_id'] !== $companyId) {
        throw new Exception('Expense not found');
    }

    $expense = $expenseService->updateExpense($expenseId, $input);

    echo json_encode([
        'success' => true,
        'message' => 'Expense updated successfully',
        'data' => $expense
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
