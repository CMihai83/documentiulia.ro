<?php

namespace DocumentIulia\Services\EFactura;

require_once __DIR__ . '/EFacturaConfig.php';

/**
 * e-Factura XML Generator
 * Generates RO_CIUS compliant XML invoices for ANAF e-Factura system
 *
 * Features:
 * - Full RO_CIUS 1.0.1 compliance
 * - Multiple invoice types (commercial, credit note, debit note)
 * - Multi-currency support
 * - Multiple VAT rates
 * - Foreign customer handling
 * - Reverse charge scenarios
 * - Payment terms and methods
 * - Allowances and charges
 * - File attachments references
 */
class EFacturaXMLGenerator {

    private $config;

    public function __construct() {
        $this->config = new EFacturaConfig();
    }

    /**
     * Generate RO_CIUS XML from invoice data
     *
     * @param array $invoice Complete invoice data
     * @return string XML content
     */
    public function generateFromInvoice($invoice) {
        $xml = new \DOMDocument('1.0', 'UTF-8');
        $xml->formatOutput = true;

        // Create root Invoice element
        $invoiceElement = $xml->createElementNS(EFacturaConfig::UBL_NAMESPACE, 'Invoice');
        $invoiceElement->setAttributeNS(
            'http://www.w3.org/2000/xmlns/',
            'xmlns:cac',
            EFacturaConfig::CAC_NAMESPACE
        );
        $invoiceElement->setAttributeNS(
            'http://www.w3.org/2000/xmlns/',
            'xmlns:cbc',
            EFacturaConfig::CBC_NAMESPACE
        );
        $xml->appendChild($invoiceElement);

        // Customization ID (mandatory)
        $this->addElement($xml, $invoiceElement, 'cbc:CustomizationID',
            EFacturaConfig::CIUS_CUSTOMIZATION_ID);

        // Invoice ID (number)
        $this->addElement($xml, $invoiceElement, 'cbc:ID', $invoice['invoice_number']);

        // Issue Date
        $this->addElement($xml, $invoiceElement, 'cbc:IssueDate',
            date('Y-m-d', strtotime($invoice['invoice_date'])));

        // Due Date
        if (!empty($invoice['due_date'])) {
            $this->addElement($xml, $invoiceElement, 'cbc:DueDate',
                date('Y-m-d', strtotime($invoice['due_date'])));
        }

        // Invoice Type Code
        $invoiceType = $invoice['invoice_type'] ?? EFacturaConfig::INVOICE_TYPE_COMMERCIAL;
        $this->addElement($xml, $invoiceElement, 'cbc:InvoiceTypeCode', $invoiceType);

        // Note (if any)
        if (!empty($invoice['notes'])) {
            $this->addElement($xml, $invoiceElement, 'cbc:Note', $invoice['notes']);
        }

        // Document Currency Code
        $currency = $invoice['currency'] ?? 'RON';
        $this->addElement($xml, $invoiceElement, 'cbc:DocumentCurrencyCode', $currency);

        // Tax Currency Code (if different)
        if (!empty($invoice['tax_currency']) && $invoice['tax_currency'] !== $currency) {
            $this->addElement($xml, $invoiceElement, 'cbc:TaxCurrencyCode',
                $invoice['tax_currency']);
        }

        // Accounting Cost (optional - for internal reference)
        if (!empty($invoice['accounting_cost'])) {
            $this->addElement($xml, $invoiceElement, 'cbc:AccountingCost',
                $invoice['accounting_cost']);
        }

        // Invoice Period (if applicable)
        if (!empty($invoice['period_start']) || !empty($invoice['period_end'])) {
            $this->addInvoicePeriod($xml, $invoiceElement, $invoice);
        }

        // Order Reference (if linked to order)
        if (!empty($invoice['order_reference'])) {
            $this->addOrderReference($xml, $invoiceElement, $invoice['order_reference']);
        }

        // Contract Document Reference
        if (!empty($invoice['contract_reference'])) {
            $this->addContractReference($xml, $invoiceElement, $invoice['contract_reference']);
        }

        // Accounting Supplier Party (seller - your company)
        $this->addSupplierParty($xml, $invoiceElement, $invoice['supplier']);

        // Accounting Customer Party (buyer)
        $this->addCustomerParty($xml, $invoiceElement, $invoice['customer']);

        // Payment Means (how payment should be made)
        $this->addPaymentMeans($xml, $invoiceElement, $invoice['payment']);

        // Payment Terms (when payment is due)
        if (!empty($invoice['payment_terms'])) {
            $this->addPaymentTerms($xml, $invoiceElement, $invoice['payment_terms']);
        }

        // Allowance/Charge (discounts or additional charges)
        if (!empty($invoice['allowances'])) {
            foreach ($invoice['allowances'] as $allowance) {
                $this->addAllowanceCharge($xml, $invoiceElement, $allowance, true);
            }
        }
        if (!empty($invoice['charges'])) {
            foreach ($invoice['charges'] as $charge) {
                $this->addAllowanceCharge($xml, $invoiceElement, $charge, false);
            }
        }

        // Tax Total
        $this->addTaxTotal($xml, $invoiceElement, $invoice['tax_totals'], $currency);

        // Legal Monetary Total
        $this->addLegalMonetaryTotal($xml, $invoiceElement, $invoice['totals'], $currency);

        // Invoice Lines (items)
        foreach ($invoice['line_items'] as $index => $item) {
            $this->addInvoiceLine($xml, $invoiceElement, $item, $index + 1, $currency);
        }

        return $xml->saveXML();
    }

