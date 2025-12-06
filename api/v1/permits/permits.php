<?php
/**
 * Project Permits CRUD API
 * E3-US08: Permit Management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/PermitManagementService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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
    $permitService = PermitManagementService::getInstance();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $permit = $permitService->getPermit($companyId, $_GET['id']);
                if ($permit) {
                    echo json_encode(['success' => true, 'data' => $permit]);
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Permit not found']);
                }
            } else {
                $filters = [];
                if (!empty($_GET['project_id'])) $filters['project_id'] = $_GET['project_id'];
                if (!empty($_GET['permit_type'])) $filters['permit_type'] = $_GET['permit_type'];
                if (!empty($_GET['status'])) $filters['status'] = $_GET['status'];

                $permits = $permitService->listPermits($companyId, $filters);
                echo json_encode(['success' => true, 'data' => $permits]);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
                exit;
            }

            $required = ['project_id', 'permit_type'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
                    exit;
                }
            }

            $permit = $permitService->createPermit($companyId, $input);
            echo json_encode(['success' => true, 'data' => $permit, 'message' => 'Permit created']);
            break;

        case 'PUT':
            $permitId = $_GET['id'] ?? null;
            if (!$permitId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Permit ID required']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $permit = $permitService->updatePermit($companyId, $permitId, $input);

            if ($permit) {
                echo json_encode(['success' => true, 'data' => $permit, 'message' => 'Permit updated']);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Permit not found']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
