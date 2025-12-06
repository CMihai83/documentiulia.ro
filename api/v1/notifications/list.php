<?php
/**
 * Notifications List API
 * Manage user notifications
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
    'invoice_created' => [
        'label_ro' => 'Factură creată',
        'label_en' => 'Invoice Created',
        'icon' => 'file-text',
        'color' => 'blue',
    ],
    'invoice_paid' => [
        'label_ro' => 'Factură plătită',
        'label_en' => 'Invoice Paid',
        'icon' => 'check-circle',
        'color' => 'green',
    ],
    'invoice_overdue' => [
        'label_ro' => 'Factură restantă',
        'label_en' => 'Invoice Overdue',
        'icon' => 'alert-circle',
        'color' => 'red',
    ],
    'payment_received' => [
        'label_ro' => 'Plată primită',
        'label_en' => 'Payment Received',
        'icon' => 'dollar-sign',
        'color' => 'green',
    ],
    'expense_approved' => [
        'label_ro' => 'Cheltuială aprobată',
        'label_en' => 'Expense Approved',
        'icon' => 'thumbs-up',
        'color' => 'green',
    ],
    'expense_rejected' => [
        'label_ro' => 'Cheltuială respinsă',
        'label_en' => 'Expense Rejected',
        'icon' => 'thumbs-down',
        'color' => 'red',
    ],
    'task_assigned' => [
        'label_ro' => 'Sarcină atribuită',
        'label_en' => 'Task Assigned',
        'icon' => 'user-check',
        'color' => 'blue',
    ],
    'task_completed' => [
        'label_ro' => 'Sarcină finalizată',
        'label_en' => 'Task Completed',
        'icon' => 'check-square',
        'color' => 'green',
    ],
    'project_update' => [
        'label_ro' => 'Actualizare proiect',
        'label_en' => 'Project Update',
        'icon' => 'folder',
        'color' => 'purple',
    ],
    'low_stock' => [
        'label_ro' => 'Stoc scăzut',
        'label_en' => 'Low Stock',
        'icon' => 'package',
        'color' => 'orange',
    ],
    'team_invitation' => [
        'label_ro' => 'Invitație echipă',
        'label_en' => 'Team Invitation',
        'icon' => 'users',
        'color' => 'blue',
    ],
    'mention' => [
        'label_ro' => 'Mențiune',
        'label_en' => 'Mention',
        'icon' => 'at-sign',
        'color' => 'blue',
    ],
    'comment' => [
        'label_ro' => 'Comentariu',
        'label_en' => 'Comment',
        'icon' => 'message-circle',
        'color' => 'gray',
    ],
    'system' => [
        'label_ro' => 'Sistem',
        'label_en' => 'System',
        'icon' => 'settings',
        'color' => 'gray',
    ],
];

// Priority levels
$priorities = [
    'low' => ['ro' => 'Scăzută', 'en' => 'Low'],
    'normal' => ['ro' => 'Normală', 'en' => 'Normal'],
    'high' => ['ro' => 'Ridicată', 'en' => 'High'],
    'urgent' => ['ro' => 'Urgentă', 'en' => 'Urgent'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $notificationId = $_GET['id'] ?? null;
            $filter = $_GET['filter'] ?? 'all'; // all, unread, read
            $type = $_GET['type'] ?? null;

            if ($notificationId) {
                // Get single notification
                $stmt = $db->prepare("
                    SELECT * FROM notifications
                    WHERE id = :id AND user_id = :user_id AND company_id = :company_id
                ");
                $stmt->execute([
                    'id' => $notificationId,
                    'user_id' => $user['user_id'],
                    'company_id' => $companyId,
                ]);
                $notification = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$notification) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Notification not found']);
                    exit;
                }

                $notification['data'] = json_decode($notification['data'] ?? '{}', true);
                $notification['type_info'] = $notificationTypes[$notification['notification_type']] ?? null;
                $notification['priority_label'] = $priorities[$notification['priority']] ?? null;

                echo json_encode([
                    'success' => true,
                    'data' => $notification,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List notifications
                $page = max(1, intval($_GET['page'] ?? 1));
                $limit = min(100, max(10, intval($_GET['limit'] ?? 20)));
                $offset = ($page - 1) * $limit;

                // Count unread
                $unreadStmt = $db->prepare("
                    SELECT COUNT(*) FROM notifications
                    WHERE user_id = :user_id AND company_id = :company_id AND is_read = FALSE
                ");
                $unreadStmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
                $unreadCount = $unreadStmt->fetchColumn();

                // Build query
                $sql = "
                    SELECT * FROM notifications
                    WHERE user_id = :user_id AND company_id = :company_id
                ";
                $params = ['user_id' => $user['user_id'], 'company_id' => $companyId];

                if ($filter === 'unread') {
                    $sql .= " AND is_read = FALSE";
                } elseif ($filter === 'read') {
                    $sql .= " AND is_read = TRUE";
                }

                if ($type) {
                    $sql .= " AND notification_type = :type";
                    $params['type'] = $type;
                }

                // Count total
                $countStmt = $db->prepare(str_replace('SELECT *', 'SELECT COUNT(*)', $sql));
                $countStmt->execute($params);
                $total = $countStmt->fetchColumn();

                // Get notifications
                $sql .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
                $stmt = $db->prepare($sql);
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
                $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
                $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
                $stmt->execute();
                $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($notifications as &$n) {
                    $n['data'] = json_decode($n['data'] ?? '{}', true);
                    $n['type_info'] = $notificationTypes[$n['notification_type']] ?? null;
                    $n['time_ago'] = getTimeAgo($n['created_at']);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'notifications' => $notifications,
                        'unread_count' => intval($unreadCount),
                        'pagination' => [
                            'page' => $page,
                            'limit' => $limit,
                            'total' => intval($total),
                            'total_pages' => ceil($total / $limit),
                        ],
                        'notification_types' => $notificationTypes,
                        'priorities' => $priorities,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            // Create notification (internal use or admin)
            $input = json_decode(file_get_contents('php://input'), true);

            $action = $input['action'] ?? 'create';

            if ($action === 'mark_read') {
                // Mark notifications as read
                $ids = $input['ids'] ?? [];
                if (empty($ids)) {
                    // Mark all as read
                    $stmt = $db->prepare("
                        UPDATE notifications SET is_read = TRUE, read_at = NOW()
                        WHERE user_id = :user_id AND company_id = :company_id AND is_read = FALSE
                    ");
                    $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);
                } else {
                    // Mark specific as read
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $stmt = $db->prepare("
                        UPDATE notifications SET is_read = TRUE, read_at = NOW()
                        WHERE id IN ($placeholders) AND user_id = ? AND company_id = ?
                    ");
                    $stmt->execute(array_merge($ids, [$user['user_id'], $companyId]));
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificări marcate ca citite',
                    'message_en' => 'Notifications marked as read',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // Create new notification
                $targetUserId = $input['user_id'] ?? $user['user_id'];
                $notificationType = $input['notification_type'] ?? 'system';

                if (!isset($notificationTypes[$notificationType])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Tip de notificare invalid',
                        'error' => 'Invalid notification type'
                    ]);
                    exit;
                }

                $notificationId = 'notif_' . bin2hex(random_bytes(12));
                $stmt = $db->prepare("
                    INSERT INTO notifications (
                        id, company_id, user_id, notification_type, title, message,
                        data, priority, link, created_at
                    ) VALUES (
                        :id, :company_id, :user_id, :notification_type, :title, :message,
                        :data, :priority, :link, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $notificationId,
                    'company_id' => $companyId,
                    'user_id' => $targetUserId,
                    'notification_type' => $notificationType,
                    'title' => $input['title'] ?? $notificationTypes[$notificationType]['label_ro'],
                    'message' => $input['message'] ?? null,
                    'data' => json_encode($input['data'] ?? []),
                    'priority' => $input['priority'] ?? 'normal',
                    'link' => $input['link'] ?? null,
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificare creată',
                    'message_en' => 'Notification created',
                    'data' => ['id' => $notificationId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            $notificationId = $_GET['id'] ?? null;
            $deleteAll = $_GET['all'] ?? false;

            if ($deleteAll) {
                // Delete all read notifications
                $stmt = $db->prepare("
                    DELETE FROM notifications
                    WHERE user_id = :user_id AND company_id = :company_id AND is_read = TRUE
                ");
                $stmt->execute(['user_id' => $user['user_id'], 'company_id' => $companyId]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificări citite șterse',
                    'message_en' => 'Read notifications deleted',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($notificationId) {
                $stmt = $db->prepare("
                    DELETE FROM notifications
                    WHERE id = :id AND user_id = :user_id AND company_id = :company_id
                ");
                $stmt->execute([
                    'id' => $notificationId,
                    'user_id' => $user['user_id'],
                    'company_id' => $companyId,
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificare ștearsă',
                    'message_en' => 'Notification deleted',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
            }
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function getTimeAgo($datetime) {
    $time = strtotime($datetime);
    $diff = time() - $time;

    if ($diff < 60) {
        return ['ro' => 'Acum', 'en' => 'Just now'];
    } elseif ($diff < 3600) {
        $mins = floor($diff / 60);
        return ['ro' => "Acum $mins min", 'en' => "$mins min ago"];
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return ['ro' => "Acum $hours ore", 'en' => "$hours hours ago"];
    } elseif ($diff < 604800) {
        $days = floor($diff / 86400);
        return ['ro' => "Acum $days zile", 'en' => "$days days ago"];
    } else {
        return ['ro' => date('d.m.Y', $time), 'en' => date('M d, Y', $time)];
    }
}
