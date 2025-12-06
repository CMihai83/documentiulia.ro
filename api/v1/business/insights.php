<?php
/**
 * Business Insights API
 * GET /api/v1/business/insights
 *
 * Generates AI-powered insights based on business metrics
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../services/BusinessIntelligenceService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Authenticate and get user_id from JWT
    $authHeader = getHeader('authorization', '') ?? '';
    $userId = null;
    if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $auth = new AuthService();
        $userData = $auth->verifyToken($matches[1]);
        $userId = $userData['user_id'] ?? null;
    }

    // Fall back to query param
    if (!$userId) {
        $userId = $_GET['user_id'] ?? null;
    }

    $companyId = getHeader('x-company-id') ?? $_GET['company_id'] ?? null;

    if (!$userId) {
        throw new Exception('User ID is required');
    }

    // Initialize Business Intelligence Service
    $businessAI = new BusinessIntelligenceService();

    // Generate insights
    $response = $businessAI->generateInsights($userId, $companyId);

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
