<?php
/**
 * MBA Recommendations API Endpoint
 * Get MBA framework recommendations for fiscal/business situations
 *
 * POST /api/v1/mba/recommendations
 * Body: {
 *   "fiscal_situation": "Starting business",
 *   "user_id": "uuid",
 *   "company_id": "uuid"
 * }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Allow GET for simple recommendations list
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Return available fiscal situations for recommendations
    echo json_encode([
        'success' => true,
        'data' => [
            'available_situations' => [
                'Starting business',
                'Scaling operations',
                'Tax optimization',
                'Investment planning',
                'Risk management',
                'Cash flow management',
                'International expansion',
                'Regulatory compliance'
            ],
            'instructions' => 'POST with {"fiscal_situation": "your situation"} to get specific recommendations'
        ]
    ]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

require_once __DIR__ . '/../../services/MBAKnowledgeService.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['fiscal_situation'])) {
        throw new Exception('fiscal_situation is required');
    }

    $mbaService = new MBAKnowledgeService();

    // Get user context if provided
    $userContext = null;
    if (!empty($input['user_id']) && !empty($input['company_id'])) {
        // Fetch user fiscal context
        $db = Database::getInstance();
        $sql = "SELECT
                    c.id as company_id,
                    c.name as company_name,
                    COALESCE(SUM(i.total_amount), 0) as current_year_revenue,
                    COALESCE((SELECT SUM(total_amount) FROM expenses WHERE company_id = c.id
                              AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) as current_year_expenses,
                    COALESCE((SELECT COUNT(*) FROM employees WHERE company_id = c.id AND status = 'active'), 0) as employee_count
                FROM companies c
                LEFT JOIN invoices i ON c.id = i.company_id
                    AND EXTRACT(YEAR FROM i.invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                WHERE c.id = :company_id
                GROUP BY c.id, c.name
                LIMIT 1";

        $userContext = $db->fetchOne($sql, ['company_id' => $input['company_id']]);

        if ($userContext) {
            $netProfit = $userContext['current_year_revenue'] - $userContext['current_year_expenses'];
            $userContext['profit_margin'] = $userContext['current_year_revenue'] > 0
                ? ($netProfit / $userContext['current_year_revenue']) * 100
                : 0;
        }
    }

    // Get MBA recommendations
    $result = $mbaService->getMBARecommendations($input['fiscal_situation'], $userContext);

    // Log consultation
    if (!empty($input['user_id'])) {
        $db = Database::getInstance();
        $sql = "INSERT INTO mba_consultation_log (user_id, question, frameworks_suggested, fiscal_mba_hybrid)
                VALUES (:user_id, :question, :frameworks, TRUE)";

        $frameworks = array_column($result['recommendations'] ?? [], 'framework');
        $db->execute($sql, [
            'user_id' => $input['user_id'],
            'question' => $input['fiscal_situation'],
            'frameworks' => json_encode($frameworks)
        ]);
    }

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
