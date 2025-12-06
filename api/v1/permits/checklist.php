<?php
/**
 * Project Permit Checklist API
 * Returns permit checklist for a specific project
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/PermitManagementService.php';
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

$projectId = $_GET['project_id'] ?? null;
if (!$projectId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Project ID required']);
    exit;
}

try {
    $permitService = PermitManagementService::getInstance();

    $checklist = $permitService->getProjectPermitChecklist($companyId, $projectId);

    echo json_encode([
        'success' => true,
        'data' => [
            'project_id' => $projectId,
            'checklist' => $checklist,
            'total_required' => count(array_filter($checklist, fn($p) => $p['required'])),
            'total_approved' => count(array_filter($checklist, fn($p) => $p['status'] === 'approved'))
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
