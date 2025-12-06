<?php
/**
 * Employees List API
 * GET /api/v1/hr/employees/list.php - List all employees
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
            e.id,
            e.employee_number,
            e.contact_id,
            e.employment_type,
            e.department,
            e.position_title,
            e.hire_date,
            e.salary_amount,
            e.status,
            e.created_at,
            e.updated_at,
            c.display_name,
            c.email,
            c.phone
        FROM employees e
        LEFT JOIN contacts c ON e.contact_id = c.id
        WHERE e.company_id = :company_id
        ORDER BY c.display_name ASC
    ");

    $stmt->execute(['company_id' => $companyId]);
    $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $employees
    ]);

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
