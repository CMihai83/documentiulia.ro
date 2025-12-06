<?php
/**
 * Get list of supported banks/institutions
 *
 * GET /api/v1/bank/institutions?provider=nordigen&country=RO
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/BankIntegrationService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get parameters
    $provider = $_GET['provider'] ?? 'nordigen';
    $country = $_GET['country'] ?? 'RO';

    // Validate provider
    $validProviders = ['nordigen', 'salt_edge'];
    if (!in_array($provider, $validProviders)) {
        throw new Exception("Invalid provider. Must be one of: " . implode(', ', $validProviders));
    }

    // Get institutions
    $bankService = new BankIntegrationService();
    $institutions = $bankService->getInstitutions($provider, $country);

    echo json_encode([
        'success' => true,
        'data' => $institutions,
        'count' => count($institutions)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
