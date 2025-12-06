<?php
/**
 * Notifications API
 * In-app notifications management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Notification types
$notificationTypes = [
    'invoice' => [
        'ro' => 'Facturi',
        'en' => 'Invoices',
        'icon' => 'receipt',
        'color' => '#4CAF50',
    ],
    'payment' => [
        'ro' => 'Plăți',
        'en' => 'Payments',
        'icon' => 'payments',
        'color' => '#2196F3',
    ],
    'expense' => [
        'ro' => 'Cheltuieli',
        'en' => 'Expenses',
        'icon' => 'receipt_long',
        'color' => '#FF9800',
    ],
    'project' => [
        'ro' => 'Proiecte',
        'en' => 'Projects',
        'icon' => 'folder',
        'color' => '#9C27B0',
    ],
    'task' => [
        'ro' => 'Sarcini',
        'en' => 'Tasks',
        'icon' => 'task',
        'color' => '#00BCD4',
    ],
    'inventory' => [
        'ro' => 'Inventar',
        'en' => 'Inventory',
        'icon' => 'inventory',
        'color' => '#795548',
    ],
    'team' => [
        'ro' => 'Echipă',
        'en' => 'Team',
        'icon' => 'people',
        'color' => '#E91E63',
    ],
    'system' => [
        'ro' => 'Sistem',
        'en' => 'System',
        'icon' => 'settings',
        'color' => '#607D8B',
    ],
    'reminder' => [
        'ro' => 'Reminder',
        'en' => 'Reminder',
        'icon' => 'alarm',
        'color' => '#F44336',
    ],
    'alert' => [
        'ro' => 'Alertă',
        'en' => 'Alert',
        'icon' => 'warning',
        'color' => '#FF5722',
    ],
];

// Priority levels
$priorities = [
    'low' => ['ro' => 'Scăzută', 'en' => 'Low', 'order' => 1],
    'normal' => ['ro' => 'Normală', 'en' => 'Normal', 'order' => 2],
    'high' => ['ro' => 'Ridicată', 'en' => 'High', 'order' => 3],
    'urgent' => ['ro' => 'Urgentă', 'en' => 'Urgent', 'order' => 4],
];

// Notification statuses
$statuses = [
    'unread' => ['ro' => 'Necitită', 'en' => 'Unread'],
    'read' => ['ro' => 'Citită', 'en' => 'Read'],
    'archived' => ['ro' => 'Arhivată', 'en' => 'Archived'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                // Get notifications for current user
                $status = $_GET['status'] ?? null;
                $type = $_GET['type'] ?? null;
                $limit = intval($_GET['limit'] ?? 50);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT n.*,
                           EXTRACT(EPOCH FROM (NOW() - n.created_at)) as seconds_ago
                    FROM notifications n
                    WHERE n.user_id = :user_id AND n.company_id = :company_id
                ";
                $params = ['user_id' => $user['user_id'], 'company_id' => $companyId];

                if ($status && $status !== 'all') {
                    $sql .= " AND n.status = :status";
                    $params['status'] = $status;
                }
                if ($type) {
                    $sql .= " AND n.type = :type";
                    $params['type'] = $type;
                }

                $sql .= " ORDER BY n.priority_order DESC, n.created_at DESC LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($notifications as &$notif) {
                    $notif['type_config'] = $notificationTypes[$notif['type']] ?? null;
                    $notif['priority_label'] = $priorities[$notif['priority']] ?? null;
                    $notif['status_label'] = $statuses[$notif['status']] ?? null;
                    $notif['time_ago'] = formatTimeAgo($notif['seconds_ago']);
                    $notif['data'] = json_decode($notif['data'] ?? '{}', true);
                }

                // Get unread count
                $stmt = $db->prepare("
                    SELECT COUNT(*) as count FROM notifications
                    WHERE user_id = :user_id AND company_id = :company_id AND status = 'unread'
                ");
                $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
                $unreadCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'notifications' => $notifications,
                        'unread_count' => intval($unreadCount),
                        'total' => count($notifications),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'single') {
                $notifId = $_GET['id'] ?? null;
                if (!$notifId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Notification ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT * FROM notifications
                    WHERE id = :id AND user_id = :user_id AND company_id = :company_id
                ");
                $stmt->execute(['id' => $notifId, 'user_id' => $user['user_id'], 'company_id' => $companyId]);
                $notif = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$notif) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Notification not found']);
                    exit;
                }

                $notif['type_config'] = $notificationTypes[$notif['type']] ?? null;
                $notif['data'] = json_decode($notif['data'] ?? '{}', true);

                echo json_encode([
                    'success' => true,
                    'data' => $notif,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'types' => $notificationTypes,
                        'priorities' => $priorities,
                        'statuses' => $statuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'count') {
                $stmt = $db->prepare("
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'unread') as unread,
                        COUNT(*) FILTER (WHERE status = 'read') as read,
                        COUNT(*) FILTER (WHERE priority = 'urgent' AND status = 'unread') as urgent
                    FROM notifications
                    WHERE user_id = :user_id AND company_id = :company_id
                ");
                $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
                $counts = $stmt->fetch(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => $counts,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $action = $_GET['action'] ?? 'create';

            if ($action === 'create') {
                // Create a new notification (for admins/system)
                if (!in_array($user['role'], ['admin', 'manager'])) {
                    http_response_code(403);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Nu aveți permisiunea de a crea notificări',
                        'error' => 'You do not have permission to create notifications'
                    ]);
                    exit;
                }

                $input = json_decode(file_get_contents('php://input'), true);

                $targetUsers = $input['user_ids'] ?? [$user['user_id']];
                $type = $input['type'] ?? 'system';
                $title = $input['title'] ?? null;
                $message = $input['message'] ?? null;
                $priority = $input['priority'] ?? 'normal';

                if (!$title || !$message) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Titlul și mesajul sunt obligatorii',
                        'error' => 'Title and message are required'
                    ]);
                    exit;
                }

                $created = 0;
                foreach ($targetUsers as $targetUserId) {
                    $notifId = 'notif_' . bin2hex(random_bytes(8));
                    $stmt = $db->prepare("
                        INSERT INTO notifications (
                            id, company_id, user_id, type, title, message, priority,
                            priority_order, status, data, link, created_by, created_at
                        ) VALUES (
                            :id, :company_id, :user_id, :type, :title, :message, :priority,
                            :priority_order, 'unread', :data, :link, :created_by, NOW()
                        )
                    ");
                    $stmt->execute([
                        'id' => $notifId,
                        'company_id' => $companyId,
                        'user_id' => $targetUserId,
                        'type' => $type,
                        'title' => $title,
                        'message' => $message,
                        'priority' => $priority,
                        'priority_order' => $priorities[$priority]['order'] ?? 2,
                        'data' => json_encode($input['data'] ?? []),
                        'link' => $input['link'] ?? null,
                        'created_by' => $user['user_id'],
                    ]);
                    $created++;
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => "Notificare trimisă la $created utilizatori",
                    'message_en' => "Notification sent to $created users",
                    'data' => ['sent_count' => $created],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'mark_read') {
                $input = json_decode(file_get_contents('php://input'), true);
                $notifIds = $input['ids'] ?? [];

                if (empty($notifIds)) {
                    // Mark all as read
                    $stmt = $db->prepare("
                        UPDATE notifications SET status = 'read', read_at = NOW()
                        WHERE user_id = :user_id AND company_id = :company_id AND status = 'unread'
                    ");
                    $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
                    $count = $stmt->rowCount();
                } else {
                    // Mark specific as read
                    $placeholders = implode(',', array_fill(0, count($notifIds), '?'));
                    $params = array_merge($notifIds, [$user['user_id'], $companyId]);
                    $stmt = $db->prepare("
                        UPDATE notifications SET status = 'read', read_at = NOW()
                        WHERE id IN ($placeholders) AND user_id = ? AND company_id = ?
                    ");
                    $stmt->execute($params);
                    $count = $stmt->rowCount();
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => "$count notificări marcate ca citite",
                    'message_en' => "$count notifications marked as read",
                    'data' => ['updated_count' => $count],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'archive') {
                $input = json_decode(file_get_contents('php://input'), true);
                $notifIds = $input['ids'] ?? [];

                if (empty($notifIds)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Notification IDs required']);
                    exit;
                }

                $placeholders = implode(',', array_fill(0, count($notifIds), '?'));
                $params = array_merge($notifIds, [$user['user_id'], $companyId]);
                $stmt = $db->prepare("
                    UPDATE notifications SET status = 'archived', archived_at = NOW()
                    WHERE id IN ($placeholders) AND user_id = ? AND company_id = ?
                ");
                $stmt->execute($params);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificări arhivate',
                    'message_en' => 'Notifications archived',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            $notifId = $_GET['id'] ?? null;

            if ($notifId) {
                $stmt = $db->prepare("
                    DELETE FROM notifications
                    WHERE id = :id AND user_id = :user_id AND company_id = :company_id
                ");
                $stmt->execute(['id' => $notifId, 'user_id' => $user['user_id'], 'company_id' => $companyId]);
            } else {
                // Delete all archived
                $stmt = $db->prepare("
                    DELETE FROM notifications
                    WHERE user_id = :user_id AND company_id = :company_id AND status = 'archived'
                ");
                $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Notificări șterse',
                'message_en' => 'Notifications deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function formatTimeAgo($seconds) {
    if ($seconds < 60) return ['ro' => 'Acum', 'en' => 'Just now'];
    if ($seconds < 3600) return ['ro' => floor($seconds / 60) . ' minute în urmă', 'en' => floor($seconds / 60) . ' minutes ago'];
    if ($seconds < 86400) return ['ro' => floor($seconds / 3600) . ' ore în urmă', 'en' => floor($seconds / 3600) . ' hours ago'];
    if ($seconds < 604800) return ['ro' => floor($seconds / 86400) . ' zile în urmă', 'en' => floor($seconds / 86400) . ' days ago'];
    return ['ro' => floor($seconds / 604800) . ' săptămâni în urmă', 'en' => floor($seconds / 604800) . ' weeks ago'];
}
