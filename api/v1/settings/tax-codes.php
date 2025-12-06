<?php
/**
 * Tax Codes Management API
 * GET /api/v1/settings/tax-codes.php - List all tax codes
 * POST /api/v1/settings/tax-codes.php - Create new tax code
 * PUT /api/v1/settings/tax-codes.php - Update tax code
 * DELETE /api/v1/settings/tax-codes.php?id=xxx - Delete tax code
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    $auth = authenticate();
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            handleGet($companyId);
            break;
        case 'POST':
            handlePost($companyId);
            break;
        case 'PUT':
            handlePut($companyId);
            break;
        case 'DELETE':
            handleDelete($companyId);
            break;
        default:
            throw new Exception('Method not allowed', 405);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function handleGet($companyId) {
    $db = Database::getInstance()->getConnection();

    $stmt = $db->prepare("
        SELECT
            id,
            code,
            name,
            description,
            tax_type,
            rate,
            is_compound,
            is_included_in_price,
            applies_to,
            effective_from,
            effective_to,
            is_active,
            country_code,
            region_code,
            created_at,
            updated_at
        FROM tax_codes
        WHERE company_id = :company_id
        AND is_active = true
        ORDER BY code ASC
    ");

    $stmt->execute(['company_id' => $companyId]);
    $taxCodes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $taxCodes
    ]);
}

function handlePost($companyId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['code']) || !isset($input['name']) || !isset($input['rate'])) {
        throw new Exception('Code, name, and rate are required', 400);
    }

    $db = Database::getInstance()->getConnection();

    $stmt = $db->prepare("
        INSERT INTO tax_codes (
            company_id, code, name, description, tax_type, rate,
            is_compound, is_included_in_price, applies_to,
            effective_from, effective_to, country_code, region_code
        ) VALUES (
            :company_id, :code, :name, :description, :tax_type, :rate,
            :is_compound, :is_included_in_price, :applies_to,
            :effective_from, :effective_to, :country_code, :region_code
        ) RETURNING id
    ");

    $stmt->execute([
        'company_id' => $companyId,
        'code' => $input['code'],
        'name' => $input['name'],
        'description' => $input['description'] ?? null,
        'tax_type' => $input['tax_type'] ?? 'vat',
        'rate' => $input['rate'],
        'is_compound' => $input['is_compound'] ?? false,
        'is_included_in_price' => $input['is_included_in_price'] ?? false,
        'applies_to' => $input['applies_to'] ?? 'both',
        'effective_from' => $input['effective_from'] ?? null,
        'effective_to' => $input['effective_to'] ?? null,
        'country_code' => $input['country_code'] ?? 'RO',
        'region_code' => $input['region_code'] ?? null
    ]);

    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => ['id' => $result['id']]
    ]);
}

function handlePut($companyId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        throw new Exception('Tax code ID is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    $stmt = $db->prepare("
        UPDATE tax_codes SET
            code = :code,
            name = :name,
            description = :description,
            tax_type = :tax_type,
            rate = :rate,
            is_compound = :is_compound,
            is_included_in_price = :is_included_in_price,
            applies_to = :applies_to,
            updated_at = NOW()
        WHERE id = :id AND company_id = :company_id
    ");

    $stmt->execute([
        'id' => $input['id'],
        'company_id' => $companyId,
        'code' => $input['code'],
        'name' => $input['name'],
        'description' => $input['description'] ?? null,
        'tax_type' => $input['tax_type'] ?? 'vat',
        'rate' => $input['rate'],
        'is_compound' => $input['is_compound'] ?? false,
        'is_included_in_price' => $input['is_included_in_price'] ?? false,
        'applies_to' => $input['applies_to'] ?? 'both'
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Tax code updated successfully'
    ]);
}

function handleDelete($companyId) {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        throw new Exception('Tax code ID is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    // Soft delete
    $stmt = $db->prepare("
        UPDATE tax_codes
        SET is_active = false, updated_at = NOW()
        WHERE id = :id AND company_id = :company_id
    ");

    $stmt->execute([
        'id' => $id,
        'company_id' => $companyId
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Tax code deleted successfully'
    ]);
}
