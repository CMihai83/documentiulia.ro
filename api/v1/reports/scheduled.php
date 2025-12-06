<?php
/**
 * Scheduled Reports API
 * Manage automatic report generation and delivery
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

try {
    $db = getDbConnection();
    
    switch ($method) {
        case 'GET':
            // List scheduled reports
            $stmt = $db->prepare("
                SELECT 
                    sr.*,
                    cr.name as report_name,
                    cr.data_source,
                    (SELECT MAX(generated_at) FROM scheduled_report_history 
                     WHERE scheduled_report_id = sr.id) as last_run
                FROM scheduled_reports sr
                JOIN custom_reports cr ON sr.report_id = cr.id
                WHERE sr.company_id = :company_id
                ORDER BY sr.created_at DESC
            ");
            $stmt->execute(['company_id' => $companyId]);
            $scheduled = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($scheduled as &$item) {
                $item['schedule'] = json_decode($item['schedule_config'], true);
                $item['recipients'] = json_decode($item['recipients'], true);
                $item['frequency_label_ro'] = getFrequencyLabelRo($item['frequency']);
            }
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'scheduled' => $scheduled,
                    'frequencies' => [
                        ['value' => 'daily', 'label_ro' => 'Zilnic', 'label_en' => 'Daily'],
                        ['value' => 'weekly', 'label_ro' => 'Săptămânal', 'label_en' => 'Weekly'],
                        ['value' => 'monthly', 'label_ro' => 'Lunar', 'label_en' => 'Monthly'],
                        ['value' => 'quarterly', 'label_ro' => 'Trimestrial', 'label_en' => 'Quarterly'],
                    ],
                    'formats' => [
                        ['value' => 'pdf', 'label_ro' => 'PDF', 'label_en' => 'PDF'],
                        ['value' => 'excel', 'label_ro' => 'Excel', 'label_en' => 'Excel'],
                        ['value' => 'csv', 'label_ro' => 'CSV', 'label_en' => 'CSV'],
                    ],
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
            
        case 'POST':
            // Create scheduled report
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (empty($input['report_id']) || empty($input['frequency'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'report_id and frequency required']);
                exit;
            }
            
            $scheduleId = 'sch_' . bin2hex(random_bytes(12));
            
            // Calculate next run time
            $nextRun = calculateNextRun($input['frequency'], $input['schedule'] ?? []);
            
            $stmt = $db->prepare("
                INSERT INTO scheduled_reports (
                    id, company_id, report_id, frequency, schedule_config,
                    recipients, format, is_active, next_run,
                    created_by, created_at
                ) VALUES (
                    :id, :company_id, :report_id, :frequency, :schedule_config,
                    :recipients, :format, true, :next_run,
                    :created_by, NOW()
                )
            ");
            
            $stmt->execute([
                'id' => $scheduleId,
                'company_id' => $companyId,
                'report_id' => $input['report_id'],
                'frequency' => $input['frequency'],
                'schedule_config' => json_encode($input['schedule'] ?? []),
                'recipients' => json_encode($input['recipients'] ?? []),
                'format' => $input['format'] ?? 'pdf',
                'next_run' => $nextRun,
                'created_by' => $user['user_id'],
            ]);
            
            echo json_encode([
                'success' => true,
                'message_ro' => 'Raport programat creat cu succes',
                'message_en' => 'Scheduled report created successfully',
                'data' => [
                    'id' => $scheduleId,
                    'next_run' => $nextRun,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
            
        case 'PUT':
            // Update scheduled report
            $input = json_decode(file_get_contents('php://input'), true);
            $scheduleId = $input['id'] ?? $_GET['id'] ?? null;
            
            if (!$scheduleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Schedule ID required']);
                exit;
            }
            
            $updates = [];
            $params = ['id' => $scheduleId, 'company_id' => $companyId];
            
            if (isset($input['frequency'])) {
                $updates[] = "frequency = :frequency";
                $params['frequency'] = $input['frequency'];
                $updates[] = "next_run = :next_run";
                $params['next_run'] = calculateNextRun($input['frequency'], $input['schedule'] ?? []);
            }
            
            if (isset($input['recipients'])) {
                $updates[] = "recipients = :recipients";
                $params['recipients'] = json_encode($input['recipients']);
            }
            
            if (isset($input['format'])) {
                $updates[] = "format = :format";
                $params['format'] = $input['format'];
            }
            
            if (isset($input['is_active'])) {
                $updates[] = "is_active = :is_active";
                $params['is_active'] = $input['is_active'];
            }
            
            if (isset($input['schedule'])) {
                $updates[] = "schedule_config = :schedule_config";
                $params['schedule_config'] = json_encode($input['schedule']);
            }
            
            $updates[] = "updated_at = NOW()";
            
            $sql = "UPDATE scheduled_reports SET " . implode(', ', $updates) .
                   " WHERE id = :id AND company_id = :company_id";
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode([
                'success' => true,
                'message_ro' => 'Programare actualizată cu succes',
                'message_en' => 'Schedule updated successfully',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
            
        case 'DELETE':
            $scheduleId = $_GET['id'] ?? null;
            
            if (!$scheduleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Schedule ID required']);
                exit;
            }
            
            $stmt = $db->prepare("
                DELETE FROM scheduled_reports
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $scheduleId, 'company_id' => $companyId]);
            
            echo json_encode([
                'success' => true,
                'message_ro' => 'Programare ștearsă cu succes',
                'message_en' => 'Schedule deleted successfully',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}

function calculateNextRun($frequency, $schedule = []) {
    $now = new DateTime();
    
    switch ($frequency) {
        case 'daily':
            $hour = $schedule['hour'] ?? 8;
            $next = new DateTime();
            $next->setTime($hour, 0);
            if ($next <= $now) {
                $next->modify('+1 day');
            }
            return $next->format('Y-m-d H:i:s');
            
        case 'weekly':
            $dayOfWeek = $schedule['day_of_week'] ?? 1; // Monday
            $hour = $schedule['hour'] ?? 8;
            $next = new DateTime();
            $next->setTime($hour, 0);
            $currentDay = $next->format('N');
            $daysUntil = ($dayOfWeek - $currentDay + 7) % 7;
            if ($daysUntil == 0 && $next <= $now) {
                $daysUntil = 7;
            }
            $next->modify("+{$daysUntil} days");
            return $next->format('Y-m-d H:i:s');
            
        case 'monthly':
            $dayOfMonth = $schedule['day_of_month'] ?? 1;
            $hour = $schedule['hour'] ?? 8;
            $next = new DateTime();
            $next->setDate($next->format('Y'), $next->format('m'), min($dayOfMonth, $next->format('t')));
            $next->setTime($hour, 0);
            if ($next <= $now) {
                $next->modify('+1 month');
                $next->setDate($next->format('Y'), $next->format('m'), min($dayOfMonth, $next->format('t')));
            }
            return $next->format('Y-m-d H:i:s');
            
        case 'quarterly':
            $next = new DateTime();
            $month = ceil($next->format('n') / 3) * 3 + 1;
            if ($month > 12) {
                $month = 1;
                $next->modify('+1 year');
            }
            $next->setDate($next->format('Y'), $month, 1);
            $next->setTime($schedule['hour'] ?? 8, 0);
            return $next->format('Y-m-d H:i:s');
    }
    
    return date('Y-m-d H:i:s', strtotime('+1 day'));
}

function getFrequencyLabelRo($frequency) {
    return [
        'daily' => 'Zilnic',
        'weekly' => 'Săptămânal',
        'monthly' => 'Lunar',
        'quarterly' => 'Trimestrial',
    ][$frequency] ?? $frequency;
}
