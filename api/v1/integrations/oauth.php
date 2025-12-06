<?php
/**
 * OAuth Providers API
 * Manage OAuth connections with external services
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
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

// Supported OAuth providers
$providers = [
    'google' => [
        'name' => 'Google',
        'label_ro' => 'Google',
        'label_en' => 'Google',
        'icon' => 'google',
        'scopes' => ['email', 'profile', 'calendar', 'drive'],
        'features' => ['calendar_sync', 'drive_backup', 'contacts_import'],
    ],
    'microsoft' => [
        'name' => 'Microsoft',
        'label_ro' => 'Microsoft',
        'label_en' => 'Microsoft',
        'icon' => 'microsoft',
        'scopes' => ['email', 'profile', 'calendars', 'onedrive'],
        'features' => ['outlook_sync', 'onedrive_backup', 'teams_notifications'],
    ],
    'facebook' => [
        'name' => 'Facebook',
        'label_ro' => 'Facebook',
        'label_en' => 'Facebook',
        'icon' => 'facebook',
        'scopes' => ['email', 'public_profile', 'pages_manage_metadata'],
        'features' => ['page_insights', 'messenger_notifications'],
    ],
    'linkedin' => [
        'name' => 'LinkedIn',
        'label_ro' => 'LinkedIn',
        'label_en' => 'LinkedIn',
        'icon' => 'linkedin',
        'scopes' => ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
        'features' => ['profile_import', 'company_page'],
    ],
    'dropbox' => [
        'name' => 'Dropbox',
        'label_ro' => 'Dropbox',
        'label_en' => 'Dropbox',
        'icon' => 'dropbox',
        'scopes' => ['files.content.read', 'files.content.write'],
        'features' => ['document_backup', 'file_sync'],
    ],
    'slack' => [
        'name' => 'Slack',
        'label_ro' => 'Slack',
        'label_en' => 'Slack',
        'icon' => 'slack',
        'scopes' => ['chat:write', 'channels:read', 'users:read'],
        'features' => ['notifications', 'channel_alerts'],
    ],
    'xero' => [
        'name' => 'Xero',
        'label_ro' => 'Xero',
        'label_en' => 'Xero',
        'icon' => 'xero',
        'scopes' => ['accounting.transactions', 'accounting.contacts'],
        'features' => ['invoice_sync', 'contact_sync', 'expense_sync'],
    ],
    'quickbooks' => [
        'name' => 'QuickBooks',
        'label_ro' => 'QuickBooks',
        'label_en' => 'QuickBooks',
        'icon' => 'quickbooks',
        'scopes' => ['com.intuit.quickbooks.accounting'],
        'features' => ['invoice_sync', 'payment_sync', 'report_export'],
    ],
];

// Connection statuses
$statuses = [
    'connected' => ['ro' => 'Conectat', 'en' => 'Connected'],
    'disconnected' => ['ro' => 'Deconectat', 'en' => 'Disconnected'],
    'expired' => ['ro' => 'Expirat', 'en' => 'Expired'],
    'error' => ['ro' => 'Eroare', 'en' => 'Error'],
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $provider = $_GET['provider'] ?? null;

            if ($provider) {
                // Get specific provider connection
                if (!isset($providers[$provider])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Provider invalid',
                        'error' => 'Invalid provider'
                    ]);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT * FROM oauth_connections
                    WHERE company_id = :company_id AND provider = :provider
                ");
                $stmt->execute(['company_id' => $companyId, 'provider' => $provider]);
                $connection = $stmt->fetch(PDO::FETCH_ASSOC);

                $providerConfig = $providers[$provider];
                $providerConfig['provider'] = $provider;
                $providerConfig['connection'] = $connection ? [
                    'id' => $connection['id'],
                    'status' => $connection['status'],
                    'status_label' => $statuses[$connection['status']] ?? null,
                    'connected_at' => $connection['connected_at'],
                    'expires_at' => $connection['expires_at'],
                    'scopes' => json_decode($connection['scopes'] ?? '[]', true),
                    'account_name' => $connection['account_name'],
                    'account_email' => $connection['account_email'],
                ] : null;
                $providerConfig['is_connected'] = $connection && $connection['status'] === 'connected';

                echo json_encode([
                    'success' => true,
                    'data' => $providerConfig,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List all providers and connections
                $stmt = $db->prepare("
                    SELECT * FROM oauth_connections
                    WHERE company_id = :company_id
                ");
                $stmt->execute(['company_id' => $companyId]);
                $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Index connections by provider
                $connectionIndex = [];
                foreach ($connections as $conn) {
                    $connectionIndex[$conn['provider']] = $conn;
                }

                // Build provider list with connection status
                $providerList = [];
                foreach ($providers as $key => $config) {
                    $conn = $connectionIndex[$key] ?? null;
                    $providerList[] = [
                        'provider' => $key,
                        'name' => $config['name'],
                        'label_ro' => $config['label_ro'],
                        'label_en' => $config['label_en'],
                        'icon' => $config['icon'],
                        'features' => $config['features'],
                        'is_connected' => $conn && $conn['status'] === 'connected',
                        'status' => $conn['status'] ?? 'disconnected',
                        'status_label' => $statuses[$conn['status'] ?? 'disconnected'] ?? null,
                        'account_name' => $conn['account_name'] ?? null,
                    ];
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'providers' => $providerList,
                        'statuses' => $statuses,
                        'connected_count' => count(array_filter($providerList, fn($p) => $p['is_connected'])),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a gestiona integrările',
                    'error' => 'You do not have permission to manage integrations'
                ]);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'connect';
            $provider = $input['provider'] ?? null;

            if (!$provider || !isset($providers[$provider])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Provider invalid',
                    'error' => 'Invalid provider'
                ]);
                exit;
            }

            if ($action === 'connect') {
                // Generate OAuth URL
                $state = bin2hex(random_bytes(16));
                $scopes = $input['scopes'] ?? $providers[$provider]['scopes'];

                // Store state for verification
                $stateId = 'oauth_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO oauth_states (id, company_id, user_id, provider, state, scopes, created_at, expires_at)
                    VALUES (:id, :company_id, :user_id, :provider, :state, :scopes, NOW(), NOW() + INTERVAL '15 minutes')
                ");
                $stmt->execute([
                    'id' => $stateId,
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'provider' => $provider,
                    'state' => $state,
                    'scopes' => json_encode($scopes),
                ]);

                // Generate auth URL (placeholder - real implementation would use provider-specific URLs)
                $authUrl = "https://oauth.{$provider}.com/authorize?" . http_build_query([
                    'client_id' => getenv(strtoupper($provider) . '_CLIENT_ID'),
                    'redirect_uri' => 'https://documentiulia.ro/api/v1/integrations/oauth-callback.php',
                    'scope' => implode(' ', $scopes),
                    'state' => $state,
                    'response_type' => 'code',
                ]);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'auth_url' => $authUrl,
                        'state' => $state,
                        'provider' => $provider,
                        'scopes' => $scopes,
                    ],
                    'message_ro' => 'Redirecționează pentru autentificare',
                    'message_en' => 'Redirecting for authentication',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'callback') {
                // Handle OAuth callback
                $code = $input['code'] ?? null;
                $state = $input['state'] ?? null;

                if (!$code || !$state) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Code and state required']);
                    exit;
                }

                // Verify state
                $stmt = $db->prepare("
                    SELECT * FROM oauth_states
                    WHERE state = :state AND company_id = :company_id AND expires_at > NOW()
                ");
                $stmt->execute(['state' => $state, 'company_id' => $companyId]);
                $stateRecord = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$stateRecord) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Stare invalidă sau expirată',
                        'error' => 'Invalid or expired state'
                    ]);
                    exit;
                }

                // Exchange code for tokens (placeholder)
                $tokens = [
                    'access_token' => 'at_' . bin2hex(random_bytes(32)),
                    'refresh_token' => 'rt_' . bin2hex(random_bytes(32)),
                    'expires_in' => 3600,
                ];

                // Save connection
                $connId = 'conn_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO oauth_connections (
                        id, company_id, provider, status, access_token, refresh_token,
                        scopes, account_name, account_email, connected_at, expires_at
                    ) VALUES (
                        :id, :company_id, :provider, 'connected', :access_token, :refresh_token,
                        :scopes, :account_name, :account_email, NOW(), NOW() + INTERVAL '1 hour'
                    )
                    ON CONFLICT (company_id, provider)
                    DO UPDATE SET
                        status = 'connected',
                        access_token = EXCLUDED.access_token,
                        refresh_token = EXCLUDED.refresh_token,
                        scopes = EXCLUDED.scopes,
                        connected_at = NOW(),
                        expires_at = EXCLUDED.expires_at
                ");
                $stmt->execute([
                    'id' => $connId,
                    'company_id' => $companyId,
                    'provider' => $stateRecord['provider'],
                    'access_token' => $tokens['access_token'],
                    'refresh_token' => $tokens['refresh_token'],
                    'scopes' => $stateRecord['scopes'],
                    'account_name' => $input['account_name'] ?? 'Connected Account',
                    'account_email' => $input['account_email'] ?? null,
                ]);

                // Clean up state
                $db->prepare("DELETE FROM oauth_states WHERE id = :id")->execute(['id' => $stateRecord['id']]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Conectat cu succes la ' . $providers[$stateRecord['provider']]['name'],
                    'message_en' => 'Successfully connected to ' . $providers[$stateRecord['provider']]['name'],
                    'data' => ['provider' => $stateRecord['provider']],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'refresh') {
                // Refresh token
                $stmt = $db->prepare("
                    SELECT * FROM oauth_connections
                    WHERE company_id = :company_id AND provider = :provider
                ");
                $stmt->execute(['company_id' => $companyId, 'provider' => $provider]);
                $connection = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$connection) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Connection not found']);
                    exit;
                }

                // Refresh tokens (placeholder)
                $newToken = 'at_' . bin2hex(random_bytes(32));
                $db->prepare("
                    UPDATE oauth_connections SET
                        access_token = :token,
                        expires_at = NOW() + INTERVAL '1 hour',
                        status = 'connected'
                    WHERE id = :id
                ")->execute(['token' => $newToken, 'id' => $connection['id']]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Token reîmprospătat',
                    'message_en' => 'Token refreshed',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'DELETE':
            if (!in_array($user['role'], ['admin', 'manager'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu aveți permisiunea de a deconecta integrările',
                    'error' => 'You do not have permission to disconnect integrations'
                ]);
                exit;
            }

            $provider = $_GET['provider'] ?? null;

            if (!$provider) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'provider required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM oauth_connections WHERE company_id = :company_id AND provider = :provider");
            $stmt->execute(['company_id' => $companyId, 'provider' => $provider]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Integrare deconectată',
                'message_en' => 'Integration disconnected',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
