<?php
/**
 * Intrastat Declarations API
 * GET /api/v1/eu-vat/intrastat.php - List declarations
 * GET /api/v1/eu-vat/intrastat.php?id=xxx - Get specific declaration
 * POST /api/v1/eu-vat/intrastat.php - Create declaration
 * POST /api/v1/eu-vat/intrastat.php?id=xxx&action=add_item - Add item
 * POST /api/v1/eu-vat/intrastat.php?id=xxx&action=submit - Submit declaration
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/EUVATService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '');

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Authorization required']);
        exit();
    }

    $auth = new AuthService();
    try {
        $userData = $auth->verifyToken($matches[1]);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid or expired token']);
        exit();
    }

    $companyId = getHeader('x-company-id');
    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Company ID required']);
        exit();
    }

    $vatService = EUVATService::getInstance();
    $declarationId = $_GET['id'] ?? null;
    $action = $_GET['action'] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($declarationId) {
            // Get specific declaration
            $declaration = $vatService->getIntrastatDeclaration($declarationId);
            if (!$declaration) {
                throw new Exception('Declaration not found');
            }
            echo json_encode(['success' => true, 'data' => $declaration]);
        } else {
            // List declarations
            $type = $_GET['type'] ?? null;
            $year = isset($_GET['year']) ? (int)$_GET['year'] : null;
            $declarations = $vatService->listIntrastatDeclarations($companyId, $type, $year);
            echo json_encode([
                'success' => true,
                'data' => $declarations,
                'count' => count($declarations)
            ]);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if ($declarationId && $action === 'add_item') {
            // Add item to declaration
            $item = $vatService->addIntrastatItem($declarationId, $input);
            echo json_encode([
                'success' => true,
                'data' => $item,
                'message' => 'Item added to declaration'
            ]);
        } elseif ($declarationId && $action === 'submit') {
            // Submit declaration
            $declaration = $vatService->submitIntrastatDeclaration($declarationId);
            echo json_encode([
                'success' => true,
                'data' => $declaration,
                'message' => 'Declaration submitted'
            ]);
        } else {
            // Create new declaration
            $type = $input['type'] ?? null;
            $year = $input['year'] ?? (int)date('Y');
            $month = $input['month'] ?? (int)date('m');

            if (!$type) {
                throw new Exception('Declaration type (arrival/dispatch) is required');
            }

            $declaration = $vatService->createIntrastatDeclaration($companyId, $type, $year, $month);
            echo json_encode([
                'success' => true,
                'data' => $declaration,
                'message' => 'Declaration created'
            ]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
