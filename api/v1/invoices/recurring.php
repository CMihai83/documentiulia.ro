<?php
/**
 * Recurring Invoices API
 * GET /api/v1/invoices/recurring.php - List all recurring invoices
 * POST /api/v1/invoices/recurring.php - Create recurring invoice
 * PUT /api/v1/invoices/recurring.php - Update recurring invoice
 * DELETE /api/v1/invoices/recurring.php - Delete recurring invoice
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
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            handleGet($db, $companyId);
            break;

        case 'POST':
            handlePost($db, $companyId, $auth['user_id']);
            break;

        case 'PUT':
            handlePut($db, $companyId);
            break;

        case 'DELETE':
            handleDelete($db, $companyId);
            break;

        default:
            throw new Exception('Method not allowed', 405);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function handleGet($db, $companyId) {
    $id = $_GET['id'] ?? null;

    if ($id) {
        // Get single recurring invoice
        $stmt = $db->prepare("
            SELECT
                id,
                user_id,
                subscription_id,
                invoice_id,
                frequency,
                next_invoice_date,
                amount,
                currency,
                is_active,
                created_at
            FROM recurring_invoices
            WHERE id = :id
        ");
        $stmt->execute(['id' => $id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$invoice) {
            throw new Exception('Recurring invoice not found', 404);
        }

        echo json_encode([
            'success' => true,
            'data' => $invoice
        ]);
    } else {
        // List all recurring invoices
        $status = $_GET['status'] ?? null;

        $sql = "
            SELECT
                ri.id,
                ri.user_id,
                u.email as user_email,
                u.first_name,
                u.last_name,
                ri.frequency,
                ri.next_invoice_date,
                ri.amount,
                ri.currency,
                ri.is_active,
                ri.created_at
            FROM recurring_invoices ri
            LEFT JOIN users u ON ri.user_id = u.id
            WHERE 1=1
        ";

        $params = [];

        if ($status === 'active') {
            $sql .= " AND ri.is_active = true";
        } elseif ($status === 'inactive') {
            $sql .= " AND ri.is_active = false";
        }

        $sql .= " ORDER BY ri.next_invoice_date ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $invoices,
            'count' => count($invoices)
        ]);
    }
}

function handlePost($db, $companyId, $userId) {
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    $required = ['frequency', 'amount', 'next_invoice_date'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            throw new Exception("Missing required field: {$field}", 400);
        }
    }

    $stmt = $db->prepare("
        INSERT INTO recurring_invoices (
            user_id,
            subscription_id,
            invoice_id,
            frequency,
            next_invoice_date,
            amount,
            currency,
            is_active,
            created_at
        ) VALUES (
            :user_id,
            :subscription_id,
            :invoice_id,
            :frequency,
            :next_invoice_date,
            :amount,
            :currency,
            :is_active,
            NOW()
        )
        RETURNING id
    ");

    $stmt->execute([
        'user_id' => $userId,
        'subscription_id' => $input['subscription_id'] ?? null,
        'invoice_id' => $input['invoice_id'] ?? null,
        'frequency' => $input['frequency'],
        'next_invoice_date' => $input['next_invoice_date'],
        'amount' => $input['amount'],
        'currency' => $input['currency'] ?? 'EUR',
        'is_active' => $input['is_active'] ?? true
    ]);

    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $result['id']
        ],
        'message' => 'Recurring invoice created successfully'
    ]);
}

function handlePut($db, $companyId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        throw new Exception('Invoice ID is required', 400);
    }

    $fields = [];
    $params = ['id' => $input['id']];

    // Build dynamic update query
    $allowedFields = ['frequency', 'next_invoice_date', 'amount', 'currency', 'is_active'];

    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $fields[] = "$field = :" . $field;
            $params[$field] = $input[$field];
        }
    }

    if (empty($fields)) {
        throw new Exception('No fields to update', 400);
    }

    $sql = "UPDATE recurring_invoices SET " . implode(', ', $fields) . "
            WHERE id = :id";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        throw new Exception('Recurring invoice not found or not updated', 404);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Recurring invoice updated successfully'
    ]);
}

function handleDelete($db, $companyId) {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        throw new Exception('Invoice ID is required', 400);
    }

    $stmt = $db->prepare("
        DELETE FROM recurring_invoices
        WHERE id = :id
    ");

    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() === 0) {
        throw new Exception('Recurring invoice not found', 404);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Recurring invoice deleted successfully'
    ]);
}
