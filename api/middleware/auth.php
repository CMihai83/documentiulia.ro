<?php
/**
 * Legacy Authentication Middleware
 * This is a compatibility layer for old endpoints
 * New endpoints should use AuthService directly
 */

require_once __DIR__ . '/../auth/AuthService.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/headers.php';

function authenticate() {
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Authorization required'
        ]);
        exit;
    }

    try {
        $authService = new AuthService();
        $userData = $authService->verifyToken($matches[1]);

        // Get company-specific role if X-Company-ID header is present
        $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
        $role = $userData['role'] ?? 'user';

        if ($companyId) {
            $db = Database::getInstance();
            $companyRole = $db->fetchOne(
                "SELECT role FROM company_users WHERE user_id = :user_id AND company_id = :company_id",
                ['user_id' => $userData['user_id'], 'company_id' => $companyId]
            );
            if ($companyRole && !empty($companyRole['role'])) {
                $role = $companyRole['role'];
            }
        }

        return [
            'user_id' => $userData['user_id'],
            'email' => $userData['email'],
            'role' => $role
        ];
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid token: ' . $e->getMessage()
        ]);
        exit;
    }
}

/**
 * Get database connection (compatibility function)
 */
function getDbConnection() {
    return Database::getInstance()->getConnection();
}
