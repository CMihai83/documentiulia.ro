<?php
/**
 * Epics List API
 * GET /api/v1/epics/list.php - List all epics
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

    $projectId = $_GET['project_id'] ?? null;

    $db = Database::getInstance()->getConnection();

    if ($projectId) {
        $stmt = $db->prepare("
            SELECT
                id,
                project_id,
                name,
                description,
                status,
                priority,
                start_date,
                target_date as end_date,
                color,
                created_at,
                updated_at
            FROM epics
            WHERE company_id = :company_id
            AND project_id = :project_id
            ORDER BY priority DESC, created_at DESC
        ");
        $stmt->execute([
            'company_id' => $companyId,
            'project_id' => $projectId
        ]);
    } else {
        $stmt = $db->prepare("
            SELECT
                id,
                project_id,
                name,
                description,
                status,
                priority,
                start_date,
                target_date as end_date,
                color,
                created_at,
                updated_at
            FROM epics
            WHERE company_id = :company_id
            ORDER BY priority DESC, created_at DESC
        ");
        $stmt->execute(['company_id' => $companyId]);
    }

    $epics = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $epics
    ]);

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
