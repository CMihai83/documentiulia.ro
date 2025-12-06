<?php
/**
 * Journal Entries List API
 * GET /api/v1/accounting/journal-entries/list.php - List all journal entries
 */

require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../middleware/auth.php';
require_once __DIR__ . '/../../../config/database.php';

header('Content-Type: application/json');

try {
    $auth = authenticate();
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    $db = Database::getInstance()->getConnection();

    $stmt = $db->prepare("
        SELECT
            je.id,
            je.entry_date,
            je.reference as reference_number,
            je.description,
            COALESCE(SUM(CASE WHEN jel.debit > 0 THEN jel.debit ELSE 0 END), 0) as total_debit,
            COALESCE(SUM(CASE WHEN jel.credit > 0 THEN jel.credit ELSE 0 END), 0) as total_credit,
            je.status,
            je.created_by,
            je.created_at,
            je.updated_at
        FROM journal_entries je
        LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
        WHERE je.company_id = :company_id
        GROUP BY je.id, je.entry_date, je.reference, je.description, je.status, je.created_by, je.created_at, je.updated_at
        ORDER BY je.entry_date DESC, je.created_at DESC
        LIMIT 100
    ");

    $stmt->execute(['company_id' => $companyId]);
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $entries
    ]);

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
