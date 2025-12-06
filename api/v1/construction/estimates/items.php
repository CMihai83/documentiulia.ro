<?php
/**
 * Estimate Items API
 * POST - Add item
 * PUT - Update item
 * DELETE - Delete item
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../services/ConstructionEstimateService.php';
require_once __DIR__ . '/../../../helpers/headers.php';

// Authenticate
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
    $estimateService = ConstructionEstimateService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || empty($input['estimate_id']) || empty($input['description'])) {
            throw new Exception('estimate_id and description required');
        }

        $item = $estimateService->addEstimateItem($input['estimate_id'], $input);

        // Recalculate totals
        $estimateService->recalculateTotals($input['estimate_id']);

        echo json_encode([
            'success' => true,
            'data' => $item
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $itemId = $_GET['id'] ?? $input['id'] ?? null;

        if (!$itemId) {
            throw new Exception('Item ID required');
        }

        $item = $estimateService->updateEstimateItem($itemId, $input);

        if ($item) {
            echo json_encode([
                'success' => true,
                'data' => $item
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Item not found']);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $itemId = $_GET['id'] ?? null;

        if (!$itemId) {
            throw new Exception('Item ID required');
        }

        $deleted = $estimateService->deleteEstimateItem($itemId);

        echo json_encode([
            'success' => $deleted,
            'message' => $deleted ? 'Item deleted' : 'Item not found'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
