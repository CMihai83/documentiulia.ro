# e-Factura ANAF Integration - Complete Technical Specification

**Project**: DocumentIulia e-Factura Integration
**Date**: November 22, 2025
**Status**: Planning
**Priority**: 🔴 CRITICAL - LAUNCH BLOCKER

---

## 📋 Executive Summary

### What is e-Factura?

e-Factura (RO e-Factura) is Romania's mandatory national electronic invoicing system operated by ANAF (Agenția Națională de Administrare Fiscală).

**Legal Requirement**: Since July 1, 2024, ALL B2B and B2G invoices in Romania MUST be transmitted through the e-Factura system.

**Market Adoption**: 82% of Romanian companies have implemented e-Factura automation solutions.

**Business Impact for DocumentIulia**: **Cannot launch without e-Factura** - this is a regulatory compliance requirement, not an optional feature.

---

## 🎯 Project Objectives

### Primary Goal
Implement full e-Factura integration enabling DocumentIulia users to:
1. Generate RO_CIUS compliant XML invoices
2. Upload invoices to ANAF SPV (Sistemul de Facturare Electronica)
3. Track invoice status (uploaded, validated, accepted, rejected)
4. Download invoices received from suppliers
5. Auto-match received invoices with purchase orders

### Success Criteria
- ✅ 100% of invoices can be exported to RO_CIUS XML format
- ✅ Automated upload to ANAF SPV via OAuth 2.0 API
- ✅ Real-time status synchronization
- ✅ < 5 second invoice upload latency
- ✅ 99.9% successful submission rate
- ✅ Full audit trail of all e-Factura operations

---

## 🔧 Technical Architecture

### Components Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  DocumentIulia Application                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │   Invoice    │──────│  e-Factura   │──────│   XML    │ │
│  │  Management  │      │   Service    │      │ Generator│ │
│  └──────────────┘      └──────┬───────┘      └──────────┘ │
│                               │                             │
│                               │                             │
│                        ┌──────▼───────┐                     │
│                        │  OAuth 2.0   │                     │
│                        │    Client    │                     │
│                        └──────┬───────┘                     │
└───────────────────────────────┼─────────────────────────────┘
                                │
                                │ HTTPS API
                                │
                   ┌────────────▼────────────┐
                   │   ANAF e-Factura API    │
                   │  (SPV - Spatial Virtual │
                   │      de Facturare)      │
                   └─────────────────────────┘
```

---

## 📊 Database Schema Extensions

### New Tables

#### 1. `efactura_invoices`
Tracks e-Factura submission status for each invoice.

```sql
CREATE TABLE efactura_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Submission tracking
    upload_index BIGINT UNIQUE,  -- ANAF-assigned unique ID
    xml_file_path VARCHAR(500),  -- Stored XML location
    xml_hash VARCHAR(64),         -- SHA-256 hash for integrity

    -- Status tracking
    status VARCHAR(50) NOT NULL, -- 'pending', 'uploading', 'uploaded', 'validated', 'accepted', 'rejected', 'error'
    anaf_status VARCHAR(50),     -- ANAF-reported status
    anaf_message TEXT,           -- Error/validation messages

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_at TIMESTAMP,
    validated_at TIMESTAMP,
    last_sync_at TIMESTAMP,

    -- Metadata
    upload_attempt_count INTEGER DEFAULT 0,
    last_error TEXT,

    UNIQUE(invoice_id, company_id)
);

