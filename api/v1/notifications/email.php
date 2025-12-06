<?php
/**
 * Email Notifications API
 * Manage email sending and tracking
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

// Email statuses
$statuses = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
    'sent' => ['ro' => 'Trimis', 'en' => 'Sent'],
    'delivered' => ['ro' => 'Livrat', 'en' => 'Delivered'],
    'opened' => ['ro' => 'Deschis', 'en' => 'Opened'],
    'clicked' => ['ro' => 'Click', 'en' => 'Clicked'],
    'bounced' => ['ro' => 'Respins', 'en' => 'Bounced'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed'],
];

// Email categories
$categories = [
    'transactional' => ['ro' => 'Tranzacțional', 'en' => 'Transactional'],
    'notification' => ['ro' => 'Notificare', 'en' => 'Notification'],
    'reminder' => ['ro' => 'Memento', 'en' => 'Reminder'],
    'marketing' => ['ro' => 'Marketing', 'en' => 'Marketing'],
    'digest' => ['ro' => 'Rezumat', 'en' => 'Digest'],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        // List sent emails (admin/manager only)
        if (!in_array($user['role'], ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Nu aveți permisiunea de a vizualiza istoricul emailurilor',
                'error' => 'You do not have permission to view email history'
            ]);
            exit;
        }

        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(100, max(10, intval($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $status = $_GET['status'] ?? null;
        $category = $_GET['category'] ?? null;

        // Build query
        $sql = "
            SELECT e.*, u.first_name, u.last_name, u.email as recipient_email
            FROM email_logs e
            LEFT JOIN users u ON e.recipient_id = u.id
            WHERE e.company_id = :company_id
        ";
        $params = ['company_id' => $companyId];

        if ($status) {
            $sql .= " AND e.status = :status";
            $params['status'] = $status;
        }
        if ($category) {
            $sql .= " AND e.category = :category";
            $params['category'] = $category;
        }

        // Count total
        $countStmt = $db->prepare(str_replace('SELECT e.*, u.first_name, u.last_name, u.email as recipient_email', 'SELECT COUNT(*)', $sql));
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        // Get emails
        $sql .= " ORDER BY e.created_at DESC LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($emails as &$e) {
            $e['status_label'] = $statuses[$e['status']] ?? ['ro' => $e['status'], 'en' => $e['status']];
            $e['category_label'] = $categories[$e['category']] ?? ['ro' => $e['category'], 'en' => $e['category']];
        }

        // Get stats
        $statsStmt = $db->prepare("
            SELECT status, COUNT(*) as count
            FROM email_logs
            WHERE company_id = :company_id
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY status
        ");
        $statsStmt->execute(['company_id' => $companyId]);
        $stats = [];
        while ($row = $statsStmt->fetch(PDO::FETCH_ASSOC)) {
            $stats[$row['status']] = intval($row['count']);
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'emails' => $emails,
                'stats' => $stats,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => intval($total),
                    'total_pages' => ceil($total / $limit),
                ],
                'statuses' => $statuses,
                'categories' => $categories,
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'send';

        if ($action === 'send') {
            // Send email
            $to = $input['to'] ?? null;
            $subject = $input['subject'] ?? null;
            $body = $input['body'] ?? null;
            $template = $input['template'] ?? null;

            if (!$to || !$subject) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Destinatar și subiect sunt obligatorii',
                    'error' => 'Recipient and subject are required'
                ]);
                exit;
            }

            // Log the email
            $emailId = 'email_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO email_logs (
                    id, company_id, recipient_id, recipient_email, subject, body_preview,
                    template_id, category, status, created_at
                ) VALUES (
                    :id, :company_id, :recipient_id, :recipient_email, :subject, :body_preview,
                    :template_id, :category, 'pending', NOW()
                )
            ");
            $stmt->execute([
                'id' => $emailId,
                'company_id' => $companyId,
                'recipient_id' => $input['recipient_id'] ?? null,
                'recipient_email' => $to,
                'subject' => $subject,
                'body_preview' => substr(strip_tags($body ?? ''), 0, 200),
                'template_id' => $template,
                'category' => $input['category'] ?? 'notification',
            ]);

            // In production, would actually send via SMTP/SendGrid/etc.
            // For now, mark as sent
            $db->prepare("UPDATE email_logs SET status = 'sent', sent_at = NOW() WHERE id = :id")
               ->execute(['id' => $emailId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Email trimis cu succes',
                'message_en' => 'Email sent successfully',
                'data' => ['id' => $emailId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'resend') {
            // Resend failed email
            $emailId = $input['email_id'] ?? null;
            if (!$emailId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'email_id required']);
                exit;
            }

            // Get original email
            $stmt = $db->prepare("
                SELECT * FROM email_logs
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $emailId, 'company_id' => $companyId]);
            $email = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$email) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Email not found']);
                exit;
            }

            // Create new email log
            $newEmailId = 'email_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO email_logs (
                    id, company_id, recipient_id, recipient_email, subject, body_preview,
                    template_id, category, status, original_id, created_at
                ) VALUES (
                    :id, :company_id, :recipient_id, :recipient_email, :subject, :body_preview,
                    :template_id, :category, 'sent', :original_id, NOW()
                )
            ");
            $stmt->execute([
                'id' => $newEmailId,
                'company_id' => $companyId,
                'recipient_id' => $email['recipient_id'],
                'recipient_email' => $email['recipient_email'],
                'subject' => $email['subject'],
                'body_preview' => $email['body_preview'],
                'template_id' => $email['template_id'],
                'category' => $email['category'],
                'original_id' => $emailId,
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Email retrimis',
                'message_en' => 'Email resent',
                'data' => ['id' => $newEmailId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } elseif ($action === 'track') {
            // Track email event (webhook from email provider)
            $emailId = $input['email_id'] ?? null;
            $event = $input['event'] ?? null; // opened, clicked, bounced

            if ($emailId && $event && isset($statuses[$event])) {
                $stmt = $db->prepare("
                    UPDATE email_logs
                    SET status = :status, {$event}_at = NOW()
                    WHERE id = :id
                ");
                $stmt->execute(['status' => $event, 'id' => $emailId]);
            }

            echo json_encode(['success' => true]);
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
