<?php
/**
 * Employees Management Endpoint
 * Handles all CRUD operations for employees
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $authHeader = getHeader('authorization', '');

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id');
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance()->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List employees or get single employee
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            // Get single employee
            $stmt = $db->prepare("
                SELECT e.*, c.display_name, c.email, c.phone
                FROM employees e
                LEFT JOIN contacts c ON e.contact_id = c.id
                WHERE e.id = :id AND e.company_id = :company_id
            ");
            $stmt->execute(['id' => $_GET['id'], 'company_id' => $companyId]);
            $employee = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$employee) {
                throw new Exception('Employee not found');
            }

            echo json_encode([
                'success' => true,
                'data' => $employee
            ]);
        } else {
            // List all employees
            $stmt = $db->prepare("
                SELECT e.*, c.display_name, c.email, c.phone
                FROM employees e
                LEFT JOIN contacts c ON e.contact_id = c.id
                WHERE e.company_id = :company_id
                ORDER BY c.display_name ASC, e.created_at DESC
                LIMIT 200
            ");
            $stmt->execute(['company_id' => $companyId]);
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $employees
            ]);
        }
    }

    // POST - Create new employee
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        // Validation - accept first_name + last_name OR display_name
        if (empty($input['display_name'])) {
            if (!empty($input['first_name']) && !empty($input['last_name'])) {
                $input['display_name'] = trim($input['first_name'] . ' ' . $input['last_name']);
            } elseif (!empty($input['first_name'])) {
                $input['display_name'] = $input['first_name'];
            } else {
                throw new Exception('Employee name is required (provide display_name or first_name)');
            }
        }

        $db->beginTransaction();

        try {
            // First, create or get contact
            $contactId = null;
            if (!empty($input['contact_id'])) {
                $contactId = $input['contact_id'];
            } else {
                // Create new contact for this employee
                $stmt = $db->prepare("
                    INSERT INTO contacts (company_id, contact_type, display_name, email, phone, is_active)
                    VALUES (:company_id, 'employee', :display_name, :email, :phone, true)
                    RETURNING id
                ");
                $stmt->execute([
                    'company_id' => $companyId,
                    'display_name' => $input['display_name'],
                    'email' => $input['email'] ?? null,
                    'phone' => $input['phone'] ?? null
                ]);
                $contactId = $stmt->fetch(PDO::FETCH_ASSOC)['id'];
            }

            // Create employee record
            $stmt = $db->prepare("
                INSERT INTO employees (
                    company_id, contact_id, employee_number, employment_type,
                    department, position_title, hire_date, salary_amount, status
                ) VALUES (
                    :company_id, :contact_id, :employee_number, :employment_type,
                    :department, :position_title, :hire_date, :salary_amount, :status
                )
                RETURNING id
            ");

            $stmt->execute([
                'company_id' => $companyId,
                'contact_id' => $contactId,
                'employee_number' => $input['employee_number'] ?? null,
                'employment_type' => $input['employment_type'] ?? 'full_time',
                'department' => $input['department'] ?? null,
                'position_title' => $input['position_title'] ?? null,
                'hire_date' => $input['hire_date'] ?? date('Y-m-d'),
                'salary_amount' => $input['salary_amount'] ?? null,
                'status' => $input['status'] ?? 'active'
            ]);

            $employeeId = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            $db->commit();

            echo json_encode([
                'success' => true,
                'data' => ['id' => $employeeId],
                'message' => 'Employee created successfully'
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    // PUT - Update employee
    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Employee ID is required');
        }

        $db->beginTransaction();

        try {
            // Update contact info if provided
            if (!empty($input['display_name']) || !empty($input['email']) || !empty($input['phone'])) {
                // Get contact_id first
                $stmt = $db->prepare("SELECT contact_id FROM employees WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $input['id'], 'company_id' => $companyId]);
                $employee = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($employee && $employee['contact_id']) {
                    $contactUpdates = [];
                    $contactParams = ['id' => $employee['contact_id']];

                    if (!empty($input['display_name'])) {
                        $contactUpdates[] = "display_name = :display_name";
                        $contactParams['display_name'] = $input['display_name'];
                    }
                    if (isset($input['email'])) {
                        $contactUpdates[] = "email = :email";
                        $contactParams['email'] = $input['email'];
                    }
                    if (isset($input['phone'])) {
                        $contactUpdates[] = "phone = :phone";
                        $contactParams['phone'] = $input['phone'];
                    }

                    if (!empty($contactUpdates)) {
                        $sql = "UPDATE contacts SET " . implode(', ', $contactUpdates) . " WHERE id = :id";
                        $stmt = $db->prepare($sql);
                        $stmt->execute($contactParams);
                    }
                }
            }

            // Update employee record
            $updates = [];
            $params = ['id' => $input['id'], 'company_id' => $companyId];

            if (isset($input['employee_number'])) {
                $updates[] = "employee_number = :employee_number";
                $params['employee_number'] = $input['employee_number'];
            }
            if (isset($input['employment_type'])) {
                $updates[] = "employment_type = :employment_type";
                $params['employment_type'] = $input['employment_type'];
            }
            if (isset($input['department'])) {
                $updates[] = "department = :department";
                $params['department'] = $input['department'];
            }
            if (isset($input['position_title'])) {
                $updates[] = "position_title = :position_title";
                $params['position_title'] = $input['position_title'];
            }
            if (isset($input['hire_date'])) {
                $updates[] = "hire_date = :hire_date";
                $params['hire_date'] = $input['hire_date'];
            }
            if (isset($input['salary_amount'])) {
                $updates[] = "salary_amount = :salary_amount";
                $params['salary_amount'] = $input['salary_amount'];
            }
            if (isset($input['status'])) {
                $updates[] = "status = :status";
                $params['status'] = $input['status'];
            }

            $updates[] = "updated_at = NOW()";

            if (!empty($updates)) {
                $sql = "UPDATE employees SET " . implode(', ', $updates) . " WHERE id = :id AND company_id = :company_id";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            }

            $db->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Employee updated successfully'
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    // DELETE - Delete employee
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Employee ID is required');
        }

        $stmt = $db->prepare("
            DELETE FROM employees
            WHERE id = :id AND company_id = :company_id
        ");
        $stmt->execute(['id' => $input['id'], 'company_id' => $companyId]);

        echo json_encode([
            'success' => true,
            'message' => 'Employee deleted successfully'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
