<?php
/**
 * Business Days Calculator API
 * GET /api/v1/calendar/business-days.php?date=2025-01-15&action=check
 * GET /api/v1/calendar/business-days.php?start=2025-01-01&end=2025-01-31&action=count
 * GET /api/v1/calendar/business-days.php?date=2025-01-01&days=10&action=add
 *
 * Calculate business days, check if date is business day, etc.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: public, max-age=3600');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/RomanianCalendarService.php';

try {
    $calendar = RomanianCalendarService::getInstance();
    $action = $_GET['action'] ?? 'check';

    switch ($action) {
        case 'check':
            // Check if a date is a business day
            $date = $_GET['date'] ?? date('Y-m-d');

            // Validate date format
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Invalid date format. Use YYYY-MM-DD');
            }

            $isBusinessDay = $calendar->isBusinessDay($date);
            $isHoliday = $calendar->isHoliday($date);
            $dateObj = new DateTime($date);
            $dayOfWeek = (int)$dateObj->format('N');

            echo json_encode([
                'success' => true,
                'data' => [
                    'date' => $date,
                    'is_business_day' => $isBusinessDay,
                    'is_holiday' => $isHoliday,
                    'is_weekend' => $dayOfWeek >= 6,
                    'day_of_week' => $dayOfWeek,
                    'day_name' => $dateObj->format('l'),
                    'next_business_day' => $isBusinessDay ? $date : $calendar->getNextBusinessDay($date)
                ]
            ]);
            break;

        case 'count':
            // Count business days between two dates
            $start = $_GET['start'] ?? null;
            $end = $_GET['end'] ?? null;

            if (!$start || !$end) {
                throw new Exception('Both start and end dates are required');
            }

            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) ||
                !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
                throw new Exception('Invalid date format. Use YYYY-MM-DD');
            }

            $count = $calendar->countBusinessDays($start, $end);
            $startObj = new DateTime($start);
            $endObj = new DateTime($end);
            $totalDays = $startObj->diff($endObj)->days + 1;

            echo json_encode([
                'success' => true,
                'data' => [
                    'start_date' => $start,
                    'end_date' => $end,
                    'business_days' => $count,
                    'total_days' => $totalDays,
                    'weekends_and_holidays' => $totalDays - $count
                ]
            ]);
            break;

        case 'add':
            // Add business days to a date
            $date = $_GET['date'] ?? date('Y-m-d');
            $days = isset($_GET['days']) ? (int)$_GET['days'] : 0;

            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Invalid date format. Use YYYY-MM-DD');
            }

            if ($days <= 0 || $days > 365) {
                throw new Exception('Days must be between 1 and 365');
            }

            $resultDate = $calendar->addBusinessDays($date, $days);

            echo json_encode([
                'success' => true,
                'data' => [
                    'start_date' => $date,
                    'business_days_added' => $days,
                    'result_date' => $resultDate
                ]
            ]);
            break;

        case 'next':
            // Get next business day
            $date = $_GET['date'] ?? date('Y-m-d');

            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Invalid date format. Use YYYY-MM-DD');
            }

            $nextBusinessDay = $calendar->getNextBusinessDay($date);

            echo json_encode([
                'success' => true,
                'data' => [
                    'from_date' => $date,
                    'next_business_day' => $nextBusinessDay
                ]
            ]);
            break;

        default:
            throw new Exception('Invalid action. Use: check, count, add, or next');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
