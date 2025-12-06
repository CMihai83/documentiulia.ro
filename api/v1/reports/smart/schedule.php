<?php
/**
 * Report Scheduling API
 * Manages automated report generation and delivery
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/auth.php';

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

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // List scheduled reports
            $stmt = $db->prepare("
                SELECT
                    rs.*,
                    u.email as created_by_email
                FROM report_schedules rs
                LEFT JOIN users u ON u.id = rs.created_by
                WHERE rs.company_id = :company_id
                ORDER BY rs.created_at DESC
            ");
            $stmt->execute(['company_id' => $companyId]);
            $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($schedules as &$schedule) {
                $schedule['recipients'] = json_decode($schedule['recipients'], true);
                $schedule['report_config'] = json_decode($schedule['report_config'], true);
            }

            echo json_encode([
                'success' => true,
                'data' => $schedules,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            // Validate required fields
            $required = ['name', 'report_type', 'frequency', 'recipients'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
                    exit;
                }
            }

            // Validate frequency
            $validFrequencies = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'];
            if (!in_array($input['frequency'], $validFrequencies)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid frequency']);
                exit;
            }

            // Validate report type
            $validTypes = ['profit_loss', 'balance_sheet', 'cash_flow', 'vat', 'accounts_receivable', 'accounts_payable', 'expense_breakdown'];
            if (!in_array($input['report_type'], $validTypes)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid report type']);
                exit;
            }

            // Calculate next run
            $nextRun = calculateNextRun($input['frequency'], $input['day_of_week'] ?? null, $input['day_of_month'] ?? null);

            $stmt = $db->prepare("
                INSERT INTO report_schedules (
                    id, company_id, name, report_type, frequency,
                    day_of_week, day_of_month, time_of_day,
                    recipients, report_config, format, language,
                    next_run, status, created_by, created_at
                ) VALUES (
                    :id, :company_id, :name, :report_type, :frequency,
                    :day_of_week, :day_of_month, :time_of_day,
                    :recipients, :report_config, :format, :language,
                    :next_run, 'active', :created_by, NOW()
                )
                RETURNING *
            ");

            $id = generateUUID();
            $stmt->execute([
                'id' => $id,
                'company_id' => $companyId,
                'name' => $input['name'],
                'report_type' => $input['report_type'],
                'frequency' => $input['frequency'],
                'day_of_week' => $input['day_of_week'] ?? null,
                'day_of_month' => $input['day_of_month'] ?? null,
                'time_of_day' => $input['time_of_day'] ?? '08:00',
                'recipients' => json_encode($input['recipients']),
                'report_config' => json_encode($input['config'] ?? []),
                'format' => $input['format'] ?? 'pdf',
                'language' => $input['language'] ?? 'ro',
                'next_run' => $nextRun,
                'created_by' => $user['id'],
            ]);

            $schedule = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $schedule,
                'message_ro' => 'Raport programat creat cu succes',
                'message_en' => 'Scheduled report created successfully',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? $_GET['id'] ?? null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID required']);
                exit;
            }

            $updates = [];
            $params = ['id' => $id, 'company_id' => $companyId];

            $allowedFields = ['name', 'frequency', 'day_of_week', 'day_of_month', 'time_of_day', 'format', 'language', 'status'];
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            // Handle JSON fields
            if (isset($input['recipients'])) {
                $updates[] = "recipients = :recipients";
                $params['recipients'] = json_encode($input['recipients']);
            }
            if (isset($input['config'])) {
                $updates[] = "report_config = :report_config";
                $params['report_config'] = json_encode($input['config']);
            }

            // Recalculate next run if frequency changed
            if (isset($input['frequency'])) {
                $nextRun = calculateNextRun($input['frequency'], $input['day_of_week'] ?? null, $input['day_of_month'] ?? null);
                $updates[] = "next_run = :next_run";
                $params['next_run'] = $nextRun;
            }

            if (empty($updates)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE report_schedules SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = :id AND company_id = :company_id RETURNING *";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $schedule = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $schedule,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID required']);
                exit;
            }

            $stmt = $db->prepare("
                DELETE FROM report_schedules
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $id, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Raport programat șters',
                'message_en' => 'Scheduled report deleted',
            ]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

// Helper functions
function calculateNextRun(string $frequency, ?int $dayOfWeek, ?int $dayOfMonth): string {
    $now = new DateTime();
    $next = clone $now;

    switch ($frequency) {
        case 'daily':
            $next->modify('+1 day');
            break;
        case 'weekly':
            $targetDay = $dayOfWeek ?? 1; // Monday default
            $next->modify('next ' . ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][$targetDay]);
            break;
        case 'bi-weekly':
            $next->modify('+2 weeks');
            break;
        case 'monthly':
            $targetDay = $dayOfMonth ?? 1;
            $next->modify('first day of next month');
            $next->setDate($next->format('Y'), $next->format('m'), min($targetDay, $next->format('t')));
            break;
        case 'quarterly':
            $month = intval($now->format('m'));
            $nextQuarter = ceil($month / 3) * 3 + 1;
            if ($nextQuarter > 12) {
                $next->modify('+1 year');
                $nextQuarter = 1;
            }
            $next->setDate($next->format('Y'), $nextQuarter, 1);
            break;
        case 'yearly':
            $next->modify('+1 year');
            $next->setDate($next->format('Y'), 1, 1);
            break;
    }

    return $next->format('Y-m-d H:i:s');
}

function generateUUID(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
