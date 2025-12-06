<?php
/**
 * Crew Workers CRUD API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
        $workerId = $_GET['id'] ?? null;
        if ($workerId) {
            $worker = $crewService->getWorker($companyId, $workerId);
            if (!$worker) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Worker not found']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $worker]);
        } else {
            $filters = [
                'trade' => $_GET['trade'] ?? null,
                'status' => $_GET['status'] ?? null,
                'search' => $_GET['search'] ?? null
            ];
            $workers = $crewService->listWorkers($companyId, $filters);
            echo json_encode(['success' => true, 'data' => $workers, 'count' => count($workers)]);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['name'])) {
            throw new Exception('Worker name required');
        }
        $worker = $crewService->createWorker($companyId, $input);
        echo json_encode(['success' => true, 'data' => $worker]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $workerId = $_GET['id'] ?? $input['id'] ?? null;
        if (!$workerId) {
            throw new Exception('Worker ID required');
        }
        $worker = $crewService->updateWorker($companyId, $workerId, $input);
        echo json_encode(['success' => true, 'data' => $worker]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $workerId = $_GET['id'] ?? null;
        if (!$workerId) {
            throw new Exception('Worker ID required');
        }
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("DELETE FROM crew_workers WHERE id = ? AND company_id = ?");
        $stmt->execute([$workerId, $companyId]);
        echo json_encode(['success' => $stmt->rowCount() > 0]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
