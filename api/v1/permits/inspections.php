<?php
/**
 * Permit Inspections API
 * Schedule inspections and record results
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
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
            // Get upcoming inspections
            $daysAhead = isset($_GET['days']) ? intval($_GET['days']) : 14;
            $daysAhead = min(max($daysAhead, 7), 90);

            $inspections = $permitService->getUpcomingInspections($companyId, $daysAhead);

            echo json_encode([
                'success' => true,
                'data' => [
                    'inspections' => $inspections,
                    'days_ahead' => $daysAhead,
                    'total' => count($inspections)
                ]
            ]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
                exit;
            }

            $required = ['permit_id', 'inspection_type', 'scheduled_date'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
                    exit;
                }
            }

            $inspection = $permitService->scheduleInspection($input['permit_id'], $input);
            echo json_encode(['success' => true, 'data' => $inspection, 'message' => 'Inspection scheduled']);
            break;

        case 'PUT':
            // Record inspection result
            $inspectionId = $_GET['id'] ?? null;
            if (!$inspectionId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Inspection ID required']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            if (!isset($input['passed'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Result (passed) required']);
                exit;
            }

            $result = $permitService->recordInspectionResult($inspectionId, $input);
            echo json_encode(['success' => true, 'data' => $result, 'message' => 'Inspection result recorded']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
