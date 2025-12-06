<?php
/**
 * Romanian Invoice Template Service
 * E2-US08: Romanian-specific invoice templates
 *
 * Supports:
 * - Factura Fiscala (standard invoice)
 * - Factura Proforma (proforma invoice)
 * - Chitanta (receipt)
 * - Aviz de Insotire a Marfii (delivery note)
 * - Nota de Credit (credit note)
 * - Nota de Debit (debit note)
 */

require_once __DIR__ . '/../config/database.php';

class RomanianInvoiceTemplateService {
    private static ?RomanianInvoiceTemplateService $instance = null;
    private PDO $pdo;

    // Romanian invoice types
    public const TYPE_FACTURA = 'factura';
    public const TYPE_PROFORMA = 'proforma';
    public const TYPE_CHITANTA = 'chitanta';
    public const TYPE_AVIZ = 'aviz';
    public const TYPE_CREDIT_NOTE = 'nota_credit';
    public const TYPE_DEBIT_NOTE = 'nota_debit';

    // Required legal texts for Romanian invoices
    private array $legalTexts = [
        'factura' => [
            'title' => 'FACTURĂ FISCALĂ',
            'series_prefix' => 'FCT',
            'footer' => 'Factura este valabilă fără semnătură și ștampilă conform art. 319 alin. 29 din Legea nr. 227/2015 privind Codul fiscal.'
        ],
        'proforma' => [
            'title' => 'FACTURĂ PROFORMA',
            'series_prefix' => 'PFM',
            'footer' => 'Acest document nu constituie document fiscal. Factura fiscală va fi emisă la plata efectivă.'
        ],
        'chitanta' => [
            'title' => 'CHITANȚĂ',
            'series_prefix' => 'CHT',
            'footer' => 'Chitanța este document justificativ pentru încasarea sumelor în numerar.'
        ],
        'aviz' => [
            'title' => 'AVIZ DE ÎNSOȚIRE A MĂRFII',
            'series_prefix' => 'AVZ',
            'footer' => 'Acest document însoțește marfa pe timpul transportului.'
        ],
        'nota_credit' => [
            'title' => 'NOTĂ DE CREDIT',
            'series_prefix' => 'NCR',
            'footer' => 'Nota de credit reprezintă o reducere a valorii facturii inițiale.'
        ],
        'nota_debit' => [
            'title' => 'NOTĂ DE DEBIT',
            'series_prefix' => 'NDB',
            'footer' => 'Nota de debit reprezintă o majorare a valorii facturii inițiale.'
        ]
    ];

    // Romanian VAT rates
    private array $vatRates = [
        'standard' => 19,
        'reduced_9' => 9,
        'reduced_5' => 5,
        'zero' => 0
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): RomanianInvoiceTemplateService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get available template types
     */
    public function getTemplateTypes(): array {
        return array_map(function($type, $config) {
            return [
                'type' => $type,
                'title' => $config['title'],
                'series_prefix' => $config['series_prefix']
            ];
        }, array_keys($this->legalTexts), array_values($this->legalTexts));
    }

    /**
     * Generate invoice number with Romanian format
     * Format: SERIES-YEAR-NUMBER (e.g., FCT-2025-00001)
     */
    public function generateInvoiceNumber(string $companyId, string $type = 'factura'): string {
        $prefix = $this->legalTexts[$type]['series_prefix'] ?? 'INV';
        $year = date('Y');

        // Get next number for this series
        $sql = "
            SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num
            FROM invoices
            WHERE company_id = :company_id
              AND invoice_number LIKE :prefix
              AND EXTRACT(YEAR FROM invoice_date) = :year
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'company_id' => $companyId,
            'prefix' => $prefix . '-' . $year . '-%',
            'year' => $year
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $nextNum = $result['next_num'] ?? 1;

        return sprintf('%s-%s-%05d', $prefix, $year, $nextNum);
    }

