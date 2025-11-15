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
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../../config/database.php';
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
    // Get parameters
    $userId = $_GET['user_id'] ?? null;
    $companyId = $_GET['company_id'] ?? null;

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
