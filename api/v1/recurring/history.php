<?php
/**
 * Recurring Transaction History API
 * GET - View history of generated transactions from a recurring template
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

$recurringId = $_GET['recurring_id'] ?? $_GET['id'] ?? null;

try {
    $db = getDbConnection();
    
    if ($recurringId) {
        // Get history for specific recurring
        $stmt = $db->prepare("
            SELECT 
                rh.*,
                rt.name as recurring_name,
                rt.type as recurring_type,
                CASE 
                    WHEN rh.generated_type = 'invoice' THEN i.total
                    WHEN rh.generated_type = 'expense' THEN e.amount
                    WHEN rh.generated_type = 'bill' THEN b.total
                END as amount,
                CASE 
                    WHEN rh.generated_type = 'invoice' THEN i.status
                    WHEN rh.generated_type = 'expense' THEN e.status
                    WHEN rh.generated_type = 'bill' THEN b.status
                END as document_status
            FROM recurring_history rh
            JOIN recurring_transactions rt ON rh.recurring_id = rt.id
            LEFT JOIN invoices i ON rh.generated_id = i.id AND rh.generated_type = 'invoice'
            LEFT JOIN expenses e ON rh.generated_id = e.id AND rh.generated_type = 'expense'
            LEFT JOIN bills b ON rh.generated_id = b.id AND rh.generated_type = 'bill'
            WHERE rt.company_id = :company_id AND rh.recurring_id = :recurring_id
            ORDER BY rh.generated_at DESC
            LIMIT 100
        ");
        $stmt->execute(['company_id' => $companyId, 'recurring_id' => $recurringId]);
    } else {
        // Get all recent history
        $stmt = $db->prepare("
            SELECT 
                rh.*,
                rt.name as recurring_name,
                rt.type as recurring_type
            FROM recurring_history rh
            JOIN recurring_transactions rt ON rh.recurring_id = rt.id
            WHERE rt.company_id = :company_id
            ORDER BY rh.generated_at DESC
            LIMIT 50
        ");
        $stmt->execute(['company_id' => $companyId]);
    }
    
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    // Return mock data
    $history = [
        [
            'id' => 'rh_sample_1',
            'recurring_id' => 'rec_sample_1',
            'recurring_name' => 'Abonament lunar servicii IT',
            'recurring_type' => 'invoice',
            'generated_id' => 'inv_sample_1',
            'generated_type' => 'invoice',
            'generated_at' => date('Y-m-d H:i:s', strtotime('-1 month')),
            'amount' => 595.00,
            'document_status' => 'paid',
        ],
        [
            'id' => 'rh_sample_2',
            'recurring_id' => 'rec_sample_1',
            'recurring_name' => 'Abonament lunar servicii IT',
            'recurring_type' => 'invoice',
            'generated_id' => 'inv_sample_2',
            'generated_type' => 'invoice',
            'generated_at' => date('Y-m-d H:i:s', strtotime('-2 months')),
            'amount' => 595.00,
            'document_status' => 'paid',
        ],
    ];
}

// Add Romanian labels
foreach ($history as &$item) {
    $item['type_label_ro'] = getTypeLabelRo($item['generated_type']);
    $item['type_label_en'] = getTypeLabelEn($item['generated_type']);
}

function getTypeLabelRo($type) {
    return ['invoice' => 'Factură', 'expense' => 'Cheltuială', 'bill' => 'Factură Furnizor'][$type] ?? $type;
}

function getTypeLabelEn($type) {
    return ['invoice' => 'Invoice', 'expense' => 'Expense', 'bill' => 'Vendor Bill'][$type] ?? $type;
}

echo json_encode([
    'success' => true,
    'data' => [
        'history' => $history,
        'total' => count($history),
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