    /**
     * Generate HTML for Romanian invoice
     */
    public function generateHTML(array $invoice, string $type = 'factura', array $options = []): string {
        $config = $this->legalTexts[$type] ?? $this->legalTexts['factura'];
        $currency = $invoice['currency'] ?? 'RON';
        $language = $options['language'] ?? 'ro';

        // Prepare line items
        $lineItemsHTML = $this->generateLineItemsHTML($invoice['line_items'] ?? [], $currency);

        // Calculate totals
        $subtotal = (float)($invoice['subtotal'] ?? 0);
        $vatAmount = (float)($invoice['vat_amount'] ?? $invoice['tax_amount'] ?? 0);
        $discount = (float)($invoice['discount_amount'] ?? 0);
        $total = (float)($invoice['total_amount'] ?? ($subtotal + $vatAmount - $discount));
        $paid = (float)($invoice['amount_paid'] ?? 0);
        $due = (float)($invoice['amount_due'] ?? ($total - $paid));

        // Generate HTML
        return $this->getHTMLTemplate($invoice, $config, [
            'line_items' => $lineItemsHTML,
            'subtotal' => $subtotal,
            'vat_amount' => $vatAmount,
            'discount' => $discount,
            'total' => $total,
            'paid' => $paid,
            'due' => $due,
            'currency' => $currency,
            'type' => $type,
            'language' => $language
        ]);
    }

    /**
     * Generate line items HTML
     */
    private function generateLineItemsHTML(array $items, string $currency): string {
        $html = '';
        $lineNum = 1;

        foreach ($items as $item) {
            $qty = number_format((float)$item['quantity'], 2, ',', '.');
            $price = number_format((float)$item['unit_price'], 2, ',', '.');
            $amount = number_format((float)$item['amount'], 2, ',', '.');
            $vatRate = (float)($item['vat_rate'] ?? 19);
            $unit = $item['unit_of_measure'] ?? 'buc';

            $html .= "
                <tr>
                    <td class='center'>{$lineNum}</td>
                    <td>{$item['description']}</td>
                    <td class='center'>{$unit}</td>
                    <td class='right'>{$qty}</td>
                    <td class='right'>{$price}</td>
                    <td class='center'>{$vatRate}%</td>
                    <td class='right'>{$amount}</td>
                </tr>
            ";
            $lineNum++;
        }

        return $html;
    }

