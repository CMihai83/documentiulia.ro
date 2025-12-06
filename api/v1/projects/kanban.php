<?php
/**
 * Kanban Board API
 *
 * Manage Kanban boards with drag-and-drop card operations
 * Endpoints:
 * - GET  /kanban.php?project_id=UUID     - Get Kanban board
 * - POST /kanban.php                      - Move card to different column
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
        // If no project_id provided, return all kanban boards for company
        if (empty($_GET['project_id'])) {
            $boards = $projectService->getAllKanbanBoards($companyId);
            echo json_encode([
                'success' => true,
                'data' => ['boards' => $boards, 'count' => count($boards)]
            ]);
        } else {
            $board = $projectService->getKanbanBoard($_GET['project_id'], $companyId);
            echo json_encode([
                'success' => true,
                'data' => ['board' => $board]
            ]);
        }
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['card_id']) || empty($input['column_id'])) {
            throw new Exception('Card ID and Column ID are required');
        }

        $projectService->moveKanbanCard(
            $input['card_id'],
            $input['column_id'],
            $input['position'] ?? 0,
            $companyId
        );

        echo json_encode([
            'success' => true,
            'message' => 'Card moved successfully'
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
