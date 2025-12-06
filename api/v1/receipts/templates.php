<?php
/**
 * Receipt Templates Endpoint
 * GET /api/v1/receipts/templates.php - List all templates
 * DELETE /api/v1/receipts/templates.php?id=xxx - Delete a template
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../helpers/headers.php';

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

    // Get company ID
    $companyId = getHeader('x-company-id') ?? null;
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $database = Database::getInstance();
    $db = $database->getConnection();

    // Handle GET - List templates
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $query = "SELECT
                    id,
                    merchant_name,
                    merchant_pattern,
                    date_pattern,
                    amount_pattern,
                    vat_pattern,
                    usage_count,
                    created_at,
                    updated_at
                  FROM receipt_templates
                  WHERE company_id = :company_id
                  ORDER BY usage_count DESC, merchant_name ASC";

        $stmt = $db->prepare($query);
        $stmt->execute([':company_id' => $companyId]);

        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $templates
        ]);
        exit();
    }

    // Handle DELETE - Remove a template
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $templateId = $_GET['id'] ?? null;

        if (empty($templateId)) {
            throw new Exception('Template ID required');
        }

        $query = "DELETE FROM receipt_templates
                  WHERE id = :id AND company_id = :company_id";

        $stmt = $db->prepare($query);
        $stmt->execute([
            ':id' => $templateId,
            ':company_id' => $companyId
        ]);

        if ($stmt->rowCount() === 0) {
            throw new Exception('Template not found or already deleted');
        }

        echo json_encode([
            'success' => true,
            'message' => 'Template deleted successfully'
        ]);
        exit();
    }

    throw new Exception('Method not allowed');

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
