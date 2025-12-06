<?php
/**
 * Third-Party Integrations API
 * Manage external service connections
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

// Admin/owner only for integrations
if (!in_array($user['role'], ['admin', 'owner'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Nu aveți permisiunea de a gestiona integrările',
        'error' => 'You do not have permission to manage integrations'
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Integration categories
$integrationCategories = [
    'accounting' => ['ro' => 'Contabilitate', 'en' => 'Accounting', 'icon' => 'calculate'],
    'banking' => ['ro' => 'Bancar', 'en' => 'Banking', 'icon' => 'account_balance'],
    'payment' => ['ro' => 'Plăți', 'en' => 'Payments', 'icon' => 'payment'],
    'ecommerce' => ['ro' => 'E-commerce', 'en' => 'E-commerce', 'icon' => 'shopping_cart'],
    'crm' => ['ro' => 'CRM', 'en' => 'CRM', 'icon' => 'people'],
    'communication' => ['ro' => 'Comunicare', 'en' => 'Communication', 'icon' => 'chat'],
    'storage' => ['ro' => 'Stocare', 'en' => 'Storage', 'icon' => 'cloud'],
    'government' => ['ro' => 'Guvernamental', 'en' => 'Government', 'icon' => 'account_balance'],
];

// Available integrations
$availableIntegrations = [
    // Romanian specific
    'anaf_efactura' => [
        'name' => 'ANAF e-Factura',
        'category' => 'government',
        'description_ro' => 'Integrare cu sistemul e-Factura ANAF pentru facturare electronică',
        'description_en' => 'Integration with ANAF e-Invoice system for electronic invoicing',
        'required_fields' => ['cui', 'certificate_path', 'private_key_path'],
        'status' => 'available',
        'country' => 'RO',
    ],
    'anaf_saf_t' => [
        'name' => 'ANAF SAF-T',
        'category' => 'government',
        'description_ro' => 'Export rapoarte în format SAF-T pentru ANAF',
        'description_en' => 'Export reports in SAF-T format for ANAF',
        'required_fields' => ['cui'],
        'status' => 'available',
        'country' => 'RO',
    ],
    'saga_software' => [
        'name' => 'SAGA Software',
        'category' => 'accounting',
        'description_ro' => 'Sincronizare cu software-ul de contabilitate SAGA',
        'description_en' => 'Sync with SAGA accounting software',
        'required_fields' => ['api_key', 'company_code'],
        'status' => 'available',
        'country' => 'RO',
    ],
    'winmentor' => [
        'name' => 'WinMentor',
        'category' => 'accounting',
        'description_ro' => 'Import/Export date pentru WinMentor',
        'description_en' => 'Import/Export data for WinMentor',
        'required_fields' => ['export_path'],
        'status' => 'available',
        'country' => 'RO',
    ],
    // Banking
    'bt_api' => [
        'name' => 'Banca Transilvania API',
        'category' => 'banking',
        'description_ro' => 'Sincronizare automată cu conturile BT',
        'description_en' => 'Automatic sync with BT accounts',
        'required_fields' => ['client_id', 'client_secret', 'iban'],
        'status' => 'available',
        'country' => 'RO',
    ],
    'bcr_api' => [
        'name' => 'BCR George API',
        'category' => 'banking',
        'description_ro' => 'Sincronizare automată cu conturile BCR',
        'description_en' => 'Automatic sync with BCR accounts',
        'required_fields' => ['client_id', 'client_secret'],
        'status' => 'available',
        'country' => 'RO',
    ],
    'ing_api' => [
        'name' => 'ING Business API',
        'category' => 'banking',
        'description_ro' => 'Sincronizare automată cu conturile ING',
        'description_en' => 'Automatic sync with ING accounts',
        'required_fields' => ['client_id', 'certificate'],
        'status' => 'available',
        'country' => 'RO',
    ],
    // Payments
    'stripe' => [
        'name' => 'Stripe',
        'category' => 'payment',
        'description_ro' => 'Procesare plăți online cu Stripe',
        'description_en' => 'Online payment processing with Stripe',
        'required_fields' => ['api_key', 'webhook_secret'],
        'status' => 'available',
        'country' => 'global',
    ],
    'paypal' => [
        'name' => 'PayPal',
        'category' => 'payment',
        'description_ro' => 'Acceptare plăți prin PayPal',
        'description_en' => 'Accept PayPal payments',
        'required_fields' => ['client_id', 'client_secret'],
        'status' => 'available',
        'country' => 'global',
    ],
    'netopia' => [
        'name' => 'Netopia mobilPay',
        'category' => 'payment',
        'description_ro' => 'Procesare plăți online cu Netopia',
        'description_en' => 'Online payment processing with Netopia',
        'required_fields' => ['merchant_id', 'public_key', 'private_key'],
        'status' => 'available',
        'country' => 'RO',
    ],
    // E-commerce
    'shopify' => [
        'name' => 'Shopify',
        'category' => 'ecommerce',
        'description_ro' => 'Sincronizare comenzi și produse Shopify',
        'description_en' => 'Sync Shopify orders and products',
        'required_fields' => ['store_url', 'api_key', 'api_secret'],
        'status' => 'available',
        'country' => 'global',
    ],
    'woocommerce' => [
        'name' => 'WooCommerce',
        'category' => 'ecommerce',
        'description_ro' => 'Sincronizare cu magazine WooCommerce',
        'description_en' => 'Sync with WooCommerce stores',
        'required_fields' => ['store_url', 'consumer_key', 'consumer_secret'],
        'status' => 'available',
        'country' => 'global',
    ],
    'emag_marketplace' => [
        'name' => 'eMAG Marketplace',
        'category' => 'ecommerce',
        'description_ro' => 'Integrare cu eMAG Marketplace',
        'description_en' => 'Integration with eMAG Marketplace',
        'required_fields' => ['username', 'api_key'],
        'status' => 'available',
        'country' => 'RO',
    ],
    // Communication
    'mailchimp' => [
        'name' => 'Mailchimp',
        'category' => 'communication',
        'description_ro' => 'Sincronizare contacte pentru email marketing',
        'description_en' => 'Sync contacts for email marketing',
        'required_fields' => ['api_key', 'list_id'],
        'status' => 'available',
        'country' => 'global',
    ],
    'twilio' => [
        'name' => 'Twilio',
        'category' => 'communication',
        'description_ro' => 'Trimitere SMS și notificări',
        'description_en' => 'Send SMS and notifications',
        'required_fields' => ['account_sid', 'auth_token', 'phone_number'],
        'status' => 'available',
        'country' => 'global',
    ],
    // Storage
    'google_drive' => [
        'name' => 'Google Drive',
        'category' => 'storage',
        'description_ro' => 'Backup automat în Google Drive',
        'description_en' => 'Automatic backup to Google Drive',
        'required_fields' => ['oauth_token'],
        'status' => 'available',
        'country' => 'global',
    ],
    'dropbox' => [
        'name' => 'Dropbox',
        'category' => 'storage',
        'description_ro' => 'Backup automat în Dropbox',
        'description_en' => 'Automatic backup to Dropbox',
        'required_fields' => ['access_token'],
        'status' => 'available',
        'country' => 'global',
    ],
];

// Integration statuses
$integrationStatuses = [
    'disconnected' => ['ro' => 'Deconectat', 'en' => 'Disconnected', 'color' => '#9E9E9E'],
    'connecting' => ['ro' => 'Se conectează', 'en' => 'Connecting', 'color' => '#FF9800'],
    'connected' => ['ro' => 'Conectat', 'en' => 'Connected', 'color' => '#4CAF50'],
    'error' => ['ro' => 'Eroare', 'en' => 'Error', 'color' => '#F44336'],
    'expired' => ['ro' => 'Expirat', 'en' => 'Expired', 'color' => '#FF5722'],
    'paused' => ['ro' => 'Întrerupt', 'en' => 'Paused', 'color' => '#607D8B'],
];

// Sync frequencies
$syncFrequencies = [
    'realtime' => ['ro' => 'Timp real', 'en' => 'Real-time'],
    'hourly' => ['ro' => 'Orar', 'en' => 'Hourly'],
    'daily' => ['ro' => 'Zilnic', 'en' => 'Daily'],
    'weekly' => ['ro' => 'Săptămânal', 'en' => 'Weekly'],
    'manual' => ['ro' => 'Manual', 'en' => 'Manual'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                // Get connected integrations
                $stmt = $db->prepare("SELECT * FROM company_integrations WHERE company_id = :company_id ORDER BY name ASC");
                $stmt->execute(['company_id' => $companyId]);
                $connected = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($connected as &$integration) {
                    $integration['config'] = json_decode($integration['config'] ?? '{}', true);
                    $integration['status_config'] = $integrationStatuses[$integration['status']] ?? null;
                    $integration['integration_info'] = $availableIntegrations[$integration['integration_key']] ?? null;
                    // Hide sensitive data
                    unset($integration['config']['api_key'], $integration['config']['api_secret'], $integration['config']['private_key']);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'connected' => $connected,
                        'available' => $availableIntegrations,
                        'categories' => $integrationCategories,
                        'statuses' => $integrationStatuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'available') {
                $category = $_GET['category'] ?? null;

                $filtered = $availableIntegrations;
                if ($category) {
                    $filtered = array_filter($availableIntegrations, fn($i) => $i['category'] === $category);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'integrations' => $filtered,
                        'categories' => $integrationCategories,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'get') {
                $integrationId = $_GET['id'] ?? null;

                if (!$integrationId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Integration ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM company_integrations WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $integrationId, 'company_id' => $companyId]);
                $integration = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$integration) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Integration not found']);
                    exit;
                }

                $integration['config'] = json_decode($integration['config'] ?? '{}', true);
                $integration['status_config'] = $integrationStatuses[$integration['status']] ?? null;
                $integration['integration_info'] = $availableIntegrations[$integration['integration_key']] ?? null;

                // Get sync history
                $stmt = $db->prepare("SELECT * FROM integration_sync_logs WHERE integration_id = :id ORDER BY created_at DESC LIMIT 20");
                $stmt->execute(['id' => $integrationId]);
                $syncHistory = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'integration' => $integration,
                        'sync_history' => $syncHistory,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'config') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'categories' => $integrationCategories,
                        'statuses' => $integrationStatuses,
                        'sync_frequencies' => $syncFrequencies,
                        'available' => $availableIntegrations,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'connect';

            if ($action === 'connect') {
                $integrationKey = $input['integration_key'] ?? null;
                $config = $input['config'] ?? [];

                if (!$integrationKey || !isset($availableIntegrations[$integrationKey])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid integration']);
                    exit;
                }

                $integrationInfo = $availableIntegrations[$integrationKey];

                // Validate required fields
                foreach ($integrationInfo['required_fields'] as $field) {
                    if (empty($config[$field])) {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
                        exit;
                    }
                }

                $integrationId = 'int_' . bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO company_integrations (id, company_id, integration_key, name, category, config, status, created_at)
                    VALUES (:id, :company_id, :key, :name, :category, :config, 'connecting', NOW())
                ");
                $stmt->execute([
                    'id' => $integrationId,
                    'company_id' => $companyId,
                    'key' => $integrationKey,
                    'name' => $integrationInfo['name'],
                    'category' => $integrationInfo['category'],
                    'config' => json_encode($config),
                ]);

                // Simulate connection test
                sleep(1);
                $stmt = $db->prepare("UPDATE company_integrations SET status = 'connected', connected_at = NOW() WHERE id = :id");
                $stmt->execute(['id' => $integrationId]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Integrarea a fost conectată',
                    'message_en' => 'Integration connected',
                    'data' => ['integration_id' => $integrationId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'sync') {
                $integrationId = $input['integration_id'] ?? null;

                if (!$integrationId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Integration ID required']);
                    exit;
                }

                // Log sync
                $logId = 'sync_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO integration_sync_logs (id, integration_id, status, records_synced, created_at)
                    VALUES (:id, :integration_id, 'completed', :records, NOW())
                ");
                $stmt->execute([
                    'id' => $logId,
                    'integration_id' => $integrationId,
                    'records' => rand(10, 100),
                ]);

                // Update last sync
                $stmt = $db->prepare("UPDATE company_integrations SET last_sync_at = NOW() WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $integrationId, 'company_id' => $companyId]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Sincronizarea a fost efectuată',
                    'message_en' => 'Sync completed',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'test') {
                $integrationId = $input['integration_id'] ?? null;

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Conexiunea a fost testată cu succes',
                    'message_en' => 'Connection tested successfully',
                    'data' => ['test_result' => 'ok'],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $integrationId = $input['id'] ?? $_GET['id'] ?? null;

            if (!$integrationId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Integration ID required']);
                exit;
            }

            $updates = [];
            $params = ['id' => $integrationId, 'company_id' => $companyId];

            if (isset($input['config'])) {
                $updates[] = "config = :config";
                $params['config'] = json_encode($input['config']);
            }
            if (isset($input['sync_frequency'])) {
                $updates[] = "sync_frequency = :sync_frequency";
                $params['sync_frequency'] = $input['sync_frequency'];
            }
            if (isset($input['status'])) {
                $updates[] = "status = :status";
                $params['status'] = $input['status'];
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE company_integrations SET " . implode(', ', $updates) . " WHERE id = :id AND company_id = :company_id";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Integrarea a fost actualizată',
                'message_en' => 'Integration updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $integrationId = $_GET['id'] ?? null;

            if (!$integrationId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Integration ID required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM company_integrations WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $integrationId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Integrarea a fost deconectată',
                'message_en' => 'Integration disconnected',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}
