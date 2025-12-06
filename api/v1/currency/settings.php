<?php
/**
 * Currency Settings API
 * Company currency preferences and multi-currency configuration
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

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Supported currencies with details
$supportedCurrencies = [
    'RON' => ['name' => 'Leu românesc', 'name_en' => 'Romanian Leu', 'symbol' => 'lei', 'decimal_places' => 2],
    'EUR' => ['name' => 'Euro', 'name_en' => 'Euro', 'symbol' => '€', 'decimal_places' => 2],
    'USD' => ['name' => 'Dolar american', 'name_en' => 'US Dollar', 'symbol' => '$', 'decimal_places' => 2],
    'GBP' => ['name' => 'Liră sterlină', 'name_en' => 'British Pound', 'symbol' => '£', 'decimal_places' => 2],
    'CHF' => ['name' => 'Franc elvețian', 'name_en' => 'Swiss Franc', 'symbol' => 'CHF', 'decimal_places' => 2],
    'HUF' => ['name' => 'Forint maghiar', 'name_en' => 'Hungarian Forint', 'symbol' => 'Ft', 'decimal_places' => 0],
    'PLN' => ['name' => 'Zlot polonez', 'name_en' => 'Polish Zloty', 'symbol' => 'zł', 'decimal_places' => 2],
    'CZK' => ['name' => 'Coroană cehă', 'name_en' => 'Czech Koruna', 'symbol' => 'Kč', 'decimal_places' => 2],
    'BGN' => ['name' => 'Leva bulgară', 'name_en' => 'Bulgarian Lev', 'symbol' => 'лв', 'decimal_places' => 2],
];

try {
    switch ($method) {
        case 'GET':
            // Get company currency settings
            $stmt = $db->prepare("
                SELECT
                    base_currency,
                    enabled_currencies,
                    auto_convert,
                    rounding_method,
                    display_format
                FROM company_settings
                WHERE company_id = :company_id
            ");
            $stmt->execute(['company_id' => $companyId]);
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);

            // Default settings if not configured
            if (!$settings) {
                $settings = [
                    'base_currency' => 'RON',
                    'enabled_currencies' => ['RON', 'EUR', 'USD'],
                    'auto_convert' => true,
                    'rounding_method' => 'standard',
                    'display_format' => 'symbol_before',
                ];
            } else {
                $settings['enabled_currencies'] = json_decode($settings['enabled_currencies'], true) ?? ['RON', 'EUR', 'USD'];
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'settings' => $settings,
                    'supported_currencies' => $supportedCurrencies,
                    'rounding_methods' => [
                        'standard' => ['name_ro' => 'Standard', 'name_en' => 'Standard (round half up)'],
                        'round_up' => ['name_ro' => 'Rotunjire în sus', 'name_en' => 'Round Up'],
                        'round_down' => ['name_ro' => 'Rotunjire în jos', 'name_en' => 'Round Down'],
                        'bankers' => ['name_ro' => 'Rotunjire bancară', 'name_en' => 'Bankers Rounding'],
                    ],
                    'display_formats' => [
                        'symbol_before' => ['example' => '€100.00', 'name_ro' => 'Simbol înainte', 'name_en' => 'Symbol before'],
                        'symbol_after' => ['example' => '100.00€', 'name_ro' => 'Simbol după', 'name_en' => 'Symbol after'],
                        'code_before' => ['example' => 'EUR 100.00', 'name_ro' => 'Cod înainte', 'name_en' => 'Code before'],
                        'code_after' => ['example' => '100.00 EUR', 'name_ro' => 'Cod după', 'name_en' => 'Code after'],
                    ],
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);

            $baseCurrency = $input['base_currency'] ?? 'RON';
            $enabledCurrencies = $input['enabled_currencies'] ?? ['RON', 'EUR', 'USD'];
            $autoConvert = $input['auto_convert'] ?? true;
            $roundingMethod = $input['rounding_method'] ?? 'standard';
            $displayFormat = $input['display_format'] ?? 'symbol_before';

            // Validate base currency
            if (!isset($supportedCurrencies[$baseCurrency])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid base currency']);
                exit;
            }

            // Ensure base currency is in enabled list
            if (!in_array($baseCurrency, $enabledCurrencies)) {
                $enabledCurrencies[] = $baseCurrency;
            }

            $stmt = $db->prepare("
                UPDATE company_settings SET
                    base_currency = :base_currency,
                    enabled_currencies = :enabled_currencies,
                    auto_convert = :auto_convert,
                    rounding_method = :rounding_method,
                    display_format = :display_format,
                    updated_at = NOW()
                WHERE company_id = :company_id
            ");
            $stmt->execute([
                'company_id' => $companyId,
                'base_currency' => $baseCurrency,
                'enabled_currencies' => json_encode($enabledCurrencies),
                'auto_convert' => $autoConvert,
                'rounding_method' => $roundingMethod,
                'display_format' => $displayFormat,
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Setări valutare actualizate',
                'message_en' => 'Currency settings updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}
