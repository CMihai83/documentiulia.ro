<?php
/**
 * GET /api/v1/hr/payroll/get?id=xxx
 * Get detailed payroll period with all employee items
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
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

    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Period ID required']);
        exit;
    }

    $period_id = $_GET['id'];

    $db = Database::getInstance()->getConnection();

    // Get period
    $stmt = $db->prepare("
        SELECT * FROM payroll_periods
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute([
        'id' => $period_id,
        'company_id' => $companyId
    ]);
    $period = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$period) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Payroll period not found']);
        exit;
    }

    // Get all payroll items for this period
    $stmt = $db->prepare("
        SELECT
            pi.*,
            c.display_name,
            c.email,
            e.employee_number as employee_code
        FROM payroll_items pi
        JOIN employees e ON pi.employee_id = e.id
        LEFT JOIN contacts c ON e.contact_id = c.id
        WHERE pi.payroll_period_id = :period_id
        ORDER BY c.display_name
    ");
    $stmt->execute(['period_id' => $period_id]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format items
    foreach ($items as &$item) {
        $item['employee_name'] = $item['display_name'] ?? 'Unknown Employee';
        $item['employee_code'] = $item['employee_code'] ?? 'N/A';

        // Parse calculation_details if present
        if ($item['calculation_details']) {
            $item['calculation_details'] = json_decode($item['calculation_details'], true);
        }

        // Calculate employer total cost
        $item['total_employer_cost'] =
            $item['gross_salary'] +
            $item['cas_employer'] +
            $item['cass_employer'];
    }

    // Add items to period
    $period['items'] = $items;
    $period['month_name'] = date('F', mktime(0, 0, 0, $period['month'], 1));

    // Calculate total employer cost
    $period['total_employer_cost'] =
        $period['total_gross_salary'] +
        $period['total_cas_employer'] +
        $period['total_cass_employer'];

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $period
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
