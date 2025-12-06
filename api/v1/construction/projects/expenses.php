<?php
/**
 * Project Expenses API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../services/ConstructionProjectService.php';
require_once __DIR__ . '/../../../helpers/headers.php';

$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

try {
    $projectService = ConstructionProjectService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $projectId = $_GET['project_id'] ?? null;
        if (!$projectId) {
            throw new Exception('project_id required');
        }
        $category = $_GET['category'] ?? null;
        $expenses = $projectService->getProjectExpenses($projectId, $category);
        echo json_encode(['success' => true, 'data' => $expenses, 'count' => count($expenses)]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['project_id']) || empty($input['description']) || !isset($input['amount'])) {
            throw new Exception('project_id, description and amount required');
        }
        $input['created_by'] = $auth['user_id'] ?? null;
        $expense = $projectService->addExpense($input['project_id'], $input);
        echo json_encode(['success' => true, 'data' => $expense]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $expenseId = $_GET['id'] ?? null;
        if (!$expenseId) {
            throw new Exception('Expense ID required');
        }
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("DELETE FROM project_expenses WHERE id = ?");
        $stmt->execute([$expenseId]);
        echo json_encode(['success' => $stmt->rowCount() > 0]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
