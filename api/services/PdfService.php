<?php
/**
 * PDF Generation Service
 * Generates PDFs for invoices, reports, and other documents
 */

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

class PdfService {
    private $dompdf;
    private $outputDir;

    public function __construct() {
        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('tempDir', '/tmp');

        $this->dompdf = new Dompdf($options);
        $this->outputDir = __DIR__ . '/../../uploads/pdfs';

        if (!is_dir($this->outputDir)) {
            mkdir($this->outputDir, 0755, true);
        }
    }

    /**
     * Generate Invoice PDF
     */
    public function generateInvoicePdf(array $invoice): string {
        $html = $this->getInvoiceTemplate($invoice);
        return $this->generatePdf($html, "factura_{$invoice['invoice_number']}.pdf");
    }

    /**
     * Generate Report PDF
     */
    public function generateReportPdf(string $title, string $content, array $data = []): string {
        $html = $this->getReportTemplate($title, $content, $data);
        $filename = 'raport_' . date('Y-m-d_His') . '.pdf';
        return $this->generatePdf($html, $filename);
    }

    /**
     * Generate Receipt PDF
     */
    public function generateReceiptPdf(array $receipt): string {
        $html = $this->getReceiptTemplate($receipt);
        return $this->generatePdf($html, "chitanta_{$receipt['id']}.pdf");
    }

    /**
     * Generate Balance Sheet PDF
     */
    public function generateBalanceSheetPdf(array $data): string {
        $html = $this->getBalanceSheetTemplate($data);
        $filename = 'bilant_' . date('Y-m-d') . '.pdf';
        return $this->generatePdf($html, $filename);
    }

    /**
     * Core PDF generation method
     */
    private function generatePdf(string $html, string $filename): string {
        $this->dompdf->loadHtml($html);
        $this->dompdf->setPaper('A4', 'portrait');
        $this->dompdf->render();

        $outputPath = $this->outputDir . '/' . $filename;
        file_put_contents($outputPath, $this->dompdf->output());

        return $outputPath;
    }

    /**
     * Get PDF as binary output (for download)
     */
    public function getPdfBinary(string $html): string {
        $this->dompdf->loadHtml($html);
        $this->dompdf->setPaper('A4', 'portrait');
        $this->dompdf->render();
        return $this->dompdf->output();
    }

