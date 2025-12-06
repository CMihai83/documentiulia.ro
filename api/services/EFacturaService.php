<?php
/**
 * e-Factura Service
 * Generates UBL 2.1 XML invoices for Romanian ANAF e-Factura system
 *
 * ANAF e-Factura API Documentation:
 * https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_digitalizare/e.factura
 */

require_once __DIR__ . '/../config/database.php';

class EFacturaService {
    private static ?EFacturaService $instance = null;
    private PDO $pdo;

    // ANAF API endpoints
    private const ANAF_PROD_URL = 'https://api.anaf.ro/prod/FCTEL/rest';
    private const ANAF_TEST_URL = 'https://api.anaf.ro/test/FCTEL/rest';

    // UBL 2.1 namespaces
    private const UBL_NS = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
    private const CAC_NS = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
    private const CBC_NS = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): EFacturaService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Generate UBL 2.1 XML for an invoice
     */
    public function generateXML(string $invoiceId): string {
        // Fetch invoice with company and customer details
        $invoice = $this->getInvoiceWithDetails($invoiceId);

        if (!$invoice) {
            throw new Exception('Invoice not found');
        }

        // Create XML document
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;

        // Create root Invoice element
        $invoiceEl = $dom->createElementNS(self::UBL_NS, 'Invoice');
        $invoiceEl->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:cac', self::CAC_NS);
        $invoiceEl->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:cbc', self::CBC_NS);
        $dom->appendChild($invoiceEl);

        // CustomizationID (CIUS-RO for Romania)
        $this->addElement($dom, $invoiceEl, 'cbc:CustomizationID', 'urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1');

        // ProfileID
        $this->addElement($dom, $invoiceEl, 'cbc:ProfileID', 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0');

        // Invoice ID and dates
        $this->addElement($dom, $invoiceEl, 'cbc:ID', $invoice['invoice_number']);
        $this->addElement($dom, $invoiceEl, 'cbc:IssueDate', $invoice['invoice_date']);
        $this->addElement($dom, $invoiceEl, 'cbc:DueDate', $invoice['due_date']);

        // Invoice type code (380 = Commercial invoice)
        $invoiceTypeCode = $this->getInvoiceTypeCode($invoice['invoice_type'] ?? 'standard');
        $this->addElement($dom, $invoiceEl, 'cbc:InvoiceTypeCode', $invoiceTypeCode);

        // Currency
        $this->addElement($dom, $invoiceEl, 'cbc:DocumentCurrencyCode', $invoice['currency'] ?? 'RON');

        // Notes
        if (!empty($invoice['notes'])) {
            $this->addElement($dom, $invoiceEl, 'cbc:Note', $invoice['notes']);
        }

        // Supplier Party (AccountingSupplierParty)
        $this->addSupplierParty($dom, $invoiceEl, $invoice);

        // Customer Party (AccountingCustomerParty)
        $this->addCustomerParty($dom, $invoiceEl, $invoice);

        // Payment Means
        $this->addPaymentMeans($dom, $invoiceEl, $invoice);

        // Payment Terms
        $this->addPaymentTerms($dom, $invoiceEl, $invoice);

        // Tax Total
        $this->addTaxTotal($dom, $invoiceEl, $invoice);

        // Legal Monetary Total
        $this->addLegalMonetaryTotal($dom, $invoiceEl, $invoice);

        // Invoice Lines
        $this->addInvoiceLines($dom, $invoiceEl, $invoice);

        return $dom->saveXML();
    }

    /**
     * Get invoice with all necessary details
     */
    private function getInvoiceWithDetails(string $invoiceId): ?array {
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
                ct.vat_registered as customer_vat_registered,
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
            WHERE i.id = :id
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id' => $invoiceId]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($invoice) {
            // Get line items
            $linesSql = "
                SELECT * FROM invoice_line_items
                WHERE invoice_id = :invoice_id
                ORDER BY line_number
            ";
            $linesStmt = $this->pdo->prepare($linesSql);
            $linesStmt->execute(['invoice_id' => $invoiceId]);
            $invoice['line_items'] = $linesStmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate totals if not set
            if (empty($invoice['subtotal'])) {
                $subtotal = 0;
                $vatTotal = 0;
                foreach ($invoice['line_items'] as $line) {
                    $subtotal += (float)$line['amount'];
                    $vatTotal += (float)($line['vat_amount'] ?? $line['amount'] * 0.19);
                }
                $invoice['subtotal'] = $subtotal;
                $invoice['vat_amount'] = $vatTotal;
            }
        }

        return $invoice;
    }

    /**
     * Add supplier party (seller) to XML
     */
    private function addSupplierParty(DOMDocument $dom, DOMElement $parent, array $invoice): void {
        $supplier = $dom->createElementNS(self::CAC_NS, 'cac:AccountingSupplierParty');
        $party = $dom->createElementNS(self::CAC_NS, 'cac:Party');

        // Endpoint ID (CUI)
        if (!empty($invoice['company_tax_id'])) {
            $endpoint = $dom->createElementNS(self::CBC_NS, 'cbc:EndpointID', $this->cleanCUI($invoice['company_tax_id']));
            $endpoint->setAttribute('schemeID', '9947');
            $party->appendChild($endpoint);
        }

        // Party Identification
        $partyId = $dom->createElementNS(self::CAC_NS, 'cac:PartyIdentification');
        $id = $dom->createElementNS(self::CBC_NS, 'cbc:ID', $this->cleanCUI($invoice['company_tax_id']));
        $id->setAttribute('schemeID', '9947');
        $partyId->appendChild($id);
        $party->appendChild($partyId);

        // Party Name
        $partyName = $dom->createElementNS(self::CAC_NS, 'cac:PartyName');
        $this->addElement($dom, $partyName, 'cbc:Name', $invoice['company_legal_name'] ?? $invoice['company_name']);
        $party->appendChild($partyName);

        // Postal Address
        $this->addPostalAddress($dom, $party, [
            'street' => $invoice['company_street'],
            'city' => $invoice['company_city'],
            'county' => $invoice['company_county'],
            'postal_code' => $invoice['company_postal_code'],
            'country' => $invoice['company_country'] ?? 'RO'
        ]);

        // Tax Scheme (VAT)
        $this->addPartyTaxScheme($dom, $party, $invoice['company_tax_id'], $invoice['company_vat_registered']);

        // Legal Entity
        $this->addPartyLegalEntity($dom, $party,
            $invoice['company_legal_name'] ?? $invoice['company_name'],
            $invoice['company_trade_register']
        );

        // Contact
        if (!empty($invoice['company_email']) || !empty($invoice['company_phone'])) {
            $contact = $dom->createElementNS(self::CAC_NS, 'cac:Contact');
            if (!empty($invoice['company_phone'])) {
                $this->addElement($dom, $contact, 'cbc:Telephone', $invoice['company_phone']);
            }
            if (!empty($invoice['company_email'])) {
                $this->addElement($dom, $contact, 'cbc:ElectronicMail', $invoice['company_email']);
            }
            $party->appendChild($contact);
        }

        $supplier->appendChild($party);
        $parent->appendChild($supplier);
    }

    /**
     * Add customer party (buyer) to XML
     */
    private function addCustomerParty(DOMDocument $dom, DOMElement $parent, array $invoice): void {
        $customer = $dom->createElementNS(self::CAC_NS, 'cac:AccountingCustomerParty');
        $party = $dom->createElementNS(self::CAC_NS, 'cac:Party');

        // Endpoint ID
        if (!empty($invoice['customer_tax_id'])) {
            $endpoint = $dom->createElementNS(self::CBC_NS, 'cbc:EndpointID', $this->cleanCUI($invoice['customer_tax_id']));
            $endpoint->setAttribute('schemeID', '9947');
            $party->appendChild($endpoint);
        }

        // Party Identification
        if (!empty($invoice['customer_tax_id'])) {
            $partyId = $dom->createElementNS(self::CAC_NS, 'cac:PartyIdentification');
            $id = $dom->createElementNS(self::CBC_NS, 'cbc:ID', $this->cleanCUI($invoice['customer_tax_id']));
            $id->setAttribute('schemeID', '9947');
            $partyId->appendChild($id);
            $party->appendChild($partyId);
        }

        // Party Name
        $partyName = $dom->createElementNS(self::CAC_NS, 'cac:PartyName');
        $this->addElement($dom, $partyName, 'cbc:Name', $invoice['customer_name']);
        $party->appendChild($partyName);

        // Postal Address
        $this->addPostalAddress($dom, $party, [
            'street' => $invoice['customer_street'],
            'city' => $invoice['customer_city'],
            'county' => $invoice['customer_county'],
            'postal_code' => $invoice['customer_postal_code'],
            'country' => $invoice['customer_country'] ?? 'RO'
        ]);

        // Tax Scheme
        if (!empty($invoice['customer_tax_id'])) {
            $this->addPartyTaxScheme($dom, $party, $invoice['customer_tax_id'], $invoice['customer_vat_registered']);
        }

        // Legal Entity
        $this->addPartyLegalEntity($dom, $party,
            $invoice['customer_name'],
            $invoice['customer_trade_register']
        );

        // Contact
        if (!empty($invoice['customer_email']) || !empty($invoice['customer_phone'])) {
            $contact = $dom->createElementNS(self::CAC_NS, 'cac:Contact');
            if (!empty($invoice['customer_phone'])) {
                $this->addElement($dom, $contact, 'cbc:Telephone', $invoice['customer_phone']);
            }
            if (!empty($invoice['customer_email'])) {
                $this->addElement($dom, $contact, 'cbc:ElectronicMail', $invoice['customer_email']);
            }
            $party->appendChild($contact);
        }

        $customer->appendChild($party);
        $parent->appendChild($customer);
    }

    /**
     * Add postal address to party
     */
    private function addPostalAddress(DOMDocument $dom, DOMElement $party, array $address): void {
        $postal = $dom->createElementNS(self::CAC_NS, 'cac:PostalAddress');

        if (!empty($address['street'])) {
            $this->addElement($dom, $postal, 'cbc:StreetName', $address['street']);
        }
        if (!empty($address['city'])) {
            $this->addElement($dom, $postal, 'cbc:CityName', $address['city']);
        }
        if (!empty($address['postal_code'])) {
            $this->addElement($dom, $postal, 'cbc:PostalZone', $address['postal_code']);
        }
        if (!empty($address['county'])) {
            $this->addElement($dom, $postal, 'cbc:CountrySubentity', $address['county']);
        }

        // Country
        $country = $dom->createElementNS(self::CAC_NS, 'cac:Country');
        $this->addElement($dom, $country, 'cbc:IdentificationCode', $address['country'] ?? 'RO');
        $postal->appendChild($country);

        $party->appendChild($postal);
    }

    /**
     * Add tax scheme to party
     */
    private function addPartyTaxScheme(DOMDocument $dom, DOMElement $party, ?string $taxId, ?bool $vatRegistered): void {
        $taxScheme = $dom->createElementNS(self::CAC_NS, 'cac:PartyTaxScheme');

        // Prepend RO for VAT registered Romanian companies
        $companyId = $this->cleanCUI($taxId);
        if ($vatRegistered && !str_starts_with(strtoupper($companyId), 'RO')) {
            $companyId = 'RO' . $companyId;
        }

        $this->addElement($dom, $taxScheme, 'cbc:CompanyID', $companyId);

        $scheme = $dom->createElementNS(self::CAC_NS, 'cac:TaxScheme');
        $this->addElement($dom, $scheme, 'cbc:ID', 'VAT');
        $taxScheme->appendChild($scheme);

        $party->appendChild($taxScheme);
    }

    /**
     * Add legal entity to party
     */
    private function addPartyLegalEntity(DOMDocument $dom, DOMElement $party, ?string $name, ?string $regNumber): void {
        $legal = $dom->createElementNS(self::CAC_NS, 'cac:PartyLegalEntity');
        $this->addElement($dom, $legal, 'cbc:RegistrationName', $name ?? 'N/A');

        if (!empty($regNumber)) {
            $this->addElement($dom, $legal, 'cbc:CompanyID', $regNumber);
        }

        $party->appendChild($legal);
    }

    /**
     * Add payment means
     */
    private function addPaymentMeans(DOMDocument $dom, DOMElement $parent, array $invoice): void {
        $paymentMeans = $dom->createElementNS(self::CAC_NS, 'cac:PaymentMeans');

        $paymentCode = $this->getPaymentMeansCode($invoice['payment_method'] ?? 'transfer');
        $this->addElement($dom, $paymentMeans, 'cbc:PaymentMeansCode', $paymentCode);

        // Bank account info
        if (!empty($invoice['company_bank_account'])) {
            $payeeFinancial = $dom->createElementNS(self::CAC_NS, 'cac:PayeeFinancialAccount');
            $this->addElement($dom, $payeeFinancial, 'cbc:ID', $invoice['company_bank_account']);

            if (!empty($invoice['company_bank_name'])) {
                $branch = $dom->createElementNS(self::CAC_NS, 'cac:FinancialInstitutionBranch');
                $this->addElement($dom, $branch, 'cbc:Name', $invoice['company_bank_name']);
                $payeeFinancial->appendChild($branch);
            }

            $paymentMeans->appendChild($payeeFinancial);
        }

        $parent->appendChild($paymentMeans);
    }

    /**
     * Add payment terms
     */
    private function addPaymentTerms(DOMDocument $dom, DOMElement $parent, array $invoice): void {
        $paymentTerms = $dom->createElementNS(self::CAC_NS, 'cac:PaymentTerms');

        $dueDate = new DateTime($invoice['due_date']);
        $issueDate = new DateTime($invoice['invoice_date']);
        $daysDiff = $dueDate->diff($issueDate)->days;

        $noteText = "Scadent in {$daysDiff} zile de la data emiterii";
        $this->addElement($dom, $paymentTerms, 'cbc:Note', $noteText);

        $parent->appendChild($paymentTerms);
    }

    /**
     * Add tax total section
     */
    private function addTaxTotal(DOMDocument $dom, DOMElement $parent, array $invoice): void {
        $taxTotal = $dom->createElementNS(self::CAC_NS, 'cac:TaxTotal');

        // Tax amount
        $taxAmount = $dom->createElementNS(self::CBC_NS, 'cbc:TaxAmount', number_format((float)$invoice['vat_amount'], 2, '.', ''));
        $taxAmount->setAttribute('currencyID', $invoice['currency'] ?? 'RON');
        $taxTotal->appendChild($taxAmount);

        // Group by VAT rate
        $vatGroups = [];
        foreach ($invoice['line_items'] as $line) {
            $vatRate = (float)($line['vat_rate'] ?? 19);
            $vatCode = $line['vat_code'] ?? 'S';
            $key = $vatRate . '_' . $vatCode;

            if (!isset($vatGroups[$key])) {
                $vatGroups[$key] = [
                    'rate' => $vatRate,
                    'code' => $vatCode,
                    'taxable' => 0,
                    'tax' => 0
                ];
            }
            $vatGroups[$key]['taxable'] += (float)$line['amount'];
            $vatGroups[$key]['tax'] += (float)($line['vat_amount'] ?? $line['amount'] * $vatRate / 100);
        }

        // Add subtotal for each VAT rate
        foreach ($vatGroups as $group) {
            $taxSubtotal = $dom->createElementNS(self::CAC_NS, 'cac:TaxSubtotal');

            $taxableAmount = $dom->createElementNS(self::CBC_NS, 'cbc:TaxableAmount', number_format($group['taxable'], 2, '.', ''));
            $taxableAmount->setAttribute('currencyID', $invoice['currency'] ?? 'RON');
            $taxSubtotal->appendChild($taxableAmount);

            $subTaxAmount = $dom->createElementNS(self::CBC_NS, 'cbc:TaxAmount', number_format($group['tax'], 2, '.', ''));
            $subTaxAmount->setAttribute('currencyID', $invoice['currency'] ?? 'RON');
            $taxSubtotal->appendChild($subTaxAmount);

            // Tax Category
            $taxCategory = $dom->createElementNS(self::CAC_NS, 'cac:TaxCategory');
            $this->addElement($dom, $taxCategory, 'cbc:ID', $group['code']);
            $this->addElement($dom, $taxCategory, 'cbc:Percent', number_format($group['rate'], 2, '.', ''));

            $taxScheme = $dom->createElementNS(self::CAC_NS, 'cac:TaxScheme');
            $this->addElement($dom, $taxScheme, 'cbc:ID', 'VAT');
            $taxCategory->appendChild($taxScheme);

            $taxSubtotal->appendChild($taxCategory);
            $taxTotal->appendChild($taxSubtotal);
        }

        $parent->appendChild($taxTotal);
    }

    /**
     * Add legal monetary total
     */
    private function addLegalMonetaryTotal(DOMDocument $dom, DOMElement $parent, array $invoice): void {
        $monetary = $dom->createElementNS(self::CAC_NS, 'cac:LegalMonetaryTotal');
        $currency = $invoice['currency'] ?? 'RON';

        // Line Extension Amount (subtotal)
        $lineExt = $dom->createElementNS(self::CBC_NS, 'cbc:LineExtensionAmount', number_format((float)$invoice['subtotal'], 2, '.', ''));
        $lineExt->setAttribute('currencyID', $currency);
        $monetary->appendChild($lineExt);

        // Tax Exclusive Amount
        $taxExcl = $dom->createElementNS(self::CBC_NS, 'cbc:TaxExclusiveAmount', number_format((float)$invoice['subtotal'], 2, '.', ''));
        $taxExcl->setAttribute('currencyID', $currency);
        $monetary->appendChild($taxExcl);

        // Tax Inclusive Amount (total)
        $taxIncl = $dom->createElementNS(self::CBC_NS, 'cbc:TaxInclusiveAmount', number_format((float)$invoice['total_amount'], 2, '.', ''));
        $taxIncl->setAttribute('currencyID', $currency);
        $monetary->appendChild($taxIncl);

        // Prepaid Amount
        $prepaid = $dom->createElementNS(self::CBC_NS, 'cbc:PrepaidAmount', number_format((float)$invoice['amount_paid'], 2, '.', ''));
        $prepaid->setAttribute('currencyID', $currency);
        $monetary->appendChild($prepaid);

        // Payable Amount
        $payable = $dom->createElementNS(self::CBC_NS, 'cbc:PayableAmount', number_format((float)$invoice['amount_due'], 2, '.', ''));
        $payable->setAttribute('currencyID', $currency);
        $monetary->appendChild($payable);

        $parent->appendChild($monetary);
    }

    /**
     * Add invoice lines
     */
    private function addInvoiceLines(DOMDocument $dom, DOMElement $parent, array $invoice): void {
        foreach ($invoice['line_items'] as $index => $line) {
            $invoiceLine = $dom->createElementNS(self::CAC_NS, 'cac:InvoiceLine');

            // Line ID
            $this->addElement($dom, $invoiceLine, 'cbc:ID', (string)($line['line_number'] ?? $index + 1));

            // Invoiced Quantity
            $quantity = $dom->createElementNS(self::CBC_NS, 'cbc:InvoicedQuantity', number_format((float)$line['quantity'], 2, '.', ''));
            $quantity->setAttribute('unitCode', $line['unit_of_measure'] ?? 'H87');
            $invoiceLine->appendChild($quantity);

            // Line Extension Amount
            $lineAmount = $dom->createElementNS(self::CBC_NS, 'cbc:LineExtensionAmount', number_format((float)$line['amount'], 2, '.', ''));
            $lineAmount->setAttribute('currencyID', $invoice['currency'] ?? 'RON');
            $invoiceLine->appendChild($lineAmount);

            // Item
            $item = $dom->createElementNS(self::CAC_NS, 'cac:Item');
            $this->addElement($dom, $item, 'cbc:Description', $line['description']);
            $this->addElement($dom, $item, 'cbc:Name', substr($line['description'], 0, 100));

            // Product code if available
            if (!empty($line['product_code'])) {
                $sellerId = $dom->createElementNS(self::CAC_NS, 'cac:SellersItemIdentification');
                $this->addElement($dom, $sellerId, 'cbc:ID', $line['product_code']);
                $item->appendChild($sellerId);
            }

            // Classified Tax Category
            $taxCategory = $dom->createElementNS(self::CAC_NS, 'cac:ClassifiedTaxCategory');
            $this->addElement($dom, $taxCategory, 'cbc:ID', $line['vat_code'] ?? 'S');
            $this->addElement($dom, $taxCategory, 'cbc:Percent', number_format((float)($line['vat_rate'] ?? 19), 2, '.', ''));

            $taxScheme = $dom->createElementNS(self::CAC_NS, 'cac:TaxScheme');
            $this->addElement($dom, $taxScheme, 'cbc:ID', 'VAT');
            $taxCategory->appendChild($taxScheme);
            $item->appendChild($taxCategory);

            $invoiceLine->appendChild($item);

            // Price
            $price = $dom->createElementNS(self::CAC_NS, 'cac:Price');
            $priceAmount = $dom->createElementNS(self::CBC_NS, 'cbc:PriceAmount', number_format((float)$line['unit_price'], 2, '.', ''));
            $priceAmount->setAttribute('currencyID', $invoice['currency'] ?? 'RON');
            $price->appendChild($priceAmount);
            $invoiceLine->appendChild($price);

            $parent->appendChild($invoiceLine);
        }
    }

    /**
     * Helper to add simple element
     */
    private function addElement(DOMDocument $dom, DOMElement $parent, string $name, ?string $value): void {
        if ($value !== null && $value !== '') {
            $element = $dom->createElement($name, htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8'));
            $parent->appendChild($element);
        }
    }

    /**
     * Clean CUI/CIF - remove RO prefix if present
     */
    private function cleanCUI(string $cui): string {
        $cui = preg_replace('/[^0-9A-Za-z]/', '', $cui);
        if (str_starts_with(strtoupper($cui), 'RO')) {
            $cui = substr($cui, 2);
        }
        return $cui;
    }

    /**
     * Get invoice type code
     */
    private function getInvoiceTypeCode(string $type): string {
        return match($type) {
            'standard' => '380',
            'credit_note' => '381',
            'debit_note' => '383',
            'corrective' => '384',
            'self_billing' => '389',
            default => '380'
        };
    }

    /**
     * Get payment means code
     */
    private function getPaymentMeansCode(string $method): string {
        return match($method) {
            'cash' => '10',
            'transfer', 'bank_transfer' => '30',
            'debit_transfer' => '31',
            'card', 'bank_card' => '48',
            'direct_debit' => '49',
            default => '30'
        };
    }

    /**
     * Submit invoice to ANAF
     */
    public function submitToANAF(string $invoiceId, string $companyId): array {
        // Get settings
        $settings = $this->getSettings($companyId);

        if (!$settings || !$settings['is_enabled']) {
            throw new Exception('e-Factura is not enabled for this company');
        }

        // Generate XML
        $xml = $this->generateXML($invoiceId);

        // Save XML to file
        $xmlPath = $this->saveXMLFile($invoiceId, $companyId, $xml);

        // Determine API endpoint
        $baseUrl = $settings['use_test_environment'] ? self::ANAF_TEST_URL : self::ANAF_PROD_URL;

        // Get OAuth token
        $token = $this->getOAuthToken($settings);

        // Submit to ANAF
        $response = $this->callANAFApi($baseUrl . '/upload', $xml, $token, $companyId);

        // Log the submission
        $this->logSync($invoiceId, $companyId, 'submit', $response);

        // Update e-Factura record
        $this->updateEFacturaRecord($invoiceId, $companyId, $xmlPath, $response);

        return $response;
    }

    /**
     * Check invoice status from ANAF
     */
    public function checkStatus(string $invoiceId, string $companyId): array {
        $settings = $this->getSettings($companyId);

        if (!$settings) {
            throw new Exception('e-Factura settings not found');
        }

        // Get upload index
        $stmt = $this->pdo->prepare("SELECT upload_index FROM efactura_invoices WHERE invoice_id = :invoice_id AND company_id = :company_id");
        $stmt->execute(['invoice_id' => $invoiceId, 'company_id' => $companyId]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$record || !$record['upload_index']) {
            throw new Exception('Invoice not yet submitted to ANAF');
        }

        $baseUrl = $settings['use_test_environment'] ? self::ANAF_TEST_URL : self::ANAF_PROD_URL;
        $token = $this->getOAuthToken($settings);

        $response = $this->callANAFApi($baseUrl . '/stareMesaj?id_incarcare=' . $record['upload_index'], null, $token, $companyId, 'GET');

        $this->logSync($invoiceId, $companyId, 'check_status', $response);

        // Update status
        if (isset($response['stare'])) {
            $stmt = $this->pdo->prepare("
                UPDATE efactura_invoices
                SET anaf_status = :status, anaf_message = :message, last_sync_at = NOW()
                WHERE invoice_id = :invoice_id AND company_id = :company_id
            ");
            $stmt->execute([
                'status' => $response['stare'],
                'message' => $response['mesaj'] ?? null,
                'invoice_id' => $invoiceId,
                'company_id' => $companyId
            ]);
        }

        return $response;
    }

    /**
     * Get e-Factura settings for company
     */
    public function getSettings(string $companyId): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM efactura_settings WHERE company_id = :company_id");
        $stmt->execute(['company_id' => $companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Save or update e-Factura settings
     */
    public function saveSettings(string $companyId, array $settings): bool {
        $sql = "
            INSERT INTO efactura_settings (company_id, is_enabled, auto_submit, anaf_client_id, anaf_client_secret,
                use_test_environment, notification_email, updated_at)
            VALUES (:company_id, :is_enabled, :auto_submit, :client_id, :client_secret, :use_test, :email, NOW())
            ON CONFLICT (company_id)
            DO UPDATE SET
                is_enabled = EXCLUDED.is_enabled,
                auto_submit = EXCLUDED.auto_submit,
                anaf_client_id = EXCLUDED.anaf_client_id,
                anaf_client_secret = EXCLUDED.anaf_client_secret,
                use_test_environment = EXCLUDED.use_test_environment,
                notification_email = EXCLUDED.notification_email,
                updated_at = NOW()
        ";

        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            'company_id' => $companyId,
            'is_enabled' => $settings['is_enabled'] ?? false,
            'auto_submit' => $settings['auto_submit'] ?? false,
            'client_id' => $settings['anaf_client_id'] ?? null,
            'client_secret' => $settings['anaf_client_secret'] ?? null,
            'use_test' => $settings['use_test_environment'] ?? true,
            'email' => $settings['notification_email'] ?? null
        ]);
    }

    /**
     * Get code lists
     */
    public function getCodeList(string $listType): array {
        $stmt = $this->pdo->prepare("SELECT code, name_ro, name_en, description FROM efactura_code_lists WHERE list_type = :type AND is_active = true ORDER BY code");
        $stmt->execute(['type' => $listType]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get invoice e-Factura status
     */
    public function getInvoiceEFacturaStatus(string $invoiceId, string $companyId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM efactura_invoices
            WHERE invoice_id = :invoice_id AND company_id = :company_id
        ");
        $stmt->execute(['invoice_id' => $invoiceId, 'company_id' => $companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get submission history for invoice
     */
    public function getInvoiceHistory(string $invoiceId, string $companyId): array {
        $stmt = $this->pdo->prepare("
            SELECT action, status, error_message, created_at, response_data
            FROM efactura_sync_log
            WHERE invoice_id = :invoice_id AND company_id = :company_id
            ORDER BY created_at DESC
        ");
        $stmt->execute(['invoice_id' => $invoiceId, 'company_id' => $companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Save XML file
     */
    private function saveXMLFile(string $invoiceId, string $companyId, string $xml): string {
        $dir = __DIR__ . '/../../storage/efactura/' . $companyId . '/' . date('Y/m');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $filename = 'invoice_' . $invoiceId . '_' . date('YmdHis') . '.xml';
        $path = $dir . '/' . $filename;
        file_put_contents($path, $xml);

        return $path;
    }

    /**
     * Get OAuth token (stub - needs ANAF OAuth implementation)
     */
    private function getOAuthToken(array $settings): string {
        // Check if token is still valid
        if (!empty($settings['anaf_oauth_token']) &&
            !empty($settings['anaf_token_expires_at']) &&
            strtotime($settings['anaf_token_expires_at']) > time()) {
            return $settings['anaf_oauth_token'];
        }

        // Token expired or not set - would need to refresh
        // For now, throw exception if OAuth not configured
        if (empty($settings['anaf_oauth_token'])) {
            throw new Exception('ANAF OAuth token not configured. Please authorize access in settings.');
        }

        return $settings['anaf_oauth_token'];
    }

    /**
     * Call ANAF API
     */
    private function callANAFApi(string $url, ?string $body, string $token, string $companyId, string $method = 'POST'): array {
        $ch = curl_init($url);

        $headers = [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/xml',
            'Accept: application/json'
        ];

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);

        if ($method === 'POST' && $body) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return [
                'success' => false,
                'error' => $error,
                'http_code' => $httpCode
            ];
        }

        $data = json_decode($response, true) ?? ['raw_response' => $response];
        $data['success'] = $httpCode >= 200 && $httpCode < 300;
        $data['http_code'] = $httpCode;

        return $data;
    }

    /**
     * Log sync activity
     */
    private function logSync(string $invoiceId, string $companyId, string $action, array $response): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO efactura_sync_log (invoice_id, company_id, action, status, response_data, error_message)
            VALUES (:invoice_id, :company_id, :action, :status, :response, :error)
        ");

        $stmt->execute([
            'invoice_id' => $invoiceId,
            'company_id' => $companyId,
            'action' => $action,
            'status' => $response['success'] ? 'success' : 'error',
            'response' => json_encode($response),
            'error' => $response['error'] ?? null
        ]);
    }

    /**
     * Update e-Factura record
     */
    private function updateEFacturaRecord(string $invoiceId, string $companyId, string $xmlPath, array $response): void {
        $sql = "
            INSERT INTO efactura_invoices (invoice_id, company_id, xml_file_path, xml_hash, status, upload_index, uploaded_at)
            VALUES (:invoice_id, :company_id, :xml_path, :xml_hash, :status, :upload_index, NOW())
            ON CONFLICT (invoice_id, company_id)
            DO UPDATE SET
                xml_file_path = EXCLUDED.xml_file_path,
                xml_hash = EXCLUDED.xml_hash,
                status = EXCLUDED.status,
                upload_index = COALESCE(EXCLUDED.upload_index, efactura_invoices.upload_index),
                uploaded_at = NOW(),
                upload_attempt_count = efactura_invoices.upload_attempt_count + 1,
                last_error = CASE WHEN EXCLUDED.status = 'error' THEN :error ELSE NULL END
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'invoice_id' => $invoiceId,
            'company_id' => $companyId,
            'xml_path' => $xmlPath,
            'xml_hash' => hash_file('sha256', $xmlPath),
            'status' => $response['success'] ? 'submitted' : 'error',
            'upload_index' => $response['index_incarcare'] ?? null,
            'error' => $response['error'] ?? null
        ]);
    }

    /**
     * Download invoice XML
     */
    public function downloadXML(string $invoiceId, string $companyId): ?string {
        $stmt = $this->pdo->prepare("SELECT xml_file_path FROM efactura_invoices WHERE invoice_id = :invoice_id AND company_id = :company_id");
        $stmt->execute(['invoice_id' => $invoiceId, 'company_id' => $companyId]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($record && file_exists($record['xml_file_path'])) {
            return file_get_contents($record['xml_file_path']);
        }

        // Generate fresh XML
        return $this->generateXML($invoiceId);
    }

    /**
     * Validate invoice for e-Factura
     */
    public function validateInvoice(string $invoiceId): array {
        $invoice = $this->getInvoiceWithDetails($invoiceId);
        $errors = [];
        $warnings = [];

        if (!$invoice) {
            return ['valid' => false, 'errors' => ['Invoice not found']];
        }

        // Required fields
        if (empty($invoice['company_tax_id'])) {
            $errors[] = 'Seller CUI/CIF is required';
        }
        if (empty($invoice['company_street']) || empty($invoice['company_city'])) {
            $errors[] = 'Seller address is required';
        }
        if (empty($invoice['customer_name'])) {
            $errors[] = 'Buyer name is required';
        }
        if (empty($invoice['invoice_number'])) {
            $errors[] = 'Invoice number is required';
        }
        if (empty($invoice['line_items']) || count($invoice['line_items']) === 0) {
            $errors[] = 'At least one invoice line is required';
        }

        // Warnings
        if (empty($invoice['customer_tax_id'])) {
            $warnings[] = 'Buyer CUI/CIF is recommended for B2B invoices';
        }
        if (empty($invoice['customer_street'])) {
            $warnings[] = 'Buyer address is recommended';
        }

        return [
            'valid' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings
        ];
    }
}
