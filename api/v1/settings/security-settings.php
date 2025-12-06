<?php
/**
 * Security Settings API
 * Manage security configuration and policies
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

// Admin-only for security settings
if (!in_array($user['role'], ['admin'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot gestiona setările de securitate',
        'error' => 'Only administrators can manage security settings'
    ]);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Password policies
$passwordPolicies = [
    'min_length' => ['ro' => 'Lungime minimă', 'en' => 'Minimum Length', 'type' => 'number', 'default' => 8, 'min' => 6, 'max' => 32],
    'require_uppercase' => ['ro' => 'Necesită majuscule', 'en' => 'Require Uppercase', 'type' => 'boolean', 'default' => true],
    'require_lowercase' => ['ro' => 'Necesită minuscule', 'en' => 'Require Lowercase', 'type' => 'boolean', 'default' => true],
    'require_numbers' => ['ro' => 'Necesită cifre', 'en' => 'Require Numbers', 'type' => 'boolean', 'default' => true],
    'require_special' => ['ro' => 'Necesită caractere speciale', 'en' => 'Require Special Characters', 'type' => 'boolean', 'default' => false],
    'prevent_common' => ['ro' => 'Previne parole comune', 'en' => 'Prevent Common Passwords', 'type' => 'boolean', 'default' => true],
    'prevent_username' => ['ro' => 'Previne utilizarea numelui', 'en' => 'Prevent Username Usage', 'type' => 'boolean', 'default' => true],
    'password_history' => ['ro' => 'Istoric parole', 'en' => 'Password History', 'type' => 'number', 'default' => 5],
    'expiration_days' => ['ro' => 'Expirare parolă (zile)', 'en' => 'Password Expiration (days)', 'type' => 'number', 'default' => 90],
];

// Session policies
$sessionPolicies = [
    'session_timeout' => ['ro' => 'Timeout sesiune (minute)', 'en' => 'Session Timeout (minutes)', 'type' => 'number', 'default' => 30],
    'max_sessions' => ['ro' => 'Sesiuni simultane maxime', 'en' => 'Max Concurrent Sessions', 'type' => 'number', 'default' => 3],
    'remember_me_days' => ['ro' => 'Durată "Ține-mă minte" (zile)', 'en' => 'Remember Me Duration (days)', 'type' => 'number', 'default' => 30],
    'force_logout_on_password_change' => ['ro' => 'Deconectare la schimbare parolă', 'en' => 'Logout on Password Change', 'type' => 'boolean', 'default' => true],
    'invalidate_sessions_on_role_change' => ['ro' => 'Invalidare la schimbare rol', 'en' => 'Invalidate on Role Change', 'type' => 'boolean', 'default' => true],
];

// Login policies
$loginPolicies = [
    'max_login_attempts' => ['ro' => 'Încercări maxime login', 'en' => 'Max Login Attempts', 'type' => 'number', 'default' => 5],
    'lockout_duration' => ['ro' => 'Durată blocare (minute)', 'en' => 'Lockout Duration (minutes)', 'type' => 'number', 'default' => 15],
    'progressive_delay' => ['ro' => 'Întârziere progresivă', 'en' => 'Progressive Delay', 'type' => 'boolean', 'default' => true],
    'notify_on_failed_login' => ['ro' => 'Notificare la login eșuat', 'en' => 'Notify on Failed Login', 'type' => 'boolean', 'default' => true],
    'notify_on_new_device' => ['ro' => 'Notificare dispozitiv nou', 'en' => 'Notify on New Device', 'type' => 'boolean', 'default' => true],
    'require_captcha_after_failures' => ['ro' => 'Captcha după eșecuri', 'en' => 'Captcha After Failures', 'type' => 'number', 'default' => 3],
];

// MFA settings
$mfaSettings = [
    'mfa_enabled' => ['ro' => 'Activează 2FA', 'en' => 'Enable 2FA', 'type' => 'boolean', 'default' => false],
    'mfa_required' => ['ro' => '2FA obligatoriu', 'en' => '2FA Required', 'type' => 'boolean', 'default' => false],
    'mfa_methods' => ['ro' => 'Metode 2FA permise', 'en' => 'Allowed 2FA Methods', 'type' => 'multiselect', 'options' => [
        'totp' => ['ro' => 'Aplicație Authenticator', 'en' => 'Authenticator App'],
        'sms' => ['ro' => 'SMS', 'en' => 'SMS'],
        'email' => ['ro' => 'Email', 'en' => 'Email'],
        'backup_codes' => ['ro' => 'Coduri de rezervă', 'en' => 'Backup Codes'],
    ]],
    'mfa_grace_period' => ['ro' => 'Perioadă de grație (zile)', 'en' => 'Grace Period (days)', 'type' => 'number', 'default' => 7],
    'trusted_device_duration' => ['ro' => 'Durată dispozitiv de încredere (zile)', 'en' => 'Trusted Device Duration (days)', 'type' => 'number', 'default' => 30],
];

// IP restrictions
$ipSettings = [
    'ip_whitelist_enabled' => ['ro' => 'Activează whitelist IP', 'en' => 'Enable IP Whitelist', 'type' => 'boolean', 'default' => false],
    'ip_whitelist' => ['ro' => 'IP-uri permise', 'en' => 'Allowed IPs', 'type' => 'textarea'],
    'ip_blacklist_enabled' => ['ro' => 'Activează blacklist IP', 'en' => 'Enable IP Blacklist', 'type' => 'boolean', 'default' => false],
    'ip_blacklist' => ['ro' => 'IP-uri blocate', 'en' => 'Blocked IPs', 'type' => 'textarea'],
    'block_tor' => ['ro' => 'Blochează rețeaua Tor', 'en' => 'Block Tor Network', 'type' => 'boolean', 'default' => false],
    'block_vpn' => ['ro' => 'Blochează VPN', 'en' => 'Block VPN', 'type' => 'boolean', 'default' => false],
    'country_restrictions' => ['ro' => 'Restricții pe țări', 'en' => 'Country Restrictions', 'type' => 'multiselect', 'options' => []],
];

// API security
$apiSettings = [
    'rate_limit_enabled' => ['ro' => 'Activează limitare rată', 'en' => 'Enable Rate Limiting', 'type' => 'boolean', 'default' => true],
    'rate_limit_requests' => ['ro' => 'Cereri pe minut', 'en' => 'Requests Per Minute', 'type' => 'number', 'default' => 60],
    'api_key_expiration' => ['ro' => 'Expirare cheie API (zile)', 'en' => 'API Key Expiration (days)', 'type' => 'number', 'default' => 365],
    'require_https' => ['ro' => 'Necesită HTTPS', 'en' => 'Require HTTPS', 'type' => 'boolean', 'default' => true],
    'cors_origins' => ['ro' => 'Origini CORS permise', 'en' => 'Allowed CORS Origins', 'type' => 'textarea'],
];

// Data protection
$dataProtection = [
    'encrypt_sensitive_data' => ['ro' => 'Criptează date sensibile', 'en' => 'Encrypt Sensitive Data', 'type' => 'boolean', 'default' => true],
    'mask_card_numbers' => ['ro' => 'Maschează numere card', 'en' => 'Mask Card Numbers', 'type' => 'boolean', 'default' => true],
    'anonymize_exports' => ['ro' => 'Anonimizează exporturi', 'en' => 'Anonymize Exports', 'type' => 'boolean', 'default' => false],
    'data_retention_days' => ['ro' => 'Retenție date (zile)', 'en' => 'Data Retention (days)', 'type' => 'number', 'default' => 2555],
    'auto_delete_inactive_users' => ['ro' => 'Șterge utilizatori inactivi', 'en' => 'Delete Inactive Users', 'type' => 'boolean', 'default' => false],
    'inactive_user_threshold' => ['ro' => 'Prag inactivitate (zile)', 'en' => 'Inactivity Threshold (days)', 'type' => 'number', 'default' => 365],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $section = $_GET['section'] ?? 'all';

            // Get current settings
            $stmt = $db->prepare("SELECT setting_key, setting_value FROM security_settings WHERE company_id = :company_id");
            $stmt->execute(['company_id' => $companyId]);
            $currentSettings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

            // Add values to policies
            $addValues = function(&$policies, $currentSettings) {
                foreach ($policies as $key => &$policy) {
                    if (isset($currentSettings[$key])) {
                        $value = $currentSettings[$key];
                        if ($policy['type'] === 'boolean') {
                            $policy['value'] = (bool)$value;
                        } elseif ($policy['type'] === 'number') {
                            $policy['value'] = intval($value);
                        } elseif ($policy['type'] === 'multiselect') {
                            $policy['value'] = json_decode($value, true) ?: [];
                        } else {
                            $policy['value'] = $value;
                        }
                    } else {
                        $policy['value'] = $policy['default'] ?? null;
                    }
                }
            };

            if ($section === 'all' || $section === 'password') {
                $addValues($passwordPolicies, $currentSettings);
            }
            if ($section === 'all' || $section === 'session') {
                $addValues($sessionPolicies, $currentSettings);
            }
            if ($section === 'all' || $section === 'login') {
                $addValues($loginPolicies, $currentSettings);
            }
            if ($section === 'all' || $section === 'mfa') {
                $addValues($mfaSettings, $currentSettings);
            }
            if ($section === 'all' || $section === 'ip') {
                $addValues($ipSettings, $currentSettings);
            }
            if ($section === 'all' || $section === 'api') {
                $addValues($apiSettings, $currentSettings);
            }
            if ($section === 'all' || $section === 'data') {
                $addValues($dataProtection, $currentSettings);
            }

            $response = ['success' => true, 'data' => []];

            if ($section === 'all') {
                $response['data'] = [
                    'password' => ['label_ro' => 'Politică parole', 'label_en' => 'Password Policy', 'settings' => $passwordPolicies],
                    'session' => ['label_ro' => 'Politică sesiuni', 'label_en' => 'Session Policy', 'settings' => $sessionPolicies],
                    'login' => ['label_ro' => 'Politică autentificare', 'label_en' => 'Login Policy', 'settings' => $loginPolicies],
                    'mfa' => ['label_ro' => 'Autentificare cu doi factori', 'label_en' => 'Two-Factor Authentication', 'settings' => $mfaSettings],
                    'ip' => ['label_ro' => 'Restricții IP', 'label_en' => 'IP Restrictions', 'settings' => $ipSettings],
                    'api' => ['label_ro' => 'Securitate API', 'label_en' => 'API Security', 'settings' => $apiSettings],
                    'data' => ['label_ro' => 'Protecția datelor', 'label_en' => 'Data Protection', 'settings' => $dataProtection],
                ];
            } else {
                $sectionMap = [
                    'password' => $passwordPolicies,
                    'session' => $sessionPolicies,
                    'login' => $loginPolicies,
                    'mfa' => $mfaSettings,
                    'ip' => $ipSettings,
                    'api' => $apiSettings,
                    'data' => $dataProtection,
                ];
                $response['data'] = $sectionMap[$section] ?? [];
            }

            echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
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

            // All valid keys
            $validKeys = array_merge(
                array_keys($passwordPolicies),
                array_keys($sessionPolicies),
                array_keys($loginPolicies),
                array_keys($mfaSettings),
                array_keys($ipSettings),
                array_keys($apiSettings),
                array_keys($dataProtection)
            );

            $updated = 0;
            foreach ($settings as $key => $value) {
                if (in_array($key, $validKeys)) {
                    // Serialize arrays
                    if (is_array($value)) {
                        $value = json_encode($value);
                    } elseif (is_bool($value)) {
                        $value = $value ? '1' : '0';
                    }

                    $stmt = $db->prepare("
                        INSERT INTO security_settings (company_id, setting_key, setting_value, updated_at)
                        VALUES (:company_id, :key, :value, NOW())
                        ON CONFLICT (company_id, setting_key)
                        DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
                    ");
                    $stmt->execute([
                        'company_id' => $companyId,
                        'key' => $key,
                        'value' => $value,
                    ]);
                    $updated++;
                }
            }

            // Log security settings change
            $stmt = $db->prepare("
                INSERT INTO audit_trail (id, company_id, user_id, event_type, category, risk_level, details, ip_address, created_at)
                VALUES (:id, :company_id, :user_id, 'settings_changed', 'security', 'high', :details, :ip, NOW())
            ");
            $stmt->execute([
                'id' => 'aud_' . bin2hex(random_bytes(8)),
                'company_id' => $companyId,
                'user_id' => $user['user_id'],
                'details' => json_encode(['changed_keys' => array_keys($settings), 'count' => $updated]),
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => "Setările de securitate au fost actualizate ($updated)",
                'message_en' => "Security settings updated ($updated)",
                'data' => ['updated' => $updated],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
