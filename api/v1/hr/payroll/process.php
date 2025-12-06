<?php
/**
 * POST /api/v1/hr/payroll/process
 * Process payroll for a period
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../helpers/headers.php';
require_once __DIR__ . '/../../../services/payroll/PayrollProcessor.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

    // Get input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['year']) || !isset($input['month'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Year and month required']);
        exit;
    }

    $year = (int)$input['year'];
    $month = (int)$input['month'];

    // Validate
    if ($year < 2020 || $year > 2030 || $month < 1 || $month > 12) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid year or month']);
        exit;
    }

    $db = Database::getInstance()->getConnection();

    // Check if period exists
    $stmt = $db->prepare("
        SELECT id FROM payroll_periods
        WHERE company_id = :company_id
          AND year = :year
          AND month = :month
    ");
    $stmt->execute([
        'company_id' => $companyId,
        'year' => $year,
        'month' => $month
    ]);
    $existing_period = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing_period) {
        // Create period
        $period_start = date('Y-m-01', strtotime("$year-$month-01"));
        $period_end = date('Y-m-t', strtotime("$year-$month-01"));

        // Calculate working days (simple: exclude weekends)
        $working_days = 0;
        $current = strtotime($period_start);
        $end = strtotime($period_end);
        while ($current <= $end) {
            $day_of_week = date('N', $current);
            if ($day_of_week < 6) { // Monday = 1, Sunday = 7
                $working_days++;
            }
            $current = strtotime('+1 day', $current);
        }

        $stmt = $db->prepare("
            INSERT INTO payroll_periods (
                company_id, year, month, period_start, period_end, working_days, working_hours, status
            ) VALUES (
                :company_id, :year, :month, :period_start, :period_end, :working_days, :working_hours, 'draft'
            ) RETURNING id
        ");

        $payroll_period_id = $stmt->execute([
            'company_id' => $companyId,
            'year' => $year,
            'month' => $month,
            'period_start' => $period_start,
            'period_end' => $period_end,
            'working_days' => $working_days,
            'working_hours' => $working_days * 8
        ]) ? $stmt->fetchColumn() : null;

        if (!$payroll_period_id) {
            throw new Exception("Failed to create payroll period");
        }
    } else {
        $payroll_period_id = $existing_period['id'];
    }

    // Process payroll
    $processor = new PayrollProcessor($db);
    $result = $processor->processPeriodPayroll($payroll_period_id);

    if ($result['success']) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Payroll processed successfully',
            'payroll_period_id' => $payroll_period_id,
            'data' => $result
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $result['error']
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
