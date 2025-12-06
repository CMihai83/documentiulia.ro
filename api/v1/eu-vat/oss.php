<?php
/**
 * OSS (One-Stop Shop) API
 * GET /api/v1/eu-vat/oss.php - Get OSS registration
 * GET /api/v1/eu-vat/oss.php?report=YYYY-MM - Get OSS report for period
 * POST /api/v1/eu-vat/oss.php?action=register - Register for OSS
 * POST /api/v1/eu-vat/oss.php?action=sale - Record OSS sale
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/EUVATService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '');

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Authorization required']);
        exit();
    }

    $auth = new AuthService();
    try {
        $userData = $auth->verifyToken($matches[1]);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        exit();
    }

    $companyId = getHeader('x-company-id');
    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Company ID required']);
        exit();
    }

    $vatService = EUVATService::getInstance();
    $action = $_GET['action'] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $reportPeriod = $_GET['report'] ?? null;

        if ($reportPeriod) {
            // Get OSS report for period
            $report = $vatService->getOSSReport($companyId, $reportPeriod);
            echo json_encode(['success' => true, 'data' => $report]);
        } else {
            // Get OSS registration status
            $registration = $vatService->getOSSRegistration($companyId);
            echo json_encode([
                'success' => true,
                'data' => [
                    'registered' => $registration !== null,
                    'registration' => $registration
                ]
            ]);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if ($action === 'register') {
            // Register for OSS
            $registrationCountry = $input['registration_country'] ?? 'RO';
            $registration = $vatService->registerOSS($companyId, $registrationCountry);
            echo json_encode([
                'success' => true,
                'data' => $registration,
                'message' => 'OSS registration successful'
            ]);
        } elseif ($action === 'sale') {
            // Record OSS sale
            $sale = $vatService->recordOSSSale($companyId, $input);
            echo json_encode([
                'success' => true,
                'data' => $sale,
                'message' => 'OSS sale recorded'
            ]);
        } else {
            throw new Exception('Invalid action. Use register or sale');
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
