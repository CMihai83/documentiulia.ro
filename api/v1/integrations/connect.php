<?php
/**
 * Integration Connect API
 * Connect/disconnect third-party services
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// OAuth endpoints for services that use OAuth
$oauthServices = [
    'stripe' => [
        'auth_url' => 'https://connect.stripe.com/oauth/authorize',
        'token_url' => 'https://connect.stripe.com/oauth/token',
        'scope' => 'read_write',
    ],
    'paypal' => [
        'auth_url' => 'https://www.paypal.com/signin/authorize',
        'token_url' => 'https://api.paypal.com/v1/oauth2/token',
        'scope' => 'openid profile email',
    ],
    'shopify' => [
        'auth_url' => 'https://{shop}.myshopify.com/admin/oauth/authorize',
        'token_url' => 'https://{shop}.myshopify.com/admin/oauth/access_token',
        'scope' => 'read_orders,read_products,write_orders',
    ],
    'hubspot' => [
        'auth_url' => 'https://app.hubspot.com/oauth/authorize',
        'token_url' => 'https://api.hubapi.com/oauth/v1/token',
        'scope' => 'contacts crm.objects.contacts.read crm.objects.contacts.write',
    ],
    'mailchimp' => [
        'auth_url' => 'https://login.mailchimp.com/oauth2/authorize',
        'token_url' => 'https://login.mailchimp.com/oauth2/token',
        'scope' => '',
    ],
];

// API key services
$apiKeyServices = ['netopia', 'euplatesc', 'fan_courier', 'cargus', 'dpd', 'sameday', 'smartbill', 'oblio', 'emag_marketplace', 'woocommerce', 'prestashop', 'saga', 'brd', 'bcr', 'bt', 'ing'];

try {
    $db = getDbConnection();
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $integrationId = $input['integration_id'] ?? null;
        
        if (!$integrationId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'integration_id required']);
            exit;
        }
        
        // Check if already connected
        $stmt = $db->prepare("SELECT id FROM company_integrations WHERE company_id = :company_id AND integration_id = :integration_id");
        $stmt->execute(['company_id' => $companyId, 'integration_id' => $integrationId]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Această integrare este deja conectată',
                'error' => 'This integration is already connected'
            ]);
            exit;
        }
        
        // Handle OAuth-based services
        if (isset($oauthServices[$integrationId])) {
            $oauth = $oauthServices[$integrationId];
            $state = bin2hex(random_bytes(16));
            
            // Store state for verification
            $stmt = $db->prepare("
                INSERT INTO integration_oauth_states (state, company_id, integration_id, created_at, expires_at)
                VALUES (:state, :company_id, :integration_id, NOW(), DATE_ADD(NOW(), INTERVAL 10 MINUTE))
            ");
            $stmt->execute([
                'state' => $state,
                'company_id' => $companyId,
                'integration_id' => $integrationId,
            ]);
            
            $redirectUri = urlencode('https://documentiulia.ro/api/v1/integrations/callback.php');
            $authUrl = $oauth['auth_url'] . '?' . http_build_query([
                'client_id' => getenv('OAUTH_CLIENT_' . strtoupper($integrationId)),
                'redirect_uri' => $redirectUri,
                'scope' => $oauth['scope'],
                'state' => $state,
                'response_type' => 'code',
            ]);
            
            echo json_encode([
                'success' => true,
                'auth_type' => 'oauth',
                'auth_url' => $authUrl,
                'message_ro' => 'Redirecționare către autorizare...',
                'message_en' => 'Redirecting to authorization...',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // Handle API key-based services
        if (in_array($integrationId, $apiKeyServices)) {
            $credentials = $input['credentials'] ?? [];
            
            // Validate required credentials
            $requiredCreds = getRequiredCredentials($integrationId);
            foreach ($requiredCreds as $cred) {
                if (empty($credentials[$cred])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => "Credential '$cred' is required",
                        'required_credentials' => $requiredCreds,
                    ]);
                    exit;
                }
            }
            
            // Test connection
            $testResult = testIntegrationConnection($integrationId, $credentials);
            if (!$testResult['success']) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Conectare eșuată: ' . ($testResult['error'] ?? 'Credențiale invalide'),
                    'error' => 'Connection failed: ' . ($testResult['error'] ?? 'Invalid credentials'),
                ]);
                exit;
            }
            
            // Store connection
            $connectionId = 'int_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO company_integrations (
                    id, company_id, integration_id, credentials, status,
                    connected_by, connected_at
                ) VALUES (
                    :id, :company_id, :integration_id, :credentials, 'active',
                    :connected_by, NOW()
                )
            ");
            $stmt->execute([
                'id' => $connectionId,
                'company_id' => $companyId,
                'integration_id' => $integrationId,
                'credentials' => json_encode(encryptCredentials($credentials)),
                'connected_by' => $user['user_id'],
            ]);
            
            echo json_encode([
                'success' => true,
                'auth_type' => 'api_key',
                'connection_id' => $connectionId,
                'message_ro' => 'Integrare conectată cu succes',
                'message_en' => 'Integration connected successfully',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }
        
    } elseif ($method === 'DELETE') {
        // Disconnect integration
        $integrationId = $_GET['integration_id'] ?? null;
        
        if (!$integrationId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'integration_id required']);
            exit;
        }
        
        $stmt = $db->prepare("
            DELETE FROM company_integrations
            WHERE company_id = :company_id AND integration_id = :integration_id
        ");
        $stmt->execute(['company_id' => $companyId, 'integration_id' => $integrationId]);
        
        echo json_encode([
            'success' => true,
            'message_ro' => 'Integrare deconectată cu succes',
            'message_en' => 'Integration disconnected successfully',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}

function getRequiredCredentials($integrationId) {
    $requirements = [
        'netopia' => ['api_key', 'public_key'],
        'euplatesc' => ['merchant_id', 'secret_key'],
        'fan_courier' => ['client_id', 'username', 'password'],
        'cargus' => ['api_key', 'username', 'password'],
        'dpd' => ['username', 'password'],
        'sameday' => ['username', 'password'],
        'smartbill' => ['email', 'api_key'],
        'oblio' => ['email', 'api_key'],
        'emag_marketplace' => ['username', 'api_key'],
        'woocommerce' => ['store_url', 'consumer_key', 'consumer_secret'],
        'prestashop' => ['store_url', 'api_key'],
        'saga' => ['license_key'],
        'brd' => ['client_id', 'client_secret'],
        'bcr' => ['client_id', 'client_secret'],
        'bt' => ['client_id', 'client_secret'],
        'ing' => ['client_id', 'client_secret'],
    ];
    return $requirements[$integrationId] ?? ['api_key'];
}

function testIntegrationConnection($integrationId, $credentials) {
    // Simplified test - in production would make actual API call
    return ['success' => true];
}

function encryptCredentials($credentials) {
    // In production, would use proper encryption
    return $credentials;
}
