<?php
/**
 * CourseService.php
 *
 * Complete service for course management in the LMS
 * Handles courses, modules, lessons, enrollments, progress tracking
 *
 * @category Service
 * @package  DocumentIulia
 * @author   DocumentIulia Platform
 * @created  2025-11-21
 */

require_once __DIR__ . '/../config/database.php';

class CourseService
{
    private $db;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->db = $database->getConnection();
    }

    // ========================================
    // COURSE MANAGEMENT
    // ========================================

    /**
     * Create a new course
     *
     * @param array $courseData Course information
     * @return array Result with course_id
     */
    public function createCourse($courseData)
    {
        try {
            $query = "INSERT INTO courses (
                company_id, title, slug, short_description, description,
                learning_objectives, prerequisites, level, language,
                price_ron, currency, instructor_id, instructor_name,
                thumbnail_url, promo_video_url, duration_hours,
                category, tags, difficulty, certification_available,
                is_published, is_purchasable, stripe_product_id, stripe_price_id
            ) VALUES (
                :company_id, :title, :slug, :short_description, :description,
                :learning_objectives, :prerequisites, :level, :language,
                :price_ron, :currency, :instructor_id, :instructor_name,
                :thumbnail_url, :promo_video_url, :duration_hours,
                :category, :tags, :difficulty, :certification_available,
                :is_published, :is_purchasable, :stripe_product_id, :stripe_price_id
            ) RETURNING id";

            $stmt = $this->db->prepare($query);

            // Generate slug from title if not provided
            $slug = $courseData['slug'] ?? $this->generateSlug($courseData['title']);

            $stmt->bindParam(':company_id', $courseData['company_id']);
            $stmt->bindParam(':title', $courseData['title']);
            $stmt->bindParam(':slug', $slug);
            $stmt->bindParam(':short_description', $courseData['short_description']);
            $stmt->bindParam(':description', $courseData['description']);
            $stmt->bindParam(':learning_objectives', json_encode($courseData['learning_objectives'] ?? []));
            $stmt->bindParam(':prerequisites', json_encode($courseData['prerequisites'] ?? []));
            $stmt->bindParam(':level', $courseData['level']);
            $stmt->bindParam(':language', $courseData['language'] ?? 'ro');
            $stmt->bindParam(':price_ron', $courseData['price_ron'] ?? 0.00);
            $stmt->bindParam(':currency', $courseData['currency'] ?? 'RON');
            $stmt->bindParam(':instructor_id', $courseData['instructor_id']);
            $stmt->bindParam(':instructor_name', $courseData['instructor_name']);
            $stmt->bindParam(':thumbnail_url', $courseData['thumbnail_url']);
            $stmt->bindParam(':promo_video_url', $courseData['promo_video_url']);
            $stmt->bindParam(':duration_hours', $courseData['duration_hours']);
            $stmt->bindParam(':category', $courseData['category']);
            $stmt->bindParam(':tags', json_encode($courseData['tags'] ?? []));
            $stmt->bindParam(':difficulty', $courseData['difficulty'] ?? 'beginner');
            $stmt->bindValue(':certification_available', $courseData['certification_available'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindValue(':is_published', $courseData['is_published'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindValue(':is_purchasable', $courseData['is_purchasable'] ?? true, PDO::PARAM_BOOL);
            $stmt->bindParam(':stripe_product_id', $courseData['stripe_product_id']);
            $stmt->bindParam(':stripe_price_id', $courseData['stripe_price_id']);

            $stmt->execute();
            $course_id = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            return [
                'success' => true,
                'course_id' => $course_id,
                'slug' => $slug,
                'message' => 'Course created successfully'
            ];
        } catch (PDOException $e) {
            error_log("CourseService::createCourse Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to create course: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get course by ID
     *
     * @param int $courseId Course ID
     * @param string|null $companyId Company ID for filtering
     * @return array|null Course data
     */
    public function getCourse($courseId, $companyId = null)
    {
        try {
            $query = "SELECT
                c.*,
                ci.bio as instructor_bio,
                ci.expertise as instructor_expertise,
                ci.avatar_url as instructor_avatar
            FROM courses c
            LEFT JOIN course_instructors ci ON c.instructor_id = ci.user_id
            WHERE c.id = :course_id";

            if ($companyId) {
                $query .= " AND c.company_id = :company_id";
            }

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);

            if ($companyId) {
                $stmt->bindParam(':company_id', $companyId);
            }

            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("CourseService::getCourse Error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * List all courses with filtering and pagination
     *
     * @param array $filters Filtering options
     * @return array Courses list
     */
    public function listCourses($filters = [])
    {
        try {
            $query = "SELECT
                c.*,
                ci.bio as instructor_bio,
                ci.avatar_url as instructor_avatar,
                COUNT(DISTINCT uce.id) as enrollment_count_actual
            FROM courses c
            LEFT JOIN course_instructors ci ON c.instructor_id = ci.user_id
            LEFT JOIN user_course_enrollments uce ON c.id = uce.course_id
            WHERE 1=1";

            $params = [];

            // Apply filters
            if (isset($filters['company_id'])) {
                $query .= " AND c.company_id = :company_id";
                $params[':company_id'] = $filters['company_id'];
            }

            if (isset($filters['is_published'])) {
                $query .= " AND c.is_published = :is_published";
                $params[':is_published'] = $filters['is_published'];
            }

            if (isset($filters['category'])) {
                $query .= " AND c.category = :category";
                $params[':category'] = $filters['category'];
            }

            if (isset($filters['level'])) {
                $query .= " AND c.level = :level";
                $params[':level'] = $filters['level'];
            }

            if (isset($filters['is_featured'])) {
                $query .= " AND c.is_featured = :is_featured";
                $params[':is_featured'] = $filters['is_featured'];
            }

            if (isset($filters['search'])) {
                $query .= " AND (c.name ILIKE :search OR c.description ILIKE :search)";
                $params[':search'] = '%' . $filters['search'] . '%';
            }

            $query .= " GROUP BY c.id, ci.bio, ci.avatar_url";

            // Sorting
            $orderBy = $filters['order_by'] ?? 'created_at';
            $orderDir = $filters['order_dir'] ?? 'DESC';
            $query .= " ORDER BY c." . $orderBy . " " . $orderDir;

            // Pagination
            $limit = $filters['limit'] ?? 20;
            $offset = $filters['offset'] ?? 0;
            $query .= " LIMIT :limit OFFSET :offset";
            $params[':limit'] = $limit;
            $params[':offset'] = $offset;

            $stmt = $this->db->prepare($query);

            foreach ($params as $key => $value) {
                if ($key === ':limit' || $key === ':offset') {
                    $stmt->bindValue($key, $value, PDO::PARAM_INT);
                } else {
                    $stmt->bindValue($key, $value);
                }
            }

            $stmt->execute();
            $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count
            $countQuery = "SELECT COUNT(DISTINCT c.id) as total FROM courses c WHERE 1=1";

            foreach ($filters as $key => $value) {
                if ($key === 'company_id') $countQuery .= " AND c.company_id = :company_id";
                if ($key === 'is_published') $countQuery .= " AND c.is_published = :is_published";
                if ($key === 'category') $countQuery .= " AND c.category = :category";
                if ($key === 'level') $countQuery .= " AND c.level = :level";
                if ($key === 'is_featured') $countQuery .= " AND c.is_featured = :is_featured";
                if ($key === 'search') $countQuery .= " AND (c.name ILIKE :search OR c.description ILIKE :search)";
            }

            $countStmt = $this->db->prepare($countQuery);
            foreach ($params as $key => $value) {
                if ($key !== ':limit' && $key !== ':offset') {
                    $countStmt->bindValue($key, $value);
                }
            }
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            return [
                'success' => true,
                'courses' => $courses,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset
            ];
        } catch (PDOException $e) {
            error_log("CourseService::listCourses Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to list courses: ' . $e->getMessage(),
                'courses' => [],
                'total' => 0
            ];
        }
    }

    /**
     * Update course
     *
     * @param int $courseId Course ID
     * @param array $courseData Updated course data
     * @return array Result
     */
    public function updateCourse($courseId, $courseData)
    {
        try {
            $allowedFields = [
                'title', 'slug', 'short_description', 'description', 'learning_objectives',
                'prerequisites', 'level', 'language', 'price_ron', 'currency',
                'instructor_id', 'instructor_name', 'thumbnail_url', 'promo_video_url',
                'duration_hours', 'category', 'tags', 'difficulty', 'certification_available',
                'is_published', 'is_purchasable', 'is_featured', 'stripe_product_id', 'stripe_price_id'
            ];

            $updates = [];
            $params = [':course_id' => $courseId];

            foreach ($courseData as $field => $value) {
                if (in_array($field, $allowedFields)) {
                    $updates[] = "$field = :$field";

                    if (in_array($field, ['learning_objectives', 'prerequisites', 'tags'])) {
                        $params[":$field"] = json_encode($value);
                    } else {
                        $params[":$field"] = $value;
                    }
                }
            }

            if (empty($updates)) {
                return ['success' => false, 'message' => 'No valid fields to update'];
            }

            $updates[] = "updated_at = NOW()";

            $query = "UPDATE courses SET " . implode(', ', $updates) . " WHERE id = :course_id";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);

            return [
                'success' => true,
                'message' => 'Course updated successfully'
            ];
        } catch (PDOException $e) {
            error_log("CourseService::updateCourse Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to update course: ' . $e->getMessage()
            ];
        }
    }

    // ========================================
    // MODULE MANAGEMENT
    // ========================================

    /**
     * Create course module
     *
     * @param int $courseId Course ID
     * @param array $moduleData Module information
     * @return array Result with module_id
     */
    public function createModule($courseId, $moduleData)
    {
        try {
            // Get next module number
            $countQuery = "SELECT COALESCE(MAX(module_number), 0) + 1 as next_number
                          FROM course_modules WHERE course_id = :course_id";
            $countStmt = $this->db->prepare($countQuery);
            $countStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $countStmt->execute();
            $nextNumber = $countStmt->fetch(PDO::FETCH_ASSOC)['next_number'];

            // Generate module_key
            $moduleKey = $moduleData['module_key'] ?? 'module-' . $nextNumber;

            $query = "INSERT INTO course_modules (
                course_id, module_number, module_key, name, description,
                duration_minutes, learning_outcomes, is_locked, order_index
            ) VALUES (
                :course_id, :module_number, :module_key, :name, :description,
                :duration_minutes, :learning_outcomes, :is_locked, :order_index
            ) RETURNING id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $stmt->bindParam(':module_number', $nextNumber, PDO::PARAM_INT);
            $stmt->bindParam(':module_key', $moduleKey);
            $stmt->bindParam(':name', $moduleData['name']);
            $stmt->bindParam(':description', $moduleData['description']);
            $stmt->bindParam(':duration_minutes', $moduleData['duration_minutes']);
            $stmt->bindParam(':learning_outcomes', json_encode($moduleData['learning_outcomes'] ?? []));
            $stmt->bindValue(':is_locked', $moduleData['is_locked'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindParam(':order_index', $moduleData['order_index'] ?? $nextNumber, PDO::PARAM_INT);

            $stmt->execute();
            $module_id = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            return [
                'success' => true,
                'module_id' => $module_id,
                'module_number' => $nextNumber,
                'message' => 'Module created successfully'
            ];
        } catch (PDOException $e) {
            error_log("CourseService::createModule Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to create module: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get course modules
     *
     * @param int $courseId Course ID
     * @return array Modules list
     */
    public function getCourseModules($courseId)
    {
        try {
            $query = "SELECT
                cm.*,
                COUNT(cl.id) as lesson_count
            FROM course_modules cm
            LEFT JOIN course_lessons cl ON cm.id = cl.module_id
            WHERE cm.course_id = :course_id
            GROUP BY cm.id
            ORDER BY cm.module_number ASC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $stmt->execute();

            return [
                'success' => true,
                'modules' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch (PDOException $e) {
            error_log("CourseService::getCourseModules Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get modules: ' . $e->getMessage(),
                'modules' => []
            ];
        }
    }

    // ========================================
    // LESSON MANAGEMENT
    // ========================================

    /**
     * Create lesson in module
     *
     * @param int $moduleId Module ID
     * @param array $lessonData Lesson information
     * @return array Result with lesson_id
     */
    public function createLesson($moduleId, $lessonData)
    {
        try {
            // Get next lesson number
            $countQuery = "SELECT COALESCE(MAX(lesson_number), 0) + 1 as next_number
                          FROM course_lessons WHERE module_id = :module_id";
            $countStmt = $this->db->prepare($countQuery);
            $countStmt->bindParam(':module_id', $moduleId, PDO::PARAM_INT);
            $countStmt->execute();
            $nextNumber = $countStmt->fetch(PDO::FETCH_ASSOC)['next_number'];

            // Generate lesson_key
            $lessonKey = $lessonData['lesson_key'] ?? 'lesson-' . $nextNumber;

            $query = "INSERT INTO course_lessons (
                module_id, lesson_number, lesson_key, name, description,
                lesson_type, video_url, video_duration_seconds, video_provider,
                content_text, transcript_text, downloadable_resources, attachments,
                quiz_data, exercise_instructions, is_preview, is_required,
                is_locked, order_index
            ) VALUES (
                :module_id, :lesson_number, :lesson_key, :name, :description,
                :lesson_type, :video_url, :video_duration_seconds, :video_provider,
                :content_text, :transcript_text, :downloadable_resources, :attachments,
                :quiz_data, :exercise_instructions, :is_preview, :is_required,
                :is_locked, :order_index
            ) RETURNING id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':module_id', $moduleId, PDO::PARAM_INT);
            $stmt->bindParam(':lesson_number', $nextNumber, PDO::PARAM_INT);
            $stmt->bindParam(':lesson_key', $lessonKey);
            $stmt->bindParam(':name', $lessonData['name']);
            $stmt->bindParam(':description', $lessonData['description']);
            $stmt->bindParam(':lesson_type', $lessonData['lesson_type'] ?? 'video');
            $stmt->bindParam(':video_url', $lessonData['video_url']);
            $stmt->bindParam(':video_duration_seconds', $lessonData['video_duration_seconds']);
            $stmt->bindParam(':video_provider', $lessonData['video_provider']);
            $stmt->bindParam(':content_text', $lessonData['content_text']);
            $stmt->bindParam(':transcript_text', $lessonData['transcript_text']);
            $stmt->bindParam(':downloadable_resources', json_encode($lessonData['downloadable_resources'] ?? []));
            $stmt->bindParam(':attachments', json_encode($lessonData['attachments'] ?? []));
            $stmt->bindParam(':quiz_data', json_encode($lessonData['quiz_data'] ?? []));
            $stmt->bindParam(':exercise_instructions', $lessonData['exercise_instructions']);
            $stmt->bindValue(':is_preview', $lessonData['is_preview'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindValue(':is_required', $lessonData['is_required'] ?? true, PDO::PARAM_BOOL);
            $stmt->bindValue(':is_locked', $lessonData['is_locked'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindParam(':order_index', $lessonData['order_index'] ?? $nextNumber, PDO::PARAM_INT);

            $stmt->execute();
            $lesson_id = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            return [
                'success' => true,
                'lesson_id' => $lesson_id,
                'lesson_number' => $nextNumber,
                'message' => 'Lesson created successfully'
            ];
        } catch (PDOException $e) {
            error_log("CourseService::createLesson Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to create lesson: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get module lessons
     *
     * @param int $moduleId Module ID
     * @return array Lessons list
     */
    public function getModuleLessons($moduleId)
    {
        try {
            $query = "SELECT * FROM course_lessons
                     WHERE module_id = :module_id
                     ORDER BY lesson_number ASC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':module_id', $moduleId, PDO::PARAM_INT);
            $stmt->execute();

            return [
                'success' => true,
                'lessons' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch (PDOException $e) {
            error_log("CourseService::getModuleLessons Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get lessons: ' . $e->getMessage(),
                'lessons' => []
            ];
        }
    }

    // ========================================
    // ENROLLMENT MANAGEMENT
    // ========================================

    /**
     * Enroll user in course
     *
     * @param string $userId User ID (UUID)
     * @param int $courseId Course ID
     * @param array $enrollmentData Enrollment details
     * @return array Result with enrollment_id
     */
    public function enrollUser($userId, $courseId, $enrollmentData = [])
    {
        try {
            // Check if already enrolled
            $checkQuery = "SELECT id FROM user_course_enrollments
                          WHERE user_id = :user_id AND course_id = :course_id";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':user_id', $userId);
            $checkStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                return [
                    'success' => false,
                    'message' => 'User already enrolled in this course'
                ];
            }

            $query = "INSERT INTO user_course_enrollments (
                user_id, course_id, company_id, enrolled_at, expires_at,
                payment_status, payment_amount, payment_reference,
                enrollment_source, stripe_checkout_session_id, status
            ) VALUES (
                :user_id, :course_id, :company_id, NOW(), :expires_at,
                :payment_status, :payment_amount, :payment_reference,
                :enrollment_source, :stripe_checkout_session_id, :status
            ) RETURNING id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $stmt->bindParam(':company_id', $enrollmentData['company_id']);
            $stmt->bindParam(':expires_at', $enrollmentData['expires_at']);
            $stmt->bindParam(':payment_status', $enrollmentData['payment_status'] ?? 'paid');
            $stmt->bindParam(':payment_amount', $enrollmentData['payment_amount']);
            $stmt->bindParam(':payment_reference', $enrollmentData['payment_reference']);
            $stmt->bindParam(':enrollment_source', $enrollmentData['enrollment_source'] ?? 'purchase');
            $stmt->bindParam(':stripe_checkout_session_id', $enrollmentData['stripe_checkout_session_id']);
            $stmt->bindParam(':status', $enrollmentData['status'] ?? 'active');

            $stmt->execute();
            $enrollment_id = $stmt->fetch(PDO::FETCH_ASSOC)['id'];

            // Create user_course_progress record
            $progressQuery = "INSERT INTO user_course_progress (user_id, course_id)
                             VALUES (:user_id, :course_id)
                             ON CONFLICT (user_id, course_id) DO NOTHING";
            $progressStmt = $this->db->prepare($progressQuery);
            $progressStmt->bindParam(':user_id', $userId);
            $progressStmt->bindParam(':course_id', $courseId, PDO::PARAM_INT);
            $progressStmt->execute();

            return [
                'success' => true,
                'enrollment_id' => $enrollment_id,
                'message' => 'User enrolled successfully'
            ];
        } catch (PDOException $e) {
            error_log("CourseService::enrollUser Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to enroll user: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user enrollments
     *
     * @param string $userId User ID
     * @return array Enrollments list
     */
    public function getUserEnrollments($userId)
    {
        try {
            $query = "SELECT
                uce.*,
                c.name as course_name,
                c.thumbnail_url,
                c.instructor_name,
                ucp.completion_percentage,
                ucp.last_accessed_at
            FROM user_course_enrollments uce
            JOIN courses c ON uce.course_id = c.id
            LEFT JOIN user_course_progress ucp ON uce.user_id = ucp.user_id AND uce.course_id = ucp.course_id
            WHERE uce.user_id = :user_id
            ORDER BY uce.enrolled_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            return [
                'success' => true,
                'enrollments' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch (PDOException $e) {
            error_log("CourseService::getUserEnrollments Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get enrollments: ' . $e->getMessage(),
                'enrollments' => []
            ];
        }
    }

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    /**
     * Generate URL-friendly slug from title
     *
     * @param string $title Title to convert
     * @return string Slug
     */
    private function generateSlug($title)
    {
        // Convert to lowercase
        $slug = strtolower($title);

        // Replace Romanian characters
        $replacements = [
            'ă' => 'a', 'â' => 'a', 'î' => 'i', 'ș' => 's', 'ş' => 's',
            'ț' => 't', 'ţ' => 't', 'Ă' => 'a', 'Â' => 'a', 'Î' => 'i',
            'Ș' => 's', 'Ş' => 's', 'Ț' => 't', 'Ţ' => 't'
        ];
        $slug = strtr($slug, $replacements);

        // Remove special characters
        $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);

        // Replace spaces and multiple dashes with single dash
        $slug = preg_replace('/[\s-]+/', '-', $slug);

        // Trim dashes from ends
        $slug = trim($slug, '-');

        return $slug;
    }
}
