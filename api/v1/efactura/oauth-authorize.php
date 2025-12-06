<?php
/**
 * e-Factura OAuth Authorization Endpoint
 * Initiates OAuth 2.0 authorization flow with ANAF
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../services/DatabaseService.php';
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../../includes/services/efactura/EFacturaOAuthClient.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST
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

    // Get request data
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

    // Verify user has access to this company
    $stmt = $pdo->prepare("
        SELECT cu.* FROM company_users cu
        WHERE cu.company_id = ? AND cu.user_id = ?
    ");
    $stmt->execute([$companyId, $userData['id']]);
    $companyAccess = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$companyAccess) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied to this company']);
        exit();
    }

    // Initialize OAuth client
    $oauthClient = new \DocumentIulia\Services\EFactura\EFacturaOAuthClient($pdo);

    // Get authorization URL
    $result = $oauthClient->getAuthorizationUrl($companyId);

    // Return URL for redirect
    echo json_encode([
        'success' => true,
        'authorization_url' => $result['url'],
        'state' => $result['state'],
        'message' => 'Please authorize DocumentIulia to access ANAF e-Factura'
    ]);

} catch (Exception $e) {
    error_log("e-Factura OAuth Authorize Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to initiate OAuth flow',
        'error' => $e->getMessage()
    ]);
}
