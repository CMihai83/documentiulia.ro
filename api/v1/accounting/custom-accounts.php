<?php
/**
 * Custom Chart of Accounts API
 *
 * Allows users to add custom accounts while maintaining proper aggregation structure
 *
 * FEATURES:
 * - Add custom accounts to standard categories (COGS, Operating Expenses, etc.)
 * - Maintains aggregation rules for financial reporting
 * - Validates account codes and prevents duplicates
 * - Auto-assigns to correct P&L and Balance Sheet sections
 *
 * STATE-OF-THE-ART:
 * - Smart categorization
 * - Automatic financial statement mapping
 * - Preserves GAAP/IFRS compliance
 *
 * @endpoint /api/v1/accounting/custom-accounts.php
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

    $db = Database::getInstance()->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // ACCOUNT CATEGORY STRUCTURE WITH AGGREGATION RULES
    $categoryStructure = [
        'Revenue' => [
            'code_range' => ['4000', '4999'],
            'statement' => 'income_statement',
            'section' => 'revenue',
            'normal_balance' => 'credit',
            'subcategories' => ['Product Sales', 'Service Revenue', 'Other Income']
        ],
        'COGS' => [
            'code_range' => ['5000', '5999'],
            'statement' => 'income_statement',
            'section' => 'cogs',
            'normal_balance' => 'debit',
            'subcategories' => ['Direct Materials', 'Direct Labor', 'Manufacturing Overhead', 'Freight In']
        ],
        'Operating Expenses' => [
            'code_range' => ['6000', '7999'],
            'statement' => 'income_statement',
            'section' => 'operating_expenses',
            'normal_balance' => 'debit',
            'subcategories' => [
                'Salaries & Wages',
                'Rent & Utilities',
                'Marketing & Advertising',
                'Office Supplies',
                'Professional Fees',
                'Insurance',
                'Depreciation',
                'Travel & Entertainment',
                'IT & Software',
                'Other Operating Expenses'
            ]
        ],
        'Assets' => [
            'code_range' => ['1000', '1999'],
            'statement' => 'balance_sheet',
            'section' => 'assets',
            'normal_balance' => 'debit',
            'subcategories' => ['Current Assets', 'Fixed Assets', 'Intangible Assets']
        ],
        'Liabilities' => [
            'code_range' => ['2000', '2999'],
            'statement' => 'balance_sheet',
            'section' => 'liabilities',
            'normal_balance' => 'credit',
            'subcategories' => ['Current Liabilities', 'Long-term Liabilities']
        ],
        'Equity' => [
            'code_range' => ['3000', '3999'],
            'statement' => 'balance_sheet',
            'section' => 'equity',
            'normal_balance' => 'credit',
            'subcategories' => ['Capital', 'Retained Earnings', 'Draws']
        ]
    ];

    switch ($method) {
        case 'GET':
            // Get all accounts including custom ones
            $includeCustomOnly = isset($_GET['custom_only']) && $_GET['custom_only'] === 'true';
            $category = $_GET['category'] ?? null;

            $sql = "
                SELECT
                    id,
                    company_id,
                    code as account_code,
                    name as account_name,
                    account_type as category,
                    account_subtype as subcategory,
                    account_type,
                    normal_balance,
                    is_system_account,
                    is_active,
                    created_at
                FROM chart_of_accounts
                WHERE company_id = :company_id
            ";

            $params = ['company_id' => $companyId];

            if ($includeCustomOnly) {
                $sql .= " AND is_system_account = false";
            }

            if ($category) {
                $sql .= " AND account_type = :category";
                $params['category'] = $category;
            }

            $sql .= " ORDER BY code ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Group by account_type for easy UI rendering
            $grouped = [];
            foreach ($accounts as $account) {
                $cat = $account['category'];
                if (!isset($grouped[$cat])) {
                    $grouped[$cat] = [];
                }
                $grouped[$cat][] = $account;
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'accounts' => $accounts,
                    'grouped_by_category' => $grouped,
                    'category_structure' => $categoryStructure,
                    'total_accounts' => count($accounts),
                    'custom_accounts' => count(array_filter($accounts, fn($a) => !$a['is_system_account']))
                ]
            ]);
            break;

        case 'POST':
            // Create custom account
            $input = json_decode(file_get_contents('php://input'), true);

            $required = ['account_code', 'account_name', 'category'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    throw new Exception("Field '$field' is required");
                }
            }

            $accountCode = $input['account_code'];
            $category = $input['category'];

            // Validate category exists
            if (!isset($categoryStructure[$category])) {
                throw new Exception("Invalid category. Must be one of: " . implode(', ', array_keys($categoryStructure)));
            }

            // Validate account code is in range for category
            $codeRange = $categoryStructure[$category]['code_range'];
            $code = intval($accountCode);

            if ($code < intval($codeRange[0]) || $code > intval($codeRange[1])) {
                throw new Exception("Account code must be between {$codeRange[0]} and {$codeRange[1]} for category '{$category}'");
            }

            // Check for duplicate
            $checkStmt = $db->prepare("
                SELECT id FROM chart_of_accounts
                WHERE company_id = :company_id AND account_code = :code
            ");
            $checkStmt->execute(['company_id' => $companyId, 'code' => $accountCode]);

            if ($checkStmt->fetch()) {
                throw new Exception("Account code '$accountCode' already exists");
            }

            // Auto-assign properties from category structure
            $categoryConfig = $categoryStructure[$category];

            $accountId = uuid_generate_v4(); // Using PostgreSQL function

            $insertStmt = $db->prepare("
                INSERT INTO chart_of_accounts (
                    id,
                    company_id,
                    account_code,
                    account_name,
                    category,
                    subcategory,
                    account_type,
                    normal_balance,
                    is_custom,
                    is_active,
                    created_by
                ) VALUES (
                    uuid_generate_v4(),
                    :company_id,
                    :account_code,
                    :account_name,
                    :category,
                    :subcategory,
                    :account_type,
                    :normal_balance,
                    true,
                    true,
                    :created_by
                )
                RETURNING id
            ");

            $insertStmt->execute([
                'company_id' => $companyId,
                'account_code' => $accountCode,
                'account_name' => $input['account_name'],
                'category' => $category,
                'subcategory' => $input['subcategory'] ?? null,
                'account_type' => $categoryConfig['section'],
                'normal_balance' => $categoryConfig['normal_balance'],
                'created_by' => $userData['user_id']
            ]);

            $result = $insertStmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => [
                    'account_id' => $result['id'],
                    'message' => 'Custom account created successfully',
                    'aggregation_info' => [
                        'category' => $category,
                        'statement' => $categoryConfig['statement'],
                        'section' => $categoryConfig['section'],
                        'note' => "Automatically included in {$categoryConfig['statement']} under {$categoryConfig['section']}"
                    ]
                ]
            ]);
            break;

        case 'PUT':
            // Update custom account
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['id'])) {
                throw new Exception('Account ID required');
            }

            // Check it exists and is custom
            $checkStmt = $db->prepare("
                SELECT is_custom FROM chart_of_accounts
                WHERE id = :id AND company_id = :company_id
            ");
            $checkStmt->execute(['id' => $input['id'], 'company_id' => $companyId]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                throw new Exception('Account not found');
            }

            if (!$existing['is_custom']) {
                throw new Exception('Cannot modify standard accounts');
            }

            $updates = array_intersect_key($input, array_flip([
                'account_name', 'subcategory', 'is_active'
            ]));

            if (empty($updates)) {
                throw new Exception('No fields to update');
            }

            $setClauses = [];
            foreach ($updates as $key => $value) {
                $setClauses[] = "$key = :$key";
            }

            $updateSql = "
                UPDATE chart_of_accounts
                SET " . implode(', ', $setClauses) . "
                WHERE id = :id AND company_id = :company_id
            ";

            $updates['id'] = $input['id'];
            $updates['company_id'] = $companyId;

            $updateStmt = $db->prepare($updateSql);
            $updateStmt->execute($updates);

            echo json_encode([
                'success' => true,
                'message' => 'Account updated successfully'
            ]);
            break;

        case 'DELETE':
            // Deactivate custom account (soft delete)
            $accountId = $_GET['id'] ?? null;

            if (!$accountId) {
                throw new Exception('Account ID required');
            }

            // Check it's custom
            $checkStmt = $db->prepare("
                SELECT is_custom FROM chart_of_accounts
                WHERE id = :id AND company_id = :company_id
            ");
            $checkStmt->execute(['id' => $accountId, 'company_id' => $companyId]);
            $account = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$account) {
                throw new Exception('Account not found');
            }

            if (!$account['is_custom']) {
                throw new Exception('Cannot delete standard accounts');
            }

            // Soft delete
            $deleteStmt = $db->prepare("
                UPDATE chart_of_accounts
                SET is_active = false
                WHERE id = :id AND company_id = :company_id
            ");
            $deleteStmt->execute(['id' => $accountId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message' => 'Account deactivated successfully'
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
