<?php
/**
 * e-Factura OAuth Disconnect Endpoint
 * Removes OAuth tokens for a company
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../services/DatabaseService.php';
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';

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
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $input = json_decode(file_get_contents('php://input'), true);
    $companyId = getHeader('x-company-id') ?? $input['company_id'] ?? null;

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Company ID is required']);
        exit();
    }

    // Get database connection
    $db = DatabaseService::getInstance();
    $pdo = $db->getConnection();

    // Verify user has access to company
    $stmt = $pdo->prepare("
        SELECT 1 FROM company_users
        WHERE company_id = ? AND user_id = ?
    ");
    $stmt->execute([$companyId, $userData['id']]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        throw new Exception('Access denied to this company');
    }

    // Delete OAuth tokens
    $stmt = $pdo->prepare("
        DELETE FROM efactura_oauth_tokens
        WHERE company_id = ?
    ");
    $stmt->execute([$companyId]);

    // Log the disconnection
    $stmt = $pdo->prepare("
        INSERT INTO efactura_sync_log (company_id, operation, status, message)
        VALUES (?, 'oauth_disconnect', 'success', 'OAuth tokens removed by user')
    ");
    $stmt->execute([$companyId]);

    echo json_encode([
        'success' => true,
        'message' => 'Successfully disconnected from ANAF e-Factura'
    ]);

} catch (Exception $e) {
    error_log("e-Factura OAuth Disconnect Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to disconnect',
        'error' => $e->getMessage()
    ]);
}
