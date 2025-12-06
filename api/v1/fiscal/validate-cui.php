<?php
/**
 * Romanian CUI/CIF Validation API
 * GET /api/v1/fiscal/validate-cui.php?cui=12345678
 * GET /api/v1/fiscal/validate-cui.php?cui=12345678&lookup=true (also queries ANAF)
 * POST /api/v1/fiscal/validate-cui.php (batch validation)
 *
 * Validates Romanian company tax identification codes
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/ANAFValidationService.php';

try {
    $anaf = ANAFValidationService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Single CUI validation
        $cui = $_GET['cui'] ?? null;

        if (!$cui) {
            throw new Exception('CUI parameter is required');
        }

        // Check if ANAF lookup is requested
        $lookup = isset($_GET['lookup']) && ($_GET['lookup'] === 'true' || $_GET['lookup'] === '1');

        $result = $anaf->validate($cui, $lookup);

        echo json_encode([
            'success' => true,
            'data' => $result
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Batch validation
        $input = json_decode(file_get_contents('php://input'), true);
        $cuis = $input['cuis'] ?? [];

        if (empty($cuis) || !is_array($cuis)) {
            throw new Exception('cuis array is required in request body');
        }

        // Limit batch size
        if (count($cuis) > 50) {
            throw new Exception('Maximum 50 CUIs per batch request');
        }

        // Check if ANAF lookup is requested
        $lookup = $input['lookup'] ?? false;

        $results = $anaf->validateBatch($cuis, $lookup);

        $validCount = count(array_filter($results, fn($r) => $r['format_valid']));

        echo json_encode([
            'success' => true,
            'data' => [
                'total' => count($cuis),
                'valid' => $validCount,
                'invalid' => count($cuis) - $validCount,
                'results' => $results
            ]
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
