<?php
/**
 * Course Enrollments API Endpoint
 *
 * GET /api/v1/courses/enrollments.php
 *
 * Returns list of course enrollments for the company (admin view)
 * or for the authenticated user if no company context
 *
 * Query params:
 * - course_id: Filter by specific course
 * - status: Filter by enrollment status (active, completed, expired)
 * - limit: Number of results (default 50)
 *
 * @category API
 * @package  DocumentIulia
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Use GET.'
    ]);
    exit();
}

// Authenticate request - returns user data or exits with 401 on failure
$auth = authenticate();
$userId = $auth['user_id'];
$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

// Get query parameters
$courseId = $_GET['course_id'] ?? null;
$status = $_GET['status'] ?? null;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;

try {
    $db = Database::getInstance()->getConnection();

    // Build query - if company context, get all company enrollments; otherwise user enrollments
    $conditions = [];
    $params = [];

    if ($companyId) {
        // Admin/company view - get all enrollments for courses owned by company
        $query = "SELECT
            uce.id,
            uce.user_id,
            uce.course_id,
            uce.enrolled_at,
            uce.status,
            uce.expires_at,
            uce.completed_at as completion_date,
            c.name as course_name,
            c.thumbnail_url,
            c.instructor_name,
            c.category,
            u.first_name || ' ' || u.last_name as user_name,
            u.email as user_email,
            COALESCE(uce.progress_percentage, 0) as completion_percentage,
            uce.last_accessed_at
        FROM user_course_enrollments uce
        JOIN courses c ON uce.course_id = c.id
        JOIN users u ON uce.user_id = u.id
        WHERE c.company_id = :company_id";
        $params[':company_id'] = $companyId;
    } else {
        // User view - get current user's enrollments only
        $query = "SELECT
            uce.id,
            uce.user_id,
            uce.course_id,
            uce.enrolled_at,
            uce.status,
            uce.expires_at,
            uce.completed_at as completion_date,
            c.name as course_name,
            c.thumbnail_url,
            c.instructor_name,
            c.category,
            COALESCE(uce.progress_percentage, 0) as completion_percentage,
            uce.last_accessed_at
        FROM user_course_enrollments uce
        JOIN courses c ON uce.course_id = c.id
        WHERE uce.user_id = :user_id";
        $params[':user_id'] = $userId;
    }

    // Apply filters
    if ($courseId) {
        $query .= " AND uce.course_id = :course_id";
        $params[':course_id'] = $courseId;
    }

    if ($status) {
        $query .= " AND uce.status = :status";
        $params[':status'] = $status;
    }

    $query .= " ORDER BY uce.enrolled_at DESC LIMIT :limit";

    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get summary statistics
    $statsQuery = $companyId
        ? "SELECT
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN uce.status = 'active' THEN 1 END) as active_count,
            COUNT(CASE WHEN uce.status = 'completed' THEN 1 END) as completed_count,
            AVG(COALESCE(uce.progress_percentage, 0)) as avg_completion
           FROM user_course_enrollments uce
           JOIN courses c ON uce.course_id = c.id
           WHERE c.company_id = :company_id"
        : "SELECT
            COUNT(*) as total_enrollments,
            COUNT(CASE WHEN uce.status = 'active' THEN 1 END) as active_count,
            COUNT(CASE WHEN uce.status = 'completed' THEN 1 END) as completed_count,
            AVG(COALESCE(uce.progress_percentage, 0)) as avg_completion
           FROM user_course_enrollments uce
           WHERE uce.user_id = :user_id";

    $statsStmt = $db->prepare($statsQuery);
    if ($companyId) {
        $statsStmt->bindValue(':company_id', $companyId);
    } else {
        $statsStmt->bindValue(':user_id', $userId);
    }
    $statsStmt->execute();
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $enrollments,
        'stats' => [
            'total' => (int)$stats['total_enrollments'],
            'active' => (int)$stats['active_count'],
            'completed' => (int)$stats['completed_count'],
            'avg_completion' => round((float)$stats['avg_completion'], 1)
        ],
        'count' => count($enrollments)
    ]);

} catch (PDOException $e) {
    error_log("Enrollments API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve enrollments'
    ]);
}
