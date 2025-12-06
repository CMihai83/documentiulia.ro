<?php
/**
 * QuizService.php
 *
 * Service for managing course quizzes, questions, and student attempts
 * Handles quiz creation, submission, grading, and result tracking
 *
 * @category Service
 * @package  DocumentIulia
 * @author   DocumentIulia Platform
 * @created  2025-11-21
 */

require_once __DIR__ . '/../config/database.php';

class QuizService
{
    private $db;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();
    }

    // ========================================
    // QUIZ MANAGEMENT
    // ========================================

    /**
     * Create a new quiz
     *
     * @param array $quizData Quiz information
     * @return array Result with quiz_id
     */
    public function createQuiz($quizData)
    {
        try {
            $query = "INSERT INTO course_quizzes (
                lesson_id, course_id, title, description, passing_score,
                time_limit, attempts_allowed, show_correct_answers, randomize_questions
            ) VALUES (
                :lesson_id, :course_id, :title, :description, :passing_score,
                :time_limit, :attempts_allowed, :show_correct_answers, :randomize_questions
            ) RETURNING id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':lesson_id', $quizData['lesson_id'], PDO::PARAM_INT);
            $stmt->bindParam(':course_id', $quizData['course_id'], PDO::PARAM_INT);
            $stmt->bindParam(':title', $quizData['title']);
            $stmt->bindParam(':description', $quizData['description']);
            $stmt->bindParam(':passing_score', $quizData['passing_score'] ?? 70, PDO::PARAM_INT);
            $stmt->bindParam(':time_limit', $quizData['time_limit'], PDO::PARAM_INT);
            $stmt->bindParam(':attempts_allowed', $quizData['attempts_allowed'], PDO::PARAM_INT);
            $stmt->bindValue(':show_correct_answers', $quizData['show_correct_answers'] ?? true, PDO::PARAM_BOOL);
            $stmt->bindValue(':randomize_questions', $quizData['randomize_questions'] ?? false, PDO::PARAM_BOOL);

            $stmt->execute();
            $quiz_id = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            return [
                'success' => true,
                'quiz_id' => $quiz_id,
                'message' => 'Quiz created successfully'
            ];
        } catch (PDOException $e) {
            error_log("QuizService::createQuiz Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to create quiz: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get quiz by ID with questions
     *
     * @param int $quizId Quiz ID
     * @param bool $includeAnswers Include correct answers (for instructors)
     * @return array|null Quiz data with questions
     */
    public function getQuiz($quizId, $includeAnswers = false)
    {
        try {
            // Get quiz details
            $quizQuery = "SELECT * FROM course_quizzes WHERE id = :quiz_id";
            $quizStmt = $this->db->prepare($quizQuery);
            $quizStmt->bindParam(':quiz_id', $quizId, PDO::PARAM_INT);
            $quizStmt->execute();
            $quiz = $quizStmt->fetch(PDO::FETCH_ASSOC);

            if (!$quiz) {
                return null;
            }

            // Get questions
            $questionsQuery = "SELECT
                id, quiz_id, question, question_type, options, points, order_index" .
                ($includeAnswers ? ", correct_answer, explanation" : "") . "
                FROM quiz_questions
                WHERE quiz_id = :quiz_id
                ORDER BY order_index ASC";

            $questionsStmt = $this->db->prepare($questionsQuery);
            $questionsStmt->bindParam(':quiz_id', $quizId, PDO::PARAM_INT);
            $questionsStmt->execute();
            $questions = $questionsStmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($questions as &$question) {
                if ($question['options']) {
                    $question['options'] = json_decode($question['options'], true);
                }
            }

            // Randomize questions if enabled
            if ($quiz['randomize_questions']) {
                shuffle($questions);
            }

            $quiz['questions'] = $questions;
            $quiz['total_questions'] = count($questions);
            $quiz['max_score'] = array_sum(array_column($questions, 'points'));

            return $quiz;

        } catch (PDOException $e) {
            error_log("QuizService::getQuiz Error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Add question to quiz
     *
     * @param int $quizId Quiz ID
     * @param array $questionData Question information
     * @return array Result with question_id
     */
    public function addQuestion($quizId, $questionData)
    {
        try {
            // Get next order index
            $orderQuery = "SELECT COALESCE(MAX(order_index), 0) + 1 as next_order
                          FROM quiz_questions WHERE quiz_id = :quiz_id";
            $orderStmt = $this->db->prepare($orderQuery);
            $orderStmt->bindParam(':quiz_id', $quizId, PDO::PARAM_INT);
            $orderStmt->execute();
            $nextOrder = $orderStmt->fetch(PDO::FETCH_ASSOC)['next_order'];

            $query = "INSERT INTO quiz_questions (
                quiz_id, question, question_type, options, correct_answer,
                explanation, points, order_index
            ) VALUES (
                :quiz_id, :question, :question_type, :options, :correct_answer,
                :explanation, :points, :order_index
            ) RETURNING id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':quiz_id', $quizId, PDO::PARAM_INT);
            $stmt->bindParam(':question', $questionData['question']);
            $stmt->bindParam(':question_type', $questionData['question_type']);
            $stmt->bindParam(':options', json_encode($questionData['options'] ?? []));
            $stmt->bindParam(':correct_answer', $questionData['correct_answer']);
            $stmt->bindParam(':explanation', $questionData['explanation']);
            $stmt->bindParam(':points', $questionData['points'] ?? 1, PDO::PARAM_INT);
            $stmt->bindParam(':order_index', $questionData['order_index'] ?? $nextOrder, PDO::PARAM_INT);

            $stmt->execute();
            $question_id = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            return [
                'success' => true,
                'question_id' => $question_id,
                'message' => 'Question added successfully'
            ];
        } catch (PDOException $e) {
            error_log("QuizService::addQuestion Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to add question: ' . $e->getMessage()
            ];
        }
    }

    // ========================================
    // QUIZ ATTEMPTS & GRADING
    // ========================================

    /**
     * Submit quiz attempt
     *
     * @param string $userId User ID
     * @param int $quizId Quiz ID
     * @param array $answers User's answers
     * @param int $timeTaken Seconds taken
     * @return array Result with score and pass/fail
     */
    public function submitQuizAttempt($userId, $quizId, $answers, $timeTaken)
    {
        try {
            // Get quiz details and questions with correct answers
            $quiz = $this->getQuiz($quizId, true);

            if (!$quiz) {
                return [
                    'success' => false,
                    'message' => 'Quiz not found'
                ];
            }

            // Get enrollment ID
            $enrollmentQuery = "SELECT uce.id as enrollment_id
                               FROM user_course_enrollments uce
                               WHERE uce.user_id = :user_id
                               AND uce.course_id = :course_id";

            $enrollmentStmt = $this->db->prepare($enrollmentQuery);
            $enrollmentStmt->bindParam(':user_id', $userId);
            $enrollmentStmt->bindParam(':course_id', $quiz['course_id'], PDO::PARAM_INT);
            $enrollmentStmt->execute();
            $enrollment = $enrollmentStmt->fetch(PDO::FETCH_ASSOC);

            if (!$enrollment) {
                return [
                    'success' => false,
                    'message' => 'User not enrolled in this course'
                ];
            }

            $enrollmentId = $enrollment['enrollment_id'];

            // Check attempts limit
            if ($quiz['attempts_allowed']) {
                $attemptsQuery = "SELECT COUNT(*) as attempt_count
                                 FROM quiz_attempts
                                 WHERE enrollment_id = :enrollment_id AND quiz_id = :quiz_id";

                $attemptsStmt = $this->db->prepare($attemptsQuery);
                $attemptsStmt->bindParam(':enrollment_id', $enrollmentId, PDO::PARAM_INT);
                $attemptsStmt->bindParam(':quiz_id', $quizId, PDO::PARAM_INT);
                $attemptsStmt->execute();
                $attemptCount = $attemptsStmt->fetch(PDO::FETCH_ASSOC)['attempt_count'];

                if ($attemptCount >= $quiz['attempts_allowed']) {
                    return [
                        'success' => false,
                        'message' => 'Maximum attempts reached'
                    ];
                }

                $attemptNumber = $attemptCount + 1;
            } else {
                // Get attempt number for unlimited attempts
                $attemptsQuery = "SELECT COALESCE(MAX(attempt_number), 0) + 1 as next_attempt
                                 FROM quiz_attempts
                                 WHERE enrollment_id = :enrollment_id AND quiz_id = :quiz_id";

                $attemptsStmt = $this->db->prepare($attemptsQuery);
                $attemptsStmt->bindParam(':enrollment_id', $enrollmentId, PDO::PARAM_INT);
                $attemptsStmt->bindParam(':quiz_id', $quizId, PDO::PARAM_INT);
                $attemptsStmt->execute();
                $attemptNumber = $attemptsStmt->fetch(PDO::FETCH_ASSOC)['next_attempt'];
            }

            // Grade the quiz
            $gradingResult = $this->gradeQuiz($quiz, $answers);

            // Save attempt
            $saveQuery = "INSERT INTO quiz_attempts (
                user_id, enrollment_id, quiz_id, attempt_number, score, max_score,
                percentage, passed, answers, time_taken, started_at, submitted_at
            ) VALUES (
                :user_id, :enrollment_id, :quiz_id, :attempt_number, :score, :max_score,
                :percentage, :passed, :answers, :time_taken, :started_at, NOW()
            ) RETURNING id";

            $saveStmt = $this->db->prepare($saveQuery);
            $saveStmt->bindParam(':user_id', $userId);
            $saveStmt->bindParam(':enrollment_id', $enrollmentId, PDO::PARAM_INT);
            $saveStmt->bindParam(':quiz_id', $quizId, PDO::PARAM_INT);
            $saveStmt->bindParam(':attempt_number', $attemptNumber, PDO::PARAM_INT);
            $saveStmt->bindParam(':score', $gradingResult['score']);
            $saveStmt->bindParam(':max_score', $gradingResult['max_score'], PDO::PARAM_INT);
            $saveStmt->bindParam(':percentage', $gradingResult['percentage']);
            $saveStmt->bindValue(':passed', $gradingResult['passed'], PDO::PARAM_BOOL);
            $saveStmt->bindParam(':answers', json_encode($gradingResult['detailed_answers']));
            $saveStmt->bindParam(':time_taken', $timeTaken, PDO::PARAM_INT);

            // Calculate started_at from submitted time - time_taken
            $startedAt = date('Y-m-d H:i:s', time() - $timeTaken);
            $saveStmt->bindParam(':started_at', $startedAt);

            $saveStmt->execute();
            $attemptId = $saveStmt->fetch(PDO::FETCH_ASSOC)['id'];

            return [
                'success' => true,
                'attempt_id' => $attemptId,
                'score' => $gradingResult['score'],
                'max_score' => $gradingResult['max_score'],
                'percentage' => $gradingResult['percentage'],
                'passed' => $gradingResult['passed'],
                'passing_score' => $quiz['passing_score'],
                'attempt_number' => $attemptNumber,
                'detailed_results' => $quiz['show_correct_answers'] ? $gradingResult['detailed_answers'] : null,
                'message' => $gradingResult['passed'] ? 'Felicitări! Ai promovat testul!' : 'Din păcate, nu ai atins scorul minim necesar.'
            ];

        } catch (PDOException $e) {
            error_log("QuizService::submitQuizAttempt Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to submit quiz: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Grade quiz based on answers
     *
     * @param array $quiz Quiz data with questions
     * @param array $userAnswers User's answers
     * @return array Grading results
     */
    private function gradeQuiz($quiz, $userAnswers)
    {
        $score = 0;
        $maxScore = 0;
        $detailedAnswers = [];

        foreach ($quiz['questions'] as $question) {
            $questionId = $question['id'];
            $maxScore += $question['points'];

            $userAnswer = $userAnswers[$questionId] ?? null;
            $correctAnswer = $question['correct_answer'];
            $isCorrect = false;

            // Grade based on question type
            switch ($question['question_type']) {
                case 'multiple_choice':
                case 'true_false':
                    $isCorrect = (string)$userAnswer === (string)$correctAnswer;
                    break;

                case 'short_answer':
                    // Case-insensitive, trimmed comparison
                    $isCorrect = strcasecmp(trim($userAnswer), trim($correctAnswer)) === 0;
                    break;

                case 'essay':
                    // Essays require manual grading (for now, mark as correct if answered)
                    $isCorrect = !empty($userAnswer);
                    break;
            }

            if ($isCorrect) {
                $score += $question['points'];
            }

            $detailedAnswers[] = [
                'question_id' => $questionId,
                'question' => $question['question'],
                'user_answer' => $userAnswer,
                'correct_answer' => $correctAnswer,
                'is_correct' => $isCorrect,
                'points_earned' => $isCorrect ? $question['points'] : 0,
                'points_possible' => $question['points'],
                'explanation' => $question['explanation'] ?? null
            ];
        }

        $percentage = $maxScore > 0 ? ($score / $maxScore) * 100 : 0;
        $passed = $percentage >= $quiz['passing_score'];

        return [
            'score' => $score,
            'max_score' => $maxScore,
            'percentage' => round($percentage, 2),
            'passed' => $passed,
            'detailed_answers' => $detailedAnswers
        ];
    }

    /**
     * Get quiz attempts for a user
     *
     * @param string $userId User ID
     * @param int $quizId Quiz ID
     * @return array Quiz attempts
     */
    public function getQuizAttempts($userId, $quizId)
    {
        try {
            $query = "SELECT
                qa.*,
                cq.title as quiz_title,
                cq.passing_score
            FROM quiz_attempts qa
            JOIN course_quizzes cq ON qa.quiz_id = cq.id
            WHERE qa.user_id = :user_id AND qa.quiz_id = :quiz_id
            ORDER BY qa.submitted_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':quiz_id', $quizId, PDO::PARAM_INT);
            $stmt->execute();

            $attempts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON answers
            foreach ($attempts as &$attempt) {
                $attempt['answers'] = json_decode($attempt['answers'], true);
            }

            return [
                'success' => true,
                'attempts' => $attempts,
                'best_score' => !empty($attempts) ? max(array_column($attempts, 'percentage')) : 0
            ];

        } catch (PDOException $e) {
            error_log("QuizService::getQuizAttempts Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get attempts: ' . $e->getMessage(),
                'attempts' => []
            ];
        }
    }

    /**
     * Get single attempt details
     *
     * @param int $attemptId Attempt ID
     * @param string $userId User ID (for verification)
     * @return array|null Attempt data
     */
    public function getAttempt($attemptId, $userId)
    {
        try {
            $query = "SELECT
                qa.*,
                cq.title as quiz_title,
                cq.passing_score,
                cq.show_correct_answers
            FROM quiz_attempts qa
            JOIN course_quizzes cq ON qa.quiz_id = cq.id
            WHERE qa.id = :attempt_id AND qa.user_id = :user_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':attempt_id', $attemptId, PDO::PARAM_INT);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            $attempt = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($attempt) {
                $attempt['answers'] = json_decode($attempt['answers'], true);
            }

            return $attempt;

        } catch (PDOException $e) {
            error_log("QuizService::getAttempt Error: " . $e->getMessage());
            return null;
        }
    }
}
