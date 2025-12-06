<?php
/**
 * Custom Expense Categories API
 *
 * Allows users to create custom expense categories with hierarchical aggregation
 *
 * FEATURES:
 * - Create custom categories with parent-child relationships
 * - Maintain aggregation rules for financial reporting
 * - Set tax deductibility and receipt requirements
 * - Auto-rollup to standard P&L categories
 *
 * STATE-OF-THE-ART:
 * - Hierarchical category trees
 * - Automatic financial statement mapping
 * - Smart defaults based on parent category
 * - Custom attributes per category
 *
 * @endpoint /api/v1/expenses/custom-categories.php
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    $db = Database::getInstance()->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // STANDARD CATEGORY STRUCTURE - Categories roll up to these for P&L
    $standardCategories = [
        'Operating Expenses' => [
            'statement_section' => 'operating_expenses',
            'default_tax_deductible' => true,
            'default_requires_receipt' => true,
            'description' => 'Day-to-day business operating costs'
        ],
        'Cost of Goods Sold' => [
            'statement_section' => 'cogs',
            'default_tax_deductible' => true,
            'default_requires_receipt' => true,
            'description' => 'Direct costs of producing goods/services'
        ],
        'Marketing & Advertising' => [
            'statement_section' => 'operating_expenses',
            'parent_rollup' => 'Operating Expenses',
            'default_tax_deductible' => true,
            'default_requires_receipt' => true,
            'description' => 'Customer acquisition and brand promotion'
        ],
        'Administrative' => [
            'statement_section' => 'operating_expenses',
            'parent_rollup' => 'Operating Expenses',
            'default_tax_deductible' => true,
            'default_requires_receipt' => true,
            'description' => 'General administrative and office expenses'
        ],
        'IT & Technology' => [
            'statement_section' => 'operating_expenses',
            'parent_rollup' => 'Operating Expenses',
            'default_tax_deductible' => true,
            'default_requires_receipt' => true,
            'description' => 'Technology infrastructure and software'
        ],
        'Professional Fees' => [
            'statement_section' => 'operating_expenses',
            'parent_rollup' => 'Operating Expenses',
            'default_tax_deductible' => true,
            'default_requires_receipt' => true,
            'description' => 'Legal, accounting, consulting fees'
        ],
        'Travel & Entertainment' => [
            'statement_section' => 'operating_expenses',
            'parent_rollup' => 'Operating Expenses',
            'default_tax_deductible' => true,
            'default_requires_receipt' => true,
            'description' => 'Business travel and client entertainment'
        ],
        'Other Income' => [
            'statement_section' => 'other_income',
            'default_tax_deductible' => false,
            'default_requires_receipt' => false,
            'description' => 'Non-operating income'
        ],
        'Other Expenses' => [
            'statement_section' => 'other_expenses',
            'default_tax_deductible' => false,
            'default_requires_receipt' => true,
            'description' => 'Non-operating expenses'
        ]
    ];

    switch ($method) {
        case 'GET':
            // Get all expense categories (standard + custom)
            $includeCustomOnly = isset($_GET['custom_only']) && $_GET['custom_only'] === 'true';
            $includeHierarchy = isset($_GET['hierarchy']) && $_GET['hierarchy'] === 'true';

            $sql = "
                SELECT
                    id,
                    company_id,
                    category_name,
                    parent_category,
                    statement_section,
                    is_tax_deductible,
                    requires_receipt,
                    is_custom,
                    is_active,
                    description,
                    created_at,
                    created_by
                FROM expense_categories
                WHERE company_id = :company_id
            ";

            $params = ['company_id' => $companyId];

            if ($includeCustomOnly) {
                $sql .= " AND is_custom = true";
            }

            $sql .= " ORDER BY parent_category NULLS FIRST, category_name ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Build hierarchy if requested
            $hierarchy = [];
            if ($includeHierarchy) {
                $categoryMap = [];
                foreach ($categories as $category) {
                    $categoryMap[$category['category_name']] = $category;
                    $categoryMap[$category['category_name']]['children'] = [];
                }

                foreach ($categories as $category) {
                    if ($category['parent_category']) {
                        // Child category
                        if (isset($categoryMap[$category['parent_category']])) {
                            $categoryMap[$category['parent_category']]['children'][] = $category;
                        }
                    } else {
                        // Top-level category
                        $hierarchy[] = $categoryMap[$category['category_name']];
                    }
                }
            }

            // Get usage statistics
            $usageStmt = $db->prepare("
                SELECT category, COUNT(*) as usage_count, SUM(amount) as total_amount
                FROM expenses
                WHERE company_id = :company_id
                AND category IS NOT NULL
                GROUP BY category
            ");
            $usageStmt->execute(['company_id' => $companyId]);
            $usage = $usageStmt->fetchAll(PDO::FETCH_ASSOC);

            $usageMap = [];
            foreach ($usage as $u) {
                $usageMap[$u['category']] = [
                    'count' => (int)$u['usage_count'],
                    'total' => round(floatval($u['total_amount']), 2)
                ];
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'categories' => $categories,
                    'hierarchy' => $includeHierarchy ? $hierarchy : null,
                    'usage_statistics' => $usageMap,
                    'standard_categories' => $standardCategories,
                    'total_categories' => count($categories),
                    'custom_categories' => count(array_filter($categories, fn($c) => $c['is_custom']))
                ]
            ]);
            break;

        case 'POST':
            // Create custom expense category
            $input = json_decode(file_get_contents('php://input'), true);

            $required = ['category_name'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    throw new Exception("Field '$field' is required");
                }
            }

            $categoryName = trim($input['category_name']);
            $parentCategory = $input['parent_category'] ?? null;

            // Check for duplicate
            $checkStmt = $db->prepare("
                SELECT id FROM expense_categories
                WHERE company_id = :company_id AND category_name = :name
            ");
            $checkStmt->execute(['company_id' => $companyId, 'name' => $categoryName]);

            if ($checkStmt->fetch()) {
                throw new Exception("Category '$categoryName' already exists");
            }

            // If parent category is specified, validate it exists
            $parentConfig = null;
            if ($parentCategory) {
                $parentStmt = $db->prepare("
                    SELECT * FROM expense_categories
                    WHERE company_id = :company_id AND category_name = :name
                ");
                $parentStmt->execute(['company_id' => $companyId, 'name' => $parentCategory]);
                $parentConfig = $parentStmt->fetch(PDO::FETCH_ASSOC);

                if (!$parentConfig && !isset($standardCategories[$parentCategory])) {
                    throw new Exception("Parent category '$parentCategory' not found");
                }

                // Use parent's standard category config if it exists
                if (isset($standardCategories[$parentCategory])) {
                    $parentConfig = $standardCategories[$parentCategory];
                }
            }

            // Determine defaults based on parent or input
            $statementSection = $input['statement_section'] ??
                ($parentConfig['statement_section'] ?? 'operating_expenses');

            $isTaxDeductible = $input['is_tax_deductible'] ??
                ($parentConfig['default_tax_deductible'] ?? true);

            $requiresReceipt = $input['requires_receipt'] ??
                ($parentConfig['default_requires_receipt'] ?? true);

            $insertStmt = $db->prepare("
                INSERT INTO expense_categories (
                    id,
                    company_id,
                    category_name,
                    parent_category,
                    statement_section,
                    is_tax_deductible,
                    requires_receipt,
                    is_custom,
                    is_active,
                    description,
                    created_by
                ) VALUES (
                    uuid_generate_v4(),
                    :company_id,
                    :category_name,
                    :parent_category,
                    :statement_section,
                    :is_tax_deductible,
                    :requires_receipt,
                    true,
                    true,
                    :description,
                    :created_by
                )
                RETURNING id
            ");

            $insertStmt->execute([
                'company_id' => $companyId,
                'category_name' => $categoryName,
                'parent_category' => $parentCategory,
                'statement_section' => $statementSection,
                'is_tax_deductible' => $isTaxDeductible,
                'requires_receipt' => $requiresReceipt,
                'description' => $input['description'] ?? null,
                'created_by' => $userData['user_id']
            ]);

            $result = $insertStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => [
                    'category_id' => $result['id'],
                    'message' => 'Custom expense category created successfully',
                    'aggregation_info' => [
                        'category_name' => $categoryName,
                        'parent_category' => $parentCategory,
                        'statement_section' => $statementSection,
                        'rolls_up_to' => $parentCategory ?? 'Top Level',
                        'note' => "Will be included in P&L under '$statementSection' section"
                    ]
                ]
            ]);
            break;

        case 'PUT':
            // Update custom expense category
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['id'])) {
                throw new Exception('Category ID required');
            }

            // Check it exists and is custom
            $checkStmt = $db->prepare("
                SELECT is_custom FROM expense_categories
                WHERE id = :id AND company_id = :company_id
            ");
            $checkStmt->execute(['id' => $input['id'], 'company_id' => $companyId]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                throw new Exception('Category not found');
            }

            if (!$existing['is_custom']) {
                throw new Exception('Cannot modify standard categories');
            }

            $updates = array_intersect_key($input, array_flip([
                'description', 'is_tax_deductible', 'requires_receipt', 'is_active'
            ]));

            if (empty($updates)) {
                throw new Exception('No fields to update');
            }

            $setClauses = [];
            foreach ($updates as $key => $value) {
                $setClauses[] = "$key = :$key";
            }

            $updateSql = "
                UPDATE expense_categories
                SET " . implode(', ', $setClauses) . "
                WHERE id = :id AND company_id = :company_id
            ";

            $updates['id'] = $input['id'];
            $updates['company_id'] = $companyId;

            $updateStmt = $db->prepare($updateSql);
            $updateStmt->execute($updates);

            echo json_encode([
                'success' => true,
                'message' => 'Category updated successfully'
            ]);
            break;

        case 'DELETE':
            // Deactivate custom category (soft delete)
            $categoryId = $_GET['id'] ?? null;

            if (!$categoryId) {
                throw new Exception('Category ID required');
            }

            // Check it's custom
            $checkStmt = $db->prepare("
                SELECT is_custom, category_name FROM expense_categories
                WHERE id = :id AND company_id = :company_id
            ");
            $checkStmt->execute(['id' => $categoryId, 'company_id' => $companyId]);
            $category = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$category) {
                throw new Exception('Category not found');
            }

            if (!$category['is_custom']) {
                throw new Exception('Cannot delete standard categories');
            }

            // Check if category is in use
            $usageStmt = $db->prepare("
                SELECT COUNT(*) as count FROM expenses
                WHERE category = :category_name AND company_id = :company_id
            ");
            $usageStmt->execute([
                'category_name' => $category['category_name'],
                'company_id' => $companyId
            ]);
            $usageCount = $usageStmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Soft delete
            $deleteStmt = $db->prepare("
                UPDATE expense_categories
                SET is_active = false
                WHERE id = :id AND company_id = :company_id
            ");
            $deleteStmt->execute(['id' => $categoryId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message' => 'Category deactivated successfully',
                'warning' => $usageCount > 0 ? "This category is used in $usageCount expenses" : null
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