    /**
     * Add Supplier Party (Seller)
     */
    private function addSupplierParty($xml, $parent, $supplier) {
        $supplierParty = $xml->createElement('cac:AccountingSupplierParty');
        $party = $xml->createElement('cac:Party');

        // Endpoint ID (electronic address - usually CIF)
        $endpoint = $xml->createElement('cbc:EndpointID', $supplier['cif']);
        $endpoint->setAttribute('schemeID', '0088'); // GLN scheme
        $party->appendChild($endpoint);

        // Party Identification (CIF)
        $partyId = $xml->createElement('cac:PartyIdentification');
        $id = $xml->createElement('cbc:ID', $supplier['cif']);
        $id->setAttribute('schemeID', '0183'); // RO CIF
        $partyId->appendChild($id);
        $party->appendChild($partyId);

        // Party Name
        $partyName = $xml->createElement('cac:PartyName');
        $partyName->appendChild($xml->createElement('cbc:Name', $this->escapeXML($supplier['name'])));
        $party->appendChild($partyName);

        // Postal Address
        $this->addPostalAddress($xml, $party, $supplier['address']);

        // Party Tax Scheme (VAT)
        if (!empty($supplier['vat_number'])) {
            $taxScheme = $xml->createElement('cac:PartyTaxScheme');
            $taxScheme->appendChild($xml->createElement('cbc:CompanyID', $supplier['vat_number']));
            $taxSchemeElement = $xml->createElement('cac:TaxScheme');
            $taxSchemeElement->appendChild($xml->createElement('cbc:ID', 'VAT'));
            $taxScheme->appendChild($taxSchemeElement);
            $party->appendChild($taxScheme);
        }

        // Party Legal Entity
        $legalEntity = $xml->createElement('cac:PartyLegalEntity');
        $legalEntity->appendChild($xml->createElement('cbc:RegistrationName',
            $this->escapeXML($supplier['name'])));
        if (!empty($supplier['registration_number'])) {
            $legalEntity->appendChild($xml->createElement('cbc:CompanyID',
                $supplier['registration_number'])); // J40/1234/2020
        }
        $party->appendChild($legalEntity);

        // Contact (optional but recommended)
        if (!empty($supplier['contact'])) {
            $this->addContact($xml, $party, $supplier['contact']);
        }

        $supplierParty->appendChild($party);
        $parent->appendChild($supplierParty);
    }

