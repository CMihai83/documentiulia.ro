<?php
/**
 * Update Recurring Transaction API
 * PUT - Update an existing recurring transaction
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
$recurringId = $input['id'] ?? $_GET['id'] ?? null;

if (!$recurringId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Recurring ID required']);
    exit;
}

try {
    $db = getDbConnection();
    
    // Check exists and belongs to company
    $stmt = $db->prepare("
        SELECT * FROM recurring_transactions
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute(['id' => $recurringId, 'company_id' => $companyId]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Recurring transaction not found']);
        exit;
    }
    
    // Build update query dynamically
    $updates = [];
    $params = ['id' => $recurringId, 'company_id' => $companyId];
    
    $allowedFields = [
        'name', 'description', 'frequency', 'amount', 'currency', 'vat_rate',
        'customer_id', 'vendor_id', 'category_id', 'template_id',
        'auto_send', 'payment_terms', 'notes', 'end_date', 'status'
    ];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[] = "$field = :$field";
            $params[$field] = $input[$field];
        }
    }
    
    // Handle JSON fields
    if (isset($input['line_items'])) {
        $updates[] = "line_items = :line_items";
        $params['line_items'] = json_encode($input['line_items']);
    }
    
    if (isset($input['metadata'])) {
        $updates[] = "metadata = :metadata";
        $params['metadata'] = json_encode($input['metadata']);
    }
    
    // Recalculate next_date if frequency changed
    if (isset($input['frequency']) && $input['frequency'] !== $existing['frequency']) {
        $nextDate = calculateNextOccurrence(new DateTime(), $input['frequency']);
        $updates[] = "next_date = :next_date";
        $params['next_date'] = $nextDate->format('Y-m-d');
    }
    
    $updates[] = "updated_at = NOW()";
    
    $sql = "UPDATE recurring_transactions SET " . implode(', ', $updates) .
           " WHERE id = :id AND company_id = :company_id";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode([
        'success' => true,
        'message_ro' => 'Tranzacție recurentă actualizată cu succes',
        'message_en' => 'Recurring transaction updated successfully',
        'data' => [
            'id' => $recurringId,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
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
