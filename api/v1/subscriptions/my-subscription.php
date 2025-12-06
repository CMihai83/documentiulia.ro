<?php
/**
 * Get My Subscription API Endpoint
 *
 * GET /api/v1/subscriptions/my-subscription.php
 *
 * Returns user's current active subscription with usage stats
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/SubscriptionService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$auth = authenticate();
if (!$auth['valid']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => $auth['message']]);
    exit();
}

$userId = $auth['user_id'];
$subscriptionService = new SubscriptionService();

// Get current subscription
$subscription = $subscriptionService->getUserSubscription($userId);

// Get usage stats
$usage = $subscriptionService->getUsageStats($userId);

http_response_code(200);
echo json_encode([
    'success' => true,
    'subscription' => $subscription,
    'usage' => $usage
]);
