<?php
/**
 * Recurring Invoice Management API
 * Handles recurring invoice patterns and automatic generation
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // List recurring invoice templates
            $status = $_GET['status'] ?? 'active';
            $stmt = $db->prepare("
                SELECT
                    ri.*,
                    c.name as customer_name,
                    c.email as customer_email,
                    (SELECT COUNT(*) FROM invoices WHERE recurring_id = ri.id) as invoices_generated
                FROM recurring_invoices ri
                LEFT JOIN contacts c ON c.id = ri.customer_id
                WHERE ri.company_id = :company_id
                AND (:status = 'all' OR ri.status = :status)
                ORDER BY ri.next_date ASC
            ");
            $stmt->execute(['company_id' => $companyId, 'status' => $status]);
            $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $templates,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            // Validate required fields
            $required = ['customer_id', 'frequency', 'start_date', 'items'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
                    exit;
                }
            }

            // Validate frequency
            $validFrequencies = ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'];
            if (!in_array($input['frequency'], $validFrequencies)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid frequency']);
                exit;
            }

            // Calculate next date
            $nextDate = calculateNextDate($input['start_date'], $input['frequency']);

            $stmt = $db->prepare("
                INSERT INTO recurring_invoices (
                    id, company_id, customer_id, frequency, start_date, next_date, end_date,
                    items, payment_terms, notes, status, created_by, created_at
                ) VALUES (
                    :id, :company_id, :customer_id, :frequency, :start_date, :next_date, :end_date,
                    :items, :payment_terms, :notes, 'active', :created_by, NOW()
                )
                RETURNING *
            ");

            $id = generateUUID();
            $stmt->execute([
                'id' => $id,
                'company_id' => $companyId,
                'customer_id' => $input['customer_id'],
                'frequency' => $input['frequency'],
                'start_date' => $input['start_date'],
                'next_date' => $nextDate,
                'end_date' => $input['end_date'] ?? null,
                'items' => json_encode($input['items']),
                'payment_terms' => $input['payment_terms'] ?? 30,
                'notes' => $input['notes'] ?? null,
                'created_by' => $user['id'],
            ]);

            $template = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $template,
                'message_ro' => 'Factură recurentă creată cu succes',
                'message_en' => 'Recurring invoice created successfully',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? $_GET['id'] ?? null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID required']);
                exit;
            }

            $updates = [];
            $params = ['id' => $id, 'company_id' => $companyId];

            $allowedFields = ['customer_id', 'frequency', 'next_date', 'end_date', 'items', 'payment_terms', 'notes', 'status'];
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $value = $field === 'items' ? json_encode($input[$field]) : $input[$field];
                    $updates[] = "$field = :$field";
                    $params[$field] = $value;
                }
            }

            if (empty($updates)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE recurring_invoices SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = :id AND company_id = :company_id RETURNING *";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $template,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ID required']);
                exit;
            }

            $stmt = $db->prepare("
                UPDATE recurring_invoices
                SET status = 'cancelled', updated_at = NOW()
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $id, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Factură recurentă anulată',
                'message_en' => 'Recurring invoice cancelled',
            ]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

// Helper functions
function calculateNextDate(string $startDate, string $frequency): string {
    $date = new DateTime($startDate);
    $now = new DateTime();

    // If start date is in the past, calculate next occurrence
    while ($date < $now) {
        switch ($frequency) {
            case 'weekly':
                $date->modify('+1 week');
                break;
            case 'bi-weekly':
                $date->modify('+2 weeks');
                break;
            case 'monthly':
                $date->modify('+1 month');
                break;
            case 'quarterly':
                $date->modify('+3 months');
                break;
            case 'semi-annual':
                $date->modify('+6 months');
                break;
            case 'annual':
                $date->modify('+1 year');
                break;
        }
    }

    return $date->format('Y-m-d');
}

function generateUUID(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
