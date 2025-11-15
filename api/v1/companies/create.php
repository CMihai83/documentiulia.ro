<?php
/**
 * Create Company Endpoint
 * POST /api/v1/companies/create
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get authorization token
    // Use case-insensitive header lookup
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $token = $matches[1];
    $auth = new AuthService();
    $userData = $auth->verifyToken($token);

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['company_name'])) {
        throw new Exception('Company name is required');
    }

    $company = $auth->createCompany(
        $userData['user_id'],
        $input['company_name'],
        $input['industry'] ?? null,
        $input['currency'] ?? 'USD'
    );

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Company created successfully',
        'data' => $company
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
