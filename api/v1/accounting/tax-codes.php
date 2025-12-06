<?php
/**
 * Tax Codes API
 *
 * Manage tax codes (VAT, sales tax, etc.)
 * Endpoints:
 * - GET  /tax-codes.php           - List tax codes
 * - POST /tax-codes.php           - Create tax code
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
        $filters = [
            'is_active' => isset($_GET['is_active']) ? filter_var($_GET['is_active'], FILTER_VALIDATE_BOOLEAN) : null
        ];

        $taxCodes = $accountingService->listTaxCodes($companyId, $filters);

        echo json_encode([
            'success' => true,
            'data' => [
                'tax_codes' => $taxCodes,
                'count' => count($taxCodes)
            ]
        ]);
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $taxCodeId = $accountingService->createTaxCode($companyId, $input);

        echo json_encode([
            'success' => true,
            'data' => ['tax_code_id' => $taxCodeId],
            'message' => 'Tax code created successfully'
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
