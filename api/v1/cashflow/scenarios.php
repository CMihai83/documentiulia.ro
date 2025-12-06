<?php
/**
 * Cash Flow Scenario Modeling API
 * Create and compare different business scenarios
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

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Default scenarios
$defaultScenarios = [
    [
        'id' => 'baseline',
        'name_ro' => 'Scenariul de Bază',
        'name_en' => 'Baseline Scenario',
        'description_ro' => 'Prognoză bazată pe datele istorice fără ajustări',
        'description_en' => 'Forecast based on historical data without adjustments',
        'is_default' => true,
        'adjustments' => [
            'revenue_multiplier' => 1.0,
            'expense_multiplier' => 1.0,
            'collection_rate' => 1.0,
            'new_revenue' => 0,
            'new_expenses' => 0,
        ],
    ],
    [
        'id' => 'optimistic',
        'name_ro' => 'Scenariul Optimist',
        'name_en' => 'Optimistic Scenario',
        'description_ro' => 'Creștere de 15% a veniturilor, reducere de 5% a cheltuielilor',
        'description_en' => '15% revenue growth, 5% expense reduction',
        'is_default' => true,
        'adjustments' => [
            'revenue_multiplier' => 1.15,
            'expense_multiplier' => 0.95,
            'collection_rate' => 1.1,
            'new_revenue' => 0,
            'new_expenses' => 0,
        ],
    ],
    [
        'id' => 'pessimistic',
        'name_ro' => 'Scenariul Pesimist',
        'name_en' => 'Pessimistic Scenario',
        'description_ro' => 'Scădere de 15% a veniturilor, creștere de 10% a cheltuielilor',
        'description_en' => '15% revenue decline, 10% expense increase',
        'is_default' => true,
        'adjustments' => [
            'revenue_multiplier' => 0.85,
            'expense_multiplier' => 1.10,
            'collection_rate' => 0.8,
            'new_revenue' => 0,
            'new_expenses' => 0,
        ],
    ],
    [
        'id' => 'new_client',
        'name_ro' => 'Client Nou Mare',
        'name_en' => 'New Large Client',
        'description_ro' => 'Simulează impactul unui client nou cu venituri semnificative',
        'description_en' => 'Simulates impact of a new client with significant revenue',
        'is_default' => true,
        'adjustments' => [
            'revenue_multiplier' => 1.0,
            'expense_multiplier' => 1.05,
            'collection_rate' => 1.0,
            'new_revenue' => 10000,
            'new_revenue_start_month' => 2,
            'new_expenses' => 1000,
        ],
    ],
    [
        'id' => 'expansion',
        'name_ro' => 'Expansiune',
        'name_en' => 'Expansion',
        'description_ro' => 'Simulează investiție în echipament și angajați noi',
        'description_en' => 'Simulates investment in equipment and new hires',
        'is_default' => true,
        'adjustments' => [
            'revenue_multiplier' => 1.0,
            'expense_multiplier' => 1.0,
            'collection_rate' => 1.0,
            'new_revenue' => 15000,
            'new_revenue_start_month' => 3,
            'new_expenses' => 8000,
            'one_time_expense' => 25000,
            'one_time_expense_month' => 1,
        ],
    ],
];

try {
    switch ($method) {
        case 'GET':
            // Get custom scenarios
            $stmt = $db->prepare("
                SELECT * FROM cashflow_scenarios
                WHERE company_id = :company_id
                ORDER BY created_at DESC
            ");
            $stmt->execute(['company_id' => $companyId]);
            $customScenarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($customScenarios as &$scenario) {
                $scenario['adjustments'] = json_decode($scenario['adjustments'], true);
                $scenario['is_default'] = false;
            }

            $allScenarios = array_merge($defaultScenarios, $customScenarios);

            echo json_encode([
                'success' => true,
                'data' => $allScenarios,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['name'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Name required']);
                exit;
            }

            $stmt = $db->prepare("
                INSERT INTO cashflow_scenarios (
                    id, company_id, name, description, adjustments, created_by, created_at
                ) VALUES (
                    :id, :company_id, :name, :description, :adjustments, :created_by, NOW()
                )
                RETURNING *
            ");

            $id = generateUUID();
            $stmt->execute([
                'id' => $id,
                'company_id' => $companyId,
                'name' => $input['name'],
                'description' => $input['description'] ?? null,
                'adjustments' => json_encode($input['adjustments'] ?? [
                    'revenue_multiplier' => 1.0,
                    'expense_multiplier' => 1.0,
                    'collection_rate' => 1.0,
                ]),
                'created_by' => $user['id'],
            ]);

            $scenario = $stmt->fetch(PDO::FETCH_ASSOC);
            $scenario['adjustments'] = json_decode($scenario['adjustments'], true);

            echo json_encode([
                'success' => true,
                'data' => $scenario,
                'message_ro' => 'Scenariu creat cu succes',
                'message_en' => 'Scenario created successfully',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? $_GET['id'] ?? null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID required']);
                exit;
            }

            // Cannot edit default scenarios
            foreach ($defaultScenarios as $ds) {
                if ($ds['id'] === $id) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Cannot edit default scenarios']);
                    exit;
                }
            }

            $updates = [];
            $params = ['id' => $id, 'company_id' => $companyId];

            if (isset($input['name'])) {
                $updates[] = "name = :name";
                $params['name'] = $input['name'];
            }
            if (isset($input['description'])) {
                $updates[] = "description = :description";
                $params['description'] = $input['description'];
            }
            if (isset($input['adjustments'])) {
                $updates[] = "adjustments = :adjustments";
                $params['adjustments'] = json_encode($input['adjustments']);
            }

            if (empty($updates)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE cashflow_scenarios SET " . implode(', ', $updates) . " WHERE id = :id AND company_id = :company_id RETURNING *";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $scenario = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($scenario) {
                $scenario['adjustments'] = json_decode($scenario['adjustments'], true);
            }

            echo json_encode([
                'success' => true,
                'data' => $scenario,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID required']);
                exit;
            }

            // Cannot delete default scenarios
            foreach ($defaultScenarios as $ds) {
                if ($ds['id'] === $id) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Cannot delete default scenarios']);
                    exit;
                }
            }

            $stmt = $db->prepare("
                DELETE FROM cashflow_scenarios
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $id, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Scenariu șters',
                'message_en' => 'Scenario deleted',
            ]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function generateUUID(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
