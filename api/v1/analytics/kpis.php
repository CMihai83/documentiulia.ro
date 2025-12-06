<?php
/**
 * KPIs API
 * Key Performance Indicators tracking
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
        $filters = [
            'category' => $_GET['category'] ?? null,
            'is_active' => isset($_GET['is_active']) ? filter_var($_GET['is_active'], FILTER_VALIDATE_BOOLEAN) : null
        ];

        $kpis = $analyticsService->listKPIs($companyId, $filters);

        echo json_encode([
            'success' => true,
            'data' => [
                'kpis' => $kpis,
                'count' => count($kpis)
            ]
        ]);
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $_GET['action'] ?? 'create';

        if ($action === 'record_value') {
            // Record KPI value
            if (empty($input['kpi_id']) || !isset($input['actual_value'])) {
                throw new Exception('KPI ID and actual value are required');
            }

            $valueId = $analyticsService->recordKPIValue(
                $input['kpi_id'],
                $companyId,
                $userData['user_id'],
                $input
            );

            echo json_encode([
                'success' => true,
                'data' => ['value_id' => $valueId],
                'message' => 'KPI value recorded successfully'
            ]);
        } else {
            // Create new KPI
            if (empty($input['name']) || empty($input['metric_type'])) {
                throw new Exception('Name and metric type are required');
            }

            $kpiId = $analyticsService->createKPI($companyId, $userData['user_id'], $input);

            echo json_encode([
                'success' => true,
                'data' => ['kpi_id' => $kpiId],
                'message' => 'KPI created successfully'
            ]);
        }
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
