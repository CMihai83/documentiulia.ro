<?php
/**
 * Question Router Service
 * Intelligent routing between Decision Trees and AI responses
 *
 * Decision Logic:
 * 1. Try to match question to existing decision tree
 * 2. If match confidence >= 70% → use tree
 * 3. If match confidence < 70% → use AI
 * 4. If AI can't answer → queue for review
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/DecisionTreeService.php';
require_once __DIR__ . '/FiscalAIService.php';
require_once __DIR__ . '/UnansweredQueueService.php';

class QuestionRouterService {
    private $db;
    private $treeService;
    private $aiService;
    private $queueService;

    // Confidence threshold for using decision trees
    const TREE_CONFIDENCE_THRESHOLD = 0.70;
    const AI_CONFIDENCE_THRESHOLD = 0.60;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->treeService = new DecisionTreeService();
        $this->aiService = new FiscalAIService();
        $this->queueService = new UnansweredQueueService();
    }

    /**
     * Main routing function - determines best response method
     */
    public function route($question, $userId = null, $companyId = null, $sessionId = null) {
        try {
            // Step 1: Try to find matching decision tree
            $treeMatch = $this->treeService->findMatchingTree($question);

            if ($treeMatch['success'] && !empty($treeMatch['matches'])) {
                $bestMatch = $treeMatch['best_match'];
                $confidence = (float)$bestMatch['relevance_score'];

                // If high confidence match, suggest tree navigation
                if ($confidence >= self::TREE_CONFIDENCE_THRESHOLD) {
                    return $this->respondWithTree($bestMatch, $confidence, $sessionId);
                }
            }

            // Step 2: Use AI for response
            $aiResponse = $this->aiService->consultFiscalQuestion($question, $userId, $companyId);

            if ($aiResponse['confidence'] >= self::AI_CONFIDENCE_THRESHOLD) {
                return $this->respondWithAI($aiResponse, $question);
            }

            // Step 3: Queue for human review if AI confidence is low
            return $this->queueForReview($question, $userId, $companyId, $treeMatch['best_match'] ?? null);

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Routing error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Respond with decision tree
     */
    private function respondWithTree($tree, $confidence, $sessionId) {
        // Get tree root node
        $rootNode = $this->treeService->getTreeRoot($tree['id']);

        if (!$rootNode['success']) {
            // Fallback to AI if tree has no root
            return [
                'success' => false,
                'fallback_to_ai' => true
            ];
        }

        return [
            'success' => true,
            'method' => 'decision_tree',
            'confidence' => $confidence,
            'tree' => [
                'id' => $tree['id'],
                'name' => $tree['tree_name'],
                'description' => $tree['description'],
                'category' => $tree['category']
            ],
            'current_node' => $rootNode['node'],
            'session_id' => $sessionId ?? $this->generateSessionId(),
            'message' => 'Îți voi pune câteva întrebări pentru a te ghida către răspunsul exact.'
        ];
    }

    /**
     * Respond with AI
     */
    private function respondWithAI($aiResponse, $question) {
        return [
            'success' => true,
            'method' => 'ai',
            'confidence' => $aiResponse['confidence'],
            'answer' => $aiResponse['answer'],
            'references' => $aiResponse['references'] ?? [],
            'strategic_recommendations' => $aiResponse['strategic_recommendations'] ?? [],
            'mba_frameworks_applied' => $aiResponse['mba_frameworks_applied'] ?? [],
            'context_used' => $aiResponse['context_used'] ?? false,
            'source' => $aiResponse['source'] ?? 'ai'
        ];
    }

    /**
     * Queue question for human review
     */
    private function queueForReview($question, $userId, $companyId, $bestTreeMatch) {
        $queueResult = $this->queueService->queueQuestion(
            $question,
            $userId,
            $companyId,
            $bestTreeMatch['id'] ?? null,
            $bestTreeMatch['relevance_score'] ?? 0
        );

        return [
            'success' => true,
            'method' => 'queued',
            'confidence' => 0,
            'message' => 'Întrebarea ta necesită o analiză mai detaliată. Vei primi răspunsul în aplicație în maxim 24 de ore.',
            'queue_id' => $queueResult['queue_id'] ?? null,
            'estimated_response_time' => '24 ore'
        ];
    }

    /**
     * Handle user response in decision tree flow
     */
    public function continueTreeNavigation($nodeId, $pathId, $sessionId, $userId = null) {
        try {
            // Navigate to next node or get final answer
            $result = $this->treeService->navigate($nodeId, $pathId);

            if (!$result['success']) {
                return $result;
            }

            // Track navigation path
            if ($userId && $sessionId) {
                $this->treeService->trackNavigation($userId, null, $sessionId, [
                    'node_id' => $nodeId,
                    'path_id' => $pathId,
                    'completed' => ($result['is_terminal'] ?? false)
                ]);
            }

            return [
                'success' => true,
                'method' => 'decision_tree',
                'is_terminal' => $result['is_terminal'] ?? false,
                'node' => $result['node'] ?? null,
                'answer' => $result['answer'] ?? null,
                'session_id' => $sessionId
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Navigation error: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Switch from tree to AI mid-flow (if user requests)
     */
    public function switchToAI($sessionId, $question, $userId = null, $companyId = null) {
        // Use AI to answer based on current context
        $aiResponse = $this->aiService->consultFiscalQuestion($question, $userId, $companyId);

        return $this->respondWithAI($aiResponse, $question);
    }

    /**
     * Get user's decision tree history
     */
    public function getUserHistory($userId, $limit = 10) {
        try {
            $sql = "SELECT
                        dta.id,
                        dta.session_id,
                        dt.tree_name,
                        dta.completed,
                        dta.final_answer_helpful,
                        dta.user_rating,
                        dta.created_at
                    FROM decision_tree_analytics dta
                    JOIN decision_trees dt ON dta.tree_id = dt.id
                    WHERE dta.user_id = :user_id
                    ORDER BY dta.created_at DESC
                    LIMIT :limit";

            $history = $this->db->fetchAll($sql, [
                'user_id' => $userId,
                'limit' => $limit
            ]);

            return [
                'success' => true,
                'history' => $history
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load history: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Generate unique session ID
     */
    private function generateSessionId() {
        return uniqid('session_', true);
    }

    /**
     * Get routing statistics
     */
    public function getRoutingStats() {
        try {
            // Get stats from last 30 days
            $sql = "SELECT
                        COUNT(*) FILTER (WHERE method = 'decision_tree') as tree_count,
                        COUNT(*) FILTER (WHERE method = 'ai') as ai_count,
                        COUNT(*) FILTER (WHERE method = 'queued') as queued_count,
                        AVG(CASE WHEN method = 'decision_tree' THEN confidence END) as avg_tree_confidence,
                        AVG(CASE WHEN method = 'ai' THEN confidence END) as avg_ai_confidence
                    FROM (
                        SELECT
                            CASE
                                WHEN tree_id IS NOT NULL THEN 'decision_tree'
                                WHEN tree_id IS NULL THEN 'ai'
                            END as method,
                            CASE
                                WHEN tree_id IS NOT NULL THEN 0.8
                                ELSE 0.9
                            END as confidence
                        FROM decision_tree_analytics
                        WHERE created_at >= NOW() - INTERVAL '30 days'

                        UNION ALL

                        SELECT 'queued' as method, similarity_score / 100 as confidence
                        FROM unanswered_questions
                        WHERE created_at >= NOW() - INTERVAL '30 days'
                    ) combined";

            $stats = $this->db->fetchOne($sql);

            return [
                'success' => true,
                'stats' => $stats,
                'period' => 'Last 30 days'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load stats: ' . $e->getMessage()
            ];
        }
    }
}
