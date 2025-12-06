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

    $asOfDate = $_GET['as_of_date'] ?? date('Y-m-d');

    $journalService = new JournalService();
    $trialBalance = $journalService->getTrialBalance($companyId, $asOfDate);

    // Calculate totals
    $totalDebits = 0;
    $totalCredits = 0;

    foreach ($trialBalance as $account) {
        $totalDebits += $account['total_debit'];
        $totalCredits += $account['total_credit'];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'trial_balance' => $trialBalance,
            'as_of_date' => $asOfDate,
            'totals' => [
                'total_debits' => $totalDebits,
                'total_credits' => $totalCredits,
                'difference' => abs($totalDebits - $totalCredits)
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
