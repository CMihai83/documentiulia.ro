<?php
/**
 * Financial Reports API
 *
 * Generate financial statements and reports
 * Endpoints:
 * - GET /reports.php?type=trial_balance          - Trial Balance
 * - GET /reports.php?type=balance_sheet          - Balance Sheet
 * - GET /reports.php?type=income_statement       - Income Statement (P&L)
 * - GET /reports.php?type=cash_flow              - Cash Flow Statement
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

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $reportType = $_GET['type'] ?? null;

        if (!$reportType) {
            throw new Exception('Report type is required');
        }

        $asOfDate = $_GET['as_of_date'] ?? date('Y-m-d');
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-t');

        switch ($reportType) {
            case 'trial_balance':
                $data = $accountingService->getTrialBalance($companyId, $asOfDate);
                break;

            case 'balance_sheet':
                $data = $accountingService->getBalanceSheet($companyId, $asOfDate);
                break;

            case 'income_statement':
            case 'profit_loss':
                $data = $accountingService->getIncomeStatement($companyId, $startDate, $endDate);
                break;

            case 'cash_flow':
                $data = $accountingService->getCashFlowStatement($companyId, $startDate, $endDate);
                break;

            default:
                throw new Exception('Invalid report type');
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'report_type' => $reportType,
                'report_data' => $data,
                'parameters' => [
                    'as_of_date' => $asOfDate,
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ]
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
