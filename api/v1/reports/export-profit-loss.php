<?php
/**
 * GET /api/v1/reports/export-profit-loss?format=excel|csv&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 * Export Profit & Loss statement to Excel or CSV
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../helpers/headers.php';
require_once __DIR__ . '/../../../services/reports/ReportExportService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Verify authentication
    $authHeader = getHeader('authorization', '');

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id');
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $format = $_GET['format'] ?? 'excel';
    $startDate = $_GET['start_date'] ?? date('Y-01-01');
    $endDate = $_GET['end_date'] ?? date('Y-m-d');

    if (!in_array($format, ['excel', 'csv'])) {
        throw new Exception('Invalid format. Must be excel or csv');
    }

    $db = Database::getInstance()->getConnection();

    // Get company info
    $stmt = $db->prepare("SELECT name, tax_id as cui FROM companies WHERE id = :id");
    $stmt->execute(['id' => $companyId]);
    $company = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$company) {
        $company = ['name' => 'Company', 'cui' => 'N/A'];
    }

    // Get revenue data
    $stmt = $db->prepare("
        SELECT
            'Sales Revenue' as category,
            COALESCE(SUM(total_amount), 0) as amount
        FROM invoices
        WHERE company_id = :company_id
        AND invoice_date BETWEEN :start_date AND :end_date
        AND status != 'cancelled'
    ");
    $stmt->execute([
        'company_id' => $companyId,
        'start_date' => $startDate,
        'end_date' => $endDate
    ]);
    $revenue = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get expense data
    $stmt = $db->prepare("
        SELECT
            COALESCE(ec.name, 'Uncategorized') as category,
            COALESCE(SUM(e.amount), 0) as amount
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.company_id = :company_id
        AND e.expense_date BETWEEN :start_date AND :end_date
        GROUP BY ec.name
    ");
    $stmt->execute([
        'company_id' => $companyId,
        'start_date' => $startDate,
        'end_date' => $endDate
    ]);
    $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Prepare data
    $data = [
        'revenue' => $revenue,
        'expenses' => $expenses
    ];

    $period = date('M d, Y', strtotime($startDate)) . ' - ' . date('M d, Y', strtotime($endDate));

    // Generate export
    $exportService = new ReportExportService();
    $spreadsheet = $exportService->exportProfitLoss($data, $company, $period);

    // Output file
    $filename = 'Profit_Loss_' . $startDate . '_to_' . $endDate . '.' . ($format === 'excel' ? 'xlsx' : 'csv');

    if ($format === 'excel') {
        $exportService->outputExcel($spreadsheet, $filename);
    } else {
        $exportService->outputCSV($spreadsheet, $filename);
    }

} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
