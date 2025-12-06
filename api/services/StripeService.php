<?php
/**
 * Stripe Payment Integration Service
 *
 * Handles payment processing, customer management, and subscription billing
 *
 * SETUP:
 * 1. Install Stripe SDK: composer require stripe/stripe-php
 * 2. Set environment variables:
 *    - STRIPE_SECRET_KEY
 *    - STRIPE_PUBLISHABLE_KEY
 *    - STRIPE_WEBHOOK_SECRET
 */

class StripeService
{
    private $stripe;
    private $isConfigured = false;

    public function __construct()
    {
        $secretKey = getenv('STRIPE_SECRET_KEY') ?: $_ENV['STRIPE_SECRET_KEY'] ?? null;

        if ($secretKey) {
            // Note: Requires stripe/stripe-php package
            // composer require stripe/stripe-php
            if (class_exists('\Stripe\Stripe')) {
                \Stripe\Stripe::setApiKey($secretKey);
                $this->isConfigured = true;
            }
        }
    }

    /**
     * Check if Stripe is properly configured
     */
    public function isConfigured(): bool
    {
        return $this->isConfigured;
    }

    /**
     * Create a Stripe customer
     */
    public function createCustomer(string $email, string $name, array $metadata = []): array
    {
        $this->ensureConfigured();

        try {
            $customer = \Stripe\Customer::create([
                'email' => $email,
                'name' => $name,
                'metadata' => $metadata
            ]);

            return [
                'success' => true,
                'customer_id' => $customer->id,
                'email' => $customer->email
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Create a payment intent
     */
    public function createPaymentIntent(int $amount, string $currency = 'ron', array $options = []): array
    {
        $this->ensureConfigured();

        try {
            $paymentIntent = \Stripe\PaymentIntent::create([
                'amount' => $amount, // Amount in cents
                'currency' => strtolower($currency),
                'automatic_payment_methods' => ['enabled' => true],
                'metadata' => $options['metadata'] ?? [],
                'description' => $options['description'] ?? null,
                'customer' => $options['customer_id'] ?? null
            ]);

            return [
                'success' => true,
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id,
                'status' => $paymentIntent->status
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Confirm a payment intent
     */
    public function confirmPayment(string $paymentIntentId): array
    {
        $this->ensureConfigured();

        try {
            $paymentIntent = \Stripe\PaymentIntent::retrieve($paymentIntentId);
            $paymentIntent->confirm();

            return [
                'success' => true,
                'status' => $paymentIntent->status,
                'amount_received' => $paymentIntent->amount_received
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Process invoice payment via Stripe
     */
    public function processInvoicePayment(string $invoiceId, int $amount, string $customerId): array
    {
        $this->ensureConfigured();

        return $this->createPaymentIntent($amount, 'ron', [
            'customer_id' => $customerId,
            'description' => "Invoice payment: $invoiceId",
            'metadata' => [
                'invoice_id' => $invoiceId,
                'type' => 'invoice_payment'
            ]
        ]);
    }

    /**
     * Create a subscription
     */
    public function createSubscription(string $customerId, string $priceId): array
    {
        $this->ensureConfigured();

        try {
            $subscription = \Stripe\Subscription::create([
                'customer' => $customerId,
                'items' => [['price' => $priceId]],
                'payment_behavior' => 'default_incomplete',
                'expand' => ['latest_invoice.payment_intent']
            ]);

            return [
                'success' => true,
                'subscription_id' => $subscription->id,
                'status' => $subscription->status,
                'client_secret' => $subscription->latest_invoice->payment_intent->client_secret ?? null
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Handle Stripe webhook events
     */
    public function handleWebhook(string $payload, string $sigHeader): array
    {
        $webhookSecret = getenv('STRIPE_WEBHOOK_SECRET') ?: $_ENV['STRIPE_WEBHOOK_SECRET'] ?? null;

        if (!$webhookSecret) {
            return ['success' => false, 'message' => 'Webhook secret not configured'];
        }

        try {
            $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $webhookSecret);

            switch ($event->type) {
                case 'payment_intent.succeeded':
                    return $this->handlePaymentSuccess($event->data->object);

                case 'payment_intent.payment_failed':
                    return $this->handlePaymentFailure($event->data->object);

                case 'invoice.paid':
                    return $this->handleInvoicePaid($event->data->object);

                case 'customer.subscription.updated':
                case 'customer.subscription.deleted':
                    return $this->handleSubscriptionChange($event->data->object);

                default:
                    return ['success' => true, 'message' => "Event {$event->type} received"];
            }
        } catch (\UnexpectedValueException $e) {
            return ['success' => false, 'message' => 'Invalid payload'];
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            return ['success' => false, 'message' => 'Invalid signature'];
        }
    }

    /**
     * Get publishable key for frontend
     */
    public function getPublishableKey(): ?string
    {
        return getenv('STRIPE_PUBLISHABLE_KEY') ?: $_ENV['STRIPE_PUBLISHABLE_KEY'] ?? null;
    }

    // Private helper methods

    private function ensureConfigured(): void
    {
        if (!$this->isConfigured) {
            throw new Exception('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
        }
    }

    private function handlePaymentSuccess($paymentIntent): array
    {
        // TODO: Update payment status in database
        // TODO: Send confirmation email
        return [
            'success' => true,
            'action' => 'payment_succeeded',
            'payment_intent_id' => $paymentIntent->id,
            'amount' => $paymentIntent->amount_received
        ];
    }

    private function handlePaymentFailure($paymentIntent): array
    {
        // TODO: Update payment status in database
        // TODO: Send failure notification
        return [
            'success' => true,
            'action' => 'payment_failed',
            'payment_intent_id' => $paymentIntent->id
        ];
    }

    private function handleInvoicePaid($invoice): array
    {
        // TODO: Mark subscription invoice as paid
        return [
            'success' => true,
            'action' => 'invoice_paid',
            'invoice_id' => $invoice->id
        ];
    }

    private function handleSubscriptionChange($subscription): array
    {
        // TODO: Update subscription status in database
        return [
            'success' => true,
            'action' => 'subscription_updated',
            'subscription_id' => $subscription->id,
            'status' => $subscription->status
        ];
    }
}
