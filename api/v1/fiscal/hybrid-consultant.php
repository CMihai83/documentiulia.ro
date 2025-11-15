<?php
/**
 * Hybrid Fiscal Consultant Endpoint
 * Intelligently routes between Decision Trees and AI responses
 *
 * POST /api/v1/fiscal/hybrid-consultant
 *
 * Request body:
 * {
 *   "question": "User's question",
 *   "user_id": "uuid (optional)",
 *   "company_id": "uuid (optional)",
 *   "session_id": "string (optional - for continuing tree navigation)",
 *   "node_id": int (optional - current node in tree navigation),
 *   "path_id": int (optional - selected path/answer)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "method": "decision_tree|ai|queued",
 *   "confidence": 0.85,
 *   "tree": {...},           // If method = decision_tree
 *   "answer": "...",         // If method = ai
 *   "queue_id": 123,         // If method = queued
 *   "message": "..."
 * }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/QuestionRouterService.php';

try {
    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['question']) && empty($input['node_id']) && empty($input['tree_id'])) {
        throw new Exception('Either question, tree_id, or node_id is required');
    }

    $router = new QuestionRouterService();

    // Determine if this is tree navigation or new question
    if (!empty($input['tree_id']) && empty($input['node_id'])) {
        // Direct tree request - load tree root
        require_once __DIR__ . '/../../services/DecisionTreeService.php';
        $treeService = new DecisionTreeService();
        $rootNode = $treeService->getTreeRoot($input['tree_id']);

        if ($rootNode['success']) {
            // Get tree info
            $db = Database::getInstance();
            $treeInfo = $db->fetchOne(
                "SELECT id, tree_key, tree_name, description, category FROM decision_trees WHERE id = :id",
                ['id' => $input['tree_id']]
            );

            $result = [
                'success' => true,
                'method' => 'decision_tree',
                'confidence' => 1.0,
                'tree' => [
                    'id' => (int)$treeInfo['id'],
                    'name' => $treeInfo['tree_name'],
                    'description' => $treeInfo['description'],
                    'category' => $treeInfo['category']
                ],
                'current_node' => $rootNode['node'],
                'session_id' => $input['session_id'] ?? 'session_' . time()
            ];
        } else {
            $result = ['success' => false, 'message' => 'Tree not found'];
        }
    } elseif (!empty($input['node_id']) && empty($input['path_id'])) {
        // Get specific node by ID (for frontend navigation)
        require_once __DIR__ . '/../../services/DecisionTreeService.php';
        $treeService = new DecisionTreeService();
        $nodeResult = $treeService->getNode($input['node_id']);

        if ($nodeResult['success']) {
            $result = [
                'success' => true,
                'method' => 'decision_tree',
                'is_terminal' => false,
                'node' => $nodeResult['node'],
                'session_id' => $input['session_id'] ?? 'session_' . time()
            ];
        } else {
            $result = ['success' => false, 'message' => 'Node not found'];
        }
    } elseif (!empty($input['node_id']) && !empty($input['path_id'])) {
        // Continue tree navigation
        $result = $router->continueTreeNavigation(
            $input['node_id'],
            $input['path_id'],
            $input['session_id'] ?? null,
            $input['user_id'] ?? null
        );
    } elseif (!empty($input['switch_to_ai'])) {
        // User requested to switch from tree to AI
        $result = $router->switchToAI(
            $input['session_id'],
            $input['question'],
            $input['user_id'] ?? null,
            $input['company_id'] ?? null
        );
    } else {
        // New question - route to best method
        $result = $router->route(
            $input['question'],
            $input['user_id'] ?? null,
            $input['company_id'] ?? null,
            $input['session_id'] ?? null
        );
    }

    // Return result
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
