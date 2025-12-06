<?php
/**
 * Company Settings API
 * Manage company-wide configuration
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
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

// Setting groups
$settingGroups = [
    'general' => [
        'label_ro' => 'General',
        'label_en' => 'General',
        'settings' => [
            'company_name' => ['type' => 'text', 'label_ro' => 'Nume companie', 'label_en' => 'Company Name'],
            'fiscal_code' => ['type' => 'text', 'label_ro' => 'Cod fiscal', 'label_en' => 'Fiscal Code'],
            'registration_number' => ['type' => 'text', 'label_ro' => 'Nr. înregistrare', 'label_en' => 'Registration Number'],
            'vat_number' => ['type' => 'text', 'label_ro' => 'Cod TVA', 'label_en' => 'VAT Number'],
            'default_currency' => ['type' => 'select', 'label_ro' => 'Monedă implicită', 'label_en' => 'Default Currency', 'options' => ['RON', 'EUR', 'USD']],
            'default_language' => ['type' => 'select', 'label_ro' => 'Limbă implicită', 'label_en' => 'Default Language', 'options' => ['ro', 'en']],
            'timezone' => ['type' => 'select', 'label_ro' => 'Fus orar', 'label_en' => 'Timezone', 'options' => ['Europe/Bucharest', 'UTC', 'Europe/London']],
        ],
    ],
    'address' => [
        'label_ro' => 'Adresă',
        'label_en' => 'Address',
        'settings' => [
            'address_line1' => ['type' => 'text', 'label_ro' => 'Adresă linia 1', 'label_en' => 'Address Line 1'],
            'address_line2' => ['type' => 'text', 'label_ro' => 'Adresă linia 2', 'label_en' => 'Address Line 2'],
            'city' => ['type' => 'text', 'label_ro' => 'Oraș', 'label_en' => 'City'],
            'county' => ['type' => 'text', 'label_ro' => 'Județ', 'label_en' => 'County'],
            'postal_code' => ['type' => 'text', 'label_ro' => 'Cod poștal', 'label_en' => 'Postal Code'],
            'country' => ['type' => 'select', 'label_ro' => 'Țară', 'label_en' => 'Country', 'options' => ['RO', 'BG', 'HU', 'MD', 'UA']],
        ],
    ],
    'contact' => [
        'label_ro' => 'Contact',
        'label_en' => 'Contact',
        'settings' => [
            'phone' => ['type' => 'text', 'label_ro' => 'Telefon', 'label_en' => 'Phone'],
            'email' => ['type' => 'email', 'label_ro' => 'Email', 'label_en' => 'Email'],
            'website' => ['type' => 'url', 'label_ro' => 'Website', 'label_en' => 'Website'],
            'social_facebook' => ['type' => 'url', 'label_ro' => 'Facebook', 'label_en' => 'Facebook'],
            'social_linkedin' => ['type' => 'url', 'label_ro' => 'LinkedIn', 'label_en' => 'LinkedIn'],
        ],
    ],
    'invoicing' => [
        'label_ro' => 'Facturare',
        'label_en' => 'Invoicing',
        'settings' => [
            'invoice_prefix' => ['type' => 'text', 'label_ro' => 'Prefix factură', 'label_en' => 'Invoice Prefix'],
            'invoice_next_number' => ['type' => 'number', 'label_ro' => 'Următorul număr', 'label_en' => 'Next Number'],
            'default_payment_terms' => ['type' => 'number', 'label_ro' => 'Termeni plată (zile)', 'label_en' => 'Payment Terms (days)'],
            'default_vat_rate' => ['type' => 'select', 'label_ro' => 'Cotă TVA implicită', 'label_en' => 'Default VAT Rate', 'options' => ['19', '9', '5', '0']],
            'auto_send_invoice' => ['type' => 'boolean', 'label_ro' => 'Trimitere automată', 'label_en' => 'Auto Send'],
            'enable_efactura' => ['type' => 'boolean', 'label_ro' => 'Activează e-Factura', 'label_en' => 'Enable e-Invoice'],
        ],
    ],
    'branding' => [
        'label_ro' => 'Branding',
        'label_en' => 'Branding',
        'settings' => [
            'logo_url' => ['type' => 'file', 'label_ro' => 'Logo', 'label_en' => 'Logo'],
            'primary_color' => ['type' => 'color', 'label_ro' => 'Culoare primară', 'label_en' => 'Primary Color'],
            'secondary_color' => ['type' => 'color', 'label_ro' => 'Culoare secundară', 'label_en' => 'Secondary Color'],
            'invoice_footer' => ['type' => 'textarea', 'label_ro' => 'Subsol factură', 'label_en' => 'Invoice Footer'],
            'email_signature' => ['type' => 'textarea', 'label_ro' => 'Semnătură email', 'label_en' => 'Email Signature'],
        ],
    ],
    'regional' => [
        'label_ro' => 'Setări regionale',
        'label_en' => 'Regional Settings',
        'settings' => [
            'date_format' => ['type' => 'select', 'label_ro' => 'Format dată', 'label_en' => 'Date Format', 'options' => ['DD.MM.YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']],
            'time_format' => ['type' => 'select', 'label_ro' => 'Format oră', 'label_en' => 'Time Format', 'options' => ['24h', '12h']],
            'number_format' => ['type' => 'select', 'label_ro' => 'Format numere', 'label_en' => 'Number Format', 'options' => ['1.234,56', '1,234.56']],
            'first_day_of_week' => ['type' => 'select', 'label_ro' => 'Prima zi a săptămânii', 'label_en' => 'First Day of Week', 'options' => ['monday', 'sunday']],
            'fiscal_year_start' => ['type' => 'select', 'label_ro' => 'Început an fiscal', 'label_en' => 'Fiscal Year Start', 'options' => ['01-01', '04-01', '07-01', '10-01']],
        ],
    ],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        $group = $_GET['group'] ?? null;

        // Get all settings
        $stmt = $db->prepare("SELECT setting_key, setting_value FROM company_settings WHERE company_id = :company_id");
        $stmt->execute(['company_id' => $companyId]);
        $settingsData = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        if ($group && isset($settingGroups[$group])) {
            // Return single group
            $groupConfig = $settingGroups[$group];
            foreach ($groupConfig['settings'] as $key => &$setting) {
                $setting['value'] = $settingsData[$key] ?? null;
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'group' => $group,
                    'config' => $groupConfig,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } else {
            // Return all groups
            foreach ($settingGroups as &$groupConfig) {
                foreach ($groupConfig['settings'] as $key => &$setting) {
                    $setting['value'] = $settingsData[$key] ?? null;
                }
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'groups' => $settingGroups,
                    'values' => $settingsData,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

    } elseif ($method === 'PUT') {
        // Check permission
        if (!in_array($user['role'], ['admin', 'manager'])) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Nu aveți permisiunea de a modifica setările',
                'error' => 'You do not have permission to modify settings'
            ]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $settings = $input['settings'] ?? [];

        if (empty($settings)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Setările sunt obligatorii',
                'error' => 'Settings are required'
            ]);
            exit;
        }

        // Validate settings
        $validKeys = [];
        foreach ($settingGroups as $group) {
            $validKeys = array_merge($validKeys, array_keys($group['settings']));
        }

        $updated = 0;
        foreach ($settings as $key => $value) {
            if (in_array($key, $validKeys)) {
                $stmt = $db->prepare("
                    INSERT INTO company_settings (company_id, setting_key, setting_value, updated_at)
                    VALUES (:company_id, :key, :value, NOW())
                    ON CONFLICT (company_id, setting_key)
                    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
                ");
                $stmt->execute([
                    'company_id' => $companyId,
                    'key' => $key,
                    'value' => is_bool($value) ? ($value ? '1' : '0') : $value,
                ]);
                $updated++;
            }
        }

        echo json_encode([
            'success' => true,
            'message_ro' => "Setările au fost actualizate ($updated)",
            'message_en' => "Settings updated ($updated)",
            'data' => ['updated' => $updated],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
