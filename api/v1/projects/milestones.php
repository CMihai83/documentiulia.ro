<?php
/**
 * Project Milestones API
 *
 * Manage project milestones and track completion
 * Endpoints:
 * - GET    /milestones.php?project_id=UUID     - Get project milestones
 * - POST   /milestones.php                      - Create milestone
 * - PUT    /milestones.php                      - Update milestone
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ProjectService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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

    $projectService = new ProjectService();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // If no project_id provided, return all milestones for company
        if (empty($_GET['project_id'])) {
            $milestones = $projectService->getAllMilestones($companyId);
        } else {
            $milestones = $projectService->getProjectMilestones($_GET['project_id']);
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'milestones' => $milestones,
                'count' => count($milestones)
            ]
        ]);
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['project_id'])) {
            throw new Exception('Project ID is required');
        }

        $milestoneId = $projectService->createMilestone(
            $input['project_id'],
            $companyId,
            $input
        );

        echo json_encode([
            'success' => true,
            'data' => ['milestone_id' => $milestoneId],
            'message' => 'Milestone created successfully'
        ]);
    }

    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id']) || empty($input['project_id'])) {
            throw new Exception('Milestone ID and Project ID are required');
        }

        $projectService->updateMilestone(
            $input['id'],
            $input['project_id'],
            $companyId,
            $input
        );

        echo json_encode([
            'success' => true,
            'message' => 'Milestone updated successfully'
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
