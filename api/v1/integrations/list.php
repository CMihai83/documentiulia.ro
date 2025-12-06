<?php
/**
 * Available Integrations List API
 * Lists all available third-party integrations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

// Available integrations catalog
$integrations = [
    'banking' => [
        'category_ro' => 'Bănci',
        'category_en' => 'Banking',
        'services' => [
            [
                'id' => 'brd',
                'name' => 'BRD Groupe Société Générale',
                'logo' => '/assets/integrations/brd.png',
                'status' => 'available',
                'features' => ['account_sync', 'transactions', 'statements'],
                'description_ro' => 'Sincronizare automată conturi și tranzacții BRD',
                'description_en' => 'Automatic BRD account and transaction sync',
            ],
            [
                'id' => 'bcr',
                'name' => 'Banca Comercială Română',
                'logo' => '/assets/integrations/bcr.png',
                'status' => 'available',
                'features' => ['account_sync', 'transactions', 'statements'],
                'description_ro' => 'Conectare BCR pentru import automat',
                'description_en' => 'BCR connection for automatic import',
            ],
            [
                'id' => 'bt',
                'name' => 'Banca Transilvania',
                'logo' => '/assets/integrations/bt.png',
                'status' => 'available',
                'features' => ['account_sync', 'transactions', 'statements', 'payments'],
                'description_ro' => 'Integrare completă Banca Transilvania',
                'description_en' => 'Complete Banca Transilvania integration',
            ],
            [
                'id' => 'ing',
                'name' => 'ING Bank',
                'logo' => '/assets/integrations/ing.png',
                'status' => 'available',
                'features' => ['account_sync', 'transactions'],
                'description_ro' => 'Sincronizare conturi ING',
                'description_en' => 'ING account synchronization',
            ],
            [
                'id' => 'raiffeisen',
                'name' => 'Raiffeisen Bank',
                'logo' => '/assets/integrations/raiffeisen.png',
                'status' => 'coming_soon',
                'features' => ['account_sync', 'transactions'],
                'description_ro' => 'În curând disponibil',
                'description_en' => 'Coming soon',
            ],
        ],
    ],
    'payments' => [
        'category_ro' => 'Plăți Online',
        'category_en' => 'Online Payments',
        'services' => [
            [
                'id' => 'stripe',
                'name' => 'Stripe',
                'logo' => '/assets/integrations/stripe.png',
                'status' => 'available',
                'features' => ['invoicing', 'subscriptions', 'webhooks'],
                'description_ro' => 'Acceptă plăți cu cardul prin Stripe',
                'description_en' => 'Accept card payments via Stripe',
            ],
            [
                'id' => 'netopia',
                'name' => 'NETOPIA Payments',
                'logo' => '/assets/integrations/netopia.png',
                'status' => 'available',
                'features' => ['invoicing', 'recurring'],
                'description_ro' => 'Plăți online pentru România',
                'description_en' => 'Online payments for Romania',
            ],
            [
                'id' => 'paypal',
                'name' => 'PayPal',
                'logo' => '/assets/integrations/paypal.png',
                'status' => 'available',
                'features' => ['invoicing', 'international'],
                'description_ro' => 'Plăți internaționale PayPal',
                'description_en' => 'International PayPal payments',
            ],
            [
                'id' => 'euplatesc',
                'name' => 'EuPlătesc',
                'logo' => '/assets/integrations/euplatesc.png',
                'status' => 'available',
                'features' => ['invoicing', 'recurring'],
                'description_ro' => 'Procesator plăți românesc',
                'description_en' => 'Romanian payment processor',
            ],
        ],
    ],
    'ecommerce' => [
        'category_ro' => 'E-Commerce',
        'category_en' => 'E-Commerce',
        'services' => [
            [
                'id' => 'shopify',
                'name' => 'Shopify',
                'logo' => '/assets/integrations/shopify.png',
                'status' => 'available',
                'features' => ['orders', 'products', 'customers', 'invoicing'],
                'description_ro' => 'Sincronizare comenzi și produse Shopify',
                'description_en' => 'Sync Shopify orders and products',
            ],
            [
                'id' => 'woocommerce',
                'name' => 'WooCommerce',
                'logo' => '/assets/integrations/woocommerce.png',
                'status' => 'available',
                'features' => ['orders', 'products', 'customers', 'invoicing'],
                'description_ro' => 'Integrare WordPress WooCommerce',
                'description_en' => 'WordPress WooCommerce integration',
            ],
            [
                'id' => 'emag_marketplace',
                'name' => 'eMAG Marketplace',
                'logo' => '/assets/integrations/emag.png',
                'status' => 'available',
                'features' => ['orders', 'products', 'inventory'],
                'description_ro' => 'Vânzări pe eMAG Marketplace',
                'description_en' => 'Sell on eMAG Marketplace',
            ],
            [
                'id' => 'prestashop',
                'name' => 'PrestaShop',
                'logo' => '/assets/integrations/prestashop.png',
                'status' => 'available',
                'features' => ['orders', 'products', 'customers'],
                'description_ro' => 'Conectare magazin PrestaShop',
                'description_en' => 'Connect PrestaShop store',
            ],
        ],
    ],
    'accounting' => [
        'category_ro' => 'Contabilitate',
        'category_en' => 'Accounting',
        'services' => [
            [
                'id' => 'saga',
                'name' => 'SAGA C',
                'logo' => '/assets/integrations/saga.png',
                'status' => 'available',
                'features' => ['export', 'import', 'sync'],
                'description_ro' => 'Export/Import pentru SAGA C',
                'description_en' => 'Export/Import for SAGA C',
            ],
            [
                'id' => 'smartbill',
                'name' => 'SmartBill',
                'logo' => '/assets/integrations/smartbill.png',
                'status' => 'available',
                'features' => ['invoices', 'sync'],
                'description_ro' => 'Sincronizare facturi SmartBill',
                'description_en' => 'SmartBill invoice sync',
            ],
            [
                'id' => 'oblio',
                'name' => 'Oblio',
                'logo' => '/assets/integrations/oblio.png',
                'status' => 'available',
                'features' => ['invoices', 'efactura'],
                'description_ro' => 'Facturare și e-Factura prin Oblio',
                'description_en' => 'Invoicing and e-Invoice via Oblio',
            ],
        ],
    ],
    'courier' => [
        'category_ro' => 'Curierat',
        'category_en' => 'Shipping',
        'services' => [
            [
                'id' => 'fan_courier',
                'name' => 'FAN Courier',
                'logo' => '/assets/integrations/fan.png',
                'status' => 'available',
                'features' => ['awb', 'tracking', 'rates'],
                'description_ro' => 'Generare AWB și tracking FAN Courier',
                'description_en' => 'FAN Courier AWB generation and tracking',
            ],
            [
                'id' => 'cargus',
                'name' => 'Cargus',
                'logo' => '/assets/integrations/cargus.png',
                'status' => 'available',
                'features' => ['awb', 'tracking', 'rates'],
                'description_ro' => 'Integrare completă Cargus',
                'description_en' => 'Complete Cargus integration',
            ],
            [
                'id' => 'dpd',
                'name' => 'DPD Romania',
                'logo' => '/assets/integrations/dpd.png',
                'status' => 'available',
                'features' => ['awb', 'tracking'],
                'description_ro' => 'Expediere prin DPD',
                'description_en' => 'Ship via DPD',
            ],
            [
                'id' => 'sameday',
                'name' => 'Sameday',
                'logo' => '/assets/integrations/sameday.png',
                'status' => 'available',
                'features' => ['awb', 'tracking', 'locker'],
                'description_ro' => 'Livrare rapidă și easybox',
                'description_en' => 'Fast delivery and locker',
            ],
        ],
    ],
    'crm' => [
        'category_ro' => 'CRM & Marketing',
        'category_en' => 'CRM & Marketing',
        'services' => [
            [
                'id' => 'mailchimp',
                'name' => 'Mailchimp',
                'logo' => '/assets/integrations/mailchimp.png',
                'status' => 'available',
                'features' => ['contacts', 'campaigns'],
                'description_ro' => 'Sincronizare contacte pentru email marketing',
                'description_en' => 'Contact sync for email marketing',
            ],
            [
                'id' => 'hubspot',
                'name' => 'HubSpot',
                'logo' => '/assets/integrations/hubspot.png',
                'status' => 'available',
                'features' => ['contacts', 'deals', 'companies'],
                'description_ro' => 'Integrare CRM HubSpot',
                'description_en' => 'HubSpot CRM integration',
            ],
        ],
    ],
];

// Get connected integrations for this company
$connected = [];
if ($companyId) {
    try {
        $db = getDbConnection();
        $stmt = $db->prepare("
            SELECT integration_id, status, connected_at, last_sync
            FROM company_integrations
            WHERE company_id = :company_id
        ");
        $stmt->execute(['company_id' => $companyId]);
        $connected = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $connected = array_column($connected, null, 'integration_id');
    } catch (Exception $e) {
        // Continue without connected status
    }
}

// Mark connected status
foreach ($integrations as $category => &$categoryData) {
    foreach ($categoryData['services'] as &$service) {
        $service['connected'] = isset($connected[$service['id']]);
        if ($service['connected']) {
            $service['connection_status'] = $connected[$service['id']]['status'];
            $service['connected_at'] = $connected[$service['id']]['connected_at'];
            $service['last_sync'] = $connected[$service['id']]['last_sync'];
        }
    }
}

echo json_encode([
    'success' => true,
    'data' => [
        'integrations' => $integrations,
        'connected_count' => count($connected),
        'categories' => array_keys($integrations),
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