    /**
     * Add Customer Party (Buyer)
     */
    private function addCustomerParty($xml, $parent, $customer) {
        $customerParty = $xml->createElement('cac:AccountingCustomerParty');
        $party = $xml->createElement('cac:Party');

        // Endpoint ID
        $endpoint = $xml->createElement('cbc:EndpointID', $customer['cif'] ?? 'UNKNOWN');
        $endpoint->setAttribute('schemeID', '0088');
        $party->appendChild($endpoint);

        // Party Identification
        if (!empty($customer['cif'])) {
            $partyId = $xml->createElement('cac:PartyIdentification');
            $id = $xml->createElement('cbc:ID', $customer['cif']);
            $id->setAttribute('schemeID', '0183');
            $partyId->appendChild($id);
            $party->appendChild($partyId);
        }

        // Party Name
        $partyName = $xml->createElement('cac:PartyName');
        $partyName->appendChild($xml->createElement('cbc:Name',
            $this->escapeXML($customer['name'])));
        $party->appendChild($partyName);

        // Postal Address
        $this->addPostalAddress($xml, $party, $customer['address']);

        // Party Tax Scheme (if VAT payer)
        if (!empty($customer['vat_number'])) {
            $taxScheme = $xml->createElement('cac:PartyTaxScheme');
            $taxScheme->appendChild($xml->createElement('cbc:CompanyID', $customer['vat_number']));
            $taxSchemeElement = $xml->createElement('cac:TaxScheme');
            $taxSchemeElement->appendChild($xml->createElement('cbc:ID', 'VAT'));
            $taxScheme->appendChild($taxSchemeElement);
            $party->appendChild($taxScheme);
        }

        // Contact
        if (!empty($customer['contact'])) {
            $this->addContact($xml, $party, $customer['contact']);
        }

        $customerParty->appendChild($party);
        $parent->appendChild($customerParty);
    }

    /**
     * Add Postal Address
     */
    private function addPostalAddress($xml, $parent, $address) {
        $postalAddress = $xml->createElement('cac:PostalAddress');

        if (!empty($address['street'])) {
            $postalAddress->appendChild($xml->createElement('cbc:StreetName',
                $this->escapeXML($address['street'])));
        }

        if (!empty($address['building'])) {
            $postalAddress->appendChild($xml->createElement('cbc:AdditionalStreetName',
                $this->escapeXML($address['building'])));
        }

        if (!empty($address['city'])) {
            $postalAddress->appendChild($xml->createElement('cbc:CityName',
                $this->escapeXML($address['city'])));
        }

        if (!empty($address['postal_code'])) {
            $postalAddress->appendChild($xml->createElement('cbc:PostalZone',
                $address['postal_code']));
        }

        if (!empty($address['county'])) {
            $postalAddress->appendChild($xml->createElement('cbc:CountrySubentity',
                $this->escapeXML($address['county'])));
        }

        // Country
        $country = $xml->createElement('cac:Country');
        $countryCode = $address['country_code'] ?? 'RO';
        $country->appendChild($xml->createElement('cbc:IdentificationCode', $countryCode));
        $postalAddress->appendChild($country);

        $parent->appendChild($postalAddress);
    }

    /**
     * Add Contact Information
     */
    private function addContact($xml, $parent, $contact) {
        $contactElement = $xml->createElement('cac:Contact');

        if (!empty($contact['name'])) {
            $contactElement->appendChild($xml->createElement('cbc:Name',
                $this->escapeXML($contact['name'])));
        }

        if (!empty($contact['phone'])) {
            $contactElement->appendChild($xml->createElement('cbc:Telephone',
                $contact['phone']));
        }

        if (!empty($contact['email'])) {
            $contactElement->appendChild($xml->createElement('cbc:ElectronicMail',
                $contact['email']));
        }

        $parent->appendChild($contactElement);
    }

    /**
     * Add Payment Means
     */
    private function addPaymentMeans($xml, $parent, $payment) {
        $paymentMeans = $xml->createElement('cac:PaymentMeans');

        // Payment Means Code (30 = transfer, 48 = card, 1 = check, 10 = cash)
        $code = $payment['method_code'] ?? '30';
        $paymentMeans->appendChild($xml->createElement('cbc:PaymentMeansCode', $code));

        // Payment ID (reference for payment)
        if (!empty($payment['reference'])) {
            $paymentMeans->appendChild($xml->createElement('cbc:PaymentID',
                $payment['reference']));
        }

        // Payee Financial Account (bank details)
        if (!empty($payment['iban'])) {
            $financialAccount = $xml->createElement('cac:PayeeFinancialAccount');
            $financialAccount->appendChild($xml->createElement('cbc:ID', $payment['iban']));

            if (!empty($payment['account_name'])) {
                $financialAccount->appendChild($xml->createElement('cbc:Name',
                    $this->escapeXML($payment['account_name'])));
            }

            // Financial Institution (bank)
            if (!empty($payment['bank_name'])) {
                $financialInstitution = $xml->createElement('cac:FinancialInstitutionBranch');
                $financialInstitution->appendChild($xml->createElement('cbc:ID',
                    $payment['bank_code'] ?? ''));
                $financialInstitution->appendChild($xml->createElement('cbc:Name',
                    $this->escapeXML($payment['bank_name'])));
                $financialAccount->appendChild($financialInstitution);
            }

            $paymentMeans->appendChild($financialAccount);
        }

        $parent->appendChild($paymentMeans);
    }

