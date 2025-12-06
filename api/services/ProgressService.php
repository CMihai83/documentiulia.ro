<?php
/**
 * ProgressService.php
 *
 * Service for tracking student progress through courses and lessons
 * Handles lesson completions, video position tracking, time tracking
 *
 * @category Service
 * @package  DocumentIulia
 * @author   DocumentIulia Platform
 * @created  2025-11-21
 */

require_once __DIR__ . '/../config/database.php';

class ProgressService
{
    private $db;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();
    }

    // ========================================
    // LESSON PROGRESS TRACKING
    // ========================================

    /**
     * Update lesson progress (video position, completion status)
     *
     * @param string $userId User ID (UUID)
     * @param int $lessonId Lesson ID
     * @param array $progressData Progress information
     * @return array Result
     */
    public function updateLessonProgress($userId, $lessonId, $progressData)
    {
        try {
            // First, verify the user is enrolled in this lesson's course
            $verifyQuery = "SELECT uce.id as enrollment_id, uce.course_id
                           FROM user_course_enrollments uce
                           JOIN course_modules cm ON uce.course_id = cm.course_id
                           JOIN course_lessons cl ON cm.id = cl.module_id
                           WHERE uce.user_id = :user_id
                           AND cl.id = :lesson_id
                           AND uce.status = 'active'";

            $verifyStmt = $this->db->prepare($verifyQuery);
            $verifyStmt->bindParam(':user_id', $userId);
            $verifyStmt->bindParam(':lesson_id', $lessonId, PDO::PARAM_INT);
            $verifyStmt->execute();

            $enrollment = $verifyStmt->fetch(PDO::FETCH_ASSOC);

            if (!$enrollment) {
                return [
                    'success' => false,
                    'message' => 'User not enrolled in this course or enrollment inactive'
                ];
            }

            // Check if lesson progress record exists
            $checkQuery = "SELECT id, completed FROM user_lesson_completions
                          WHERE user_id = :user_id AND lesson_id = :lesson_id";

            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':user_id', $userId);
            $checkStmt->bindParam(':lesson_id', $lessonId, PDO::PARAM_INT);
            $checkStmt->execute();

            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Update existing progress
                $updateFields = [];
                $params = [':user_id' => $userId, ':lesson_id' => $lessonId];

                if (isset($progressData['progress_percentage'])) {
                    $updateFields[] = "progress_percentage = :progress_percentage";
                    $params[':progress_percentage'] = $progressData['progress_percentage'];
                }

                if (isset($progressData['last_position'])) {
                    $updateFields[] = "last_position = :last_position";
                    $params[':last_position'] = $progressData['last_position'];
                }

                if (isset($progressData['time_spent_seconds'])) {
                    $updateFields[] = "time_spent_seconds = time_spent_seconds + :time_spent_seconds";
                    $params[':time_spent_seconds'] = $progressData['time_spent_seconds'];
                }

                if (isset($progressData['video_watch_percentage'])) {
                    $updateFields[] = "video_watch_percentage = :video_watch_percentage";
                    $params[':video_watch_percentage'] = $progressData['video_watch_percentage'];
                }

                // Mark as completed if specified or if watch percentage >= 90%
                $shouldComplete = false;
                if (isset($progressData['completed']) && $progressData['completed'] === true) {
                    $shouldComplete = true;
                } elseif (isset($progressData['video_watch_percentage']) && $progressData['video_watch_percentage'] >= 90) {
                    $shouldComplete = true;
                }

                if ($shouldComplete && !$existing['completed']) {
                    $updateFields[] = "completed_at = NOW()";
                }

                if (empty($updateFields)) {
                    return ['success' => true, 'message' => 'No updates needed'];
                }

                $query = "UPDATE user_lesson_completions SET " . implode(', ', $updateFields) . "
                         WHERE user_id = :user_id AND lesson_id = :lesson_id";

                $stmt = $this->db->prepare($query);
                $stmt->execute($params);

            } else {
                // Insert new progress record
                $query = "INSERT INTO user_lesson_completions (
                    user_id, lesson_id, progress_percentage, last_position,
                    time_spent_seconds, video_watch_percentage, completed_at
                ) VALUES (
                    :user_id, :lesson_id, :progress_percentage, :last_position,
                    :time_spent_seconds, :video_watch_percentage, :completed_at
                )";

                $stmt = $this->db->prepare($query);
                $stmt->bindParam(':user_id', $userId);
                $stmt->bindParam(':lesson_id', $lessonId, PDO::PARAM_INT);
                $stmt->bindParam(':progress_percentage', $progressData['progress_percentage'] ?? 0);
                $stmt->bindParam(':last_position', $progressData['last_position'] ?? 0, PDO::PARAM_INT);
                $stmt->bindParam(':time_spent_seconds', $progressData['time_spent_seconds'] ?? 0, PDO::PARAM_INT);
                $stmt->bindParam(':video_watch_percentage', $progressData['video_watch_percentage'] ?? 0);

                $completedAt = null;
                if (isset($progressData['completed']) && $progressData['completed'] === true) {
                    $completedAt = date('Y-m-d H:i:s');
                } elseif (isset($progressData['video_watch_percentage']) && $progressData['video_watch_percentage'] >= 90) {
                    $completedAt = date('Y-m-d H:i:s');
                }
                $stmt->bindParam(':completed_at', $completedAt);

                $stmt->execute();
            }

            // Update course progress
            $this->updateCourseProgress($userId, $enrollment['course_id']);

            return [
                'success' => true,
                'message' => 'Progress updated successfully'
            ];

        } catch (PDOException $e) {
            error_log("ProgressService::updateLessonProgress Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to update progress: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get lesson progress for a user
     *
     * @param string $userId User ID
     * @param int $lessonId Lesson ID
     * @return array|null Progress data
     */
    public function getLessonProgress($userId, $lessonId)
    {
        try {
            $query = "SELECT * FROM user_lesson_completions
                     WHERE user_id = :user_id AND lesson_id = :lesson_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':lesson_id', $lessonId, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("ProgressService::getLessonProgress Error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get all lesson progress for a course enrollment
     *
     * @param string $userId User ID
     * @param int $courseId Course ID
     * @return array Lessons with progress
     */
    public function getCourseProgress($userId, $courseId)
    {
        try {
            $query = "SELECT
                cl.id as lesson_id,
                cl.name as lesson_name,
                cl.lesson_type,
                cl.video_duration_seconds,
                cm.id as module_id,
                cm.name as module_name,
                cm.module_number,
                ulc.progress_percentage,
                ulc.last_position,
                ulc.time_spent_seconds,
                ulc.video_watch_percentage,
                ulc.completed_at,
                CASE WHEN ulc.completed_at IS NOT NULL THEN true ELSE false END as is_completed
            FROM course_modules cm
            JOIN course_lessons cl ON cm.id = cl.module_id
            LEFT JOIN user_lesson_completions ulc ON cl.id = ulc.lesson_id AND ulc.user_id = :user_id
            WHERE cm.course_id = :course_id
            ORDER BY cm.module_number ASC, cl.lesson_number ASC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $stmt->execute();

            $lessons = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate overall progress
            $totalLessons = count($lessons);
            $completedLessons = 0;
            $totalTimeSpent = 0;

            foreach ($lessons as $lesson) {
                if ($lesson['is_completed']) {
                    $completedLessons++;
                }
                $totalTimeSpent += $lesson['time_spent_seconds'] ?? 0;
            }

            $overallProgress = $totalLessons > 0 ? ($completedLessons / $totalLessons) * 100 : 0;

            return [
                'success' => true,
                'lessons' => $lessons,
                'stats' => [
                    'total_lessons' => $totalLessons,
                    'completed_lessons' => $completedLessons,
                    'overall_progress' => round($overallProgress, 2),
                    'total_time_spent_seconds' => $totalTimeSpent,
                    'total_time_spent_formatted' => $this->formatTime($totalTimeSpent)
                ]
            ];

        } catch (PDOException $e) {
            error_log("ProgressService::getCourseProgress Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get course progress: ' . $e->getMessage(),
                'lessons' => [],
                'stats' => []
            ];
        }
    }

    /**
     * Update overall course progress based on lesson completions
     *
     * @param string $userId User ID
     * @param int $courseId Course ID
     * @return bool Success
     */
    private function updateCourseProgress($userId, $courseId)
    {
        try {
            // Get total lessons in course
            $totalQuery = "SELECT COUNT(*) as total
                          FROM course_lessons cl
                          JOIN course_modules cm ON cl.module_id = cm.id
                          WHERE cm.course_id = :course_id";

            $totalStmt = $this->db->prepare($totalQuery);
            $totalStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $totalStmt->execute();
            $totalLessons = $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get completed lessons
            $completedQuery = "SELECT COUNT(*) as completed
                              FROM user_lesson_completions ulc
                              JOIN course_lessons cl ON ulc.lesson_id = cl.id
                              JOIN course_modules cm ON cl.module_id = cm.id
                              WHERE ulc.user_id = :user_id
                              AND cm.course_id = :course_id
                              AND ulc.completed_at IS NOT NULL";

            $completedStmt = $this->db->prepare($completedQuery);
            $completedStmt->bindParam(':user_id', $userId);
            $completedStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $completedStmt->execute();
            $completedLessons = $completedStmt->fetch(PDO::FETCH_ASSOC)['completed'];

            // Calculate progress percentage
            $progressPercentage = $totalLessons > 0 ? ($completedLessons / $totalLessons) * 100 : 0;

            // Get total time spent
            $timeQuery = "SELECT COALESCE(SUM(ulc.time_spent_seconds), 0) as total_time
                         FROM user_lesson_completions ulc
                         JOIN course_lessons cl ON ulc.lesson_id = cl.id
                         JOIN course_modules cm ON cl.module_id = cm.id
                         WHERE ulc.user_id = :user_id
                         AND cm.course_id = :course_id";

            $timeStmt = $this->db->prepare($timeQuery);
            $timeStmt->bindParam(':user_id', $userId);
            $timeStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $timeStmt->execute();
            $totalTime = $timeStmt->fetch(PDO::FETCH_ASSOC)['total_time'];

            // Update user_course_progress
            $updateQuery = "UPDATE user_course_progress
                           SET completion_percentage = :progress_percentage,
                               total_lessons_completed = :completed_lessons,
                               total_lessons_count = :total_lessons,
                               total_time_spent_minutes = :total_time_minutes,
                               last_accessed_at = NOW()
                           WHERE user_id = :user_id AND course_id = :course_id";

            $updateStmt = $this->db->prepare($updateQuery);
            $updateStmt->bindParam(':progress_percentage', $progressPercentage);
            $updateStmt->bindParam(':completed_lessons', $completedLessons, PDO::PARAM_INT);
            $updateStmt->bindParam(':total_lessons', $totalLessons, PDO::PARAM_INT);
            $totalTimeMinutes = round($totalTime / 60);
            $updateStmt->bindParam(':total_time_minutes', $totalTimeMinutes, PDO::PARAM_INT);
            $updateStmt->bindParam(':user_id', $userId);
            $updateStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $updateStmt->execute();

            // Update user_course_enrollments
            $enrollmentQuery = "UPDATE user_course_enrollments
                               SET progress_percentage = :progress_percentage,
                                   lessons_completed = :completed_lessons,
                                   total_time_spent = :total_time_minutes,
                                   last_accessed_at = NOW()
                               WHERE user_id = :user_id AND course_id = :course_id";

            $enrollmentStmt = $this->db->prepare($enrollmentQuery);
            $enrollmentStmt->bindParam(':progress_percentage', $progressPercentage);
            $enrollmentStmt->bindParam(':completed_lessons', $completedLessons, PDO::PARAM_INT);
            $enrollmentStmt->bindParam(':total_time_minutes', $totalTimeMinutes, PDO::PARAM_INT);
            $enrollmentStmt->bindParam(':user_id', $userId);
            $enrollmentStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $enrollmentStmt->execute();

            // Mark course as completed if all lessons done
            if ($progressPercentage >= 100) {
                $completeQuery = "UPDATE user_course_enrollments
                                 SET completed_at = COALESCE(completed_at, NOW()),
                                     status = 'completed'
                                 WHERE user_id = :user_id AND course_id = :course_id";

                $completeStmt = $this->db->prepare($completeQuery);
                $completeStmt->bindParam(':user_id', $userId);
                $completeStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
                $completeStmt->execute();

                // Update user_course_progress
                $progressCompleteQuery = "UPDATE user_course_progress
                                         SET completed_at = COALESCE(completed_at, NOW()),
                                             is_completed = true
                                         WHERE user_id = :user_id AND course_id = :course_id";

                $progressCompleteStmt = $this->db->prepare($progressCompleteQuery);
                $progressCompleteStmt->bindParam(':user_id', $userId);
                $progressCompleteStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
                $progressCompleteStmt->execute();
            }

            return true;

        } catch (PDOException $e) {
            error_log("ProgressService::updateCourseProgress Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Mark lesson as completed
     *
     * @param string $userId User ID
     * @param int $lessonId Lesson ID
     * @return array Result
     */
    public function completeLesson($userId, $lessonId)
    {
        return $this->updateLessonProgress($userId, $lessonId, [
            'completed' => true,
            'video_watch_percentage' => 100,
            'progress_percentage' => 100
        ]);
    }

    /**
     * Get next lesson in course
     *
     * @param string $userId User ID
     * @param int $courseId Course ID
     * @param int|null $currentLessonId Current lesson ID (optional)
     * @return array|null Next lesson
     */
    public function getNextLesson($userId, $courseId, $currentLessonId = null)
    {
        try {
            if ($currentLessonId) {
                // Get next lesson after current
                $query = "SELECT cl.id, cl.name, cl.lesson_type, cl.video_url,
                                cm.module_number, cl.lesson_number
                         FROM course_lessons cl
                         JOIN course_modules cm ON cl.module_id = cm.id
                         WHERE cm.course_id = :course_id
                         AND (cm.module_number, cl.lesson_number) > (
                             SELECT cm2.module_number, cl2.lesson_number
                             FROM course_lessons cl2
                             JOIN course_modules cm2 ON cl2.module_id = cm2.id
                             WHERE cl2.id = :current_lesson_id
                         )
                         ORDER BY cm.module_number ASC, cl.lesson_number ASC
                         LIMIT 1";

                $stmt = $this->db->prepare($query);
                $stmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
                $stmt->bindParam(':current_lesson_id', $currentLessonId, PDO::PARAM_INT);

            } else {
                // Get first lesson
                $query = "SELECT cl.id, cl.name, cl.lesson_type, cl.video_url,
                                cm.module_number, cl.lesson_number
                         FROM course_lessons cl
                         JOIN course_modules cm ON cl.module_id = cm.id
                         WHERE cm.course_id = :course_id
                         ORDER BY cm.module_number ASC, cl.lesson_number ASC
                         LIMIT 1";

                $stmt = $this->db->prepare($query);
                $stmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            }

            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            error_log("ProgressService::getNextLesson Error: " . $e->getMessage());
            return null;
        }
    }

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    /**
     * Format seconds into readable time string
     *
     * @param int $seconds Seconds
     * @return string Formatted time
     */
    private function formatTime($seconds)
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;

        if ($hours > 0) {
            return sprintf('%dh %dm', $hours, $minutes);
        } elseif ($minutes > 0) {
            return sprintf('%dm %ds', $minutes, $secs);
        } else {
            return sprintf('%ds', $secs);
        }
    }
}
