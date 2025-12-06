<?php
/**
 * Update Company Endpoint
 * PUT /api/v1/companies/{id}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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

    // Verify user has owner/admin access to this company
    $access = $db->fetchOne(
        "SELECT cu.role FROM company_users cu
         WHERE cu.company_id = :company_id AND cu.user_id = :user_id",
        ['company_id' => $companyId, 'user_id' => $userId]
    );

    if (!$access || !in_array($access['role'], ['owner', 'admin'])) {
        throw new Exception('Insufficient permissions');
    }

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input)) {
        throw new Exception('No data provided');
    }

    $updateData = [];
    $allowedFields = ['name', 'industry', 'currency'];

    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updateData[$field] = $input[$field];
        }
    }

    if (empty($updateData)) {
        throw new Exception('No valid fields to update');
    }

    $db->update('companies', $updateData, "id = '$companyId'");

    // Get updated company
    $company = $db->fetchOne(
        "SELECT id, name, industry, currency, is_active, created_at FROM companies WHERE id = :id",
        ['id' => $companyId]
    );

    echo json_encode([
        'success' => true,
        'message' => 'Company updated successfully',
        'data' => $company
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
