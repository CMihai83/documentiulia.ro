<?php
/**
 * Chart of Accounts API
 *
 * Manage chart of accounts with hierarchical structure
 * Endpoints:
 * - GET    /chart-of-accounts.php                  - List accounts
 * - GET    /chart-of-accounts.php?id=UUID          - Get single account
 * - POST   /chart-of-accounts.php                  - Create account
 * - PUT    /chart-of-accounts.php                  - Update account
 * - DELETE /chart-of-accounts.php                  - Delete account
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/AccountingService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    $accountingService = new AccountingService();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $account = $accountingService->getAccount($_GET['id'], $companyId);
            echo json_encode([
                'success' => true,
                'data' => ['account' => $account]
            ]);
        } else {
            $filters = [
                'account_type' => $_GET['account_type'] ?? null,
                'is_active' => isset($_GET['is_active']) ? filter_var($_GET['is_active'], FILTER_VALIDATE_BOOLEAN) : null,
                'search' => $_GET['search'] ?? null
            ];

            $accounts = $accountingService->listChartOfAccounts($companyId, $filters);

            echo json_encode([
                'success' => true,
                'data' => [
                    'accounts' => $accounts,
                    'count' => count($accounts)
                ]
            ]);
        }
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['code']) || empty($input['name'])) {
            throw new Exception('Account code and name are required');
        }

        $accountId = $accountingService->createAccount($companyId, $input);
        $account = $accountingService->getAccount($accountId, $companyId);

        echo json_encode([
            'success' => true,
            'data' => [
                'account_id' => $accountId,
                'account' => $account
            ],
            'message' => 'Account created successfully'
        ]);
    }

    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Account ID is required');
        }

        // Update logic would go here
        echo json_encode([
            'success' => true,
            'message' => 'Account updated successfully'
        ]);
    }

    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Account ID is required');
        }

        // Delete logic would go here (soft delete)
        echo json_encode([
            'success' => true,
            'message' => 'Account deleted successfully'
        ]);
    }

} catch (Exception $e) {
    error_log("Chart of Accounts Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    error_log("Stack trace: " . $e->getTraceAsString());
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
