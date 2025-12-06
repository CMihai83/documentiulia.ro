<?php
/**
 * Bank Transactions Management
 *
 * GET /api/v1/bank/transactions - List transactions with filtering
 * PUT /api/v1/bank/transactions/{id} - Update transaction category
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/TransactionSyncService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company ID
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $syncService = new TransactionSyncService();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // List transactions with filtering
        $filters = [];

        if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
            $filters['date_from'] = $_GET['date_from'];
        }
        if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
            $filters['date_to'] = $_GET['date_to'];
        }
        if (isset($_GET['category']) && !empty($_GET['category'])) {
            $filters['category'] = $_GET['category'];
        }
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $filters['status'] = $_GET['status'];
        }
        if (isset($_GET['connection_id']) && !empty($_GET['connection_id'])) {
            $filters['connection_id'] = $_GET['connection_id'];
        }

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $transactions = $syncService->getTransactions($companyId, $filters, $limit, $offset);

        echo json_encode([
            'success' => true,
            'data' => $transactions,
            'count' => count($transactions),
            'filters' => $filters,
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset
            ]
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Update transaction category
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['transaction_id']) || empty($input['transaction_id'])) {
            throw new Exception('Transaction ID required');
        }
        if (!isset($input['category']) || empty($input['category'])) {
            throw new Exception('Category required');
        }

        $transactionId = $input['transaction_id'];
        $category = $input['category'];
        $subcategory = $input['subcategory'] ?? null;

        // Update transaction
        $database = Database::getInstance();
        $db = $database->getConnection();

        $query = "UPDATE bank_transactions SET
                  category = :category,
                  subcategory = :subcategory,
                  category_confidence = 100.0,
                  updated_at = CURRENT_TIMESTAMP
                  WHERE id = :transaction_id AND company_id = :company_id";

        $stmt = $db->prepare($query);
        $stmt->execute([
            ':transaction_id' => $transactionId,
            ':category' => $category,
            ':subcategory' => $subcategory,
            ':company_id' => $companyId
        ]);

        if ($stmt->rowCount() === 0) {
            throw new Exception('Transaction not found or not updated');
        }

        echo json_encode([
            'success' => true,
            'message' => 'Transaction category updated successfully'
        ]);
    }

} catch (Throwable $e) {
    $statusCode = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
