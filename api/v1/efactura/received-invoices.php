<?php
/**
 * e-Factura Received Invoices List Endpoint
 * Returns list of invoices received from suppliers
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/DatabaseService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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

    // Get received invoices
    $stmt = $pdo->prepare("
        SELECT
            id,
            cif,
            seller_name,
            invoice_number,
            invoice_date,
            total_amount,
            currency,
            download_id,
            xml_file_path,
            matched_purchase_order_id,
            match_confidence,
            auto_matched,
            created_at
        FROM efactura_received_invoices
        WHERE company_id = ?
        ORDER BY invoice_date DESC, created_at DESC
    ");
    $stmt->execute([$companyId]);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'invoices' => $invoices,
        'total' => count($invoices)
    ]);

} catch (Exception $e) {
    error_log("e-Factura Received Invoices Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load received invoices',
        'error' => $e->getMessage()
    ]);
}
