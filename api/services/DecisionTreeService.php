<?php
/**
 * Decision Tree Navigation Service
 * Interactive question flow system for fiscal/legal consultation
 *
 * Features:
 * - Tree-based question navigation
 * - Dynamic path calculation
 * - Legislation reference integration
 * - User progress tracking
 * - Analytics collection
 */

require_once __DIR__ . '/../config/database.php';

class DecisionTreeService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get all available decision trees
     */
    public function getAllTrees() {
        try {
            $sql = "SELECT id, tree_key, tree_name, description, category, icon, priority
                    FROM decision_trees
                    WHERE is_active = TRUE
                    ORDER BY priority DESC, tree_name ASC";

            $trees = $this->db->fetchAll($sql);

            return [
                'success' => true,
                'trees' => $trees
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load trees: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get tree by key or ID
     */
    public function getTree($identifier) {
        try {
            $isId = is_numeric($identifier);

            $sql = "SELECT id, tree_key, tree_name, description, category, icon
                    FROM decision_trees
                    WHERE " . ($isId ? "id" : "tree_key") . " = :identifier
                    AND is_active = TRUE";

            $tree = $this->db->fetchOne($sql, ['identifier' => $identifier]);

            if (!$tree) {
                return [
                    'success' => false,
                    'message' => 'Tree not found'
                ];
            }

            return [
                'success' => true,
                'tree' => $tree
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load tree: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get root node for a tree
     */
    public function getTreeRoot($treeId) {
        try {
            $sql = "SELECT id, node_key, question, question_type, help_text, examples, is_terminal
                    FROM decision_nodes
                    WHERE tree_id = :tree_id
                    AND parent_node_id IS NULL
                    LIMIT 1";

            $rootNode = $this->db->fetchOne($sql, ['tree_id' => $treeId]);

            if (!$rootNode) {
                return [
                    'success' => false,
                    'message' => 'Root node not found for this tree'
                ];
            }

            // Get available paths/answers for this node
            $paths = $this->getNodePaths($rootNode['id']);

            $rootNode['examples'] = json_decode($rootNode['examples'], true);
            $rootNode['paths'] = $paths;

            return [
                'success' => true,
                'node' => $rootNode
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load root node: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get node by ID
     */
    public function getNode($nodeId) {
        try {
            $sql = "SELECT id, tree_id, node_key, question, question_type, help_text, examples, is_terminal
                    FROM decision_nodes
                    WHERE id = :node_id";

            $node = $this->db->fetchOne($sql, ['node_id' => $nodeId]);

            if (!$node) {
                return [
                    'success' => false,
                    'message' => 'Node not found'
                ];
            }

            // Get available paths
            $paths = $this->getNodePaths($nodeId);

            $node['examples'] = json_decode($node['examples'], true);
            $node['paths'] = $paths;

            return [
                'success' => true,
                'node' => $node
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load node: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get available paths (answers) for a node
     */
    private function getNodePaths($nodeId) {
        try {
            $sql = "SELECT
                        dp.id,
                        dp.path_key,
                        dp.answer_option,
                        dp.next_node_id,
                        dp.legislation_refs,
                        dp.answer_text,
                        dp.conditions,
                        dn.question as next_question
                    FROM decision_paths dp
                    LEFT JOIN decision_nodes dn ON dp.next_node_id = dn.id
                    WHERE dp.node_id = :node_id
                    ORDER BY dp.display_order ASC";

            $paths = $this->db->fetchAll($sql, ['node_id' => $nodeId]);

            // Decode JSON fields
            foreach ($paths as &$path) {
                $path['legislation_refs'] = json_decode($path['legislation_refs'], true);
                $path['conditions'] = json_decode($path['conditions'], true);
                $path['is_terminal'] = ($path['next_node_id'] === null);
            }

            return $paths;
        } catch (Exception $e) {
            error_log("Failed to load node paths: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Navigate to next node based on user's answer
     */
    public function navigate($nodeId, $pathId) {
        try {
            // Get the selected path
            $sql = "SELECT next_node_id, legislation_refs, answer_text
                    FROM decision_paths
                    WHERE id = :path_id AND node_id = :node_id";

            $path = $this->db->fetchOne($sql, [
                'path_id' => $pathId,
                'node_id' => $nodeId
            ]);

            if (!$path) {
                return [
                    'success' => false,
                    'message' => 'Invalid path selection'
                ];
            }

            // If terminal node (no next_node_id), return final answer
            if ($path['next_node_id'] === null) {
                return $this->getFinalAnswer($pathId);
            }

            // Otherwise, return next node
            return $this->getNode($path['next_node_id']);

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Navigation failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get final answer with legislation references
     */
    private function getFinalAnswer($pathId) {
        try {
            $sql = "SELECT
                        da.answer_template,
                        da.legislation_articles,
                        da.strategic_advice,
                        da.related_obligations,
                        da.examples,
                        da.warnings,
                        da.next_steps,
                        dp.answer_text
                    FROM decision_answers da
                    JOIN decision_paths dp ON da.path_id = dp.id
                    WHERE da.path_id = :path_id";

            $answer = $this->db->fetchOne($sql, ['path_id' => $pathId]);

            if (!$answer) {
                // Fallback to path answer_text
                $sql = "SELECT answer_text, legislation_refs
                        FROM decision_paths
                        WHERE id = :path_id";

                $fallback = $this->db->fetchOne($sql, ['path_id' => $pathId]);

                return [
                    'success' => true,
                    'is_terminal' => true,
                    'answer' => $fallback['answer_text'] ?? 'Answer not available',
                    'legislation_refs' => json_decode($fallback['legislation_refs'], true) ?? []
                ];
            }

            // Decode JSON fields
            $answer['legislation_articles'] = json_decode($answer['legislation_articles'], true);
            $answer['related_obligations'] = json_decode($answer['related_obligations'], true);
            $answer['examples'] = json_decode($answer['examples'], true);
            $answer['next_steps'] = json_decode($answer['next_steps'], true);

            // Fetch full legislation details if references exist
            if (!empty($answer['legislation_articles'])) {
                $answer['legislation_details'] = $this->getLegislationDetails($answer['legislation_articles']);
            }

            return [
                'success' => true,
                'is_terminal' => true,
                'answer' => $answer
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load answer: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Fetch legislation details by IDs
     */
    private function getLegislationDetails($articleIds) {
        try {
            if (empty($articleIds)) {
                return [];
            }

            $placeholders = implode(',', array_fill(0, count($articleIds), '?'));

            $sql = "SELECT id, code, title, category, summary, full_text, source_url
                    FROM fiscal_legislation
                    WHERE id IN ($placeholders)
                    AND is_active = TRUE";

            return $this->db->fetchAll($sql, $articleIds);
        } catch (Exception $e) {
            error_log("Failed to fetch legislation details: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Track user navigation through tree (analytics)
     */
    public function trackNavigation($userId, $treeId, $sessionId, $pathTaken) {
        try {
            $sql = "INSERT INTO decision_tree_analytics
                    (user_id, tree_id, session_id, path_taken, time_spent_seconds, completed)
                    VALUES (:user_id, :tree_id, :session_id, :path_taken, :time_spent, :completed)";

            $this->db->execute($sql, [
                'user_id' => $userId,
                'tree_id' => $treeId,
                'session_id' => $sessionId,
                'path_taken' => json_encode($pathTaken),
                'time_spent' => $pathTaken['duration'] ?? 0,
                'completed' => $pathTaken['completed'] ?? false
            ]);

            return ['success' => true];
        } catch (Exception $e) {
            error_log("Failed to track navigation: " . $e->getMessage());
            return ['success' => false];
        }
    }

    /**
     * Rate answer helpfulness
     */
    public function rateAnswer($sessionId, $rating, $feedback = null) {
        try {
            $sql = "UPDATE decision_tree_analytics
                    SET final_answer_helpful = :helpful,
                        user_rating = :rating
                    WHERE session_id = :session_id";

            $this->db->execute($sql, [
                'helpful' => ($rating >= 4),
                'rating' => $rating,
                'session_id' => $sessionId
            ]);

            return ['success' => true];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to save rating: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Search for matching tree based on question text
     */
    public function findMatchingTree($questionText) {
        try {
            $sql = "SELECT
                        dt.id,
                        dt.tree_key,
                        dt.tree_name,
                        dt.description,
                        dt.category,
                        ts_rank(
                            to_tsvector('romanian', dt.tree_name || ' ' || dt.description),
                            plainto_tsquery('romanian', :question)
                        ) as relevance_score
                    FROM decision_trees dt
                    WHERE is_active = TRUE
                    AND to_tsvector('romanian', dt.tree_name || ' ' || dt.description) @@ plainto_tsquery('romanian', :question)
                    ORDER BY relevance_score DESC
                    LIMIT 3";

            $matches = $this->db->fetchAll($sql, ['question' => $questionText]);

            if (empty($matches)) {
                return [
                    'success' => false,
                    'message' => 'No matching tree found',
                    'matches' => []
                ];
            }

            return [
                'success' => true,
                'matches' => $matches,
                'best_match' => $matches[0]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Search failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get tree statistics
     */
    public function getTreeStats($treeId) {
        try {
            $sql = "SELECT
                        COUNT(*) as total_sessions,
                        COUNT(CASE WHEN completed = TRUE THEN 1 END) as completed_sessions,
                        AVG(time_spent_seconds) as avg_time_spent,
                        AVG(user_rating) as avg_rating,
                        COUNT(CASE WHEN final_answer_helpful = TRUE THEN 1 END) as helpful_count
                    FROM decision_tree_analytics
                    WHERE tree_id = :tree_id
                    AND created_at >= NOW() - INTERVAL '30 days'";

            $stats = $this->db->fetchOne($sql, ['tree_id' => $treeId]);

            return [
                'success' => true,
                'stats' => $stats
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load stats: ' . $e->getMessage()
            ];
        }
    }
}
