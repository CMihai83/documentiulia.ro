<?php
/**
 * Romanian Public Holidays API
 * GET /api/v1/calendar/holidays.php?year=2025
 *
 * Returns all Romanian public holidays for a given year
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept-Language');
header('Cache-Control: public, max-age=86400'); // Cache for 24 hours

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/RomanianCalendarService.php';

try {
    $calendar = RomanianCalendarService::getInstance();

    // Get year parameter (default to current year)
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

    // Validate year
    if ($year < 1900 || $year > 2100) {
        throw new Exception('Year must be between 1900 and 2100');
    }

    // Get language preference
    $lang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'ro';
    $lang = substr($lang, 0, 2);
    if (!in_array($lang, ['ro', 'en'])) {
        $lang = 'ro';
    }

    // Override with query parameter if provided
    if (!empty($_GET['lang']) && in_array($_GET['lang'], ['ro', 'en'])) {
        $lang = $_GET['lang'];
    }

    $holidays = $calendar->getHolidays($year, $lang);

    // Get Orthodox Easter date specifically
    $orthodoxEaster = $calendar->getOrthodoxEaster($year);

    echo json_encode([
        'success' => true,
        'data' => [
            'year' => $year,
            'language' => $lang,
            'orthodox_easter' => $orthodoxEaster->format('Y-m-d'),
            'total_holidays' => count($holidays),
            'holidays' => $holidays
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
