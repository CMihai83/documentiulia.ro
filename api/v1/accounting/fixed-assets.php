<?php
/**
 * Fixed Assets API
 *
 * Manage fixed assets with depreciation calculation
 * Endpoints:
 * - GET  /fixed-assets.php                        - List fixed assets
 * - GET  /fixed-assets.php?id=UUID                - Get single asset
 * - POST /fixed-assets.php                        - Create asset
 * - POST /fixed-assets.php?action=depreciate      - Calculate depreciation
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/AccountingService.php';
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

    $accountingService = new AccountingService();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $filters = [
            'status' => $_GET['status'] ?? null,
            'category' => $_GET['category'] ?? null
        ];

        $assets = $accountingService->listFixedAssets($companyId, $filters);

        echo json_encode([
            'success' => true,
            'data' => [
                'assets' => $assets,
                'count' => count($assets)
            ]
        ]);
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $_GET['action'] ?? 'create';

        if ($action === 'depreciate') {
            if (empty($input['asset_id']) || empty($input['period_date'])) {
                throw new Exception('Asset ID and period date are required');
            }

            $depreciation = $accountingService->calculateDepreciation(
                $input['asset_id'],
                $companyId,
                $input['period_date']
            );

            echo json_encode([
                'success' => true,
                'data' => ['depreciation' => $depreciation]
            ]);
        } else {
            $assetId = $accountingService->createFixedAsset($companyId, $input);

            echo json_encode([
                'success' => true,
                'data' => ['asset_id' => $assetId],
                'message' => 'Fixed asset created successfully'
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
