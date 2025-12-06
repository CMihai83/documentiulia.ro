<?php
/**
 * Get Subscription Invoices API Endpoint
 *
 * GET /api/v1/subscriptions/invoices.php
 *
 * Returns user's billing invoice history
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

// Authenticate - returns user data or exits with 401
$auth = authenticate();
$userId = $auth['user_id'];
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;

$subscriptionService = new SubscriptionService();
$result = $subscriptionService->getUserInvoices($userId, $limit);

http_response_code($result['success'] ? 200 : 500);
echo json_encode($result);
