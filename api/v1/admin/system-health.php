<?php
/**
 * System Health API
 * Monitor system health, performance, and status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

// Admin only
if (!in_array($user['role'], ['admin', 'system'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot accesa monitorizarea sistemului',
        'error' => 'Only administrators can access system monitoring'
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Health check components
$healthComponents = [
    'database' => ['ro' => 'Bază de date', 'en' => 'Database', 'icon' => 'storage'],
    'redis' => ['ro' => 'Redis Cache', 'en' => 'Redis Cache', 'icon' => 'memory'],
    'storage' => ['ro' => 'Stocare', 'en' => 'Storage', 'icon' => 'folder'],
    'api' => ['ro' => 'API', 'en' => 'API', 'icon' => 'api'],
    'email' => ['ro' => 'Email', 'en' => 'Email', 'icon' => 'email'],
    'scheduler' => ['ro' => 'Programator', 'en' => 'Scheduler', 'icon' => 'schedule'],
    'queue' => ['ro' => 'Coadă de lucru', 'en' => 'Job Queue', 'icon' => 'queue'],
    'external_apis' => ['ro' => 'API-uri externe', 'en' => 'External APIs', 'icon' => 'cloud'],
];

// Health statuses
$healthStatuses = [
    'healthy' => ['ro' => 'Sănătos', 'en' => 'Healthy', 'color' => '#4CAF50'],
    'degraded' => ['ro' => 'Degradat', 'en' => 'Degraded', 'color' => '#FF9800'],
    'unhealthy' => ['ro' => 'Nesănătos', 'en' => 'Unhealthy', 'color' => '#F44336'],
    'unknown' => ['ro' => 'Necunoscut', 'en' => 'Unknown', 'color' => '#9E9E9E'],
];

// Metric types
$metricTypes = [
    'cpu_usage' => ['ro' => 'Utilizare CPU', 'en' => 'CPU Usage', 'unit' => '%'],
    'memory_usage' => ['ro' => 'Utilizare memorie', 'en' => 'Memory Usage', 'unit' => '%'],
    'disk_usage' => ['ro' => 'Utilizare disc', 'en' => 'Disk Usage', 'unit' => '%'],
    'response_time' => ['ro' => 'Timp răspuns', 'en' => 'Response Time', 'unit' => 'ms'],
    'requests_per_minute' => ['ro' => 'Cereri/minut', 'en' => 'Requests/min', 'unit' => 'req'],
    'error_rate' => ['ro' => 'Rată erori', 'en' => 'Error Rate', 'unit' => '%'],
    'active_users' => ['ro' => 'Utilizatori activi', 'en' => 'Active Users', 'unit' => 'users'],
    'database_connections' => ['ro' => 'Conexiuni DB', 'en' => 'DB Connections', 'unit' => 'conn'],
];

// Alert levels
$alertLevels = [
    'info' => ['ro' => 'Informativ', 'en' => 'Info', 'color' => '#2196F3'],
    'warning' => ['ro' => 'Avertisment', 'en' => 'Warning', 'color' => '#FF9800'],
    'error' => ['ro' => 'Eroare', 'en' => 'Error', 'color' => '#F44336'],
    'critical' => ['ro' => 'Critic', 'en' => 'Critical', 'color' => '#9C27B0'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'overview';

            if ($action === 'overview') {
                $health = checkSystemHealth($db);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'status' => $health['overall_status'],
                        'components' => $health['components'],
                        'last_check' => date('Y-m-d H:i:s'),
                        'uptime' => getSystemUptime(),
                        'version' => getAppVersion(),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'metrics') {
                $period = $_GET['period'] ?? '1h'; // 1h, 24h, 7d, 30d

                $metrics = getSystemMetrics($db, $period);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'metrics' => $metrics,
                        'metric_types' => $metricTypes,
                        'period' => $period,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'alerts') {
                $level = $_GET['level'] ?? null;
                $limit = intval($_GET['limit'] ?? 50);

                $sql = "SELECT * FROM system_alerts WHERE resolved_at IS NULL";
                $params = [];

                if ($level) {
                    $sql .= " AND level = :level";
                    $params['level'] = $level;
                }

                $sql .= " ORDER BY created_at DESC LIMIT $limit";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($alerts as &$alert) {
                    $alert['level_config'] = $alertLevels[$alert['level']] ?? null;
                    $alert['time_ago'] = formatTimeAgo($alert['created_at']);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'alerts' => $alerts,
                        'levels' => $alertLevels,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'logs') {
                $type = $_GET['type'] ?? 'error'; // error, access, debug, audit
                $limit = intval($_GET['limit'] ?? 100);

                $stmt = $db->prepare("
                    SELECT * FROM system_logs
                    WHERE log_type = :type
                    ORDER BY created_at DESC
                    LIMIT $limit
                ");
                $stmt->execute(['type' => $type]);
                $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($logs as &$log) {
                    $log['context'] = json_decode($log['context'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'logs' => $logs,
                        'type' => $type,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'database') {
                // Database statistics
                $dbStats = getDatabaseStats($db);

                echo json_encode([
                    'success' => true,
                    'data' => $dbStats,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'components' => $healthComponents,
                        'statuses' => $healthStatuses,
                        'metric_types' => $metricTypes,
                        'alert_levels' => $alertLevels,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'resolve_alert';

            if ($action === 'resolve_alert') {
                $alertId = $input['alert_id'] ?? null;

                if (!$alertId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Alert ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    UPDATE system_alerts SET resolved_at = NOW(), resolved_by = :user_id
                    WHERE id = :id
                ");
                $stmt->execute(['id' => $alertId, 'user_id' => $user['user_id']]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Alerta a fost rezolvată',
                    'message_en' => 'Alert resolved',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'run_health_check') {
                $health = checkSystemHealth($db);

                // Log health check
                $stmt = $db->prepare("
                    INSERT INTO system_health_history (id, status, components, checked_at)
                    VALUES (:id, :status, :components, NOW())
                ");
                $stmt->execute([
                    'id' => 'hc_' . bin2hex(random_bytes(8)),
                    'status' => $health['overall_status'],
                    'components' => json_encode($health['components']),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Verificare sănătate completă',
                    'message_en' => 'Health check complete',
                    'data' => $health,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'clear_cache') {
                // Clear various caches
                $cleared = [];

                // Clear file cache if exists
                $cacheDir = __DIR__ . '/../../../cache';
                if (is_dir($cacheDir)) {
                    array_map('unlink', glob("$cacheDir/*"));
                    $cleared[] = 'file_cache';
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Cache-ul a fost curățat',
                    'message_en' => 'Cache cleared',
                    'data' => ['cleared' => $cleared],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function checkSystemHealth($db) {
    $components = [];

    // Database check
    try {
        $start = microtime(true);
        $stmt = $db->query("SELECT 1");
        $responseTime = round((microtime(true) - $start) * 1000);
        $components['database'] = [
            'status' => 'healthy',
            'response_time' => $responseTime,
            'message' => 'Connected',
        ];
    } catch (Exception $e) {
        $components['database'] = ['status' => 'unhealthy', 'message' => $e->getMessage()];
    }

    // Storage check
    $diskFree = disk_free_space('/');
    $diskTotal = disk_total_space('/');
    $diskUsage = round((1 - $diskFree / $diskTotal) * 100);
    $components['storage'] = [
        'status' => $diskUsage > 90 ? 'unhealthy' : ($diskUsage > 75 ? 'degraded' : 'healthy'),
        'usage' => $diskUsage,
        'free_gb' => round($diskFree / 1024 / 1024 / 1024, 2),
    ];

    // Memory check
    $memInfo = getMemoryUsage();
    $components['memory'] = [
        'status' => $memInfo['usage'] > 90 ? 'unhealthy' : ($memInfo['usage'] > 75 ? 'degraded' : 'healthy'),
        'usage' => $memInfo['usage'],
        'used_mb' => $memInfo['used_mb'],
    ];

    // API check (self)
    $components['api'] = ['status' => 'healthy', 'message' => 'Responding'];

    // Overall status
    $statuses = array_column($components, 'status');
    $overallStatus = 'healthy';
    if (in_array('unhealthy', $statuses)) {
        $overallStatus = 'unhealthy';
    } elseif (in_array('degraded', $statuses)) {
        $overallStatus = 'degraded';
    }

    return [
        'overall_status' => $overallStatus,
        'components' => $components,
    ];
}

function getSystemMetrics($db, $period) {
    $intervals = [
        '1h' => '1 hour',
        '24h' => '24 hours',
        '7d' => '7 days',
        '30d' => '30 days',
    ];
    $interval = $intervals[$period] ?? '1 hour';

    // Get metrics from database
    $stmt = $db->prepare("
        SELECT metric_name, metric_value, recorded_at
        FROM system_metrics
        WHERE recorded_at > NOW() - INTERVAL '$interval'
        ORDER BY recorded_at ASC
    ");
    $stmt->execute();
    $metrics = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Group by metric name
    $grouped = [];
    foreach ($metrics as $m) {
        $grouped[$m['metric_name']][] = [
            'value' => floatval($m['metric_value']),
            'time' => $m['recorded_at'],
        ];
    }

    // Add current system metrics
    $grouped['cpu_usage'] = [['value' => getCpuUsage(), 'time' => date('Y-m-d H:i:s')]];
    $memInfo = getMemoryUsage();
    $grouped['memory_usage'] = [['value' => $memInfo['usage'], 'time' => date('Y-m-d H:i:s')]];

    return $grouped;
}

function getDatabaseStats($db) {
    $stats = [];

    // Table sizes
    $stmt = $db->query("
        SELECT relname as table_name,
               pg_size_pretty(pg_total_relation_size(relid)) as size
        FROM pg_catalog.pg_statio_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 10
    ");
    $stats['top_tables'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Connection count
    $stmt = $db->query("SELECT count(*) FROM pg_stat_activity");
    $stats['active_connections'] = intval($stmt->fetchColumn());

    // Database size
    $stmt = $db->query("SELECT pg_size_pretty(pg_database_size(current_database()))");
    $stats['database_size'] = $stmt->fetchColumn();

    return $stats;
}

function getSystemUptime() {
    if (file_exists('/proc/uptime')) {
        $uptime = floatval(file_get_contents('/proc/uptime'));
        $days = floor($uptime / 86400);
        $hours = floor(($uptime % 86400) / 3600);
        $minutes = floor(($uptime % 3600) / 60);
        return "{$days}d {$hours}h {$minutes}m";
    }
    return 'N/A';
}

function getAppVersion() {
    return '1.0.0'; // Would typically read from version file
}

function getCpuUsage() {
    if (file_exists('/proc/stat')) {
        $stat1 = file('/proc/stat');
        usleep(100000);
        $stat2 = file('/proc/stat');

        $info1 = explode(" ", preg_replace("!cpu +!", "", $stat1[0]));
        $info2 = explode(" ", preg_replace("!cpu +!", "", $stat2[0]));

        $dif = [];
        for ($i = 0; $i < 4; $i++) {
            $dif[$i] = $info2[$i] - $info1[$i];
        }

        $total = array_sum($dif);
        $usage = ($total > 0) ? round((1 - $dif[3] / $total) * 100) : 0;
        return $usage;
    }
    return 0;
}

function getMemoryUsage() {
    if (file_exists('/proc/meminfo')) {
        $data = file_get_contents('/proc/meminfo');
        preg_match('/MemTotal:\s+(\d+)\s+kB/', $data, $total);
        preg_match('/MemAvailable:\s+(\d+)\s+kB/', $data, $available);

        $totalKb = intval($total[1] ?? 0);
        $availKb = intval($available[1] ?? 0);
        $usedKb = $totalKb - $availKb;

        return [
            'usage' => $totalKb > 0 ? round(($usedKb / $totalKb) * 100) : 0,
            'used_mb' => round($usedKb / 1024),
            'total_mb' => round($totalKb / 1024),
        ];
    }
    return ['usage' => 0, 'used_mb' => 0, 'total_mb' => 0];
}

function formatTimeAgo($datetime) {
    $time = strtotime($datetime);
    $diff = time() - $time;

    if ($diff < 60) return 'acum';
    if ($diff < 3600) return floor($diff / 60) . ' min';
    if ($diff < 86400) return floor($diff / 3600) . ' ore';

    return date('d.m.Y H:i', $time);
}
