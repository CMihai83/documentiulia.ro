<?php
/**
 * System Configuration API
 * Manage system-wide configuration and feature flags
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

// Admin-only for system config
if (!in_array($user['role'], ['admin'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot accesa configurația sistemului',
        'error' => 'Only administrators can access system configuration'
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

// Feature flags
$featureFlags = [
    'invoicing' => ['ro' => 'Facturare', 'en' => 'Invoicing', 'default' => true, 'category' => 'core'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses', 'default' => true, 'category' => 'core'],
    'inventory' => ['ro' => 'Inventar', 'en' => 'Inventory', 'default' => true, 'category' => 'core'],
    'projects' => ['ro' => 'Proiecte', 'en' => 'Projects', 'default' => true, 'category' => 'core'],
    'time_tracking' => ['ro' => 'Pontaj', 'en' => 'Time Tracking', 'default' => true, 'category' => 'core'],
    'crm' => ['ro' => 'CRM', 'en' => 'CRM', 'default' => true, 'category' => 'core'],
    'hr' => ['ro' => 'Resurse Umane', 'en' => 'Human Resources', 'default' => false, 'category' => 'advanced'],
    'payroll' => ['ro' => 'Salarizare', 'en' => 'Payroll', 'default' => false, 'category' => 'advanced'],
    'efactura' => ['ro' => 'e-Factura', 'en' => 'e-Invoice', 'default' => false, 'category' => 'romanian'],
    'anaf_integration' => ['ro' => 'Integrare ANAF', 'en' => 'ANAF Integration', 'default' => false, 'category' => 'romanian'],
    'saft' => ['ro' => 'SAF-T', 'en' => 'SAF-T', 'default' => false, 'category' => 'romanian'],
    'etransport' => ['ro' => 'e-Transport', 'en' => 'e-Transport', 'default' => false, 'category' => 'romanian'],
    'ai_assistant' => ['ro' => 'Asistent AI', 'en' => 'AI Assistant', 'default' => false, 'category' => 'ai'],
    'smart_suggestions' => ['ro' => 'Sugestii inteligente', 'en' => 'Smart Suggestions', 'default' => true, 'category' => 'ai'],
    'ocr_receipts' => ['ro' => 'OCR Bonuri', 'en' => 'OCR Receipts', 'default' => false, 'category' => 'ai'],
    'multi_currency' => ['ro' => 'Multi-valută', 'en' => 'Multi-Currency', 'default' => false, 'category' => 'advanced'],
    'multi_company' => ['ro' => 'Multi-companie', 'en' => 'Multi-Company', 'default' => false, 'category' => 'enterprise'],
    'api_access' => ['ro' => 'Acces API', 'en' => 'API Access', 'default' => false, 'category' => 'enterprise'],
    'webhooks' => ['ro' => 'Webhooks', 'en' => 'Webhooks', 'default' => false, 'category' => 'enterprise'],
    'audit_log' => ['ro' => 'Jurnal audit', 'en' => 'Audit Log', 'default' => true, 'category' => 'security'],
];

// Feature categories
$featureCategories = [
    'core' => ['ro' => 'Module principale', 'en' => 'Core Modules'],
    'advanced' => ['ro' => 'Funcții avansate', 'en' => 'Advanced Features'],
    'romanian' => ['ro' => 'Funcții România', 'en' => 'Romanian Features'],
    'ai' => ['ro' => 'Inteligență artificială', 'en' => 'Artificial Intelligence'],
    'enterprise' => ['ro' => 'Enterprise', 'en' => 'Enterprise'],
    'security' => ['ro' => 'Securitate', 'en' => 'Security'],
];

// System limits
$systemLimits = [
    'max_users' => ['ro' => 'Utilizatori maximi', 'en' => 'Max Users', 'type' => 'number'],
    'max_invoices_per_month' => ['ro' => 'Facturi maxime/lună', 'en' => 'Max Invoices/Month', 'type' => 'number'],
    'max_products' => ['ro' => 'Produse maxime', 'en' => 'Max Products', 'type' => 'number'],
    'max_contacts' => ['ro' => 'Contacte maxime', 'en' => 'Max Contacts', 'type' => 'number'],
    'max_storage_gb' => ['ro' => 'Stocare maximă (GB)', 'en' => 'Max Storage (GB)', 'type' => 'number'],
    'max_api_calls_per_day' => ['ro' => 'Apeluri API/zi', 'en' => 'API Calls/Day', 'type' => 'number'],
    'retention_days' => ['ro' => 'Retenție date (zile)', 'en' => 'Data Retention (days)', 'type' => 'number'],
];

// Maintenance modes
$maintenanceModes = [
    'none' => ['ro' => 'Niciuna', 'en' => 'None'],
    'read_only' => ['ro' => 'Doar citire', 'en' => 'Read Only'],
    'scheduled' => ['ro' => 'Programat', 'en' => 'Scheduled'],
    'full' => ['ro' => 'Întreținere completă', 'en' => 'Full Maintenance'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'all';

            if ($action === 'all' || $action === 'features') {
                // Get feature flags
                $stmt = $db->prepare("SELECT feature_key, is_enabled FROM feature_flags WHERE company_id = :company_id");
                $stmt->execute(['company_id' => $companyId]);
                $enabledFeatures = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

                foreach ($featureFlags as $key => &$feature) {
                    $feature['enabled'] = isset($enabledFeatures[$key]) ? (bool)$enabledFeatures[$key] : $feature['default'];
                }
            }

            if ($action === 'all' || $action === 'limits') {
                // Get system limits
                $stmt = $db->prepare("SELECT limit_key, limit_value FROM system_limits WHERE company_id = :company_id");
                $stmt->execute(['company_id' => $companyId]);
                $limitsData = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

                foreach ($systemLimits as $key => &$limit) {
                    $limit['value'] = $limitsData[$key] ?? null;
                }
            }

            if ($action === 'all' || $action === 'maintenance') {
                // Get maintenance status
                $stmt = $db->prepare("SELECT setting_value FROM company_settings WHERE company_id = :company_id AND setting_key = 'maintenance_mode'");
                $stmt->execute(['company_id' => $companyId]);
                $maintenanceMode = $stmt->fetchColumn() ?: 'none';

                $stmt = $db->prepare("SELECT setting_value FROM company_settings WHERE company_id = :company_id AND setting_key = 'maintenance_message'");
                $stmt->execute(['company_id' => $companyId]);
                $maintenanceMessage = $stmt->fetchColumn() ?: '';

                $stmt = $db->prepare("SELECT setting_value FROM company_settings WHERE company_id = :company_id AND setting_key = 'maintenance_scheduled'");
                $stmt->execute(['company_id' => $companyId]);
                $maintenanceScheduled = $stmt->fetchColumn() ?: null;
            }

            if ($action === 'features') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'features' => $featureFlags,
                        'categories' => $featureCategories,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } elseif ($action === 'limits') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'limits' => $systemLimits,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } elseif ($action === 'maintenance') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'mode' => $maintenanceMode,
                        'modes' => $maintenanceModes,
                        'message' => $maintenanceMessage,
                        'scheduled' => $maintenanceScheduled,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'features' => $featureFlags,
                        'feature_categories' => $featureCategories,
                        'limits' => $systemLimits,
                        'maintenance' => [
                            'mode' => $maintenanceMode ?? 'none',
                            'modes' => $maintenanceModes,
                            'message' => $maintenanceMessage ?? '',
                            'scheduled' => $maintenanceScheduled ?? null,
                        ],
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'update_features';

            if ($action === 'update_features') {
                $features = $input['features'] ?? [];
                $updated = 0;

                foreach ($features as $key => $enabled) {
                    if (isset($featureFlags[$key])) {
                        $stmt = $db->prepare("
                            INSERT INTO feature_flags (company_id, feature_key, is_enabled, updated_at)
                            VALUES (:company_id, :key, :enabled, NOW())
                            ON CONFLICT (company_id, feature_key)
                            DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = NOW()
                        ");
                        $stmt->execute([
                            'company_id' => $companyId,
                            'key' => $key,
                            'enabled' => $enabled ? 1 : 0,
                        ]);
                        $updated++;
                    }
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => "Funcțiile au fost actualizate ($updated)",
                    'message_en' => "Features updated ($updated)",
                    'data' => ['updated' => $updated],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'update_limits') {
                $limits = $input['limits'] ?? [];
                $updated = 0;

                foreach ($limits as $key => $value) {
                    if (isset($systemLimits[$key])) {
                        $stmt = $db->prepare("
                            INSERT INTO system_limits (company_id, limit_key, limit_value, updated_at)
                            VALUES (:company_id, :key, :value, NOW())
                            ON CONFLICT (company_id, limit_key)
                            DO UPDATE SET limit_value = EXCLUDED.limit_value, updated_at = NOW()
                        ");
                        $stmt->execute([
                            'company_id' => $companyId,
                            'key' => $key,
                            'value' => intval($value),
                        ]);
                        $updated++;
                    }
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => "Limitele au fost actualizate ($updated)",
                    'message_en' => "Limits updated ($updated)",
                    'data' => ['updated' => $updated],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'set_maintenance') {
                $mode = $input['mode'] ?? 'none';
                $message = $input['message'] ?? '';
                $scheduled = $input['scheduled'] ?? null;

                if (!isset($maintenanceModes[$mode])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid maintenance mode']);
                    exit;
                }

                // Update maintenance mode
                $stmt = $db->prepare("
                    INSERT INTO company_settings (company_id, setting_key, setting_value, updated_at)
                    VALUES (:company_id, 'maintenance_mode', :value, NOW())
                    ON CONFLICT (company_id, setting_key)
                    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
                ");
                $stmt->execute(['company_id' => $companyId, 'value' => $mode]);

                // Update message
                $stmt = $db->prepare("
                    INSERT INTO company_settings (company_id, setting_key, setting_value, updated_at)
                    VALUES (:company_id, 'maintenance_message', :value, NOW())
                    ON CONFLICT (company_id, setting_key)
                    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
                ");
                $stmt->execute(['company_id' => $companyId, 'value' => $message]);

                // Update scheduled time
                if ($scheduled) {
                    $stmt = $db->prepare("
                        INSERT INTO company_settings (company_id, setting_key, setting_value, updated_at)
                        VALUES (:company_id, 'maintenance_scheduled', :value, NOW())
                        ON CONFLICT (company_id, setting_key)
                        DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
                    ");
                    $stmt->execute(['company_id' => $companyId, 'value' => $scheduled]);
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Modul de întreținere a fost actualizat',
                    'message_en' => 'Maintenance mode updated',
                    'data' => [
                        'mode' => $mode,
                        'message' => $message,
                        'scheduled' => $scheduled,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
