<?php
/**
 * Construction Estimates CRUD API
 * GET - Get single estimate
 * POST - Create estimate
 * PUT - Update estimate
 * DELETE - Delete estimate
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

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $estimateId = $_GET['id'] ?? null;
        if (!$estimateId) {
            throw new Exception('Estimate ID required');
        }

        $estimate = $estimateService->getEstimate($companyId, $estimateId);
        if (!$estimate) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Estimate not found']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'data' => $estimate
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || empty($input['customer_name']) || empty($input['project_name'])) {
            throw new Exception('customer_name and project_name required');
        }

        $input['created_by'] = $auth['user_id'] ?? null;
        $estimate = $estimateService->createEstimate($companyId, $input);

        echo json_encode([
            'success' => true,
            'data' => $estimate
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $estimateId = $_GET['id'] ?? $input['id'] ?? null;

        if (!$estimateId) {
            throw new Exception('Estimate ID required');
        }

        // Update estimate fields
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("
            UPDATE estimates SET
                customer_name = COALESCE(?, customer_name),
                customer_email = COALESCE(?, customer_email),
                customer_phone = COALESCE(?, customer_phone),
                customer_address = COALESCE(?, customer_address),
                project_name = COALESCE(?, project_name),
                project_description = COALESCE(?, project_description),
                project_address = COALESCE(?, project_address),
                valid_until = COALESCE(?, valid_until),
                tax_rate = COALESCE(?, tax_rate),
                discount_type = COALESCE(?, discount_type),
                discount_value = COALESCE(?, discount_value),
                markup_percentage = COALESCE(?, markup_percentage),
                notes = COALESCE(?, notes),
                terms = COALESCE(?, terms),
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
        ");

        $stmt->execute([
            $input['customer_name'] ?? null,
            $input['customer_email'] ?? null,
            $input['customer_phone'] ?? null,
            $input['customer_address'] ?? null,
            $input['project_name'] ?? null,
            $input['project_description'] ?? null,
            $input['project_address'] ?? null,
            $input['valid_until'] ?? null,
            isset($input['tax_rate']) ? floatval($input['tax_rate']) : null,
            $input['discount_type'] ?? null,
            isset($input['discount_value']) ? floatval($input['discount_value']) : null,
            isset($input['markup_percentage']) ? floatval($input['markup_percentage']) : null,
            $input['notes'] ?? null,
            $input['terms'] ?? null,
            $estimateId,
            $companyId
        ]);

        // Recalculate totals
        $estimate = $estimateService->recalculateTotals($estimateId);
        $estimate['items'] = $estimateService->getEstimateItems($estimateId);

        echo json_encode([
            'success' => true,
            'data' => $estimate
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $estimateId = $_GET['id'] ?? null;
        if (!$estimateId) {
            throw new Exception('Estimate ID required');
        }

        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("DELETE FROM estimates WHERE id = ? AND company_id = ?");
        $stmt->execute([$estimateId, $companyId]);

        echo json_encode([
            'success' => $stmt->rowCount() > 0,
            'message' => $stmt->rowCount() > 0 ? 'Estimate deleted' : 'Estimate not found'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
