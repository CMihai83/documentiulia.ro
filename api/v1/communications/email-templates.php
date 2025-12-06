<?php
/**
 * Email Templates API
 * Manage email templates for automated communications
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

// Admin only for template management
if (!in_array($user['role'], ['admin', 'owner'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot gestiona șabloanele',
        'error' => 'Only administrators can manage templates'
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Template categories
$templateCategories = [
    'invoice' => ['ro' => 'Facturi', 'en' => 'Invoices'],
    'payment' => ['ro' => 'Plăți', 'en' => 'Payments'],
    'reminder' => ['ro' => 'Remindere', 'en' => 'Reminders'],
    'welcome' => ['ro' => 'Bun venit', 'en' => 'Welcome'],
    'notification' => ['ro' => 'Notificări', 'en' => 'Notifications'],
    'marketing' => ['ro' => 'Marketing', 'en' => 'Marketing'],
    'support' => ['ro' => 'Suport', 'en' => 'Support'],
    'system' => ['ro' => 'Sistem', 'en' => 'System'],
];

// Template types (trigger events)
$templateTypes = [
    'invoice_sent' => ['ro' => 'Factură trimisă', 'en' => 'Invoice Sent', 'category' => 'invoice'],
    'invoice_reminder' => ['ro' => 'Reminder factură', 'en' => 'Invoice Reminder', 'category' => 'invoice'],
    'invoice_overdue' => ['ro' => 'Factură restantă', 'en' => 'Invoice Overdue', 'category' => 'invoice'],
    'payment_received' => ['ro' => 'Plată primită', 'en' => 'Payment Received', 'category' => 'payment'],
    'payment_confirmation' => ['ro' => 'Confirmare plată', 'en' => 'Payment Confirmation', 'category' => 'payment'],
    'welcome_email' => ['ro' => 'Email bun venit', 'en' => 'Welcome Email', 'category' => 'welcome'],
    'team_invite' => ['ro' => 'Invitație echipă', 'en' => 'Team Invite', 'category' => 'welcome'],
    'password_reset' => ['ro' => 'Resetare parolă', 'en' => 'Password Reset', 'category' => 'system'],
    'quote_sent' => ['ro' => 'Ofertă trimisă', 'en' => 'Quote Sent', 'category' => 'invoice'],
    'order_confirmation' => ['ro' => 'Confirmare comandă', 'en' => 'Order Confirmation', 'category' => 'notification'],
    'ticket_update' => ['ro' => 'Actualizare tichet', 'en' => 'Ticket Update', 'category' => 'support'],
    'custom' => ['ro' => 'Personalizat', 'en' => 'Custom', 'category' => 'marketing'],
];

// Available placeholders
$placeholders = [
    'company' => [
        '{{company_name}}' => ['ro' => 'Nume companie', 'en' => 'Company Name'],
        '{{company_email}}' => ['ro' => 'Email companie', 'en' => 'Company Email'],
        '{{company_phone}}' => ['ro' => 'Telefon companie', 'en' => 'Company Phone'],
        '{{company_address}}' => ['ro' => 'Adresă companie', 'en' => 'Company Address'],
        '{{company_logo}}' => ['ro' => 'Logo companie', 'en' => 'Company Logo'],
    ],
    'recipient' => [
        '{{recipient_name}}' => ['ro' => 'Nume destinatar', 'en' => 'Recipient Name'],
        '{{recipient_email}}' => ['ro' => 'Email destinatar', 'en' => 'Recipient Email'],
        '{{recipient_first_name}}' => ['ro' => 'Prenume destinatar', 'en' => 'Recipient First Name'],
    ],
    'invoice' => [
        '{{invoice_number}}' => ['ro' => 'Număr factură', 'en' => 'Invoice Number'],
        '{{invoice_date}}' => ['ro' => 'Dată factură', 'en' => 'Invoice Date'],
        '{{invoice_due_date}}' => ['ro' => 'Dată scadență', 'en' => 'Due Date'],
        '{{invoice_total}}' => ['ro' => 'Total factură', 'en' => 'Invoice Total'],
        '{{invoice_status}}' => ['ro' => 'Status factură', 'en' => 'Invoice Status'],
        '{{invoice_link}}' => ['ro' => 'Link factură', 'en' => 'Invoice Link'],
    ],
    'payment' => [
        '{{payment_amount}}' => ['ro' => 'Sumă plată', 'en' => 'Payment Amount'],
        '{{payment_date}}' => ['ro' => 'Dată plată', 'en' => 'Payment Date'],
        '{{payment_method}}' => ['ro' => 'Metodă plată', 'en' => 'Payment Method'],
    ],
    'system' => [
        '{{reset_link}}' => ['ro' => 'Link resetare', 'en' => 'Reset Link'],
        '{{invite_link}}' => ['ro' => 'Link invitație', 'en' => 'Invite Link'],
        '{{current_date}}' => ['ro' => 'Data curentă', 'en' => 'Current Date'],
    ],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $category = $_GET['category'] ?? null;
                $type = $_GET['type'] ?? null;
                $active = $_GET['active'] ?? null;

                $sql = "
                    SELECT * FROM email_templates
                    WHERE company_id = :company_id
                ";
                $params = ['company_id' => $companyId];

                if ($category) {
                    $sql .= " AND category = :category";
                    $params['category'] = $category;
                }
                if ($type) {
                    $sql .= " AND template_type = :type";
                    $params['type'] = $type;
                }
                if ($active !== null) {
                    $sql .= " AND is_active = :active";
                    $params['active'] = $active === 'true';
                }

                $sql .= " ORDER BY category, name";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($templates as &$tpl) {
                    $tpl['category_config'] = $templateCategories[$tpl['category']] ?? null;
                    $tpl['type_config'] = $templateTypes[$tpl['template_type']] ?? null;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'templates' => $templates,
                        'categories' => $templateCategories,
                        'types' => $templateTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'get') {
                $templateId = $_GET['id'] ?? null;

                if (!$templateId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Template ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM email_templates WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$template) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Șablonul nu a fost găsit',
                        'error' => 'Template not found'
                    ]);
                    exit;
                }

                $template['category_config'] = $templateCategories[$template['category']] ?? null;
                $template['type_config'] = $templateTypes[$template['template_type']] ?? null;

                echo json_encode([
                    'success' => true,
                    'data' => $template,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'placeholders') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'placeholders' => $placeholders,
                        'categories' => $templateCategories,
                        'types' => $templateTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'preview') {
                $templateId = $_GET['id'] ?? null;

                if (!$templateId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Template ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM email_templates WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$template) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Template not found']);
                    exit;
                }

                // Replace placeholders with sample data
                $sampleData = [
                    '{{company_name}}' => 'Exemplu SRL',
                    '{{company_email}}' => 'contact@exemplu.ro',
                    '{{recipient_name}}' => 'Ion Popescu',
                    '{{recipient_first_name}}' => 'Ion',
                    '{{invoice_number}}' => 'FACT-2025-001',
                    '{{invoice_total}}' => '1.500,00 RON',
                    '{{invoice_due_date}}' => date('d.m.Y', strtotime('+30 days')),
                    '{{current_date}}' => date('d.m.Y'),
                ];

                $previewSubject = strtr($template['subject'], $sampleData);
                $previewBody = strtr($template['body_html'], $sampleData);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'subject' => $previewSubject,
                        'body_html' => $previewBody,
                        'sample_data' => $sampleData,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            $name = $input['name'] ?? null;
            $category = $input['category'] ?? 'notification';
            $templateType = $input['template_type'] ?? 'custom';
            $subject = $input['subject'] ?? null;
            $bodyHtml = $input['body_html'] ?? null;

            if (!$name || !$subject || !$bodyHtml) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Numele, subiectul și conținutul sunt obligatorii',
                    'error' => 'Name, subject and body are required'
                ]);
                exit;
            }

            $templateId = 'tpl_' . bin2hex(random_bytes(8));

            $stmt = $db->prepare("
                INSERT INTO email_templates (
                    id, company_id, name, category, template_type, subject, body_html, body_text,
                    is_active, language, created_by, created_at
                ) VALUES (
                    :id, :company_id, :name, :category, :type, :subject, :body_html, :body_text,
                    :is_active, :language, :created_by, NOW()
                )
            ");
            $stmt->execute([
                'id' => $templateId,
                'company_id' => $companyId,
                'name' => $name,
                'category' => $category,
                'type' => $templateType,
                'subject' => $subject,
                'body_html' => $bodyHtml,
                'body_text' => strip_tags($bodyHtml),
                'is_active' => $input['is_active'] ?? true,
                'language' => $input['language'] ?? 'ro',
                'created_by' => $user['user_id'],
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablonul a fost creat',
                'message_en' => 'Template created',
                'data' => ['id' => $templateId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $templateId = $input['id'] ?? null;

            if (!$templateId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Template ID required']);
                exit;
            }

            $updateFields = [];
            $params = ['id' => $templateId, 'company_id' => $companyId];

            $allowedFields = ['name', 'category', 'template_type', 'subject', 'body_html', 'is_active', 'language'];

            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateFields[] = "$field = :$field";
                    $params[$field] = $input[$field];

                    // Also update plain text body if HTML is updated
                    if ($field === 'body_html') {
                        $updateFields[] = "body_text = :body_text";
                        $params['body_text'] = strip_tags($input[$field]);
                    }
                }
            }

            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE email_templates SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = :id AND company_id = :company_id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablonul a fost actualizat',
                'message_en' => 'Template updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $templateId = $_GET['id'] ?? null;

            if (!$templateId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Template ID required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM email_templates WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablonul a fost șters',
                'message_en' => 'Template deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
