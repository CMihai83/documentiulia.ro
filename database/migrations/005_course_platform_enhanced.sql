-- =====================================================
-- PHASE 3: Course Platform / LMS Enhancement
-- Migration: 005_course_platform_enhanced.sql
-- Date: 2025-11-21
-- Description: Enhances existing LMS with missing tables (quizzes, announcements)
--              Works with existing INTEGER-based schema
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: ADD MISSING COLUMNS TO EXISTING COURSES TABLE
-- =====================================================

-- Add company_id for multi-tenant support
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add instructor_id as foreign key (replace instructor_name string)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add slug for SEO-friendly URLs
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- Add short_description for catalog listings
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Add level field
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS level VARCHAR(50) CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all_levels'));

-- Add language field
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ro';

-- Add currency field
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'RON';

-- Add total_quizzes counter
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS total_quizzes INTEGER DEFAULT 0;

-- Add tags for search
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add completion_rate metric
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0.00;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_courses_company ON courses(company_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);

-- =====================================================
-- STEP 2: ADD MISSING COLUMNS TO EXISTING USER_COURSE_ENROLLMENTS
-- =====================================================

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS lessons_completed INTEGER DEFAULT 0;

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0;

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP;

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMP;

ALTER TABLE user_course_enrollments
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired'));

-- =====================================================
-- STEP 3: ADD MISSING COLUMNS TO USER_COURSE_PROGRESS
-- =====================================================

ALTER TABLE user_course_progress
ADD COLUMN IF NOT EXISTS last_position INTEGER DEFAULT 0;

-- =====================================================
-- STEP 4: ADD MISSING COLUMNS TO COURSE_MODULES
-- =====================================================

ALTER TABLE course_modules
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE course_modules
ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Update order_index from module_number if not set
UPDATE course_modules SET order_index = module_number WHERE order_index IS NULL;

-- =====================================================
-- STEP 5: ADD MISSING COLUMNS TO COURSE_LESSONS
-- =====================================================

ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS video_provider VARCHAR(50);

ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS content_text TEXT;

ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS attachments JSONB;

ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Rename content_url to video_url for consistency
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'course_lessons' AND column_name = 'content_url'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'course_lessons' AND column_name = 'video_url'
    ) THEN
        ALTER TABLE course_lessons RENAME COLUMN content_url TO video_url;
    END IF;
END $$;

-- =====================================================
-- STEP 6: ADD MISSING COLUMNS TO USER_LESSON_COMPLETIONS
-- =====================================================

ALTER TABLE user_lesson_completions
ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE user_lesson_completions
ADD COLUMN IF NOT EXISTS last_position INTEGER DEFAULT 0;

-- =====================================================
-- STEP 7: CREATE MISSING TABLES (QUIZZES)
-- =====================================================