CREATE INDEX idx_efactura_invoices_status ON efactura_invoices(status);
CREATE INDEX idx_efactura_invoices_company ON efactura_invoices(company_id);
CREATE INDEX idx_efactura_invoices_upload_index ON efactura_invoices(upload_index);
```

#### 2. `efactura_oauth_tokens`
Stores OAuth 2.0 tokens for ANAF API access.

```sql
CREATE TABLE efactura_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) UNIQUE,

    -- OAuth credentials
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(500) NOT NULL, -- Encrypted

    -- Tokens
    access_token TEXT,
    refresh_token TEXT,
    token_type VARCHAR(50),
    expires_at TIMESTAMP,

    -- Authorization
    authorization_code VARCHAR(500),
    authorization_redirect_uri VARCHAR(500),

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_refresh_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_efactura_oauth_company ON efactura_oauth_tokens(company_id);
```

#### 3. `efactura_received_invoices`
Stores invoices received from suppliers via e-Factura.

```sql
CREATE TABLE efactura_received_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- ANAF identifiers
    upload_index BIGINT NOT NULL UNIQUE,
    cif VARCHAR(20) NOT NULL, -- Supplier CUI/CIF

    -- Invoice data
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    vat_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'RON',

    -- XML data
    xml_content TEXT NOT NULL,
    xml_file_path VARCHAR(500),

    -- Processing status
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'viewed', 'matched', 'imported', 'rejected'
    matched_purchase_order_id UUID REFERENCES purchase_orders(id),
    imported_bill_id UUID REFERENCES bills(id),

    -- Timestamps
    received_at TIMESTAMP NOT NULL,
    viewed_at TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(upload_index, company_id)
);

CREATE INDEX idx_efactura_received_company ON efactura_received_invoices(company_id);
CREATE INDEX idx_efactura_received_status ON efactura_received_invoices(status);
CREATE INDEX idx_efactura_received_cif ON efactura_received_invoices(cif);
```

#### 4. `efactura_sync_log`
Audit trail for all e-Factura API operations.

```sql
CREATE TABLE efactura_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID REFERENCES users(id),

    -- Operation details
    operation_type VARCHAR(50) NOT NULL, -- 'upload', 'status_check', 'download', 'validate'
    invoice_id UUID REFERENCES invoices(id),
    upload_index BIGINT,

    -- API request/response
    api_endpoint VARCHAR(255),
    request_payload TEXT,
    response_payload TEXT,
    http_status_code INTEGER,

    -- Result
    success BOOLEAN NOT NULL,
    error_message TEXT,
    duration_ms INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_efactura_sync_log_company ON efactura_sync_log(company_id);
CREATE INDEX idx_efactura_sync_log_operation ON efactura_sync_log(operation_type);
CREATE INDEX idx_efactura_sync_log_created_at ON efactura_sync_log(created_at);
```

---

## 🔐 OAuth 2.0 Authentication Flow

### ANAF OAuth 2.0 Endpoints

**Authorization URL**: `https://logincert.anaf.ro/anaf-oauth2/v1/authorize`
**Token URL**: `https://logincert.anaf.ro/anaf-oauth2/v1/token`
**API Base URL**: `https://api.anaf.ro/prod/FCTEL/rest/`

### Registration Steps

1. **Developer Registration** (One-time setup)
   - Access: https://www.anaf.ro/InregOauth
   - Register application with ANAF
   - Receive `client_id` and `client_secret`
   - Configure redirect URI: `https://documentiulia.ro/api/v1/efactura/oauth/callback`

2. **User Authorization** (Per company)
   ```
   Step 1: Redirect user to ANAF authorization page
   GET https://logincert.anaf.ro/anaf-oauth2/v1/authorize
   ?client_id={client_id}
   &redirect_uri=https://documentiulia.ro/api/v1/efactura/oauth/callback
   &response_type=code
   &scope=efactura
   &state={csrf_token}

   Step 2: User authorizes DocumentIulia on ANAF portal

   Step 3: ANAF redirects back with authorization code
   GET https://documentiulia.ro/api/v1/efactura/oauth/callback
   ?code={authorization_code}
   &state={csrf_token}

   Step 4: Exchange authorization code for access token
   POST https://logincert.anaf.ro/anaf-oauth2/v1/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code
   &code={authorization_code}
   &redirect_uri=https://documentiulia.ro/api/v1/efactura/oauth/callback
   &client_id={client_id}
   &client_secret={client_secret}

   Response:
   {
     "access_token": "eyJhbGci...",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "def502..."
   }
   ```

