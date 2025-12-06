<?php
/**
 * Team Collaboration API
 * Manage team collaboration features like comments, mentions, and activity feeds
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

// Comment types
$commentTypes = [
    'comment' => ['ro' => 'Comentariu', 'en' => 'Comment', 'icon' => 'comment'],
    'note' => ['ro' => 'Notă', 'en' => 'Note', 'icon' => 'note'],
    'question' => ['ro' => 'Întrebare', 'en' => 'Question', 'icon' => 'help'],
    'suggestion' => ['ro' => 'Sugestie', 'en' => 'Suggestion', 'icon' => 'lightbulb'],
    'approval' => ['ro' => 'Aprobare', 'en' => 'Approval', 'icon' => 'check_circle'],
    'rejection' => ['ro' => 'Respingere', 'en' => 'Rejection', 'icon' => 'cancel'],
    'system' => ['ro' => 'Sistem', 'en' => 'System', 'icon' => 'info'],
];

// Entity types that support comments
$commentableEntities = [
    'invoice' => ['ro' => 'Factură', 'en' => 'Invoice'],
    'expense' => ['ro' => 'Cheltuială', 'en' => 'Expense'],
    'project' => ['ro' => 'Proiect', 'en' => 'Project'],
    'task' => ['ro' => 'Sarcină', 'en' => 'Task'],
    'contact' => ['ro' => 'Contact', 'en' => 'Contact'],
    'product' => ['ro' => 'Produs', 'en' => 'Product'],
    'document' => ['ro' => 'Document', 'en' => 'Document'],
    'ticket' => ['ro' => 'Tichet', 'en' => 'Ticket'],
];

// Activity feed types
$activityTypes = [
    'created' => ['ro' => 'a creat', 'en' => 'created', 'icon' => 'add', 'color' => '#4CAF50'],
    'updated' => ['ro' => 'a actualizat', 'en' => 'updated', 'icon' => 'edit', 'color' => '#2196F3'],
    'deleted' => ['ro' => 'a șters', 'en' => 'deleted', 'icon' => 'delete', 'color' => '#F44336'],
    'commented' => ['ro' => 'a comentat la', 'en' => 'commented on', 'icon' => 'comment', 'color' => '#FF9800'],
    'mentioned' => ['ro' => 'te-a menționat în', 'en' => 'mentioned you in', 'icon' => 'alternate_email', 'color' => '#9C27B0'],
    'assigned' => ['ro' => 'ți-a atribuit', 'en' => 'assigned you', 'icon' => 'person_add', 'color' => '#00BCD4'],
    'completed' => ['ro' => 'a finalizat', 'en' => 'completed', 'icon' => 'check', 'color' => '#4CAF50'],
    'shared' => ['ro' => 'a partajat', 'en' => 'shared', 'icon' => 'share', 'color' => '#3F51B5'],
    'approved' => ['ro' => 'a aprobat', 'en' => 'approved', 'icon' => 'thumb_up', 'color' => '#4CAF50'],
    'rejected' => ['ro' => 'a respins', 'en' => 'rejected', 'icon' => 'thumb_down', 'color' => '#F44336'],
];

// Reaction types
$reactionTypes = [
    'like' => ['ro' => 'Apreciere', 'en' => 'Like', 'emoji' => '👍'],
    'love' => ['ro' => 'Dragoste', 'en' => 'Love', 'emoji' => '❤️'],
    'celebrate' => ['ro' => 'Celebrare', 'en' => 'Celebrate', 'emoji' => '🎉'],
    'support' => ['ro' => 'Susținere', 'en' => 'Support', 'emoji' => '💪'],
    'insightful' => ['ro' => 'Perspicace', 'en' => 'Insightful', 'emoji' => '💡'],
    'curious' => ['ro' => 'Curiozitate', 'en' => 'Curious', 'emoji' => '🤔'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'feed';

            if ($action === 'feed') {
                // Get activity feed
                $entityType = $_GET['entity_type'] ?? null;
                $entityId = $_GET['entity_id'] ?? null;
                $limit = intval($_GET['limit'] ?? 20);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT a.*, u.first_name, u.last_name, u.avatar_url
                    FROM team_activity a
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

                $sql .= " ORDER BY a.created_at DESC LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($activities as &$act) {
                    $act['user_name'] = trim(($act['first_name'] ?? '') . ' ' . ($act['last_name'] ?? ''));
                    $act['activity_config'] = $activityTypes[$act['activity_type']] ?? null;
                    $act['entity_label'] = $commentableEntities[$act['entity_type']] ?? null;
                    $act['metadata'] = json_decode($act['metadata'] ?? '{}', true);
                    $act['time_ago'] = formatTimeAgo($act['created_at']);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'activities' => $activities,
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'comments') {
                // Get comments for entity
                $entityType = $_GET['entity_type'] ?? null;
                $entityId = $_GET['entity_id'] ?? null;

                if (!$entityType || !$entityId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'entity_type and entity_id required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT c.*, u.first_name, u.last_name, u.avatar_url
                    FROM comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    WHERE c.company_id = :company_id AND c.entity_type = :entity_type AND c.entity_id = :entity_id
                    ORDER BY c.created_at ASC
                ");
                $stmt->execute(['company_id' => $companyId, 'entity_type' => $entityType, 'entity_id' => $entityId]);
                $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($comments as &$comment) {
                    $comment['user_name'] = trim(($comment['first_name'] ?? '') . ' ' . ($comment['last_name'] ?? ''));
                    $comment['type_config'] = $commentTypes[$comment['comment_type']] ?? null;
                    $comment['mentions'] = json_decode($comment['mentions'] ?? '[]', true);
                    $comment['time_ago'] = formatTimeAgo($comment['created_at']);

                    // Get reactions
                    $stmt2 = $db->prepare("
                        SELECT reaction_type, COUNT(*) as count
                        FROM comment_reactions WHERE comment_id = :comment_id
                        GROUP BY reaction_type
                    ");
                    $stmt2->execute(['comment_id' => $comment['id']]);
                    $comment['reactions'] = $stmt2->fetchAll(PDO::FETCH_KEY_PAIR);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'comments' => $comments,
                        'types' => $commentTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'mentions') {
                // Get mentions for current user
                $unreadOnly = $_GET['unread'] ?? false;
                $limit = intval($_GET['limit'] ?? 20);

                $sql = "
                    SELECT m.*, c.content, c.entity_type, c.entity_id, u.first_name, u.last_name
                    FROM mentions m
                    INNER JOIN comments c ON m.comment_id = c.id
                    LEFT JOIN users u ON c.user_id = u.id
                    WHERE m.mentioned_user_id = :user_id AND c.company_id = :company_id
                ";
                $params = ['user_id' => $user['user_id'], 'company_id' => $companyId];

                if ($unreadOnly) {
                    $sql .= " AND m.read_at IS NULL";
                }

                $sql .= " ORDER BY m.created_at DESC LIMIT $limit";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $mentions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($mentions as &$mention) {
                    $mention['mentioned_by'] = trim(($mention['first_name'] ?? '') . ' ' . ($mention['last_name'] ?? ''));
                    $mention['entity_label'] = $commentableEntities[$mention['entity_type']] ?? null;
                    $mention['time_ago'] = formatTimeAgo($mention['created_at']);
                }

                echo json_encode([
                    'success' => true,
                    'data' => $mentions,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'comment_types' => $commentTypes,
                        'entity_types' => $commentableEntities,
                        'activity_types' => $activityTypes,
                        'reaction_types' => $reactionTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'comment';

            if ($action === 'comment') {
                // Add comment
                $entityType = $input['entity_type'] ?? null;
                $entityId = $input['entity_id'] ?? null;
                $content = $input['content'] ?? null;
                $commentType = $input['comment_type'] ?? 'comment';

                if (!$entityType || !$entityId || !$content) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Tipul entității, ID-ul și conținutul sunt obligatorii',
                        'error' => 'Entity type, ID and content are required'
                    ]);
                    exit;
                }

                // Extract mentions
                preg_match_all('/@(\w+)/', $content, $matches);
                $mentionedUsernames = $matches[1] ?? [];

                $commentId = 'cmt_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO comments (id, company_id, user_id, entity_type, entity_id, content, comment_type, mentions, created_at)
                    VALUES (:id, :company_id, :user_id, :entity_type, :entity_id, :content, :type, :mentions, NOW())
                ");
                $stmt->execute([
                    'id' => $commentId,
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'entity_type' => $entityType,
                    'entity_id' => $entityId,
                    'content' => $content,
                    'type' => $commentType,
                    'mentions' => json_encode($mentionedUsernames),
                ]);

                // Create mentions records
                if (!empty($mentionedUsernames)) {
                    $stmt2 = $db->prepare("
                        INSERT INTO mentions (comment_id, mentioned_user_id, created_at)
                        SELECT :comment_id, u.id, NOW()
                        FROM users u
                        INNER JOIN company_users cu ON u.id = cu.user_id
                        WHERE cu.company_id = :company_id AND u.first_name = :username
                    ");
                    foreach ($mentionedUsernames as $username) {
                        $stmt2->execute([
                            'comment_id' => $commentId,
                            'company_id' => $companyId,
                            'username' => $username,
                        ]);
                    }
                }

                // Log activity
                $stmt = $db->prepare("
                    INSERT INTO team_activity (id, company_id, user_id, activity_type, entity_type, entity_id, entity_name, metadata, created_at)
                    VALUES (:id, :company_id, :user_id, 'commented', :entity_type, :entity_id, :entity_name, :metadata, NOW())
                ");
                $stmt->execute([
                    'id' => 'act_' . bin2hex(random_bytes(8)),
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'entity_type' => $entityType,
                    'entity_id' => $entityId,
                    'entity_name' => $input['entity_name'] ?? null,
                    'metadata' => json_encode(['comment_id' => $commentId]),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Comentariul a fost adăugat',
                    'message_en' => 'Comment added',
                    'data' => ['id' => $commentId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'react') {
                // Add reaction
                $commentId = $input['comment_id'] ?? null;
                $reactionType = $input['reaction_type'] ?? 'like';

                if (!$commentId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Comment ID required']);
                    exit;
                }

                // Toggle reaction
                $stmt = $db->prepare("
                    SELECT id FROM comment_reactions 
                    WHERE comment_id = :comment_id AND user_id = :user_id AND reaction_type = :type
                ");
                $stmt->execute(['comment_id' => $commentId, 'user_id' => $user['user_id'], 'type' => $reactionType]);
                $existing = $stmt->fetch();

                if ($existing) {
                    // Remove reaction
                    $stmt = $db->prepare("DELETE FROM comment_reactions WHERE id = :id");
                    $stmt->execute(['id' => $existing['id']]);
                    $added = false;
                } else {
                    // Add reaction
                    $stmt = $db->prepare("
                        INSERT INTO comment_reactions (comment_id, user_id, reaction_type, created_at)
                        VALUES (:comment_id, :user_id, :type, NOW())
                    ");
                    $stmt->execute(['comment_id' => $commentId, 'user_id' => $user['user_id'], 'type' => $reactionType]);
                    $added = true;
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => $added ? 'Reacție adăugată' : 'Reacție eliminată',
                    'message_en' => $added ? 'Reaction added' : 'Reaction removed',
                    'data' => ['added' => $added],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'mark_read') {
                // Mark mentions as read
                $mentionIds = $input['mention_ids'] ?? [];

                if (empty($mentionIds)) {
                    // Mark all as read
                    $stmt = $db->prepare("
                        UPDATE mentions SET read_at = NOW()
                        WHERE mentioned_user_id = :user_id AND read_at IS NULL
                    ");
                    $stmt->execute(['user_id' => $user['user_id']]);
                } else {
                    $placeholders = implode(',', array_fill(0, count($mentionIds), '?'));
                    $stmt = $db->prepare("
                        UPDATE mentions SET read_at = NOW()
                        WHERE id IN ($placeholders) AND mentioned_user_id = ?
                    ");
                    $stmt->execute(array_merge($mentionIds, [$user['user_id']]));
                }

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Mențiunile au fost marcate ca citite',
                    'message_en' => 'Mentions marked as read',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $commentId = $input['id'] ?? null;
            $content = $input['content'] ?? null;

            if (!$commentId || !$content) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Comment ID and content required']);
                exit;
            }

            // Only allow editing own comments
            $stmt = $db->prepare("SELECT user_id FROM comments WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $commentId, 'company_id' => $companyId]);
            $comment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$comment || $comment['user_id'] !== $user['user_id']) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți edita acest comentariu',
                    'error' => 'You cannot edit this comment'
                ]);
                exit;
            }

            $stmt = $db->prepare("UPDATE comments SET content = :content, updated_at = NOW() WHERE id = :id");
            $stmt->execute(['id' => $commentId, 'content' => $content]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Comentariul a fost actualizat',
                'message_en' => 'Comment updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $commentId = $_GET['id'] ?? null;

            if (!$commentId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Comment ID required']);
                exit;
            }

            // Only allow deleting own comments or admin
            $stmt = $db->prepare("SELECT user_id FROM comments WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $commentId, 'company_id' => $companyId]);
            $comment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$comment || ($comment['user_id'] !== $user['user_id'] && !in_array($user['role'], ['admin', 'owner']))) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți șterge acest comentariu',
                    'error' => 'You cannot delete this comment'
                ]);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM comments WHERE id = :id");
            $stmt->execute(['id' => $commentId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Comentariul a fost șters',
                'message_en' => 'Comment deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function formatTimeAgo($datetime) {
    $now = new DateTime();
    $then = new DateTime($datetime);
    $diff = $now->diff($then);

    if ($diff->y > 0) return $diff->y . ' ani';
    if ($diff->m > 0) return $diff->m . ' luni';
    if ($diff->d > 0) return $diff->d . ' zile';
    if ($diff->h > 0) return $diff->h . ' ore';
    if ($diff->i > 0) return $diff->i . ' minute';
    return 'acum';
}
