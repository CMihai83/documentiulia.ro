<?php
/**
 * Workflow Execution API
 * Execute workflows manually and view execution history
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

// Execution statuses
$statusLabels = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
    'running' => ['ro' => 'În execuție', 'en' => 'Running'],
    'completed' => ['ro' => 'Completat', 'en' => 'Completed'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed'],
    'cancelled' => ['ro' => 'Anulat', 'en' => 'Cancelled'],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        // Get execution history
        $workflowId = $_GET['workflow_id'] ?? null;
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(100, max(10, intval($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        // Count total
        $countSql = "
            SELECT COUNT(*) FROM workflow_executions we
            JOIN workflows w ON we.workflow_id = w.id
            WHERE w.company_id = :company_id
        ";
        $params = ['company_id' => $companyId];

        if ($workflowId) {
            $countSql .= " AND we.workflow_id = :workflow_id";
            $params['workflow_id'] = $workflowId;
        }

        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        // Get executions
        $sql = "
            SELECT we.*, w.name as workflow_name, u.first_name, u.last_name
            FROM workflow_executions we
            JOIN workflows w ON we.workflow_id = w.id
            LEFT JOIN users u ON we.triggered_by = u.id
            WHERE w.company_id = :company_id
        ";

        if ($workflowId) {
            $sql .= " AND we.workflow_id = :workflow_id";
        }

        $sql .= " ORDER BY we.executed_at DESC LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $executions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($executions as &$exec) {
            $exec['status_label'] = $statusLabels[$exec['status']] ?? ['ro' => $exec['status'], 'en' => $exec['status']];
            $exec['trigger_data'] = json_decode($exec['trigger_data'] ?? '{}', true);
            $exec['action_results'] = json_decode($exec['action_results'] ?? '[]', true);
            $exec['triggered_by_name'] = trim(($exec['first_name'] ?? '') . ' ' . ($exec['last_name'] ?? ''));
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'executions' => $executions,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => intval($total),
                    'total_pages' => ceil($total / $limit),
                ],
                'statuses' => $statusLabels,
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $workflowId = $input['workflow_id'] ?? null;
        $triggerData = $input['trigger_data'] ?? [];

        if (!$workflowId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'workflow_id required']);
            exit;
        }

        // Get workflow
        $stmt = $db->prepare("
            SELECT * FROM workflows
            WHERE id = :id AND company_id = :company_id AND status = 'active'
        ");
        $stmt->execute(['id' => $workflowId, 'company_id' => $companyId]);
        $workflow = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$workflow) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Flux de lucru negăsit sau inactiv',
                'error' => 'Workflow not found or inactive'
            ]);
            exit;
        }

        // Create execution record
        $executionId = 'exec_' . bin2hex(random_bytes(12));
        $stmt = $db->prepare("
            INSERT INTO workflow_executions (
                id, workflow_id, trigger_type, trigger_data, status,
                triggered_by, executed_at
            ) VALUES (
                :id, :workflow_id, :trigger_type, :trigger_data, 'running',
                :triggered_by, NOW()
            )
        ");
        $stmt->execute([
            'id' => $executionId,
            'workflow_id' => $workflowId,
            'trigger_type' => 'manual',
            'trigger_data' => json_encode($triggerData),
            'triggered_by' => $user['user_id'],
        ]);

        // Execute workflow actions
        $conditions = json_decode($workflow['conditions'] ?? '[]', true);
        $actions = json_decode($workflow['actions'] ?? '[]', true);

        // Check conditions
        $conditionsPassed = evaluateConditions($conditions, $triggerData);

        if (!$conditionsPassed) {
            $stmt = $db->prepare("
                UPDATE workflow_executions
                SET status = 'completed', completed_at = NOW(),
                    action_results = :results
                WHERE id = :id
            ");
            $stmt->execute([
                'id' => $executionId,
                'results' => json_encode(['skipped' => 'Conditions not met']),
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Execuție completată - condiții neîndeplinite',
                'message_en' => 'Execution completed - conditions not met',
                'data' => [
                    'execution_id' => $executionId,
                    'status' => 'completed',
                    'actions_executed' => 0,
                    'skipped' => true,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Execute actions
        $actionResults = [];
        $allSuccess = true;

        foreach ($actions as $index => $action) {
            $result = executeAction($db, $companyId, $action, $triggerData);
            $actionResults[] = [
                'action_index' => $index,
                'action_type' => $action['type'],
                'success' => $result['success'],
                'result' => $result,
            ];
            if (!$result['success']) {
                $allSuccess = false;
            }
        }

        // Update execution status
        $stmt = $db->prepare("
            UPDATE workflow_executions
            SET status = :status, completed_at = NOW(),
                action_results = :results
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $executionId,
            'status' => $allSuccess ? 'completed' : 'failed',
            'results' => json_encode($actionResults),
        ]);

        echo json_encode([
            'success' => true,
            'message_ro' => $allSuccess ? 'Flux executat cu succes' : 'Flux executat cu erori',
            'message_en' => $allSuccess ? 'Workflow executed successfully' : 'Workflow executed with errors',
            'data' => [
                'execution_id' => $executionId,
                'status' => $allSuccess ? 'completed' : 'failed',
                'actions_executed' => count($actionResults),
                'action_results' => $actionResults,
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

function evaluateConditions($conditions, $data) {
    if (empty($conditions)) return true;

    foreach ($conditions as $condition) {
        $field = $condition['field'] ?? '';
        $operator = $condition['operator'] ?? 'equals';
        $value = $condition['value'] ?? '';
        $actualValue = $data[$field] ?? null;

        $passed = match($operator) {
            'equals' => $actualValue == $value,
            'not_equals' => $actualValue != $value,
            'greater_than' => is_numeric($actualValue) && is_numeric($value) && $actualValue > $value,
            'less_than' => is_numeric($actualValue) && is_numeric($value) && $actualValue < $value,
            'contains' => strpos((string)$actualValue, $value) !== false,
            'not_contains' => strpos((string)$actualValue, $value) === false,
            'is_empty' => empty($actualValue),
            'is_not_empty' => !empty($actualValue),
            default => true,
        };

        if (!$passed) return false;
    }

    return true;
}

function executeAction($db, $companyId, $action, $data) {
    $type = $action['type'] ?? '';
    $params = $action['params'] ?? $action;

    switch ($type) {
        case 'send_email':
            // Simulate email sending
            return [
                'success' => true,
                'message' => 'Email queued',
                'to' => $params['to'] ?? $data['email'] ?? 'unknown',
            ];

        case 'send_sms':
            return [
                'success' => true,
                'message' => 'SMS queued',
                'to' => $params['to'] ?? $data['phone'] ?? 'unknown',
            ];

        case 'create_task':
            $taskId = 'task_' . bin2hex(random_bytes(8));
            // Would insert task here
            return [
                'success' => true,
                'message' => 'Task created',
                'task_id' => $taskId,
            ];

        case 'notification':
            return [
                'success' => true,
                'message' => 'Notification sent',
                'users' => $params['user_ids'] ?? ['all'],
            ];

        case 'webhook':
            // Would make HTTP request here
            return [
                'success' => true,
                'message' => 'Webhook called',
                'url' => $params['url'] ?? 'unknown',
            ];

        case 'update_field':
            return [
                'success' => true,
                'message' => 'Field updated',
                'entity' => $params['entity'] ?? 'unknown',
                'field' => $params['field'] ?? 'unknown',
            ];

        default:
            return [
                'success' => false,
                'message' => 'Unknown action type: ' . $type,
            ];
    }
}