    /**
     * Invoice Template
     */
    private function getInvoiceTemplate(array $invoice): string {
        $currency = $invoice['currency'] ?? 'RON';
        $items = $invoice['items'] ?? [];
        $itemsHtml = '';

        foreach ($items as $item) {
            $itemTotal = ($item['quantity'] ?? 1) * ($item['unit_price'] ?? 0);
            $itemsHtml .= "
            <tr>
                <td>{$item['description']}</td>
                <td style='text-align:center'>{$item['quantity']}</td>
                <td style='text-align:right'>" . number_format($item['unit_price'], 2) . "</td>
                <td style='text-align:right'>" . number_format($itemTotal, 2) . "</td>
            </tr>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #333; }
                .header { border-bottom: 2px solid #0066cc; padding-bottom: 20px; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
                .invoice-info { float: right; text-align: right; }
                .company-info, .customer-info { width: 48%; display: inline-block; vertical-align: top; }
                .section-title { font-weight: bold; margin-bottom: 10px; color: #0066cc; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background-color: #0066cc; color: white; padding: 10px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                .totals { width: 300px; float: right; }
                .totals td { border: none; }
                .total-row { font-weight: bold; font-size: 14px; background-color: #f0f0f0; }
                .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
            </style>
        </head>
        <body>
            <div class='header'>
                <div class='logo'>FACTURA</div>
                <div class='invoice-info'>
                    <strong>Nr: {$invoice['invoice_number']}</strong><br>
                    Data: {$invoice['invoice_date']}<br>
                    Scadenta: {$invoice['due_date']}
                </div>
            </div>

            <div class='company-info'>
                <div class='section-title'>Furnizor</div>
                <strong>{$invoice['company_name']}</strong><br>
                " . ($invoice['company_address'] ?? '') . "<br>
                CUI: " . ($invoice['company_cui'] ?? 'N/A') . "<br>
                Nr. Reg. Com.: " . ($invoice['company_reg'] ?? 'N/A') . "
            </div>

            <div class='customer-info'>
                <div class='section-title'>Client</div>
                <strong>" . ($invoice['customer_name'] ?? 'Client') . "</strong><br>
                " . ($invoice['customer_address'] ?? '') . "<br>
                " . (isset($invoice['customer_cui']) ? "CUI: {$invoice['customer_cui']}" : '') . "
            </div>

            <div style='clear:both'></div>

            <table>
                <thead>
                    <tr>
                        <th>Descriere</th>
                        <th style='width:80px;text-align:center'>Cantitate</th>
                        <th style='width:100px;text-align:right'>Pret unitar</th>
                        <th style='width:100px;text-align:right'>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {$itemsHtml}
                </tbody>
            </table>

            <table class='totals'>
                <tr>
                    <td>Subtotal:</td>
                    <td style='text-align:right'>" . number_format($invoice['subtotal'] ?? $invoice['total_amount'], 2) . " {$currency}</td>
                </tr>
                <tr>
                    <td>TVA (" . ($invoice['vat_rate'] ?? 19) . "%):</td>
                    <td style='text-align:right'>" . number_format($invoice['vat_amount'] ?? 0, 2) . " {$currency}</td>
                </tr>
                <tr class='total-row'>
                    <td>TOTAL:</td>
                    <td style='text-align:right'>" . number_format($invoice['total_amount'], 2) . " {$currency}</td>
                </tr>
            </table>

            <div style='clear:both'></div>

            <div class='footer'>
                <p><strong>Conditii de plata:</strong> " . ($invoice['payment_terms'] ?? 'Transfer bancar in contul mentionat') . "</p>
                <p><strong>IBAN:</strong> " . ($invoice['iban'] ?? 'N/A') . " | <strong>Banca:</strong> " . ($invoice['bank_name'] ?? 'N/A') . "</p>
                <p style='text-align:center; margin-top:20px'>Document generat electronic prin platforma Documentiulia.ro</p>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Report Template
     */
    private function getReportTemplate(string $title, string $content, array $data): string {
        $tableHtml = '';
        if (!empty($data)) {
            $tableHtml = "<table><thead><tr>";
            $headers = array_keys($data[0] ?? []);
            foreach ($headers as $header) {
                $tableHtml .= "<th>" . htmlspecialchars($header) . "</th>";
            }
            $tableHtml .= "</tr></thead><tbody>";

            foreach ($data as $row) {
                $tableHtml .= "<tr>";
                foreach ($row as $value) {
                    $tableHtml .= "<td>" . htmlspecialchars($value ?? '') . "</td>";
                }
                $tableHtml .= "</tr>";
            }
            $tableHtml .= "</tbody></table>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: DejaVu Sans, sans-serif; font-size: 11px; }
                h1 { color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background-color: #0066cc; color: white; padding: 8px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #ddd; }
                .meta { color: #666; font-size: 10px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h1>{$title}</h1>
            <div class='meta'>Generat la: " . date('d.m.Y H:i:s') . "</div>
            <div class='content'>{$content}</div>
            {$tableHtml}
        </body>
        </html>
        ";
    }

    /**
     * Receipt Template
     */
    private function getReceiptTemplate(array $receipt): string {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: DejaVu Sans, sans-serif; font-size: 11px; }
                .receipt { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
                h2 { text-align: center; color: #0066cc; }
                .row { display: flex; justify-content: space-between; padding: 5px 0; }
                .total { font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class='receipt'>
                <h2>CHITANTA</h2>
                <div class='row'><span>Nr:</span><span>" . ($receipt['receipt_number'] ?? $receipt['id']) . "</span></div>
                <div class='row'><span>Data:</span><span>" . ($receipt['date'] ?? date('Y-m-d')) . "</span></div>
                <div class='row'><span>Furnizor:</span><span>" . ($receipt['vendor_name'] ?? 'N/A') . "</span></div>
                <div class='row total'><span>TOTAL:</span><span>" . number_format($receipt['total'] ?? 0, 2) . " " . ($receipt['currency'] ?? 'RON') . "</span></div>
            </div>
        </body>
        </html>
        ";
    }

    /**
     * Balance Sheet Template
     */
    private function getBalanceSheetTemplate(array $data): string {
        $assetsHtml = '';
        $liabilitiesHtml = '';

        foreach (($data['assets'] ?? []) as $item) {
            $assetsHtml .= "<tr><td>{$item['name']}</td><td style='text-align:right'>" . number_format($item['amount'], 2) . "</td></tr>";
        }

        foreach (($data['liabilities'] ?? []) as $item) {
            $liabilitiesHtml .= "<tr><td>{$item['name']}</td><td style='text-align:right'>" . number_format($item['amount'], 2) . "</td></tr>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: DejaVu Sans, sans-serif; font-size: 11px; }
                h1 { text-align: center; color: #0066cc; }
                .section { margin: 20px 0; }
                h2 { background-color: #0066cc; color: white; padding: 10px; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 8px; border-bottom: 1px solid #ddd; }
                .total-row { font-weight: bold; background-color: #f0f0f0; }
            </style>
        </head>
        <body>
            <h1>BILANT CONTABIL</h1>
            <p style='text-align:center'>Perioada: " . ($data['period'] ?? date('Y')) . "</p>

            <div class='section'>
                <h2>ACTIVE</h2>
                <table>{$assetsHtml}
                    <tr class='total-row'><td>Total Active</td><td style='text-align:right'>" . number_format($data['total_assets'] ?? 0, 2) . "</td></tr>
                </table>
            </div>

            <div class='section'>
                <h2>PASIVE</h2>
                <table>{$liabilitiesHtml}
                    <tr class='total-row'><td>Total Pasive</td><td style='text-align:right'>" . number_format($data['total_liabilities'] ?? 0, 2) . "</td></tr>
                </table>
            </div>
        </body>
        </html>
        ";
    }
}
