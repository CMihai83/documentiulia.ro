<?php
/**
 * Scheduled Automation API
 * Manage scheduled/recurring automations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

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

$method = $_SERVER['REQUEST_METHOD'];

// Schedule frequencies
$frequencies = [
    'every_hour' => [
        'label_ro' => 'La fiecare oră',
        'label_en' => 'Every hour',
        'cron' => '0 * * * *',
    ],
    'every_day' => [
        'label_ro' => 'Zilnic',
        'label_en' => 'Daily',
        'cron' => '0 9 * * *',
    ],
    'every_week' => [
        'label_ro' => 'Săptămânal',
        'label_en' => 'Weekly',
        'cron' => '0 9 * * 1',
    ],
    'every_month' => [
        'label_ro' => 'Lunar',
        'label_en' => 'Monthly',
        'cron' => '0 9 1 * *',
    ],
    'every_quarter' => [
        'label_ro' => 'Trimestrial',
        'label_en' => 'Quarterly',
        'cron' => '0 9 1 */3 *',
    ],
    'custom' => [
        'label_ro' => 'Personalizat',
        'label_en' => 'Custom',
        'cron' => null,
    ],
];

// Schedule types
$scheduleTypes = [
    'report' => [
        'label_ro' => 'Generare Raport',
        'label_en' => 'Generate Report',
    ],
    'reminder' => [
        'label_ro' => 'Memento',
        'label_en' => 'Reminder',
    ],
    'cleanup' => [
        'label_ro' => 'Curățare Date',
        'label_en' => 'Data Cleanup',
    ],
    'sync' => [
        'label_ro' => 'Sincronizare',
        'label_en' => 'Synchronization',
    ],
    'backup' => [
        'label_ro' => 'Backup',
        'label_en' => 'Backup',
    ],
    'invoice_reminder' => [
        'label_ro' => 'Memento Facturi',
        'label_en' => 'Invoice Reminders',
    ],
    'custom' => [
        'label_ro' => 'Personalizat',
        'label_en' => 'Custom',
    ],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $scheduleId = $_GET['id'] ?? null;

            if ($scheduleId) {
                // Get single schedule
                $stmt = $db->prepare("
                    SELECT s.*, u.first_name, u.last_name
                    FROM automation_schedules s
                    LEFT JOIN users u ON s.created_by = u.id
                    WHERE s.id = :id AND s.company_id = :company_id
                ");
                $stmt->execute(['id' => $scheduleId, 'company_id' => $companyId]);
                $schedule = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$schedule) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Schedule not found']);
                    exit;
                }

                $schedule['config'] = json_decode($schedule['config'] ?? '{}', true);
                $schedule['frequency_label'] = $frequencies[$schedule['frequency']] ?? ['ro' => $schedule['frequency'], 'en' => $schedule['frequency']];
                $schedule['type_label'] = $scheduleTypes[$schedule['schedule_type']] ?? ['ro' => $schedule['schedule_type'], 'en' => $schedule['schedule_type']];

                echo json_encode([
                    'success' => true,
                    'data' => $schedule,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List schedules
                $stmt = $db->prepare("
                    SELECT s.*, u.first_name, u.last_name,
                           (SELECT COUNT(*) FROM schedule_executions WHERE schedule_id = s.id) as run_count,
                           (SELECT MAX(executed_at) FROM schedule_executions WHERE schedule_id = s.id) as last_run_actual
                    FROM automation_schedules s
                    LEFT JOIN users u ON s.created_by = u.id
                    WHERE s.company_id = :company_id
                    ORDER BY s.next_run ASC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($schedules as &$s) {
                    $s['frequency_label'] = $frequencies[$s['frequency']] ?? ['ro' => $s['frequency'], 'en' => $s['frequency']];
                    $s['type_label'] = $scheduleTypes[$s['schedule_type']] ?? ['ro' => $s['schedule_type'], 'en' => $s['schedule_type']];
                    $s['is_overdue'] = $s['status'] === 'active' && $s['next_run'] && strtotime($s['next_run']) < time();
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'schedules' => $schedules,
                        'frequencies' => $frequencies,
                        'schedule_types' => $scheduleTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $name = $input['name'] ?? null;
            $scheduleType = $input['schedule_type'] ?? 'custom';
            $frequency = $input['frequency'] ?? 'every_day';

            if (!$name) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Numele este obligatoriu',
                    'error' => 'Name is required'
                ]);
                exit;
            }

            // Determine cron expression
            $cronExpression = $input['cron_expression'] ?? ($frequencies[$frequency]['cron'] ?? '0 9 * * *');

            // Calculate next run
            $nextRun = calculateNextRun($cronExpression);

            $scheduleId = 'sched_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO automation_schedules (
                    id, company_id, name, description, schedule_type, frequency,
                    cron_expression, config, next_run, status, created_by, created_at
                ) VALUES (
                    :id, :company_id, :name, :description, :schedule_type, :frequency,
                    :cron_expression, :config, :next_run, 'active', :created_by, NOW()
                )
            ");
            $stmt->execute([
                'id' => $scheduleId,
                'company_id' => $companyId,
                'name' => $name,
                'description' => $input['description'] ?? null,
                'schedule_type' => $scheduleType,
                'frequency' => $frequency,
                'cron_expression' => $cronExpression,
                'config' => json_encode($input['config'] ?? []),
                'next_run' => $nextRun,
                'created_by' => $user['user_id'],
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Programare creată cu succes',
                'message_en' => 'Schedule created successfully',
                'data' => [
                    'id' => $scheduleId,
                    'next_run' => $nextRun,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $scheduleId = $input['id'] ?? null;

            if (!$scheduleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify ownership
            $stmt = $db->prepare("SELECT id FROM automation_schedules WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $scheduleId, 'company_id' => $companyId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Schedule not found']);
                exit;
            }

            $updates = [];
            $params = ['id' => $scheduleId];

            $fields = ['name', 'description', 'schedule_type', 'frequency', 'cron_expression', 'status'];
            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            if (isset($input['config'])) {
                $updates[] = "config = :config";
                $params['config'] = json_encode($input['config']);
            }

            // Recalculate next run if frequency changed
            if (isset($input['frequency']) || isset($input['cron_expression'])) {
                $cron = $input['cron_expression'] ?? ($frequencies[$input['frequency'] ?? 'every_day']['cron'] ?? '0 9 * * *');
                $updates[] = "next_run = :next_run";
                $params['next_run'] = calculateNextRun($cron);
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE automation_schedules SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Programare actualizată',
                'message_en' => 'Schedule updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $scheduleId = $_GET['id'] ?? null;

            if (!$scheduleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM automation_schedules WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $scheduleId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Programare ștearsă',
                'message_en' => 'Schedule deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function calculateNextRun($cronExpression) {
    // Simplified cron parsing - in production would use proper cron parser
    $parts = explode(' ', $cronExpression);
    if (count($parts) !== 5) {
        return date('Y-m-d H:i:s', strtotime('+1 day 09:00:00'));
    }

    $minute = $parts[0];
    $hour = $parts[1];
    $day = $parts[2];
    $month = $parts[3];
    $weekday = $parts[4];

    $now = time();

    // Simple cases
    if ($minute === '0' && $hour !== '*' && $day === '*' && $month === '*' && $weekday === '*') {
        // Daily at specific hour
        $next = strtotime("today {$hour}:00");
        if ($next <= $now) {
            $next = strtotime("tomorrow {$hour}:00");
        }
        return date('Y-m-d H:i:s', $next);
    }

    if ($minute === '0' && $hour !== '*' && $day === '*' && $month === '*' && $weekday !== '*') {
        // Weekly on specific day
        $dayNames = ['0' => 'Sunday', '1' => 'Monday', '2' => 'Tuesday', '3' => 'Wednesday', '4' => 'Thursday', '5' => 'Friday', '6' => 'Saturday'];
        $dayName = $dayNames[$weekday] ?? 'Monday';
        $next = strtotime("next {$dayName} {$hour}:00");
        return date('Y-m-d H:i:s', $next);
    }

    if ($minute === '0' && $hour !== '*' && $day !== '*' && $month === '*') {
        // Monthly on specific day
        $next = strtotime(date("Y-m-{$day} {$hour}:00"));
        if ($next <= $now) {
            $next = strtotime("+1 month", strtotime(date("Y-m-{$day} {$hour}:00")));
        }
        return date('Y-m-d H:i:s', $next);
    }

    // Default: next day at 9 AM
    return date('Y-m-d H:i:s', strtotime('+1 day 09:00:00'));
}
