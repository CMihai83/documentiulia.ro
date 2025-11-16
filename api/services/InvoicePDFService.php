<?php
/**
 * Invoice PDF Generation Service
 * Generates professional PDF invoices with company branding
 *
 * TODO: Install mPDF library
 * composer require mpdf/mpdf
 */

require_once __DIR__ . '/../config/database.php';

class InvoicePDFService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Generate PDF for an invoice
     * @param int $invoiceId
     * @return string Path to generated PDF
     */
    public function generatePDF($invoiceId) {
        // Get invoice with all details
        $invoice = $this->getInvoiceDetails($invoiceId);

        if (!$invoice) {
            throw new Exception('Invoice not found');
        }

        // Generate HTML content
        $html = $this->generateInvoiceHTML($invoice);

        // Create directory if it doesn't exist
        if (!is_dir(__DIR__ . "/../../storage/invoices")) {
            mkdir(__DIR__ . "/../../storage/invoices", 0755, true);
        }

        // Use mPDF to generate PDF
        require_once __DIR__ . '/../../vendor/autoload.php';

        $mpdf = new \Mpdf\Mpdf([
            'format' => 'A4',
            'margin_left' => 15,
            'margin_right' => 15,
            'margin_top' => 20,
            'margin_bottom' => 20,
            'margin_header' => 10,
            'margin_footer' => 10
        ]);

        $mpdf->WriteHTML($html);

        $filename = "invoice_{$invoice['invoice_number']}_" . time() . ".pdf";
        $filepath = __DIR__ . "/../../storage/invoices/" . $filename;
        $mpdf->Output($filepath, 'F');

        return $filepath;
    }

    /**
     * Get complete invoice details with line items
     */
    private function getInvoiceDetails($invoiceId) {
        // Get invoice header
        $invoice = $this->db->fetchOne("
            SELECT i.*,
                   co.name as company_name,
                   co.email as company_email,
                   co.phone as company_phone,
                   co.address as company_address,
                   co.tax_id as company_tax_id,
                   co.registration_number as company_reg_number,
                   cu.display_name as customer_name,
                   cu.email as customer_email,
                   cu.phone as customer_phone,
                   cu.address as customer_address,
                   cu.tax_id as customer_tax_id
            FROM invoices i
            JOIN companies co ON i.company_id = co.id
            JOIN contacts cu ON i.customer_id = cu.id
            WHERE i.id = :id
        ", ['id' => $invoiceId]);

        if (!$invoice) {
            return null;
        }

        // Get line items
        $lineItems = $this->db->fetchAll("
            SELECT * FROM invoice_line_items
            WHERE invoice_id = :id
            ORDER BY line_number
        ", ['id' => $invoiceId]);

        $invoice['line_items'] = $lineItems;

        return $invoice;
    }

    /**
     * Generate HTML template for invoice
     */
    private function generateInvoiceHTML($invoice) {
        $currency = $invoice['currency'] ?? 'RON';
        $lineItemsHTML = '';

        foreach ($invoice['line_items'] as $item) {
            $lineItemsHTML .= "
                <tr>
                    <td>{$item['description']}</td>
                    <td style='text-align: center;'>{$item['quantity']}</td>
                    <td style='text-align: right;'>" . number_format($item['unit_price'], 2) . " {$currency}</td>
                    <td style='text-align: right;'>" . number_format($item['amount'], 2) . " {$currency}</td>
                </tr>
            ";
        }

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body {
                    font-family: 'DejaVu Sans', Arial, sans-serif;
                    font-size: 11pt;
                    color: #333;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #0066cc;
                }
                .company-info h1 {
                    color: #0066cc;
                    margin: 0 0 10px 0;
                    font-size: 24pt;
                }
                .invoice-info {
                    text-align: right;
                }
                .invoice-number {
                    font-size: 14pt;
                    font-weight: bold;
                    color: #0066cc;
                }
                .addresses {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                }
                .address-box {
                    width: 45%;
                }
                .address-box h3 {
                    color: #0066cc;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 5px;
                    margin-bottom: 10px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th {
                    background-color: #0066cc;
                    color: white;
                    padding: 10px;
                    text-align: left;
                }
                td {
                    padding: 8px;
                    border-bottom: 1px solid #ddd;
                }
                .totals {
                    float: right;
                    width: 300px;
                }
                .totals table {
                    margin-bottom: 10px;
                }
                .total-row {
                    font-weight: bold;
                    font-size: 12pt;
                    background-color: #f0f0f0;
                }
                .footer {
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 1px solid #ccc;
                    font-size: 9pt;
                    color: #666;
                    text-align: center;
                }
                .status-badge {
                    display: inline-block;
                    padding: 5px 15px;
                    border-radius: 3px;
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 9pt;
                }
                .status-paid {
                    background-color: #28a745;
                    color: white;
                }
                .status-unpaid {
                    background-color: #dc3545;
                    color: white;
                }
                .status-draft {
                    background-color: #6c757d;
                    color: white;
                }
            </style>
        </head>
        <body>
            <div class='header'>
                <div class='company-info'>
                    <h1>{$invoice['company_name']}</h1>
                    <p>
                        {$invoice['company_address']}<br>
                        CUI: {$invoice['company_tax_id']}<br>
                        J: {$invoice['company_reg_number']}<br>
                        Email: {$invoice['company_email']}<br>
                        Tel: {$invoice['company_phone']}
                    </p>
                </div>
                <div class='invoice-info'>
                    <div class='invoice-number'>FACTURĂ NR. {$invoice['invoice_number']}</div>
                    <p>
                        Data: {$invoice['invoice_date']}<br>
                        Scadență: {$invoice['due_date']}<br>
                        <span class='status-badge status-{$invoice['status']}'>{$invoice['status']}</span>
                    </p>
                </div>
            </div>

            <div class='addresses'>
                <div class='address-box'>
                    <h3>Furnizor:</h3>
                    <strong>{$invoice['company_name']}</strong><br>
                    {$invoice['company_address']}<br>
                    CUI: {$invoice['company_tax_id']}
                </div>
                <div class='address-box'>
                    <h3>Client:</h3>
                    <strong>{$invoice['customer_name']}</strong><br>
                    {$invoice['customer_address']}<br>
                    " . ($invoice['customer_tax_id'] ? "CUI: {$invoice['customer_tax_id']}<br>" : "") . "
                    Email: {$invoice['customer_email']}<br>
                    Tel: {$invoice['customer_phone']}
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Descriere</th>
                        <th style='width: 80px; text-align: center;'>Cantitate</th>
                        <th style='width: 120px; text-align: right;'>Preț Unitar</th>
                        <th style='width: 120px; text-align: right;'>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {$lineItemsHTML}
                </tbody>
            </table>

            <div class='totals'>
                <table>
                    <tr>
                        <td>Subtotal:</td>
                        <td style='text-align: right;'>" . number_format($invoice['subtotal'], 2) . " {$currency}</td>
                    </tr>
                    " . ($invoice['discount_amount'] > 0 ? "
                    <tr>
                        <td>Discount:</td>
                        <td style='text-align: right;'>-" . number_format($invoice['discount_amount'], 2) . " {$currency}</td>
                    </tr>" : "") . "
                    <tr>
                        <td>TVA:</td>
                        <td style='text-align: right;'>" . number_format($invoice['tax_amount'], 2) . " {$currency}</td>
                    </tr>
                    <tr class='total-row'>
                        <td>TOTAL:</td>
                        <td style='text-align: right;'>" . number_format($invoice['total_amount'], 2) . " {$currency}</td>
                    </tr>
                    <tr>
                        <td>Plătit:</td>
                        <td style='text-align: right;'>" . number_format($invoice['amount_paid'], 2) . " {$currency}</td>
                    </tr>
                    <tr class='total-row'>
                        <td>DE PLATĂ:</td>
                        <td style='text-align: right;'>" . number_format($invoice['amount_due'], 2) . " {$currency}</td>
                    </tr>
                </table>
            </div>

            <div style='clear: both;'></div>

            " . ($invoice['notes'] ? "
            <div style='margin-top: 30px;'>
                <h3>Observații:</h3>
                <p>{$invoice['notes']}</p>
            </div>" : "") . "

            <div class='footer'>
                <p>Mulțumim pentru colaborare!<br>
                Pentru întrebări, contactați-ne la {$invoice['company_email']}</p>
            </div>
        </body>
        </html>
        ";

        return $html;
    }
}
