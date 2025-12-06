<?php
/**
 * Activity Log API
 * Track all user activities and system events
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
    'create' => ['ro' => 'Creare', 'en' => 'Create', 'icon' => 'add_circle', 'color' => '#4CAF50'],
    'update' => ['ro' => 'Modificare', 'en' => 'Update', 'icon' => 'edit', 'color' => '#2196F3'],
    'delete' => ['ro' => 'Ștergere', 'en' => 'Delete', 'icon' => 'delete', 'color' => '#F44336'],
    'view' => ['ro' => 'Vizualizare', 'en' => 'View', 'icon' => 'visibility', 'color' => '#9E9E9E'],
    'download' => ['ro' => 'Descărcare', 'en' => 'Download', 'icon' => 'download', 'color' => '#00BCD4'],
    'export' => ['ro' => 'Export', 'en' => 'Export', 'icon' => 'file_download', 'color' => '#FF9800'],
    'import' => ['ro' => 'Import', 'en' => 'Import', 'icon' => 'file_upload', 'color' => '#9C27B0'],
    'login' => ['ro' => 'Autentificare', 'en' => 'Login', 'icon' => 'login', 'color' => '#4CAF50'],
    'logout' => ['ro' => 'Deconectare', 'en' => 'Logout', 'icon' => 'logout', 'color' => '#607D8B'],
    'approve' => ['ro' => 'Aprobare', 'en' => 'Approve', 'icon' => 'thumb_up', 'color' => '#4CAF50'],
    'reject' => ['ro' => 'Respingere', 'en' => 'Reject', 'icon' => 'thumb_down', 'color' => '#F44336'],
    'send' => ['ro' => 'Trimitere', 'en' => 'Send', 'icon' => 'send', 'color' => '#2196F3'],
    'archive' => ['ro' => 'Arhivare', 'en' => 'Archive', 'icon' => 'archive', 'color' => '#795548'],
    'restore' => ['ro' => 'Restaurare', 'en' => 'Restore', 'icon' => 'restore', 'color' => '#009688'],
    'share' => ['ro' => 'Partajare', 'en' => 'Share', 'icon' => 'share', 'color' => '#3F51B5'],
    'comment' => ['ro' => 'Comentariu', 'en' => 'Comment', 'icon' => 'comment', 'color' => '#FF5722'],
    'assign' => ['ro' => 'Atribuire', 'en' => 'Assign', 'icon' => 'person_add', 'color' => '#E91E63'],
    'status_change' => ['ro' => 'Schimbare status', 'en' => 'Status Change', 'icon' => 'swap_horiz', 'color' => '#673AB7'],
];

// Entity types
$entityTypes = [
    'invoice' => ['ro' => 'Factură', 'en' => 'Invoice'],
    'contact' => ['ro' => 'Contact', 'en' => 'Contact'],
    'product' => ['ro' => 'Produs', 'en' => 'Product'],
    'expense' => ['ro' => 'Cheltuială', 'en' => 'Expense'],
    'project' => ['ro' => 'Proiect', 'en' => 'Project'],
    'task' => ['ro' => 'Sarcină', 'en' => 'Task'],
    'employee' => ['ro' => 'Angajat', 'en' => 'Employee'],
    'user' => ['ro' => 'Utilizator', 'en' => 'User'],
    'report' => ['ro' => 'Raport', 'en' => 'Report'],
    'document' => ['ro' => 'Document', 'en' => 'Document'],
    'payment' => ['ro' => 'Plată', 'en' => 'Payment'],
    'settings' => ['ro' => 'Setări', 'en' => 'Settings'],
    'company' => ['ro' => 'Companie', 'en' => 'Company'],
    'subscription' => ['ro' => 'Abonament', 'en' => 'Subscription'],
    'api_key' => ['ro' => 'Cheie API', 'en' => 'API Key'],
    'webhook' => ['ro' => 'Webhook', 'en' => 'Webhook'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                // Get activity log with filters
                $userId = $_GET['user_id'] ?? null;
                $entityType = $_GET['entity_type'] ?? null;
                $activityType = $_GET['activity_type'] ?? null;
                $dateFrom = $_GET['date_from'] ?? null;
                $dateTo = $_GET['date_to'] ?? null;
                $limit = intval($_GET['limit'] ?? 50);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT a.*, u.first_name, u.last_name, u.email as user_email
                    FROM activity_log a
                    LEFT JOIN users u ON a.user_id = u.id
                    WHERE a.company_id = :company_id
                ";
                $params = ['company_id' => $companyId];

                if ($userId) {
                    $sql .= " AND a.user_id = :user_id";
                    $params['user_id'] = $userId;
                }
                if ($entityType) {
                    $sql .= " AND a.entity_type = :entity_type";
                    $params['entity_type'] = $entityType;
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

                $sql .= " ORDER BY a.created_at DESC LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($activities as &$act) {
                    $act['activity_type_config'] = $activityTypes[$act['activity_type']] ?? null;
                    $act['entity_type_label'] = $entityTypes[$act['entity_type']] ?? null;
                    $act['user_name'] = trim(($act['first_name'] ?? '') . ' ' . ($act['last_name'] ?? ''));
                    $act['changes'] = json_decode($act['changes'] ?? '{}', true);
                    $act['metadata'] = json_decode($act['metadata'] ?? '{}', true);
                }

                // Get total count
                $countSql = "SELECT COUNT(*) FROM activity_log WHERE company_id = :company_id";
                $stmt = $db->prepare($countSql);
                $stmt->execute(['company_id' => $companyId]);
                $total = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'activities' => $activities,
                        'total' => intval($total),
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'entity') {
                // Get activity for specific entity
                $entityType = $_GET['entity_type'] ?? null;
                $entityId = $_GET['entity_id'] ?? null;

                if (!$entityType || !$entityId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'entity_type and entity_id required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT a.*, u.first_name, u.last_name
                    FROM activity_log a
                    LEFT JOIN users u ON a.user_id = u.id
                    WHERE a.company_id = :company_id AND a.entity_type = :entity_type AND a.entity_id = :entity_id
                    ORDER BY a.created_at DESC
                    LIMIT 100
                ");
                $stmt->execute(['company_id' => $companyId, 'entity_type' => $entityType, 'entity_id' => $entityId]);
                $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($activities as &$act) {
                    $act['activity_type_config'] = $activityTypes[$act['activity_type']] ?? null;
                    $act['user_name'] = trim(($act['first_name'] ?? '') . ' ' . ($act['last_name'] ?? ''));
                    $act['changes'] = json_decode($act['changes'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => $activities,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'user') {
                // Get activity for specific user
                $targetUserId = $_GET['user_id'] ?? null;

                if (!$targetUserId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'user_id required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT a.*, u.first_name, u.last_name
                    FROM activity_log a
                    LEFT JOIN users u ON a.user_id = u.id
                    WHERE a.company_id = :company_id AND a.user_id = :user_id
                    ORDER BY a.created_at DESC
                    LIMIT 100
                ");
                $stmt->execute(['company_id' => $companyId, 'user_id' => $targetUserId]);
                $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($activities as &$act) {
                    $act['activity_type_config'] = $activityTypes[$act['activity_type']] ?? null;
                    $act['entity_type_label'] = $entityTypes[$act['entity_type']] ?? null;
                    $act['changes'] = json_decode($act['changes'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => $activities,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'activity_types' => $activityTypes,
                        'entity_types' => $entityTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'stats') {
                // Get activity statistics
                $period = $_GET['period'] ?? '30days';

                $dateCondition = match($period) {
                    '7days' => "created_at >= NOW() - INTERVAL '7 days'",
                    '30days' => "created_at >= NOW() - INTERVAL '30 days'",
                    '90days' => "created_at >= NOW() - INTERVAL '90 days'",
                    'year' => "created_at >= NOW() - INTERVAL '1 year'",
                    default => "created_at >= NOW() - INTERVAL '30 days'",
                };

                // Activity by type
                $stmt = $db->prepare("
                    SELECT activity_type, COUNT(*) as count FROM activity_log
                    WHERE company_id = :company_id AND $dateCondition
                    GROUP BY activity_type ORDER BY count DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $byType = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Activity by entity
                $stmt = $db->prepare("
                    SELECT entity_type, COUNT(*) as count FROM activity_log
                    WHERE company_id = :company_id AND $dateCondition
                    GROUP BY entity_type ORDER BY count DESC
                ");
                $stmt->execute(['company_id' => $companyId]);
                $byEntity = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Activity by user
                $stmt = $db->prepare("
                    SELECT a.user_id, u.first_name, u.last_name, COUNT(*) as count
                    FROM activity_log a
                    LEFT JOIN users u ON a.user_id = u.id
                    WHERE a.company_id = :company_id AND a.$dateCondition
                    GROUP BY a.user_id, u.first_name, u.last_name ORDER BY count DESC LIMIT 10
                ");
                $stmt->execute(['company_id' => $companyId]);
                $byUser = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Daily activity
                $stmt = $db->prepare("
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM activity_log
                    WHERE company_id = :company_id AND $dateCondition
                    GROUP BY DATE(created_at) ORDER BY date
                ");
                $stmt->execute(['company_id' => $companyId]);
                $daily = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'by_type' => $byType,
                        'by_entity' => $byEntity,
                        'by_user' => $byUser,
                        'daily' => $daily,
                        'period' => $period,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            // Log activity (internal use)
            $input = json_decode(file_get_contents('php://input'), true);

            $activityType = $input['activity_type'] ?? null;
            $entityType = $input['entity_type'] ?? null;
            $entityId = $input['entity_id'] ?? null;
            $description = $input['description'] ?? null;

            if (!$activityType || !$entityType) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error_ro' => 'Tip activitate și entitate obligatorii', 'error' => 'Activity type and entity required']);
                exit;
            }

            $activityId = 'act_' . bin2hex(random_bytes(8));
            $stmt = $db->prepare("
                INSERT INTO activity_log (
                    id, company_id, user_id, activity_type, entity_type, entity_id,
                    entity_name, description, changes, metadata, ip_address, user_agent, created_at
                ) VALUES (
                    :id, :company_id, :user_id, :activity_type, :entity_type, :entity_id,
                    :entity_name, :description, :changes, :metadata, :ip_address, :user_agent, NOW()
                )
            ");
            $stmt->execute([
                'id' => $activityId,
                'company_id' => $companyId,
                'user_id' => $user['user_id'],
                'activity_type' => $activityType,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'entity_name' => $input['entity_name'] ?? null,
                'description' => $description,
                'changes' => json_encode($input['changes'] ?? []),
                'metadata' => json_encode($input['metadata'] ?? []),
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Activitate înregistrată',
                'message_en' => 'Activity logged',
                'data' => ['id' => $activityId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
