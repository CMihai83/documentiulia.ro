<?php
/**
 * Simple Decision Tree Navigator API
 * Direct access to decision tree navigation without routing complexity
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

$db = Database::getInstance();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get tree root or specific node
        $treeId = $_GET['tree_id'] ?? 1;
        $nodeId = $_GET['node_id'] ?? null;

        if ($nodeId) {
            // Get specific node
            $sql = "SELECT
                        n.id,
                        n.question,
                        n.question_type,
                        n.help_text,
                        n.is_terminal,
                        json_agg(
                            json_build_object(
                                'id', p.id,
                                'answer_option', p.answer_option,
                                'answer_text', p.answer_text,
                                'next_node_id', p.next_node_id,
                                'is_terminal', (p.next_node_id IS NULL)
                            ) ORDER BY p.display_order
                        ) as paths
                    FROM decision_nodes n
                    LEFT JOIN decision_paths p ON p.node_id = n.id
                    WHERE n.id = :node_id
                    GROUP BY n.id";

            $node = $db->fetchOne($sql, ['node_id' => $nodeId]);

            if ($node) {
                $node['paths'] = json_decode($node['paths'], true);
                echo json_encode([
                    'success' => true,
                    'node' => $node
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Node not found']);
            }
        } else {
            // Get tree root
            $sql = "SELECT
                        n.id,
                        n.question,
                        n.question_type,
                        n.help_text,
                        n.is_terminal,
                        json_agg(
                            json_build_object(
                                'id', p.id,
                                'answer_option', p.answer_option,
                                'answer_text', p.answer_text,
                                'next_node_id', p.next_node_id,
                                'is_terminal', (p.next_node_id IS NULL)
                            ) ORDER BY p.display_order
                        ) as paths
                    FROM decision_nodes n
                    LEFT JOIN decision_paths p ON p.node_id = n.id
                    WHERE n.tree_id = :tree_id AND n.parent_node_id IS NULL
                    GROUP BY n.id";

            $rootNode = $db->fetchOne($sql, ['tree_id' => $treeId]);

            if ($rootNode) {
                $rootNode['paths'] = json_decode($rootNode['paths'], true);
                echo json_encode([
                    'success' => true,
                    'method' => 'decision_tree',
                    'tree' => [
                        'id' => (int)$treeId,
                        'name' => 'Înregistrare TVA',
                        'description' => 'Ghid complet pentru înregistrarea ca plătitor de TVA'
                    ],
                    'current_node' => $rootNode,
                    'session_id' => 'session_' . time()
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Tree root not found']);
            }
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Navigate through tree or get final answer
        $input = json_decode(file_get_contents('php://input'), true);

        $pathId = $input['path_id'] ?? null;

        if (!$pathId) {
            throw new Exception('path_id required');
        }

        // Get the path details
        $sql = "SELECT p.*, da.answer_template, da.legislation_articles,
                       da.strategic_advice, da.warnings, da.next_steps
                FROM decision_paths p
                LEFT JOIN decision_answers da ON da.path_id = p.id
                WHERE p.id = :path_id";

        $path = $db->fetchOne($sql, ['path_id' => $pathId]);

        if (!$path) {
            throw new Exception('Path not found');
        }

        // If path leads to another node, return that node
        if ($path['next_node_id']) {
            $sql = "SELECT
                        n.id,
                        n.question,
                        n.question_type,
                        n.help_text,
                        n.is_terminal,
                        json_agg(
                            json_build_object(
                                'id', p.id,
                                'answer_option', p.answer_option,
                                'answer_text', p.answer_text,
                                'next_node_id', p.next_node_id,
                                'is_terminal', (p.next_node_id IS NULL)
                            ) ORDER BY p.display_order
                        ) as paths
                    FROM decision_nodes n
                    LEFT JOIN decision_paths p ON p.node_id = n.id
                    WHERE n.id = :node_id
                    GROUP BY n.id";

            $nextNode = $db->fetchOne($sql, ['node_id' => $path['next_node_id']]);
            $nextNode['paths'] = json_decode($nextNode['paths'], true);

            echo json_encode([
                'success' => true,
                'is_terminal' => false,
                'node' => $nextNode
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } else {
            // Terminal path - return final answer
            $answer = [
                'answer_template' => $path['answer_template'],
                'legislation_articles' => json_decode($path['legislation_articles'] ?? '[]', true),
                'strategic_advice' => $path['strategic_advice'],
                'warnings' => $path['warnings'],
                'next_steps' => json_decode($path['next_steps'] ?? '[]', true)
            ];

            echo json_encode([
                'success' => true,
                'is_terminal' => true,
                'answer' => $answer
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
