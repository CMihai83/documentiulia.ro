<?php
/**
 * Employee Certifications CRUD API
 * E3-US07: ANRE Certification Tracking
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
require_once __DIR__ . '/../../services/ANRECertificationService.php';
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
    $certService = ANRECertificationService::getInstance();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $cert = $certService->getCertification($companyId, $_GET['id']);
                if ($cert) {
                    echo json_encode(['success' => true, 'data' => $cert]);
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Certification not found']);
                }
            } else {
                $filters = [];
                if (!empty($_GET['employee_id'])) $filters['employee_id'] = $_GET['employee_id'];
                if (!empty($_GET['certification_type'])) $filters['certification_type'] = $_GET['certification_type'];
                if (!empty($_GET['grade'])) $filters['grade'] = $_GET['grade'];
                if (!empty($_GET['status'])) $filters['status'] = $_GET['status'];

                $certs = $certService->listCertifications($companyId, $filters);
                echo json_encode(['success' => true, 'data' => $certs]);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
                exit;
            }

            $required = ['employee_id', 'certification_type', 'issue_date'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
                    exit;
                }
            }

            $cert = $certService->addCertification($companyId, $input);
            echo json_encode(['success' => true, 'data' => $cert, 'message' => 'Certification added']);
            break;

        case 'PUT':
            $certId = $_GET['id'] ?? null;
            if (!$certId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Certification ID required']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $cert = $certService->updateCertification($companyId, $certId, $input);

            if ($cert) {
                echo json_encode(['success' => true, 'data' => $cert, 'message' => 'Certification updated']);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Certification not found']);
            }
            break;

        case 'DELETE':
            $certId = $_GET['id'] ?? null;
            if (!$certId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Certification ID required']);
                exit;
            }

            $certService->updateCertification($companyId, $certId, ['status' => 'inactive']);
            echo json_encode(['success' => true, 'message' => 'Certification deactivated']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