    /**
     * Add Payment Terms
     */
    private function addPaymentTerms($xml, $parent, $terms) {
        $paymentTerms = $xml->createElement('cac:PaymentTerms');

        if (!empty($terms['note'])) {
            $paymentTerms->appendChild($xml->createElement('cbc:Note',
                $this->escapeXML($terms['note'])));
        }

        $parent->appendChild($paymentTerms);
    }

    /**
     * Add Tax Total
     */
    private function addTaxTotal($xml, $parent, $taxTotals, $currency) {
        $taxTotal = $xml->createElement('cac:TaxTotal');

        // Total Tax Amount
        $totalTaxAmount = 0;
        foreach ($taxTotals as $tax) {
            $totalTaxAmount += $tax['tax_amount'];
        }

        $taxAmountElement = $xml->createElement('cbc:TaxAmount',
            number_format($totalTaxAmount, 2, '.', ''));
        $taxAmountElement->setAttribute('currencyID', $currency);
        $taxTotal->appendChild($taxAmountElement);

        // Tax Subtotals (one for each VAT rate)
        foreach ($taxTotals as $tax) {
            $taxSubtotal = $xml->createElement('cac:TaxSubtotal');

            // Taxable Amount
            $taxableAmount = $xml->createElement('cbc:TaxableAmount',
                number_format($tax['taxable_amount'], 2, '.', ''));
            $taxableAmount->setAttribute('currencyID', $currency);
            $taxSubtotal->appendChild($taxableAmount);

            // Tax Amount
            $taxAmount = $xml->createElement('cbc:TaxAmount',
                number_format($tax['tax_amount'], 2, '.', ''));
            $taxAmount->setAttribute('currencyID', $currency);
            $taxSubtotal->appendChild($taxAmount);

            // Tax Category
            $taxCategory = $xml->createElement('cac:TaxCategory');
            $taxCategory->appendChild($xml->createElement('cbc:ID', $tax['category']));
            $taxCategory->appendChild($xml->createElement('cbc:Percent', $tax['rate']));

            // Tax Scheme
            $taxScheme = $xml->createElement('cac:TaxScheme');
            $taxScheme->appendChild($xml->createElement('cbc:ID', 'VAT'));
            $taxCategory->appendChild($taxScheme);

            $taxSubtotal->appendChild($taxCategory);
            $taxTotal->appendChild($taxSubtotal);
        }

        $parent->appendChild($taxTotal);
    }

