<?php
/**
 * Document Templates API
 * Manage document templates for invoices, quotes, contracts, etc.
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

// Document types
$documentTypes = [
    'invoice' => ['ro' => 'Factură', 'en' => 'Invoice'],
    'proforma' => ['ro' => 'Factură proformă', 'en' => 'Proforma Invoice'],
    'quote' => ['ro' => 'Ofertă', 'en' => 'Quote'],
    'contract' => ['ro' => 'Contract', 'en' => 'Contract'],
    'receipt' => ['ro' => 'Chitanță', 'en' => 'Receipt'],
    'delivery_note' => ['ro' => 'Aviz de livrare', 'en' => 'Delivery Note'],
    'credit_note' => ['ro' => 'Notă de credit', 'en' => 'Credit Note'],
    'purchase_order' => ['ro' => 'Comandă furnizor', 'en' => 'Purchase Order'],
    'work_order' => ['ro' => 'Ordin de lucru', 'en' => 'Work Order'],
    'timesheet' => ['ro' => 'Pontaj', 'en' => 'Timesheet'],
    'report' => ['ro' => 'Raport', 'en' => 'Report'],
];

// Template placeholders
$placeholders = [
    'company' => [
        'label_ro' => 'Companie',
        'label_en' => 'Company',
        'fields' => [
            '{{company.name}}' => ['ro' => 'Nume companie', 'en' => 'Company Name'],
            '{{company.fiscal_code}}' => ['ro' => 'Cod fiscal', 'en' => 'Fiscal Code'],
            '{{company.vat_number}}' => ['ro' => 'Cod TVA', 'en' => 'VAT Number'],
            '{{company.address}}' => ['ro' => 'Adresă', 'en' => 'Address'],
            '{{company.city}}' => ['ro' => 'Oraș', 'en' => 'City'],
            '{{company.phone}}' => ['ro' => 'Telefon', 'en' => 'Phone'],
            '{{company.email}}' => ['ro' => 'Email', 'en' => 'Email'],
            '{{company.logo}}' => ['ro' => 'Logo', 'en' => 'Logo'],
        ],
    ],
    'customer' => [
        'label_ro' => 'Client',
        'label_en' => 'Customer',
        'fields' => [
            '{{customer.name}}' => ['ro' => 'Nume client', 'en' => 'Customer Name'],
            '{{customer.fiscal_code}}' => ['ro' => 'Cod fiscal', 'en' => 'Fiscal Code'],
            '{{customer.vat_number}}' => ['ro' => 'Cod TVA', 'en' => 'VAT Number'],
            '{{customer.address}}' => ['ro' => 'Adresă', 'en' => 'Address'],
            '{{customer.city}}' => ['ro' => 'Oraș', 'en' => 'City'],
            '{{customer.phone}}' => ['ro' => 'Telefon', 'en' => 'Phone'],
            '{{customer.email}}' => ['ro' => 'Email', 'en' => 'Email'],
        ],
    ],
    'document' => [
        'label_ro' => 'Document',
        'label_en' => 'Document',
        'fields' => [
            '{{document.number}}' => ['ro' => 'Număr document', 'en' => 'Document Number'],
            '{{document.date}}' => ['ro' => 'Data emiterii', 'en' => 'Issue Date'],
            '{{document.due_date}}' => ['ro' => 'Data scadentă', 'en' => 'Due Date'],
            '{{document.subtotal}}' => ['ro' => 'Subtotal', 'en' => 'Subtotal'],
            '{{document.vat}}' => ['ro' => 'TVA', 'en' => 'VAT'],
            '{{document.total}}' => ['ro' => 'Total', 'en' => 'Total'],
            '{{document.currency}}' => ['ro' => 'Monedă', 'en' => 'Currency'],
            '{{document.notes}}' => ['ro' => 'Note', 'en' => 'Notes'],
        ],
    ],
    'items' => [
        'label_ro' => 'Articole',
        'label_en' => 'Items',
        'fields' => [
            '{{#items}}...{{/items}}' => ['ro' => 'Buclă articole', 'en' => 'Items Loop'],
            '{{item.name}}' => ['ro' => 'Nume articol', 'en' => 'Item Name'],
            '{{item.description}}' => ['ro' => 'Descriere', 'en' => 'Description'],
            '{{item.quantity}}' => ['ro' => 'Cantitate', 'en' => 'Quantity'],
            '{{item.unit}}' => ['ro' => 'Unitate', 'en' => 'Unit'],
            '{{item.price}}' => ['ro' => 'Preț unitar', 'en' => 'Unit Price'],
            '{{item.vat_rate}}' => ['ro' => 'Cotă TVA', 'en' => 'VAT Rate'],
            '{{item.total}}' => ['ro' => 'Total articol', 'en' => 'Item Total'],
        ],
    ],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $templateId = $_GET['id'] ?? null;
            $documentType = $_GET['document_type'] ?? null;

            if ($templateId) {
                // Get single template
                $stmt = $db->prepare("
                    SELECT * FROM document_templates
                    WHERE id = :id AND (company_id = :company_id OR is_system = TRUE)
                ");
                $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$template) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Template not found']);
                    exit;
                }

                $template['settings'] = json_decode($template['settings'] ?? '{}', true);
                $template['document_type_label'] = $documentTypes[$template['document_type']] ?? null;

                echo json_encode([
                    'success' => true,
                    'data' => $template,
                    'placeholders' => $placeholders,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List templates
                $sql = "SELECT * FROM document_templates WHERE company_id = :company_id OR is_system = TRUE";
                $params = ['company_id' => $companyId];

                if ($documentType) {
                    $sql .= " AND document_type = :document_type";
                    $params['document_type'] = $documentType;
                }

                $sql .= " ORDER BY is_default DESC, is_system ASC, name_ro ASC";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($templates as &$t) {
                    $t['settings'] = json_decode($t['settings'] ?? '{}', true);
                    $t['document_type_label'] = $documentTypes[$t['document_type']] ?? null;
                    $t['is_editable'] = !$t['is_system'] || $user['role'] === 'admin';
                }

                // Group by document type
                $grouped = [];
                foreach ($templates as $t) {
                    $type = $t['document_type'];
                    if (!isset($grouped[$type])) {
                        $grouped[$type] = [
                            'document_type' => $type,
                            'label' => $documentTypes[$type] ?? ['ro' => $type, 'en' => $type],
                            'templates' => [],
                        ];
                    }
                    $grouped[$type]['templates'][] = $t;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'templates' => $templates,
                        'grouped' => array_values($grouped),
                        'document_types' => $documentTypes,
                        'placeholders' => $placeholders,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a crea șabloane',
                    'error' => 'You do not have permission to create templates'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            $documentType = $input['document_type'] ?? null;
            $nameRo = $input['name_ro'] ?? null;
            $content = $input['content'] ?? null;

            if (!$documentType || !$nameRo || !$content) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Tipul documentului, numele și conținutul sunt obligatorii',
                    'error' => 'Document type, name, and content are required'
                ]);
                exit;
            }

            if (!isset($documentTypes[$documentType])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Tip de document invalid',
                    'error' => 'Invalid document type'
                ]);
                exit;
            }

            $templateId = 'tpl_' . bin2hex(random_bytes(8));
            $stmt = $db->prepare("
                INSERT INTO document_templates (
                    id, company_id, document_type, name_ro, name_en, description_ro, description_en,
                    content, header_html, footer_html, css_styles, settings, is_default, is_system, created_at
                ) VALUES (
                    :id, :company_id, :document_type, :name_ro, :name_en, :description_ro, :description_en,
                    :content, :header_html, :footer_html, :css_styles, :settings, :is_default, FALSE, NOW()
                )
            ");
            $stmt->execute([
                'id' => $templateId,
                'company_id' => $companyId,
                'document_type' => $documentType,
                'name_ro' => $nameRo,
                'name_en' => $input['name_en'] ?? $nameRo,
                'description_ro' => $input['description_ro'] ?? null,
                'description_en' => $input['description_en'] ?? null,
                'content' => $content,
                'header_html' => $input['header_html'] ?? null,
                'footer_html' => $input['footer_html'] ?? null,
                'css_styles' => $input['css_styles'] ?? null,
                'settings' => json_encode($input['settings'] ?? []),
                'is_default' => ($input['is_default'] ?? false) ? 1 : 0,
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon creat',
                'message_en' => 'Template created',
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

            // Verify exists and editable
            $stmt = $db->prepare("SELECT is_system, company_id FROM document_templates WHERE id = :id");
            $stmt->execute(['id' => $templateId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Template not found']);
                exit;
            }

            if ($existing['is_system'] && $user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți modifica șabloanele de sistem',
                    'error' => 'Cannot modify system templates'
                ]);
                exit;
            }

            $updates = [];
            $params = ['id' => $templateId];

            $allowedFields = ['name_ro', 'name_en', 'description_ro', 'description_en', 'content', 'header_html', 'footer_html', 'css_styles', 'is_default'];
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = is_bool($input[$field]) ? ($input[$field] ? 1 : 0) : $input[$field];
                }
            }

            if (isset($input['settings'])) {
                $updates[] = "settings = :settings";
                $params['settings'] = json_encode($input['settings']);
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE document_templates SET " . implode(', ', $updates) . " WHERE id = :id";
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

            // Verify exists and deletable
            $stmt = $db->prepare("SELECT is_system, company_id FROM document_templates WHERE id = :id");
            $stmt->execute(['id' => $templateId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Template not found']);
                exit;
            }

            if ($existing['is_system']) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți șterge șabloanele de sistem',
                    'error' => 'Cannot delete system templates'
                ]);
                exit;
            }

            if ($existing['company_id'] !== $companyId && $user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți șterge acest șablon',
                    'error' => 'You cannot delete this template'
                ]);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM document_templates WHERE id = :id");
            $stmt->execute(['id' => $templateId]);

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
