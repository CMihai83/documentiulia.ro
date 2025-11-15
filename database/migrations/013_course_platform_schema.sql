-- =====================================================================
-- Migration 013: Course Platform Database Schema
-- =====================================================================
-- Purpose: Create infrastructure for course delivery system
-- Courses: Excel Mastery, Finance for Non-Financial, Business Fundamentals
-- Date: 2025-11-15
-- Estimated Budget: $50 of $1000 Claude Code credit
-- =====================================================================

BEGIN;

-- =====================================================================
-- TABLE 1: courses
-- =====================================================================
-- Stores master course catalog
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  course_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'excel', 'finance', 'business', 'legal', 'hr'
  difficulty VARCHAR(50) NOT NULL DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  price_ron DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration_hours INTEGER, -- Total course duration estimate
  instructor_name VARCHAR(255),
  thumbnail_url VARCHAR(500),
  promo_video_url VARCHAR(500),
  learning_objectives JSONB, -- Array of learning objectives
  prerequisites JSONB, -- Array of prerequisite course_keys
  target_audience TEXT,
  certification_available BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  enrollment_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_difficulty ON courses(difficulty);
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_courses_key ON courses(course_key);

-- =====================================================================
-- TABLE 2: course_modules
-- =====================================================================
-- Organizes lessons into modules (e.g., Excel Fundamentals Module 1-5)
CREATE TABLE IF NOT EXISTS course_modules (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  module_key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER, -- Estimated module completion time
  learning_outcomes JSONB, -- Array of what students will learn
  is_locked BOOLEAN DEFAULT false, -- Requires previous module completion
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, module_number),
  UNIQUE(course_id, module_key)
);

CREATE INDEX idx_course_modules_course ON course_modules(course_id);
CREATE INDEX idx_course_modules_number ON course_modules(course_id, module_number);

-- =====================================================================
-- TABLE 3: course_lessons
-- =====================================================================
-- Individual lessons within modules
CREATE TABLE IF NOT EXISTS course_lessons (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  lesson_key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  lesson_type VARCHAR(50) NOT NULL DEFAULT 'video', -- 'video', 'reading', 'quiz', 'exercise', 'download'
  content_url VARCHAR(500), -- Video URL or document link
  video_duration_seconds INTEGER,
  transcript_text TEXT, -- For SEO and accessibility
  downloadable_resources JSONB, -- Array of {name, url, type, size_mb}
  quiz_data JSONB, -- For quiz-type lessons: {questions: [...], passing_score: 80}
  exercise_instructions TEXT, -- For exercise-type lessons
  is_preview BOOLEAN DEFAULT false, -- Allow free preview
  is_required BOOLEAN DEFAULT true, -- Must complete to progress
  order_index INTEGER, -- For custom ordering beyond lesson_number
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(module_id, lesson_number),
  UNIQUE(module_id, lesson_key)
);

CREATE INDEX idx_course_lessons_module ON course_lessons(module_id);
CREATE INDEX idx_course_lessons_number ON course_lessons(module_id, lesson_number);
CREATE INDEX idx_course_lessons_type ON course_lessons(lesson_type);

-- =====================================================================
-- TABLE 4: user_course_enrollments
-- =====================================================================
-- Tracks which users enrolled in which courses
CREATE TABLE IF NOT EXISTS user_course_enrollments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- For time-limited access
  payment_status VARCHAR(50) DEFAULT 'free', -- 'free', 'paid', 'trial', 'gifted'
  payment_amount DECIMAL(10,2),
  payment_reference VARCHAR(255),
  enrollment_source VARCHAR(100), -- 'direct', 'promotion', 'bundle', 'corporate'
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_enrollments_user ON user_course_enrollments(user_id);
CREATE INDEX idx_enrollments_course ON user_course_enrollments(course_id);
CREATE INDEX idx_enrollments_status ON user_course_enrollments(payment_status);

-- =====================================================================
-- TABLE 5: user_course_progress
-- =====================================================================
-- Tracks overall progress through a course
CREATE TABLE IF NOT EXISTS user_course_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  current_lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE SET NULL,
  current_module_id INTEGER REFERENCES course_modules(id) ON DELETE SET NULL,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  total_lessons_completed INTEGER DEFAULT 0,
  total_lessons_count INTEGER,
  total_time_spent_minutes INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  is_completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_progress_user ON user_course_progress(user_id);