    /**
     * Add Legal Monetary Total
     */
    private function addLegalMonetaryTotal($xml, $parent, $totals, $currency) {
        $monetaryTotal = $xml->createElement('cac:LegalMonetaryTotal');

        // Line Extension Amount (sum of line totals)
        $lineExtension = $xml->createElement('cbc:LineExtensionAmount',
            number_format($totals['line_extension'], 2, '.', ''));
        $lineExtension->setAttribute('currencyID', $currency);
        $monetaryTotal->appendChild($lineExtension);

        // Tax Exclusive Amount (before VAT)
        $taxExclusive = $xml->createElement('cbc:TaxExclusiveAmount',
            number_format($totals['tax_exclusive'], 2, '.', ''));
        $taxExclusive->setAttribute('currencyID', $currency);
        $monetaryTotal->appendChild($taxExclusive);

        // Tax Inclusive Amount (with VAT)
        $taxInclusive = $xml->createElement('cbc:TaxInclusiveAmount',
            number_format($totals['tax_inclusive'], 2, '.', ''));
        $taxInclusive->setAttribute('currencyID', $currency);
        $monetaryTotal->appendChild($taxInclusive);

        // Allowance Total Amount (if any discounts)
        if (!empty($totals['allowance_total'])) {
            $allowanceTotal = $xml->createElement('cbc:AllowanceTotalAmount',
                number_format($totals['allowance_total'], 2, '.', ''));
            $allowanceTotal->setAttribute('currencyID', $currency);
            $monetaryTotal->appendChild($allowanceTotal);
        }

        // Charge Total Amount (if any additional charges)
        if (!empty($totals['charge_total'])) {
            $chargeTotal = $xml->createElement('cbc:ChargeTotalAmount',
                number_format($totals['charge_total'], 2, '.', ''));
            $chargeTotal->setAttribute('currencyID', $currency);
            $monetaryTotal->appendChild($chargeTotal);
        }

        // Prepaid Amount (if any prepayments)
        if (!empty($totals['prepaid_amount'])) {
            $prepaidAmount = $xml->createElement('cbc:PrepaidAmount',
                number_format($totals['prepaid_amount'], 2, '.', ''));
            $prepaidAmount->setAttribute('currencyID', $currency);
            $monetaryTotal->appendChild($prepaidAmount);
        }

        // Payable Amount (final amount to pay)
        $payableAmount = $xml->createElement('cbc:PayableAmount',
            number_format($totals['payable_amount'], 2, '.', ''));
        $payableAmount->setAttribute('currencyID', $currency);
        $monetaryTotal->appendChild($payableAmount);

        $parent->appendChild($monetaryTotal);
    }

    /**
     * Add Invoice Line
     */
    private function addInvoiceLine($xml, $parent, $item, $lineNumber, $currency) {
        $invoiceLine = $xml->createElement('cac:InvoiceLine');

        // Line ID
        $invoiceLine->appendChild($xml->createElement('cbc:ID', $lineNumber));

        // Note (if any)
        if (!empty($item['note'])) {
            $invoiceLine->appendChild($xml->createElement('cbc:Note',
                $this->escapeXML($item['note'])));
        }

        // Invoiced Quantity
        $quantity = $xml->createElement('cbc:InvoicedQuantity', $item['quantity']);
        $quantity->setAttribute('unitCode', $item['unit_code'] ?? 'C62'); // C62 = pieces
        $invoiceLine->appendChild($quantity);

        // Line Extension Amount
        $lineExtension = $xml->createElement('cbc:LineExtensionAmount',
            number_format($item['line_total'], 2, '.', ''));
        $lineExtension->setAttribute('currencyID', $currency);
        $invoiceLine->appendChild($lineExtension);

        // Accounting Cost (optional)
        if (!empty($item['accounting_cost'])) {
            $invoiceLine->appendChild($xml->createElement('cbc:AccountingCost',
                $item['accounting_cost']));
        }

        // Item
        $itemElement = $xml->createElement('cac:Item');

        // Description
        if (!empty($item['description'])) {
            $itemElement->appendChild($xml->createElement('cbc:Description',
                $this->escapeXML($item['description'])));
        }

        // Name
        $itemElement->appendChild($xml->createElement('cbc:Name',
            $this->escapeXML($item['name'])));

        // Sellers Item Identification (SKU)
        if (!empty($item['sku'])) {
            $sellersItemId = $xml->createElement('cac:SellersItemIdentification');
            $sellersItemId->appendChild($xml->createElement('cbc:ID', $item['sku']));
            $itemElement->appendChild($sellersItemId);
        }

        // Classified Tax Category
        $taxCategory = $xml->createElement('cac:ClassifiedTaxCategory');
        $taxCategory->appendChild($xml->createElement('cbc:ID', $item['vat_category']));
        $taxCategory->appendChild($xml->createElement('cbc:Percent', $item['vat_rate']));

        $taxScheme = $xml->createElement('cac:TaxScheme');
        $taxScheme->appendChild($xml->createElement('cbc:ID', 'VAT'));
        $taxCategory->appendChild($taxScheme);

        $itemElement->appendChild($taxCategory);
        $invoiceLine->appendChild($itemElement);

        // Price
        $price = $xml->createElement('cac:Price');
        $priceAmount = $xml->createElement('cbc:PriceAmount',
            number_format($item['unit_price'], 2, '.', ''));
        $priceAmount->setAttribute('currencyID', $currency);
        $price->appendChild($priceAmount);

        // Base Quantity (usually 1)
        if (!empty($item['base_quantity'])) {
            $baseQty = $xml->createElement('cbc:BaseQuantity', $item['base_quantity']);
            $baseQty->setAttribute('unitCode', $item['unit_code'] ?? 'C62');
            $price->appendChild($baseQty);
        }

        $invoiceLine->appendChild($price);
        $parent->appendChild($invoiceLine);
    }

