<?php
/**
 * GET /api/v1/hr/payroll/list
 * Get list of payroll periods
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

    $company = ['id' => $companyId];

    // Only GET allowed
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit;
    }

    $db = Database::getInstance()->getConnection();

    // Get query parameters
    $year = isset($_GET['year']) ? (int)$_GET['year'] : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 12;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    // Build query
    $where_clauses = ['company_id = :company_id'];
    $params = ['company_id' => $company['id']];

    if ($year) {
        $where_clauses[] = 'year = :year';
        $params['year'] = $year;
    }

    $where_sql = implode(' AND ', $where_clauses);

    // Get periods
    $stmt = $db->prepare("
        SELECT
            id,
            year,
            month,
            period_start,
            period_end,
            working_days,
            working_hours,
            status,
            total_gross_salary,
            total_net_salary,
            total_cas_employer,
            total_cass_employer,
            total_cas_employee,
            total_cass_employee,
            total_income_tax,
            calculated_at,
            approved_at,
            paid_at,
            closed_at,
            d112_declaration_id,
            created_at,
            updated_at
        FROM payroll_periods
        WHERE {$where_sql}
        ORDER BY year DESC, month DESC
        LIMIT :limit OFFSET :offset
    ");

    $params['limit'] = $limit;
    $params['offset'] = $offset;

    $stmt->execute($params);
    $periods = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get total count
    $stmt = $db->prepare("
        SELECT COUNT(*) FROM payroll_periods
        WHERE {$where_sql}
    ");
    unset($params['limit'], $params['offset']);
    $stmt->execute($params);
    $total = $stmt->fetchColumn();

    // Format periods
    foreach ($periods as &$period) {
        $period['month_name'] = date('F', mktime(0, 0, 0, $period['month'], 1));
        $period['employee_count'] = 0;

        // Get employee count for this period
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM payroll_items
            WHERE payroll_period_id = :period_id
        ");
        $stmt->execute(['period_id' => $period['id']]);
        $period['employee_count'] = (int)$stmt->fetchColumn();

        // Calculate total employer cost
        $period['total_employer_cost'] =
            $period['total_gross_salary'] +
            $period['total_cas_employer'] +
            $period['total_cass_employer'];
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $periods,
        'pagination' => [
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
