<?php
/**
 * CUI/CIF Validation API
 * E2-US07: ANAF CUI/CIF validation endpoint
 *
 * GET /api/v1/validation/cui.php?cui=12345678 - Validate CUI format only
 * GET /api/v1/validation/cui.php?cui=12345678&lookup=true - Validate and query ANAF
 * POST /api/v1/validation/cui.php - Batch validate multiple CUIs
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept-Language');
header('Cache-Control: private, max-age=3600');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/ANAFValidationService.php';

try {
    $anafService = ANAFValidationService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Single CUI validation
        $cui = $_GET['cui'] ?? null;
        $lookup = filter_var($_GET['lookup'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (!$cui) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'CUI parameter is required'
            ]);
            exit();
        }

        $result = $anafService->validate($cui, $lookup);

        echo json_encode([
            'success' => true,
            'data' => $result
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Batch validation
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !isset($input['cuis']) || !is_array($input['cuis'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'cuis array is required in request body'
            ]);
            exit();
        }

        $cuis = $input['cuis'];
        $lookup = filter_var($input['lookup'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // Limit batch size to prevent abuse
        if (count($cuis) > 50) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Maximum 50 CUIs per batch request'
            ]);
            exit();
        }

        $results = $anafService->validateBatch($cuis, $lookup);

        // Count statistics
        $valid = 0;
        $invalid = 0;
        foreach ($results as $result) {
            if ($result['format_valid']) {
                $valid++;
            } else {
                $invalid++;
            }
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'results' => $results,
                'statistics' => [
                    'total' => count($cuis),
                    'valid' => $valid,
                    'invalid' => $invalid
                ]
            ]
        ]);

    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Validation error: ' . $e->getMessage()
    ]);
}
