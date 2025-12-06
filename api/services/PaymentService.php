<?php
/**
 * Payment Service - Stripe Integration
 *
 * Handles all payment operations:
 * - Course purchases
 * - Subscription billing
 * - Invoice online payments
 * - Webhook processing
 *
 * @version 1.0.0
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/EmailService.php';

class PaymentService {
    private $db;
    private $stripe;
    private $emailService;
    private $webhookSecret;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->emailService = new EmailService();

        // Initialize Stripe
        require_once __DIR__ . '/../../vendor/autoload.php';

        $apiKey = Env::get('STRIPE_SECRET_KEY');
        if ($apiKey && strpos($apiKey, 'REPLACE') === false) {
            \Stripe\Stripe::setApiKey($apiKey);
            $this->stripe = new \Stripe\StripeClient($apiKey);
        }

        $this->webhookSecret = Env::get('STRIPE_WEBHOOK_SECRET');
    }

    // ==================== CHECKOUT SESSIONS ====================

    /**
     * Create checkout session for course purchase
     *
     * @param string $userId User UUID
     * @param string $courseId Course UUID
     * @param string $companyId Company UUID
     * @return array Checkout session data
     */
    public function createCourseCheckoutSession($userId, $courseId, $companyId) {
        // Get course details
        $course = $this->db->fetchOne(
            "SELECT * FROM courses WHERE id = $1",
            [$courseId]
        );

        if (!$course) {
            throw new Exception('Course not found');
        }

        // Get user details
        $user = $this->db->fetchOne(
            "SELECT * FROM users WHERE id = $1",
            [$userId]
        );

        if (!$user) {
            throw new Exception('User not found');
        }

        // Create Stripe checkout session
        $session = $this->stripe->checkout->sessions->create([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'ron',
                    'product_data' => [
                        'name' => $course['title'],
                        'description' => $course['description'],
                    ],
                    'unit_amount' => intval($course['price'] * 100), // Convert to cents
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => Env::get('APP_URL') . '/courses/' . $courseId . '/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => Env::get('APP_URL') . '/courses/' . $courseId,
            'customer_email' => $user['email'],
            'metadata' => [
                'user_id' => $userId,
                'course_id' => $courseId,
                'company_id' => $companyId,
                'type' => 'course_purchase'
            ]
        ]);

        // Log checkout session created
        $this->db->query(
            "INSERT INTO payment_transactions (
                user_id, company_id, amount, currency, status,
                payment_provider, provider_session_id, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())",
            [
                $userId,
                $companyId,
                $course['price'],
                'RON',
                'pending',
                'stripe',
                $session->id,
                json_encode(['course_id' => $courseId, 'type' => 'course_purchase'])
            ]
        );

        return [
            'session_id' => $session->id,
            'url' => $session->url
        ];
    }

    /**
     * Create checkout session for subscription billing
     *
     * @param string $userId User UUID
     * @param string $planId Subscription plan ID
     * @param string $companyId Company UUID
     * @return array Checkout session data
     */
    public function createSubscriptionCheckoutSession($userId, $planId, $companyId) {
        // Get plan details
        $plan = $this->db->fetchOne(
            "SELECT * FROM subscription_plans WHERE id = $1",
            [$planId]
        );

        if (!$plan) {
            throw new Exception('Subscription plan not found');
        }

        // Get user details
        $user = $this->db->fetchOne(
            "SELECT * FROM users WHERE id = $1",
            [$userId]
        );

        // Create or get Stripe price
        $stripePriceId = $this->getOrCreateStripePrice($plan);

        // Create Stripe checkout session
        $session = $this->stripe->checkout->sessions->create([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price' => $stripePriceId,
                'quantity' => 1,
            ]],
            'mode' => 'subscription',
            'success_url' => Env::get('APP_URL') . '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => Env::get('APP_URL') . '/pricing',
            'customer_email' => $user['email'],
            'metadata' => [
                'user_id' => $userId,
                'plan_id' => $planId,
                'company_id' => $companyId,
                'type' => 'subscription'
            ]
        ]);

        return [
            'session_id' => $session->id,
            'url' => $session->url
        ];
    }

    /**
     * Create checkout session for invoice payment
     *
     * @param string $invoiceId Invoice UUID
     * @param string $companyId Company UUID
     * @return array Checkout session data
     */
    public function createInvoiceCheckoutSession($invoiceId, $companyId) {
        // Get invoice details
        $invoice = $this->db->fetchOne(
            "SELECT i.*, c.display_name as customer_name, c.email as customer_email
             FROM invoices i
             JOIN contacts c ON i.customer_id = c.id
             WHERE i.id = $1 AND i.company_id = $2",
            [$invoiceId, $companyId]
        );

        if (!$invoice) {
            throw new Exception('Invoice not found');
        }

        if ($invoice['status'] === 'paid') {
            throw new Exception('Invoice already paid');
        }

        // Create Stripe checkout session
        $session = $this->stripe->checkout->sessions->create([
            'payment_method_types' => ['card'],
            'line_items' => [[
                'price_data' => [
                    'currency' => 'ron',
                    'product_data' => [
                        'name' => 'Invoice #' . $invoice['invoice_number'],
                        'description' => 'Payment for invoice #' . $invoice['invoice_number'],
                    ],
                    'unit_amount' => intval($invoice['total_amount'] * 100),
                ],
                'quantity' => 1,
            ]],
            'mode' => 'payment',
            'success_url' => Env::get('APP_URL') . '/invoices/' . $invoiceId . '/payment-success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => Env::get('APP_URL') . '/invoices/' . $invoiceId,
            'customer_email' => $invoice['customer_email'],
            'metadata' => [
                'invoice_id' => $invoiceId,
                'company_id' => $companyId,
                'type' => 'invoice_payment'
            ]
        ]);

        // Update invoice with payment link
        $this->db->query(
            "UPDATE invoices SET payment_link = $1 WHERE id = $2",
            [$session->url, $invoiceId]
        );

        return [
            'session_id' => $session->id,
            'url' => $session->url
        ];
    }

    // ==================== WEBHOOK PROCESSING ====================

    /**
     * Process Stripe webhook event
     *
     * @param string $payload Webhook payload
     * @param string $signature Stripe signature
     * @return array Processing result
     */
    public function processWebhook($payload, $signature) {
        if (!$this->webhookSecret) {
            throw new Exception('Webhook secret not configured');
        }

        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload,
                $signature,
                $this->webhookSecret
            );
        } catch (\UnexpectedValueException $e) {
            throw new Exception('Invalid payload');
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            throw new Exception('Invalid signature');
        }

        // Handle the event
        switch ($event->type) {
            case 'checkout.session.completed':
                return $this->handleCheckoutCompleted($event->data->object);

            case 'payment_intent.succeeded':
                return $this->handlePaymentSucceeded($event->data->object);

            case 'payment_intent.payment_failed':
                return $this->handlePaymentFailed($event->data->object);

            case 'customer.subscription.created':
                return $this->handleSubscriptionCreated($event->data->object);

            case 'customer.subscription.updated':
                return $this->handleSubscriptionUpdated($event->data->object);

            case 'customer.subscription.deleted':
                return $this->handleSubscriptionCancelled($event->data->object);

            default:
                // Unhandled event type
                return ['received' => true, 'handled' => false];
        }
    }

    /**
     * Handle successful checkout completion
     */
    private function handleCheckoutCompleted($session) {
        $metadata = $session->metadata;
        $type = $metadata->type ?? null;

        if ($type === 'course_purchase') {
            return $this->processCourseEnrollment($metadata, $session);
        } elseif ($type === 'invoice_payment') {
            return $this->processInvoicePayment($metadata, $session);
        } elseif ($type === 'subscription') {
            return $this->processSubscription($metadata, $session);
        }

        return ['received' => true, 'handled' => false];
    }

    /**
     * Process course enrollment after payment
     */
    private function processCourseEnrollment($metadata, $session) {
        $userId = $metadata->user_id;
        $courseId = $metadata->course_id;
        $companyId = $metadata->company_id;

        // Check if already enrolled
        $existing = $this->db->fetchOne(
            "SELECT id FROM course_enrollments WHERE user_id = $1 AND course_id = $2",
            [$userId, $courseId]
        );

        if ($existing) {
            return ['received' => true, 'message' => 'Already enrolled'];
        }

        // Enroll user in course
        $this->db->query(
            "INSERT INTO course_enrollments (
                user_id, course_id, company_id, enrollment_date,
                payment_status, payment_amount, payment_provider,
                payment_transaction_id, status
            ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)",
            [
                $userId,
                $courseId,
                $companyId,
                'paid',
                $session->amount_total / 100,
                'stripe',
                $session->payment_intent,
                'active'
            ]
        );

        // Update payment transaction
        $this->db->query(
            "UPDATE payment_transactions
             SET status = 'completed', payment_intent_id = $1, completed_at = NOW()
             WHERE provider_session_id = $2",
            [$session->payment_intent, $session->id]
        );

        // Get course name and user email
        $course = $this->db->fetchOne("SELECT title FROM courses WHERE id = $1", [$courseId]);
        $user = $this->db->fetchOne("SELECT email FROM users WHERE id = $1", [$userId]);

        // Send enrollment confirmation email
        $this->emailService->sendCourseEnrollmentEmail($user['email'], $course['title']);

        return ['received' => true, 'handled' => true, 'action' => 'course_enrolled'];
    }

    /**
     * Process invoice payment
     */
    private function processInvoicePayment($metadata, $session) {
        $invoiceId = $metadata->invoice_id;

        // Update invoice status
        $this->db->query(
            "UPDATE invoices
             SET status = 'paid',
                 paid_at = NOW(),
                 payment_method = 'stripe',
                 payment_reference = $1
             WHERE id = $2",
            [$session->payment_intent, $invoiceId]
        );

        // Record payment
        $invoice = $this->db->fetchOne(
            "SELECT * FROM invoices WHERE id = $1",
            [$invoiceId]
        );

        $this->db->query(
            "INSERT INTO payments (
                company_id, customer_id, invoice_id, amount,
                payment_date, payment_method, reference_number,
                status, created_at
            ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, NOW())",
            [
                $invoice['company_id'],
                $invoice['customer_id'],
                $invoiceId,
                $invoice['total_amount'],
                'stripe',
                $session->payment_intent,
                'completed'
            ]
        );

        return ['received' => true, 'handled' => true, 'action' => 'invoice_paid'];
    }

    /**
     * Process subscription creation
     */
    private function processSubscription($metadata, $session) {
        $userId = $metadata->user_id;
        $planId = $metadata->plan_id;
        $companyId = $metadata->company_id;

        // Get subscription from Stripe
        $subscription = $this->stripe->subscriptions->retrieve($session->subscription);

        // Create or update subscription in database
        $this->db->query(
            "INSERT INTO subscriptions (
                user_id, company_id, plan_id, stripe_subscription_id,
                stripe_customer_id, status, current_period_start,
                current_period_end, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (stripe_subscription_id) DO UPDATE
            SET status = $6, current_period_start = $7, current_period_end = $8",
            [
                $userId,
                $companyId,
                $planId,
                $subscription->id,
                $subscription->customer,
                $subscription->status,
                date('Y-m-d H:i:s', $subscription->current_period_start),
                date('Y-m-d H:i:s', $subscription->current_period_end)
            ]
        );

        return ['received' => true, 'handled' => true, 'action' => 'subscription_created'];
    }

    /**
     * Handle successful payment intent
     */
    private function handlePaymentSucceeded($paymentIntent) {
        // Update payment transaction
        $this->db->query(
            "UPDATE payment_transactions
             SET status = 'completed', payment_intent_id = $1, completed_at = NOW()
             WHERE payment_intent_id = $1",
            [$paymentIntent->id]
        );

        return ['received' => true, 'handled' => true];
    }

    /**
     * Handle failed payment
     */
    private function handlePaymentFailed($paymentIntent) {
        // Update payment transaction
        $this->db->query(
            "UPDATE payment_transactions
             SET status = 'failed', payment_intent_id = $1
             WHERE payment_intent_id = $1",
            [$paymentIntent->id]
        );

        return ['received' => true, 'handled' => true];
    }

    /**
     * Handle subscription updates
     */
    private function handleSubscriptionUpdated($subscription) {
        $this->db->query(
            "UPDATE subscriptions
             SET status = $1,
                 current_period_start = $2,
                 current_period_end = $3,
                 updated_at = NOW()
             WHERE stripe_subscription_id = $4",
            [
                $subscription->status,
                date('Y-m-d H:i:s', $subscription->current_period_start),
                date('Y-m-d H:i:s', $subscription->current_period_end),
                $subscription->id
            ]
        );

        return ['received' => true, 'handled' => true];
    }

    /**
     * Handle subscription cancellation
     */
    private function handleSubscriptionCancelled($subscription) {
        $this->db->query(
            "UPDATE subscriptions
             SET status = 'cancelled', cancelled_at = NOW()
             WHERE stripe_subscription_id = $1",
            [$subscription->id]
        );

        return ['received' => true, 'handled' => true];
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get or create Stripe price for subscription plan
     */
    private function getOrCreateStripePrice($plan) {
        // Check if Stripe price ID already exists
        if (!empty($plan['stripe_price_id'])) {
            return $plan['stripe_price_id'];
        }

        // Create product if needed
        $product = $this->stripe->products->create([
            'name' => $plan['name'],
            'description' => $plan['description']
        ]);

        // Create price
        $price = $this->stripe->prices->create([
            'product' => $product->id,
            'unit_amount' => intval($plan['price'] * 100),
            'currency' => 'ron',
            'recurring' => [
                'interval' => $plan['billing_interval'] ?? 'month',
                'interval_count' => $plan['billing_interval_count'] ?? 1
            ]
        ]);

        // Store Stripe IDs
        $this->db->query(
            "UPDATE subscription_plans
             SET stripe_product_id = $1, stripe_price_id = $2
             WHERE id = $3",
            [$product->id, $price->id, $plan['id']]
        );

        return $price->id;
    }

    /**
     * Verify payment session
     */
    public function verifyPaymentSession($sessionId) {
        try {
            $session = $this->stripe->checkout->sessions->retrieve($sessionId);
            return [
                'success' => true,
                'payment_status' => $session->payment_status,
                'customer_email' => $session->customer_email,
                'amount_total' => $session->amount_total / 100,
                'metadata' => $session->metadata
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
