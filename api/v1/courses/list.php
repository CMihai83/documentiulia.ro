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

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    $auth = authenticate();
    $db = Database::getInstance()->getConnection();

    // Get query parameters
    $category = $_GET['category'] ?? null;
    $difficulty = $_GET['difficulty'] ?? null;
    $is_published = isset($_GET['is_published']) ? filter_var($_GET['is_published'], FILTER_VALIDATE_BOOLEAN) : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    // Build query with PDO
    $where_clauses = [];
    $params = [];

    if ($category) {
        $where_clauses[] = 'category = :category';
        $params['category'] = $category;
    }

    if ($difficulty) {
        $where_clauses[] = 'difficulty = :difficulty';
        $params['difficulty'] = $difficulty;
    }

    if ($is_published !== null) {
        $where_clauses[] = 'is_published = :is_published';
        $params['is_published'] = $is_published;
    }

    $where_sql = count($where_clauses) > 0 ? 'WHERE ' . implode(' AND ', $where_clauses) : '';

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
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $courses = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Decode JSONB fields
        if (isset($row['learning_objectives'])) {
            $row['learning_objectives'] = json_decode($row['learning_objectives'], true) ?? [];
        }
        if (isset($row['prerequisites'])) {
            $row['prerequisites'] = json_decode($row['prerequisites'], true) ?? [];
        }

        // Convert types
        $row['price_ron'] = (float)$row['price_ron'];
        $row['duration_hours'] = (int)$row['duration_hours'];
        $row['enrollment_count'] = (int)$row['enrollment_count'];
        $row['average_rating'] = (float)$row['average_rating'];
        $row['certification_available'] = (bool)$row['certification_available'];
        $row['is_published'] = (bool)$row['is_published'];

        $courses[] = $row;
    }

    // Get total count
    $count_query = "SELECT COUNT(*) as total FROM courses $where_sql";
    $count_stmt = $db->prepare($count_query);
    foreach ($params as $key => $value) {
        $count_stmt->bindValue(':' . $key, $value);
    }
    $count_stmt->execute();
    $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

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
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