3. **Token Refresh** (When access token expires)
   ```
   POST https://logincert.anaf.ro/anaf-oauth2/v1/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=refresh_token
   &refresh_token={refresh_token}
   &client_id={client_id}
   &client_secret={client_secret}
   ```

---

## 📄 RO_CIUS XML Invoice Format

### XML Structure

RO_CIUS (Romanian Core Invoice Usage Specification) is based on EN 16931 European standard.

**Schema Version**: UBL 2.1
**CIUS Version**: RO_CIUS 1.0.8 (as of Dec 2022)

### Example RO_CIUS XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">

    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
    <cbc:ID>FAC-2025-001</cbc:ID>
    <cbc:IssueDate>2025-11-22</cbc:IssueDate>
    <cbc:DueDate>2025-12-22</cbc:DueDate>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>

    <!-- Supplier (AccountingSupplierParty) -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cbc:EndpointID schemeID="0088">1234567890</cbc:EndpointID>
            <cac:PartyIdentification>
                <cbc:ID schemeID="0183">1234567890</cbc:ID> <!-- CIF -->
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>SC EXAMPLE SRL</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>Str. Exemplu, nr. 1</cbc:StreetName>
                <cbc:CityName>Bucuresti</cbc:CityName>
                <cbc:PostalZone>010101</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>RO</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>RO1234567890</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>SC EXAMPLE SRL</cbc:RegistrationName>
                <cbc:CompanyID>J40/1234/2020</cbc:CompanyID> <!-- Reg. Com. -->
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- Customer (AccountingCustomerParty) -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cbc:EndpointID schemeID="0088">9876543210</cbc:EndpointID>
            <cac:PartyIdentification>
                <cbc:ID schemeID="0183">9876543210</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>SC CLIENT SRL</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>Str. Client, nr. 10</cbc:StreetName>
                <cbc:CityName>Cluj-Napoca</cbc:CityName>
                <cbc:PostalZone>400000</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>RO</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>RO9876543210</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- Line Items -->
    <cac:InvoiceLine>
        <cbc:ID>1</cbc:ID>
        <cbc:InvoicedQuantity unitCode="C62">10</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="RON">1000.00</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Name>Product Example</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>19</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="RON">100.00</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>

    <!-- Tax Total -->
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="RON">190.00</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="RON">1000.00</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="RON">190.00</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>19</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <!-- Monetary Total -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="RON">1000.00</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="RON">1000.00</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="RON">1190.00</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="RON">1190.00</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>
```

### Required Fields (Mandatory)

1. **Invoice Header**:
   - CustomizationID (must be RO_CIUS identifier)
   - ID (invoice number)
   - IssueDate
   - InvoiceTypeCode (380 = Commercial Invoice)
   - DocumentCurrencyCode

2. **Supplier**:
   - CIF (Tax ID)
   - Company name
   - Full address
   - VAT registration number (if applicable)
   - J registration number (Registrul Comerțului)

3. **Customer**:
   - CIF
   - Company name
   - Full address

4. **Line Items**:
   - Description
   - Quantity with unit code
   - Unit price
   - Line total
   - VAT category and rate

5. **Totals**:
   - Subtotal (taxable amount)
   - VAT total
   - Grand total (payable amount)

### Validation

ANAF provides online XML validation:
- **URL**: https://www.anaf.ro/uploadxmi/
- **Purpose**: Test XML before production submission
- **Returns**: Validation errors and warnings

---

## 🔌 ANAF API Integration

### API Endpoints

#### 1. Upload Invoice (POST)
```
POST https://api.anaf.ro/prod/FCTEL/rest/upload
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Parameters:
- file: (binary) XML file content
- cif: (string) Company CIF (without RO prefix)
- standard: (string) "UBL" or "CII" (use UBL for RO_CIUS)

