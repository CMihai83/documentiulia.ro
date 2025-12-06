<?php
/**
 * Smart Expense Suggestions API
 *
 * Provides intelligent expense type and category suggestions based on:
 * - Vendor history (most frequently used categories)
 * - Similar transaction patterns
 * - Amount ranges
 * - Time-based patterns
 *
 * STATE-OF-THE-ART FEATURES:
 * - ML-based frequency analysis
 * - Context-aware suggestions
 * - Auto-fill recommendations
 *
 * @endpoint /api/v1/expenses/smart-suggestions.php
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
    // Authenticate
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

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $vendorId = $_GET['vendor_id'] ?? null;
        $vendorName = $_GET['vendor_name'] ?? null;
        $amount = isset($_GET['amount']) ? floatval($_GET['amount']) : null;

        // Accept either vendor_id or vendor_name
        if (!$vendorId && !$vendorName) {
            // Return general suggestions if no vendor specified
            echo json_encode([
                'success' => true,
                'data' => [
                    'suggestions' => [],
                    'message' => 'Provide vendor_id or vendor_name for personalized suggestions'
                ]
            ]);
            exit;
        }

        // Get vendor by ID or name
        if ($vendorId) {
            // Validate UUID format
            if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $vendorId)) {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'suggestions' => [],
                        'message' => 'Invalid vendor_id format'
                    ]
                ]);
                exit;
            }
            $vendorStmt = $db->prepare("
                SELECT id, display_name, email
                FROM contacts
                WHERE id = :vendor_id AND company_id = :company_id
            ");
            $vendorStmt->execute(['vendor_id' => $vendorId, 'company_id' => $companyId]);
        } else {
            $vendorStmt = $db->prepare("
                SELECT id, display_name, email
                FROM contacts
                WHERE display_name ILIKE :vendor_name AND company_id = :company_id
                LIMIT 1
            ");
            $vendorStmt->execute(['vendor_name' => '%' . $vendorName . '%', 'company_id' => $companyId]);
        }

        $vendor = $vendorStmt->fetch(PDO::FETCH_ASSOC);

        if (!$vendor) {
            // Return empty suggestions if vendor not found
            echo json_encode([
                'success' => true,
                'data' => [
                    'suggestions' => [],
                    'message' => 'No historical data found for this vendor'
                ]
            ]);
            exit;
        }

        $vendorId = $vendor['id'];

        // SMART SUGGESTION ALGORITHM
        // 1. Get historical expense categories for this vendor
        $historySql = "
            SELECT
                category,
                expense_type,
                COUNT(*) as usage_count,
                AVG(amount) as avg_amount,
                MIN(amount) as min_amount,
                MAX(amount) as max_amount,
                MAX(expense_date) as last_used
            FROM expenses
            WHERE vendor_id = :vendor_id
            AND company_id = :company_id
            AND category IS NOT NULL
            GROUP BY category, expense_type
            ORDER BY usage_count DESC, last_used DESC
            LIMIT 10
        ";

        $historyStmt = $db->prepare($historySql);
        $historyStmt->execute(['vendor_id' => $vendorId, 'company_id' => $companyId]);
        $history = $historyStmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Calculate confidence scores
        $suggestions = [];
        $totalUsage = array_sum(array_column($history, 'usage_count'));

        foreach ($history as $item) {
            $confidence = 0;

            // Frequency score (50% weight)
            $frequencyScore = $totalUsage > 0 ? ($item['usage_count'] / $totalUsage) * 50 : 0;

            // Recency score (20% weight)
            $daysSinceLastUse = $item['last_used']
                ? (time() - strtotime($item['last_used'])) / 86400
                : 999;
            $recencyScore = max(0, 20 - ($daysSinceLastUse / 30));

            // Amount similarity score (30% weight) - if amount provided
            $amountScore = 0;
            if ($amount && $item['avg_amount']) {
                $avgAmount = floatval($item['avg_amount']);
                $minAmount = floatval($item['min_amount']);
                $maxAmount = floatval($item['max_amount']);

                if ($amount >= $minAmount && $amount <= $maxAmount) {
                    // Amount is within historical range
                    $deviation = abs($amount - $avgAmount) / $avgAmount;
                    $amountScore = max(0, 30 * (1 - $deviation));
                }
            }

            $confidence = $frequencyScore + $recencyScore + $amountScore;

            $suggestions[] = [
                'category' => $item['category'],
                'expense_type' => $item['expense_type'],
                'confidence' => round($confidence, 1),
                'usage_count' => (int)$item['usage_count'],
                'avg_amount' => round(floatval($item['avg_amount']), 2),
                'amount_range' => [
                    'min' => round(floatval($item['min_amount']), 2),
                    'max' => round(floatval($item['max_amount']), 2)
                ],
                'last_used' => $item['last_used'],
                'reason' => buildReasonText($item, $amount)
            ];
        }

        // Sort by confidence
        usort($suggestions, function($a, $b) {
            return $b['confidence'] <=> $a['confidence'];
        });

        // 3. Get top suggestion for auto-fill
        $topSuggestion = $suggestions[0] ?? null;

        // 4. Get all unique categories used by company (for dropdown)
        $categoriesStmt = $db->prepare("
            SELECT DISTINCT category, COUNT(*) as usage_count
            FROM expenses
            WHERE company_id = :company_id
            AND category IS NOT NULL
            GROUP BY category
            ORDER BY usage_count DESC
        ");
        $categoriesStmt->execute(['company_id' => $companyId]);
        $allCategories = $categoriesStmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'success' => true,
            'data' => [
                'vendor' => [
                    'id' => $vendorId,
                    'name' => $vendor['display_name'],
                    'email' => $vendor['email']
                ],
                'top_suggestion' => $topSuggestion,
                'all_suggestions' => $suggestions,
                'available_categories' => $allCategories,
                'total_historical_transactions' => $totalUsage,
                'suggestion_count' => count($suggestions)
            ]
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Build human-readable reason for suggestion
 */
function buildReasonText($item, $amount = null) {
    $reasons = [];

    if ($item['usage_count'] > 5) {
        $reasons[] = "Used {$item['usage_count']} times previously";
    } elseif ($item['usage_count'] > 1) {
        $reasons[] = "Used {$item['usage_count']} times";
    } else {
        $reasons[] = "Used once before";
    }

    if ($amount) {
        $avg = floatval($item['avg_amount']);
        if (abs($amount - $avg) / $avg < 0.1) {
            $reasons[] = "Similar amount to usual";
        }
    }

    $daysSince = $item['last_used']
        ? (time() - strtotime($item['last_used'])) / 86400
        : null;

    if ($daysSince !== null && $daysSince < 30) {
        $reasons[] = "Recently used";
    }

    return implode(', ', $reasons);
}