-- Course Quizzes Table
CREATE TABLE IF NOT EXISTS course_quizzes (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES course_lessons(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 70,
    time_limit INTEGER,
    attempts_allowed INTEGER,
    show_correct_answers BOOLEAN DEFAULT true,
    randomize_questions BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON course_quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON course_quizzes(course_id);

COMMENT ON TABLE course_quizzes IS 'Quizzes associated with lessons or courses';

-- Quiz Questions Table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(quiz_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);

COMMENT ON TABLE quiz_questions IS 'Questions for quizzes';

-- Quiz Attempts Table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id INTEGER NOT NULL REFERENCES user_course_enrollments(id) ON DELETE CASCADE,
    quiz_id INTEGER NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    score DECIMAL(5,2) NOT NULL,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    passed BOOLEAN NOT NULL,
    answers JSONB NOT NULL,
    time_taken INTEGER,
    started_at TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_attempt_number CHECK (attempt_number > 0)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_enrollment ON quiz_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_passed ON quiz_attempts(passed) WHERE passed = true;

COMMENT ON TABLE quiz_attempts IS 'Student quiz attempt records';

-- =====================================================
-- STEP 8: CREATE COURSE ANNOUNCEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS course_announcements (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_course ON course_announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON course_announcements(is_published, created_at DESC);

COMMENT ON TABLE course_announcements IS 'Course announcements from instructors';

-- =====================================================
-- STEP 9: CREATE COURSE WISHLISTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS course_wishlists (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON course_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_course ON course_wishlists(course_id);

COMMENT ON TABLE course_wishlists IS 'User course wishlists';

-- =====================================================
-- STEP 10: UPDATE EXISTING TRIGGERS
-- =====================================================

-- Update course stats function to work with INTEGER IDs
CREATE OR REPLACE FUNCTION update_course_enrollment_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE courses SET
            enrollment_count = (
                SELECT COUNT(*)
                FROM user_course_enrollments
                WHERE course_id = NEW.course_id
                AND (status IS NULL OR status != 'cancelled')
            ),
            updated_at = NOW()
        WHERE id = NEW.course_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE courses SET
            enrollment_count = (
                SELECT COUNT(*)
                FROM user_course_enrollments
                WHERE course_id = OLD.course_id
                AND (status IS NULL OR status != 'cancelled')
            ),
            updated_at = NOW()
        WHERE id = OLD.course_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_enrollment_stats ON user_course_enrollments;
CREATE TRIGGER trigger_update_enrollment_stats
    AFTER INSERT OR UPDATE OR DELETE ON user_course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_course_enrollment_stats();

-- Update course completion percentage
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_total_lessons INTEGER;
    v_completed_lessons INTEGER;
BEGIN
    -- Get total lessons for the course
    SELECT COUNT(*)
    INTO v_total_lessons
    FROM course_lessons cl
    JOIN course_modules cm ON cl.module_id = cm.id
    JOIN user_course_enrollments uce ON cm.course_id = uce.course_id
    WHERE uce.id = NEW.user_id;

    -- Get completed lessons
    SELECT COUNT(*)
    INTO v_completed_lessons
    FROM user_lesson_completions
    WHERE user_id = NEW.user_id
    AND lesson_id IN (
        SELECT cl.id
        FROM course_lessons cl
        JOIN course_modules cm ON cl.module_id = cm.id
        JOIN user_course_enrollments uce ON cm.course_id = uce.course_id
        WHERE uce.user_id = NEW.user_id
    );

    -- Update enrollment progress
    UPDATE user_course_enrollments
    SET
        lessons_completed = v_completed_lessons,
        progress_percentage = CASE
            WHEN v_total_lessons > 0 THEN (v_completed_lessons::DECIMAL / v_total_lessons) * 100
            ELSE 0
        END,
        last_accessed_at = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON user_lesson_completions;
CREATE TRIGGER trigger_update_enrollment_progress
    AFTER INSERT OR UPDATE ON user_lesson_completions
    FOR EACH ROW
    EXECUTE FUNCTION update_enrollment_progress();

-- =====================================================
-- STEP 11: GRANT PERMISSIONS ON NEW TABLES
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON course_quizzes TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_questions TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_attempts TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_announcements TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_wishlists TO accountech_app;

GRANT USAGE, SELECT ON SEQUENCE course_quizzes_id_seq TO accountech_app;
GRANT USAGE, SELECT ON SEQUENCE quiz_questions_id_seq TO accountech_app;
GRANT USAGE, SELECT ON SEQUENCE quiz_attempts_id_seq TO accountech_app;
GRANT USAGE, SELECT ON SEQUENCE course_announcements_id_seq TO accountech_app;
GRANT USAGE, SELECT ON SEQUENCE course_wishlists_id_seq TO accountech_app;

-- =====================================================
-- STEP 12: POPULATE SLUG FOR EXISTING COURSES
-- =====================================================

UPDATE courses
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 005_course_platform_enhanced.sql completed successfully';
    RAISE NOTICE '   - Enhanced existing courses table with 12 new columns';
    RAISE NOTICE '   - Enhanced existing enrollments table with 10 new columns';
    RAISE NOTICE '   - Enhanced existing progress table';
    RAISE NOTICE '   - Enhanced existing modules and lessons tables';
    RAISE NOTICE '   - Created course_quizzes table (quiz system)';
    RAISE NOTICE '   - Created quiz_questions table';
    RAISE NOTICE '   - Created quiz_attempts table';
    RAISE NOTICE '   - Created course_announcements table';
    RAISE NOTICE '   - Created course_wishlists table';
    RAISE NOTICE '   - Updated triggers for enrollment and progress tracking';
    RAISE NOTICE '   - System ready for complete LMS functionality';
    RAISE NOTICE '   ';
    RAISE NOTICE '📊 EXISTING TABLES ENHANCED:';
    RAISE NOTICE '   - courses (added company_id, instructor_id, slug, level, etc.)';
    RAISE NOTICE '   - user_course_enrollments (added progress tracking)';
    RAISE NOTICE '   - user_course_progress (added video position tracking)';
    RAISE NOTICE '   - course_modules (added description, order_index)';
    RAISE NOTICE '   - course_lessons (added video_url, attachments, etc.)';
    RAISE NOTICE '   ';
    RAISE NOTICE '🆕 NEW TABLES CREATED:';
    RAISE NOTICE '   - course_quizzes (quiz management)';
    RAISE NOTICE '   - quiz_questions (quiz questions)';
    RAISE NOTICE '   - quiz_attempts (student quiz submissions)';
    RAISE NOTICE '   - course_announcements (instructor announcements)';
    RAISE NOTICE '   - course_wishlists (save courses for later)';
END $$;