Response (200 OK):
{
  "header": {
    "ExecutionStatus": 0,
    "Errors": []
  },
  "index_incarcare": 123456789  // Upload index (unique ID)
}
```

#### 2. Check Invoice Status (GET)
```
GET https://api.anaf.ro/prod/FCTEL/rest/status/{upload_index}
Authorization: Bearer {access_token}

Parameters:
- cif: (query) Company CIF

Response (200 OK):
{
  "header": {
    "ExecutionStatus": 0,
    "Errors": []
  },
  "stare": "ok",  // Statuses: "nok", "ok", "in prelucrare"
  "Messages": [
    "Invoice uploaded successfully",
    "Validation passed"
  ]
}
```

#### 3. Download Received Invoices (GET)
```
GET https://api.anaf.ro/prod/FCTEL/rest/listaMesajeFactura
Authorization: Bearer {access_token}

Parameters:
- cif: (query) Company CIF
- zile: (query, optional) Days to look back (default: 60)
- filtru: (query, optional) Filter: "P" (sent), "R" (received), "" (all)

Response (200 OK):
{
  "header": {
    "ExecutionStatus": 0
  },
  "mesaje": [
    {
      "data_creare": "202511221530",
      "cif": "1234567890",
      "id_solicitare": "987654321",
      "detalii": "Factura primita",
      "tip": "FACTURA PRIMITA",
      "id": "123456789"
    }
  ]
}
```

#### 4. Download Invoice XML (GET)
```
GET https://api.anaf.ro/prod/FCTEL/rest/descarcare
Authorization: Bearer {access_token}

Parameters:
- id: (query) Message ID from listaMesajeFactura

Response (200 OK):
Binary ZIP file containing XML invoice
```

### Error Handling

**Common HTTP Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid XML or parameters
- `401 Unauthorized`: Invalid/expired OAuth token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Invoice not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: ANAF system error

**Error Response Example**:
```json
{
  "header": {
    "ExecutionStatus": 1,
    "Errors": [
      {
        "errorMessage": "Invalid XML structure"
      }
    ]
  }
}
```

---

## 💻 Backend Implementation (PHP)

### File Structure

```
/var/www/documentiulia.ro/
├── api/v1/efactura/
│   ├── upload.php              # Upload invoice to ANAF
│   ├── status.php              # Check invoice status
│   ├── download-received.php   # Download received invoices
│   ├── oauth-authorize.php     # Initiate OAuth flow
│   ├── oauth-callback.php      # OAuth callback handler
│   ├── sync-status.php         # Background sync job
│   └── validate-xml.php        # Validate XML before upload
├── includes/services/
│   ├── EFacturaService.php     # Main service class
│   ├── EFacturaOAuthClient.php # OAuth 2.0 client
│   ├── EFacturaXMLGenerator.php# XML generator
│   └── EFacturaValidator.php   # XML validator
└── storage/
    └── efactura/
        ├── xml/                # Generated XML files
        ├── received/           # Downloaded received invoices
        └── logs/               # Processing logs
```

### Core Service Class: `EFacturaService.php`

```php
<?php

namespace DocumentIulia\Services;

class EFacturaService {

    private $pdo;
    private $oauthClient;
    private $xmlGenerator;
    private $validator;

