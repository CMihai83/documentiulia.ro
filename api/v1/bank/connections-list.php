<?php
/**
 * Bank Connections List (Simplified)
 * GET /api/v1/bank/connections-list.php - List bank connections
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    $auth = authenticate();
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    $sql = "SELECT
        id,
        company_id,
        user_id,
        provider,
        institution_id,
        institution_name,
        institution_logo_url,
        account_id,
        account_name,
        account_number,
        currency,
        account_type,
        status,
        last_sync_at,
        last_sync_status,
        sync_error_message,
        consent_expires_at,
        created_at,
        updated_at
    FROM bank_connections
    WHERE company_id = :company_id";

    $params = ['company_id' => $companyId];

    if (!empty($_GET['status'])) {
        $sql .= " AND status = :status";
        $params['status'] = $_GET['status'];
    }

    $sql .= " ORDER BY created_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $connections,
        'count' => count($connections)
    ]);

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
