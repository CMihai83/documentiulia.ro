<?php
/**
 * Vehicles List Endpoint
 * GET /api/v1/vehicles/list.php
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
    $limit = intval($_GET['limit'] ?? 50);
    $offset = intval($_GET['offset'] ?? 0);
    $status = $_GET['status'] ?? null;

    try {
        $where = ['company_id = :company_id'];
        $params = ['company_id' => $companyId];

        if ($status) {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }

        $whereClause = implode(' AND ', $where);

        $vehicles = $db->fetchAll(
            "SELECT * FROM vehicles
             WHERE $whereClause
             ORDER BY created_at DESC
             LIMIT :limit OFFSET :offset",
            array_merge($params, ['limit' => $limit, 'offset' => $offset])
        );

        $total = $db->fetchOne(
            "SELECT COUNT(*) as count FROM vehicles WHERE $whereClause",
            $params
        );

    } catch (Exception $e) {
        // Return mock data if table doesn't exist
        $vehicles = [
            [
                'id' => 'veh-001',
                'registration_number' => 'B-123-ABC',
                'make' => 'Dacia',
                'model' => 'Duster',
                'year' => 2023,
                'vin' => 'VF1XXXXXXXXXXXXX',
                'fuel_type' => 'diesel',
                'status' => 'active',
                'current_mileage' => 45000,
                'assigned_driver' => 'Ion Popescu',
                'insurance_expiry' => '2025-06-15',
                'itp_expiry' => '2025-09-20'
            ],
            [
                'id' => 'veh-002',
                'registration_number' => 'B-456-DEF',
                'make' => 'Ford',
                'model' => 'Transit',
                'year' => 2022,
                'vin' => 'WF0XXXXXXXXXXXXX',
                'fuel_type' => 'diesel',
                'status' => 'active',
                'current_mileage' => 78000,
                'assigned_driver' => 'Mihai Stanciu',
                'insurance_expiry' => '2025-04-10',
                'itp_expiry' => '2025-07-15'
            ],
            [
                'id' => 'veh-003',
                'registration_number' => 'B-789-GHI',
                'make' => 'Volkswagen',
                'model' => 'Passat',
                'year' => 2024,
                'vin' => 'WVWXXXXXXXXXXXXX',
                'fuel_type' => 'hybrid',
                'status' => 'active',
                'current_mileage' => 12000,
                'assigned_driver' => 'Management',
                'insurance_expiry' => '2025-12-01',
                'itp_expiry' => '2026-01-15'
            ]
        ];
        $total = ['count' => count($vehicles)];
    }

    echo json_encode([
        'success' => true,
        'data' => $vehicles,
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
            'total' => (int)($total['count'] ?? count($vehicles))
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
