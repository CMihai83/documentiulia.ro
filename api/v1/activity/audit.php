<?php
/**
 * Audit Trail API
 * Compliance-grade audit logging
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

// Audit logs are admin-only
if (!in_array($user['role'], ['admin'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot vizualiza jurnalul de audit',
        'error' => 'Only administrators can view audit logs'
    ]);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

// Audit event categories
$auditCategories = [
    'authentication' => [
        'label_ro' => 'Autentificare',
        'label_en' => 'Authentication',
        'events' => ['login', 'logout', 'login_failed', 'password_changed', 'mfa_enabled', 'mfa_disabled'],
    ],
    'user_management' => [
        'label_ro' => 'Gestionare Utilizatori',
        'label_en' => 'User Management',
        'events' => ['user_created', 'user_updated', 'user_deleted', 'role_changed', 'permissions_changed'],
    ],
    'data_access' => [
        'label_ro' => 'Acces Date',
        'label_en' => 'Data Access',
        'events' => ['data_exported', 'data_imported', 'bulk_download', 'report_generated'],
    ],
    'financial' => [
        'label_ro' => 'Financiar',
        'label_en' => 'Financial',
        'events' => ['invoice_voided', 'payment_modified', 'account_reconciled', 'period_closed'],
    ],
    'settings' => [
        'label_ro' => 'Setări',
        'label_en' => 'Settings',
        'events' => ['company_settings_changed', 'integration_added', 'integration_removed', 'api_key_generated'],
    ],
    'security' => [
        'label_ro' => 'Securitate',
        'label_en' => 'Security',
        'events' => ['suspicious_activity', 'ip_blocked', 'access_denied', 'data_breach_attempt'],
    ],
];

// Risk levels
$riskLevels = [
    'low' => ['ro' => 'Scăzut', 'en' => 'Low', 'color' => 'gray'],
    'medium' => ['ro' => 'Mediu', 'en' => 'Medium', 'color' => 'yellow'],
    'high' => ['ro' => 'Ridicat', 'en' => 'High', 'color' => 'orange'],
    'critical' => ['ro' => 'Critic', 'en' => 'Critical', 'color' => 'red'],
];

try {
    $db = getDbConnection();

    $category = $_GET['category'] ?? null;
    $riskLevel = $_GET['risk_level'] ?? null;
    $userId = $_GET['user_id'] ?? null;
    $dateFrom = $_GET['date_from'] ?? null;
    $dateTo = $_GET['date_to'] ?? null;
    $search = $_GET['search'] ?? null;

    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(100, max(10, intval($_GET['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;

    // Build query
    $sql = "
        SELECT a.*, u.first_name, u.last_name, u.email
        FROM audit_logs a
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
    if ($search) {
        $sql .= " AND (a.event_type LIKE :search OR a.description LIKE :search OR u.email LIKE :search)";
        $params['search'] = "%$search%";
    }

    // Count total
    $countStmt = $db->prepare(str_replace('SELECT a.*, u.first_name, u.last_name, u.email', 'SELECT COUNT(*)', $sql));
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();

    // Get audit entries
    $sql .= " ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset";
    $stmt = $db->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($entries as &$e) {
        $e['user_name'] = trim(($e['first_name'] ?? '') . ' ' . ($e['last_name'] ?? ''));
        $e['risk_info'] = $riskLevels[$e['risk_level']] ?? null;
        $e['category_info'] = $auditCategories[$e['category']] ?? null;
        $e['details'] = json_decode($e['details'] ?? '{}', true);
        $e['before_state'] = json_decode($e['before_state'] ?? 'null', true);
        $e['after_state'] = json_decode($e['after_state'] ?? 'null', true);
    }

    // Get summary stats
    $statsStmt = $db->prepare("
        SELECT
            category,
            risk_level,
            COUNT(*) as count
        FROM audit_logs
        WHERE company_id = :company_id
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY category, risk_level
    ");
    $statsStmt->execute(['company_id' => $companyId]);
    $stats = $statsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Get recent high-risk events
    $highRiskStmt = $db->prepare("
        SELECT a.*, u.first_name, u.last_name
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.company_id = :company_id
        AND a.risk_level IN ('high', 'critical')
        ORDER BY a.created_at DESC
        LIMIT 10
    ");
    $highRiskStmt->execute(['company_id' => $companyId]);
    $highRiskEvents = $highRiskStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'entries' => $entries,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => intval($total),
                'total_pages' => ceil($total / $limit),
            ],
            'stats' => $stats,
            'high_risk_events' => $highRiskEvents,
            'categories' => $auditCategories,
            'risk_levels' => $riskLevels,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
