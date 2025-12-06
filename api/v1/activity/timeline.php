<?php
/**
 * Activity Timeline API
 * Visual timeline of entity activities
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

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

// Timeline entry types
$timelineTypes = [
    'activity' => [
        'label_ro' => 'Activitate',
        'label_en' => 'Activity',
    ],
    'comment' => [
        'label_ro' => 'Comentariu',
        'label_en' => 'Comment',
    ],
    'status_change' => [
        'label_ro' => 'Schimbare Stare',
        'label_en' => 'Status Change',
    ],
    'assignment' => [
        'label_ro' => 'Atribuire',
        'label_en' => 'Assignment',
    ],
    'attachment' => [
        'label_ro' => 'Atașament',
        'label_en' => 'Attachment',
    ],
    'email' => [
        'label_ro' => 'Email',
        'label_en' => 'Email',
    ],
    'system' => [
        'label_ro' => 'Sistem',
        'label_en' => 'System',
    ],
];

try {
    $db = getDbConnection();

    $entityType = $_GET['entity_type'] ?? null;
    $entityId = $_GET['entity_id'] ?? null;

    if (!$entityType || !$entityId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Tipul și ID-ul entității sunt obligatorii',
            'error' => 'Entity type and ID are required'
        ]);
        exit;
    }

    $limit = min(100, max(10, intval($_GET['limit'] ?? 50)));

    // Get timeline entries from multiple sources
    $timeline = [];

    // 1. Activity logs
    $activityStmt = $db->prepare("
        SELECT
            'activity' as timeline_type,
            a.id,
            a.activity_type as action,
            a.description,
            a.changes,
            a.created_at,
            u.id as user_id,
            u.first_name,
            u.last_name,
            u.avatar_url
        FROM activity_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.company_id = :company_id
        AND a.entity_type = :entity_type
        AND a.entity_id = :entity_id
        ORDER BY a.created_at DESC
        LIMIT :limit
    ");
    $activityStmt->bindValue('company_id', $companyId);
    $activityStmt->bindValue('entity_type', $entityType);
    $activityStmt->bindValue('entity_id', $entityId);
    $activityStmt->bindValue('limit', $limit, PDO::PARAM_INT);
    $activityStmt->execute();
    $activities = $activityStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($activities as $a) {
        $timeline[] = [
            'type' => 'activity',
            'id' => $a['id'],
            'action' => $a['action'],
            'description' => $a['description'],
            'changes' => json_decode($a['changes'] ?? '{}', true),
            'created_at' => $a['created_at'],
            'user' => [
                'id' => $a['user_id'],
                'name' => trim(($a['first_name'] ?? '') . ' ' . ($a['last_name'] ?? '')),
                'avatar_url' => $a['avatar_url'],
            ],
        ];
    }

    // 2. Comments (if entity supports comments)
    $commentStmt = $db->prepare("
        SELECT
            c.id,
            c.content,
            c.created_at,
            u.id as user_id,
            u.first_name,
            u.last_name,
            u.avatar_url
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.company_id = :company_id
        AND c.entity_type = :entity_type
        AND c.entity_id = :entity_id
        ORDER BY c.created_at DESC
        LIMIT :limit
    ");
    try {
        $commentStmt->bindValue('company_id', $companyId);
        $commentStmt->bindValue('entity_type', $entityType);
        $commentStmt->bindValue('entity_id', $entityId);
        $commentStmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $commentStmt->execute();
        $comments = $commentStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($comments as $c) {
            $timeline[] = [
                'type' => 'comment',
                'id' => $c['id'],
                'content' => $c['content'],
                'created_at' => $c['created_at'],
                'user' => [
                    'id' => $c['user_id'],
                    'name' => trim(($c['first_name'] ?? '') . ' ' . ($c['last_name'] ?? '')),
                    'avatar_url' => $c['avatar_url'],
                ],
            ];
        }
    } catch (Exception $e) {
        // Comments table might not exist for all entities
    }

    // 3. Attachments
    $attachmentStmt = $db->prepare("
        SELECT
            a.id,
            a.filename,
            a.file_size,
            a.mime_type,
            a.created_at,
            u.id as user_id,
            u.first_name,
            u.last_name,
            u.avatar_url
        FROM attachments a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.company_id = :company_id
        AND a.entity_type = :entity_type
        AND a.entity_id = :entity_id
        ORDER BY a.created_at DESC
        LIMIT :limit
    ");
    try {
        $attachmentStmt->bindValue('company_id', $companyId);
        $attachmentStmt->bindValue('entity_type', $entityType);
        $attachmentStmt->bindValue('entity_id', $entityId);
        $attachmentStmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $attachmentStmt->execute();
        $attachments = $attachmentStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($attachments as $a) {
            $timeline[] = [
                'type' => 'attachment',
                'id' => $a['id'],
                'filename' => $a['filename'],
                'file_size' => $a['file_size'],
                'mime_type' => $a['mime_type'],
                'created_at' => $a['created_at'],
                'user' => [
                    'id' => $a['user_id'],
                    'name' => trim(($a['first_name'] ?? '') . ' ' . ($a['last_name'] ?? '')),
                    'avatar_url' => $a['avatar_url'],
                ],
            ];
        }
    } catch (Exception $e) {
        // Attachments table might not exist
    }

    // Sort by created_at descending
    usort($timeline, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });

    // Limit and add time_ago
    $timeline = array_slice($timeline, 0, $limit);
    foreach ($timeline as &$item) {
        $item['time_ago'] = getTimeAgo($item['created_at']);
        $item['type_info'] = $timelineTypes[$item['type']] ?? null;
    }

    // Group by date for UI
    $groupedTimeline = [];
    foreach ($timeline as $item) {
        $date = date('Y-m-d', strtotime($item['created_at']));
        if (!isset($groupedTimeline[$date])) {
            $groupedTimeline[$date] = [
                'date' => $date,
                'date_label_ro' => formatDateRo($date),
                'date_label_en' => date('F j, Y', strtotime($date)),
                'items' => [],
            ];
        }
        $groupedTimeline[$date]['items'][] = $item;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'timeline' => array_values($timeline),
            'grouped_timeline' => array_values($groupedTimeline),
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'timeline_types' => $timelineTypes,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

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

function formatDateRo($date) {
    $months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
               'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    $d = strtotime($date);
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));

    if ($date === $today) {
        return 'Astăzi';
    } elseif ($date === $yesterday) {
        return 'Ieri';
    }

    return date('j', $d) . ' ' . $months[date('n', $d) - 1] . ' ' . date('Y', $d);
}
