<?php
/**
 * Generate Invoice Template HTML/PDF
 * GET /api/v1/templates/generate.php?invoice_id=xxx&type=factura&format=html
 * POST /api/v1/templates/generate.php - for chitanta/aviz with custom data
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/RomanianInvoiceTemplateService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Authenticate
$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $templateService = RomanianInvoiceTemplateService::getInstance();
    $pdo = Database::getInstance()->getConnection();

    $type = $_GET['type'] ?? 'factura';
    $format = $_GET['format'] ?? 'html';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Generate from existing invoice
        $invoiceId = $_GET['invoice_id'] ?? null;
        if (!$invoiceId) {
            throw new Exception('invoice_id required');
        }

        // Get invoice with details
        $sql = "
            SELECT
                i.*,
                c.name as company_name,
                c.legal_name as company_legal_name,
                c.tax_id as company_tax_id,
                c.trade_register_number as company_trade_register,
                c.vat_registered as company_vat_registered,
                c.address_street as company_street,
                c.address_city as company_city,
                c.address_county as company_county,
                c.address_postal_code as company_postal_code,
                c.address_country as company_country,
                c.bank_account as company_bank_account,
                c.bank_name as company_bank_name,
                c.contact_email as company_email,
                c.contact_phone as company_phone,
                ct.display_name as customer_name,
                ct.email as customer_email,
                ct.phone as customer_phone,
                ct.tax_id as customer_tax_id,
                ct.trade_register_number as customer_trade_register,
                ct.address_street as customer_street,
                ct.address_city as customer_city,
                ct.address_county as customer_county,
                ct.address_postal_code as customer_postal_code,
                ct.address_country as customer_country,
                ct.bank_account as customer_bank_account,
                ct.bank_name as customer_bank_name
            FROM invoices i
            JOIN companies c ON i.company_id = c.id
            JOIN contacts ct ON i.customer_id = ct.id
            WHERE i.id = :id AND i.company_id = :company_id
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $invoiceId, 'company_id' => $companyId]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$invoice) {
            throw new Exception('Invoice not found');
        }

        // Get line items
        $linesSql = "SELECT * FROM invoice_line_items WHERE invoice_id = :invoice_id ORDER BY line_number";
        $linesStmt = $pdo->prepare($linesSql);
        $linesStmt->execute(['invoice_id' => $invoiceId]);
        $invoice['line_items'] = $linesStmt->fetchAll(PDO::FETCH_ASSOC);

        // Generate HTML
        $html = $templateService->generateHTML($invoice, $type);

    } else {
        // POST - generate from custom data (chitanta, aviz)
        $input = json_decode(file_get_contents('php://input'), true);

        if ($type === 'chitanta') {
            $html = $templateService->generateChitantaHTML($input);
        } elseif ($type === 'aviz') {
            $html = $templateService->generateAvizHTML($input);
        } else {
            // Custom invoice data
            $html = $templateService->generateHTML($input, $type);
        }
    }

    if ($format === 'pdf') {
        // Generate PDF
        require_once __DIR__ . '/../../vendor/autoload.php';

        $mpdf = new \Mpdf\Mpdf([
            'format' => 'A4',
            'margin_left' => 15,
            'margin_right' => 15,
            'margin_top' => 15,
            'margin_bottom' => 15
        ]);

        $mpdf->WriteHTML($html);

        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="document.pdf"');
        $mpdf->Output('', 'I');
    } else {
        // Return HTML
        if ($format === 'raw') {
            header('Content-Type: text/html; charset=utf-8');
            echo $html;
        } else {
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'data' => [
                    'html' => $html,
                    'type' => $type
                ]
            ]);
        }
    }
} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
