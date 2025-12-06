<?php
/**
 * Screenshot Management API
 *
 * Endpoints:
 * GET  /screenshots?time_entry_id=xxx - List screenshots for time entry
 * POST /screenshots                    - Upload screenshot
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/TimeEntryService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate user
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    $timeEntryService = new TimeEntryService();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List screenshots for a time entry
    if ($method === 'GET') {
        $timeEntryId = $_GET['time_entry_id'] ?? $_GET['id'] ?? null;

        if (!$timeEntryId) {
            throw new Exception('Time entry ID is required');
        }

        $screenshots = $timeEntryService->getTimeEntryScreenshots($timeEntryId);

        echo json_encode([
            'success' => true,
            'data' => [
                'screenshots' => $screenshots,
                'count' => count($screenshots)
            ]
        ]);
    }

    // POST - Upload screenshot
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $timeEntryId = $input['time_entry_id'] ?? null;

        if (!$timeEntryId) {
            throw new Exception('Time entry ID is required');
        }

        if (empty($input['screenshot_url'])) {
            throw new Exception('Screenshot URL is required');
        }

        $screenshotData = [
            'screenshot_url' => $input['screenshot_url'],
            'thumbnail_url' => $input['thumbnail_url'] ?? null,
            'captured_at' => $input['captured_at'] ?? date('Y-m-d H:i:s'),
            'blur_level' => $input['blur_level'] ?? 0,
            'activity_level' => $input['activity_level'] ?? null,
            'file_size_bytes' => $input['file_size_bytes'] ?? null,
            'width' => $input['width'] ?? null,
            'height' => $input['height'] ?? null
        ];

        $screenshotId = $timeEntryService->addScreenshot($timeEntryId, $screenshotData);

        // Get all screenshots for this time entry
        $screenshots = $timeEntryService->getTimeEntryScreenshots($timeEntryId);

        echo json_encode([
            'success' => true,
            'data' => [
                'screenshot_id' => $screenshotId,
                'screenshots' => $screenshots
            ],
            'message' => 'Screenshot added successfully'
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
