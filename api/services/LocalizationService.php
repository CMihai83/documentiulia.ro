<?php
/**
 * Localization Service
 * Handles German, Italian, and Spanish market localizations
 */

require_once __DIR__ . '/../config/Database.php';

class LocalizationService {
    private static ?LocalizationService $instance = null;
    private PDO $pdo;

    // German SKR03/SKR04 Chart of Accounts
    private array $germanSKR03 = [
        // Assets (Aktiva)
        ['code' => '0010', 'name' => 'Grundstücke und grundstücksgleiche Rechte', 'name_en' => 'Land and similar rights', 'type' => 'asset', 'category' => 'fixed_assets'],
        ['code' => '0027', 'name' => 'Gebäude auf fremden Grundstücken', 'name_en' => 'Buildings on third-party land', 'type' => 'asset', 'category' => 'fixed_assets'],
        ['code' => '0200', 'name' => 'Technische Anlagen und Maschinen', 'name_en' => 'Technical equipment and machines', 'type' => 'asset', 'category' => 'fixed_assets'],
        ['code' => '0400', 'name' => 'Andere Anlagen, Betriebs- und Geschäftsausstattung', 'name_en' => 'Other equipment, operating and office equipment', 'type' => 'asset', 'category' => 'fixed_assets'],
        ['code' => '0650', 'name' => 'EDV-Software', 'name_en' => 'Software', 'type' => 'asset', 'category' => 'intangible_assets'],
        ['code' => '1000', 'name' => 'Kasse', 'name_en' => 'Cash', 'type' => 'asset', 'category' => 'current_assets'],
        ['code' => '1200', 'name' => 'Bank', 'name_en' => 'Bank accounts', 'type' => 'asset', 'category' => 'current_assets'],
        ['code' => '1400', 'name' => 'Forderungen aus Lieferungen und Leistungen', 'name_en' => 'Trade receivables', 'type' => 'asset', 'category' => 'current_assets'],
        ['code' => '1600', 'name' => 'Sonstige Vermögensgegenstände', 'name_en' => 'Other assets', 'type' => 'asset', 'category' => 'current_assets'],
        ['code' => '1800', 'name' => 'Geleistete Anzahlungen', 'name_en' => 'Advance payments made', 'type' => 'asset', 'category' => 'current_assets'],

        // Liabilities (Passiva)
        ['code' => '0800', 'name' => 'Gezeichnetes Kapital', 'name_en' => 'Share capital', 'type' => 'equity', 'category' => 'equity'],
        ['code' => '0860', 'name' => 'Kapitalrücklage', 'name_en' => 'Capital reserves', 'type' => 'equity', 'category' => 'equity'],
        ['code' => '0880', 'name' => 'Gewinnvortrag/Verlustvortrag', 'name_en' => 'Profit/loss carried forward', 'type' => 'equity', 'category' => 'equity'],
        ['code' => '3300', 'name' => 'Verbindlichkeiten aus Lieferungen und Leistungen', 'name_en' => 'Trade payables', 'type' => 'liability', 'category' => 'current_liabilities'],
        ['code' => '3400', 'name' => 'Verbindlichkeiten gegenüber Kreditinstituten', 'name_en' => 'Bank loans', 'type' => 'liability', 'category' => 'long_term_liabilities'],
        ['code' => '3500', 'name' => 'Erhaltene Anzahlungen', 'name_en' => 'Advance payments received', 'type' => 'liability', 'category' => 'current_liabilities'],
        ['code' => '1776', 'name' => 'Umsatzsteuer 19%', 'name_en' => 'VAT 19%', 'type' => 'liability', 'category' => 'current_liabilities'],
        ['code' => '1571', 'name' => 'Vorsteuer 19%', 'name_en' => 'Input VAT 19%', 'type' => 'asset', 'category' => 'current_assets'],

        // Revenue (Erlöse)
        ['code' => '8400', 'name' => 'Erlöse aus Lieferungen und Leistungen 19% USt', 'name_en' => 'Revenue 19% VAT', 'type' => 'revenue', 'category' => 'operating_revenue'],
        ['code' => '8300', 'name' => 'Erlöse aus Lieferungen und Leistungen 7% USt', 'name_en' => 'Revenue 7% VAT', 'type' => 'revenue', 'category' => 'operating_revenue'],
        ['code' => '8100', 'name' => 'Steuerfreie Umsätze § 4 Nr. 1a UStG', 'name_en' => 'Tax-exempt sales (exports)', 'type' => 'revenue', 'category' => 'operating_revenue'],
        ['code' => '8120', 'name' => 'Steuerfreie innergemeinschaftliche Lieferungen', 'name_en' => 'Tax-exempt intra-EU supplies', 'type' => 'revenue', 'category' => 'operating_revenue'],

        // Expenses (Aufwendungen)
        ['code' => '4000', 'name' => 'Wareneinkauf', 'name_en' => 'Purchase of goods', 'type' => 'expense', 'category' => 'cost_of_sales'],
        ['code' => '4100', 'name' => 'Fremdleistungen', 'name_en' => 'External services', 'type' => 'expense', 'category' => 'cost_of_sales'],
        ['code' => '4200', 'name' => 'Gehälter', 'name_en' => 'Salaries', 'type' => 'expense', 'category' => 'personnel_costs'],
        ['code' => '4120', 'name' => 'Löhne', 'name_en' => 'Wages', 'type' => 'expense', 'category' => 'personnel_costs'],
        ['code' => '4130', 'name' => 'Sozialabgaben', 'name_en' => 'Social security contributions', 'type' => 'expense', 'category' => 'personnel_costs'],
        ['code' => '4210', 'name' => 'Miete', 'name_en' => 'Rent', 'type' => 'expense', 'category' => 'operating_expenses'],
        ['code' => '4240', 'name' => 'Telefon', 'name_en' => 'Telephone', 'type' => 'expense', 'category' => 'operating_expenses'],
        ['code' => '4250', 'name' => 'Porto', 'name_en' => 'Postage', 'type' => 'expense', 'category' => 'operating_expenses'],
        ['code' => '4260', 'name' => 'Bürobedarf', 'name_en' => 'Office supplies', 'type' => 'expense', 'category' => 'operating_expenses'],
        ['code' => '4830', 'name' => 'Abschreibungen auf Sachanlagen', 'name_en' => 'Depreciation on fixed assets', 'type' => 'expense', 'category' => 'depreciation'],
    ];

