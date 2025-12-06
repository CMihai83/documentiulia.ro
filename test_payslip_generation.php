<?php
/**
 * Test Payslip PDF Generation
 */

require_once __DIR__ . '/api/config/database.php';
require_once __DIR__ . '/services/payroll/PayslipPDFGenerator.php';

$periodId = $argv[1] ?? '7618ab4c-ee39-441a-a3c0-409dcc92263e';
$employeeId = $argv[2] ?? '05414e4e-0349-4eb2-b3a0-206da94a6da6';
$companyId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

try {
    $db = Database::getInstance()->getConnection();

    // Get payroll period
    $stmt = $db->prepare("SELECT * FROM payroll_periods WHERE id = :id AND company_id = :company_id");
    $stmt->execute(['id' => $periodId, 'company_id' => $companyId]);
    $period = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$period) {
        die("Payroll period not found\n");
    }

    echo "Found period: {$period['year']}-{$period['month']}\n";

    // Get payroll item with employee info
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
        die("Payroll item not found\n");
    }

    // Add employee name
    $item['employee_name'] = $item['display_name'] ?? 'Unknown Employee';
    $item['employee_code'] = $item['employee_code'] ?? 'N/A';

    echo "Found employee: {$item['employee_name']}\n";

    // Get company info
    $stmt = $db->prepare("SELECT name, tax_id as cui FROM companies WHERE id = :id");
    $stmt->execute(['id' => $companyId]);
    $company = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$company) {
        $company = ['name' => 'Test Company SRL', 'cui' => '12345678'];
    }

    echo "Company: {$company['name']}\n";

    // Generate PDF
    $generator = new PayslipPDFGenerator();
    $pdf = $generator->generatePayslip($item, $period, $company);

    $filename = '/tmp/test_payslip.pdf';
    file_put_contents($filename, $pdf);

    echo "✅ PDF generated successfully: $filename\n";
    echo "PDF size: " . filesize($filename) . " bytes\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
