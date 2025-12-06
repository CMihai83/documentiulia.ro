<?php
/**
 * Expense Categories Management API
 * GET /api/v1/settings/categories.php - List all categories
 * POST /api/v1/settings/categories.php - Create new category
 * PUT /api/v1/settings/categories.php - Update category
 * DELETE /api/v1/settings/categories.php?id=xxx - Delete category
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
            category_name as name,
            description,
            parent_category as parent_name,
            statement_section,
            is_tax_deductible,
            requires_receipt,
            is_custom,
            is_active,
            created_at,
            updated_at
        FROM expense_categories
        WHERE company_id = :company_id
        AND is_active = true
        ORDER BY category_name ASC
    ");

    $stmt->execute(['company_id' => $companyId]);
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $categories
    ]);
}

function handlePost($companyId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['name'])) {
        throw new Exception('Category name is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    $stmt = $db->prepare("
        INSERT INTO expense_categories (
            company_id, category_name, description, parent_category,
            statement_section, is_tax_deductible, requires_receipt
        ) VALUES (
            :company_id, :name, :description, :parent_category,
            :statement_section, :is_tax_deductible, :requires_receipt
        ) RETURNING id
    ");

    $stmt->execute([
        'company_id' => $companyId,
        'name' => $input['name'],
        'description' => $input['description'] ?? null,
        'parent_category' => $input['parent_category'] ?? null,
        'statement_section' => $input['statement_section'] ?? 'operating_expenses',
        'is_tax_deductible' => $input['is_tax_deductible'] ?? true,
        'requires_receipt' => $input['requires_receipt'] ?? true
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
        throw new Exception('Category ID is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    $stmt = $db->prepare("
        UPDATE expense_categories SET
            category_name = :name,
            description = :description,
            parent_category = :parent_category,
            statement_section = :statement_section,
            is_tax_deductible = :is_tax_deductible,
            requires_receipt = :requires_receipt,
            updated_at = NOW()
        WHERE id = :id AND company_id = :company_id
    ");

    $stmt->execute([
        'id' => $input['id'],
        'company_id' => $companyId,
        'name' => $input['name'],
        'description' => $input['description'] ?? null,
        'parent_category' => $input['parent_category'] ?? null,
        'statement_section' => $input['statement_section'] ?? 'operating_expenses',
        'is_tax_deductible' => $input['is_tax_deductible'] ?? true,
        'requires_receipt' => $input['requires_receipt'] ?? true
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Category updated successfully'
    ]);
}

function handleDelete($companyId) {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        throw new Exception('Category ID is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    // Soft delete
    $stmt = $db->prepare("
        UPDATE expense_categories
        SET is_active = false, updated_at = NOW()
        WHERE id = :id AND company_id = :company_id
    ");

    $stmt->execute([
        'id' => $id,
        'company_id' => $companyId
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Category deleted successfully'
    ]);
}
