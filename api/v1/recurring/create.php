<?php
/**
 * Create Recurring Transaction API
 * POST - Create a new recurring invoice, expense, or bill
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
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

// Validate required fields
$requiredFields = ['type', 'name', 'frequency', 'amount', 'start_date'];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
        exit;
    }
}

// Validate type
$validTypes = ['invoice', 'expense', 'bill'];
if (!in_array($input['type'], $validTypes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid transaction type']);
    exit;
}

// Validate frequency
$validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannually', 'annually'];
if (!in_array($input['frequency'], $validFrequencies)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid frequency']);
    exit;
}

// Type-specific validation
if ($input['type'] === 'invoice' && empty($input['customer_id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error_ro' => 'Clientul este obligatoriu pentru facturi recurente',
        'error' => 'Customer is required for recurring invoices'
    ]);
    exit;
}

if ($input['type'] === 'bill' && empty($input['vendor_id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Furnizorul este obligatoriu pentru facturi furnizor recurente',
        'error' => 'Vendor is required for recurring bills'
    ]);
    exit;
}

$recurringId = 'rec_' . bin2hex(random_bytes(12));

// Calculate next occurrence date
$startDate = new DateTime($input['start_date']);
$today = new DateTime();
$nextDate = $startDate > $today ? $startDate : calculateNextOccurrence($today, $input['frequency']);

function calculateNextOccurrence($from, $frequency) {
    $date = clone $from;
    switch ($frequency) {
        case 'daily':
            $date->modify('+1 day');
            break;
        case 'weekly':
            $date->modify('+1 week');
            break;
        case 'biweekly':
            $date->modify('+2 weeks');
            break;
        case 'monthly':
            $date->modify('+1 month');
            break;
        case 'bimonthly':
            $date->modify('+2 months');
            break;
        case 'quarterly':
            $date->modify('+3 months');
            break;
        case 'semiannually':
            $date->modify('+6 months');
            break;
        case 'annually':
            $date->modify('+1 year');
            break;
    }
    return $date;
}

try {
    $db = getDbConnection();
    
    $stmt = $db->prepare("
        INSERT INTO recurring_transactions (
            id, company_id, type, name, description,
            frequency, start_date, end_date, next_date,
            amount, currency, vat_rate,
            customer_id, vendor_id, category_id,
            line_items, template_id, auto_send,
            payment_terms, notes, metadata,
            status, created_by, created_at, updated_at
        ) VALUES (
            :id, :company_id, :type, :name, :description,
            :frequency, :start_date, :end_date, :next_date,
            :amount, :currency, :vat_rate,
            :customer_id, :vendor_id, :category_id,
            :line_items, :template_id, :auto_send,
            :payment_terms, :notes, :metadata,
            'active', :created_by, NOW(), NOW()
        )
    ");
    
    $stmt->execute([
        'id' => $recurringId,
        'company_id' => $companyId,
        'type' => $input['type'],
        'name' => $input['name'],
        'description' => $input['description'] ?? null,
        'frequency' => $input['frequency'],
        'start_date' => $input['start_date'],
        'end_date' => $input['end_date'] ?? null,
        'next_date' => $nextDate->format('Y-m-d'),
        'amount' => $input['amount'],
        'currency' => $input['currency'] ?? 'RON',
        'vat_rate' => $input['vat_rate'] ?? 19,
        'customer_id' => $input['customer_id'] ?? null,
        'vendor_id' => $input['vendor_id'] ?? null,
        'category_id' => $input['category_id'] ?? null,
        'line_items' => json_encode($input['line_items'] ?? []),
        'template_id' => $input['template_id'] ?? null,
        'auto_send' => $input['auto_send'] ?? false,
        'payment_terms' => $input['payment_terms'] ?? 30,
        'notes' => $input['notes'] ?? null,
        'metadata' => json_encode($input['metadata'] ?? []),
        'created_by' => $user['user_id'],
    ]);
    
    echo json_encode([
        'success' => true,
        'message_ro' => 'Tranzacție recurentă creată cu succes',
        'message_en' => 'Recurring transaction created successfully',
        'data' => [
            'id' => $recurringId,
            'type' => $input['type'],
            'name' => $input['name'],
            'frequency' => $input['frequency'],
            'next_date' => $nextDate->format('Y-m-d'),
            'status' => 'active',
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
