<?php
/**
 * Notifications API
 * Manage user notifications and preferences
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
$method = $_SERVER['REQUEST_METHOD'];

// Notification types
$notificationTypes = [
    'invoice_created' => ['ro' => 'Factură creată', 'en' => 'Invoice Created', 'icon' => 'receipt', 'category' => 'invoicing'],
    'invoice_paid' => ['ro' => 'Factură plătită', 'en' => 'Invoice Paid', 'icon' => 'paid', 'category' => 'invoicing'],
    'invoice_overdue' => ['ro' => 'Factură restantă', 'en' => 'Invoice Overdue', 'icon' => 'warning', 'category' => 'invoicing'],
    'expense_approved' => ['ro' => 'Cheltuială aprobată', 'en' => 'Expense Approved', 'icon' => 'check_circle', 'category' => 'expenses'],
    'expense_rejected' => ['ro' => 'Cheltuială respinsă', 'en' => 'Expense Rejected', 'icon' => 'cancel', 'category' => 'expenses'],
    'task_assigned' => ['ro' => 'Sarcină atribuită', 'en' => 'Task Assigned', 'icon' => 'assignment', 'category' => 'projects'],
    'task_completed' => ['ro' => 'Sarcină finalizată', 'en' => 'Task Completed', 'icon' => 'task_alt', 'category' => 'projects'],
    'task_due_soon' => ['ro' => 'Sarcină aproape de termen', 'en' => 'Task Due Soon', 'icon' => 'schedule', 'category' => 'projects'],
    'comment_added' => ['ro' => 'Comentariu adăugat', 'en' => 'Comment Added', 'icon' => 'comment', 'category' => 'collaboration'],
    'mention' => ['ro' => 'Te-a menționat', 'en' => 'Mentioned You', 'icon' => 'alternate_email', 'category' => 'collaboration'],
    'document_shared' => ['ro' => 'Document partajat', 'en' => 'Document Shared', 'icon' => 'share', 'category' => 'documents'],
    'team_invite' => ['ro' => 'Invitație în echipă', 'en' => 'Team Invite', 'icon' => 'group_add', 'category' => 'team'],
    'system_update' => ['ro' => 'Actualizare sistem', 'en' => 'System Update', 'icon' => 'system_update', 'category' => 'system'],
    'security_alert' => ['ro' => 'Alertă securitate', 'en' => 'Security Alert', 'icon' => 'security', 'category' => 'security'],
    'payment_received' => ['ro' => 'Plată primită', 'en' => 'Payment Received', 'icon' => 'payments', 'category' => 'payments'],
    'low_stock' => ['ro' => 'Stoc scăzut', 'en' => 'Low Stock', 'icon' => 'inventory_2', 'category' => 'inventory'],
    'report_ready' => ['ro' => 'Raport pregătit', 'en' => 'Report Ready', 'icon' => 'assessment', 'category' => 'reports'],
    'deadline_reminder' => ['ro' => 'Reminder termen', 'en' => 'Deadline Reminder', 'icon' => 'alarm', 'category' => 'reminders'],
];

// Notification categories
$notificationCategories = [
    'invoicing' => ['ro' => 'Facturare', 'en' => 'Invoicing'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses'],
    'projects' => ['ro' => 'Proiecte', 'en' => 'Projects'],
    'collaboration' => ['ro' => 'Colaborare', 'en' => 'Collaboration'],
    'documents' => ['ro' => 'Documente', 'en' => 'Documents'],
    'team' => ['ro' => 'Echipă', 'en' => 'Team'],
    'system' => ['ro' => 'Sistem', 'en' => 'System'],
    'security' => ['ro' => 'Securitate', 'en' => 'Security'],
    'payments' => ['ro' => 'Plăți', 'en' => 'Payments'],
    'inventory' => ['ro' => 'Inventar', 'en' => 'Inventory'],
    'reports' => ['ro' => 'Rapoarte', 'en' => 'Reports'],
    'reminders' => ['ro' => 'Remindere', 'en' => 'Reminders'],
];

// Notification priorities
$notificationPriorities = [
    'low' => ['ro' => 'Scăzută', 'en' => 'Low', 'color' => '#9E9E9E'],
    'normal' => ['ro' => 'Normală', 'en' => 'Normal', 'color' => '#2196F3'],
    'high' => ['ro' => 'Ridicată', 'en' => 'High', 'color' => '#FF9800'],
    'urgent' => ['ro' => 'Urgentă', 'en' => 'Urgent', 'color' => '#F44336'],
];

// Delivery channels
$deliveryChannels = [
    'in_app' => ['ro' => 'În aplicație', 'en' => 'In-App', 'icon' => 'notifications'],
    'email' => ['ro' => 'Email', 'en' => 'Email', 'icon' => 'email'],
    'push' => ['ro' => 'Push', 'en' => 'Push', 'icon' => 'phonelink_ring'],
    'sms' => ['ro' => 'SMS', 'en' => 'SMS', 'icon' => 'sms'],
    'whatsapp' => ['ro' => 'WhatsApp', 'en' => 'WhatsApp', 'icon' => 'chat'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === 'true';
                $category = $_GET['category'] ?? null;
                $limit = intval($_GET['limit'] ?? 50);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT * FROM notifications
                    WHERE user_id = :user_id
                ";
                $params = ['user_id' => $user['user_id']];

                if ($companyId) {
                    $sql .= " AND (company_id = :company_id OR company_id IS NULL)";
                    $params['company_id'] = $companyId;
                }

                if ($unreadOnly) {
                    $sql .= " AND read_at IS NULL";
                }

                if ($category) {
                    $sql .= " AND category = :category";
                    $params['category'] = $category;
                }

                $sql .= " ORDER BY created_at DESC LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($notifications as &$notif) {
                    $notif['type_config'] = $notificationTypes[$notif['type']] ?? null;
                    $notif['priority_config'] = $notificationPriorities[$notif['priority']] ?? null;
                    $notif['data'] = json_decode($notif['data'] ?? '{}', true);
                    $notif['time_ago'] = formatTimeAgo($notif['created_at']);
                }

                // Get unread count
                $stmt = $db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL");
                $stmt->execute(['user_id' => $user['user_id']]);
                $unreadCount = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'notifications' => $notifications,
                        'unread_count' => intval($unreadCount),
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'preferences') {
                // Get notification preferences
                $stmt = $db->prepare("SELECT preferences FROM user_notification_settings WHERE user_id = :user_id");
                $stmt->execute(['user_id' => $user['user_id']]);
                $prefs = $stmt->fetchColumn();

                $preferences = $prefs ? json_decode($prefs, true) : getDefaultPreferences();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'preferences' => $preferences,
                        'types' => $notificationTypes,
                        'categories' => $notificationCategories,
                        'channels' => $deliveryChannels,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'types' => $notificationTypes,
                        'categories' => $notificationCategories,
                        'priorities' => $notificationPriorities,
                        'channels' => $deliveryChannels,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'stats') {
                // Get notification statistics
                $stmt = $db->prepare("
                    SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE read_at IS NULL) as unread,
                        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
                        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today
                    FROM notifications WHERE user_id = :user_id
                ");
                $stmt->execute(['user_id' => $user['user_id']]);
                $stats = $stmt->fetch(PDO::FETCH_ASSOC);

                // By category
                $stmt = $db->prepare("
                    SELECT category, COUNT(*) as count FROM notifications
                    WHERE user_id = :user_id AND read_at IS NULL
                    GROUP BY category ORDER BY count DESC
                ");
                $stmt->execute(['user_id' => $user['user_id']]);
                $byCategory = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'summary' => $stats,
                        'by_category' => $byCategory,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'create';

            if ($action === 'create') {
                // Admin only for creating notifications
                if (!in_array($user['role'], ['admin', 'system'])) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Admin access required']);
                    exit;
                }

                $targetUserId = $input['user_id'] ?? null;
                $type = $input['type'] ?? 'system_update';
                $title = $input['title'] ?? null;
                $message = $input['message'] ?? null;

                if (!$targetUserId || !$title) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'User ID and title required']);
                    exit;
                }

                $notifId = 'notif_' . bin2hex(random_bytes(8));
                $category = $notificationTypes[$type]['category'] ?? 'system';

                $stmt = $db->prepare("
                    INSERT INTO notifications (id, user_id, company_id, type, category, title, message, priority, data, created_at)
                    VALUES (:id, :user_id, :company_id, :type, :category, :title, :message, :priority, :data, NOW())
                ");
                $stmt->execute([
                    'id' => $notifId,
                    'user_id' => $targetUserId,
                    'company_id' => $companyId,
                    'type' => $type,
                    'category' => $category,
                    'title' => $title,
                    'message' => $message,
                    'priority' => $input['priority'] ?? 'normal',
                    'data' => json_encode($input['data'] ?? []),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificarea a fost creată',
                    'message_en' => 'Notification created',
                    'data' => ['id' => $notifId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'mark_read') {
                $notificationIds = $input['ids'] ?? [];

                if (empty($notificationIds)) {
                    // Mark all as read
                    $stmt = $db->prepare("UPDATE notifications SET read_at = NOW() WHERE user_id = :user_id AND read_at IS NULL");
                    $stmt->execute(['user_id' => $user['user_id']]);
                } else {
                    $placeholders = implode(',', array_fill(0, count($notificationIds), '?'));
                    $stmt = $db->prepare("UPDATE notifications SET read_at = NOW() WHERE id IN ($placeholders) AND user_id = ?");
                    $stmt->execute(array_merge($notificationIds, [$user['user_id']]));
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificările au fost marcate ca citite',
                    'message_en' => 'Notifications marked as read',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'mark_unread') {
                $notificationIds = $input['ids'] ?? [];

                if (!empty($notificationIds)) {
                    $placeholders = implode(',', array_fill(0, count($notificationIds), '?'));
                    $stmt = $db->prepare("UPDATE notifications SET read_at = NULL WHERE id IN ($placeholders) AND user_id = ?");
                    $stmt->execute(array_merge($notificationIds, [$user['user_id']]));
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificările au fost marcate ca necitite',
                    'message_en' => 'Notifications marked as unread',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'preferences';

            if ($action === 'preferences') {
                $preferences = $input['preferences'] ?? [];

                // Upsert preferences
                $stmt = $db->prepare("
                    INSERT INTO user_notification_settings (user_id, preferences, updated_at)
                    VALUES (:user_id, :preferences, NOW())
                    ON CONFLICT (user_id) DO UPDATE SET preferences = :preferences, updated_at = NOW()
                ");
                $stmt->execute([
                    'user_id' => $user['user_id'],
                    'preferences' => json_encode($preferences),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Preferințele au fost salvate',
                    'message_en' => 'Preferences saved',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            $notificationId = $_GET['id'] ?? null;
            $deleteAll = isset($_GET['all']) && $_GET['all'] === 'true';

            if ($deleteAll) {
                $stmt = $db->prepare("DELETE FROM notifications WHERE user_id = :user_id AND read_at IS NOT NULL");
                $stmt->execute(['user_id' => $user['user_id']]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificările citite au fost șterse',
                    'message_en' => 'Read notifications deleted',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } elseif ($notificationId) {
                $stmt = $db->prepare("DELETE FROM notifications WHERE id = :id AND user_id = :user_id");
                $stmt->execute(['id' => $notificationId, 'user_id' => $user['user_id']]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Notificarea a fost ștearsă',
                    'message_en' => 'Notification deleted',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Notification ID or delete all flag required']);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function formatTimeAgo($datetime) {
    $time = strtotime($datetime);
    $diff = time() - $time;

    if ($diff < 60) return 'acum câteva secunde';
    if ($diff < 3600) return 'acum ' . floor($diff / 60) . ' minute';
    if ($diff < 86400) return 'acum ' . floor($diff / 3600) . ' ore';
    if ($diff < 604800) return 'acum ' . floor($diff / 86400) . ' zile';

    return date('d.m.Y H:i', $time);
}

function getDefaultPreferences() {
    return [
        'channels' => [
            'in_app' => true,
            'email' => true,
            'push' => false,
            'sms' => false,
            'whatsapp' => false,
        ],
        'categories' => [
            'invoicing' => true,
            'expenses' => true,
            'projects' => true,
            'collaboration' => true,
            'documents' => true,
            'team' => true,
            'system' => true,
            'security' => true,
            'payments' => true,
            'inventory' => true,
            'reports' => true,
            'reminders' => true,
        ],
        'quiet_hours' => [
            'enabled' => false,
            'start' => '22:00',
            'end' => '08:00',
        ],
        'digest' => [
            'enabled' => false,
            'frequency' => 'daily', // daily, weekly
        ],
    ];
}