    // German VAT rates and rules
    private array $germanVATRules = [
        'standard_rate' => 19,
        'reduced_rate' => 7,
        'zero_rate_exports' => true,
        'reverse_charge_threshold' => 0, // Always for B2B intra-EU
        'small_business_threshold' => 22000, // Kleinunternehmerregelung § 19 UStG
        'vat_advance_filing' => ['monthly', 'quarterly'], // Based on previous year's VAT
        'filing_deadlines' => [
            'vat_advance' => 10, // Days after month/quarter end
            'annual_return' => 'may_31', // Following year
        ],
    ];

    // German invoice requirements
    private array $germanInvoiceRequirements = [
        'required_fields' => [
            'invoice_number' => 'Rechnungsnummer',
            'invoice_date' => 'Rechnungsdatum',
            'supplier_name' => 'Name und Anschrift des leistenden Unternehmers',
            'supplier_address' => 'Anschrift',
            'supplier_tax_id' => 'Steuernummer oder USt-IdNr.',
            'customer_name' => 'Name des Leistungsempfängers',
            'customer_address' => 'Anschrift des Leistungsempfängers',
            'delivery_date' => 'Zeitpunkt der Lieferung/Leistung',
            'description' => 'Menge und handelsübliche Bezeichnung',
            'net_amount' => 'Nettobetrag',
            'vat_rate' => 'Steuersatz',
            'vat_amount' => 'Steuerbetrag',
            'gross_amount' => 'Bruttobetrag',
        ],
        'small_invoice_threshold' => 250, // EUR - simplified invoice allowed
        'retention_period' => 10, // Years
        'electronic_format' => 'ZUGFeRD', // Or XRechnung for B2G
    ];

    private function __construct() {
        $database = Database::getInstance();
        $this->pdo = $database->getConnection();
    }

    public static function getInstance(): LocalizationService {
        if (self::$instance === null) {
            self::$instance = new LocalizationService();
        }
        return self::$instance;
    }

    /**
     * Get German SKR03 Chart of Accounts
     */
    public function getGermanChartOfAccounts(string $framework = 'SKR03'): array {
        return [
            'framework' => $framework,
            'country' => 'DE',
            'accounts' => $this->germanSKR03,
            'total_accounts' => count($this->germanSKR03),
        ];
    }

    /**
     * Get German VAT rules
     */
    public function getGermanVATRules(): array {
        return $this->germanVATRules;
    }

    /**
     * Get German invoice requirements
     */
    public function getGermanInvoiceRequirements(): array {
        return $this->germanInvoiceRequirements;
    }

    /**
     * Check if company qualifies for Kleinunternehmerregelung (small business exemption)
     */
    public function checkSmallBusinessExemption(float $previousYearRevenue, float $currentYearEstimate): array {
        $threshold = $this->germanVATRules['small_business_threshold'];
        $qualifies = $previousYearRevenue <= $threshold && $currentYearEstimate <= 50000;

        return [
            'qualifies' => $qualifies,
            'threshold_previous_year' => $threshold,
            'threshold_current_year' => 50000,
            'previous_year_revenue' => $previousYearRevenue,
            'current_year_estimate' => $currentYearEstimate,
            'note' => $qualifies
                ? 'Eligible for Kleinunternehmerregelung § 19 UStG - no VAT charged, no input VAT deduction'
                : 'Must charge and remit VAT'
        ];
    }

