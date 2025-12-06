<?php
/**
 * Payments Management Endpoint
 * Handles all CRUD operations for payments
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

    // GET - List payments or get single payment
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            // Get single payment
            $stmt = $db->prepare("
                SELECT p.*, c.display_name as contact_name
                FROM payments p
                LEFT JOIN contacts c ON p.contact_id = c.id
                WHERE p.id = :id AND p.company_id = :company_id
            ");
            $stmt->execute(['id' => $_GET['id'], 'company_id' => $companyId]);
            $payment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$payment) {
                throw new Exception('Payment not found');
            }

            echo json_encode([
                'success' => true,
                'data' => $payment
            ]);
        } else {
            // List all payments
            $stmt = $db->prepare("
                SELECT p.*, c.display_name as contact_name
                FROM payments p
                LEFT JOIN contacts c ON p.contact_id = c.id
                WHERE p.company_id = :company_id
                ORDER BY p.payment_date DESC, p.created_at DESC
                LIMIT 200
            ");
            $stmt->execute(['company_id' => $companyId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $payments
            ]);
        }
    }

    // POST - Create new payment
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        // Accept 'type' as alias for 'payment_type'
        if (isset($input['type']) && !isset($input['payment_type'])) {
            $input['payment_type'] = $input['type'];
        }

        // Validation
        if (empty($input['payment_type'])) {
            throw new Exception('Payment type is required');
        }
        if (empty($input['payment_date'])) {
            throw new Exception('Payment date is required');
        }
        if (empty($input['amount'])) {
            throw new Exception('Amount is required');
        }

        // Create payment record
        $stmt = $db->prepare("
            INSERT INTO payments (
                company_id, payment_type, payment_date, amount, currency,
                reference_number, contact_id, status
            ) VALUES (
                :company_id, :payment_type, :payment_date, :amount, :currency,
                :reference_number, :contact_id, :status
            )
            RETURNING id
        ");

        $stmt->execute([
            'company_id' => $companyId,
            'payment_type' => $input['payment_type'],
            'payment_date' => $input['payment_date'],
            'amount' => $input['amount'],
            'currency' => $input['currency'] ?? 'RON',
            'reference_number' => $input['reference_number'] ?? null,
            'contact_id' => $input['contact_id'] ?? null,
            'status' => $input['status'] ?? 'completed'
        ]);

        $paymentId = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

        echo json_encode([
            'success' => true,
            'data' => ['id' => $paymentId],
            'message' => 'Payment created successfully'
        ]);
    }

    // PUT - Update payment
    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Payment ID is required');
        }

        // Build update query dynamically
        $updates = [];
        $params = ['id' => $input['id'], 'company_id' => $companyId];

        if (isset($input['payment_type'])) {
            $updates[] = "payment_type = :payment_type";
            $params['payment_type'] = $input['payment_type'];
        }
        if (isset($input['payment_date'])) {
            $updates[] = "payment_date = :payment_date";
            $params['payment_date'] = $input['payment_date'];
        }
        if (isset($input['amount'])) {
            $updates[] = "amount = :amount";
            $params['amount'] = $input['amount'];
        }
        if (isset($input['currency'])) {
            $updates[] = "currency = :currency";
            $params['currency'] = $input['currency'];
        }
        if (isset($input['reference_number'])) {
            $updates[] = "reference_number = :reference_number";
            $params['reference_number'] = $input['reference_number'];
        }
        if (isset($input['contact_id'])) {
            $updates[] = "contact_id = :contact_id";
            $params['contact_id'] = $input['contact_id'];
        }
        if (isset($input['status'])) {
            $updates[] = "status = :status";
            $params['status'] = $input['status'];
        }

        $updates[] = "updated_at = NOW()";

        if (!empty($updates)) {
            $sql = "UPDATE payments SET " . implode(', ', $updates) . " WHERE id = :id AND company_id = :company_id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message' => 'Payment updated successfully'
            ]);
        } else {
            throw new Exception('No fields to update');
        }
    }

    // DELETE - Delete payment
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Payment ID is required');
        }

        $stmt = $db->prepare("
            DELETE FROM payments
            WHERE id = :id AND company_id = :company_id
        ");
        $stmt->execute(['id' => $input['id'], 'company_id' => $companyId]);

        echo json_encode([
            'success' => true,
            'message' => 'Payment deleted successfully'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
