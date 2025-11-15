<?php
/**
 * Lege5 Scraper Test Endpoint
 * Test scraper connection and functionality
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/Lege5ScraperService.php';

try {
    $scraper = new Lege5ScraperService();

    // Get action from query parameter
    $action = $_GET['action'] ?? 'test';

    switch ($action) {
        case 'test':
            // Test connection only
            $result = $scraper->testConnection();
            break;

        case 'rate_limit':
            // Check if can scrape today
            $canScrape = $scraper->canScrapeToday();
            $result = [
                'success' => true,
                'can_scrape_today' => $canScrape,
                'message' => $canScrape
                    ? 'Scraping is allowed today'
                    : 'Daily rate limit reached'
            ];
            break;

        case 'scrape':
            // Run actual scraping (use with caution!)
            $category = $_GET['category'] ?? null;

            if (!$canScrape) {
                $result = [
                    'success' => false,
                    'message' => 'Daily scrape limit reached'
                ];
                break;
            }

            $result = $scraper->scrape($category);
            break;

        default:
            $result = [
                'success' => false,
                'message' => 'Invalid action. Use: test, rate_limit, or scrape'
            ];
    }

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Scraper error: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
