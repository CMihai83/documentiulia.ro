<?php
/**
 * Smart Auto-Fill API
 * Auto-fills invoice fields based on client data and history
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

$customerId = $_GET['customer_id'] ?? null;
if (!$customerId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Customer ID required']);
    exit;
}

$db = getDbConnection();

try {
    // Get customer details
    $stmt = $db->prepare("
        SELECT
            c.*,
            COUNT(i.id) as invoice_count,
            MAX(i.issue_date) as last_invoice_date
        FROM contacts c
        LEFT JOIN invoices i ON i.customer_id = c.id
        WHERE c.id = :customer_id AND c.company_id = :company_id
        GROUP BY c.id
    ");
    $stmt->execute(['customer_id' => $customerId, 'company_id' => $companyId]);
    $customer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$customer) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Customer not found']);
        exit;
    }

    // Get last invoice to this customer
    $stmt = $db->prepare("
        SELECT
            i.*,
            json_agg(json_build_object(
                'description', il.description,
                'quantity', il.quantity,
                'unit', il.unit,
                'unit_price', il.unit_price,
                'vat_rate', il.vat_rate,
                'total', il.total
            ) ORDER BY il.id) as items
        FROM invoices i
        LEFT JOIN invoice_lines il ON il.invoice_id = i.id
        WHERE i.customer_id = :customer_id AND i.company_id = :company_id
        GROUP BY i.id
        ORDER BY i.issue_date DESC
        LIMIT 1
    ");
    $stmt->execute(['customer_id' => $customerId, 'company_id' => $companyId]);
    $lastInvoice = $stmt->fetch(PDO::FETCH_ASSOC);

    // Determine suggested payment terms
    $paymentTerms = $customer['payment_terms'] ?? 30;
    if ($lastInvoice) {
        $issueDt = new DateTime($lastInvoice['issue_date']);
        $dueDt = new DateTime($lastInvoice['due_date']);
        $lastPaymentTerms = $issueDt->diff($dueDt)->days;
        if ($lastPaymentTerms > 0) {
            $paymentTerms = $lastPaymentTerms;
        }
    }

    // Get most frequently used VAT rate
    $stmt = $db->prepare("
        SELECT il.vat_rate, COUNT(*) as cnt
        FROM invoice_lines il
        JOIN invoices i ON i.id = il.invoice_id
        WHERE i.company_id = :company_id
        GROUP BY il.vat_rate
        ORDER BY cnt DESC
        LIMIT 1
    ");
    $stmt->execute(['company_id' => $companyId]);
    $defaultVat = $stmt->fetch(PDO::FETCH_ASSOC);

    // Get company's bank account
    $stmt = $db->prepare("
        SELECT account_number, bank_name, iban, swift
        FROM bank_accounts
        WHERE company_id = :company_id AND is_default = true
        LIMIT 1
    ");
    $stmt->execute(['company_id' => $companyId]);
    $bankAccount = $stmt->fetch(PDO::FETCH_ASSOC);

    // Generate next invoice number
    $stmt = $db->prepare("
        SELECT invoice_number
        FROM invoices
        WHERE company_id = :company_id
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->execute(['company_id' => $companyId]);
    $lastNumber = $stmt->fetchColumn();

    $nextNumber = 'INV-' . date('Y') . '-001';
    if ($lastNumber && preg_match('/INV-\d{4}-(\d+)/', $lastNumber, $matches)) {
        $nextNumber = 'INV-' . date('Y') . '-' . str_pad(intval($matches[1]) + 1, 3, '0', STR_PAD_LEFT);
    }

    // Build auto-fill suggestion
    $autoFill = [
        'invoice_number' => $nextNumber,
        'issue_date' => date('Y-m-d'),
        'due_date' => date('Y-m-d', strtotime("+{$paymentTerms} days")),
        'payment_terms_days' => $paymentTerms,
        'default_vat_rate' => floatval($defaultVat['vat_rate'] ?? 19),
        'currency' => 'RON',
        'customer' => [
            'id' => $customer['id'],
            'name' => $customer['name'],
            'email' => $customer['email'],
            'fiscal_code' => $customer['fiscal_code'],
            'vat_number' => $customer['vat_number'],
            'address' => $customer['address'],
            'city' => $customer['city'],
            'country' => $customer['country'] ?? 'România',
        ],
        'bank_account' => $bankAccount,
        'suggested_items' => [],
    ];

    // Add last invoice items as suggestions
    if ($lastInvoice && $lastInvoice['items']) {
        $items = json_decode($lastInvoice['items'], true);
        if ($items) {
            $autoFill['suggested_items'] = array_slice($items, 0, 10);
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $autoFill,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}
