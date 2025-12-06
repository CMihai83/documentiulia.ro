<?php
/**
 * Workflow Automation API
 * Create and manage automated workflows
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

// Available triggers
$triggers = [
    'invoice_created' => [
        'label_ro' => 'Factură Creată',
        'label_en' => 'Invoice Created',
        'entity' => 'invoice',
        'fields' => ['id', 'customer_id', 'total', 'status', 'due_date'],
    ],
    'invoice_paid' => [
        'label_ro' => 'Factură Plătită',
        'label_en' => 'Invoice Paid',
        'entity' => 'invoice',
        'fields' => ['id', 'customer_id', 'total', 'paid_amount'],
    ],
    'invoice_overdue' => [
        'label_ro' => 'Factură Scadentă',
        'label_en' => 'Invoice Overdue',
        'entity' => 'invoice',
        'fields' => ['id', 'customer_id', 'total', 'due_date', 'days_overdue'],
    ],
    'expense_created' => [
        'label_ro' => 'Cheltuială Adăugată',
        'label_en' => 'Expense Created',
        'entity' => 'expense',
        'fields' => ['id', 'amount', 'category', 'vendor'],
    ],
    'contact_created' => [
        'label_ro' => 'Contact Adăugat',
        'label_en' => 'Contact Created',
        'entity' => 'contact',
        'fields' => ['id', 'name', 'email', 'type'],
    ],
    'low_stock' => [
        'label_ro' => 'Stoc Scăzut',
        'label_en' => 'Low Stock',
        'entity' => 'product',
        'fields' => ['id', 'name', 'stock_quantity', 'min_stock'],
    ],
    'task_completed' => [
        'label_ro' => 'Sarcină Finalizată',
        'label_en' => 'Task Completed',
        'entity' => 'task',
        'fields' => ['id', 'title', 'project_id', 'assignee_id'],
    ],
    'project_deadline' => [
        'label_ro' => 'Deadline Proiect',
        'label_en' => 'Project Deadline',
        'entity' => 'project',
        'fields' => ['id', 'name', 'end_date', 'days_until'],
    ],
    'schedule' => [
        'label_ro' => 'Program (Cron)',
        'label_en' => 'Schedule (Cron)',
        'entity' => 'system',
        'fields' => ['cron_expression', 'last_run', 'next_run'],
    ],
];

// Available actions
$actions = [
    'send_email' => [
        'label_ro' => 'Trimite Email',
        'label_en' => 'Send Email',
        'params' => ['to', 'subject', 'body', 'template_id'],
    ],
    'send_sms' => [
        'label_ro' => 'Trimite SMS',
        'label_en' => 'Send SMS',
        'params' => ['to', 'message'],
    ],
    'create_task' => [
        'label_ro' => 'Creează Sarcină',
        'label_en' => 'Create Task',
        'params' => ['title', 'description', 'assignee_id', 'due_date'],
    ],
    'update_field' => [
        'label_ro' => 'Actualizează Câmp',
        'label_en' => 'Update Field',
        'params' => ['entity', 'field', 'value'],
    ],
    'create_invoice' => [
        'label_ro' => 'Creează Factură',
        'label_en' => 'Create Invoice',
        'params' => ['customer_id', 'items', 'due_days'],
    ],
    'webhook' => [
        'label_ro' => 'Apel Webhook',
        'label_en' => 'Webhook Call',
        'params' => ['url', 'method', 'headers', 'body'],
    ],
    'notification' => [
        'label_ro' => 'Notificare În Aplicație',
        'label_en' => 'In-App Notification',
        'params' => ['user_ids', 'title', 'message', 'link'],
    ],
    'add_tag' => [
        'label_ro' => 'Adaugă Etichetă',
        'label_en' => 'Add Tag',
        'params' => ['tag'],
    ],
    'assign_to' => [
        'label_ro' => 'Atribuie Utilizatorului',
        'label_en' => 'Assign to User',
        'params' => ['user_id'],
    ],
];

// Condition operators
$operators = [
    'equals' => ['label_ro' => 'Egal cu', 'label_en' => 'Equals'],
    'not_equals' => ['label_ro' => 'Diferit de', 'label_en' => 'Not equals'],
    'greater_than' => ['label_ro' => 'Mai mare decât', 'label_en' => 'Greater than'],
    'less_than' => ['label_ro' => 'Mai mic decât', 'label_en' => 'Less than'],
    'contains' => ['label_ro' => 'Conține', 'label_en' => 'Contains'],
    'not_contains' => ['label_ro' => 'Nu conține', 'label_en' => 'Does not contain'],
    'is_empty' => ['label_ro' => 'Este gol', 'label_en' => 'Is empty'],
    'is_not_empty' => ['label_ro' => 'Nu este gol', 'label_en' => 'Is not empty'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $workflowId = $_GET['id'] ?? null;

            if ($workflowId) {
                // Get single workflow
                $stmt = $db->prepare("
                    SELECT w.*, u.first_name, u.last_name,
                           (SELECT COUNT(*) FROM workflow_executions WHERE workflow_id = w.id) as execution_count,
                           (SELECT MAX(executed_at) FROM workflow_executions WHERE workflow_id = w.id) as last_execution
                    FROM workflows w
                    LEFT JOIN users u ON w.created_by = u.id
                    WHERE w.id = :id AND w.company_id = :company_id
                ");
                $stmt->execute(['id' => $workflowId, 'company_id' => $companyId]);
                $workflow = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$workflow) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Workflow not found']);
                    exit;
                }

                $workflow['trigger_config'] = json_decode($workflow['trigger_config'] ?? '{}', true);
                $workflow['conditions'] = json_decode($workflow['conditions'] ?? '[]', true);
                $workflow['actions'] = json_decode($workflow['actions'] ?? '[]', true);

                echo json_encode([
                    'success' => true,
                    'data' => $workflow,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List all workflows
                $stmt = $db->prepare("
                    SELECT w.*, u.first_name, u.last_name,
                           (SELECT COUNT(*) FROM workflow_executions WHERE workflow_id = w.id) as execution_count,
                           (SELECT MAX(executed_at) FROM workflow_executions WHERE workflow_id = w.id) as last_execution
                    FROM workflows w
                    LEFT JOIN users u ON w.created_by = u.id
                    WHERE w.company_id = :company_id
                    ORDER BY w.created_at DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $workflows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($workflows as &$wf) {
                    $wf['trigger_label'] = $triggers[$wf['trigger_type']]['label_ro'] ?? $wf['trigger_type'];
                    $wf['actions_count'] = count(json_decode($wf['actions'] ?? '[]', true));
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'workflows' => $workflows,
                        'available_triggers' => $triggers,
                        'available_actions' => $actions,
                        'operators' => $operators,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $name = $input['name'] ?? null;
            $triggerType = $input['trigger_type'] ?? null;
            $triggerConfig = $input['trigger_config'] ?? [];
            $conditions = $input['conditions'] ?? [];
            $actionsList = $input['actions'] ?? [];

            if (!$name || !$triggerType || empty($actionsList)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nume, declanșator și acțiuni sunt obligatorii',
                    'error' => 'Name, trigger, and actions are required'
                ]);
                exit;
            }

            if (!isset($triggers[$triggerType])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Tip de declanșator invalid',
                    'error' => 'Invalid trigger type'
                ]);
                exit;
            }

            // Validate actions
            foreach ($actionsList as $action) {
                if (!isset($actions[$action['type']])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Tip de acțiune invalid: ' . $action['type'],
                        'error' => 'Invalid action type: ' . $action['type']
                    ]);
                    exit;
                }
            }

            $workflowId = 'wf_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO workflows (
                    id, company_id, name, description, trigger_type, trigger_config,
                    conditions, actions, status, created_by, created_at
                ) VALUES (
                    :id, :company_id, :name, :description, :trigger_type, :trigger_config,
                    :conditions, :actions, 'active', :created_by, NOW()
                )
            ");
            $stmt->execute([
                'id' => $workflowId,
                'company_id' => $companyId,
                'name' => $name,
                'description' => $input['description'] ?? null,
                'trigger_type' => $triggerType,
                'trigger_config' => json_encode($triggerConfig),
                'conditions' => json_encode($conditions),
                'actions' => json_encode($actionsList),
                'created_by' => $user['user_id'],
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Flux de lucru creat cu succes',
                'message_en' => 'Workflow created successfully',
                'data' => ['id' => $workflowId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $workflowId = $input['id'] ?? null;

            if (!$workflowId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify ownership
            $stmt = $db->prepare("SELECT id FROM workflows WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $workflowId, 'company_id' => $companyId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Workflow not found']);
                exit;
            }

            $updates = [];
            $params = ['id' => $workflowId];

            $fields = ['name', 'description', 'trigger_type', 'status'];
            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            if (isset($input['trigger_config'])) {
                $updates[] = "trigger_config = :trigger_config";
                $params['trigger_config'] = json_encode($input['trigger_config']);
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
                $sql = "UPDATE workflows SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Flux de lucru actualizat',
                'message_en' => 'Workflow updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $workflowId = $_GET['id'] ?? null;

            if (!$workflowId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM workflows WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $workflowId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Flux de lucru șters',
                'message_en' => 'Workflow deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