CREATE INDEX idx_progress_course ON user_course_progress(course_id);
CREATE INDEX idx_progress_completed ON user_course_progress(is_completed);

-- =====================================================================
-- TABLE 6: user_lesson_completions
-- =====================================================================
-- Tracks completion of individual lessons
CREATE TABLE IF NOT EXISTS user_lesson_completions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  time_spent_seconds INTEGER,
  quiz_score DECIMAL(5,2), -- Percentage score for quiz lessons
  quiz_attempts INTEGER DEFAULT 0,
  quiz_passed BOOLEAN DEFAULT false,
  video_watch_percentage DECIMAL(5,2), -- For video lessons
  notes TEXT, -- Student's personal notes
  bookmarked BOOLEAN DEFAULT false,
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_completions_user ON user_lesson_completions(user_id);
CREATE INDEX idx_completions_lesson ON user_lesson_completions(lesson_id);
CREATE INDEX idx_completions_completed_at ON user_lesson_completions(completed_at);

-- =====================================================================
-- TABLE 7: course_certificates
-- =====================================================================
-- Stores issued certificates for course completion
CREATE TABLE IF NOT EXISTS course_certificates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_code VARCHAR(100) UNIQUE NOT NULL, -- e.g., EXCEL-2025-A7B3C9
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  final_score DECIMAL(5,2), -- Average quiz scores
  completion_time_days INTEGER, -- Days from start to completion
  certificate_url VARCHAR(500), -- PDF download link
  verification_url VARCHAR(500), -- Public verification page
  is_valid BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_certificates_user ON course_certificates(user_id);
CREATE INDEX idx_certificates_course ON course_certificates(course_id);
CREATE INDEX idx_certificates_code ON course_certificates(certificate_code);

