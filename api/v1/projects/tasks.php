<?php
/**
 * List Tasks Endpoint
 * GET /api/v1/projects/tasks
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

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
    $authHeader = getHeader('authorization', '');

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id');
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance()->getConnection();

    // Get project_id from query string if provided
    $projectId = isset($_GET['project_id']) ? $_GET['project_id'] : null;

    if ($projectId) {
        // Get tasks for specific project
        $stmt = $db->prepare("
            SELECT t.*, p.name as project_name, u.email as assigned_to_email
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.project_id = :project_id AND p.company_id = :company_id
            ORDER BY t.due_date ASC, t.created_at DESC
            LIMIT 200
        ");
        $stmt->execute(['project_id' => $projectId, 'company_id' => $companyId]);
    } else {
        // Get all tasks for company
        $stmt = $db->prepare("
            SELECT t.*, p.name as project_name, u.email as assigned_to_email
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.company_id = :company_id
            ORDER BY t.due_date ASC, t.created_at DESC
            LIMIT 200
        ");
        $stmt->execute(['company_id' => $companyId]);
    }

    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $tasks
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
