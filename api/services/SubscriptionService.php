<?php
/**
 * SubscriptionService.php
 *
 * Service for managing user subscriptions, plans, and billing
 * Handles subscription lifecycle, upgrades/downgrades, and invoicing
 *
 * @category Service
 * @package  DocumentIulia
 * @author   DocumentIulia Platform
 * @created  2025-01-21
 */

require_once __DIR__ . '/../config/database.php';

class SubscriptionService
{
    private $db;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();
    }

    // ========================================
    // SUBSCRIPTION PLANS
    // ========================================

    /**
     * Get all active subscription plans
     *
     * @return array Plans list
     */
    public function getActivePlans()
    {
        try {
            $query = "SELECT
                id, plan_key, plan_name, description,
                price_monthly, price_quarterly, price_yearly, currency,
                features, max_companies, max_users_per_company, max_invoices_per_month, ai_queries_per_month
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY price_monthly ASC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON features
            foreach ($plans as &$plan) {
                if ($plan['features']) {
                    $plan['features'] = json_decode($plan['features'], true);
                }
            }

            return [
                'success' => true,
                'plans' => $plans
            ];
        } catch (PDOException $e) {
            error_log("SubscriptionService::getActivePlans Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get subscription plans',
                'plans' => []
            ];
        }
    }

    /**
     * Get plan by ID or key
     *
     * @param mixed $planIdentifier Plan ID or key
     * @return array|null Plan data
     */
    public function getPlan($planIdentifier)
    {
        try {
            if (is_numeric($planIdentifier)) {
                $query = "SELECT * FROM subscription_plans WHERE id = :id AND is_active = true";
                $stmt = $this->db->prepare($query);
                $stmt->bindParam(':id', $planIdentifier, PDO::PARAM_INT);
            } else {
                $query = "SELECT * FROM subscription_plans WHERE plan_key = :plan_key AND is_active = true";
                $stmt = $this->db->prepare($query);
                $stmt->bindParam(':plan_key', $planIdentifier);
            }

            $stmt->execute();
            $plan = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($plan && $plan['features']) {
                $plan['features'] = json_decode($plan['features'], true);
            }

            return $plan;
        } catch (PDOException $e) {
            error_log("SubscriptionService::getPlan Error: " . $e->getMessage());
            return null;
        }
    }

    // ========================================
    // USER SUBSCRIPTIONS
    // ========================================

    /**
     * Get user's current active subscription
     *
     * @param string $userId User ID
     * @return array|null Subscription data
     */
    public function getUserSubscription($userId)
    {
        try {
            $query = "SELECT
                us.*,
                sp.plan_key, sp.plan_name, sp.features,
                sp.max_companies, sp.max_users_per_company, sp.max_invoices_per_month, sp.ai_queries_per_month
            FROM user_subscriptions us
            JOIN subscription_plans sp ON us.plan_id = sp.id
            WHERE us.user_id = :user_id
            AND us.status IN ('active', 'trialing')
            AND us.current_period_end > NOW()
            ORDER BY us.created_at DESC
            LIMIT 1";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            $subscription = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($subscription && $subscription['features']) {
                $subscription['features'] = json_decode($subscription['features'], true);
            }

            if ($subscription && $subscription['metadata']) {
                $subscription['metadata'] = json_decode($subscription['metadata'], true);
            }

            return $subscription;
        } catch (PDOException $e) {
            error_log("SubscriptionService::getUserSubscription Error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get all user subscriptions (including history)
     *
     * @param string $userId User ID
     * @return array Subscriptions list
     */
    public function getUserSubscriptionHistory($userId)
    {
        try {
            $query = "SELECT
                us.*,
                sp.plan_key, sp.plan_name
            FROM user_subscriptions us
            JOIN subscription_plans sp ON us.plan_id = sp.id
            WHERE us.user_id = :user_id
            ORDER BY us.created_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            return [
                'success' => true,
                'subscriptions' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch (PDOException $e) {
            error_log("SubscriptionService::getUserSubscriptionHistory Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get subscription history',
                'subscriptions' => []
            ];
        }
    }

    /**
     * Create new subscription for user
     *
     * @param string $userId User ID
     * @param int $planId Plan ID
     * @param array $subscriptionData Additional subscription data
     * @return array Result with subscription_id
     */
    public function createSubscription($userId, $planId, $subscriptionData = [])
    {
        try {
            $this->db->beginTransaction();

            // Get plan details
            $plan = $this->getPlan($planId);
            if (!$plan) {
                throw new Exception('Plan not found');
            }

            // Cancel existing active subscription
            $existing = $this->getUserSubscription($userId);
            if ($existing) {
                $this->cancelSubscription($existing['id'], false); // Don't commit yet
            }

            // Calculate period end based on billing cycle
            $billingCycle = $subscriptionData['billing_cycle'] ?? 'monthly';
            $currentPeriodStart = new DateTime();
            $currentPeriodEnd = clone $currentPeriodStart;

            switch ($billingCycle) {
                case 'yearly':
                    $currentPeriodEnd->modify('+1 year');
                    $amount = $plan['price_yearly'];
                    break;
                case 'quarterly':
                    $currentPeriodEnd->modify('+3 months');
                    $amount = $plan['price_quarterly'];
                    break;
                case 'monthly':
                default:
                    $currentPeriodEnd->modify('+1 month');
                    $amount = $plan['price_monthly'];
            }

            // Handle trial period
            $trialEnds = null;
            if (isset($subscriptionData['trial_days']) && $subscriptionData['trial_days'] > 0) {
                $trialEnds = (clone $currentPeriodStart)->modify('+' . $subscriptionData['trial_days'] . ' days');
                $status = 'trialing';
            } else {
                $status = 'active';
            }

            $query = "INSERT INTO user_subscriptions (
                user_id, company_id, plan_id, status, billing_cycle,
                amount_paid, currency, current_period_start, current_period_end,
                trial_ends_at, payment_method, stripe_subscription_id, stripe_customer_id,
                auto_renew, metadata
            ) VALUES (
                :user_id, :company_id, :plan_id, :status, :billing_cycle,
                :amount_paid, :currency, :current_period_start, :current_period_end,
                :trial_ends_at, :payment_method, :stripe_subscription_id, :stripe_customer_id,
                :auto_renew, :metadata
            ) RETURNING id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':company_id', $subscriptionData['company_id'] ?? null);
            $stmt->bindParam(':plan_id', $planId, PDO::PARAM_INT);
            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':billing_cycle', $billingCycle);
            $stmt->bindParam(':amount_paid', $amount);
            $stmt->bindParam(':currency', $plan['currency']);
            $stmt->bindValue(':current_period_start', $currentPeriodStart->format('Y-m-d H:i:s'));
            $stmt->bindValue(':current_period_end', $currentPeriodEnd->format('Y-m-d H:i:s'));
            $stmt->bindValue(':trial_ends_at', $trialEnds ? $trialEnds->format('Y-m-d H:i:s') : null);
            $stmt->bindParam(':payment_method', $subscriptionData['payment_method'] ?? null);
            $stmt->bindParam(':stripe_subscription_id', $subscriptionData['stripe_subscription_id'] ?? null);
            $stmt->bindParam(':stripe_customer_id', $subscriptionData['stripe_customer_id'] ?? null);
            $stmt->bindValue(':auto_renew', $subscriptionData['auto_renew'] ?? true, PDO::PARAM_BOOL);
            $stmt->bindValue(':metadata', json_encode($subscriptionData['metadata'] ?? []));

            $stmt->execute();
            $subscriptionId = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            $this->db->commit();

            return [
                'success' => true,
                'subscription_id' => $subscriptionId,
                'message' => 'Subscription created successfully'
            ];
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("SubscriptionService::createSubscription Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to create subscription: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Cancel subscription
     *
     * @param int $subscriptionId Subscription ID
     * @param bool $immediate Cancel immediately or at period end
     * @return array Result
     */
    public function cancelSubscription($subscriptionId, $immediate = false)
    {
        try {
            if ($immediate) {
                $query = "UPDATE user_subscriptions
                         SET status = 'canceled', canceled_at = NOW(), ended_at = NOW()
                         WHERE id = :subscription_id";
            } else {
                $query = "UPDATE user_subscriptions
                         SET cancel_at_period_end = true, canceled_at = NOW()
                         WHERE id = :subscription_id";
            }

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':subscription_id', $subscriptionId, PDO::PARAM_INT);
            $stmt->execute();

            return [
                'success' => true,
                'message' => $immediate ? 'Subscription canceled immediately' : 'Subscription will cancel at period end'
            ];
        } catch (PDOException $e) {
            error_log("SubscriptionService::cancelSubscription Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to cancel subscription'
            ];
        }
    }

    // ========================================
    // INVOICES
    // ========================================

    /**
     * Get user's subscription invoices
     *
     * @param string $userId User ID
     * @param int $limit Number of invoices to return
     * @return array Invoices list
     */
    public function getUserInvoices($userId, $limit = 50)
    {
        try {
            $query = "SELECT
                si.*,
                sp.plan_name
            FROM subscription_invoices si
            JOIN user_subscriptions us ON si.subscription_id = us.id
            JOIN subscription_plans sp ON us.plan_id = sp.id
            WHERE si.user_id = :user_id
            ORDER BY si.invoice_date DESC
            LIMIT :limit";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($invoices as &$invoice) {
                if ($invoice['line_items']) {
                    $invoice['line_items'] = json_decode($invoice['line_items'], true);
                }
                if ($invoice['metadata']) {
                    $invoice['metadata'] = json_decode($invoice['metadata'], true);
                }
            }

            return [
                'success' => true,
                'invoices' => $invoices
            ];
        } catch (PDOException $e) {
            error_log("SubscriptionService::getUserInvoices Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get invoices',
                'invoices' => []
            ];
        }
    }

    /**
     * Get invoice by ID
     *
     * @param int $invoiceId Invoice ID
     * @param string $userId User ID (for verification)
     * @return array|null Invoice data
     */
    public function getInvoice($invoiceId, $userId)
    {
        try {
            $query = "SELECT si.*, sp.plan_name
                     FROM subscription_invoices si
                     JOIN user_subscriptions us ON si.subscription_id = us.id
                     JOIN subscription_plans sp ON us.plan_id = sp.id
                     WHERE si.id = :invoice_id AND si.user_id = :user_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':invoice_id', $invoiceId, PDO::PARAM_INT);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($invoice) {
                if ($invoice['line_items']) {
                    $invoice['line_items'] = json_decode($invoice['line_items'], true);
                }
                if ($invoice['metadata']) {
                    $invoice['metadata'] = json_decode($invoice['metadata'], true);
                }
            }

            return $invoice;
        } catch (PDOException $e) {
            error_log("SubscriptionService::getInvoice Error: " . $e->getMessage());
            return null;
        }
    }

    // ========================================
    // FEATURE ACCESS
    // ========================================

    /**
     * Check if user has access to a feature
     *
     * @param string $userId User ID
     * @param string $featureKey Feature key to check
     * @return bool Has access
     */
    public function hasFeatureAccess($userId, $featureKey)
    {
        $subscription = $this->getUserSubscription($userId);

        if (!$subscription) {
            // No subscription = free plan access only
            $freePlan = $this->getPlan('free');
            $features = $freePlan['features'] ?? [];
        } else {
            $features = $subscription['features'] ?? [];
        }

        // Check if feature is in plan features array
        return in_array($featureKey, $features);
    }

    /**
     * Get subscription usage stats
     *
     * @param string $userId User ID
     * @return array Usage statistics
     */
    public function getUsageStats($userId)
    {
        try {
            $subscription = $this->getUserSubscription($userId);

            if (!$subscription) {
                return [
                    'invoices_this_month' => 0,
                    'invoices_limit' => 5,
                    'ai_queries_this_month' => 0,
                    'ai_queries_limit' => 0,
                    'storage_used_gb' => 0,
                    'storage_limit_gb' => 1
                ];
            }

            // Count invoices this month
            $invoiceQuery = "SELECT COUNT(*) as count FROM invoices
                            WHERE user_id = :user_id
                            AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)";

            $stmt = $this->db->prepare($invoiceQuery);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            $invoicesThisMonth = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // TODO: Track AI queries and storage in separate table
            return [
                'invoices_this_month' => (int)$invoicesThisMonth,
                'invoices_limit' => $subscription['max_invoices_per_month'] ?? null,
                'ai_queries_this_month' => 0, // TODO: Implement tracking
                'ai_queries_limit' => $subscription['ai_queries_per_month'] ?? null,
                'storage_used_gb' => 0, // TODO: Calculate from attachments
                'storage_limit_gb' => 10 // TODO: Add to plan
            ];
        } catch (PDOException $e) {
            error_log("SubscriptionService::getUsageStats Error: " . $e->getMessage());
            return [];
        }
    }
}
