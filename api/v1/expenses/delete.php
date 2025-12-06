<?php
/**
 * Delete Expense Endpoint
 * DELETE /api/v1/expenses/{id}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ExpenseService.php';
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

    // Get expense ID from JSON body, query string, or URL path
    $input = json_decode(file_get_contents('php://input'), true);
    $expenseId = null;

    if (!empty($input['id'])) {
        $expenseId = $input['id'];
    } elseif (!empty($_GET['id'])) {
        $expenseId = $_GET['id'];
    } else {
        // Try to get from URL path (but not if it's delete.php)
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        $lastPart = end($pathParts);
        // Only use if it looks like a UUID, not a filename
        if (!str_contains($lastPart, '.php') && preg_match('/^[a-f0-9-]{36}$/i', $lastPart)) {
            $expenseId = $lastPart;
        }
    }

    if (empty($expenseId)) {
        throw new Exception('Expense ID is required (provide in body as "id" or query string ?id=UUID)');
    }

    $expenseService = new ExpenseService();

    // Verify expense belongs to company
    $existingExpense = $expenseService->getExpense($expenseId);
    if ($existingExpense['company_id'] !== $companyId) {
        throw new Exception('Expense not found');
    }

    $expenseService->deleteExpense($expenseId);

    echo json_encode([
        'success' => true,
        'message' => 'Expense deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
