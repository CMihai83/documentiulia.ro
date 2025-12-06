<?php
/**
 * Saved Searches API
 * Save and manage search/filter presets
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

// Visibility options
$visibilityOptions = [
    'private' => ['ro' => 'Privat', 'en' => 'Private'],
    'team' => ['ro' => 'Echipă', 'en' => 'Team'],
    'company' => ['ro' => 'Companie', 'en' => 'Company'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $searchId = $_GET['id'] ?? null;
            $entityType = $_GET['entity_type'] ?? null;

            if ($searchId) {
                // Get single saved search
                $stmt = $db->prepare("
                    SELECT ss.*, u.first_name, u.last_name
                    FROM saved_searches ss
                    LEFT JOIN users u ON ss.created_by = u.id
                    WHERE ss.id = :id
                    AND (ss.created_by = :user_id OR ss.visibility = 'company'
                         OR (ss.visibility = 'team' AND ss.team_id IN (
                             SELECT team_id FROM company_users WHERE user_id = :user_id2
                         )))
                ");
                $stmt->execute([
                    'id' => $searchId,
                    'user_id' => $user['user_id'],
                    'user_id2' => $user['user_id'],
                ]);
                $search = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$search) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Saved search not found']);
                    exit;
                }

                $search['filters'] = json_decode($search['filters'] ?? '[]', true);
                $search['sort'] = json_decode($search['sort'] ?? '{}', true);
                $search['columns'] = json_decode($search['columns'] ?? '[]', true);
                $search['visibility_label'] = $visibilityOptions[$search['visibility']] ?? null;
                $search['is_owner'] = $search['created_by'] === $user['user_id'];

                echo json_encode([
                    'success' => true,
                    'data' => $search,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                // List saved searches
                $sql = "
                    SELECT ss.*, u.first_name, u.last_name,
                           (ss.created_by = :user_id) as is_owner
                    FROM saved_searches ss
                    LEFT JOIN users u ON ss.created_by = u.id
                    WHERE ss.company_id = :company_id
                    AND (ss.created_by = :user_id2 OR ss.visibility = 'company'
                         OR (ss.visibility = 'team' AND ss.team_id IN (
                             SELECT team_id FROM company_users WHERE user_id = :user_id3
                         )))
                ";
                $params = [
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'user_id2' => $user['user_id'],
                    'user_id3' => $user['user_id'],
                ];

                if ($entityType) {
                    $sql .= " AND ss.entity_type = :entity_type";
                    $params['entity_type'] = $entityType;
                }

                $sql .= " ORDER BY ss.is_default DESC, ss.use_count DESC, ss.name ASC";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $searches = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($searches as &$s) {
                    $s['filters'] = json_decode($s['filters'] ?? '[]', true);
                    $s['filter_count'] = count($s['filters']);
                    $s['visibility_label'] = $visibilityOptions[$s['visibility']] ?? null;
                    $s['creator_name'] = trim(($s['first_name'] ?? '') . ' ' . ($s['last_name'] ?? ''));
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'searches' => $searches,
                        'visibility_options' => $visibilityOptions,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $name = $input['name'] ?? null;
            $entityType = $input['entity_type'] ?? null;

            if (!$name || !$entityType) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Numele și tipul entității sunt obligatorii',
                    'error' => 'Name and entity type are required'
                ]);
                exit;
            }

            $searchId = 'search_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO saved_searches (
                    id, company_id, created_by, name, description, entity_type,
                    filters, sort, columns, visibility, team_id, is_default, created_at
                ) VALUES (
                    :id, :company_id, :created_by, :name, :description, :entity_type,
                    :filters, :sort, :columns, :visibility, :team_id, :is_default, NOW()
                )
            ");
            $stmt->execute([
                'id' => $searchId,
                'company_id' => $companyId,
                'created_by' => $user['user_id'],
                'name' => $name,
                'description' => $input['description'] ?? null,
                'entity_type' => $entityType,
                'filters' => json_encode($input['filters'] ?? []),
                'sort' => json_encode($input['sort'] ?? []),
                'columns' => json_encode($input['columns'] ?? []),
                'visibility' => $input['visibility'] ?? 'private',
                'team_id' => $input['team_id'] ?? null,
                'is_default' => ($input['is_default'] ?? false) ? 1 : 0,
            ]);

            // If this is default, unset other defaults for this entity
            if ($input['is_default'] ?? false) {
                $db->prepare("
                    UPDATE saved_searches SET is_default = FALSE
                    WHERE company_id = :company_id AND entity_type = :entity_type
                    AND created_by = :user_id AND id != :id
                ")->execute([
                    'company_id' => $companyId,
                    'entity_type' => $entityType,
                    'user_id' => $user['user_id'],
                    'id' => $searchId,
                ]);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Căutare salvată',
                'message_en' => 'Search saved',
                'data' => ['id' => $searchId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $searchId = $input['id'] ?? null;

            if (!$searchId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify ownership
            $stmt = $db->prepare("SELECT created_by, entity_type FROM saved_searches WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $searchId, 'company_id' => $companyId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Saved search not found']);
                exit;
            }

            if ($existing['created_by'] !== $user['user_id'] && $user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți modifica această căutare',
                    'error' => 'You cannot modify this search'
                ]);
                exit;
            }

            $updates = [];
            $params = ['id' => $searchId];

            $fields = ['name', 'description', 'visibility', 'team_id', 'is_default'];
            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[$field] = is_bool($input[$field]) ? ($input[$field] ? 1 : 0) : $input[$field];
                }
            }

            if (isset($input['filters'])) {
                $updates[] = "filters = :filters";
                $params['filters'] = json_encode($input['filters']);
            }
            if (isset($input['sort'])) {
                $updates[] = "sort = :sort";
                $params['sort'] = json_encode($input['sort']);
            }
            if (isset($input['columns'])) {
                $updates[] = "columns = :columns";
                $params['columns'] = json_encode($input['columns']);
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE saved_searches SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            // Handle default setting
            if ($input['is_default'] ?? false) {
                $db->prepare("
                    UPDATE saved_searches SET is_default = FALSE
                    WHERE company_id = :company_id AND entity_type = :entity_type
                    AND created_by = :user_id AND id != :id
                ")->execute([
                    'company_id' => $companyId,
                    'entity_type' => $existing['entity_type'],
                    'user_id' => $user['user_id'],
                    'id' => $searchId,
                ]);
            }

            // Increment use count
            $db->prepare("UPDATE saved_searches SET use_count = use_count + 1 WHERE id = :id")
               ->execute(['id' => $searchId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Căutare actualizată',
                'message_en' => 'Search updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $searchId = $_GET['id'] ?? null;

            if (!$searchId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Verify ownership
            $stmt = $db->prepare("SELECT created_by FROM saved_searches WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $searchId, 'company_id' => $companyId]);
            $existing = $stmt->fetch();

            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Saved search not found']);
                exit;
            }

            if ($existing['created_by'] !== $user['user_id'] && $user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nu puteți șterge această căutare',
                    'error' => 'You cannot delete this search'
                ]);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM saved_searches WHERE id = :id");
            $stmt->execute(['id' => $searchId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Căutare ștearsă',
                'message_en' => 'Search deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
