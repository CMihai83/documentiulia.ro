<?php
/**
 * Saved Reports API
 * List, manage, and run saved custom reports
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
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

try {
    $db = getDbConnection();
    
    if ($method === 'GET') {
        // List saved reports
        $stmt = $db->prepare("
            SELECT 
                cr.*,
                u.first_name || ' ' || u.last_name as created_by_name,
                (SELECT COUNT(*) FROM scheduled_reports sr WHERE sr.report_id = cr.id) as schedule_count
            FROM custom_reports cr
            LEFT JOIN users u ON cr.created_by = u.id
            WHERE cr.company_id = :company_id
            ORDER BY cr.updated_at DESC
        ");
        $stmt->execute(['company_id' => $companyId]);
        $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($reports as &$report) {
            $report['configuration'] = json_decode($report['configuration'], true);
            $report['data_source_label_ro'] = getDataSourceLabel($report['data_source']);
        }
        
        // System reports (built-in)
        $systemReports = [
            [
                'id' => 'system_profit_loss',
                'name' => 'Profit și Pierdere',
                'name_en' => 'Profit & Loss',
                'data_source' => 'financial',
                'is_system' => true,
                'description' => 'Raport detaliat venituri vs. cheltuieli',
            ],
            [
                'id' => 'system_balance_sheet',
                'name' => 'Bilanț Contabil',
                'name_en' => 'Balance Sheet',
                'data_source' => 'financial',
                'is_system' => true,
                'description' => 'Active, pasive și capitaluri proprii',
            ],
            [
                'id' => 'system_cash_flow',
                'name' => 'Flux de Numerar',
                'name_en' => 'Cash Flow',
                'data_source' => 'financial',
                'is_system' => true,
                'description' => 'Intrări și ieșiri de numerar',
            ],
            [
                'id' => 'system_aging_receivables',
                'name' => 'Vechime Creanțe',
                'name_en' => 'Aging Receivables',
                'data_source' => 'invoices',
                'is_system' => true,
                'description' => 'Facturi restante pe intervale de vechime',
            ],
            [
                'id' => 'system_vat_report',
                'name' => 'Jurnal TVA',
                'name_en' => 'VAT Journal',
                'data_source' => 'tax',
                'is_system' => true,
                'description' => 'TVA colectat și deductibil',
            ],
            [
                'id' => 'system_sales_by_customer',
                'name' => 'Vânzări pe Clienți',
                'name_en' => 'Sales by Customer',
                'data_source' => 'invoices',
                'is_system' => true,
                'description' => 'Top clienți după volum vânzări',
            ],
            [
                'id' => 'system_expenses_by_category',
                'name' => 'Cheltuieli pe Categorii',
                'name_en' => 'Expenses by Category',
                'data_source' => 'expenses',
                'is_system' => true,
                'description' => 'Distribuția cheltuielilor pe categorii',
            ],
        ];
        
        echo json_encode([
            'success' => true,
            'data' => [
                'custom_reports' => $reports,
                'system_reports' => $systemReports,
                'total_custom' => count($reports),
                'total_system' => count($systemReports),
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
    } elseif ($method === 'DELETE') {
        // Delete saved report
        $reportId = $_GET['id'] ?? null;
        
        if (!$reportId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Report ID required']);
            exit;
        }
        
        // Cannot delete system reports
        if (strpos($reportId, 'system_') === 0) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Rapoartele sistem nu pot fi șterse',
                'error' => 'System reports cannot be deleted'
            ]);
            exit;
        }
        
        // Delete scheduled reports first
        $stmt = $db->prepare("DELETE FROM scheduled_reports WHERE report_id = :id AND company_id = :company_id");
        $stmt->execute(['id' => $reportId, 'company_id' => $companyId]);
        
        // Delete the report
        $stmt = $db->prepare("DELETE FROM custom_reports WHERE id = :id AND company_id = :company_id");
        $stmt->execute(['id' => $reportId, 'company_id' => $companyId]);
        
        echo json_encode([
            'success' => true,
            'message_ro' => 'Raport șters cu succes',
            'message_en' => 'Report deleted successfully',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}

function getDataSourceLabel($source) {
    return [
        'invoices' => 'Facturi',
        'expenses' => 'Cheltuieli',
        'contacts' => 'Contacte',
        'products' => 'Produse',
        'time_entries' => 'Pontaj',
        'financial' => 'Financiar',
        'tax' => 'Fiscal',
    ][$source] ?? $source;
}
