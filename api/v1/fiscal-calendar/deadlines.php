<?php
/**
 * Fiscal Deadlines API Endpoint
 *
 * GET /api/v1/fiscal-calendar/deadlines.php
 *
 * Returns list of upcoming fiscal deadlines from ANAF calendar
 *
 * Query params:
 * - year: Year to filter (default: current year)
 * - month: Month to filter (optional)
 * - type: Declaration type filter (optional)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Authenticate request
$auth = authenticate();
$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

try {
    $db = Database::getInstance()->getConnection();

    $year = $_GET['year'] ?? date('Y');
    $month = $_GET['month'] ?? null;
    $category = $_GET['category'] ?? null;

    // Build query - join calendar entries with deadline definitions
    $query = "SELECT
        cfc.id,
        cfc.due_date as deadline_date,
        afd.deadline_code as declaration_type,
        afd.anaf_form_code as form_code,
        afd.deadline_name as description,
        afd.category,
        afd.frequency,
        afd.applies_to,
        afd.penalty_type as penalty_info,
        afd.is_active,
        cfc.status,
        cfc.period,
        cfc.created_at
    FROM company_fiscal_calendar cfc
    JOIN anaf_fiscal_deadlines afd ON cfc.deadline_id = afd.id
    WHERE cfc.year = :year
    AND afd.is_active = true";

    $params = [':year' => $year];

    if ($month) {
        $query .= " AND EXTRACT(MONTH FROM cfc.due_date) = :month";
        $params[':month'] = $month;
    }

    if ($category) {
        $query .= " AND afd.category = :category";
        $params[':category'] = $category;
    }

    // If company context, filter by company
    if ($companyId) {
        $query .= " AND cfc.company_id = :company_id";
        $params[':company_id'] = $companyId;
    }

    $query .= " ORDER BY cfc.due_date ASC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $deadlines = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate days until deadline
    $today = new DateTime();
    foreach ($deadlines as &$deadline) {
        $deadlineDate = new DateTime($deadline['deadline_date']);
        $diff = $today->diff($deadlineDate);
        $deadline['days_until'] = $deadlineDate > $today ? (int)$diff->format('%a') : -(int)$diff->format('%a');
        $deadline['is_overdue'] = $deadlineDate < $today;
        $deadline['is_urgent'] = $deadline['days_until'] >= 0 && $deadline['days_until'] <= 7;
    }

    // Get summary statistics
    $upcomingCount = count(array_filter($deadlines, fn($d) => !$d['is_overdue']));
    $overdueCount = count(array_filter($deadlines, fn($d) => $d['is_overdue']));
    $urgentCount = count(array_filter($deadlines, fn($d) => $d['is_urgent']));

    echo json_encode([
        'success' => true,
        'data' => $deadlines,
        'summary' => [
            'total' => count($deadlines),
            'upcoming' => $upcomingCount,
            'overdue' => $overdueCount,
            'urgent' => $urgentCount
        ],
        'filters' => [
            'year' => (int)$year,
            'month' => $month ? (int)$month : null,
            'category' => $category
        ]
    ]);

} catch (Exception $e) {
    error_log("Fiscal deadlines error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve fiscal deadlines'
    ]);
}
