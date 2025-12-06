<?php
/**
 * Email Templates API
 * Manage email templates for automation
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

// Template categories
$templateCategories = [
    'invoicing' => ['label_ro' => 'Facturare', 'label_en' => 'Invoicing'],
    'payments' => ['label_ro' => 'Plăți', 'label_en' => 'Payments'],
    'reminders' => ['label_ro' => 'Memento', 'label_en' => 'Reminders'],
    'welcome' => ['label_ro' => 'Bun Venit', 'label_en' => 'Welcome'],
    'notifications' => ['label_ro' => 'Notificări', 'label_en' => 'Notifications'],
    'marketing' => ['label_ro' => 'Marketing', 'label_en' => 'Marketing'],
];

// Available merge fields
$mergeFields = [
    'company' => [
        '{{company_name}}' => ['ro' => 'Numele Companiei', 'en' => 'Company Name'],
        '{{company_email}}' => ['ro' => 'Email Companie', 'en' => 'Company Email'],
        '{{company_phone}}' => ['ro' => 'Telefon Companie', 'en' => 'Company Phone'],
        '{{company_address}}' => ['ro' => 'Adresă Companie', 'en' => 'Company Address'],
        '{{company_tax_id}}' => ['ro' => 'CUI Companie', 'en' => 'Company Tax ID'],
    ],
    'contact' => [
        '{{contact_name}}' => ['ro' => 'Nume Contact', 'en' => 'Contact Name'],
        '{{contact_email}}' => ['ro' => 'Email Contact', 'en' => 'Contact Email'],
        '{{contact_company}}' => ['ro' => 'Companie Contact', 'en' => 'Contact Company'],
    ],
    'invoice' => [
        '{{invoice_number}}' => ['ro' => 'Număr Factură', 'en' => 'Invoice Number'],
        '{{invoice_date}}' => ['ro' => 'Data Facturii', 'en' => 'Invoice Date'],
        '{{invoice_due_date}}' => ['ro' => 'Data Scadenței', 'en' => 'Due Date'],
        '{{invoice_total}}' => ['ro' => 'Total Factură', 'en' => 'Invoice Total'],
        '{{invoice_status}}' => ['ro' => 'Status Factură', 'en' => 'Invoice Status'],
        '{{invoice_link}}' => ['ro' => 'Link Factură', 'en' => 'Invoice Link'],
    ],
    'payment' => [
        '{{payment_amount}}' => ['ro' => 'Sumă Plată', 'en' => 'Payment Amount'],
        '{{payment_date}}' => ['ro' => 'Data Plății', 'en' => 'Payment Date'],
        '{{payment_method}}' => ['ro' => 'Metodă Plată', 'en' => 'Payment Method'],
    ],
];

// System templates (read-only)
$systemTemplates = [
    [
        'id' => 'system_invoice_created',
        'name' => 'Factură Nouă / New Invoice',
        'category' => 'invoicing',
        'subject_ro' => 'Factură nouă #{{invoice_number}}',
        'subject_en' => 'New Invoice #{{invoice_number}}',
        'body_ro' => "Bună ziua {{contact_name}},\n\nVă transmitem factura #{{invoice_number}} în valoare de {{invoice_total}} RON.\n\nData scadenței: {{invoice_due_date}}\n\nPuteți vizualiza factura accesând: {{invoice_link}}\n\nVă mulțumim!\n{{company_name}}",
        'body_en' => "Hello {{contact_name}},\n\nPlease find invoice #{{invoice_number}} for {{invoice_total}} RON.\n\nDue date: {{invoice_due_date}}\n\nYou can view the invoice at: {{invoice_link}}\n\nThank you!\n{{company_name}}",
        'is_system' => true,
    ],
    [
        'id' => 'system_payment_reminder',
        'name' => 'Memento Plată / Payment Reminder',
        'category' => 'reminders',
        'subject_ro' => 'Memento: Factură #{{invoice_number}} scadentă',
        'subject_en' => 'Reminder: Invoice #{{invoice_number}} is due',
        'body_ro' => "Bună ziua {{contact_name}},\n\nVă reamintim că factura #{{invoice_number}} în valoare de {{invoice_total}} RON a ajuns la scadență.\n\nVă rugăm să efectuați plata cât mai curând.\n\nDetalii plată: {{invoice_link}}\n\n{{company_name}}",
        'body_en' => "Hello {{contact_name}},\n\nThis is a reminder that invoice #{{invoice_number}} for {{invoice_total}} RON is now due.\n\nPlease make payment at your earliest convenience.\n\nPayment details: {{invoice_link}}\n\n{{company_name}}",
        'is_system' => true,
    ],
    [
        'id' => 'system_payment_received',
        'name' => 'Confirmare Plată / Payment Confirmation',
        'category' => 'payments',
        'subject_ro' => 'Plată primită - Factură #{{invoice_number}}',
        'subject_en' => 'Payment Received - Invoice #{{invoice_number}}',
        'body_ro' => "Bună ziua {{contact_name}},\n\nConfirmăm primirea plății în valoare de {{payment_amount}} RON pentru factura #{{invoice_number}}.\n\nData plății: {{payment_date}}\nMetodă: {{payment_method}}\n\nVă mulțumim pentru plată!\n{{company_name}}",
        'body_en' => "Hello {{contact_name}},\n\nWe confirm receipt of payment of {{payment_amount}} RON for invoice #{{invoice_number}}.\n\nPayment date: {{payment_date}}\nMethod: {{payment_method}}\n\nThank you for your payment!\n{{company_name}}",
        'is_system' => true,
    ],
    [
        'id' => 'system_welcome_customer',
        'name' => 'Bun Venit Client / Welcome Customer',
        'category' => 'welcome',
        'subject_ro' => 'Bine ați venit la {{company_name}}!',
        'subject_en' => 'Welcome to {{company_name}}!',
        'body_ro' => "Bună ziua {{contact_name}},\n\nVă mulțumim că ați ales {{company_name}}!\n\nSuntem încântați să colaborăm cu dumneavoastră.\n\nDacă aveți întrebări, nu ezitați să ne contactați.\n\nCu respect,\n{{company_name}}\n{{company_email}}\n{{company_phone}}",
        'body_en' => "Hello {{contact_name}},\n\nThank you for choosing {{company_name}}!\n\nWe're excited to work with you.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n{{company_name}}\n{{company_email}}\n{{company_phone}}",
        'is_system' => true,
    ],
    [
        'id' => 'system_overdue_notice',
        'name' => 'Notificare Întârziere / Overdue Notice',
        'category' => 'reminders',
        'subject_ro' => 'URGENT: Factură #{{invoice_number}} restantă',
        'subject_en' => 'URGENT: Invoice #{{invoice_number}} is overdue',
        'body_ro' => "Bună ziua {{contact_name}},\n\nFactura #{{invoice_number}} în valoare de {{invoice_total}} RON este restantă.\n\nData scadenței era: {{invoice_due_date}}\n\nVă rugăm să efectuați plata urgent pentru a evita comisioane suplimentare.\n\n{{company_name}}",
        'body_en' => "Hello {{contact_name}},\n\nInvoice #{{invoice_number}} for {{invoice_total}} RON is now overdue.\n\nDue date was: {{invoice_due_date}}\n\nPlease make payment urgently to avoid additional fees.\n\n{{company_name}}",
        'is_system' => true,
    ],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $templateId = $_GET['id'] ?? null;
            $category = $_GET['category'] ?? null;

            if ($templateId) {
                // Check if system template
                $systemTemplate = array_filter($systemTemplates, fn($t) => $t['id'] === $templateId);
                if (!empty($systemTemplate)) {
                    echo json_encode([
                        'success' => true,
                        'data' => array_values($systemTemplate)[0],
                    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                    exit;
                }

                // Get custom template
                $stmt = $db->prepare("
                    SELECT * FROM email_templates
                    WHERE id = :id AND company_id = :company_id
                ");
                $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$template) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Template not found']);
                    exit;
                }

                $template['is_system'] = false;
                echo json_encode([
                    'success' => true,
                    'data' => $template,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // Get custom templates
                $sql = "SELECT * FROM email_templates WHERE company_id = :company_id";
                $params = ['company_id' => $companyId];

                if ($category) {
                    $sql .= " AND category = :category";
                    $params['category'] = $category;
                }

                $sql .= " ORDER BY name ASC";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $customTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($customTemplates as &$t) {
                    $t['is_system'] = false;
                    $t['category_label'] = $templateCategories[$t['category']] ?? ['ro' => $t['category'], 'en' => $t['category']];
                }

                // Filter system templates by category if specified
                $filteredSystem = $category
                    ? array_filter($systemTemplates, fn($t) => $t['category'] === $category)
                    : $systemTemplates;

                foreach ($filteredSystem as &$t) {
                    $t['category_label'] = $templateCategories[$t['category']] ?? ['ro' => $t['category'], 'en' => $t['category']];
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'system_templates' => array_values($filteredSystem),
                        'custom_templates' => $customTemplates,
                        'categories' => $templateCategories,
                        'merge_fields' => $mergeFields,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $name = $input['name'] ?? null;
            $category = $input['category'] ?? 'notifications';

            if (!$name) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Numele șablonului este obligatoriu',
                    'error' => 'Template name is required'
                ]);
                exit;
            }

            $templateId = 'etpl_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO email_templates (
                    id, company_id, name, category, subject_ro, subject_en,
                    body_ro, body_en, created_by, created_at
                ) VALUES (
                    :id, :company_id, :name, :category, :subject_ro, :subject_en,
                    :body_ro, :body_en, :created_by, NOW()
                )
            ");
            $stmt->execute([
                'id' => $templateId,
                'company_id' => $companyId,
                'name' => $name,
                'category' => $category,
                'subject_ro' => $input['subject_ro'] ?? '',
                'subject_en' => $input['subject_en'] ?? '',
                'body_ro' => $input['body_ro'] ?? '',
                'body_en' => $input['body_en'] ?? '',
                'created_by' => $user['user_id'],
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon email creat',
                'message_en' => 'Email template created',
                'data' => ['id' => $templateId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $templateId = $input['id'] ?? null;

            if (!$templateId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Check if system template
            if (strpos($templateId, 'system_') === 0) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Șabloanele sistem nu pot fi modificate',
                    'error' => 'System templates cannot be modified'
                ]);
                exit;
            }

            $updates = [];
            $params = ['id' => $templateId, 'company_id' => $companyId];

            $fields = ['name', 'category', 'subject_ro', 'subject_en', 'body_ro', 'body_en'];
            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE email_templates SET " . implode(', ', $updates) . " WHERE id = :id AND company_id = :company_id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon actualizat',
                'message_en' => 'Template updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $templateId = $_GET['id'] ?? null;

            if (!$templateId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            if (strpos($templateId, 'system_') === 0) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Șabloanele sistem nu pot fi șterse',
                    'error' => 'System templates cannot be deleted'
                ]);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM email_templates WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon șters',
                'message_en' => 'Template deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
