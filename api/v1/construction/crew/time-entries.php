<?php
/**
 * Worker Time Entries API
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

try {
    $crewService = CrewManagementService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $workerId = $_GET['worker_id'] ?? null;
        $projectId = $_GET['project_id'] ?? null;
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;

        if ($workerId) {
            $entries = $crewService->getWorkerTimeEntries($workerId, $dateFrom, $dateTo);
            echo json_encode(['success' => true, 'data' => $entries, 'count' => count($entries)]);
        } elseif ($projectId) {
            $entries = $crewService->getProjectTimeEntries($projectId);
            echo json_encode(['success' => true, 'data' => $entries, 'count' => count($entries)]);
        } else {
            throw new Exception('Either worker_id or project_id required');
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['worker_id']) || empty($input['project_id']) || empty($input['hours'])) {
            throw new Exception('worker_id, project_id and hours required');
        }
        $entry = $crewService->recordTime($input);
        echo json_encode(['success' => true, 'data' => $entry]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
