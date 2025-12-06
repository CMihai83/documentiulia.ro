<?php
/**
 * Create Stripe Checkout Session
 *
 * Endpoints:
 * - POST /create-checkout.php?type=course
 * - POST /create-checkout.php?type=subscription
 * - POST /create-checkout.php?type=invoice
 *
 * @version 1.0.0
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/PaymentService.php';

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

    // Get company from header
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $type = $_GET['type'] ?? $input['type'] ?? null;

        if (!$type) {
            throw new Exception('Payment type required (course, subscription, or invoice)');
        }

        $paymentService = new PaymentService();

        switch ($type) {
            case 'course':
                if (empty($input['course_id'])) {
                    throw new Exception('Course ID required');
                }

                $session = $paymentService->createCourseCheckoutSession(
                    $userData['user_id'],
                    $input['course_id'],
                    $companyId
                );

                echo json_encode([
                    'success' => true,
                    'data' => $session,
                    'message' => 'Checkout session created'
                ]);
                break;

            case 'subscription':
                if (empty($input['plan_id'])) {
                    throw new Exception('Plan ID required');
                }

                $session = $paymentService->createSubscriptionCheckoutSession(
                    $userData['user_id'],
                    $input['plan_id'],
                    $companyId
                );

                echo json_encode([
                    'success' => true,
                    'data' => $session,
                    'message' => 'Subscription checkout created'
                ]);
                break;

            case 'invoice':
                if (empty($input['invoice_id'])) {
                    throw new Exception('Invoice ID required');
                }

                $session = $paymentService->createInvoiceCheckoutSession(
                    $input['invoice_id'],
                    $companyId
                );

                echo json_encode([
                    'success' => true,
                    'data' => $session,
                    'message' => 'Invoice payment link created'
                ]);
                break;

            default:
                throw new Exception('Invalid payment type. Use: course, subscription, or invoice');
        }
    } else {
        throw new Exception('Method not allowed');
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
