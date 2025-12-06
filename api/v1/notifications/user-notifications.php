<?php
/**
 * User Notifications Endpoint
 * Manage in-app notifications for users
 *
 * GET /api/v1/notifications/user-notifications
 * POST /api/v1/notifications/user-notifications (mark as read)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $db = Database::getInstance();

    // Authenticate and get user_id from JWT
    $authHeader = getHeader('authorization', '') ?? '';
    $userId = null;
    if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $auth = new AuthService();
        $userData = $auth->verifyToken($matches[1]);
        $userId = $userData['user_id'] ?? null;
    }

    // Fall back to query param if no JWT
    if (!$userId) {
        $userId = $_GET['user_id'] ?? null;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get user notifications
        if (!$userId) {
            throw new Exception('user_id is required');
        }

        $unreadOnly = isset($_GET['unread_only']) && $_GET['unread_only'] === 'true';

        $sql = "SELECT
                    id,
                    notification_type,
                    title,
                    message,
                    related_id,
                    related_type,
                    is_read,
                    priority,
                    action_url,
                    created_at
                FROM user_notifications
                WHERE user_id = :user_id";

        $params = ['user_id' => $userId];

        if ($unreadOnly) {
            $sql .= " AND is_read = FALSE";
        }

        $sql .= " ORDER BY
                    CASE priority
                        WHEN 'high' THEN 1
                        WHEN 'medium' THEN 2
                        ELSE 3
                    END,
                    created_at DESC
                  LIMIT 50";

        $notifications = $db->fetchAll($sql, $params);

        // Get unread count
        $countSql = "SELECT COUNT(*) as unread_count
                     FROM user_notifications
                     WHERE user_id = :user_id AND is_read = FALSE";

        $countResult = $db->fetchOne($countSql, ['user_id' => $userId]);

        echo json_encode([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => (int)$countResult['unread_count']
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Mark notification as read
        $input = json_decode(file_get_contents('php://input'), true);

        $notificationId = $input['notification_id'] ?? null;
        $userId = $input['user_id'] ?? null;

        if (!$notificationId || !$userId) {
            throw new Exception('notification_id and user_id are required');
        }

        $sql = "UPDATE user_notifications
                SET is_read = TRUE,
                    read_at = NOW()
                WHERE id = :id AND user_id = :user_id";

        $db->execute($sql, [
            'id' => $notificationId,
            'user_id' => $userId
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Notification marked as read'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