    // ANAF API endpoints
    const API_BASE_URL = 'https://api.anaf.ro/prod/FCTEL/rest/';
    const UPLOAD_ENDPOINT = 'upload';
    const STATUS_ENDPOINT = 'status';
    const LIST_MESSAGES_ENDPOINT = 'listaMesajeFactura';
    const DOWNLOAD_ENDPOINT = 'descarcare';

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->oauthClient = new EFacturaOAuthClient($pdo);
        $this->xmlGenerator = new EFacturaXMLGenerator();
        $this->validator = new EFacturaValidator();
    }

    /**
     * Upload invoice to ANAF e-Factura system
     *
     * @param string $invoiceId UUID of invoice in database
     * @param string $companyId UUID of company
     * @return array Result with upload_index and status
     */
    public function uploadInvoice($invoiceId, $companyId) {
        try {
            // 1. Get invoice data from database
            $invoice = $this->getInvoiceData($invoiceId, $companyId);
            if (!$invoice) {
                throw new \Exception("Invoice not found");
            }

            // 2. Generate RO_CIUS XML
            $xml = $this->xmlGenerator->generateFromInvoice($invoice);

            // 3. Validate XML
            $validationResult = $this->validator->validate($xml);
            if (!$validationResult['valid']) {
                throw new \Exception("XML validation failed: " . implode(', ', $validationResult['errors']));
            }

            // 4. Save XML to file
            $xmlFilePath = $this->saveXmlFile($invoiceId, $xml);

            // 5. Get OAuth access token
            $accessToken = $this->oauthClient->getAccessToken($companyId);

            // 6. Upload to ANAF
            $uploadResult = $this->callUploadAPI($accessToken, $xml, $invoice['company_cif']);

            // 7. Save to efactura_invoices table
            $this->saveEFacturaRecord($invoiceId, $companyId, [
                'upload_index' => $uploadResult['index_incarcare'],
                'xml_file_path' => $xmlFilePath,
                'xml_hash' => hash('sha256', $xml),
                'status' => 'uploaded',
                'uploaded_at' => date('Y-m-d H:i:s')
            ]);

            // 8. Log operation
            $this->logOperation($companyId, 'upload', $invoiceId, true, $uploadResult);

            return [
                'success' => true,
                'upload_index' => $uploadResult['index_incarcare'],
                'message' => 'Invoice uploaded successfully to ANAF'
            ];

        } catch (\Exception $e) {
            // Log error
            $this->logOperation($companyId, 'upload', $invoiceId, false, null, $e->getMessage());

            // Update status
            $this->updateEFacturaStatus($invoiceId, 'error', $e->getMessage());

            throw $e;
        }
    }

    /**
     * Call ANAF upload API
     */
    private function callUploadAPI($accessToken, $xml, $cif) {
        $url = self::API_BASE_URL . self::UPLOAD_ENDPOINT;

        // Prepare multipart form data
        $boundary = uniqid();
        $delimiter = '-------------' . $boundary;

        $data = "--" . $delimiter . "\r\n"
            . "Content-Disposition: form-data; name=\"file\"; filename=\"invoice.xml\"\r\n"
            . "Content-Type: application/xml\r\n\r\n"
            . $xml . "\r\n"
            . "--" . $delimiter . "\r\n"
            . "Content-Disposition: form-data; name=\"cif\"\r\n\r\n"
            . $cif . "\r\n"
            . "--" . $delimiter . "\r\n"
            . "Content-Disposition: form-data; name=\"standard\"\r\n\r\n"
            . "UBL\r\n"
            . "--" . $delimiter . "--\r\n";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: multipart/form-data; boundary=' . $delimiter,
            'Content-Length: ' . strlen($data)
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new \Exception("ANAF API error: HTTP $httpCode - $response");
        }

        $result = json_decode($response, true);

        if ($result['header']['ExecutionStatus'] !== 0) {
            $errors = implode(', ', array_column($result['header']['Errors'], 'errorMessage'));
            throw new \Exception("ANAF validation failed: $errors");
        }

        return $result;
    }

    /**
     * Check invoice status at ANAF
     */
    public function checkInvoiceStatus($uploadIndex, $companyId) {
        try {
            $accessToken = $this->oauthClient->getAccessToken($companyId);
            $company = $this->getCompanyData($companyId);

            $url = self::API_BASE_URL . self::STATUS_ENDPOINT . '/' . $uploadIndex
                . '?cif=' . $company['cif'];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $accessToken
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                throw new \Exception("ANAF API error: HTTP $httpCode");
            }

            $result = json_decode($response, true);

            // Update database with new status
            $this->updateEFacturaStatusFromANAF($uploadIndex, $result);

            return $result;

        } catch (\Exception $e) {
            $this->logOperation($companyId, 'status_check', null, false, null, $e->getMessage());
            throw $e;
        }
    }

    /**
     * Download received invoices from ANAF
     */
    public function downloadReceivedInvoices($companyId, $days = 60) {
        try {
            $accessToken = $this->oauthClient->getAccessToken($companyId);
            $company = $this->getCompanyData($companyId);

            // Get list of received invoices
            $url = self::API_BASE_URL . self::LIST_MESSAGES_ENDPOINT
                . '?cif=' . $company['cif']
                . '&zile=' . $days
                . '&filtru=R';  // R = Received only

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $accessToken
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                throw new \Exception("ANAF API error: HTTP $httpCode");
            }

            $result = json_decode($response, true);
            $downloadedCount = 0;

            // Download each invoice
            foreach ($result['mesaje'] as $message) {
                if ($message['tip'] === 'FACTURA PRIMITA') {
                    $this->downloadSingleInvoice($message['id'], $companyId, $accessToken);
                    $downloadedCount++;
                }
            }

            $this->logOperation($companyId, 'download', null, true, [
                'downloaded_count' => $downloadedCount
            ]);

            return [
                'success' => true,
                'downloaded_count' => $downloadedCount
            ];

        } catch (\Exception $e) {
            $this->logOperation($companyId, 'download', null, false, null, $e->getMessage());
            throw $e;
        }
    }

    // ... Additional helper methods ...
}
```

---

## 🎨 Frontend Implementation (React/TypeScript)

### New Components

#### 1. `EFacturaStatus.tsx` - Invoice e-Factura Status Badge

```typescript
import React from 'react';
import { CheckCircle, XCircle, Clock, Upload, AlertCircle } from 'lucide-react';

