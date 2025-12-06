<?php
/**
 * Dashboards API
 * Manage analytics dashboards and widgets
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/AnalyticsService.php';
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

    $analyticsService = new AnalyticsService();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $dashboard = $analyticsService->getDashboard($_GET['id'], $companyId);
            echo json_encode([
                'success' => true,
                'data' => ['dashboard' => $dashboard]
            ]);
        } else {
            $filters = [
                'dashboard_type' => $_GET['type'] ?? null,
                'is_public' => isset($_GET['is_public']) ? filter_var($_GET['is_public'], FILTER_VALIDATE_BOOLEAN) : null,
                'created_by' => $_GET['created_by'] ?? null
            ];

            $dashboards = $analyticsService->listDashboards($companyId, $filters);

            echo json_encode([
                'success' => true,
                'data' => [
                    'dashboards' => $dashboards,
                    'count' => count($dashboards)
                ]
            ]);
        }
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['name'])) {
            throw new Exception('Dashboard name is required');
        }

        $dashboardId = $analyticsService->createDashboard($companyId, $userData['user_id'], $input);

        echo json_encode([
            'success' => true,
            'data' => ['dashboard_id' => $dashboardId],
            'message' => 'Dashboard created successfully'
        ]);
    }

    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Dashboard ID is required');
        }

        $analyticsService->updateDashboard($input['id'], $companyId, $input);

        echo json_encode([
            'success' => true,
            'message' => 'Dashboard updated successfully'
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
