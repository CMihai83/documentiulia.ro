<?php
/**
 * GET /api/v1/hr/payroll/download-payslip?period_id=xxx&employee_id=xxx
 * Download payslip PDF for employee
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../helpers/headers.php';
require_once __DIR__ . '/../../../../services/payroll/PayslipPDFGenerator.php';

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

    // Get company context
    $companyId = getHeader('x-company-id');
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    if (!isset($_GET['period_id']) || !isset($_GET['employee_id'])) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Period ID and Employee ID required']);
        exit;
    }

    $periodId = $_GET['period_id'];
    $employeeId = $_GET['employee_id'];

    $db = Database::getInstance()->getConnection();

    // Get payroll period
    $stmt = $db->prepare("
        SELECT * FROM payroll_periods
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute([
        'id' => $periodId,
        'company_id' => $companyId
    ]);
    $period = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$period) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Payroll period not found']);
        exit;
    }

    // Get payroll item for employee
    $stmt = $db->prepare("
        SELECT
            pi.*,
            c.display_name,
            c.email,
            e.employee_number as employee_code
        FROM payroll_items pi
        JOIN employees e ON pi.employee_id = e.id
        LEFT JOIN contacts c ON e.contact_id = c.id
        WHERE pi.payroll_period_id = :period_id AND pi.employee_id = :employee_id
    ");
    $stmt->execute([
        'period_id' => $periodId,
        'employee_id' => $employeeId
    ]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Payroll item not found']);
        exit;
    }

    // Add employee name
    $item['employee_name'] = $item['display_name'] ?? 'Unknown Employee';
    $item['employee_code'] = $item['employee_code'] ?? 'N/A';

    // Get company info
    $stmt = $db->prepare("SELECT name, tax_id as cui FROM companies WHERE id = :id");
    $stmt->execute(['id' => $companyId]);
    $company = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$company) {
        $company = ['name' => 'Test Company SRL', 'cui' => '12345678'];
    }

    // Generate PDF
    $generator = new PayslipPDFGenerator();
    $pdf = $generator->generatePayslip($item, $period, $company);

    // Send PDF
    $filename = 'Fluturos_' . $item['employee_code'] . '_' . $period['year'] . '_' . sprintf('%02d', $period['month']) . '.pdf';

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($pdf));
    echo $pdf;

} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
