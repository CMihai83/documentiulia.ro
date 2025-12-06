<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/QuotationService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
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

    $quotationService = new QuotationService();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Get single quotation or list
            if (isset($_GET['id'])) {
                $quotation = $quotationService->getQuotation($companyId, $_GET['id']);
                echo json_encode([
                    'success' => true,
                    'data' => ['quotation' => $quotation]
                ]);
            } else {
                // List quotations with optional filters
                $filters = [
                    'status' => $_GET['status'] ?? null,
                    'contact_id' => $_GET['contact_id'] ?? null,
                    'search' => $_GET['search'] ?? null
                ];
                $quotations = $quotationService->listQuotations($companyId, $filters);
                echo json_encode([
                    'success' => true,
                    'data' => ['quotations' => $quotations]
                ]);
            }
            break;

        case 'POST':
            // Create new quotation
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || empty($input['title']) || empty($input['contact_id'])) {
                throw new Exception('Title and contact are required');
            }

            $quotationId = $quotationService->createQuotation($companyId, $input);
            echo json_encode([
                'success' => true,
                'data' => ['quotation_id' => $quotationId],
                'message' => 'Quotation created successfully'
            ]);
            break;

        case 'PUT':
            // Update quotation
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || empty($input['id'])) {
                throw new Exception('Quotation ID is required');
            }

            $success = $quotationService->updateQuotation($companyId, $input['id'], $input);
            if ($success) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Quotation updated successfully'
                ]);
            } else {
                throw new Exception('Failed to update quotation');
            }
            break;

        case 'DELETE':
            // Delete quotation
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || empty($input['id'])) {
                throw new Exception('Quotation ID is required');
            }

            $success = $quotationService->deleteQuotation($companyId, $input['id']);
            if ($success) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Quotation deleted successfully'
                ]);
            } else {
                throw new Exception('Failed to delete quotation');
            }
            break;

        default:
            throw new Exception('Method not allowed');
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
