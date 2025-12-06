<?php
/**
 * Support Tickets API
 * Manage customer support tickets
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

// Ticket categories
$ticketCategories = [
    'technical' => ['ro' => 'Tehnic', 'en' => 'Technical', 'icon' => 'build'],
    'billing' => ['ro' => 'Facturare', 'en' => 'Billing', 'icon' => 'payment'],
    'account' => ['ro' => 'Cont', 'en' => 'Account', 'icon' => 'person'],
    'feature_request' => ['ro' => 'Solicitare funcționalitate', 'en' => 'Feature Request', 'icon' => 'lightbulb'],
    'bug_report' => ['ro' => 'Raport eroare', 'en' => 'Bug Report', 'icon' => 'bug_report'],
    'integration' => ['ro' => 'Integrare', 'en' => 'Integration', 'icon' => 'extension'],
    'training' => ['ro' => 'Instruire', 'en' => 'Training', 'icon' => 'school'],
    'other' => ['ro' => 'Altele', 'en' => 'Other', 'icon' => 'help'],
];

// Ticket priorities
$ticketPriorities = [
    'low' => ['ro' => 'Scăzută', 'en' => 'Low', 'color' => '#9E9E9E', 'sla_hours' => 72],
    'normal' => ['ro' => 'Normală', 'en' => 'Normal', 'color' => '#2196F3', 'sla_hours' => 48],
    'high' => ['ro' => 'Ridicată', 'en' => 'High', 'color' => '#FF9800', 'sla_hours' => 24],
    'urgent' => ['ro' => 'Urgentă', 'en' => 'Urgent', 'color' => '#F44336', 'sla_hours' => 4],
    'critical' => ['ro' => 'Critică', 'en' => 'Critical', 'color' => '#9C27B0', 'sla_hours' => 1],
];

// Ticket statuses
$ticketStatuses = [
    'open' => ['ro' => 'Deschis', 'en' => 'Open', 'color' => '#2196F3'],
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending', 'color' => '#FF9800'],
    'in_progress' => ['ro' => 'În lucru', 'en' => 'In Progress', 'color' => '#9C27B0'],
    'waiting_customer' => ['ro' => 'Așteptare client', 'en' => 'Waiting Customer', 'color' => '#00BCD4'],
    'resolved' => ['ro' => 'Rezolvat', 'en' => 'Resolved', 'color' => '#4CAF50'],
    'closed' => ['ro' => 'Închis', 'en' => 'Closed', 'color' => '#9E9E9E'],
    'reopened' => ['ro' => 'Redeschis', 'en' => 'Reopened', 'color' => '#FF5722'],
];

// Satisfaction ratings
$satisfactionRatings = [
    1 => ['ro' => 'Foarte nemulțumit', 'en' => 'Very Dissatisfied', 'emoji' => '😠'],
    2 => ['ro' => 'Nemulțumit', 'en' => 'Dissatisfied', 'emoji' => '😞'],
    3 => ['ro' => 'Neutru', 'en' => 'Neutral', 'emoji' => '😐'],
    4 => ['ro' => 'Mulțumit', 'en' => 'Satisfied', 'emoji' => '😊'],
    5 => ['ro' => 'Foarte mulțumit', 'en' => 'Very Satisfied', 'emoji' => '😍'],
];

// Escalation levels
$escalationLevels = [
    'level_1' => ['ro' => 'Nivel 1 - Suport standard', 'en' => 'Level 1 - Standard Support'],
    'level_2' => ['ro' => 'Nivel 2 - Suport specializat', 'en' => 'Level 2 - Specialized Support'],
    'level_3' => ['ro' => 'Nivel 3 - Suport tehnic avansat', 'en' => 'Level 3 - Advanced Technical'],
    'management' => ['ro' => 'Management', 'en' => 'Management'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $status = $_GET['status'] ?? null;
                $priority = $_GET['priority'] ?? null;
                $category = $_GET['category'] ?? null;
                $assignedTo = $_GET['assigned_to'] ?? null;
                $limit = intval($_GET['limit'] ?? 20);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT t.*, u.first_name, u.last_name, u.email as user_email,
                           a.first_name as agent_first_name, a.last_name as agent_last_name
                    FROM support_tickets t
                    LEFT JOIN users u ON t.user_id = u.id
                    LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE t.company_id = :company_id
                ";
                $params = ['company_id' => $companyId];

                // Regular users see only their tickets
                if (!in_array($user['role'], ['admin', 'manager'])) {
                    $sql .= " AND t.user_id = :user_id";
                    $params['user_id'] = $user['user_id'];
                }

                if ($status) {
                    $sql .= " AND t.status = :status";
                    $params['status'] = $status;
                }
                if ($priority) {
                    $sql .= " AND t.priority = :priority";
                    $params['priority'] = $priority;
                }
                if ($category) {
                    $sql .= " AND t.category = :category";
                    $params['category'] = $category;
                }
                if ($assignedTo) {
                    $sql .= " AND t.assigned_to = :assigned_to";
                    $params['assigned_to'] = $assignedTo;
                }

                $sql .= " ORDER BY 
                    CASE t.priority 
                        WHEN 'critical' THEN 1 
                        WHEN 'urgent' THEN 2 
                        WHEN 'high' THEN 3 
                        WHEN 'normal' THEN 4 
                        ELSE 5 
                    END,
                    t.created_at DESC
                    LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($tickets as &$ticket) {
                    $ticket['user_name'] = trim(($ticket['first_name'] ?? '') . ' ' . ($ticket['last_name'] ?? ''));
                    $ticket['agent_name'] = trim(($ticket['agent_first_name'] ?? '') . ' ' . ($ticket['agent_last_name'] ?? ''));
                    $ticket['category_config'] = $ticketCategories[$ticket['category']] ?? null;
                    $ticket['priority_config'] = $ticketPriorities[$ticket['priority']] ?? null;
                    $ticket['status_config'] = $ticketStatuses[$ticket['status']] ?? null;
                    $ticket['is_overdue'] = isTicketOverdue($ticket);
                }

                // Get total count
                $countSql = "SELECT COUNT(*) FROM support_tickets WHERE company_id = :company_id";
                if (!in_array($user['role'], ['admin', 'manager'])) {
                    $countSql .= " AND user_id = :user_id";
                }
                $stmt = $db->prepare($countSql);
                $stmt->execute(in_array($user['role'], ['admin', 'manager']) ? ['company_id' => $companyId] : ['company_id' => $companyId, 'user_id' => $user['user_id']]);
                $total = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'tickets' => $tickets,
                        'total' => intval($total),
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'get') {
                $ticketId = $_GET['id'] ?? null;

                if (!$ticketId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Ticket ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT t.*, u.first_name, u.last_name, u.email as user_email
                    FROM support_tickets t
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.id = :id AND t.company_id = :company_id
                ");
                $stmt->execute(['id' => $ticketId, 'company_id' => $companyId]);
                $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$ticket) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Tichetul nu a fost găsit',
                        'error' => 'Ticket not found'
                    ]);
                    exit;
                }

                // Check access
                if (!in_array($user['role'], ['admin', 'manager']) && $ticket['user_id'] !== $user['user_id']) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Access denied']);
                    exit;
                }

                $ticket['category_config'] = $ticketCategories[$ticket['category']] ?? null;
                $ticket['priority_config'] = $ticketPriorities[$ticket['priority']] ?? null;
                $ticket['status_config'] = $ticketStatuses[$ticket['status']] ?? null;
                $ticket['attachments'] = json_decode($ticket['attachments'] ?? '[]', true);

                // Get ticket messages
                $stmt = $db->prepare("
                    SELECT m.*, u.first_name, u.last_name, u.avatar_url
                    FROM ticket_messages m
                    LEFT JOIN users u ON m.user_id = u.id
                    WHERE m.ticket_id = :ticket_id
                    ORDER BY m.created_at ASC
                ");
                $stmt->execute(['ticket_id' => $ticketId]);
                $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($messages as &$msg) {
                    $msg['user_name'] = trim(($msg['first_name'] ?? '') . ' ' . ($msg['last_name'] ?? ''));
                    $msg['attachments'] = json_decode($msg['attachments'] ?? '[]', true);
                }

                $ticket['messages'] = $messages;

                echo json_encode([
                    'success' => true,
                    'data' => $ticket,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'categories' => $ticketCategories,
                        'priorities' => $ticketPriorities,
                        'statuses' => $ticketStatuses,
                        'satisfaction' => $satisfactionRatings,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'stats') {
                // Ticket statistics (admin/manager only)
                if (!in_array($user['role'], ['admin', 'manager'])) {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Access denied']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE status = 'open') as open,
                        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                        COUNT(*) FILTER (WHERE status = 'pending') as pending,
                        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                        COUNT(*) FILTER (WHERE status = 'closed') as closed,
                        COUNT(*) FILTER (WHERE priority IN ('urgent', 'critical')) as urgent,
                        AVG(satisfaction_rating) FILTER (WHERE satisfaction_rating IS NOT NULL) as avg_satisfaction
                    FROM support_tickets WHERE company_id = :company_id
                ");
                $stmt->execute(['company_id' => $companyId]);
                $stats = $stmt->fetch(PDO::FETCH_ASSOC);

                // By category
                $stmt = $db->prepare("
                    SELECT category, COUNT(*) as count FROM support_tickets
                    WHERE company_id = :company_id GROUP BY category ORDER BY count DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
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
                $subject = $input['subject'] ?? null;
                $description = $input['description'] ?? null;
                $category = $input['category'] ?? 'other';
                $priority = $input['priority'] ?? 'normal';

                if (!$subject || !$description) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Subiectul și descrierea sunt obligatorii',
                        'error' => 'Subject and description are required'
                    ]);
                    exit;
                }

                $ticketId = 'TKT-' . strtoupper(bin2hex(random_bytes(4)));
                $slaDeadline = date('Y-m-d H:i:s', strtotime('+' . ($ticketPriorities[$priority]['sla_hours'] ?? 48) . ' hours'));

                $stmt = $db->prepare("
                    INSERT INTO support_tickets (
                        id, company_id, user_id, subject, description, category, priority,
                        status, sla_deadline, attachments, created_at
                    ) VALUES (
                        :id, :company_id, :user_id, :subject, :description, :category, :priority,
                        'open', :sla_deadline, :attachments, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $ticketId,
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'subject' => $subject,
                    'description' => $description,
                    'category' => $category,
                    'priority' => $priority,
                    'sla_deadline' => $slaDeadline,
                    'attachments' => json_encode($input['attachments'] ?? []),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Tichetul a fost creat',
                    'message_en' => 'Ticket created',
                    'data' => ['id' => $ticketId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'reply') {
                $ticketId = $input['ticket_id'] ?? null;
                $message = $input['message'] ?? null;

                if (!$ticketId || !$message) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Ticket ID and message required']);
                    exit;
                }

                $messageId = 'msg_' . bin2hex(random_bytes(8));
                $isInternal = $input['is_internal'] ?? false;

                $stmt = $db->prepare("
                    INSERT INTO ticket_messages (id, ticket_id, user_id, message, is_internal, attachments, created_at)
                    VALUES (:id, :ticket_id, :user_id, :message, :is_internal, :attachments, NOW())
                ");
                $stmt->execute([
                    'id' => $messageId,
                    'ticket_id' => $ticketId,
                    'user_id' => $user['user_id'],
                    'message' => $message,
                    'is_internal' => $isInternal ? 1 : 0,
                    'attachments' => json_encode($input['attachments'] ?? []),
                ]);

                // Update ticket status if agent replies
                if (in_array($user['role'], ['admin', 'manager'])) {
                    $stmt = $db->prepare("UPDATE support_tickets SET status = 'waiting_customer', last_response_at = NOW() WHERE id = :id");
                } else {
                    $stmt = $db->prepare("UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = :id");
                }
                $stmt->execute(['id' => $ticketId]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Răspunsul a fost trimis',
                    'message_en' => 'Reply sent',
                    'data' => ['id' => $messageId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'rate') {
                $ticketId = $input['ticket_id'] ?? null;
                $rating = intval($input['rating'] ?? 0);
                $feedback = $input['feedback'] ?? null;

                if (!$ticketId || $rating < 1 || $rating > 5) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Valid ticket ID and rating (1-5) required']);
                    exit;
                }

                $stmt = $db->prepare("
                    UPDATE support_tickets 
                    SET satisfaction_rating = :rating, satisfaction_feedback = :feedback, rated_at = NOW()
                    WHERE id = :id AND company_id = :company_id
                ");
                $stmt->execute([
                    'id' => $ticketId,
                    'company_id' => $companyId,
                    'rating' => $rating,
                    'feedback' => $feedback,
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Mulțumim pentru evaluare!',
                    'message_en' => 'Thank you for your feedback!',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $ticketId = $input['id'] ?? null;

            if (!$ticketId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Ticket ID required']);
                exit;
            }

            $updateFields = [];
            $params = ['id' => $ticketId, 'company_id' => $companyId];

            // Admin/manager can update more fields
            if (in_array($user['role'], ['admin', 'manager'])) {
                if (isset($input['status'])) {
                    $updateFields[] = "status = :status";
                    $params['status'] = $input['status'];
                    
                    if ($input['status'] === 'resolved') {
                        $updateFields[] = "resolved_at = NOW()";
                    }
                }
                if (isset($input['priority'])) {
                    $updateFields[] = "priority = :priority";
                    $params['priority'] = $input['priority'];
                }
                if (isset($input['assigned_to'])) {
                    $updateFields[] = "assigned_to = :assigned_to";
                    $params['assigned_to'] = $input['assigned_to'];
                }
                if (isset($input['category'])) {
                    $updateFields[] = "category = :category";
                    $params['category'] = $input['category'];
                }
            }

            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE support_tickets SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = :id AND company_id = :company_id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Tichetul a fost actualizat',
                'message_en' => 'Ticket updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function isTicketOverdue($ticket) {
    if (in_array($ticket['status'], ['resolved', 'closed'])) return false;
    if (!$ticket['sla_deadline']) return false;
    return strtotime($ticket['sla_deadline']) < time();
}
