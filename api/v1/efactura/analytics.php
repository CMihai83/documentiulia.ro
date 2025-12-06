<?php
/**
 * e-Factura Analytics Endpoint
 * Returns usage analytics and statistics
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../services/DatabaseService.php';
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../../includes/services/efactura/EFacturaService.php';

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
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company from header or query parameter
    $companyId = getHeader('x-company-id') ?? $_GET['company_id'] ?? null;
    $period = $_GET['period'] ?? 30;

    if (!$companyId) {
        throw new Exception('Company ID is required');
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

    // Initialize service
    $service = new \DocumentIulia\Services\EFactura\EFacturaService($pdo);

    // Get analytics
    $analytics = $service->getAnalytics($companyId, [
        'period' => intval($period)
    ]);

    echo json_encode([
        'success' => true,
        'analytics' => $analytics,
        'period_days' => intval($period)
    ]);

} catch (Exception $e) {
    error_log("e-Factura Analytics Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to get analytics',
        'error' => $e->getMessage()
    ]);
}
