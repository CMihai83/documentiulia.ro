<?php
/**
 * Generate Recurring Transaction API
 * POST - Manually trigger generation of next occurrence
 * Also used by cron job for automatic generation
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

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

$input = json_decode(file_get_contents('php://input'), true);
$recurringId = $input['recurring_id'] ?? $_GET['id'] ?? null;
$generateAll = $input['generate_all'] ?? false;

try {
    $db = getDbConnection();
    
    if ($generateAll) {
        // Generate all due recurring transactions
        $stmt = $db->prepare("
            SELECT * FROM recurring_transactions
            WHERE company_id = :company_id
              AND status = 'active'
              AND next_date <= CURDATE()
              AND (end_date IS NULL OR end_date >= CURDATE())
        ");
        $stmt->execute(['company_id' => $companyId]);
        $dueRecurrings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } elseif ($recurringId) {
        // Generate specific recurring
        $stmt = $db->prepare("
            SELECT * FROM recurring_transactions
            WHERE id = :id AND company_id = :company_id AND status = 'active'
        ");
        $stmt->execute(['id' => $recurringId, 'company_id' => $companyId]);
        $dueRecurrings = [$stmt->fetch(PDO::FETCH_ASSOC)];
        
        if (!$dueRecurrings[0]) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Recurring transaction not found or inactive']);
            exit;
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'recurring_id or generate_all required']);
        exit;
    }
    
    $generated = [];
    $errors = [];
    
    foreach ($dueRecurrings as $recurring) {
        if (!$recurring) continue;
        
        try {
            $result = generateTransaction($db, $recurring, $companyId, $user['user_id']);
            $generated[] = $result;
            
            // Update next occurrence date
            $nextDate = calculateNextOccurrence(new DateTime($recurring['next_date']), $recurring['frequency']);
            
            // Check if recurring should be completed
            $status = 'active';
            if ($recurring['end_date'] && $nextDate > new DateTime($recurring['end_date'])) {
                $status = 'completed';
            }
            
            $updateStmt = $db->prepare("
                UPDATE recurring_transactions 
                SET next_date = :next_date, 
                    status = :status,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $updateStmt->execute([
                'next_date' => $nextDate->format('Y-m-d'),
                'status' => $status,
                'id' => $recurring['id'],
            ]);
            
            // Record in history
            $historyStmt = $db->prepare("
                INSERT INTO recurring_history (
                    id, recurring_id, generated_id, generated_type, generated_at, generated_by
                ) VALUES (
                    :id, :recurring_id, :generated_id, :type, NOW(), :generated_by
                )
            ");
            $historyStmt->execute([
                'id' => 'rh_' . bin2hex(random_bytes(8)),
                'recurring_id' => $recurring['id'],
                'generated_id' => $result['id'],
                'type' => $recurring['type'],
                'generated_by' => $user['user_id'],
            ]);
            
        } catch (Exception $e) {
            $errors[] = [
                'recurring_id' => $recurring['id'],
                'name' => $recurring['name'],
                'error' => $e->getMessage(),
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'message_ro' => count($generated) . ' tranzacție(i) generată(e) cu succes',
        'message_en' => count($generated) . ' transaction(s) generated successfully',
        'data' => [
            'generated' => $generated,
            'errors' => $errors,
            'total_generated' => count($generated),
            'total_errors' => count($errors),
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function generateTransaction($db, $recurring, $companyId, $userId) {
    $newId = substr($recurring['type'], 0, 3) . '_' . bin2hex(random_bytes(12));
    $lineItems = json_decode($recurring['line_items'] ?? '[]', true);
    
    switch ($recurring['type']) {
        case 'invoice':
            // Generate invoice
            $stmt = $db->prepare("
                INSERT INTO invoices (
                    id, company_id, customer_id, invoice_number, 
                    issue_date, due_date, subtotal, vat_amount, total,
                    currency, status, notes, recurring_id, created_by, created_at
                ) VALUES (
                    :id, :company_id, :customer_id, :invoice_number,
                    CURDATE(), DATE_ADD(CURDATE(), INTERVAL :payment_terms DAY),
                    :subtotal, :vat_amount, :total,
                    :currency, 'draft', :notes, :recurring_id, :created_by, NOW()
                )
            ");
            
            $vatAmount = $recurring['amount'] * ($recurring['vat_rate'] / 100);
            $total = $recurring['amount'] + $vatAmount;
            
            $stmt->execute([
                'id' => $newId,
                'company_id' => $companyId,
                'customer_id' => $recurring['customer_id'],
                'invoice_number' => generateInvoiceNumber($db, $companyId),
                'payment_terms' => $recurring['payment_terms'] ?? 30,
                'subtotal' => $recurring['amount'],
                'vat_amount' => $vatAmount,
                'total' => $total,
                'currency' => $recurring['currency'] ?? 'RON',
                'notes' => $recurring['notes'],
                'recurring_id' => $recurring['id'],
                'created_by' => $userId,
            ]);
            
            return [
                'id' => $newId,
                'type' => 'invoice',
                'amount' => $total,
                'currency' => $recurring['currency'] ?? 'RON',
            ];
            
        case 'expense':
            // Generate expense
            $stmt = $db->prepare("
                INSERT INTO expenses (
                    id, company_id, category_id, description,
                    amount, currency, expense_date, 
                    status, recurring_id, created_by, created_at
                ) VALUES (
                    :id, :company_id, :category_id, :description,
                    :amount, :currency, CURDATE(),
                    'pending', :recurring_id, :created_by, NOW()
                )
            ");
            
            $stmt->execute([
                'id' => $newId,
                'company_id' => $companyId,
                'category_id' => $recurring['category_id'],
                'description' => $recurring['name'],
                'amount' => $recurring['amount'],
                'currency' => $recurring['currency'] ?? 'RON',
                'recurring_id' => $recurring['id'],
                'created_by' => $userId,
            ]);
            
            return [
                'id' => $newId,
                'type' => 'expense',
                'amount' => $recurring['amount'],
                'currency' => $recurring['currency'] ?? 'RON',
            ];
            
        case 'bill':
            // Generate vendor bill
            $stmt = $db->prepare("
                INSERT INTO bills (
                    id, company_id, vendor_id, bill_number,
                    bill_date, due_date, subtotal, vat_amount, total,
                    currency, status, recurring_id, created_by, created_at
                ) VALUES (
                    :id, :company_id, :vendor_id, :bill_number,
                    CURDATE(), DATE_ADD(CURDATE(), INTERVAL :payment_terms DAY),
                    :subtotal, :vat_amount, :total,
                    :currency, 'pending', :recurring_id, :created_by, NOW()
                )
            ");
            
            $vatAmount = $recurring['amount'] * ($recurring['vat_rate'] / 100);
            $total = $recurring['amount'] + $vatAmount;
            
            $stmt->execute([
                'id' => $newId,
                'company_id' => $companyId,
                'vendor_id' => $recurring['vendor_id'],
                'bill_number' => 'BILL-' . date('Ymd') . '-' . substr($newId, -4),
                'payment_terms' => $recurring['payment_terms'] ?? 30,
                'subtotal' => $recurring['amount'],
                'vat_amount' => $vatAmount,
                'total' => $total,
                'currency' => $recurring['currency'] ?? 'RON',
                'recurring_id' => $recurring['id'],
                'created_by' => $userId,
            ]);
            
            return [
                'id' => $newId,
                'type' => 'bill',
                'amount' => $total,
                'currency' => $recurring['currency'] ?? 'RON',
            ];
    }
    
    throw new Exception('Unknown transaction type');
}

function generateInvoiceNumber($db, $companyId) {
    $year = date('Y');
    $prefix = 'FCT';
    
    // Get next number
    $stmt = $db->prepare("
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number, LENGTH(:prefix) + 6) AS UNSIGNED)), 0) + 1 as next
        FROM invoices
        WHERE company_id = :company_id AND invoice_number LIKE :pattern
    ");
    $stmt->execute([
        'prefix' => $prefix,
        'company_id' => $companyId,
        'pattern' => $prefix . '-' . $year . '-%',
    ]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $prefix . '-' . $year . '-' . str_pad($result['next'], 4, '0', STR_PAD_LEFT);
}

function calculateNextOccurrence($from, $frequency) {
    $date = clone $from;
    switch ($frequency) {
        case 'daily': $date->modify('+1 day'); break;
        case 'weekly': $date->modify('+1 week'); break;
        case 'biweekly': $date->modify('+2 weeks'); break;
        case 'monthly': $date->modify('+1 month'); break;
        case 'bimonthly': $date->modify('+2 months'); break;
        case 'quarterly': $date->modify('+3 months'); break;
        case 'semiannually': $date->modify('+6 months'); break;
        case 'annually': $date->modify('+1 year'); break;
    }
    return $date;
}
