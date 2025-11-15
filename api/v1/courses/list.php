<?php
/**
 * API Endpoint: List All Courses
 * GET /api/v1/courses/list.php
 *
 * Query Parameters:
 *   - category: Filter by category (excel, finance, business, legal, hr)
 *   - difficulty: Filter by difficulty (beginner, intermediate, advanced)
 *   - is_published: Filter by published status (true/false)
 *   - limit: Number of results (default: 20)
 *   - offset: Pagination offset (default: 0)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../../includes/Database.php';

try {
    $db = Database::getInstance()->getConnection();

    // Get query parameters
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    $difficulty = isset($_GET['difficulty']) ? $_GET['difficulty'] : null;
    $is_published = isset($_GET['is_published']) ? filter_var($_GET['is_published'], FILTER_VALIDATE_BOOLEAN) : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    // Build query
    $where_clauses = [];
    $params = [];

    if ($category) {
        $where_clauses[] = 'category = $' . (count($params) + 1);
        $params[] = $category;
    }

    if ($difficulty) {
        $where_clauses[] = 'difficulty = $' . (count($params) + 1);
        $params[] = $difficulty;
    }

    if ($is_published !== null) {
        $where_clauses[] = 'is_published = $' . (count($params) + 1);
        $params[] = $is_published ? 't' : 'f';
    }

    $where_sql = count($where_clauses) > 0 ? 'WHERE ' . implode(' AND ', $where_clauses) : '';

    $params[] = $limit;
    $params[] = $offset;

    $query = "
        SELECT
            id,
            course_key,
            name,
            description,
            category,
            difficulty,
            price_ron,
            duration_hours,
            instructor_name,
            thumbnail_url,
            promo_video_url,
            learning_objectives,
            prerequisites,
            target_audience,
            certification_available,
            is_published,
            enrollment_count,
            average_rating,
            created_at,
            published_at
        FROM courses
        $where_sql
        ORDER BY created_at DESC
        LIMIT $" . count($params) . " OFFSET $" . (count($params) + 1) . "
    ";

    $stmt = pg_prepare($db, "get_courses", $query);
    $result = pg_execute($db, "get_courses", array_values($params));

    if (!$result) {
        throw new Exception('Database query failed: ' . pg_last_error($db));
    }

    $courses = [];
    while ($row = pg_fetch_assoc($result)) {
        // Decode JSONB fields
        $row['learning_objectives'] = json_decode($row['learning_objectives'] ?? '[]');
        $row['prerequisites'] = json_decode($row['prerequisites'] ?? '[]');

        // Convert types
        $row['price_ron'] = (float)$row['price_ron'];
        $row['duration_hours'] = (int)$row['duration_hours'];
        $row['enrollment_count'] = (int)$row['enrollment_count'];
        $row['average_rating'] = (float)$row['average_rating'];
        $row['certification_available'] = $row['certification_available'] === 't';
        $row['is_published'] = $row['is_published'] === 't';

        $courses[] = $row;
    }

    // Get total count
    $count_query = "SELECT COUNT(*) as total FROM courses $where_sql";
    $count_stmt = pg_prepare($db, "count_courses", $count_query);
    $count_params = array_slice($params, 0, -2); // Remove limit and offset
    $count_result = pg_execute($db, "count_courses", $count_params);
    $total = pg_fetch_assoc($count_result)['total'];

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $courses,
        'pagination' => [
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < (int)$total
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
