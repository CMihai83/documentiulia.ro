<?php
/**
 * GET /api/v1/reports/export-balance-sheet?format=excel|csv&as_of_date=YYYY-MM-DD
 * Export Balance Sheet to Excel or CSV
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
    $asOfDate = $_GET['as_of_date'] ?? date('Y-m-d');

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

    // Sample balance sheet data
    // In production, this would come from actual chart of accounts
    $assets = [
        ['account' => 'Cash and Cash Equivalents', 'amount' => 50000.00],
        ['account' => 'Accounts Receivable', 'amount' => 25000.00],
        ['account' => 'Inventory', 'amount' => 15000.00],
        ['account' => 'Property, Plant & Equipment', 'amount' => 100000.00]
    ];

    $liabilities = [
        ['account' => 'Accounts Payable', 'amount' => 20000.00],
        ['account' => 'Short-term Loans', 'amount' => 30000.00],
        ['account' => 'Long-term Debt', 'amount' => 50000.00]
    ];

    $equity = [
        ['account' => 'Share Capital', 'amount' => 50000.00],
        ['account' => 'Retained Earnings', 'amount' => 40000.00]
    ];

    $data = [
        'assets' => $assets,
        'liabilities' => $liabilities,
        'equity' => $equity
    ];

    // Generate export
    $exportService = new ReportExportService();
    $spreadsheet = $exportService->exportBalanceSheet($data, $company, date('M d, Y', strtotime($asOfDate)));

    // Output file
    $filename = 'Balance_Sheet_' . $asOfDate . '.' . ($format === 'excel' ? 'xlsx' : 'csv');

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
