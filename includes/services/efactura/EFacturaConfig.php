<?php

namespace DocumentIulia\Services\EFactura;

/**
 * e-Factura Configuration
 * Centralizes all ANAF e-Factura API endpoints and settings
 */
class EFacturaConfig {

    // ANAF OAuth 2.0 Endpoints
    const OAUTH_AUTHORIZE_URL = 'https://logincert.anaf.ro/anaf-oauth2/v1/authorize';
    const OAUTH_TOKEN_URL = 'https://logincert.anaf.ro/anaf-oauth2/v1/token';

    // ANAF e-Factura API Endpoints
    const API_BASE_URL = 'https://api.anaf.ro/prod/FCTEL/rest/';
    const API_UPLOAD = 'upload';
    const API_STATUS = 'status';
    const API_LIST_MESSAGES = 'listaMesajeFactura';
    const API_DOWNLOAD = 'descarcare';

    // OAuth Scopes
    const OAUTH_SCOPE = 'efactura';

    // Application Settings (TO BE CONFIGURED)
    const CLIENT_ID = 'DOCUMENTIULIA_CLIENT_ID'; // Register at https://www.anaf.ro/InregOauth
    const CLIENT_SECRET = 'DOCUMENTIULIA_CLIENT_SECRET'; // From ANAF registration
    const REDIRECT_URI = 'https://documentiulia.ro/api/v1/efactura/oauth-callback.php';

    // XML Settings
    const XML_STORAGE_PATH = '/var/www/documentiulia.ro/storage/efactura/xml/';
    const RECEIVED_STORAGE_PATH = '/var/www/documentiulia.ro/storage/efactura/received/';
    const LOG_STORAGE_PATH = '/var/www/documentiulia.ro/storage/efactura/logs/';

    // RO_CIUS Specification
    const CIUS_CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1';
    const UBL_VERSION = '2.1';
    const UBL_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
    const CAC_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
    const CBC_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';

    // Invoice Type Codes (UBL)
    const INVOICE_TYPE_COMMERCIAL = '380'; // Standard commercial invoice
    const INVOICE_TYPE_CREDIT_NOTE = '381'; // Credit note
    const INVOICE_TYPE_DEBIT_NOTE = '383'; // Debit note
    const INVOICE_TYPE_CORRECTIVE = '384'; // Corrected invoice

    // VAT Categories
    const VAT_CATEGORY_STANDARD = 'S'; // 19% standard rate
    const VAT_CATEGORY_REDUCED = 'AA'; // 9% reduced rate
    const VAT_CATEGORY_SECOND_REDUCED = 'AB'; // 5% second reduced rate
    const VAT_CATEGORY_ZERO = 'Z'; // 0% zero-rated
    const VAT_CATEGORY_EXEMPT = 'E'; // VAT exempt
    const VAT_CATEGORY_REVERSE_CHARGE = 'AE'; // Reverse charge

    // Romania Tax Scheme
    const TAX_SCHEME_VAT = 'VAT';
    const COUNTRY_CODE = 'RO';

    // Validation URLs
    const ANAF_VALIDATION_URL = 'https://www.anaf.ro/uploadxmi/';
    const ANAF_XML_TO_PDF_URL = 'https://www.anaf.ro/uploadxml';

    /**
     * Get full API URL
     */
    public static function getApiUrl($endpoint) {
        return self::API_BASE_URL . $endpoint;
    }

    /**
     * Get OAuth authorization URL
     */
    public static function getAuthorizationUrl($state) {
        $params = http_build_query([
            'client_id' => self::CLIENT_ID,
            'redirect_uri' => self::REDIRECT_URI,
            'response_type' => 'code',
            'scope' => self::OAUTH_SCOPE,
            'state' => $state
        ]);

        return self::OAUTH_AUTHORIZE_URL . '?' . $params;
    }

    /**
     * Get environment-specific client credentials
     */
    public static function getClientCredentials() {
        // In production, these should come from environment variables or secure config
        $clientId = getenv('EFACTURA_CLIENT_ID') ?: self::CLIENT_ID;
        $clientSecret = getenv('EFACTURA_CLIENT_SECRET') ?: self::CLIENT_SECRET;

        return [
            'client_id' => $clientId,
            'client_secret' => $clientSecret
        ];
    }

    /**
     * Check if e-Factura is configured
     */
    public static function isConfigured() {
        $creds = self::getClientCredentials();
        return !empty($creds['client_id']) &&
               $creds['client_id'] !== 'DOCUMENTIULIA_CLIENT_ID' &&
               !empty($creds['client_secret']) &&
               $creds['client_secret'] !== 'DOCUMENTIULIA_CLIENT_SECRET';
    }
}
