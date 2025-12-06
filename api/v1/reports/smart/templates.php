<?php
/**
 * Report Templates API
 * Manages customizable report templates
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/auth.php';

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

// Default templates (system-provided)
$defaultTemplates = [
    [
        'id' => 'default_profit_loss',
        'type' => 'profit_loss',
        'name_ro' => 'Raport Profit și Pierdere Standard',
        'name_en' => 'Standard Profit & Loss Report',
        'is_default' => true,
        'sections' => ['revenue', 'expenses', 'gross_profit', 'net_profit'],
        'show_comparison' => true,
        'show_percentages' => true,
        'show_charts' => true,
    ],
    [
        'id' => 'default_balance_sheet',
        'type' => 'balance_sheet',
        'name_ro' => 'Bilanț Contabil Standard',
        'name_en' => 'Standard Balance Sheet',
        'is_default' => true,
        'sections' => ['assets', 'liabilities', 'equity'],
        'show_comparison' => true,
    ],
    [
        'id' => 'default_vat',
        'type' => 'vat',
        'name_ro' => 'Declarație TVA Standard',
        'name_en' => 'Standard VAT Return',
        'is_default' => true,
        'sections' => ['collected', 'deductible', 'due'],
        'group_by_rate' => true,
    ],
    [
        'id' => 'default_cash_flow',
        'type' => 'cash_flow',
        'name_ro' => 'Flux de Numerar Standard',
        'name_en' => 'Standard Cash Flow',
        'is_default' => true,
        'sections' => ['operating', 'investing', 'financing'],
    ],
    [
        'id' => 'default_ar_aging',
        'type' => 'accounts_receivable',
        'name_ro' => 'Creanțe pe Vechime',
        'name_en' => 'AR Aging Report',
        'is_default' => true,
        'sections' => ['current', '1_30', '31_60', '61_90', 'over_90'],
        'group_by_customer' => true,
    ],
    [
        'id' => 'executive_summary',
        'type' => 'summary',
        'name_ro' => 'Sumar Executiv',
        'name_en' => 'Executive Summary',
        'is_default' => true,
        'sections' => ['kpis', 'highlights', 'alerts', 'recommendations'],
        'include_charts' => true,
    ],
];

try {
    switch ($method) {
        case 'GET':
            // Get custom templates
            $stmt = $db->prepare("
                SELECT * FROM report_templates
                WHERE company_id = :company_id
                ORDER BY name
            ");
            $stmt->execute(['company_id' => $companyId]);
            $customTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON config
            foreach ($customTemplates as &$template) {
                $template['config'] = json_decode($template['config'], true);
                $template['is_default'] = false;
            }

            // Merge with defaults
            $allTemplates = array_merge($defaultTemplates, $customTemplates);

            echo json_encode([
                'success' => true,
                'data' => [
                    'templates' => $allTemplates,
                    'available_sections' => getAvailableSections(),
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['name']) || empty($input['type'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Name and type required']);
                exit;
            }

            $stmt = $db->prepare("
                INSERT INTO report_templates (
                    id, company_id, name, type, config, created_by, created_at
                ) VALUES (
                    :id, :company_id, :name, :type, :config, :created_by, NOW()
                )
                RETURNING *
            ");

            $id = generateUUID();
            $stmt->execute([
                'id' => $id,
                'company_id' => $companyId,
                'name' => $input['name'],
                'type' => $input['type'],
                'config' => json_encode($input['config'] ?? []),
                'created_by' => $user['id'],
            ]);

            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            $template['config'] = json_decode($template['config'], true);

            echo json_encode([
                'success' => true,
                'data' => $template,
                'message_ro' => 'Șablon creat cu succes',
                'message_en' => 'Template created successfully',
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

            // Cannot edit default templates
            foreach ($defaultTemplates as $dt) {
                if ($dt['id'] === $id) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Cannot edit default templates']);
                    exit;
                }
            }

            $updates = [];
            $params = ['id' => $id, 'company_id' => $companyId];

            if (isset($input['name'])) {
                $updates[] = "name = :name";
                $params['name'] = $input['name'];
            }
            if (isset($input['config'])) {
                $updates[] = "config = :config";
                $params['config'] = json_encode($input['config']);
            }

            if (empty($updates)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE report_templates SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = :id AND company_id = :company_id RETURNING *";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($template) {
                $template['config'] = json_decode($template['config'], true);
            }

            echo json_encode([
                'success' => true,
                'data' => $template,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID required']);
                exit;
            }

            // Cannot delete default templates
            foreach ($defaultTemplates as $dt) {
                if ($dt['id'] === $id) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Cannot delete default templates']);
                    exit;
                }
            }

            $stmt = $db->prepare("
                DELETE FROM report_templates
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $id, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon șters',
                'message_en' => 'Template deleted',
            ]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function getAvailableSections(): array {
    return [
        'profit_loss' => [
            'revenue' => ['label_ro' => 'Venituri', 'label_en' => 'Revenue'],
            'expenses' => ['label_ro' => 'Cheltuieli', 'label_en' => 'Expenses'],
            'gross_profit' => ['label_ro' => 'Profit Brut', 'label_en' => 'Gross Profit'],
            'net_profit' => ['label_ro' => 'Profit Net', 'label_en' => 'Net Profit'],
            'comparison' => ['label_ro' => 'Comparație', 'label_en' => 'Comparison'],
        ],
        'balance_sheet' => [
            'assets' => ['label_ro' => 'Active', 'label_en' => 'Assets'],
            'liabilities' => ['label_ro' => 'Datorii', 'label_en' => 'Liabilities'],
            'equity' => ['label_ro' => 'Capitaluri', 'label_en' => 'Equity'],
        ],
        'vat' => [
            'collected' => ['label_ro' => 'TVA Colectat', 'label_en' => 'VAT Collected'],
            'deductible' => ['label_ro' => 'TVA Deductibil', 'label_en' => 'VAT Deductible'],
            'due' => ['label_ro' => 'TVA de Plată', 'label_en' => 'VAT Due'],
        ],
        'cash_flow' => [
            'operating' => ['label_ro' => 'Operațional', 'label_en' => 'Operating'],
            'investing' => ['label_ro' => 'Investiții', 'label_en' => 'Investing'],
            'financing' => ['label_ro' => 'Finanțare', 'label_en' => 'Financing'],
        ],
    ];
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