    /**
     * Get the HTML template
     */
    private function getHTMLTemplate(array $invoice, array $config, array $data): string {
        $currency = $data['currency'];

        // Format numbers Romanian style (comma for decimals, dot for thousands)
        $formatNumber = function($num) {
            return number_format((float)$num, 2, ',', '.');
        };

        // Company info
        $company = [
            'name' => $invoice['company_name'] ?? $invoice['company_legal_name'] ?? 'N/A',
            'tax_id' => $invoice['company_tax_id'] ?? '',
            'trade_register' => $invoice['company_trade_register'] ?? '',
            'address' => implode(', ', array_filter([
                $invoice['company_street'] ?? '',
                $invoice['company_city'] ?? '',
                $invoice['company_county'] ?? '',
                $invoice['company_postal_code'] ?? ''
            ])),
            'country' => $invoice['company_country'] ?? 'România',
            'bank_account' => $invoice['company_bank_account'] ?? '',
            'bank_name' => $invoice['company_bank_name'] ?? '',
            'email' => $invoice['company_email'] ?? '',
            'phone' => $invoice['company_phone'] ?? '',
            'vat_registered' => $invoice['company_vat_registered'] ?? false
        ];

        // Customer info
        $customer = [
            'name' => $invoice['customer_name'] ?? 'N/A',
            'tax_id' => $invoice['customer_tax_id'] ?? '',
            'trade_register' => $invoice['customer_trade_register'] ?? '',
            'address' => implode(', ', array_filter([
                $invoice['customer_street'] ?? '',
                $invoice['customer_city'] ?? '',
                $invoice['customer_county'] ?? '',
                $invoice['customer_postal_code'] ?? ''
            ])),
            'country' => $invoice['customer_country'] ?? 'România',
            'bank_account' => $invoice['customer_bank_account'] ?? '',
            'bank_name' => $invoice['customer_bank_name'] ?? '',
            'email' => $invoice['customer_email'] ?? '',
            'phone' => $invoice['customer_phone'] ?? ''
        ];

        // Format CUI/CIF with RO prefix for VAT
        $companyCUI = $company['vat_registered'] && !str_starts_with($company['tax_id'], 'RO')
            ? 'RO' . $company['tax_id']
            : $company['tax_id'];

        // Status badge class
        $statusClass = match($invoice['status'] ?? 'draft') {
            'paid' => 'status-paid',
            'sent', 'pending' => 'status-pending',
            'overdue' => 'status-overdue',
            default => 'status-draft'
        };

        $statusText = match($invoice['status'] ?? 'draft') {
            'paid' => 'ACHITATĂ',
            'sent' => 'TRIMISĂ',
            'pending' => 'ÎN AȘTEPTARE',
            'overdue' => 'RESTANTĂ',
            'draft' => 'CIORNĂ',
            default => strtoupper($invoice['status'] ?? 'CIORNĂ')
        };

        return <<<HTML
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <title>{$config['title']} - {$invoice['invoice_number']}</title>
    <style>
        @page {
            margin: 15mm;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10pt;
            color: #333;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        .header {
            border-bottom: 3px solid #1a5276;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header-row {
            display: table;
            width: 100%;
        }
        .header-left, .header-right {
            display: table-cell;
            vertical-align: top;
        }
        .header-left {
            width: 60%;
        }
        .header-right {
            width: 40%;
            text-align: right;
        }
        .company-name {
            font-size: 18pt;
            font-weight: bold;
            color: #1a5276;
            margin-bottom: 5px;
        }
        .company-details {
            font-size: 9pt;
            color: #666;
        }
        .invoice-title {
            font-size: 16pt;
            font-weight: bold;
            color: #1a5276;
            margin-bottom: 10px;
        }
        .invoice-number {
            font-size: 12pt;
            font-weight: bold;
        }
        .invoice-dates {
            font-size: 10pt;
            margin-top: 10px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 9pt;
            font-weight: bold;
            margin-top: 10px;
        }
        .status-paid { background: #27ae60; color: white; }
        .status-pending { background: #f39c12; color: white; }
        .status-overdue { background: #e74c3c; color: white; }
        .status-draft { background: #95a5a6; color: white; }

        .parties {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .party-box {
            display: table-cell;
            width: 48%;
            vertical-align: top;
            padding: 10px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
        }
        .party-box:first-child {
            margin-right: 4%;
        }
        .party-label {
            font-size: 9pt;
            font-weight: bold;
            color: #1a5276;
            text-transform: uppercase;
            border-bottom: 1px solid #1a5276;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .party-name {
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .party-details {
            font-size: 9pt;
        }
        .party-details p {
            margin: 2px 0;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        table.items th {
            background: #1a5276;
            color: white;
            padding: 8px;
            font-size: 9pt;
            font-weight: bold;
            text-align: left;
        }
        table.items td {
            padding: 8px;
            border-bottom: 1px solid #e9ecef;
            font-size: 9pt;
        }
        table.items tr:nth-child(even) {
            background: #f8f9fa;
        }
        .center { text-align: center; }
        .right { text-align: right; }

        .totals-section {
            display: table;
            width: 100%;
        }
        .notes-box {
            display: table-cell;
            width: 55%;
            vertical-align: top;
            padding-right: 20px;
        }
        .totals-box {
            display: table-cell;
            width: 45%;
            vertical-align: top;
        }
        table.totals {
            width: 100%;
            border-collapse: collapse;
        }
        table.totals td {
            padding: 6px 10px;
            font-size: 10pt;
        }
        table.totals .label {
            text-align: left;
        }
        table.totals .value {
            text-align: right;
            font-weight: bold;
        }
        table.totals tr.total-row {
            background: #1a5276;
            color: white;
        }
        table.totals tr.total-row td {
            font-size: 12pt;
            padding: 10px;
        }
        table.totals tr.due-row {
            background: #e74c3c;
            color: white;
        }

        .notes {
            font-size: 9pt;
            padding: 10px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
        }
        .notes-title {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e9ecef;
        }
        .signatures {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .signature-box {
            display: table-cell;
            width: 48%;
            text-align: center;
            padding: 10px;
        }
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 40px;
            padding-top: 5px;
            font-size: 9pt;
        }

        .legal-text {
            font-size: 8pt;
            color: #666;
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e9ecef;
        }

        .payment-info {
            margin-top: 15px;
            padding: 10px;
            background: #d4edda;
            border: 1px solid #28a745;
            border-radius: 4px;
            font-size: 9pt;
        }
        .payment-title {
            font-weight: bold;
            color: #155724;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-row">
            <div class="header-left">
                <div class="company-name">{$company['name']}</div>
                <div class="company-details">
                    {$company['address']}, {$company['country']}<br>
                    CUI/CIF: {$companyCUI}<br>
                    Reg. Com.: {$company['trade_register']}<br>
                    Tel: {$company['phone']} | Email: {$company['email']}
                </div>
            </div>
            <div class="header-right">
                <div class="invoice-title">{$config['title']}</div>
                <div class="invoice-number">Nr. {$invoice['invoice_number']}</div>
                <div class="invoice-dates">
                    Data emiterii: {$invoice['invoice_date']}<br>
                    Data scadenței: {$invoice['due_date']}
                </div>
                <div class="status-badge {$statusClass}">{$statusText}</div>
            </div>
        </div>
    </div>

    <div class="parties">
        <div class="party-box">
            <div class="party-label">Furnizor / Prestator</div>
            <div class="party-name">{$company['name']}</div>
            <div class="party-details">
                <p><strong>CUI/CIF:</strong> {$companyCUI}</p>
                <p><strong>Reg. Com.:</strong> {$company['trade_register']}</p>
                <p><strong>Sediu:</strong> {$company['address']}</p>
                <p><strong>Cont IBAN:</strong> {$company['bank_account']}</p>
                <p><strong>Banca:</strong> {$company['bank_name']}</p>
            </div>
        </div>
        <div class="party-box">
            <div class="party-label">Client / Beneficiar</div>
            <div class="party-name">{$customer['name']}</div>
            <div class="party-details">
                <p><strong>CUI/CIF:</strong> {$customer['tax_id']}</p>
                <p><strong>Reg. Com.:</strong> {$customer['trade_register']}</p>
                <p><strong>Sediu:</strong> {$customer['address']}</p>
                <p><strong>Email:</strong> {$customer['email']}</p>
                <p><strong>Tel:</strong> {$customer['phone']}</p>
            </div>
        </div>
    </div>

    <table class="items">
        <thead>
            <tr>
                <th style="width: 5%;">Nr.</th>
                <th style="width: 40%;">Denumire produs/serviciu</th>
                <th style="width: 8%;">U.M.</th>
                <th style="width: 10%;">Cant.</th>
                <th style="width: 13%;">Preț unitar</th>
                <th style="width: 8%;">TVA</th>
                <th style="width: 16%;">Valoare</th>
            </tr>
        </thead>
        <tbody>
            {$data['line_items']}
        </tbody>
    </table>

    <div class="totals-section">
        <div class="notes-box">
            {$this->renderNotes($invoice)}
            {$this->renderPaymentInfo($company, $currency)}
        </div>
        <div class="totals-box">
            <table class="totals">
                <tr>
                    <td class="label">Subtotal (fără TVA):</td>
                    <td class="value">{$formatNumber($data['subtotal'])} {$currency}</td>
                </tr>
HTML;

        // Add discount row if applicable
        if ($data['discount'] > 0) {
            $html .= "
                <tr>
                    <td class='label'>Discount:</td>
                    <td class='value'>-{$formatNumber($data['discount'])} {$currency}</td>
                </tr>";
        }

        $html .= <<<HTML
                <tr>
                    <td class="label">TVA:</td>
                    <td class="value">{$formatNumber($data['vat_amount'])} {$currency}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">TOTAL DE PLATĂ:</td>
                    <td class="value">{$formatNumber($data['total'])} {$currency}</td>
                </tr>
HTML;

        // Add paid/due rows if there's a balance
        if ($data['paid'] > 0) {
            $html .= "
                <tr>
                    <td class='label'>Achitat:</td>
                    <td class='value'>{$formatNumber($data['paid'])} {$currency}</td>
                </tr>";
        }

        if ($data['due'] > 0 && $data['due'] != $data['total']) {
            $html .= "
                <tr class='due-row'>
                    <td class='label'>REST DE PLATĂ:</td>
                    <td class='value'>{$formatNumber($data['due'])} {$currency}</td>
                </tr>";
        }

        $html .= <<<HTML
            </table>
        </div>
    </div>

    <div class="footer">
        <div class="signatures">
            <div class="signature-box">
                <div class="signature-line">Semnătura și ștampila furnizorului</div>
            </div>
            <div class="signature-box">
                <div class="signature-line">Semnătura de primire</div>
            </div>
        </div>

        <div class="legal-text">
            {$config['footer']}
        </div>
    </div>
</body>
</html>
HTML;

        return $html;
    }

    /**
     * Render notes section
     */
    private function renderNotes(array $invoice): string {
        if (empty($invoice['notes'])) {
            return '';
        }

        return "
            <div class='notes'>
                <div class='notes-title'>Observații:</div>
                {$invoice['notes']}
            </div>
        ";
    }

    /**
     * Render payment info section
     */
    private function renderPaymentInfo(array $company, string $currency): string {
        if (empty($company['bank_account'])) {
            return '';
        }

        return "
            <div class='payment-info'>
                <div class='payment-title'>Informații de plată:</div>
                Cont IBAN: <strong>{$company['bank_account']}</strong><br>
                Banca: {$company['bank_name']}<br>
                Moneda: {$currency}
            </div>
        ";
    }

    /**
     * Generate Chitanta (Receipt) HTML
     */
    public function generateChitantaHTML(array $receipt): string {
        $config = $this->legalTexts['chitanta'];
        $currency = $receipt['currency'] ?? 'RON';

        $formatNumber = function($num) {
            return number_format((float)$num, 2, ',', '.');
        };

        $amount = (float)($receipt['amount'] ?? 0);
        $amountInWords = $this->numberToRomanianWords($amount) . ' ' . $currency;

        return <<<HTML
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <title>{$config['title']} - {$receipt['receipt_number']}</title>
    <style>
        @page { margin: 15mm; }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 11pt;
            color: #333;
        }
        .receipt-box {
            border: 2px solid #1a5276;
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #1a5276;
            padding-bottom: 15px;
            margin-bottom: 15px;
        }
        .company-name {
            font-size: 14pt;
            font-weight: bold;
            color: #1a5276;
        }
        .title {
            font-size: 18pt;
            font-weight: bold;
            color: #1a5276;
            margin: 15px 0;
        }
        .receipt-number {
            font-size: 12pt;
            font-weight: bold;
        }
        .content {
            margin: 20px 0;
            line-height: 1.8;
        }
        .amount-box {
            background: #f8f9fa;
            border: 1px solid #1a5276;
            padding: 15px;
            text-align: center;
            margin: 20px 0;
        }
        .amount {
            font-size: 20pt;
            font-weight: bold;
            color: #1a5276;
        }
        .amount-words {
            font-size: 10pt;
            font-style: italic;
            margin-top: 5px;
        }
        .signatures {
            display: table;
            width: 100%;
            margin-top: 30px;
        }
        .signature {
            display: table-cell;
            width: 50%;
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 40px;
            padding-top: 5px;
            font-size: 9pt;
        }
        .footer {
            font-size: 8pt;
            text-align: center;
            color: #666;
            margin-top: 20px;
            border-top: 1px solid #e9ecef;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="receipt-box">
        <div class="header">
            <div class="company-name">{$receipt['company_name']}</div>
            <div style="font-size: 9pt; color: #666;">
                CUI: {$receipt['company_tax_id']}<br>
                {$receipt['company_address']}
            </div>
            <div class="title">{$config['title']}</div>
            <div class="receipt-number">Nr. {$receipt['receipt_number']}</div>
            <div>Data: {$receipt['receipt_date']}</div>
        </div>

        <div class="content">
            <p>Am primit de la <strong>{$receipt['payer_name']}</strong></p>
            <p>cu sediul în {$receipt['payer_address']}</p>
            <p>CUI/CNP: {$receipt['payer_tax_id']}</p>
            <p>suma de:</p>
        </div>

        <div class="amount-box">
            <div class="amount">{$formatNumber($amount)} {$currency}</div>
            <div class="amount-words">adică: {$amountInWords}</div>
        </div>

        <div class="content">
            <p>reprezentând: <strong>{$receipt['description']}</strong></p>
        </div>

        <div class="signatures">
            <div class="signature">
                <div class="signature-line">Casier</div>
            </div>
            <div class="signature">
                <div class="signature-line">Primitor</div>
            </div>
        </div>

        <div class="footer">
            {$config['footer']}
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Generate Aviz de Insotire HTML
     */
    public function generateAvizHTML(array $delivery): string {
        $config = $this->legalTexts['aviz'];

        $lineItemsHTML = '';
        foreach ($delivery['items'] as $i => $item) {
            $lineItemsHTML .= "
                <tr>
                    <td class='center'>" . ($i + 1) . "</td>
                    <td>{$item['description']}</td>
                    <td class='center'>{$item['unit']}</td>
                    <td class='right'>" . number_format($item['quantity'], 2, ',', '.') . "</td>
                </tr>
            ";
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <title>{$config['title']} - {$delivery['aviz_number']}</title>
    <style>
        @page { margin: 15mm; }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10pt;
        }
        .header {
            border-bottom: 2px solid #1a5276;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .title {
            font-size: 16pt;
            font-weight: bold;
            color: #1a5276;
            text-align: center;
        }
        .parties {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .party {
            display: table-cell;
            width: 48%;
            vertical-align: top;
            padding: 10px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
        }
        .party-label {
            font-weight: bold;
            color: #1a5276;
            border-bottom: 1px solid #1a5276;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        table.items th {
            background: #1a5276;
            color: white;
            padding: 8px;
        }
        table.items td {
            padding: 8px;
            border-bottom: 1px solid #e9ecef;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .transport-info {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            margin-bottom: 20px;
        }
        .signatures {
            display: table;
            width: 100%;
            margin-top: 30px;
        }
        .signature {
            display: table-cell;
            width: 33%;
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 40px;
            padding-top: 5px;
            font-size: 9pt;
        }
        .footer {
            font-size: 8pt;
            text-align: center;
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">{$config['title']}</div>
        <div style="text-align: center;">
            Nr. {$delivery['aviz_number']} din {$delivery['aviz_date']}
        </div>
    </div>

    <div class="parties">
        <div class="party">
            <div class="party-label">Expeditor</div>
            <strong>{$delivery['sender_name']}</strong><br>
            CUI: {$delivery['sender_tax_id']}<br>
            {$delivery['sender_address']}
        </div>
        <div class="party">
            <div class="party-label">Destinatar</div>
            <strong>{$delivery['recipient_name']}</strong><br>
            CUI: {$delivery['recipient_tax_id']}<br>
            {$delivery['recipient_address']}
        </div>
    </div>

    <div class="transport-info">
        <strong>Informații Transport:</strong><br>
        Mijloc de transport: {$delivery['transport_vehicle']}<br>
        Nr. înmatriculare: {$delivery['vehicle_number']}<br>
        Delegat: {$delivery['delegate_name']} - {$delivery['delegate_id']}
    </div>

    <table class="items">
        <thead>
            <tr>
                <th style="width: 5%;">Nr.</th>
                <th style="width: 65%;">Denumire</th>
                <th style="width: 10%;">U.M.</th>
                <th style="width: 20%;">Cantitate</th>
            </tr>
        </thead>
        <tbody>
            {$lineItemsHTML}
        </tbody>
    </table>

    <div class="signatures">
        <div class="signature">
            <div class="signature-line">Expeditor</div>
        </div>
        <div class="signature">
            <div class="signature-line">Transportator</div>
        </div>
        <div class="signature">
            <div class="signature-line">Primitor</div>
        </div>
    </div>

    <div class="footer">
        {$config['footer']}
    </div>
</body>
</html>
HTML;
    }

    /**
     * Convert number to Romanian words
     */
    private function numberToRomanianWords(float $number): string {
        $ones = ['', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă'];
        $tens = ['', 'zece', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci', 'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci'];
        $teens = ['zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece'];

        $integer = floor($number);
        $decimal = round(($number - $integer) * 100);

        if ($integer == 0) {
            $words = 'zero';
        } elseif ($integer == 1) {
            $words = 'unu';
        } elseif ($integer < 20) {
            if ($integer < 10) {
                $words = $ones[$integer];
            } else {
                $words = $teens[$integer - 10];
            }
        } elseif ($integer < 100) {
            $t = floor($integer / 10);
            $o = $integer % 10;
            $words = $tens[$t];
            if ($o > 0) {
                $words .= ' și ' . $ones[$o];
            }
        } elseif ($integer < 1000) {
            $h = floor($integer / 100);
            $r = $integer % 100;
            if ($h == 1) {
                $words = 'o sută';
            } elseif ($h == 2) {
                $words = 'două sute';
            } else {
                $words = $ones[$h] . ' sute';
            }
            if ($r > 0) {
                $words .= ' ' . $this->numberToRomanianWords($r);
            }
        } elseif ($integer < 1000000) {
            $th = floor($integer / 1000);
            $r = $integer % 1000;
            if ($th == 1) {
                $words = 'o mie';
            } elseif ($th == 2) {
                $words = 'două mii';
            } else {
                $words = $this->numberToRomanianWords($th) . ' mii';
            }
            if ($r > 0) {
                $words .= ' ' . $this->numberToRomanianWords($r);
            }
        } else {
            $words = number_format($integer, 0, '', '.');
        }

        if ($decimal > 0) {
            $words .= ' și ' . $decimal . '/100';
        }

        return $words;
    }

    /**
     * Get company invoice settings
     */
    public function getCompanySettings(string $companyId): ?array {
        $sql = "SELECT * FROM invoice_settings WHERE company_id = :company_id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['company_id' => $companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Save company invoice settings
     */
    public function saveCompanySettings(string $companyId, array $settings): bool {
        $sql = "
            INSERT INTO invoice_settings (company_id, default_template_type, invoice_prefix, auto_number,
                next_invoice_number, default_payment_terms, default_notes, header_image_path,
                show_bank_details, primary_color, updated_at)
            VALUES (:company_id, :template_type, :prefix, :auto_number, :next_number, :payment_terms,
                :notes, :header_image, :show_bank, :color, NOW())
            ON CONFLICT (company_id) DO UPDATE SET
                default_template_type = EXCLUDED.default_template_type,
                invoice_prefix = EXCLUDED.invoice_prefix,
                auto_number = EXCLUDED.auto_number,
                next_invoice_number = EXCLUDED.next_invoice_number,
                default_payment_terms = EXCLUDED.default_payment_terms,
                default_notes = EXCLUDED.default_notes,
                header_image_path = EXCLUDED.header_image_path,
                show_bank_details = EXCLUDED.show_bank_details,
                primary_color = EXCLUDED.primary_color,
                updated_at = NOW()
        ";

        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            'company_id' => $companyId,
            'template_type' => $settings['default_template_type'] ?? 'factura',
            'prefix' => $settings['invoice_prefix'] ?? 'FCT',
            'auto_number' => $settings['auto_number'] ?? true,
            'next_number' => $settings['next_invoice_number'] ?? 1,
            'payment_terms' => $settings['default_payment_terms'] ?? 30,
            'notes' => $settings['default_notes'] ?? null,
            'header_image' => $settings['header_image_path'] ?? null,
            'show_bank' => $settings['show_bank_details'] ?? true,
            'color' => $settings['primary_color'] ?? '#1a5276'
        ]);
    }
}
