<?php
/**
 * Unanswered Questions Queue Service
 * Manages questions that couldn't be answered by trees or AI
 *
 * Workflow:
 * 1. Question queued → status: 'pending'
 * 2. AI processes → generates tree structure → status: 'ai_processing'
 * 3. Human reviews AI-generated tree → status: 'human_review'
 * 4. Approved → integrated into production trees → status: 'integrated'
 * 5. User notified in-app → status: 'answered'
 */

require_once __DIR__ . '/../config/database.php';

class UnansweredQueueService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Queue a new unanswered question
     */
    public function queueQuestion($question, $userId, $companyId, $matchedTreeId = null, $similarityScore = 0) {
        try {
            // Get user context if available
            $userContext = $this->getUserContext($userId, $companyId);

            $sql = "INSERT INTO unanswered_questions
                    (user_id, company_id, question, user_context, matched_tree_id, similarity_score, status, priority)
                    VALUES (:user_id, :company_id, :question, :user_context, :matched_tree_id, :similarity_score, 'pending', :priority)
                    RETURNING id";

            // Determine priority based on similarity score
            $priority = 'medium';
            if ($similarityScore < 0.3) {
                $priority = 'high'; // Very unique question
            } elseif ($similarityScore >= 0.5) {
                $priority = 'low'; // Close to existing tree
            }

            $result = $this->db->fetchOne($sql, [
                'user_id' => $userId,
                'company_id' => $companyId,
                'question' => $question,
                'user_context' => json_encode($userContext),
                'matched_tree_id' => $matchedTreeId,
                'similarity_score' => $similarityScore * 100,
                'priority' => $priority
            ]);

            // Trigger AI processing (asynchronous in production)
            $this->triggerAIProcessing($result['id']);

            return [
                'success' => true,
                'queue_id' => $result['id'],
                'message' => 'Question queued for processing'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to queue question: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user fiscal/business context
     */
    private function getUserContext($userId, $companyId) {
        if (!$userId) {
            return null;
        }

        try {
            $sql = "SELECT
                        c.id as company_id,
                        c.name as company_name,
                        c.legal_name,
                        c.tax_id,
                        c.industry
                    FROM companies c
                    WHERE c.id = :company_id
                    LIMIT 1";

            $context = $this->db->fetchOne($sql, ['company_id' => $companyId]);

            return $context ?? null;
        } catch (Exception $e) {
            error_log("Failed to get user context: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Trigger AI processing for queued question
     */
    private function triggerAIProcessing($questionId) {
        // In production, this would be an async job/queue
        // For now, we'll mark it for processing

        try {
            $sql = "UPDATE unanswered_questions
                    SET status = 'ai_processing',
                        updated_at = NOW()
                    WHERE id = :id";

            $this->db->execute($sql, ['id' => $questionId]);

            // TODO: Trigger background job to process with TreeGeneratorService

        } catch (Exception $e) {
            error_log("Failed to trigger AI processing: " . $e->getMessage());
        }
    }

    /**
     * Get all pending questions for admin review
     */
    public function getPendingQuestions($limit = 50, $status = null) {
        try {
            $sql = "SELECT
                        uq.id,
                        uq.question,
                        uq.status,
                        uq.priority,
                        uq.similarity_score,
                        uq.ai_confidence,
                        uq.created_at,
                        dt.tree_name as matched_tree_name,
                        u.email as user_email,
                        c.name as company_name
                    FROM unanswered_questions uq
                    LEFT JOIN decision_trees dt ON uq.matched_tree_id = dt.id
                    LEFT JOIN users u ON uq.user_id = u.id
                    LEFT JOIN companies c ON uq.company_id = c.id";

            $params = [];

            if ($status) {
                $sql .= " WHERE uq.status = :status";
                $params['status'] = $status;
            }

            $sql .= " ORDER BY
                        CASE uq.priority
                            WHEN 'urgent' THEN 1
                            WHEN 'high' THEN 2
                            WHEN 'medium' THEN 3
                            ELSE 4
                        END,
                        uq.created_at ASC
                     LIMIT :limit";

            $params['limit'] = $limit;

            $questions = $this->db->fetchAll($sql, $params);

            return [
                'success' => true,
                'questions' => $questions
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load questions: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Save AI-generated tree structure for a question
     */
    public function saveAIGeneratedTree($questionId, $treeStructure, $confidence) {
        try {
            $sql = "UPDATE unanswered_questions
                    SET ai_generated_tree = :tree_structure,
                        ai_confidence = :confidence,
                        status = 'human_review',
                        updated_at = NOW()
                    WHERE id = :id";

            $this->db->execute($sql, [
                'tree_structure' => json_encode($treeStructure),
                'confidence' => $confidence,
                'id' => $questionId
            ]);

            return ['success' => true];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to save AI tree: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Human review approval
     */
    public function approveQuestion($questionId, $reviewerId, $notes = null, $modifiedTree = null) {
        try {
            $sql = "UPDATE unanswered_questions
                    SET status = 'approved',
                        human_reviewed_by = :reviewer_id,
                        human_review_notes = :notes,
                        ai_generated_tree = COALESCE(:modified_tree, ai_generated_tree),
                        approved_at = NOW(),
                        updated_at = NOW()
                    WHERE id = :id";

            $this->db->execute($sql, [
                'reviewer_id' => $reviewerId,
                'notes' => $notes,
                'modified_tree' => $modifiedTree ? json_encode($modifiedTree) : null,
                'id' => $questionId
            ]);

            // Trigger tree integration
            $this->integrateIntoProduction($questionId);

            return ['success' => true];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Approval failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Integrate approved tree into production
     */
    private function integrateIntoProduction($questionId) {
        // TODO: Implement tree integration logic
        // This would create new decision_nodes and decision_paths

        try {
            $sql = "UPDATE unanswered_questions
                    SET status = 'integrated',
                        integrated_at = NOW()
                    WHERE id = :id";

            $this->db->execute($sql, ['id' => $questionId]);

            // Send notification to user
            $this->notifyUser($questionId);

        } catch (Exception $e) {
            error_log("Failed to integrate tree: " . $e->getMessage());
        }
    }

    /**
     * Send in-app notification to user
     */
    private function notifyUser($questionId) {
        try {
            // Get question details
            $sql = "SELECT user_id, question FROM unanswered_questions WHERE id = :id";
            $question = $this->db->fetchOne($sql, ['id' => $questionId]);

            if (!$question['user_id']) {
                return; // No user to notify
            }

            // Create user notification
            $sql = "INSERT INTO user_notifications
                    (user_id, notification_type, title, message, related_id, related_type, priority, action_url)
                    VALUES (:user_id, 'unanswered_question_response', :title, :message, :related_id, 'unanswered_question', 'high', '/questions/:id')";

            $this->db->execute($sql, [
                'user_id' => $question['user_id'],
                'title' => 'Răspuns disponibil la întrebarea ta',
                'message' => 'Am analizat întrebarea ta și am pregătit un răspuns detaliat. Click pentru a vedea.',
                'related_id' => $questionId
            ]);

            // Mark as answered
            $sql = "UPDATE unanswered_questions
                    SET status = 'answered',
                        answer_sent_at = NOW()
                    WHERE id = :id";

            $this->db->execute($sql, ['id' => $questionId]);

        } catch (Exception $e) {
            error_log("Failed to notify user: " . $e->getMessage());
        }
    }

    /**
     * Get user's queued questions
     */
    public function getUserQuestions($userId) {
        try {
            $sql = "SELECT
                        id,
                        question,
                        status,
                        priority,
                        created_at,
                        answer_sent_at
                    FROM unanswered_questions
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC";

            $questions = $this->db->fetchAll($sql, ['user_id' => $userId]);

            return [
                'success' => true,
                'questions' => $questions
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to load user questions: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get answer for a queued question
     */
    public function getAnswer($questionId, $userId = null) {
        try {
            $sql = "SELECT
                        uq.id,
                        uq.question,
                        uq.status,
                        uq.ai_generated_tree,
                        uq.answer_sent_at,
                        uqr.answer_text,
                        uqr.legislation_refs,
                        uqr.generated_by
                    FROM unanswered_questions uq
                    LEFT JOIN unanswered_question_responses uqr ON uq.id = uqr.unanswered_question_id
                    WHERE uq.id = :id";

            $params = ['id' => $questionId];

            if ($userId) {
                $sql .= " AND uq.user_id = :user_id";
                $params['user_id'] = $userId;
            }

            $answer = $this->db->fetchOne($sql, $params);

            if (!$answer) {
                return [
                    'success' => false,
                    'message' => 'Answer not found or not available yet'
                ];
            }

            return [
                'success' => true,
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
     * Get queue statistics
     */
    public function getQueueStats() {
        try {
            $sql = "SELECT
                        COUNT(*) as total_questions,
                        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                        COUNT(*) FILTER (WHERE status = 'ai_processing') as processing_count,
                        COUNT(*) FILTER (WHERE status = 'human_review') as review_count,
                        COUNT(*) FILTER (WHERE status = 'answered') as answered_count,
                        COUNT(*) FILTER (WHERE status = 'integrated') as integrated_count,
                        AVG(EXTRACT(EPOCH FROM (answer_sent_at - created_at)) / 3600) as avg_response_time_hours
                    FROM unanswered_questions
                    WHERE created_at >= NOW() - INTERVAL '30 days'";

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