interface EFacturaStatusProps {
  status: 'pending' | 'uploading' | 'uploaded' | 'validated' | 'accepted' | 'rejected' | 'error';
  uploadIndex?: number;
  anafMessage?: string;
}

export const EFacturaStatus: React.FC<EFacturaStatusProps> = ({
  status,
  uploadIndex,
  anafMessage
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'accepted':
        return {
          icon: CheckCircle,
          color: 'text-green-600 bg-green-50',
          label: 'Acceptată ANAF',
        };
      case 'uploaded':
        return {
          icon: Upload,
          color: 'text-blue-600 bg-blue-50',
          label: 'Încărcată',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600 bg-red-50',
          label: 'Respinsă',
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600 bg-red-50',
          label: 'Eroare',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600 bg-gray-50',
          label: 'În așteptare',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
      {uploadIndex && (
        <span className="text-xs text-gray-500">#{uploadIndex}</span>
      )}
      {anafMessage && (
        <span className="text-xs text-gray-500" title={anafMessage}>ℹ️</span>
      )}
    </div>
  );
};
```

#### 2. `EFacturaUploadButton.tsx` - Upload Invoice Button

```typescript
import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';

interface EFacturaUploadButtonProps {
  invoiceId: string;
  onUploadComplete: () => void;
}

export const EFacturaUploadButton: React.FC<EFacturaUploadButtonProps> = ({
  invoiceId,
  onUploadComplete
}) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const response = await apiService.post(`/api/v1/efactura/upload.php`, {
        invoice_id: invoiceId
      });

      if (response.success) {
        alert(`Factură încărcată cu succes! Index: ${response.upload_index}`);
        onUploadComplete();
      }
    } catch (error) {
      alert(`Eroare: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <button
      onClick={handleUpload}
      disabled={uploading}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
    >
      {uploading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Se încarcă...
        </>
      ) : (
        <>
          <Upload className="w-4 h-4" />
          Trimite către ANAF
        </>
      )}
    </button>
  );
};
```

---

## ✅ Implementation Checklist

### Phase 1: Setup & Infrastructure (Week 1)

- [ ] **Day 1-2: ANAF Registration**
  - [ ] Register application at https://www.anaf.ro/InregOauth
  - [ ] Obtain `client_id` and `client_secret`
  - [ ] Configure redirect URI in ANAF portal
  - [ ] Test OAuth flow in sandbox environment

- [ ] **Day 3: Database Setup**
  - [ ] Create all 4 new tables (efactura_invoices, efactura_oauth_tokens, etc.)
  - [ ] Add indexes for performance
  - [ ] Create database functions for status updates
  - [ ] Seed test data

- [ ] **Day 4-5: Backend Core Services**
  - [ ] Implement `EFacturaOAuthClient.php` (OAuth 2.0 flow)
  - [ ] Implement `EFacturaService.php` (main service)
  - [ ] Create XML file storage system
  - [ ] Setup error logging

### Phase 2: XML Generation (Week 2)

- [ ] **Day 1-3: XML Generator**
  - [ ] Implement `EFacturaXMLGenerator.php`
  - [ ] Support all invoice types (commercial, credit note, etc.)
  - [ ] Handle edge cases (multi-currency, foreign customers, etc.)
  - [ ] Create unit tests

- [ ] **Day 4: Validation**
  - [ ] Implement `EFacturaValidator.php`
  - [ ] Integrate with ANAF online validator (https://www.anaf.ro/uploadxmi/)
  - [ ] Create validation error messages in Romanian

- [ ] **Day 5: Testing**
  - [ ] Test with 50+ sample invoices
  - [ ] Verify XML against ANAF schema
  - [ ] Fix any validation errors

### Phase 3: API Integration (Week 3)

- [ ] **Day 1-2: Upload API**
  - [ ] Implement upload endpoint (`upload.php`)
  - [ ] Handle multipart form data
  - [ ] Implement retry logic for failed uploads

- [ ] **Day 3: Status Check API**
  - [ ] Implement status check endpoint (`status.php`)
  - [ ] Create background sync cron job (every 15 minutes)
  - [ ] Update database with ANAF responses

- [ ] **Day 4: Download Received**
  - [ ] Implement download endpoint (`download-received.php`)
  - [ ] Parse received invoice XML
  - [ ] Auto-match with purchase orders

- [ ] **Day 5: OAuth Flow**
  - [ ] Implement `oauth-authorize.php`
  - [ ] Implement `oauth-callback.php`
  - [ ] Handle token refresh automatically

### Phase 4: Frontend (Week 4)

- [ ] **Day 1-2: Invoice Page Integration**
  - [ ] Add "Trimite către ANAF" button to invoice detail page
  - [ ] Display e-Factura status badge
  - [ ] Show upload_index and ANAF messages

- [ ] **Day 3: Settings Page**
  - [ ] Add e-Factura configuration section
  - [ ] "Connect to ANAF" button (OAuth flow)
  - [ ] Display connection status

- [ ] **Day 4: Received Invoices Page**
  - [ ] Create new page: `/efactura/received`
  - [ ] List all received invoices
  - [ ] Match with purchase orders
  - [ ] Import as bills

- [ ] **Day 5: Testing & Polish**
  - [ ] End-to-end testing
  - [ ] Error handling UI
  - [ ] User documentation

---

## 🧪 Testing Strategy

### Unit Tests

```php
// tests/EFacturaXMLGeneratorTest.php

class EFacturaXMLGeneratorTest extends PHPUnit\Framework\TestCase {

    public function testGenerateSimpleInvoice() {
        $generator = new EFacturaXMLGenerator();
        $invoice = [
            'invoice_number' => 'FAC-001',
            'invoice_date' => '2025-11-22',
            'total_amount' => 1190.00,
            'vat_amount' => 190.00,
            // ... more fields
        ];

        $xml = $generator->generateFromInvoice($invoice);

        $this->assertStringContainsString('FAC-001', $xml);
        $this->assertStringContainsString('1190.00', $xml);
        $this->assertStringContainsString('RO_CIUS', $xml);
    }

    public function testXMLValidation() {
        $validator = new EFacturaValidator();
        $xml = file_get_contents(__DIR__ . '/fixtures/valid-invoice.xml');

        $result = $validator->validate($xml);

        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['errors']);
    }
}
```

### Integration Tests

- **OAuth Flow**: Test complete authorization → callback → token refresh
- **Upload**: Upload real invoice to ANAF test environment
- **Status Check**: Poll status until accepted/rejected
- **Download**: Download received invoices

### Manual Testing Checklist

- [ ] Upload simple invoice (1 line item)
- [ ] Upload complex invoice (10+ line items, multiple VAT rates)
- [ ] Upload credit note
- [ ] Handle upload failure (invalid XML)
- [ ] Handle network timeout
- [ ] Token expiration and refresh
- [ ] Download received invoices
- [ ] Match received invoice with PO

---

## 📚 Documentation & Training

### User Documentation

1. **Setup Guide**: "How to Connect to e-Factura"
2. **Upload Guide**: "How to Send Invoices to ANAF"
3. **Troubleshooting**: "Common e-Factura Errors and Solutions"
4. **FAQ**: "e-Factura Frequently Asked Questions"

### Video Tutorials (for Course Platform)

- **Lesson 1**: "What is e-Factura and Why It's Mandatory"
- **Lesson 2**: "Connecting Your Company to ANAF"
- **Lesson 3**: "Sending Your First e-Factura Invoice"
- **Lesson 4**: "Managing Received Invoices"
- **Lesson 5**: "Troubleshooting Common Issues"

---

## 💰 Cost Analysis

### Development Costs

- **Developer Time**: 4 weeks × 40 hours = 160 hours
- **Hourly Rate**: €50/hour
- **Total Development**: **€8,000**

### Operational Costs

- **ANAF API**: €0/month (free government service)
- **Storage (XML files)**: ~€5/month (1GB for 10,000 invoices/month)
- **Total Operational**: **€60/year**

### Return on Investment

**Without e-Factura**: Cannot sell to 82% of Romanian market
**With e-Factura**: Full market access

**Revenue Impact**:
- Addressable market: +400,000 businesses
- Projected Year 1 subscriptions: 750 users × €59/month = €44,250/month
- **Annual Revenue**: €531,000

**ROI**: €531,000 / €8,000 = **6,637%** (payback in < 2 weeks)

---

## 🚀 Launch Plan

### Pre-Launch (Week 4)

- [ ] Complete all testing
- [ ] Prepare user documentation
- [ ] Train support team
- [ ] Create marketing materials highlighting e-Factura

### Launch (Week 5)

- [ ] Deploy to production
- [ ] Announce feature to existing users
- [ ] Monitor closely for first 48 hours
- [ ] Collect user feedback

### Post-Launch (Week 6+)

- [ ] Iterate based on feedback
- [ ] Optimize performance
- [ ] Add advanced features (bulk upload, automated reconciliation)
- [ ] Create case studies

---

## 🎯 Success Criteria

- ✅ **95%+ upload success rate**
- ✅ **< 10 seconds** average upload time
- ✅ **99.9% uptime** for e-Factura service
- ✅ **80%+ user adoption** within 60 days
- ✅ **Zero data loss** incidents
- ✅ **< 5% support ticket rate** for e-Factura issues

---

**Document Version**: 1.0
**Last Updated**: November 22, 2025
**Status**: Ready for Implementation
**Priority**: 🔴 CRITICAL - START IMMEDIATELY
