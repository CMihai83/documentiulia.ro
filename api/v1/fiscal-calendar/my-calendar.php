<?php
/**
 * Get Personalized Fiscal Calendar
 * GET /api/v1/fiscal-calendar/my-calendar?year=2025&month=5
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

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

    // Get company context (optional for individuals)
    $companyId = getHeader('x-company-id');
    $userId = $userData['user_id'];

    // Get query parameters
    $year = isset($_GET['year']) ? (int)$_GET['year'] : date('Y');
    $month = isset($_GET['month']) ? (int)$_GET['month'] : null;

    // Connect to database
    $db = Database::getInstance()->getConnection();

    // Build query based on entity type
    $where_clauses = ['cfc.year = :year'];
    $params = ['year' => $year];

    if ($companyId) {
        $where_clauses[] = 'cfc.company_id = :company_id';
        $params['company_id'] = $companyId;
    } else {
        $where_clauses[] = 'cfc.user_id = :user_id';
        $params['user_id'] = $userId;
    }

    if ($month) {
        $where_clauses[] = 'EXTRACT(MONTH FROM cfc.due_date) = :month';
        $params['month'] = $month;
    }

    $where_sql = implode(' AND ', $where_clauses);

    // Get calendar entries
    $stmt = $db->prepare("
        SELECT
            cfc.id,
            cfc.due_date,
            cfc.status,
            cfc.declaration_id,
            cfc.marked_as_not_applicable,
            cfc.custom_notes,
            cfc.completed_at,
            afd.deadline_code,
            afd.deadline_name,
            afd.category,
            afd.anaf_form_code,
            afd.priority,
            afd.can_auto_generate,
            afd.penalty_type,
            afd.penalty_amount
        FROM company_fiscal_calendar cfc
        JOIN anaf_fiscal_deadlines afd ON cfc.deadline_id = afd.id
        WHERE {$where_sql}
        ORDER BY cfc.due_date ASC, afd.priority DESC
    ");
    $stmt->execute($params);
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format entries
    foreach ($entries as &$entry) {
        // Calculate days until due
        $due_timestamp = strtotime($entry['due_date']);
        $now_timestamp = time();
        $entry['days_until_due'] = (int)(($due_timestamp - $now_timestamp) / 86400);

        // Determine urgency
        if ($entry['status'] === 'completed') {
            $entry['urgency'] = 'completed';
        } elseif ($entry['marked_as_not_applicable']) {
            $entry['urgency'] = 'not_applicable';
        } elseif ($entry['days_until_due'] < 0) {
            $entry['urgency'] = 'overdue';
        } elseif ($entry['days_until_due'] <= 1) {
            $entry['urgency'] = 'critical';
        } elseif ($entry['days_until_due'] <= 3) {
            $entry['urgency'] = 'high';
        } elseif ($entry['days_until_due'] <= 7) {
            $entry['urgency'] = 'medium';
        } else {
            $entry['urgency'] = 'low';
        }

        // Get declaration details if exists
        if ($entry['declaration_id']) {
            $stmt = $db->prepare("
                SELECT
                    id,
                    validation_status,
                    status,
                    submitted_at
                FROM fiscal_declarations
                WHERE id = :id
            ");
            $stmt->execute(['id' => $entry['declaration_id']]);
            $entry['declaration'] = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $entry['declaration'] = null;
        }
    }

    // Group by month if full year requested
    if (!$month) {
        $grouped = [];
        foreach ($entries as $entry) {
            $month_key = date('Y-m', strtotime($entry['due_date']));
            if (!isset($grouped[$month_key])) {
                $grouped[$month_key] = [
                    'month' => date('F Y', strtotime($entry['due_date'])),
                    'entries' => []
                ];
            }
            $grouped[$month_key]['entries'][] = $entry;
        }
        $result = array_values($grouped);
    } else {
        $result = $entries;
    }

    echo json_encode([
        'success' => true,
        'year' => $year,
        'month' => $month,
        'data' => $result,
        'summary' => [
            'total' => count($entries),
            'pending' => count(array_filter($entries, fn($e) => $e['status'] === 'pending')),
            'overdue' => count(array_filter($entries, fn($e) => $e['urgency'] === 'overdue')),
            'completed' => count(array_filter($entries, fn($e) => $e['status'] === 'completed'))
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
