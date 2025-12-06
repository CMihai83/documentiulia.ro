<?php
/**
 * Automation Rules API
 * Simple if-then automation rules
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

// Rule categories
$categories = [
    'invoicing' => [
        'label_ro' => 'Facturare',
        'label_en' => 'Invoicing',
    ],
    'payments' => [
        'label_ro' => 'Plăți',
        'label_en' => 'Payments',
    ],
    'inventory' => [
        'label_ro' => 'Stocuri',
        'label_en' => 'Inventory',
    ],
    'crm' => [
        'label_ro' => 'CRM',
        'label_en' => 'CRM',
    ],
    'hr' => [
        'label_ro' => 'Resurse Umane',
        'label_en' => 'Human Resources',
    ],
    'notifications' => [
        'label_ro' => 'Notificări',
        'label_en' => 'Notifications',
    ],
];

// Pre-built rule templates
$ruleTemplates = [
    [
        'id' => 'template_invoice_reminder',
        'name_ro' => 'Memento Factură Scadentă',
        'name_en' => 'Invoice Due Reminder',
        'category' => 'invoicing',
        'description_ro' => 'Trimite email când factura ajunge la scadență',
        'description_en' => 'Send email when invoice reaches due date',
        'trigger' => 'invoice_due_date',
        'conditions' => [['field' => 'status', 'operator' => 'not_equals', 'value' => 'paid']],
        'actions' => [['type' => 'send_email', 'template' => 'invoice_reminder']],
    ],
    [
        'id' => 'template_low_stock_alert',
        'name_ro' => 'Alertă Stoc Scăzut',
        'name_en' => 'Low Stock Alert',
        'category' => 'inventory',
        'description_ro' => 'Notificare când stocul scade sub minim',
        'description_en' => 'Notification when stock falls below minimum',
        'trigger' => 'stock_update',
        'conditions' => [['field' => 'quantity', 'operator' => 'less_than', 'value' => '{{min_stock}}']],
        'actions' => [['type' => 'notification', 'message' => 'Stoc scăzut pentru {{product_name}}']],
    ],
    [
        'id' => 'template_new_customer_welcome',
        'name_ro' => 'Bun Venit Client Nou',
        'name_en' => 'New Customer Welcome',
        'category' => 'crm',
        'description_ro' => 'Trimite email de bun venit clientului nou',
        'description_en' => 'Send welcome email to new customer',
        'trigger' => 'contact_created',
        'conditions' => [['field' => 'type', 'operator' => 'equals', 'value' => 'customer']],
        'actions' => [['type' => 'send_email', 'template' => 'welcome_customer']],
    ],
    [
        'id' => 'template_payment_received',
        'name_ro' => 'Confirmare Plată Primită',
        'name_en' => 'Payment Received Confirmation',
        'category' => 'payments',
        'description_ro' => 'Trimite confirmare când plata este înregistrată',
        'description_en' => 'Send confirmation when payment is recorded',
        'trigger' => 'payment_received',
        'conditions' => [],
        'actions' => [['type' => 'send_email', 'template' => 'payment_confirmation'], ['type' => 'update_field', 'entity' => 'invoice', 'field' => 'status', 'value' => 'paid']],
    ],
    [
        'id' => 'template_task_due_reminder',
        'name_ro' => 'Memento Sarcină Scadentă',
        'name_en' => 'Task Due Reminder',
        'category' => 'notifications',
        'description_ro' => 'Notificare înainte de deadline sarcină',
        'description_en' => 'Notification before task deadline',
        'trigger' => 'schedule',
        'conditions' => [['field' => 'due_date', 'operator' => 'less_than', 'value' => 'today+1day']],
        'actions' => [['type' => 'notification', 'message' => 'Sarcina {{task_title}} are deadline mâine']],
    ],
    [
        'id' => 'template_expense_approval',
        'name_ro' => 'Aprobare Cheltuieli Mari',
        'name_en' => 'Large Expense Approval',
        'category' => 'payments',
        'description_ro' => 'Solicită aprobare pentru cheltuieli peste limită',
        'description_en' => 'Request approval for expenses over limit',
        'trigger' => 'expense_created',
        'conditions' => [['field' => 'amount', 'operator' => 'greater_than', 'value' => '1000']],
        'actions' => [['type' => 'create_task', 'title' => 'Aprobare cheltuială: {{expense_description}}', 'assignee' => 'manager']],
    ],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $ruleId = $_GET['id'] ?? null;

            if ($ruleId) {
                // Get single rule
                $stmt = $db->prepare("
                    SELECT r.*, u.first_name, u.last_name
                    FROM automation_rules r
                    LEFT JOIN users u ON r.created_by = u.id
                    WHERE r.id = :id AND r.company_id = :company_id
                ");
                $stmt->execute(['id' => $ruleId, 'company_id' => $companyId]);
                $rule = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$rule) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Rule not found']);
                    exit;
                }

                $rule['conditions'] = json_decode($rule['conditions'] ?? '[]', true);
                $rule['actions'] = json_decode($rule['actions'] ?? '[]', true);

                echo json_encode([
                    'success' => true,
                    'data' => $rule,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List all rules
                $category = $_GET['category'] ?? null;

                $sql = "
                    SELECT r.*, u.first_name, u.last_name,
                           (SELECT COUNT(*) FROM rule_executions WHERE rule_id = r.id) as execution_count,
                           (SELECT MAX(executed_at) FROM rule_executions WHERE rule_id = r.id) as last_execution
                    FROM automation_rules r
                    LEFT JOIN users u ON r.created_by = u.id
                    WHERE r.company_id = :company_id
                ";
                $params = ['company_id' => $companyId];

                if ($category) {
                    $sql .= " AND r.category = :category";
                    $params['category'] = $category;
                }

                $sql .= " ORDER BY r.priority ASC, r.created_at DESC";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($rules as &$rule) {
                    $rule['category_label'] = $categories[$rule['category']] ?? ['ro' => $rule['category'], 'en' => $rule['category']];
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'rules' => $rules,
                        'categories' => $categories,
                        'templates' => $ruleTemplates,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            // Check if using template
            if (!empty($input['template_id'])) {
                $template = array_filter($ruleTemplates, fn($t) => $t['id'] === $input['template_id']);
                if (!empty($template)) {
                    $template = array_values($template)[0];
                    $input = array_merge($template, $input);
                    $input['name'] = $input['name'] ?? $template['name_ro'];
                }
            }

            $name = $input['name'] ?? null;
            $trigger = $input['trigger'] ?? null;
            $category = $input['category'] ?? 'notifications';

            if (!$name || !$trigger) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nume și declanșator sunt obligatorii',
                    'error' => 'Name and trigger are required'
                ]);
                exit;
            }

            $ruleId = 'rule_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO automation_rules (
                    id, company_id, name, description, category, trigger_type,
                    conditions, actions, priority, status, created_by, created_at
                ) VALUES (
                    :id, :company_id, :name, :description, :category, :trigger_type,
                    :conditions, :actions, :priority, 'active', :created_by, NOW()
                )
            ");
            $stmt->execute([
                'id' => $ruleId,
                'company_id' => $companyId,
                'name' => $name,
                'description' => $input['description'] ?? null,
                'category' => $category,
                'trigger_type' => $trigger,
                'conditions' => json_encode($input['conditions'] ?? []),
                'actions' => json_encode($input['actions'] ?? []),
                'priority' => intval($input['priority'] ?? 10),
                'created_by' => $user['user_id'],
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Regulă de automatizare creată',
                'message_en' => 'Automation rule created',
                'data' => ['id' => $ruleId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $ruleId = $input['id'] ?? null;

            if (!$ruleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify ownership
            $stmt = $db->prepare("SELECT id FROM automation_rules WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $ruleId, 'company_id' => $companyId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Rule not found']);
                exit;
            }

            $updates = [];
            $params = ['id' => $ruleId];

            $fields = ['name', 'description', 'category', 'trigger_type', 'priority', 'status'];
            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            if (isset($input['conditions'])) {
                $updates[] = "conditions = :conditions";
                $params['conditions'] = json_encode($input['conditions']);
            }
            if (isset($input['actions'])) {
                $updates[] = "actions = :actions";
                $params['actions'] = json_encode($input['actions']);
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE automation_rules SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Regulă actualizată',
                'message_en' => 'Rule updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $ruleId = $_GET['id'] ?? null;

            if (!$ruleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM automation_rules WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $ruleId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Regulă ștearsă',
                'message_en' => 'Rule deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
