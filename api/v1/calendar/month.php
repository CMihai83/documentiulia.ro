<?php
/**
 * Calendar Month View API
 * GET /api/v1/calendar/month.php?year=2025&month=1
 *
 * Returns full calendar data for a month with holidays and deadlines
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept-Language');
header('Cache-Control: public, max-age=3600');

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

    // Get year and month parameters
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');

    // Validate
    if ($year < 2000 || $year > 2100) {
        throw new Exception('Year must be between 2000 and 2100');
    }

    if ($month < 1 || $month > 12) {
        throw new Exception('Month must be between 1 and 12');
    }

    $monthData = $calendar->getMonthCalendar($year, $month, $lang);

    // Add day names in the correct language
    $dayNames = $lang === 'en'
        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        : ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

    $dayNamesShort = $lang === 'en'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];

    $monthData['day_names'] = $dayNames;
    $monthData['day_names_short'] = $dayNamesShort;
    $monthData['language'] = $lang;

    echo json_encode([
        'success' => true,
        'data' => $monthData
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
