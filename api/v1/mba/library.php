<?php
/**
 * MBA Library API Endpoint
 * Access to Personal MBA 99 books collection
 *
 * GET /api/v1/mba/library - Get all books
 * GET /api/v1/mba/library?category=Finance - Filter by category
 * GET /api/v1/mba/library?search=marketing - Search books
 * GET /api/v1/mba/library/categories - Get all categories
 * GET /api/v1/mba/library/{book_id} - Get specific book
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/MBAKnowledgeService.php';

try {
    $mbaService = new MBAKnowledgeService();

    // Parse URL path
    $path = $_SERVER['PATH_INFO'] ?? '';
    $segments = array_filter(explode('/', $path));

    // Get specific book by ID
    if (count($segments) > 0 && is_numeric($segments[0])) {
        $bookId = (int)$segments[0];

        $db = Database::getInstance();
        $sql = "SELECT * FROM mba_books WHERE id = :id";
        $book = $db->fetchOne($sql, ['id' => $bookId]);

        if (!$book) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Book not found']);
            exit();
        }

        echo json_encode([
            'success' => true,
            'book' => $book
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Get categories list
    if (isset($_GET['action']) && $_GET['action'] === 'categories') {
        $result = $mbaService->getBooksByCategory();
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Search books
    if (isset($_GET['search'])) {
        $result = $mbaService->searchBooks($_GET['search']);
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit();
    }

    // Get all books (with optional category filter)
    $category = $_GET['category'] ?? null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;

    $result = $mbaService->getAllBooks($category, $limit);
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
