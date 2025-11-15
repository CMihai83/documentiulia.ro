<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

try {
    $db = Database::getInstance();

    // Get all active decision trees
    $sql = "SELECT id, tree_key, tree_name, description, category, icon, priority
            FROM decision_trees
            WHERE is_active = TRUE
            ORDER BY priority DESC, tree_name ASC";

    $trees = $db->fetchAll($sql);

    echo json_encode([
        'success' => true,
        'trees' => $trees,
        'count' => count($trees)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load decision trees',
        'error' => $e->getMessage()
    ]);
}
