<?php
/**
 * User Preferences API
 * Manage user settings and preferences
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
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

$method = $_SERVER['REQUEST_METHOD'];

// Language options
$languages = [
    'ro' => ['name' => 'Română', 'flag' => '🇷🇴', 'code' => 'ro-RO'],
    'en' => ['name' => 'English', 'flag' => '🇬🇧', 'code' => 'en-US'],
    'de' => ['name' => 'Deutsch', 'flag' => '🇩🇪', 'code' => 'de-DE'],
    'fr' => ['name' => 'Français', 'flag' => '🇫🇷', 'code' => 'fr-FR'],
    'es' => ['name' => 'Español', 'flag' => '🇪🇸', 'code' => 'es-ES'],
    'it' => ['name' => 'Italiano', 'flag' => '🇮🇹', 'code' => 'it-IT'],
];

// Theme options
$themes = [
    'light' => ['ro' => 'Luminos', 'en' => 'Light', 'icon' => 'light_mode'],
    'dark' => ['ro' => 'Întunecat', 'en' => 'Dark', 'icon' => 'dark_mode'],
    'system' => ['ro' => 'Sistem', 'en' => 'System', 'icon' => 'settings_brightness'],
    'high_contrast' => ['ro' => 'Contrast ridicat', 'en' => 'High Contrast', 'icon' => 'contrast'],
];

// Date formats
$dateFormats = [
    'dd/mm/yyyy' => ['example' => '31/12/2025', 'ro' => 'Zi/Lună/An', 'en' => 'Day/Month/Year'],
    'mm/dd/yyyy' => ['example' => '12/31/2025', 'ro' => 'Lună/Zi/An', 'en' => 'Month/Day/Year'],
    'yyyy-mm-dd' => ['example' => '2025-12-31', 'ro' => 'An-Lună-Zi', 'en' => 'Year-Month-Day'],
    'dd.mm.yyyy' => ['example' => '31.12.2025', 'ro' => 'Zi.Lună.An', 'en' => 'Day.Month.Year'],
    'dd-mm-yyyy' => ['example' => '31-12-2025', 'ro' => 'Zi-Lună-An', 'en' => 'Day-Month-Year'],
];

// Time formats
$timeFormats = [
    '24h' => ['example' => '14:30', 'ro' => '24 ore', 'en' => '24-hour'],
    '12h' => ['example' => '2:30 PM', 'ro' => '12 ore (AM/PM)', 'en' => '12-hour (AM/PM)'],
];

// Currency formats
$currencyFormats = [
    'symbol_before' => ['example' => 'lei 1.234,56', 'ro' => 'Simbol înainte', 'en' => 'Symbol before'],
    'symbol_after' => ['example' => '1.234,56 lei', 'ro' => 'Simbol după', 'en' => 'Symbol after'],
    'code_before' => ['example' => 'RON 1.234,56', 'ro' => 'Cod înainte', 'en' => 'Code before'],
    'code_after' => ['example' => '1.234,56 RON', 'ro' => 'Cod după', 'en' => 'Code after'],
];

// Number formats
$numberFormats = [
    'european' => ['decimal' => ',', 'thousands' => '.', 'example' => '1.234,56', 'ro' => 'European (1.234,56)', 'en' => 'European (1.234,56)'],
    'us' => ['decimal' => '.', 'thousands' => ',', 'example' => '1,234.56', 'ro' => 'Americană (1,234.56)', 'en' => 'US (1,234.56)'],
    'swiss' => ['decimal' => '.', 'thousands' => "'", 'example' => "1'234.56", 'ro' => 'Elvețiană (1\'234.56)', 'en' => 'Swiss (1\'234.56)'],
];

// Timezone options (common ones)
$timezones = [
    'Europe/Bucharest' => ['ro' => 'București (EET)', 'en' => 'Bucharest (EET)', 'offset' => '+02:00'],
    'Europe/London' => ['ro' => 'Londra (GMT)', 'en' => 'London (GMT)', 'offset' => '+00:00'],
    'Europe/Paris' => ['ro' => 'Paris (CET)', 'en' => 'Paris (CET)', 'offset' => '+01:00'],
    'Europe/Berlin' => ['ro' => 'Berlin (CET)', 'en' => 'Berlin (CET)', 'offset' => '+01:00'],
    'America/New_York' => ['ro' => 'New York (EST)', 'en' => 'New York (EST)', 'offset' => '-05:00'],
    'Asia/Tokyo' => ['ro' => 'Tokyo (JST)', 'en' => 'Tokyo (JST)', 'offset' => '+09:00'],
];

// Dashboard layouts
$dashboardLayouts = [
    'default' => ['ro' => 'Standard', 'en' => 'Default', 'columns' => 3],
    'compact' => ['ro' => 'Compact', 'en' => 'Compact', 'columns' => 4],
    'wide' => ['ro' => 'Extins', 'en' => 'Wide', 'columns' => 2],
    'minimal' => ['ro' => 'Minimal', 'en' => 'Minimal', 'columns' => 1],
];

// Sidebar positions
$sidebarPositions = [
    'left' => ['ro' => 'Stânga', 'en' => 'Left'],
    'right' => ['ro' => 'Dreapta', 'en' => 'Right'],
    'collapsed' => ['ro' => 'Minimizat', 'en' => 'Collapsed'],
];

// Font sizes
$fontSizes = [
    'small' => ['ro' => 'Mic', 'en' => 'Small', 'value' => '14px'],
    'medium' => ['ro' => 'Mediu', 'en' => 'Medium', 'value' => '16px'],
    'large' => ['ro' => 'Mare', 'en' => 'Large', 'value' => '18px'],
    'extra_large' => ['ro' => 'Foarte mare', 'en' => 'Extra Large', 'value' => '20px'],
];

// Accessibility options
$accessibilityOptions = [
    'reduce_motion' => ['ro' => 'Reducere mișcare', 'en' => 'Reduce Motion', 'default' => false],
    'high_contrast' => ['ro' => 'Contrast ridicat', 'en' => 'High Contrast', 'default' => false],
    'screen_reader' => ['ro' => 'Optimizat pentru cititor', 'en' => 'Screen Reader Optimized', 'default' => false],
    'keyboard_nav' => ['ro' => 'Navigare tastatură', 'en' => 'Keyboard Navigation', 'default' => true],
    'focus_indicators' => ['ro' => 'Indicatori focus', 'en' => 'Focus Indicators', 'default' => true],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'get';

            if ($action === 'get') {
                $stmt = $db->prepare("SELECT * FROM user_preferences WHERE user_id = :user_id");
                $stmt->execute(['user_id' => $user['user_id']]);
                $preferences = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$preferences) {
                    // Return defaults
                    $preferences = getDefaultPreferences();
                } else {
                    $preferences['settings'] = json_decode($preferences['settings'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'preferences' => $preferences,
                        'options' => [
                            'languages' => $languages,
                            'themes' => $themes,
                            'date_formats' => $dateFormats,
                            'time_formats' => $timeFormats,
                            'currency_formats' => $currencyFormats,
                            'number_formats' => $numberFormats,
                            'timezones' => $timezones,
                            'dashboard_layouts' => $dashboardLayouts,
                            'sidebar_positions' => $sidebarPositions,
                            'font_sizes' => $fontSizes,
                            'accessibility' => $accessibilityOptions,
                        ],
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'options') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'languages' => $languages,
                        'themes' => $themes,
                        'date_formats' => $dateFormats,
                        'time_formats' => $timeFormats,
                        'currency_formats' => $currencyFormats,
                        'number_formats' => $numberFormats,
                        'timezones' => $timezones,
                        'dashboard_layouts' => $dashboardLayouts,
                        'sidebar_positions' => $sidebarPositions,
                        'font_sizes' => $fontSizes,
                        'accessibility' => $accessibilityOptions,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);

            // Check if preferences exist
            $stmt = $db->prepare("SELECT id FROM user_preferences WHERE user_id = :user_id");
            $stmt->execute(['user_id' => $user['user_id']]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            $settings = [
                'language' => $input['language'] ?? 'ro',
                'theme' => $input['theme'] ?? 'light',
                'date_format' => $input['date_format'] ?? 'dd/mm/yyyy',
                'time_format' => $input['time_format'] ?? '24h',
                'currency_format' => $input['currency_format'] ?? 'symbol_after',
                'number_format' => $input['number_format'] ?? 'european',
                'timezone' => $input['timezone'] ?? 'Europe/Bucharest',
                'dashboard_layout' => $input['dashboard_layout'] ?? 'default',
                'sidebar_position' => $input['sidebar_position'] ?? 'left',
                'font_size' => $input['font_size'] ?? 'medium',
                'accessibility' => $input['accessibility'] ?? [],
                'notifications' => $input['notifications'] ?? [],
                'shortcuts' => $input['shortcuts'] ?? [],
            ];

            if ($existing) {
                $stmt = $db->prepare("
                    UPDATE user_preferences SET
                        language = :language,
                        theme = :theme,
                        timezone = :timezone,
                        settings = :settings,
                        updated_at = NOW()
                    WHERE user_id = :user_id
                ");
            } else {
                $stmt = $db->prepare("
                    INSERT INTO user_preferences (id, user_id, language, theme, timezone, settings, created_at)
                    VALUES (:id, :user_id, :language, :theme, :timezone, :settings, NOW())
                ");
            }

            $params = [
                'user_id' => $user['user_id'],
                'language' => $settings['language'],
                'theme' => $settings['theme'],
                'timezone' => $settings['timezone'],
                'settings' => json_encode($settings),
            ];

            if (!$existing) {
                $params['id'] = 'pref_' . bin2hex(random_bytes(8));
            }

            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Preferințele au fost salvate',
                'message_en' => 'Preferences saved',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}

function getDefaultPreferences() {
    return [
        'language' => 'ro',
        'theme' => 'light',
        'date_format' => 'dd/mm/yyyy',
        'time_format' => '24h',
        'currency_format' => 'symbol_after',
        'number_format' => 'european',
        'timezone' => 'Europe/Bucharest',
        'dashboard_layout' => 'default',
        'sidebar_position' => 'left',
        'font_size' => 'medium',
        'accessibility' => [
            'reduce_motion' => false,
            'high_contrast' => false,
            'screen_reader' => false,
            'keyboard_nav' => true,
            'focus_indicators' => true,
        ],
        'settings' => [],
    ];
}