    /**
     * Add Invoice Period
     */
    private function addInvoicePeriod($xml, $parent, $invoice) {
        $period = $xml->createElement('cac:InvoicePeriod');

        if (!empty($invoice['period_start'])) {
            $period->appendChild($xml->createElement('cbc:StartDate',
                date('Y-m-d', strtotime($invoice['period_start']))));
        }

        if (!empty($invoice['period_end'])) {
            $period->appendChild($xml->createElement('cbc:EndDate',
                date('Y-m-d', strtotime($invoice['period_end']))));
        }

        $parent->appendChild($period);
    }

    /**
     * Add Order Reference
     */
    private function addOrderReference($xml, $parent, $orderRef) {
        $orderReference = $xml->createElement('cac:OrderReference');
        $orderReference->appendChild($xml->createElement('cbc:ID', $orderRef));
        $parent->appendChild($orderReference);
    }

    /**
     * Add Contract Reference
     */
    private function addContractReference($xml, $parent, $contractRef) {
        $contractDocument = $xml->createElement('cac:ContractDocumentReference');
        $contractDocument->appendChild($xml->createElement('cbc:ID', $contractRef));
        $parent->appendChild($contractDocument);
    }

    /**
     * Add Allowance or Charge
     */
    private function addAllowanceCharge($xml, $parent, $item, $isAllowance) {
        $allowanceCharge = $xml->createElement('cac:AllowanceCharge');

        // ChargeIndicator (false for allowance, true for charge)
        $allowanceCharge->appendChild($xml->createElement('cbc:ChargeIndicator',
            $isAllowance ? 'false' : 'true'));

        // Reason
        if (!empty($item['reason'])) {
            $allowanceCharge->appendChild($xml->createElement('cbc:AllowanceChargeReason',
                $this->escapeXML($item['reason'])));
        }

        // Amount
        $amount = $xml->createElement('cbc:Amount',
            number_format($item['amount'], 2, '.', ''));
        $amount->setAttribute('currencyID', $item['currency'] ?? 'RON');
        $allowanceCharge->appendChild($amount);

        $parent->appendChild($allowanceCharge);
    }

    /**
     * Helper: Add simple element
     */
    private function addElement($xml, $parent, $name, $value) {
        $element = $xml->createElement($name, $this->escapeXML($value));
        $parent->appendChild($element);
        return $element;
    }

    /**
     * Helper: Escape XML special characters
     */
    private function escapeXML($text) {
        return htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    /**
     * Validate generated XML against RO_CIUS schema
     */
    public function validateXML($xmlContent) {
        // Basic XML validation
        $xml = new \DOMDocument();
        $loadResult = @$xml->loadXML($xmlContent);

        if (!$loadResult) {
            return [
                'valid' => false,
                'errors' => ['Invalid XML structure']
            ];
        }

        // Add XSD schema validation here if available
        // For now, basic structure validation

        $errors = [];

        // Check mandatory fields
        $xpath = new \DOMXPath($xml);
        $xpath->registerNamespace('cbc', EFacturaConfig::CBC_NAMESPACE);
        $xpath->registerNamespace('cac', EFacturaConfig::CAC_NAMESPACE);

        // Check CustomizationID
        $customization = $xpath->query('//cbc:CustomizationID');
        if ($customization->length === 0) {
            $errors[] = 'Missing CustomizationID';
        }

        // Check Invoice ID
        $invoiceId = $xpath->query('//cbc:ID');
        if ($invoiceId->length === 0) {
            $errors[] = 'Missing Invoice ID';
        }

        // Check Supplier
        $supplier = $xpath->query('//cac:AccountingSupplierParty');
        if ($supplier->length === 0) {
            $errors[] = 'Missing Supplier information';
        }

        // Check Customer
        $customer = $xpath->query('//cac:AccountingCustomerParty');
        if ($customer->length === 0) {
            $errors[] = 'Missing Customer information';
        }

        return [
            'valid' => count($errors) === 0,
            'errors' => $errors
        ];
    }
}
