<?php
/**
 * Audit Trail API
 * Comprehensive audit trail for compliance and security
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

// Audit trail is admin-only
if (!in_array($user['role'], ['admin'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot accesa jurnalul de audit',
        'error' => 'Only administrators can access the audit trail'
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

// Audit categories
$auditCategories = [
    'authentication' => ['ro' => 'Autentificare', 'en' => 'Authentication', 'icon' => 'key'],
    'authorization' => ['ro' => 'Autorizare', 'en' => 'Authorization', 'icon' => 'security'],
    'data_access' => ['ro' => 'Acces date', 'en' => 'Data Access', 'icon' => 'visibility'],
    'data_modification' => ['ro' => 'Modificare date', 'en' => 'Data Modification', 'icon' => 'edit'],
    'data_deletion' => ['ro' => 'Ștergere date', 'en' => 'Data Deletion', 'icon' => 'delete'],
    'configuration' => ['ro' => 'Configurare', 'en' => 'Configuration', 'icon' => 'settings'],
    'user_management' => ['ro' => 'Gestionare utilizatori', 'en' => 'User Management', 'icon' => 'people'],
    'financial' => ['ro' => 'Financiar', 'en' => 'Financial', 'icon' => 'attach_money'],
    'export' => ['ro' => 'Export', 'en' => 'Export', 'icon' => 'download'],
    'integration' => ['ro' => 'Integrare', 'en' => 'Integration', 'icon' => 'extension'],
    'security' => ['ro' => 'Securitate', 'en' => 'Security', 'icon' => 'shield'],
];

// Risk levels
$riskLevels = [
    'low' => ['ro' => 'Scăzut', 'en' => 'Low', 'color' => '#4CAF50'],
    'medium' => ['ro' => 'Mediu', 'en' => 'Medium', 'color' => '#FF9800'],
    'high' => ['ro' => 'Ridicat', 'en' => 'High', 'color' => '#F44336'],
    'critical' => ['ro' => 'Critic', 'en' => 'Critical', 'color' => '#9C27B0'],
];

// Audit event types
$auditEvents = [
    'login_success' => ['ro' => 'Autentificare reușită', 'en' => 'Login Success', 'category' => 'authentication', 'risk' => 'low'],
    'login_failed' => ['ro' => 'Autentificare eșuată', 'en' => 'Login Failed', 'category' => 'authentication', 'risk' => 'medium'],
    'logout' => ['ro' => 'Deconectare', 'en' => 'Logout', 'category' => 'authentication', 'risk' => 'low'],
    'password_changed' => ['ro' => 'Parolă schimbată', 'en' => 'Password Changed', 'category' => 'security', 'risk' => 'medium'],
    'password_reset' => ['ro' => 'Resetare parolă', 'en' => 'Password Reset', 'category' => 'security', 'risk' => 'medium'],
    'mfa_enabled' => ['ro' => '2FA activat', 'en' => '2FA Enabled', 'category' => 'security', 'risk' => 'low'],
    'mfa_disabled' => ['ro' => '2FA dezactivat', 'en' => '2FA Disabled', 'category' => 'security', 'risk' => 'high'],
    'user_created' => ['ro' => 'Utilizator creat', 'en' => 'User Created', 'category' => 'user_management', 'risk' => 'medium'],
    'user_deleted' => ['ro' => 'Utilizator șters', 'en' => 'User Deleted', 'category' => 'user_management', 'risk' => 'high'],
    'role_changed' => ['ro' => 'Rol modificat', 'en' => 'Role Changed', 'category' => 'authorization', 'risk' => 'high'],
    'permission_granted' => ['ro' => 'Permisiune acordată', 'en' => 'Permission Granted', 'category' => 'authorization', 'risk' => 'medium'],
    'permission_revoked' => ['ro' => 'Permisiune revocată', 'en' => 'Permission Revoked', 'category' => 'authorization', 'risk' => 'medium'],
    'data_exported' => ['ro' => 'Date exportate', 'en' => 'Data Exported', 'category' => 'export', 'risk' => 'medium'],
    'bulk_delete' => ['ro' => 'Ștergere în masă', 'en' => 'Bulk Delete', 'category' => 'data_deletion', 'risk' => 'critical'],
    'sensitive_data_access' => ['ro' => 'Acces date sensibile', 'en' => 'Sensitive Data Access', 'category' => 'data_access', 'risk' => 'high'],
    'api_key_created' => ['ro' => 'Cheie API creată', 'en' => 'API Key Created', 'category' => 'integration', 'risk' => 'medium'],
    'api_key_revoked' => ['ro' => 'Cheie API revocată', 'en' => 'API Key Revoked', 'category' => 'integration', 'risk' => 'low'],
    'webhook_created' => ['ro' => 'Webhook creat', 'en' => 'Webhook Created', 'category' => 'integration', 'risk' => 'medium'],
    'settings_changed' => ['ro' => 'Setări modificate', 'en' => 'Settings Changed', 'category' => 'configuration', 'risk' => 'medium'],
    'subscription_changed' => ['ro' => 'Abonament modificat', 'en' => 'Subscription Changed', 'category' => 'financial', 'risk' => 'high'],
    'payment_processed' => ['ro' => 'Plată procesată', 'en' => 'Payment Processed', 'category' => 'financial', 'risk' => 'medium'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                // Get audit trail with filters
                $category = $_GET['category'] ?? null;
                $riskLevel = $_GET['risk_level'] ?? null;
                $eventType = $_GET['event_type'] ?? null;
                $userId = $_GET['user_id'] ?? null;
                $dateFrom = $_GET['date_from'] ?? null;
                $dateTo = $_GET['date_to'] ?? null;
                $limit = intval($_GET['limit'] ?? 50);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT a.*, u.first_name, u.last_name, u.email as user_email
                    FROM audit_trail a
                    LEFT JOIN users u ON a.user_id = u.id
                    WHERE a.company_id = :company_id
                ";
                $params = ['company_id' => $companyId];

                if ($category) {
                    $sql .= " AND a.category = :category";
                    $params['category'] = $category;
                }
                if ($riskLevel) {
                    $sql .= " AND a.risk_level = :risk_level";
                    $params['risk_level'] = $riskLevel;
                }
                if ($eventType) {
                    $sql .= " AND a.event_type = :event_type";
                    $params['event_type'] = $eventType;
                }
                if ($userId) {
                    $sql .= " AND a.user_id = :user_id";
                    $params['user_id'] = $userId;
                }
                if ($dateFrom) {
                    $sql .= " AND a.created_at >= :date_from";
                    $params['date_from'] = $dateFrom;
                }
                if ($dateTo) {
                    $sql .= " AND a.created_at <= :date_to";
                    $params['date_to'] = $dateTo . ' 23:59:59';
                }

                $sql .= " ORDER BY a.created_at DESC LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $audits = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($audits as &$audit) {
                    $audit['category_config'] = $auditCategories[$audit['category']] ?? null;
                    $audit['risk_config'] = $riskLevels[$audit['risk_level']] ?? null;
                    $audit['event_config'] = $auditEvents[$audit['event_type']] ?? null;
                    $audit['user_name'] = trim(($audit['first_name'] ?? '') . ' ' . ($audit['last_name'] ?? ''));
                    $audit['details'] = json_decode($audit['details'] ?? '{}', true);
                    $audit['before_state'] = json_decode($audit['before_state'] ?? '{}', true);
                    $audit['after_state'] = json_decode($audit['after_state'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'audits' => $audits,
                        'total' => count($audits),
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'categories' => $auditCategories,
                        'risk_levels' => $riskLevels,
                        'event_types' => $auditEvents,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'summary') {
                // Get audit summary
                $period = $_GET['period'] ?? '30days';

                $dateCondition = match($period) {
                    '7days' => "created_at >= NOW() - INTERVAL '7 days'",
                    '30days' => "created_at >= NOW() - INTERVAL '30 days'",
                    '90days' => "created_at >= NOW() - INTERVAL '90 days'",
                    default => "created_at >= NOW() - INTERVAL '30 days'",
                };

                // By category
                $stmt = $db->prepare("
                    SELECT category, COUNT(*) as count FROM audit_trail
                    WHERE company_id = :company_id AND $dateCondition
                    GROUP BY category ORDER BY count DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $byCategory = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // By risk level
                $stmt = $db->prepare("
                    SELECT risk_level, COUNT(*) as count FROM audit_trail
                    WHERE company_id = :company_id AND $dateCondition
                    GROUP BY risk_level ORDER BY count DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $byRisk = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // High risk events
                $stmt = $db->prepare("
                    SELECT a.*, u.first_name, u.last_name FROM audit_trail a
                    LEFT JOIN users u ON a.user_id = u.id
                    WHERE a.company_id = :company_id AND a.risk_level IN ('high', 'critical') AND a.$dateCondition
                    ORDER BY a.created_at DESC LIMIT 10
                ");
                $stmt->execute(['company_id' => $companyId]);
                $highRisk = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($highRisk as &$hr) {
                    $hr['event_config'] = $auditEvents[$hr['event_type']] ?? null;
                    $hr['user_name'] = trim(($hr['first_name'] ?? '') . ' ' . ($hr['last_name'] ?? ''));
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'by_category' => $byCategory,
                        'by_risk' => $byRisk,
                        'high_risk_events' => $highRisk,
                        'period' => $period,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'compliance') {
                // Compliance report
                $period = $_GET['period'] ?? '30days';

                $dateCondition = match($period) {
                    '30days' => "created_at >= NOW() - INTERVAL '30 days'",
                    '90days' => "created_at >= NOW() - INTERVAL '90 days'",
                    'year' => "created_at >= NOW() - INTERVAL '1 year'",
                    default => "created_at >= NOW() - INTERVAL '30 days'",
                };

                // Total events
                $stmt = $db->prepare("SELECT COUNT(*) as total FROM audit_trail WHERE company_id = :company_id AND $dateCondition");
                $stmt->execute(['company_id' => $companyId]);
                $total = $stmt->fetchColumn();

                // Failed logins
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM audit_trail WHERE company_id = :company_id AND event_type = 'login_failed' AND $dateCondition");
                $stmt->execute(['company_id' => $companyId]);
                $failedLogins = $stmt->fetchColumn();

                // Data exports
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM audit_trail WHERE company_id = :company_id AND event_type = 'data_exported' AND $dateCondition");
                $stmt->execute(['company_id' => $companyId]);
                $dataExports = $stmt->fetchColumn();

                // Permission changes
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM audit_trail WHERE company_id = :company_id AND category = 'authorization' AND $dateCondition");
                $stmt->execute(['company_id' => $companyId]);
                $permissionChanges = $stmt->fetchColumn();

                // Security events
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM audit_trail WHERE company_id = :company_id AND category = 'security' AND $dateCondition");
                $stmt->execute(['company_id' => $companyId]);
                $securityEvents = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'total_events' => intval($total),
                        'failed_logins' => intval($failedLogins),
                        'data_exports' => intval($dataExports),
                        'permission_changes' => intval($permissionChanges),
                        'security_events' => intval($securityEvents),
                        'period' => $period,
                        'generated_at' => date('Y-m-d H:i:s'),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'export') {
                // Export audit trail
                $format = $_GET['format'] ?? 'json';
                $dateFrom = $_GET['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
                $dateTo = $_GET['date_to'] ?? date('Y-m-d');

                $stmt = $db->prepare("
                    SELECT a.*, u.first_name, u.last_name, u.email as user_email
                    FROM audit_trail a
                    LEFT JOIN users u ON a.user_id = u.id
                    WHERE a.company_id = :company_id AND a.created_at >= :date_from AND a.created_at <= :date_to
                    ORDER BY a.created_at DESC
                ");
                $stmt->execute(['company_id' => $companyId, 'date_from' => $dateFrom, 'date_to' => $dateTo . ' 23:59:59']);
                $audits = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($audits as &$audit) {
                    $audit['user_name'] = trim(($audit['first_name'] ?? '') . ' ' . ($audit['last_name'] ?? ''));
                    unset($audit['first_name'], $audit['last_name']);
                }

                $exportData = [
                    'company_id' => $companyId,
                    'export_date' => date('Y-m-d H:i:s'),
                    'period' => ['from' => $dateFrom, 'to' => $dateTo],
                    'total_records' => count($audits),
                    'exported_by' => $user['user_id'],
                    'data' => $audits,
                ];

                echo json_encode([
                    'success' => true,
                    'data' => $exportData,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
