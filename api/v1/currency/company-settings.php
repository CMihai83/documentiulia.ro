<?php
/**
 * Company Currency Settings API
 * GET /api/v1/currency/company-settings.php - Get settings
 * PUT /api/v1/currency/company-settings.php - Update settings
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthMiddleware.php';
require_once __DIR__ . '/../../services/CurrencyService.php';

// Require authentication
$auth = new AuthMiddleware();
$user = $auth->authenticate();

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $currencyService = CurrencyService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $settings = $currencyService->getCompanyCurrency($companyId);

        echo json_encode([
            'success' => true,
            'data' => $settings
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        $defaultCurrency = $input['default_currency'] ?? null;
        $baseCurrency = $input['base_currency'] ?? null;

        if (!$defaultCurrency) {
            throw new Exception('default_currency is required');
        }

        $currencyService->updateCompanyCurrency($companyId, $defaultCurrency, $baseCurrency);

        $settings = $currencyService->getCompanyCurrency($companyId);

        echo json_encode([
            'success' => true,
            'data' => $settings,
            'message' => 'Currency settings updated'
        ]);

    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
