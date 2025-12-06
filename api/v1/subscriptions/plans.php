<?php
/**
 * Get Subscription Plans API Endpoint
 *
 * GET /api/v1/subscriptions/plans.php
 *
 * Returns all active subscription plans with features and pricing
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

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

$subscriptionService = new SubscriptionService();
$result = $subscriptionService->getActivePlans();

http_response_code($result['success'] ? 200 : 500);
echo json_encode($result);
