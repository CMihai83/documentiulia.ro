<?php
/**
 * Company Middleware
 * Provides company context for authenticated requests
 */

require_once __DIR__ . '/../auth/AuthService.php';
require_once __DIR__ . '/../helpers/headers.php';

/**
 * Authenticate request and return user data
 */
function authenticateRequest() {
    $authHeader = getHeader('authorization', '') ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Authorization required']);
        exit;
    }
    
    try {
        $authService = new AuthService();
        return $authService->verifyToken($matches[1]);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid token: ' . $e->getMessage()]);
        exit;
    }
}

/**
 * Get company ID from request headers
 */
function getCompanyId() {
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? getHeader('x-company-id') ?? null;
    
    if (empty($companyId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Company ID required (X-Company-ID header)']);
        exit;
    }
    
    return $companyId;
}

/**
 * Validate user has access to company
 */
function validateCompanyAccess($userId, $companyId) {
    $authService = new AuthService();
    
    if (!$authService->userHasAccessToCompany($userId, $companyId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Access denied to this company']);
        exit;
    }
    
    return true;
}
