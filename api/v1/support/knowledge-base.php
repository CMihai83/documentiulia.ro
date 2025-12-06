<?php
/**
 * Knowledge Base API
 * Manage help articles and documentation
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
$method = $_SERVER['REQUEST_METHOD'];

// Article categories
$articleCategories = [
    'getting_started' => ['ro' => 'Primii pași', 'en' => 'Getting Started', 'icon' => 'rocket_launch', 'order' => 1],
    'invoicing' => ['ro' => 'Facturare', 'en' => 'Invoicing', 'icon' => 'receipt', 'order' => 2],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses', 'icon' => 'payments', 'order' => 3],
    'inventory' => ['ro' => 'Inventar', 'en' => 'Inventory', 'icon' => 'inventory', 'order' => 4],
    'contacts' => ['ro' => 'Contacte', 'en' => 'Contacts', 'icon' => 'contacts', 'order' => 5],
    'projects' => ['ro' => 'Proiecte', 'en' => 'Projects', 'icon' => 'folder', 'order' => 6],
    'reports' => ['ro' => 'Rapoarte', 'en' => 'Reports', 'icon' => 'analytics', 'order' => 7],
    'accounting' => ['ro' => 'Contabilitate', 'en' => 'Accounting', 'icon' => 'account_balance', 'order' => 8],
    'efactura' => ['ro' => 'e-Factura', 'en' => 'e-Invoice', 'icon' => 'verified', 'order' => 9],
    'integrations' => ['ro' => 'Integrări', 'en' => 'Integrations', 'icon' => 'extension', 'order' => 10],
    'settings' => ['ro' => 'Setări', 'en' => 'Settings', 'icon' => 'settings', 'order' => 11],
    'troubleshooting' => ['ro' => 'Depanare', 'en' => 'Troubleshooting', 'icon' => 'build', 'order' => 12],
];

// Article types
$articleTypes = [
    'guide' => ['ro' => 'Ghid', 'en' => 'Guide'],
    'tutorial' => ['ro' => 'Tutorial', 'en' => 'Tutorial'],
    'faq' => ['ro' => 'Întrebări frecvente', 'en' => 'FAQ'],
    'reference' => ['ro' => 'Referință', 'en' => 'Reference'],
    'video' => ['ro' => 'Video', 'en' => 'Video'],
    'release_notes' => ['ro' => 'Note de lansare', 'en' => 'Release Notes'],
];

// Article statuses
$articleStatuses = [
    'draft' => ['ro' => 'Ciornă', 'en' => 'Draft', 'color' => '#9E9E9E'],
    'published' => ['ro' => 'Publicat', 'en' => 'Published', 'color' => '#4CAF50'],
    'archived' => ['ro' => 'Arhivat', 'en' => 'Archived', 'color' => '#FF9800'],
];

// Difficulty levels
$difficultyLevels = [
    'beginner' => ['ro' => 'Începător', 'en' => 'Beginner', 'color' => '#4CAF50'],
    'intermediate' => ['ro' => 'Intermediar', 'en' => 'Intermediate', 'color' => '#FF9800'],
    'advanced' => ['ro' => 'Avansat', 'en' => 'Advanced', 'color' => '#F44336'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $category = $_GET['category'] ?? null;
                $type = $_GET['type'] ?? null;
                $search = $_GET['search'] ?? null;
                $status = $_GET['status'] ?? 'published';
                $limit = intval($_GET['limit'] ?? 20);
                $offset = intval($_GET['offset'] ?? 0);

                $sql = "
                    SELECT id, title_ro, title_en, slug, category, article_type, difficulty,
                           excerpt_ro, excerpt_en, status, view_count, helpful_count, created_at, updated_at
                    FROM knowledge_base
                    WHERE status = :status
                ";
                $params = ['status' => $status];

                if ($category) {
                    $sql .= " AND category = :category";
                    $params['category'] = $category;
                }
                if ($type) {
                    $sql .= " AND article_type = :type";
                    $params['type'] = $type;
                }
                if ($search) {
                    $sql .= " AND (title_ro ILIKE :search OR title_en ILIKE :search OR content_ro ILIKE :search OR content_en ILIKE :search)";
                    $params['search'] = "%$search%";
                }

                $sql .= " ORDER BY view_count DESC, created_at DESC LIMIT $limit OFFSET $offset";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($articles as &$article) {
                    $article['category_config'] = $articleCategories[$article['category']] ?? null;
                    $article['type_config'] = $articleTypes[$article['article_type']] ?? null;
                    $article['difficulty_config'] = $difficultyLevels[$article['difficulty']] ?? null;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'articles' => $articles,
                        'limit' => $limit,
                        'offset' => $offset,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'get') {
                $id = $_GET['id'] ?? null;
                $slug = $_GET['slug'] ?? null;

                if (!$id && !$slug) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'ID or slug required']);
                    exit;
                }

                if ($id) {
                    $stmt = $db->prepare("SELECT * FROM knowledge_base WHERE id = :id");
                    $stmt->execute(['id' => $id]);
                } else {
                    $stmt = $db->prepare("SELECT * FROM knowledge_base WHERE slug = :slug AND status = 'published'");
                    $stmt->execute(['slug' => $slug]);
                }
                $article = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$article) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Articolul nu a fost găsit',
                        'error' => 'Article not found'
                    ]);
                    exit;
                }

                // Increment view count
                $stmt = $db->prepare("UPDATE knowledge_base SET view_count = view_count + 1 WHERE id = :id");
                $stmt->execute(['id' => $article['id']]);

                $article['category_config'] = $articleCategories[$article['category']] ?? null;
                $article['type_config'] = $articleTypes[$article['article_type']] ?? null;
                $article['difficulty_config'] = $difficultyLevels[$article['difficulty']] ?? null;
                $article['tags'] = json_decode($article['tags'] ?? '[]', true);
                $article['related_articles'] = json_decode($article['related_articles'] ?? '[]', true);

                echo json_encode([
                    'success' => true,
                    'data' => $article,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'categories') {
                // Get categories with article counts
                $stmt = $db->prepare("
                    SELECT category, COUNT(*) as count
                    FROM knowledge_base WHERE status = 'published'
                    GROUP BY category
                ");
                $stmt->execute();
                $counts = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

                $categoriesWithCounts = [];
                foreach ($articleCategories as $key => $cat) {
                    $categoriesWithCounts[$key] = array_merge($cat, ['count' => $counts[$key] ?? 0]);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'categories' => $categoriesWithCounts,
                        'types' => $articleTypes,
                        'difficulties' => $difficultyLevels,
                        'statuses' => $articleStatuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'popular') {
                // Get most viewed articles
                $limit = intval($_GET['limit'] ?? 10);

                $stmt = $db->prepare("
                    SELECT id, title_ro, title_en, slug, category, view_count
                    FROM knowledge_base WHERE status = 'published'
                    ORDER BY view_count DESC LIMIT $limit
                ");
                $stmt->execute();
                $popular = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => $popular,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'search') {
                $query = $_GET['q'] ?? '';
                $limit = intval($_GET['limit'] ?? 10);

                if (strlen($query) < 2) {
                    echo json_encode(['success' => true, 'data' => []]);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT id, title_ro, title_en, slug, category, excerpt_ro, excerpt_en
                    FROM knowledge_base
                    WHERE status = 'published'
                    AND (title_ro ILIKE :q OR title_en ILIKE :q OR content_ro ILIKE :q OR content_en ILIKE :q OR tags::text ILIKE :q)
                    ORDER BY 
                        CASE WHEN title_ro ILIKE :exact OR title_en ILIKE :exact THEN 1 ELSE 2 END,
                        view_count DESC
                    LIMIT $limit
                ");
                $stmt->execute(['q' => "%$query%", 'exact' => "$query%"]);
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($results as &$result) {
                    $result['category_config'] = $articleCategories[$result['category']] ?? null;
                }

                echo json_encode([
                    'success' => true,
                    'data' => $results,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            // Admin only for creating articles
            if (!in_array($user['role'], ['admin'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Admin access required']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'create';

            if ($action === 'create') {
                $titleRo = $input['title_ro'] ?? null;
                $titleEn = $input['title_en'] ?? null;
                $category = $input['category'] ?? 'getting_started';

                if (!$titleRo) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Title is required']);
                    exit;
                }

                $slug = createSlug($titleEn ?: $titleRo);
                $articleId = 'kb_' . bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO knowledge_base (
                        id, title_ro, title_en, slug, category, article_type, difficulty,
                        content_ro, content_en, excerpt_ro, excerpt_en, tags, status, created_at
                    ) VALUES (
                        :id, :title_ro, :title_en, :slug, :category, :type, :difficulty,
                        :content_ro, :content_en, :excerpt_ro, :excerpt_en, :tags, :status, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $articleId,
                    'title_ro' => $titleRo,
                    'title_en' => $titleEn,
                    'slug' => $slug,
                    'category' => $category,
                    'type' => $input['article_type'] ?? 'guide',
                    'difficulty' => $input['difficulty'] ?? 'beginner',
                    'content_ro' => $input['content_ro'] ?? '',
                    'content_en' => $input['content_en'] ?? '',
                    'excerpt_ro' => $input['excerpt_ro'] ?? '',
                    'excerpt_en' => $input['excerpt_en'] ?? '',
                    'tags' => json_encode($input['tags'] ?? []),
                    'status' => $input['status'] ?? 'draft',
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Articolul a fost creat',
                    'message_en' => 'Article created',
                    'data' => ['id' => $articleId, 'slug' => $slug],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'helpful') {
                // Mark article as helpful
                $articleId = $input['article_id'] ?? null;
                $helpful = $input['helpful'] ?? true;

                if (!$articleId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Article ID required']);
                    exit;
                }

                if ($helpful) {
                    $stmt = $db->prepare("UPDATE knowledge_base SET helpful_count = helpful_count + 1 WHERE id = :id");
                } else {
                    $stmt = $db->prepare("UPDATE knowledge_base SET not_helpful_count = COALESCE(not_helpful_count, 0) + 1 WHERE id = :id");
                }
                $stmt->execute(['id' => $articleId]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Mulțumim pentru feedback!',
                    'message_en' => 'Thank you for your feedback!',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            if (!in_array($user['role'], ['admin'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Admin access required']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $articleId = $input['id'] ?? null;

            if (!$articleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Article ID required']);
                exit;
            }

            $updateFields = [];
            $params = ['id' => $articleId];

            $allowedFields = ['title_ro', 'title_en', 'category', 'article_type', 'difficulty', 
                             'content_ro', 'content_en', 'excerpt_ro', 'excerpt_en', 'status'];

            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateFields[] = "$field = :$field";
                    $params[$field] = $input[$field];
                }
            }

            if (isset($input['tags'])) {
                $updateFields[] = "tags = :tags";
                $params['tags'] = json_encode($input['tags']);
            }

            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE knowledge_base SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Articolul a fost actualizat',
                'message_en' => 'Article updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            if (!in_array($user['role'], ['admin'])) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Admin access required']);
                exit;
            }

            $articleId = $_GET['id'] ?? null;

            if (!$articleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Article ID required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM knowledge_base WHERE id = :id");
            $stmt->execute(['id' => $articleId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Articolul a fost șters',
                'message_en' => 'Article deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function createSlug($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    return $text ?: 'article';
}
