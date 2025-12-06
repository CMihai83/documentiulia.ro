<?php
/**
 * Business Intelligence Consultant API
 * POST /api/v1/business/consultant
 *
 * Provides AI-powered business consultation based on Personal MBA framework
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/BusinessIntelligenceService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['question'])) {
        throw new Exception('Business question is required');
    }

    $question = trim($input['question']);
    $userId = $input['user_id'] ?? null;
    $companyId = $input['company_id'] ?? null;

    // Initialize Business Intelligence Service
    $businessAI = new BusinessIntelligenceService();

    // Get consultation response
    $response = $businessAI->consultBusiness($question, $userId, $companyId);

    // Format response
    echo json_encode([
        'success' => true,
        'answer' => $response['answer'],
        'concepts' => $response['concepts'] ?? [],
        'frameworks' => $response['frameworks'] ?? [],
        'confidence' => $response['confidence'] ?? 0.85,
        'source' => $response['source'] ?? 'business-ai'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
