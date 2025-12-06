<?php
/**
 * Worker Availability API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../services/CrewManagementService.php';
require_once __DIR__ . '/../../../helpers/headers.php';

$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $crewService = CrewManagementService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $workerId = $_GET['worker_id'] ?? null;
        $date = $_GET['date'] ?? null;
        $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
        $dateTo = $_GET['date_to'] ?? date('Y-m-t');
        $trade = $_GET['trade'] ?? null;

        if ($date) {
            // Get available workers for a specific date
            $workers = $crewService->getAvailableWorkers($companyId, $date, $trade);
            echo json_encode(['success' => true, 'data' => $workers, 'count' => count($workers)]);
        } elseif ($workerId) {
            // Get worker's availability for date range
            $availability = $crewService->getAvailability($workerId, $dateFrom, $dateTo);
            echo json_encode(['success' => true, 'data' => $availability]);
        } else {
            throw new Exception('Either worker_id or date required');
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['worker_id']) || empty($input['date']) || empty($input['status'])) {
            throw new Exception('worker_id, date and status required');
        }
        $availability = $crewService->setAvailability(
            $input['worker_id'],
            $input['date'],
            $input['status'],
            $input['project_id'] ?? null,
            $input['notes'] ?? null
        );
        echo json_encode(['success' => true, 'data' => $availability]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
