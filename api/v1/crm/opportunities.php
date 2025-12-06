<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/OpportunityService.php';
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

    $opportunityService = new OpportunityService();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Get single opportunity or list
            if (isset($_GET['id'])) {
                $opportunity = $opportunityService->getOpportunity($companyId, $_GET['id']);
                echo json_encode([
                    'success' => true,
                    'data' => ['opportunity' => $opportunity]
                ]);
            } else {
                // List opportunities with optional filters
                $filters = [
                    'stage' => $_GET['stage'] ?? null,
                    'contact_id' => $_GET['contact_id'] ?? null,
                    'assigned_to' => $_GET['assigned_to'] ?? null,
                    'search' => $_GET['search'] ?? null
                ];
                $opportunities = $opportunityService->listOpportunities($companyId, $filters);
                echo json_encode([
                    'success' => true,
                    'data' => ['opportunities' => $opportunities]
                ]);
            }
            break;

        case 'POST':
            // Create new opportunity
            $input = json_decode(file_get_contents('php://input'), true);
            // Accept both 'name' and 'title' for opportunity name
            if (empty($input['name']) && !empty($input['title'])) {
                $input['name'] = $input['title'];
            }
            if (!$input || empty($input['name'])) {
                throw new Exception('Opportunity name is required');
            }

            $opportunityId = $opportunityService->createOpportunity($companyId, $input);
            echo json_encode([
                'success' => true,
                'data' => ['opportunity_id' => $opportunityId],
                'message' => 'Opportunity created successfully'
            ]);
            break;

        case 'PUT':
            // Update opportunity
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || empty($input['id'])) {
                throw new Exception('Opportunity ID is required');
            }

            $success = $opportunityService->updateOpportunity($companyId, $input['id'], $input);
            if ($success) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Opportunity updated successfully'
                ]);
            } else {
                throw new Exception('Failed to update opportunity');
            }
            break;

        case 'DELETE':
            // Delete opportunity (soft delete)
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || empty($input['id'])) {
                throw new Exception('Opportunity ID is required');
            }

            $success = $opportunityService->deleteOpportunity($companyId, $input['id']);
            if ($success) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Opportunity deleted successfully'
                ]);
            } else {
                throw new Exception('Failed to delete opportunity');
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
