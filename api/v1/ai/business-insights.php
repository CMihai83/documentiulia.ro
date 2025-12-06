<?php
/**
 * AI Business Insights Endpoint
 * GET /api/v1/ai/business-insights.php
 * Returns AI-generated business insights and recommendations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance();

    // Gather business data for insights
    $insights = [];

    // Revenue trend analysis
    $revenueData = $db->fetchAll(
        "SELECT
            date_trunc('month', created_at) as month,
            SUM(total_amount) as revenue
         FROM invoices
         WHERE company_id = :company_id
         AND created_at >= NOW() - INTERVAL '6 months'
         GROUP BY date_trunc('month', created_at)
         ORDER BY month DESC",
        ['company_id' => $companyId]
    );

    if (count($revenueData) >= 2) {
        $currentMonth = $revenueData[0]['revenue'] ?? 0;
        $previousMonth = $revenueData[1]['revenue'] ?? 0;
        $growth = $previousMonth > 0 ? (($currentMonth - $previousMonth) / $previousMonth) * 100 : 0;

        if ($growth > 10) {
            $insights[] = [
                'id' => 'revenue_growth',
                'type' => 'positive',
                'icon' => 'TrendingUp',
                'title_ro' => 'Creștere a veniturilor',
                'title_en' => 'Revenue Growth',
                'message_ro' => sprintf('Veniturile au crescut cu %.1f%% față de luna trecută. Continuă strategia actuală!', $growth),
                'message_en' => sprintf('Revenue increased by %.1f%% compared to last month. Keep up the current strategy!', $growth),
                'priority' => 1
            ];
        } elseif ($growth < -10) {
            $insights[] = [
                'id' => 'revenue_decline',
                'type' => 'warning',
                'icon' => 'TrendingDown',
                'title_ro' => 'Scădere a veniturilor',
                'title_en' => 'Revenue Decline',
                'message_ro' => sprintf('Veniturile au scăzut cu %.1f%% față de luna trecută. Analizează cauzele și ia măsuri.', abs($growth)),
                'message_en' => sprintf('Revenue decreased by %.1f%% compared to last month. Analyze causes and take action.', abs($growth)),
                'priority' => 1
            ];
        }
    }

    // Expense analysis
    $expenseData = $db->fetchOne(
        "SELECT
            SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 month' THEN amount ELSE 0 END) as this_month,
            SUM(CASE WHEN created_at >= NOW() - INTERVAL '2 months' AND created_at < NOW() - INTERVAL '1 month' THEN amount ELSE 0 END) as last_month
         FROM expenses
         WHERE company_id = :company_id",
        ['company_id' => $companyId]
    );

    $thisMonth = $expenseData['this_month'] ?? 0;
    $lastMonth = $expenseData['last_month'] ?? 0;

    if ($lastMonth > 0) {
        $expenseGrowth = (($thisMonth - $lastMonth) / $lastMonth) * 100;
        if ($expenseGrowth > 20) {
            $insights[] = [
                'id' => 'expense_increase',
                'type' => 'warning',
                'icon' => 'AlertTriangle',
                'title_ro' => 'Creștere a cheltuielilor',
                'title_en' => 'Expense Increase',
                'message_ro' => sprintf('Cheltuielile au crescut cu %.1f%%. Verifică categoriile de cheltuieli.', $expenseGrowth),
                'message_en' => sprintf('Expenses increased by %.1f%%. Review expense categories.', $expenseGrowth),
                'priority' => 2
            ];
        }
    }

    // Overdue invoices
    $overdueCount = $db->fetchOne(
        "SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total
         FROM invoices
         WHERE company_id = :company_id
         AND status = 'sent'
         AND due_date < CURRENT_DATE",
        ['company_id' => $companyId]
    );

    if (($overdueCount['cnt'] ?? 0) > 0) {
        $insights[] = [
            'id' => 'overdue_invoices',
            'type' => 'alert',
            'icon' => 'Clock',
            'title_ro' => 'Facturi restante',
            'title_en' => 'Overdue Invoices',
            'message_ro' => sprintf('Ai %d facturi restante în valoare de %.2f RON. Contactează clienții pentru încasare.', $overdueCount['cnt'], $overdueCount['total']),
            'message_en' => sprintf('You have %d overdue invoices totaling %.2f RON. Contact clients for collection.', $overdueCount['cnt'], $overdueCount['total']),
            'priority' => 1
        ];
    }

    // Task completion rate
    $taskStats = $db->fetchOne(
        "SELECT
            COUNT(*) FILTER (WHERE status IN ('completed', 'done')) as completed,
            COUNT(*) as total
         FROM tasks
         WHERE company_id = :company_id
         AND created_at >= NOW() - INTERVAL '30 days'",
        ['company_id' => $companyId]
    );

    $completionRate = ($taskStats['total'] ?? 0) > 0
        ? (($taskStats['completed'] ?? 0) / $taskStats['total']) * 100
        : 0;

    if ($completionRate > 80) {
        $insights[] = [
            'id' => 'task_productivity',
            'type' => 'positive',
            'icon' => 'CheckCircle',
            'title_ro' => 'Productivitate excelentă',
            'title_en' => 'Excellent Productivity',
            'message_ro' => sprintf('Rata de finalizare a sarcinilor este de %.0f%%. Echipa ta este foarte productivă!', $completionRate),
            'message_en' => sprintf('Task completion rate is %.0f%%. Your team is highly productive!', $completionRate),
            'priority' => 3
        ];
    } elseif ($completionRate < 50 && ($taskStats['total'] ?? 0) > 5) {
        $insights[] = [
            'id' => 'task_backlog',
            'type' => 'warning',
            'icon' => 'AlertCircle',
            'title_ro' => 'Sarcini neîncepute',
            'title_en' => 'Task Backlog',
            'message_ro' => sprintf('Rata de finalizare a sarcinilor este doar %.0f%%. Prioritizează sarcinile importante.', $completionRate),
            'message_en' => sprintf('Task completion rate is only %.0f%%. Prioritize important tasks.', $completionRate),
            'priority' => 2
        ];
    }

    // Add a general tip if no other insights
    if (empty($insights)) {
        $insights[] = [
            'id' => 'general_tip',
            'type' => 'info',
            'icon' => 'Lightbulb',
            'title_ro' => 'Sfat de afaceri',
            'title_en' => 'Business Tip',
            'message_ro' => 'Continuă să adaugi date în sistem pentru a primi recomandări personalizate bazate pe performanța afacerii tale.',
            'message_en' => 'Keep adding data to the system to receive personalized recommendations based on your business performance.',
            'priority' => 5
        ];
    }

    // Sort by priority
    usort($insights, fn($a, $b) => $a['priority'] - $b['priority']);

    echo json_encode([
        'success' => true,
        'data' => [
            'insights' => $insights,
            'generated_at' => date('Y-m-d H:i:s'),
            'insights_count' => count($insights)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
