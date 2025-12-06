<?php
/**
 * Default Romanian Suppliers API
 * GET - Get pre-populated Romanian suppliers list
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/RomanianSupplierService.php';

try {
    $supplierService = RomanianSupplierService::getInstance();

    $category = $_GET['category'] ?? null;
    $suppliers = $supplierService->getDefaultSuppliers($category);

    echo json_encode([
        'success' => true,
        'data' => $suppliers,
        'count' => count($suppliers)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
