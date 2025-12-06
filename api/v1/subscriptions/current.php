<?php
/**
 * Current Subscription API
 * GET /api/v1/subscriptions/current.php - Get current subscription details
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

    $db = Database::getInstance()->getConnection();

    $stmt = $db->prepare("
        SELECT
            s.id,
            s.plan_id,
            s.status,
            s.current_period_start as start_date,
            s.current_period_end as end_date,
            s.trial_start,
            s.trial_end,
            s.cancel_at_period_end,
            s.stripe_subscription_id,
            s.stripe_customer_id,
            s.created_at,
            s.updated_at,
            sp.plan_name,
            sp.price_monthly as amount,
            'monthly' as billing_cycle,
            sp.currency
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.company_id = :company_id
        AND s.status IN ('active', 'trialing')
        ORDER BY s.created_at DESC
        LIMIT 1
    ");

    $stmt->execute(['company_id' => $companyId]);
    $subscription = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$subscription) {
        echo json_encode([
            'success' => true,
            'data' => null,
            'message' => 'No active subscription found'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'data' => $subscription
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
