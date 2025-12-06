<?php
/**
 * e-Factura Download Received Invoices Endpoint
 * Downloads invoices received from suppliers via ANAF
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../services/DatabaseService.php';
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../../includes/services/efactura/EFacturaService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

    // Get parameters
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $companyId = getHeader('x-company-id') ?? $input['company_id'] ?? null;
        $days = $input['days'] ?? 60;
    } else {
        $companyId = getHeader('x-company-id') ?? $_GET['company_id'] ?? null;
        $days = $_GET['days'] ?? 60;
    }

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Company ID is required']);
        exit();
    }

    // Get database connection
    $db = DatabaseService::getInstance();
    $pdo = $db->getConnection();

    // Verify access
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

    // Download received invoices
    $result = $service->downloadReceivedInvoices($companyId, [
        'days' => intval($days)
    ]);

    echo json_encode($result);

} catch (Exception $e) {
    error_log("e-Factura Download Received Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Download failed',
        'error' => $e->getMessage()
    ]);
}
