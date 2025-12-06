<?php
/**
 * Fixed Assets List API
 * GET /api/v1/accounting/fixed-assets/list.php - List all fixed assets
 */

require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../middleware/auth.php';
require_once __DIR__ . '/../../../config/database.php';

header('Content-Type: application/json');

try {
    $auth = authenticate();
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    $stmt = $db->prepare("
        SELECT
            id,
            name as asset_name,
            asset_number as asset_code,
            category,
            acquisition_date as purchase_date,
            acquisition_cost as purchase_cost,
            salvage_value,
            useful_life_years,
            depreciation_method,
            total_depreciation as accumulated_depreciation,
            current_book_value as book_value,
            status,
            location,
            created_at,
            updated_at
        FROM fixed_assets
        WHERE company_id = :company_id
        ORDER BY acquisition_date DESC
    ");

    $stmt->execute(['company_id' => $companyId]);
    $assets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $assets
    ]);

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
