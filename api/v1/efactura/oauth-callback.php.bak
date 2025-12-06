<?php
/**
 * e-Factura OAuth Callback Endpoint
 * Handles OAuth 2.0 callback from ANAF and exchanges code for tokens
 */

session_start();

require_once __DIR__ . '/../../services/DatabaseService.php';
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../../includes/services/efactura/EFacturaOAuthClient.php';

try {
    // Get callback parameters
    $code = $_GET['code'] ?? null;
    $state = $_GET['state'] ?? null;
    $error = $_GET['error'] ?? null;

    // Check for OAuth errors
    if ($error) {
        $errorDescription = $_GET['error_description'] ?? 'Unknown error';
        throw new Exception("OAuth Error: $error - $errorDescription");
    }

    if (!$code || !$state) {
        throw new Exception('Missing authorization code or state parameter');
    }

    // Get company ID from session
    $companyId = $_SESSION['efactura_oauth_company_id'] ?? null;
    if (!$companyId) {
        throw new Exception('Session expired. Please try again.');
    }

    // Initialize OAuth client
    $oauthClient = new \DocumentIulia\Services\EFactura\EFacturaOAuthClient($pdo);

    // Handle callback and exchange code for tokens
    $tokens = $oauthClient->handleCallback($code, $state, $companyId);

    // Test connection
    $testResult = $oauthClient->testConnection($companyId);

    // Redirect to settings page with success message
    $redirectUrl = '/settings?tab=efactura&status=connected';
    if (!$testResult['success']) {
        $redirectUrl .= '&warning=' . urlencode('Connected but API test failed');
    }

    header("Location: $redirectUrl");
    exit();

} catch (Exception $e) {
    error_log("e-Factura OAuth Callback Error: " . $e->getMessage());

    // Redirect to settings with error
    $redirectUrl = '/settings?tab=efactura&error=' . urlencode($e->getMessage());
    header("Location: $redirectUrl");
    exit();
}
