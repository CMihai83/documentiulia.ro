<?php
/**
 * Email Templates API
 * Manage email templates for notifications and communications
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

// Email template categories
$templateCategories = [
    'invoicing' => [
        'label_ro' => 'Facturare',
        'label_en' => 'Invoicing',
        'templates' => [
            'invoice_sent' => ['ro' => 'Factură trimisă', 'en' => 'Invoice Sent'],
            'invoice_reminder' => ['ro' => 'Reminder factură', 'en' => 'Invoice Reminder'],
            'invoice_overdue' => ['ro' => 'Factură restantă', 'en' => 'Invoice Overdue'],
            'payment_received' => ['ro' => 'Plată primită', 'en' => 'Payment Received'],
            'quote_sent' => ['ro' => 'Ofertă trimisă', 'en' => 'Quote Sent'],
        ],
    ],
    'customer' => [
        'label_ro' => 'Clienți',
        'label_en' => 'Customers',
        'templates' => [
            'welcome_customer' => ['ro' => 'Bun venit client', 'en' => 'Welcome Customer'],
            'contact_update' => ['ro' => 'Date actualizate', 'en' => 'Contact Updated'],
            'thank_you' => ['ro' => 'Mulțumire', 'en' => 'Thank You'],
        ],
    ],
    'project' => [
        'label_ro' => 'Proiecte',
        'label_en' => 'Projects',
        'templates' => [
            'project_started' => ['ro' => 'Proiect început', 'en' => 'Project Started'],
            'project_completed' => ['ro' => 'Proiect finalizat', 'en' => 'Project Completed'],
            'task_assigned' => ['ro' => 'Sarcină atribuită', 'en' => 'Task Assigned'],
            'task_due_reminder' => ['ro' => 'Reminder termen', 'en' => 'Due Date Reminder'],
        ],
    ],
    'team' => [
        'label_ro' => 'Echipă',
        'label_en' => 'Team',
        'templates' => [
            'team_invite' => ['ro' => 'Invitație echipă', 'en' => 'Team Invitation'],
            'user_welcome' => ['ro' => 'Bun venit utilizator', 'en' => 'User Welcome'],
            'password_reset' => ['ro' => 'Resetare parolă', 'en' => 'Password Reset'],
            'role_changed' => ['ro' => 'Rol modificat', 'en' => 'Role Changed'],
        ],
    ],
    'reports' => [
        'label_ro' => 'Rapoarte',
        'label_en' => 'Reports',
        'templates' => [
            'weekly_summary' => ['ro' => 'Rezumat săptămânal', 'en' => 'Weekly Summary'],
            'monthly_report' => ['ro' => 'Raport lunar', 'en' => 'Monthly Report'],
            'low_stock_alert' => ['ro' => 'Alertă stoc scăzut', 'en' => 'Low Stock Alert'],
        ],
    ],
];

// Email template placeholders
$placeholders = [
    '{{recipient.name}}' => ['ro' => 'Nume destinatar', 'en' => 'Recipient Name'],
    '{{recipient.email}}' => ['ro' => 'Email destinatar', 'en' => 'Recipient Email'],
    '{{company.name}}' => ['ro' => 'Nume companie', 'en' => 'Company Name'],
    '{{company.logo}}' => ['ro' => 'Logo companie', 'en' => 'Company Logo'],
    '{{document.number}}' => ['ro' => 'Număr document', 'en' => 'Document Number'],
    '{{document.total}}' => ['ro' => 'Total document', 'en' => 'Document Total'],
    '{{document.due_date}}' => ['ro' => 'Data scadentă', 'en' => 'Due Date'],
    '{{document.link}}' => ['ro' => 'Link document', 'en' => 'Document Link'],
    '{{project.name}}' => ['ro' => 'Nume proiect', 'en' => 'Project Name'],
    '{{task.title}}' => ['ro' => 'Titlu sarcină', 'en' => 'Task Title'],
    '{{user.name}}' => ['ro' => 'Nume utilizator', 'en' => 'User Name'],
    '{{action.link}}' => ['ro' => 'Link acțiune', 'en' => 'Action Link'],
    '{{current_date}}' => ['ro' => 'Data curentă', 'en' => 'Current Date'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $templateKey = $_GET['key'] ?? null;
            $category = $_GET['category'] ?? null;

            if ($templateKey) {
                // Get single template
                $stmt = $db->prepare("
                    SELECT * FROM email_templates
                    WHERE template_key = :key AND (company_id = :company_id OR is_system = TRUE)
                    ORDER BY company_id DESC
                    LIMIT 1
                ");
                $stmt->execute(['key' => $templateKey, 'company_id' => $companyId]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$template) {
                    // Return default/system template structure
                    $template = [
                        'template_key' => $templateKey,
                        'subject_ro' => '',
                        'subject_en' => '',
                        'body_ro' => '',
                        'body_en' => '',
                        'is_html' => true,
                        'is_system' => false,
                    ];
                }

                echo json_encode([
                    'success' => true,
                    'data' => $template,
                    'placeholders' => $placeholders,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List all templates
                $stmt = $db->prepare("
                    SELECT * FROM email_templates
                    WHERE company_id = :company_id OR is_system = TRUE
                    ORDER BY template_key ASC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Index by template_key
                $templateIndex = [];
                foreach ($templates as $t) {
                    $templateIndex[$t['template_key']] = $t;
                }

                // Merge with categories
                $categorizedTemplates = [];
                foreach ($templateCategories as $catKey => $cat) {
                    $catTemplates = [];
                    foreach ($cat['templates'] as $tplKey => $label) {
                        $catTemplates[$tplKey] = [
                            'template_key' => $tplKey,
                            'label' => $label,
                            'is_customized' => isset($templateIndex[$tplKey]) && !$templateIndex[$tplKey]['is_system'],
                            'data' => $templateIndex[$tplKey] ?? null,
                        ];
                    }
                    $categorizedTemplates[$catKey] = [
                        'category' => $catKey,
                        'label' => $cat['label_ro'],
                        'label_en' => $cat['label_en'],
                        'templates' => $catTemplates,
                    ];
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'categories' => $categorizedTemplates,
                        'placeholders' => $placeholders,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
        case 'PUT':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a modifica șabloane email',
                    'error' => 'You do not have permission to modify email templates'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $templateKey = $input['template_key'] ?? null;
            $subjectRo = $input['subject_ro'] ?? null;
            $bodyRo = $input['body_ro'] ?? null;

            if (!$templateKey || !$subjectRo || !$bodyRo) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Cheia șablonului, subiectul și conținutul sunt obligatorii',
                    'error' => 'Template key, subject, and body are required'
                ]);
                exit;
            }

            // Check if exists
            $stmt = $db->prepare("SELECT id FROM email_templates WHERE template_key = :key AND company_id = :company_id");
            $stmt->execute(['key' => $templateKey, 'company_id' => $companyId]);
            $existing = $stmt->fetch();

            if ($existing) {
                // Update
                $stmt = $db->prepare("
                    UPDATE email_templates SET
                        subject_ro = :subject_ro,
                        subject_en = :subject_en,
                        body_ro = :body_ro,
                        body_en = :body_en,
                        is_html = :is_html,
                        updated_at = NOW()
                    WHERE id = :id
                ");
                $stmt->execute([
                    'id' => $existing['id'],
                    'subject_ro' => $subjectRo,
                    'subject_en' => $input['subject_en'] ?? $subjectRo,
                    'body_ro' => $bodyRo,
                    'body_en' => $input['body_en'] ?? $bodyRo,
                    'is_html' => ($input['is_html'] ?? true) ? 1 : 0,
                ]);
            } else {
                // Insert
                $templateId = 'etpl_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO email_templates (
                        id, company_id, template_key, subject_ro, subject_en, body_ro, body_en, is_html, is_system, created_at
                    ) VALUES (
                        :id, :company_id, :template_key, :subject_ro, :subject_en, :body_ro, :body_en, :is_html, FALSE, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $templateId,
                    'company_id' => $companyId,
                    'template_key' => $templateKey,
                    'subject_ro' => $subjectRo,
                    'subject_en' => $input['subject_en'] ?? $subjectRo,
                    'body_ro' => $bodyRo,
                    'body_en' => $input['body_en'] ?? $bodyRo,
                    'is_html' => ($input['is_html'] ?? true) ? 1 : 0,
                ]);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon email salvat',
                'message_en' => 'Email template saved',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a șterge șabloane email',
                    'error' => 'You do not have permission to delete email templates'
                ]);
                exit;
            }

            $templateKey = $_GET['key'] ?? null;

            if (!$templateKey) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'template_key required']);
                exit;
            }

            // Can only delete company-specific templates (not system)
            $stmt = $db->prepare("DELETE FROM email_templates WHERE template_key = :key AND company_id = :company_id AND is_system = FALSE");
            $stmt->execute(['key' => $templateKey, 'company_id' => $companyId]);

            if ($stmt->rowCount() === 0) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți șterge acest șablon',
                    'error' => 'Cannot delete this template'
                ]);
                exit;
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon email șters (va fi folosit cel implicit)',
                'message_en' => 'Email template deleted (default will be used)',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
