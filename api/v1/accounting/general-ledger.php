<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/JournalService.php';
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

    $accountId = $_GET['account_id'] ?? null;
    if (!$accountId) {
        throw new Exception('Account ID is required');
    }

    $startDate = $_GET['start_date'] ?? date('Y-m-01');
    $endDate = $_GET['end_date'] ?? date('Y-m-t');

    $journalService = new JournalService();
    $ledger = $journalService->getGeneralLedger($companyId, $accountId, $startDate, $endDate);

    // Calculate running balance
    $runningBalance = 0;
    foreach ($ledger as &$entry) {
        $runningBalance += $entry['net_change'];
        $entry['running_balance'] = $runningBalance;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'ledger' => $ledger,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ]
        ]
    ]);

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
