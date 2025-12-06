<?php
/**
 * Notifications Unread Count Endpoint
 * GET /api/v1/notifications/unread-count.php
 * Returns the count of unread notifications
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
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance();

    // Check if notifications table exists
    $tableExists = $db->fetchOne(
        "SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'notifications'
        ) as exists"
    );

    if ($tableExists['exists'] === true || $tableExists['exists'] === 't') {
        // Get unread count for this user (is_read is boolean, not read_at timestamp)
        $result = $db->fetchOne(
            "SELECT COUNT(*) as unread_count
             FROM notifications
             WHERE user_id = :user_id
             AND (company_id = :company_id OR company_id IS NULL)
             AND is_read = false",
            ['user_id' => $userId, 'company_id' => $companyId]
        );
        $unreadCount = (int)($result['unread_count'] ?? 0);
    } else {
        // Table doesn't exist, return 0
        $unreadCount = 0;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'unread_count' => $unreadCount
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
