<?php
/**
 * Security Log API
 * Track security-related events
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

// Security log is admin-only
if (!in_array($user['role'], ['admin'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot accesa jurnalul de securitate',
        'error' => 'Only administrators can access security log'
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

// Security event types
$securityEvents = [
    'login_success' => ['ro' => 'Login reușit', 'en' => 'Login Success', 'severity' => 'info'],
    'login_failed' => ['ro' => 'Login eșuat', 'en' => 'Login Failed', 'severity' => 'warning'],
    'login_blocked' => ['ro' => 'Login blocat', 'en' => 'Login Blocked', 'severity' => 'error'],
    'logout' => ['ro' => 'Deconectare', 'en' => 'Logout', 'severity' => 'info'],
    'session_expired' => ['ro' => 'Sesiune expirată', 'en' => 'Session Expired', 'severity' => 'info'],
    'password_changed' => ['ro' => 'Parolă schimbată', 'en' => 'Password Changed', 'severity' => 'warning'],
    'password_reset_requested' => ['ro' => 'Resetare parolă solicitată', 'en' => 'Password Reset Requested', 'severity' => 'warning'],
    'password_reset_completed' => ['ro' => 'Resetare parolă completă', 'en' => 'Password Reset Completed', 'severity' => 'warning'],
    'mfa_enabled' => ['ro' => '2FA activat', 'en' => '2FA Enabled', 'severity' => 'info'],
    'mfa_disabled' => ['ro' => '2FA dezactivat', 'en' => '2FA Disabled', 'severity' => 'warning'],
    'mfa_failed' => ['ro' => '2FA eșuat', 'en' => '2FA Failed', 'severity' => 'warning'],
    'api_key_used' => ['ro' => 'Cheie API utilizată', 'en' => 'API Key Used', 'severity' => 'info'],
    'api_key_invalid' => ['ro' => 'Cheie API invalidă', 'en' => 'Invalid API Key', 'severity' => 'error'],
    'rate_limit_exceeded' => ['ro' => 'Limită depășită', 'en' => 'Rate Limit Exceeded', 'severity' => 'warning'],
    'suspicious_activity' => ['ro' => 'Activitate suspectă', 'en' => 'Suspicious Activity', 'severity' => 'error'],
    'brute_force_detected' => ['ro' => 'Atac brut forță detectat', 'en' => 'Brute Force Detected', 'severity' => 'critical'],
    'ip_blocked' => ['ro' => 'IP blocat', 'en' => 'IP Blocked', 'severity' => 'error'],
    'unauthorized_access' => ['ro' => 'Acces neautorizat', 'en' => 'Unauthorized Access', 'severity' => 'error'],
    'permission_denied' => ['ro' => 'Permisiune refuzată', 'en' => 'Permission Denied', 'severity' => 'warning'],
    'data_breach_attempt' => ['ro' => 'Tentativă breșă date', 'en' => 'Data Breach Attempt', 'severity' => 'critical'],
];

// Severity levels
$severityLevels = [
    'info' => ['ro' => 'Informare', 'en' => 'Info', 'color' => '#2196F3', 'order' => 1],
    'warning' => ['ro' => 'Avertisment', 'en' => 'Warning', 'color' => '#FF9800', 'order' => 2],
    'error' => ['ro' => 'Eroare', 'en' => 'Error', 'color' => '#F44336', 'order' => 3],
    'critical' => ['ro' => 'Critic', 'en' => 'Critical', 'color' => '#9C27B0', 'order' => 4],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $severity = $_GET['severity'] ?? null;
                $eventType = $_GET['event_type'] ?? null;
                $userId = $_GET['user_id'] ?? null;
                $ip = $_GET['ip'] ?? null;
                $dateFrom = $_GET['date_from'] ?? null;
                $dateTo = $_GET['date_to'] ?? null;
                $limit = intval($_GET['limit'] ?? 100);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT s.*, u.first_name, u.last_name, u.email as user_email
                    FROM security_log s
                    LEFT JOIN users u ON s.user_id = u.id
                    WHERE s.company_id = :company_id
                ";
                $params = ['company_id' => $companyId];

                if ($severity) {
                    $sql .= " AND s.severity = :severity";
                    $params['severity'] = $severity;
                }
                if ($eventType) {
                    $sql .= " AND s.event_type = :event_type";
                    $params['event_type'] = $eventType;
                }
                if ($userId) {
                    $sql .= " AND s.user_id = :user_id";
                    $params['user_id'] = $userId;
                }
                if ($ip) {
                    $sql .= " AND s.ip_address = :ip";
                    $params['ip'] = $ip;
                }
                if ($dateFrom) {
                    $sql .= " AND s.created_at >= :date_from";
                    $params['date_from'] = $dateFrom;
                }
                if ($dateTo) {
                    $sql .= " AND s.created_at <= :date_to";
                    $params['date_to'] = $dateTo . ' 23:59:59';
                }

                $sql .= " ORDER BY s.created_at DESC LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($logs as &$log) {
                    $log['event_config'] = $securityEvents[$log['event_type']] ?? null;
                    $log['severity_config'] = $severityLevels[$log['severity']] ?? null;
                    $log['user_name'] = trim(($log['first_name'] ?? '') . ' ' . ($log['last_name'] ?? ''));
                    $log['details'] = json_decode($log['details'] ?? '{}', true);
                    $log['geo_location'] = json_decode($log['geo_location'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'logs' => $logs,
                        'total' => count($logs),
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'event_types' => $securityEvents,
                        'severities' => $severityLevels,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'dashboard') {
                $period = $_GET['period'] ?? '24hours';

                $dateCondition = match($period) {
                    '1hour' => "created_at >= NOW() - INTERVAL '1 hour'",
                    '24hours' => "created_at >= NOW() - INTERVAL '24 hours'",
                    '7days' => "created_at >= NOW() - INTERVAL '7 days'",
                    '30days' => "created_at >= NOW() - INTERVAL '30 days'",
                    default => "created_at >= NOW() - INTERVAL '24 hours'",
                };

                // Summary counts
                $stmt = $db->prepare("
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                        COUNT(*) FILTER (WHERE severity = 'error') as errors,
                        COUNT(*) FILTER (WHERE severity = 'warning') as warnings,
                        COUNT(*) FILTER (WHERE event_type = 'login_failed') as failed_logins,
                        COUNT(*) FILTER (WHERE event_type = 'suspicious_activity') as suspicious
                    FROM security_log
                    WHERE company_id = :company_id AND $dateCondition
                ");
                $stmt->execute(['company_id' => $companyId]);
                $summary = $stmt->fetch(PDO::FETCH_ASSOC);

                // Recent critical events
                $stmt = $db->prepare("
                    SELECT s.*, u.first_name, u.last_name FROM security_log s
                    LEFT JOIN users u ON s.user_id = u.id
                    WHERE s.company_id = :company_id AND s.severity IN ('critical', 'error') AND s.$dateCondition
                    ORDER BY s.created_at DESC LIMIT 10
                ");
                $stmt->execute(['company_id' => $companyId]);
                $critical = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($critical as &$c) {
                    $c['event_config'] = $securityEvents[$c['event_type']] ?? null;
                    $c['user_name'] = trim(($c['first_name'] ?? '') . ' ' . ($c['last_name'] ?? ''));
                }

                // Top IPs with failed logins
                $stmt = $db->prepare("
                    SELECT ip_address, COUNT(*) as count FROM security_log
                    WHERE company_id = :company_id AND event_type = 'login_failed' AND $dateCondition
                    GROUP BY ip_address ORDER BY count DESC LIMIT 10
                ");
                $stmt->execute(['company_id' => $companyId]);
                $topIps = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'summary' => $summary,
                        'critical_events' => $critical,
                        'top_failed_ips' => $topIps,
                        'period' => $period,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'user_sessions') {
                // Get active sessions for all users
                $stmt = $db->prepare("
                    SELECT s.*, u.first_name, u.last_name, u.email
                    FROM user_sessions s
                    LEFT JOIN users u ON s.user_id = u.id
                    WHERE s.company_id = :company_id AND s.is_active = true
                    ORDER BY s.last_activity DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($sessions as &$sess) {
                    $sess['user_name'] = trim(($sess['first_name'] ?? '') . ' ' . ($sess['last_name'] ?? ''));
                    $sess['device_info'] = json_decode($sess['device_info'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => $sessions,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'blocked_ips') {
                // Get blocked IPs
                $stmt = $db->prepare("
                    SELECT * FROM blocked_ips
                    WHERE company_id = :company_id AND (expires_at IS NULL OR expires_at > NOW())
                    ORDER BY created_at DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $blocked = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => $blocked,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
