<?php
/**
 * Contacts/CRM Management API
 * Full CRUD operations for managing customers, vendors, leads, and partners
 *
 * Endpoints:
 * GET    /api/v1/crm/contacts.php           - List all contacts
 * GET    /api/v1/crm/contacts.php?id=xxx    - Get single contact
 * POST   /api/v1/crm/contacts.php           - Create new contact
 * PUT    /api/v1/crm/contacts.php           - Update contact
 * DELETE /api/v1/crm/contacts.php           - Delete contact
 *
 * Query Parameters for GET (list):
 * - type: Filter by contact type (customer, vendor, lead, partner)
 * - search: Search in display_name, email, phone
 * - is_active: Filter by active status (true/false)
 * - limit: Number of results (default: 100, max: 500)
 * - offset: Pagination offset
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
    // Authenticate
    $authHeader = getHeader('authorization', '');

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company ID
    $companyId = getHeader('x-company-id');
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance()->getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List contacts or get single contact
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            // Get single contact
            $stmt = $db->prepare("
                SELECT
                    c.*,
                    COUNT(DISTINCT i.id) as invoice_count,
                    COUNT(DISTINCT b.id) as bill_count,
                    COUNT(DISTINCT o.id) as opportunity_count,
                    SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END) as total_revenue
                FROM contacts c
                LEFT JOIN invoices i ON c.id = i.customer_id
                LEFT JOIN bills b ON c.id = b.vendor_id
                LEFT JOIN opportunities o ON c.id = o.contact_id
                WHERE c.id = :id AND c.company_id = :company_id
                GROUP BY c.id
            ");
            $stmt->execute(['id' => $_GET['id'], 'company_id' => $companyId]);
            $contact = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$contact) {
                throw new Exception('Contact not found');
            }

            echo json_encode([
                'success' => true,
                'data' => $contact
            ]);
        } else {
            // List contacts with filters
            $conditions = ['c.company_id = :company_id'];
            $params = ['company_id' => $companyId];

            // Filter by type
            if (!empty($_GET['type'])) {
                $conditions[] = 'c.contact_type = :type';
                $params['type'] = $_GET['type'];
            }

            // Filter by active status
            if (isset($_GET['is_active'])) {
                $conditions[] = 'c.is_active = :is_active';
                $params['is_active'] = $_GET['is_active'] === 'true' || $_GET['is_active'] === '1';
            }

            // Search
            if (!empty($_GET['search'])) {
                $conditions[] = '(c.display_name ILIKE :search OR c.email ILIKE :search OR c.phone ILIKE :search)';
                $params['search'] = '%' . $_GET['search'] . '%';
            }

            // Pagination
            $limit = min((int)($_GET['limit'] ?? 100), 500);
            $offset = (int)($_GET['offset'] ?? 0);

            $whereClause = implode(' AND ', $conditions);

            $stmt = $db->prepare("
                SELECT
                    c.*,
                    COUNT(DISTINCT i.id) as invoice_count,
                    COUNT(DISTINCT b.id) as bill_count,
                    COUNT(DISTINCT o.id) as opportunity_count,
                    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as total_revenue
                FROM contacts c
                LEFT JOIN invoices i ON c.id = i.customer_id
                LEFT JOIN bills b ON c.id = b.vendor_id
                LEFT JOIN opportunities o ON c.id = o.contact_id
                WHERE $whereClause
                GROUP BY c.id
                ORDER BY c.created_at DESC
                LIMIT :limit OFFSET :offset
            ");

            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue('offset', $offset, PDO::PARAM_INT);

            $stmt->execute();
            $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count
            $countStmt = $db->prepare("SELECT COUNT(*) FROM contacts c WHERE $whereClause");
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $totalCount = $countStmt->fetchColumn();

            echo json_encode([
                'success' => true,
                'data' => $contacts,
                'pagination' => [
                    'total' => (int)$totalCount,
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => ($offset + $limit) < $totalCount
                ]
            ]);
        }
    }

    // POST - Create new contact
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        // Validation
        if (empty($input['display_name'])) {
            throw new Exception('Display name is required');
        }

        if (empty($input['contact_type'])) {
            $input['contact_type'] = 'customer'; // Default
        }

        // Validate contact type
        $validTypes = ['customer', 'vendor', 'lead', 'partner', 'employee'];
        if (!in_array($input['contact_type'], $validTypes)) {
            throw new Exception('Invalid contact type. Must be one of: ' . implode(', ', $validTypes));
        }

        // Validate email format if provided
        if (!empty($input['email']) && !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format');
        }

        $stmt = $db->prepare("
            INSERT INTO contacts (
                company_id, contact_type, display_name, email, phone,
                payment_terms, currency, is_active
            ) VALUES (
                :company_id, :contact_type, :display_name, :email, :phone,
                :payment_terms, :currency, :is_active
            )
            RETURNING id, display_name, contact_type, email, phone, created_at
        ");

        $stmt->execute([
            'company_id' => $companyId,
            'contact_type' => $input['contact_type'],
            'display_name' => $input['display_name'],
            'email' => $input['email'] ?? null,
            'phone' => $input['phone'] ?? null,
            'payment_terms' => $input['payment_terms'] ?? 30,
            'currency' => $input['currency'] ?? 'RON',
            'is_active' => $input['is_active'] ?? true
        ]);

        $contact = $stmt->fetch(PDO::FETCH_ASSOC);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Contact created successfully',
            'data' => $contact
        ]);
    }

    // PUT - Update contact
    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Contact ID is required');
        }

        // Verify contact exists and belongs to company
        $checkStmt = $db->prepare("SELECT id FROM contacts WHERE id = :id AND company_id = :company_id");
        $checkStmt->execute(['id' => $input['id'], 'company_id' => $companyId]);
        if (!$checkStmt->fetch()) {
            throw new Exception('Contact not found or access denied');
        }

        // Build update query dynamically
        $updates = [];
        $params = ['id' => $input['id'], 'company_id' => $companyId];

        $allowedFields = [
            'display_name', 'email', 'phone', 'contact_type',
            'payment_terms', 'currency', 'is_active'
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                // Validate email if provided
                if ($field === 'email' && !empty($input[$field])) {
                    if (!filter_var($input[$field], FILTER_VALIDATE_EMAIL)) {
                        throw new Exception('Invalid email format');
                    }
                }

                // Validate contact type if provided
                if ($field === 'contact_type' && !empty($input[$field])) {
                    $validTypes = ['customer', 'vendor', 'lead', 'partner', 'employee'];
                    if (!in_array($input[$field], $validTypes)) {
                        throw new Exception('Invalid contact type');
                    }
                }

                $updates[] = "$field = :$field";
                $params[$field] = $input[$field];
            }
        }

        if (empty($updates)) {
            throw new Exception('No fields to update');
        }

        $updates[] = 'updated_at = NOW()';
        $updateSql = implode(', ', $updates);

        $stmt = $db->prepare("
            UPDATE contacts
            SET $updateSql
            WHERE id = :id AND company_id = :company_id
            RETURNING id, display_name, contact_type, email, phone, updated_at
        ");

        $stmt->execute($params);
        $contact = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'message' => 'Contact updated successfully',
            'data' => $contact
        ]);
    }

    // DELETE - Delete contact
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Contact ID is required');
        }

        // Check if contact has related records
        $checkStmt = $db->prepare("
            SELECT
                (SELECT COUNT(*) FROM invoices WHERE customer_id = :id) as invoice_count,
                (SELECT COUNT(*) FROM bills WHERE vendor_id = :id) as bill_count,
                (SELECT COUNT(*) FROM opportunities WHERE contact_id = :id) as opportunity_count
        ");
        $checkStmt->execute(['id' => $input['id']]);
        $related = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($related['invoice_count'] > 0 || $related['bill_count'] > 0 || $related['opportunity_count'] > 0) {
            // Soft delete by marking as inactive instead of hard delete
            $stmt = $db->prepare("
                UPDATE contacts
                SET is_active = false, updated_at = NOW()
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $input['id'], 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message' => 'Contact has related records and was marked as inactive instead of deleted',
                'soft_delete' => true
            ]);
        } else {
            // Hard delete if no related records
            $stmt = $db->prepare("DELETE FROM contacts WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $input['id'], 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message' => 'Contact deleted successfully'
            ]);
        }
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
