<?php
/**
 * Get Company Endpoint
 * GET /api/v1/companies/{id}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    // Get company ID from URL or header
    $companyId = getHeader('x-company-id') ?? null;

    if (!$companyId) {
        // Try to get from URL path
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        $companyId = end($pathParts);
    }

    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance();

    // Verify user has access to this company
    $access = $db->fetchOne(
        "SELECT cu.role FROM company_users cu
         WHERE cu.company_id = :company_id AND cu.user_id = :user_id",
        ['company_id' => $companyId, 'user_id' => $userId]
    );

    if (!$access) {
        throw new Exception('Access denied');
    }

    // Get company details including address and tax fields
    $company = $db->fetchOne(
        "SELECT id, name, legal_name, tax_id, industry, base_currency,
                trade_register_number, vat_registered,
                address_street, address_city, address_county, address_postal_code, address_country,
                bank_account, bank_name, contact_email, contact_phone,
                default_language, default_currency, default_timezone,
                created_at FROM companies WHERE id = :id",
        ['id' => $companyId]
    );

    if (!$company) {
        throw new Exception('Company not found');
    }

    $company['user_role'] = $access['role'];

    echo json_encode([
        'success' => true,
        'data' => $company
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
