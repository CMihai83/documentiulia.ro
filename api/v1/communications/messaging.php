<?php
/**
 * Messaging API
 * Internal messaging and communication system
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

// Message types
$messageTypes = [
    'direct' => ['ro' => 'Mesaj direct', 'en' => 'Direct Message', 'icon' => 'message'],
    'group' => ['ro' => 'Mesaj grup', 'en' => 'Group Message', 'icon' => 'groups'],
    'announcement' => ['ro' => 'Anunț', 'en' => 'Announcement', 'icon' => 'campaign'],
    'broadcast' => ['ro' => 'Difuzare', 'en' => 'Broadcast', 'icon' => 'broadcast_on_personal'],
];

// Message statuses
$messageStatuses = [
    'sent' => ['ro' => 'Trimis', 'en' => 'Sent', 'icon' => 'check'],
    'delivered' => ['ro' => 'Livrat', 'en' => 'Delivered', 'icon' => 'done_all'],
    'read' => ['ro' => 'Citit', 'en' => 'Read', 'icon' => 'visibility'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed', 'icon' => 'error'],
];

// Message priorities
$messagePriorities = [
    'low' => ['ro' => 'Scăzută', 'en' => 'Low'],
    'normal' => ['ro' => 'Normală', 'en' => 'Normal'],
    'high' => ['ro' => 'Ridicată', 'en' => 'High'],
    'urgent' => ['ro' => 'Urgentă', 'en' => 'Urgent'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'inbox';

            if ($action === 'inbox') {
                $folder = $_GET['folder'] ?? 'inbox'; // inbox, sent, archived, starred
                $limit = intval($_GET['limit'] ?? 50);
                $offset = intval($_GET['offset'] ?? 0);

                if ($folder === 'inbox') {
                    $sql = "
                        SELECT m.*,
                               s.first_name as sender_first_name, s.last_name as sender_last_name, s.avatar_url as sender_avatar,
                               mr.read_at, mr.starred, mr.archived
                        FROM messages m
                        JOIN users s ON m.sender_id = s.id
                        JOIN message_recipients mr ON m.id = mr.message_id AND mr.recipient_id = :user_id
                        WHERE m.company_id = :company_id AND mr.archived = false
                        ORDER BY m.created_at DESC
                        LIMIT $limit OFFSET $offset
                    ";
                } elseif ($folder === 'sent') {
                    $sql = "
                        SELECT m.*,
                               s.first_name as sender_first_name, s.last_name as sender_last_name, s.avatar_url as sender_avatar
                        FROM messages m
                        JOIN users s ON m.sender_id = s.id
                        WHERE m.company_id = :company_id AND m.sender_id = :user_id
                        ORDER BY m.created_at DESC
                        LIMIT $limit OFFSET $offset
                    ";
                } elseif ($folder === 'starred') {
                    $sql = "
                        SELECT m.*,
                               s.first_name as sender_first_name, s.last_name as sender_last_name, s.avatar_url as sender_avatar,
                               mr.read_at, mr.starred, mr.archived
                        FROM messages m
                        JOIN users s ON m.sender_id = s.id
                        JOIN message_recipients mr ON m.id = mr.message_id AND mr.recipient_id = :user_id
                        WHERE m.company_id = :company_id AND mr.starred = true
                        ORDER BY m.created_at DESC
                        LIMIT $limit OFFSET $offset
                    ";
                } else { // archived
                    $sql = "
                        SELECT m.*,
                               s.first_name as sender_first_name, s.last_name as sender_last_name, s.avatar_url as sender_avatar,
                               mr.read_at, mr.starred, mr.archived
                        FROM messages m
                        JOIN users s ON m.sender_id = s.id
                        JOIN message_recipients mr ON m.id = mr.message_id AND mr.recipient_id = :user_id
                        WHERE m.company_id = :company_id AND mr.archived = true
                        ORDER BY m.created_at DESC
                        LIMIT $limit OFFSET $offset
                    ";
                }

                $stmt = $db->prepare($sql);
                $stmt->execute(['company_id' => $companyId, 'user_id' => $user['user_id']]);
                $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($messages as &$msg) {
                    $msg['sender_name'] = trim(($msg['sender_first_name'] ?? '') . ' ' . ($msg['sender_last_name'] ?? ''));
                    $msg['type_config'] = $messageTypes[$msg['message_type']] ?? null;
                    $msg['attachments'] = json_decode($msg['attachments'] ?? '[]', true);
                    $msg['time_ago'] = formatTimeAgo($msg['created_at']);
                    $msg['is_read'] = !empty($msg['read_at']);
                }

                // Get unread count
                $stmt = $db->prepare("
                    SELECT COUNT(*) FROM messages m
                    JOIN message_recipients mr ON m.id = mr.message_id
                    WHERE m.company_id = :company_id AND mr.recipient_id = :user_id AND mr.read_at IS NULL AND mr.archived = false
                ");
                $stmt->execute(['company_id' => $companyId, 'user_id' => $user['user_id']]);
                $unreadCount = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'messages' => $messages,
                        'unread_count' => intval($unreadCount),
                        'folder' => $folder,
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'thread') {
                $messageId = $_GET['id'] ?? null;

                if (!$messageId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Message ID required']);
                    exit;
                }

                // Get main message
                $stmt = $db->prepare("
                    SELECT m.*, s.first_name, s.last_name, s.avatar_url
                    FROM messages m
                    JOIN users s ON m.sender_id = s.id
                    WHERE m.id = :id AND m.company_id = :company_id
                ");
                $stmt->execute(['id' => $messageId, 'company_id' => $companyId]);
                $message = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$message) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Mesajul nu a fost găsit',
                        'error' => 'Message not found'
                    ]);
                    exit;
                }

                $message['sender_name'] = trim(($message['first_name'] ?? '') . ' ' . ($message['last_name'] ?? ''));
                $message['attachments'] = json_decode($message['attachments'] ?? '[]', true);

                // Get recipients
                $stmt = $db->prepare("
                    SELECT u.id, u.first_name, u.last_name, u.avatar_url, mr.read_at
                    FROM message_recipients mr
                    JOIN users u ON mr.recipient_id = u.id
                    WHERE mr.message_id = :message_id
                ");
                $stmt->execute(['message_id' => $messageId]);
                $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $message['recipients'] = $recipients;

                // Get thread replies
                $stmt = $db->prepare("
                    SELECT r.*, u.first_name, u.last_name, u.avatar_url
                    FROM message_replies r
                    JOIN users u ON r.sender_id = u.id
                    WHERE r.message_id = :message_id
                    ORDER BY r.created_at ASC
                ");
                $stmt->execute(['message_id' => $messageId]);
                $replies = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($replies as &$reply) {
                    $reply['sender_name'] = trim(($reply['first_name'] ?? '') . ' ' . ($reply['last_name'] ?? ''));
                    $reply['attachments'] = json_decode($reply['attachments'] ?? '[]', true);
                }

                $message['replies'] = $replies;

                // Mark as read
                $stmt = $db->prepare("UPDATE message_recipients SET read_at = NOW() WHERE message_id = :message_id AND recipient_id = :user_id AND read_at IS NULL");
                $stmt->execute(['message_id' => $messageId, 'user_id' => $user['user_id']]);

                echo json_encode([
                    'success' => true,
                    'data' => $message,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'contacts') {
                // Get available recipients (team members)
                $stmt = $db->prepare("
                    SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, cu.role
                    FROM users u
                    JOIN company_users cu ON u.id = cu.user_id
                    WHERE cu.company_id = :company_id AND cu.status = 'active' AND u.id != :user_id
                    ORDER BY u.first_name, u.last_name
                ");
                $stmt->execute(['company_id' => $companyId, 'user_id' => $user['user_id']]);
                $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($contacts as &$contact) {
                    $contact['name'] = trim(($contact['first_name'] ?? '') . ' ' . ($contact['last_name'] ?? ''));
                }

                echo json_encode([
                    'success' => true,
                    'data' => $contacts,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'types' => $messageTypes,
                        'statuses' => $messageStatuses,
                        'priorities' => $messagePriorities,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'send';

            if ($action === 'send') {
                $recipients = $input['recipients'] ?? [];
                $subject = $input['subject'] ?? null;
                $body = $input['body'] ?? null;
                $messageType = $input['message_type'] ?? 'direct';

                if (empty($recipients) || !$subject || !$body) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Destinatarii, subiectul și mesajul sunt obligatorii',
                        'error' => 'Recipients, subject and body are required'
                    ]);
                    exit;
                }

                $messageId = 'msg_' . bin2hex(random_bytes(8));

                // Insert message
                $stmt = $db->prepare("
                    INSERT INTO messages (id, company_id, sender_id, message_type, subject, body, priority, attachments, created_at)
                    VALUES (:id, :company_id, :sender_id, :type, :subject, :body, :priority, :attachments, NOW())
                ");
                $stmt->execute([
                    'id' => $messageId,
                    'company_id' => $companyId,
                    'sender_id' => $user['user_id'],
                    'type' => $messageType,
                    'subject' => $subject,
                    'body' => $body,
                    'priority' => $input['priority'] ?? 'normal',
                    'attachments' => json_encode($input['attachments'] ?? []),
                ]);

                // Insert recipients
                $stmt = $db->prepare("
                    INSERT INTO message_recipients (message_id, recipient_id, created_at)
                    VALUES (:message_id, :recipient_id, NOW())
                ");

                foreach ($recipients as $recipientId) {
                    $stmt->execute(['message_id' => $messageId, 'recipient_id' => $recipientId]);
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Mesajul a fost trimis',
                    'message_en' => 'Message sent',
                    'data' => ['id' => $messageId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'reply') {
                $messageId = $input['message_id'] ?? null;
                $body = $input['body'] ?? null;

                if (!$messageId || !$body) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Message ID and body required']);
                    exit;
                }

                $replyId = 'reply_' . bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO message_replies (id, message_id, sender_id, body, attachments, created_at)
                    VALUES (:id, :message_id, :sender_id, :body, :attachments, NOW())
                ");
                $stmt->execute([
                    'id' => $replyId,
                    'message_id' => $messageId,
                    'sender_id' => $user['user_id'],
                    'body' => $body,
                    'attachments' => json_encode($input['attachments'] ?? []),
                ]);

                // Update message updated_at
                $stmt = $db->prepare("UPDATE messages SET updated_at = NOW() WHERE id = :id");
                $stmt->execute(['id' => $messageId]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Răspunsul a fost trimis',
                    'message_en' => 'Reply sent',
                    'data' => ['id' => $replyId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'star') {
                $messageId = $input['message_id'] ?? null;
                $starred = $input['starred'] ?? true;

                if (!$messageId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Message ID required']);
                    exit;
                }

                $stmt = $db->prepare("UPDATE message_recipients SET starred = :starred WHERE message_id = :message_id AND recipient_id = :user_id");
                $stmt->execute(['starred' => $starred, 'message_id' => $messageId, 'user_id' => $user['user_id']]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => $starred ? 'Mesaj marcat cu stea' : 'Stea eliminată',
                    'message_en' => $starred ? 'Message starred' : 'Star removed',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'archive') {
                $messageIds = $input['message_ids'] ?? [];

                if (empty($messageIds)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Message IDs required']);
                    exit;
                }

                $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
                $stmt = $db->prepare("UPDATE message_recipients SET archived = true WHERE message_id IN ($placeholders) AND recipient_id = ?");
                $stmt->execute(array_merge($messageIds, [$user['user_id']]));

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Mesajele au fost arhivate',
                    'message_en' => 'Messages archived',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'mark_read') {
                $messageIds = $input['message_ids'] ?? [];

                if (empty($messageIds)) {
                    // Mark all as read
                    $stmt = $db->prepare("
                        UPDATE message_recipients SET read_at = NOW()
                        WHERE recipient_id = :user_id AND read_at IS NULL
                    ");
                    $stmt->execute(['user_id' => $user['user_id']]);
                } else {
                    $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
                    $stmt = $db->prepare("UPDATE message_recipients SET read_at = NOW() WHERE message_id IN ($placeholders) AND recipient_id = ? AND read_at IS NULL");
                    $stmt->execute(array_merge($messageIds, [$user['user_id']]));
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Mesajele au fost marcate ca citite',
                    'message_en' => 'Messages marked as read',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            $messageId = $_GET['id'] ?? null;

            if (!$messageId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Message ID required']);
                exit;
            }

            // Check if user is sender
            $stmt = $db->prepare("SELECT sender_id FROM messages WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $messageId, 'company_id' => $companyId]);
            $message = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($message && $message['sender_id'] === $user['user_id']) {
                // Delete entire message if sender
                $stmt = $db->prepare("DELETE FROM messages WHERE id = :id");
                $stmt->execute(['id' => $messageId]);
            } else {
                // Just remove from recipient's view
                $stmt = $db->prepare("DELETE FROM message_recipients WHERE message_id = :message_id AND recipient_id = :user_id");
                $stmt->execute(['message_id' => $messageId, 'user_id' => $user['user_id']]);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Mesajul a fost șters',
                'message_en' => 'Message deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function formatTimeAgo($datetime) {
    $time = strtotime($datetime);
    $diff = time() - $time;

    if ($diff < 60) return 'acum';
    if ($diff < 3600) return floor($diff / 60) . ' min';
    if ($diff < 86400) return floor($diff / 3600) . ' ore';
    if ($diff < 604800) return floor($diff / 86400) . ' zile';

    return date('d.m.Y', $time);
}
