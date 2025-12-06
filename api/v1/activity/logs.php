<?php
/**
 * Activity Logs API
 * Track user activities and changes
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

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Activity types
$activityTypes = [
    'created' => [
        'label_ro' => 'Creat',
        'label_en' => 'Created',
        'icon' => 'plus-circle',
        'color' => 'green',
    ],
    'updated' => [
        'label_ro' => 'Actualizat',
        'label_en' => 'Updated',
        'icon' => 'edit',
        'color' => 'blue',
    ],
    'deleted' => [
        'label_ro' => 'Șters',
        'label_en' => 'Deleted',
        'icon' => 'trash',
        'color' => 'red',
    ],
    'viewed' => [
        'label_ro' => 'Vizualizat',
        'label_en' => 'Viewed',
        'icon' => 'eye',
        'color' => 'gray',
    ],
    'downloaded' => [
        'label_ro' => 'Descărcat',
        'label_en' => 'Downloaded',
        'icon' => 'download',
        'color' => 'purple',
    ],
    'exported' => [
        'label_ro' => 'Exportat',
        'label_en' => 'Exported',
        'icon' => 'file-export',
        'color' => 'orange',
    ],
    'imported' => [
        'label_ro' => 'Importat',
        'label_en' => 'Imported',
        'icon' => 'file-import',
        'color' => 'teal',
    ],
    'sent' => [
        'label_ro' => 'Trimis',
        'label_en' => 'Sent',
        'icon' => 'send',
        'color' => 'blue',
    ],
    'approved' => [
        'label_ro' => 'Aprobat',
        'label_en' => 'Approved',
        'icon' => 'check',
        'color' => 'green',
    ],
    'rejected' => [
        'label_ro' => 'Respins',
        'label_en' => 'Rejected',
        'icon' => 'x',
        'color' => 'red',
    ],
    'comment' => [
        'label_ro' => 'Comentariu',
        'label_en' => 'Comment',
        'icon' => 'message-circle',
        'color' => 'gray',
    ],
    'status_changed' => [
        'label_ro' => 'Stare modificată',
        'label_en' => 'Status Changed',
        'icon' => 'refresh-cw',
        'color' => 'yellow',
    ],
    'assigned' => [
        'label_ro' => 'Atribuit',
        'label_en' => 'Assigned',
        'icon' => 'user-plus',
        'color' => 'blue',
    ],
    'login' => [
        'label_ro' => 'Autentificare',
        'label_en' => 'Login',
        'icon' => 'log-in',
        'color' => 'green',
    ],
    'logout' => [
        'label_ro' => 'Deconectare',
        'label_en' => 'Logout',
        'icon' => 'log-out',
        'color' => 'gray',
    ],
];

// Entity types
$entityTypes = [
    'invoice' => ['ro' => 'Factură', 'en' => 'Invoice'],
    'expense' => ['ro' => 'Cheltuială', 'en' => 'Expense'],
    'contact' => ['ro' => 'Contact', 'en' => 'Contact'],
    'product' => ['ro' => 'Produs', 'en' => 'Product'],
    'project' => ['ro' => 'Proiect', 'en' => 'Project'],
    'task' => ['ro' => 'Sarcină', 'en' => 'Task'],
    'employee' => ['ro' => 'Angajat', 'en' => 'Employee'],
    'user' => ['ro' => 'Utilizator', 'en' => 'User'],
    'team' => ['ro' => 'Echipă', 'en' => 'Team'],
    'report' => ['ro' => 'Raport', 'en' => 'Report'],
    'document' => ['ro' => 'Document', 'en' => 'Document'],
    'setting' => ['ro' => 'Setare', 'en' => 'Setting'],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        $entityType = $_GET['entity_type'] ?? null;
        $entityId = $_GET['entity_id'] ?? null;
        $userId = $_GET['user_id'] ?? null;
        $activityType = $_GET['activity_type'] ?? null;
        $dateFrom = $_GET['date_from'] ?? null;
        $dateTo = $_GET['date_to'] ?? null;

        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(100, max(10, intval($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;

        // Build query
        $sql = "
            SELECT a.*, u.first_name, u.last_name, u.email, u.avatar_url
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.company_id = :company_id
        ";
        $params = ['company_id' => $companyId];

        if ($entityType) {
            $sql .= " AND a.entity_type = :entity_type";
            $params['entity_type'] = $entityType;
        }
        if ($entityId) {
            $sql .= " AND a.entity_id = :entity_id";
            $params['entity_id'] = $entityId;
        }
        if ($userId) {
            $sql .= " AND a.user_id = :user_id";
            $params['user_id'] = $userId;
        }
        if ($activityType) {
            $sql .= " AND a.activity_type = :activity_type";
            $params['activity_type'] = $activityType;
        }
        if ($dateFrom) {
            $sql .= " AND a.created_at >= :date_from";
            $params['date_from'] = $dateFrom;
        }
        if ($dateTo) {
            $sql .= " AND a.created_at <= :date_to";
            $params['date_to'] = $dateTo . ' 23:59:59';
        }

        // Count total
        $countStmt = $db->prepare(str_replace('SELECT a.*, u.first_name, u.last_name, u.email, u.avatar_url', 'SELECT COUNT(*)', $sql));
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        // Get activities
        $sql .= " ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($activities as &$a) {
            $a['user_name'] = trim(($a['first_name'] ?? '') . ' ' . ($a['last_name'] ?? ''));
            $a['activity_info'] = $activityTypes[$a['activity_type']] ?? null;
            $a['entity_label'] = $entityTypes[$a['entity_type']] ?? ['ro' => $a['entity_type'], 'en' => $a['entity_type']];
            $a['changes'] = json_decode($a['changes'] ?? '{}', true);
            $a['metadata'] = json_decode($a['metadata'] ?? '{}', true);
            $a['time_ago'] = getTimeAgo($a['created_at']);
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'activities' => $activities,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => intval($total),
                    'total_pages' => ceil($total / $limit),
                ],
                'activity_types' => $activityTypes,
                'entity_types' => $entityTypes,
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    } elseif ($method === 'POST') {
        // Log activity (usually done internally)
        $input = json_decode(file_get_contents('php://input'), true);

        $activityType = $input['activity_type'] ?? null;
        $entityType = $input['entity_type'] ?? null;
        $entityId = $input['entity_id'] ?? null;

        if (!$activityType || !$entityType) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Tipul activității și entității sunt obligatorii',
                'error' => 'Activity type and entity type are required'
            ]);
            exit;
        }

        $logId = 'log_' . bin2hex(random_bytes(12));
        $stmt = $db->prepare("
            INSERT INTO activity_logs (
                id, company_id, user_id, activity_type, entity_type, entity_id,
                entity_name, description, changes, metadata, ip_address, user_agent, created_at
            ) VALUES (
                :id, :company_id, :user_id, :activity_type, :entity_type, :entity_id,
                :entity_name, :description, :changes, :metadata, :ip_address, :user_agent, NOW()
            )
        ");
        $stmt->execute([
            'id' => $logId,
            'company_id' => $companyId,
            'user_id' => $user['user_id'],
            'activity_type' => $activityType,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'entity_name' => $input['entity_name'] ?? null,
            'description' => $input['description'] ?? null,
            'changes' => json_encode($input['changes'] ?? []),
            'metadata' => json_encode($input['metadata'] ?? []),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ]);

        echo json_encode([
            'success' => true,
            'message_ro' => 'Activitate înregistrată',
            'message_en' => 'Activity logged',
            'data' => ['id' => $logId],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function getTimeAgo($datetime) {
    $time = strtotime($datetime);
    $diff = time() - $time;

    if ($diff < 60) {
        return ['ro' => 'Acum', 'en' => 'Just now'];
    } elseif ($diff < 3600) {
        $mins = floor($diff / 60);
        return ['ro' => "Acum $mins min", 'en' => "$mins min ago"];
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return ['ro' => "Acum $hours ore", 'en' => "$hours hours ago"];
    } elseif ($diff < 604800) {
        $days = floor($diff / 86400);
        return ['ro' => "Acum $days zile", 'en' => "$days days ago"];
    } else {
        return ['ro' => date('d.m.Y H:i', $time), 'en' => date('M d, Y H:i', $time)];
    }
}