-- =====================================================================
-- TABLE 8: course_reviews
-- =====================================================================
-- User reviews and ratings for courses
CREATE TABLE IF NOT EXISTS course_reviews (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_title VARCHAR(255),
  review_text TEXT,
  pros JSONB, -- Array of positive points
  cons JSONB, -- Array of negative points
  would_recommend BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_reviews_course ON course_reviews(course_id);
CREATE INDEX idx_reviews_rating ON course_reviews(rating);
CREATE INDEX idx_reviews_created ON course_reviews(created_at);

-- =====================================================================
-- TABLE 9: course_templates
-- =====================================================================
-- Stores downloadable templates (Excel files, documents, etc.)
CREATE TABLE IF NOT EXISTS course_templates (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE CASCADE,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'excel', 'word', 'pdf', 'calculator'
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50), -- 'xlsx', 'docx', 'pdf'
  file_size_kb INTEGER,
  preview_image_url VARCHAR(500),
  download_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false, -- Requires course enrollment
  tags JSONB, -- Array of searchable tags
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_course ON course_templates(course_id);
CREATE INDEX idx_templates_lesson ON course_templates(lesson_id);
CREATE INDEX idx_templates_category ON course_templates(category);
CREATE INDEX idx_templates_premium ON course_templates(is_premium);

-- =====================================================================
-- TABLE 10: course_discussion_threads
-- =====================================================================
-- Q&A discussion threads for lessons
CREATE TABLE IF NOT EXISTS course_discussion_threads (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  question_text TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discussion_lesson ON course_discussion_threads(lesson_id);
CREATE INDEX idx_discussion_user ON course_discussion_threads(user_id);
CREATE INDEX idx_discussion_answered ON course_discussion_threads(is_answered);

-- =====================================================================
-- TABLE 11: course_discussion_replies
-- =====================================================================
-- Replies to discussion threads
CREATE TABLE IF NOT EXISTS course_discussion_replies (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES course_discussion_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  is_instructor_reply BOOLEAN DEFAULT false,
  is_accepted_answer BOOLEAN DEFAULT false,
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_replies_thread ON course_discussion_replies(thread_id);
CREATE INDEX idx_replies_user ON course_discussion_replies(user_id);
CREATE INDEX idx_replies_accepted ON course_discussion_replies(is_accepted_answer);

-- =====================================================================
-- TRIGGERS: Auto-update timestamps
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_reviews_updated_at BEFORE UPDATE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_templates_updated_at BEFORE UPDATE ON course_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_discussion_threads_updated_at BEFORE UPDATE ON course_discussion_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_discussion_replies_updated_at BEFORE UPDATE ON course_discussion_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- AUTO-UPDATE: Course completion percentage
-- =====================================================================

CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_percentage DECIMAL(5,2);
  v_course_id INTEGER;
BEGIN
  -- Get course_id from lesson
  SELECT cm.course_id INTO v_course_id
  FROM course_lessons cl
  JOIN course_modules cm ON cl.module_id = cm.id
  WHERE cl.id = NEW.lesson_id;

  -- Count total required lessons in course
  SELECT COUNT(*) INTO v_total_lessons
  FROM course_lessons cl
  JOIN course_modules cm ON cl.module_id = cm.id
  WHERE cm.course_id = v_course_id AND cl.is_required = true;

  -- Count completed lessons by this user
  SELECT COUNT(*) INTO v_completed_lessons
  FROM user_lesson_completions ulc
  JOIN course_lessons cl ON ulc.lesson_id = cl.id
  JOIN course_modules cm ON cl.module_id = cm.id
  WHERE ulc.user_id = NEW.user_id
    AND cm.course_id = v_course_id
    AND cl.is_required = true;

  -- Calculate percentage
  v_percentage := (v_completed_lessons::DECIMAL / v_total_lessons::DECIMAL) * 100;

  -- Update or insert progress record
  INSERT INTO user_course_progress (
    user_id, course_id, current_lesson_id, completion_percentage,
    total_lessons_completed, total_lessons_count, last_accessed_at,
    is_completed, completed_at
  )
  VALUES (
    NEW.user_id, v_course_id, NEW.lesson_id, v_percentage,
    v_completed_lessons, v_total_lessons, CURRENT_TIMESTAMP,
    (v_percentage >= 100), CASE WHEN v_percentage >= 100 THEN CURRENT_TIMESTAMP ELSE NULL END
  )
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    current_lesson_id = NEW.lesson_id,
    completion_percentage = v_percentage,
    total_lessons_completed = v_completed_lessons,
    total_lessons_count = v_total_lessons,
    last_accessed_at = CURRENT_TIMESTAMP,
    is_completed = (v_percentage >= 100),
    completed_at = CASE WHEN v_percentage >= 100 AND user_course_progress.completed_at IS NULL
                        THEN CURRENT_TIMESTAMP
                        ELSE user_course_progress.completed_at END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_progress
  AFTER INSERT OR UPDATE ON user_lesson_completions
  FOR EACH ROW EXECUTE FUNCTION update_course_progress();

-- =====================================================================
-- AUTO-UPDATE: Course average rating
-- =====================================================================

CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses SET
    average_rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM course_reviews
      WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_rating
  AFTER INSERT OR UPDATE OR DELETE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION update_course_rating();

-- =====================================================================
-- AUTO-UPDATE: Enrollment count
-- =====================================================================

CREATE OR REPLACE FUNCTION update_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses SET
    enrollment_count = (
      SELECT COUNT(*) FROM user_course_enrollments
      WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrollment_count
  AFTER INSERT OR DELETE ON user_course_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_enrollment_count();

-- =====================================================================
-- VERIFICATION QUERY
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Course Platform Schema Created Successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created: 11';
  RAISE NOTICE '  1. courses';
  RAISE NOTICE '  2. course_modules';
  RAISE NOTICE '  3. course_lessons';
  RAISE NOTICE '  4. user_course_enrollments';
  RAISE NOTICE '  5. user_course_progress';
  RAISE NOTICE '  6. user_lesson_completions';
  RAISE NOTICE '  7. course_certificates';
  RAISE NOTICE '  8. course_reviews';
  RAISE NOTICE '  9. course_templates';
  RAISE NOTICE ' 10. course_discussion_threads';
  RAISE NOTICE ' 11. course_discussion_replies';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers created: 10';
  RAISE NOTICE '  - Auto-update timestamps (7 tables)';
  RAISE NOTICE '  - Auto-calculate course progress';
  RAISE NOTICE '  - Auto-update average rating';
  RAISE NOTICE '  - Auto-update enrollment count';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for: Excel Mastery, Finance, Business courses';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- Verification: List all new tables
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'course%'
ORDER BY tablename;