    /**
     * Generate ZUGFeRD XML for invoice (German e-invoicing standard)
     */
    public function generateZUGFeRDXML(array $invoice): string {
        $xml = new DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = true;

        // Create root element with namespaces
        $root = $xml->createElementNS(
            'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
            'rsm:CrossIndustryInvoice'
        );
        $root->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:qdt', 'urn:un:unece:uncefact:data:standard:QualifiedDataType:100');
        $root->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:ram', 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100');
        $root->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:udt', 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100');
        $xml->appendChild($root);

        // ExchangedDocumentContext
        $context = $xml->createElement('rsm:ExchangedDocumentContext');
        $guideline = $xml->createElement('ram:GuidelineSpecifiedDocumentContextParameter');
        $guidelineId = $xml->createElement('ram:ID', 'urn:cen.eu:en16931:2017#conformant#urn:zugferd.de:2p1:extended');
        $guideline->appendChild($guidelineId);
        $context->appendChild($guideline);
        $root->appendChild($context);

        // ExchangedDocument
        $document = $xml->createElement('rsm:ExchangedDocument');
        $document->appendChild($xml->createElement('ram:ID', $invoice['invoice_number'] ?? 'INV-001'));
        $document->appendChild($xml->createElement('ram:TypeCode', '380')); // Commercial invoice

        $issueDate = $xml->createElement('ram:IssueDateTime');
        $dateTime = $xml->createElement('udt:DateTimeString', date('Ymd', strtotime($invoice['invoice_date'] ?? 'now')));
        $dateTime->setAttribute('format', '102');
        $issueDate->appendChild($dateTime);
        $document->appendChild($issueDate);
        $root->appendChild($document);

        // SupplyChainTradeTransaction
        $transaction = $xml->createElement('rsm:SupplyChainTradeTransaction');

        // Trade Agreement
        $agreement = $xml->createElement('ram:ApplicableHeaderTradeAgreement');

        // Seller
        $seller = $xml->createElement('ram:SellerTradeParty');
        $seller->appendChild($xml->createElement('ram:Name', $invoice['supplier_name'] ?? 'Supplier'));
        $agreement->appendChild($seller);

        // Buyer
        $buyer = $xml->createElement('ram:BuyerTradeParty');
        $buyer->appendChild($xml->createElement('ram:Name', $invoice['customer_name'] ?? 'Customer'));
        $agreement->appendChild($buyer);

        $transaction->appendChild($agreement);

        // Trade Settlement
        $settlement = $xml->createElement('ram:ApplicableHeaderTradeSettlement');
        $settlement->appendChild($xml->createElement('ram:InvoiceCurrencyCode', $invoice['currency'] ?? 'EUR'));

        // Tax summary
        $tax = $xml->createElement('ram:ApplicableTradeTax');
        $tax->appendChild($xml->createElement('ram:CalculatedAmount', number_format($invoice['vat_amount'] ?? 0, 2, '.', '')));
        $tax->appendChild($xml->createElement('ram:TypeCode', 'VAT'));
        $tax->appendChild($xml->createElement('ram:BasisAmount', number_format($invoice['net_amount'] ?? 0, 2, '.', '')));
        $tax->appendChild($xml->createElement('ram:CategoryCode', 'S'));
        $tax->appendChild($xml->createElement('ram:RateApplicablePercent', $invoice['vat_rate'] ?? 19));
        $settlement->appendChild($tax);

        // Totals
        $totals = $xml->createElement('ram:SpecifiedTradeSettlementHeaderMonetarySummation');
        $totals->appendChild($xml->createElement('ram:LineTotalAmount', number_format($invoice['net_amount'] ?? 0, 2, '.', '')));
        $totals->appendChild($xml->createElement('ram:TaxBasisTotalAmount', number_format($invoice['net_amount'] ?? 0, 2, '.', '')));
        $totals->appendChild($xml->createElement('ram:TaxTotalAmount', number_format($invoice['vat_amount'] ?? 0, 2, '.', '')));
        $totals->appendChild($xml->createElement('ram:GrandTotalAmount', number_format($invoice['gross_amount'] ?? 0, 2, '.', '')));
        $totals->appendChild($xml->createElement('ram:DuePayableAmount', number_format($invoice['gross_amount'] ?? 0, 2, '.', '')));
        $settlement->appendChild($totals);

        $transaction->appendChild($settlement);
        $root->appendChild($transaction);

        return $xml->saveXML();
    }

    /**
     * Get German VAT filing schedule
     */
    public function getVATFilingSchedule(float $previousYearVAT): array {
        // Determine filing frequency based on previous year's VAT
        if ($previousYearVAT > 7500) {
            $frequency = 'monthly';
        } elseif ($previousYearVAT > 1000) {
            $frequency = 'quarterly';
        } else {
            $frequency = 'annual';
        }

        $year = (int)date('Y');
        $deadlines = [];

        if ($frequency === 'monthly') {
            for ($month = 1; $month <= 12; $month++) {
                $deadlines[] = [
                    'period' => sprintf('%d-%02d', $year, $month),
                    'due_date' => date('Y-m-d', strtotime(sprintf('%d-%02d-10', $year, $month + 1))),
                    'type' => 'UStVA', // Umsatzsteuer-Voranmeldung
                ];
            }
        } elseif ($frequency === 'quarterly') {
            for ($quarter = 1; $quarter <= 4; $quarter++) {
                $deadlines[] = [
                    'period' => sprintf('%d-Q%d', $year, $quarter),
                    'due_date' => date('Y-m-d', strtotime(sprintf('%d-%02d-10', $year, $quarter * 3 + 1))),
                    'type' => 'UStVA',
                ];
            }
        }

        // Annual return always required
        $deadlines[] = [
            'period' => (string)$year,
            'due_date' => sprintf('%d-05-31', $year + 1),
            'type' => 'USt', // Umsatzsteuererklärung
        ];

        return [
            'frequency' => $frequency,
            'previous_year_vat' => $previousYearVAT,
            'deadlines' => $deadlines,
        ];
    }

    /**
     * Map account to German SKR03
     */
    public function mapToSKR03(string $accountType, ?string $category = null): ?array {
        foreach ($this->germanSKR03 as $account) {
            if ($account['type'] === $accountType) {
                if ($category === null || $account['category'] === $category) {
                    return $account;
                }
            }
        }
        return null;
    }

    /**
     * Get localization for a specific country
     */
    public function getLocalization(string $countryCode): array {
        $countryCode = strtoupper($countryCode);

        switch ($countryCode) {
            case 'DE':
                return [
                    'country' => 'Germany',
                    'country_code' => 'DE',
                    'currency' => 'EUR',
                    'language' => 'de',
                    'chart_of_accounts' => 'SKR03',
                    'vat_rules' => $this->germanVATRules,
                    'invoice_requirements' => $this->germanInvoiceRequirements,
                    'e_invoicing_format' => 'ZUGFeRD/XRechnung',
                    'fiscal_year' => 'calendar_year',
                    'date_format' => 'DD.MM.YYYY',
                    'number_format' => ['decimal' => ',', 'thousands' => '.'],
                ];

            case 'IT':
                return [
                    'country' => 'Italy',
                    'country_code' => 'IT',
                    'currency' => 'EUR',
                    'language' => 'it',
                    'chart_of_accounts' => 'Piano dei Conti',
                    'vat_rules' => [
                        'standard_rate' => 22,
                        'reduced_rates' => [10, 5, 4],
                        'e_invoicing_mandatory' => true,
                        'sdi_code_required' => true,
                    ],
                    'invoice_requirements' => [
                        'format' => 'FatturaPA',
                        'electronic_mandatory' => true,
                        'sdi_transmission' => true,
                    ],
                    'e_invoicing_format' => 'FatturaPA (XML)',
                    'fiscal_year' => 'calendar_year',
                    'date_format' => 'DD/MM/YYYY',
                    'number_format' => ['decimal' => ',', 'thousands' => '.'],
                ];

            case 'ES':
                return [
                    'country' => 'Spain',
                    'country_code' => 'ES',
                    'currency' => 'EUR',
                    'language' => 'es',
                    'chart_of_accounts' => 'PGC 2007',
                    'vat_rules' => [
                        'standard_rate' => 21,
                        'reduced_rates' => [10, 4],
                        'sii_required' => true, // Suministro Inmediato de Información
                    ],
                    'invoice_requirements' => [
                        'sii_registration' => true,
                        'real_time_reporting' => true,
                    ],
                    'e_invoicing_format' => 'Facturae',
                    'fiscal_year' => 'calendar_year',
                    'date_format' => 'DD/MM/YYYY',
                    'number_format' => ['decimal' => ',', 'thousands' => '.'],
                ];

            default:
                return [
                    'country_code' => $countryCode,
                    'error' => 'Localization not available for this country',
                    'supported_countries' => ['DE', 'IT', 'ES'],
                ];
        }
    }

    /**
     * Get all supported localizations
     */
    public function getSupportedLocalizations(): array {
        return [
            ['code' => 'DE', 'name' => 'Germany', 'status' => 'full'],
            ['code' => 'IT', 'name' => 'Italy', 'status' => 'partial'],
            ['code' => 'ES', 'name' => 'Spain', 'status' => 'partial'],
        ];
    }
}
