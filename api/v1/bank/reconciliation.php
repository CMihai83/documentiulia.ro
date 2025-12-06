<?php
/**
 * Bank Reconciliation API
 * GET /api/v1/bank/reconciliation.php?bank_account_id=xxx - Get unreconciled transactions
 * GET /api/v1/bank/reconciliation.php?transaction_id=xxx&action=matches - Get potential matches
 * POST /api/v1/bank/reconciliation.php - Reconcile transaction
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/RomanianBankService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Authenticate
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

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $bankService = RomanianBankService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? 'list';

        if ($action === 'matches' && isset($_GET['transaction_id'])) {
            // Get potential matches for a transaction
            $transactionId = $_GET['transaction_id'];
            $matches = $bankService->findPotentialMatches($transactionId);

            echo json_encode([
                'success' => true,
                'data' => $matches
            ]);
        } else {
            // List unreconciled transactions
            $bankAccountId = $_GET['bank_account_id'] ?? '';
            if (!$bankAccountId) {
                throw new Exception('bank_account_id required');
            }

            $limit = intval($_GET['limit'] ?? 50);
            $transactions = $bankService->getUnreconciledTransactions($bankAccountId, $limit);

            echo json_encode([
                'success' => true,
                'data' => $transactions,
                'count' => count($transactions)
            ]);
        }
    } else {
        // POST - reconcile transaction
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            throw new Exception('Invalid JSON input');
        }

        $transactionId = $input['transaction_id'] ?? '';
        $matchType = $input['match_type'] ?? ''; // invoice, expense, bill
        $matchId = $input['match_id'] ?? '';

        if (!$transactionId || !$matchType || !$matchId) {
            throw new Exception('transaction_id, match_type, and match_id are required');
        }

        $success = $bankService->reconcileTransaction($transactionId, $matchType, $matchId);

        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Transaction reconciled' : 'Failed to reconcile'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
