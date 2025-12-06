<?php
/**
 * Romanian Fiscal Deadlines API
 * GET /api/v1/calendar/fiscal-deadlines.php?year=2025&month=1
 * GET /api/v1/calendar/fiscal-deadlines.php?upcoming=30 (days)
 *
 * Returns fiscal deadlines for Romanian businesses
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept-Language');
header('Cache-Control: public, max-age=3600'); // Cache for 1 hour

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/RomanianCalendarService.php';

try {
    $calendar = RomanianCalendarService::getInstance();

    // Get language preference
    $lang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'ro';
    $lang = substr($lang, 0, 2);
    if (!in_array($lang, ['ro', 'en'])) {
        $lang = 'ro';
    }

    if (!empty($_GET['lang']) && in_array($_GET['lang'], ['ro', 'en'])) {
        $lang = $_GET['lang'];
    }

    // Check if requesting upcoming deadlines
    if (isset($_GET['upcoming'])) {
        $days = min(max((int)$_GET['upcoming'], 1), 365);
        $deadlines = $calendar->getUpcomingDeadlines($days, $lang);

        echo json_encode([
            'success' => true,
            'data' => [
                'type' => 'upcoming',
                'days_ahead' => $days,
                'language' => $lang,
                'today' => date('Y-m-d'),
                'total' => count($deadlines),
                'deadlines' => $deadlines
            ]
        ]);
        exit();
    }

    // Get year and month parameters
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    $month = isset($_GET['month']) ? (int)$_GET['month'] : null;

    // Validate year
    if ($year < 2000 || $year > 2100) {
        throw new Exception('Year must be between 2000 and 2100');
    }

    // If month provided, get deadlines for that month
    if ($month !== null) {
        if ($month < 1 || $month > 12) {
            throw new Exception('Month must be between 1 and 12');
        }

        $deadlines = $calendar->getFiscalDeadlines($year, $month, $lang);

        echo json_encode([
            'success' => true,
            'data' => [
                'type' => 'monthly',
                'year' => $year,
                'month' => $month,
                'language' => $lang,
                'total' => count($deadlines),
                'deadlines' => $deadlines
            ]
        ]);
    } else {
        // Return yearly fiscal calendar
        $yearlyCalendar = $calendar->getYearlyFiscalCalendar($year, $lang);

        echo json_encode([
            'success' => true,
            'data' => [
                'type' => 'yearly',
                'year' => $year,
                'language' => $lang,
                'calendar' => $yearlyCalendar
            ]
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
