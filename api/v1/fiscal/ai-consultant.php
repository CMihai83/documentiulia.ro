<?php
/**
 * AI Fiscal Consultant Endpoint
 * POST /api/v1/fiscal/ai-consultant
 *
 * Provides AI-powered fiscal consultation with access to Romanian fiscal legislation
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/FiscalAIService.php';

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
        throw new Exception('Întrebarea este obligatorie');
    }

    $question = trim($input['question']);

    // Get user context if authenticated (from header or session)
    $userId = null;
    $companyId = null;

    // Check for Authorization header (JWT token)
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        // Extract user from JWT (implement JWT validation here)
        // For now, accept user_id from request body for testing
        $userId = $input['user_id'] ?? null;
        $companyId = $input['company_id'] ?? null;
    } else {
        // Fallback: Accept from request body (for testing/demo)
        $userId = $input['user_id'] ?? null;
        $companyId = $input['company_id'] ?? null;
    }

    // Initialize AI service
    $fiscalAI = new FiscalAIService();

    // Get AI response with context awareness
    $response = $fiscalAI->consultFiscalQuestion($question, $userId, $companyId);

    // Build response
    $output = [
        'success' => true,
        'answer' => $response['answer'],
        'references' => $response['references'] ?? [],
        'confidence' => $response['confidence'] ?? 0.9,
        'source' => $response['source'] ?? 'fiscal-genius',
        'context_used' => $response['context_used'] ?? false
    ];

    // Add strategic recommendations if available
    if (!empty($response['strategic_recommendations'])) {
        $output['strategic_recommendations'] = $response['strategic_recommendations'];
    }

    // Add MBA frameworks if applied
    if (!empty($response['mba_frameworks_applied'])) {
        $output['mba_frameworks_applied'] = $response['mba_frameworks_applied'];
    }

    echo json_encode($output);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
