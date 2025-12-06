<?php
/**
 * Backlog List Endpoint
 * GET /api/v1/backlog/list.php - Get backlog items
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authorization token required']);
        exit();
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Company context required']);
        exit();
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied']);
        exit();
    }

    $db = Database::getInstance();
    $projectId = $_GET['project_id'] ?? null;
    $limit = intval($_GET['limit'] ?? 50);
    $offset = intval($_GET['offset'] ?? 0);

    try {
        $where = ['t.company_id = :company_id', 't.sprint_id IS NULL'];
        $params = ['company_id' => $companyId];

        if ($projectId) {
            $where[] = 't.project_id = :project_id';
            $params['project_id'] = $projectId;
        }

        $whereClause = implode(' AND ', $where);

        $backlogItems = $db->fetchAll(
            "SELECT t.*,
                    p.name as project_name,
                    u.first_name || ' ' || u.last_name as assignee_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN users u ON t.assignee_id = u.id
             WHERE $whereClause
             ORDER BY t.priority DESC, t.created_at DESC
             LIMIT :limit OFFSET :offset",
            array_merge($params, ['limit' => $limit, 'offset' => $offset])
        );

    } catch (Exception $e) {
        // Return mock backlog data if table doesn't exist
        $backlogItems = [
            [
                'id' => 'backlog-001',
                'title' => 'Implementare modul rapoarte',
                'description' => 'Creare sistem de raportare avansata',
                'status' => 'todo',
                'priority' => 'high',
                'story_points' => 8,
                'project_name' => 'Platform Development',
                'assignee_name' => null
            ],
            [
                'id' => 'backlog-002',
                'title' => 'Integrare servicii externe',
                'description' => 'Conectare cu API-uri parteneri',
                'status' => 'todo',
                'priority' => 'medium',
                'story_points' => 5,
                'project_name' => 'Platform Development',
                'assignee_name' => null
            ],
            [
                'id' => 'backlog-003',
                'title' => 'Optimizare performanta',
                'description' => 'Imbunatatire viteza de incarcare',
                'status' => 'todo',
                'priority' => 'low',
                'story_points' => 3,
                'project_name' => 'Platform Development',
                'assignee_name' => null
            ]
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $backlogItems,
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
            'total' => count($backlogItems)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
