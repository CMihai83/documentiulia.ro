-- =====================================================
-- PHASE 3: Course Platform / Learning Management System
-- Migration: 005_course_platform.sql
-- Date: 2025-11-21
-- Description: Creates complete LMS infrastructure for course sales and learning
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- COURSES TABLE
-- Main course catalog
-- =====================================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description TEXT,
    description TEXT NOT NULL,
    learning_objectives TEXT[], -- Array of learning objectives
    prerequisites TEXT,
    level VARCHAR(50) CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
    language VARCHAR(10) DEFAULT 'ro',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'RON',
    instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    thumbnail_url VARCHAR(500),
    promo_video_url VARCHAR(500),
    duration_hours DECIMAL(5,2), -- Total course duration in hours
    total_lessons INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    category VARCHAR(100),
    tags TEXT[], -- Array of tags for search
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT false,
    enrollment_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage of students who complete
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

CREATE INDEX idx_courses_company ON courses(company_id);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_featured ON courses(is_featured) WHERE is_featured = true;

COMMENT ON TABLE courses IS 'Main course catalog for LMS';

-- =====================================================
-- COURSE SECTIONS
-- Organize lessons into sections/modules
-- =====================================================
CREATE TABLE IF NOT EXISTS course_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(course_id, order_index)
);

CREATE INDEX idx_course_sections_course ON course_sections(course_id);
CREATE INDEX idx_course_sections_order ON course_sections(course_id, order_index);

COMMENT ON TABLE course_sections IS 'Course modules/sections containing lessons';

-- =====================================================
-- COURSE LESSONS
-- Individual lessons with video/content
-- =====================================================
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) DEFAULT 'video' CHECK (content_type IN ('video', 'text', 'quiz', 'assignment', 'download')),
    video_url VARCHAR(500),
    video_duration INTEGER, -- Duration in seconds
    video_provider VARCHAR(50), -- vimeo, youtube, cloudflare, self-hosted
    content_text TEXT, -- For text-based lessons
    attachments JSONB, -- Array of downloadable files
    order_index INTEGER NOT NULL,
    is_preview BOOLEAN DEFAULT false, -- Allow preview without enrollment
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(section_id, order_index)
);

CREATE INDEX idx_course_lessons_section ON course_lessons(section_id);
CREATE INDEX idx_course_lessons_order ON course_lessons(section_id, order_index);
CREATE INDEX idx_course_lessons_preview ON course_lessons(is_preview) WHERE is_preview = true;

COMMENT ON TABLE course_lessons IS 'Individual lessons within course sections';

-- =====================================================
-- COURSE ENROLLMENTS
-- Track user enrollment in courses
-- =====================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    enrollment_source VARCHAR(50) DEFAULT 'purchase' CHECK (enrollment_source IN ('purchase', 'gift', 'admin', 'subscription')),
    payment_status VARCHAR(50) DEFAULT 'paid' CHECK (payment_status IN ('free', 'pending', 'paid', 'refunded')),
    payment_amount DECIMAL(10,2),
    payment_transaction_id VARCHAR(255), -- Reference to payment_transactions
    stripe_checkout_session_id VARCHAR(255),
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    lessons_completed INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- Total minutes spent
    last_accessed_at TIMESTAMP,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    certificate_issued_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- For time-limited access

    UNIQUE(user_id, course_id),
    CONSTRAINT chk_progress_range CHECK (progress_percentage BETWEEN 0 AND 100)
);

CREATE INDEX idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_status ON course_enrollments(status);
CREATE INDEX idx_enrollments_completed ON course_enrollments(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_enrollments_payment_status ON course_enrollments(payment_status);

COMMENT ON TABLE course_enrollments IS 'User enrollments and progress tracking';

-- =====================================================
-- LESSON PROGRESS
-- Track individual lesson completion
-- =====================================================
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00, -- For video progress
    time_spent INTEGER DEFAULT 0, -- Seconds spent on this lesson
    last_position INTEGER DEFAULT 0, -- Last video position in seconds
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(enrollment_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_completed ON lesson_progress(completed) WHERE completed = true;

COMMENT ON TABLE lesson_progress IS 'Individual lesson completion tracking';

-- =====================================================
-- COURSE QUIZZES
-- Quizzes for lessons
-- =====================================================
CREATE TABLE IF NOT EXISTS course_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- Can be standalone course quiz
    title VARCHAR(255) NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 70, -- Percentage needed to pass
    time_limit INTEGER, -- Time limit in minutes (NULL = no limit)
    attempts_allowed INTEGER, -- NULL = unlimited
    show_correct_answers BOOLEAN DEFAULT true,
    randomize_questions BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quizzes_lesson ON course_quizzes(lesson_id);
CREATE INDEX idx_quizzes_course ON course_quizzes(course_id);

COMMENT ON TABLE course_quizzes IS 'Quizzes associated with lessons or courses';

-- =====================================================
-- QUIZ QUESTIONS
-- Individual quiz questions
-- =====================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
    options JSONB, -- Array of answer options for multiple choice
    correct_answer TEXT NOT NULL,
    explanation TEXT, -- Explanation shown after answering
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(quiz_id, order_index)
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);

COMMENT ON TABLE quiz_questions IS 'Questions for quizzes';

-- =====================================================
-- QUIZ ATTEMPTS
-- Track quiz submissions
-- =====================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    score DECIMAL(5,2) NOT NULL,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    passed BOOLEAN NOT NULL,
    answers JSONB NOT NULL, -- User's answers with correctness
    time_taken INTEGER, -- Seconds taken
    started_at TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_attempt_number CHECK (attempt_number > 0)
);

CREATE INDEX idx_quiz_attempts_enrollment ON quiz_attempts(enrollment_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_passed ON quiz_attempts(passed) WHERE passed = true;

COMMENT ON TABLE quiz_attempts IS 'Student quiz attempt records';

-- =====================================================
-- COURSE CERTIFICATES
-- Completion certificates
-- =====================================================
CREATE TABLE IF NOT EXISTS course_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL UNIQUE REFERENCES course_enrollments(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    certificate_url VARCHAR(500),
    certificate_pdf_path VARCHAR(500),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP, -- For certifications with expiry
    verification_code VARCHAR(50) UNIQUE NOT NULL,
    metadata JSONB -- Additional certificate data
);

CREATE INDEX idx_certificates_enrollment ON course_certificates(enrollment_id);
CREATE INDEX idx_certificates_verification ON course_certificates(verification_code);

COMMENT ON TABLE course_certificates IS 'Course completion certificates';

-- =====================================================
-- COURSE REVIEWS
-- Student reviews and ratings
-- =====================================================
CREATE TABLE IF NOT EXISTS course_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL UNIQUE REFERENCES course_enrollments(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_title VARCHAR(255),
    review_text TEXT,
    is_published BOOLEAN DEFAULT true,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_course ON course_reviews(course_id);
CREATE INDEX idx_reviews_user ON course_reviews(user_id);
CREATE INDEX idx_reviews_rating ON course_reviews(rating);
CREATE INDEX idx_reviews_published ON course_reviews(is_published) WHERE is_published = true;

COMMENT ON TABLE course_reviews IS 'Student course reviews and ratings';

-- =====================================================
-- COURSE INSTRUCTORS
-- Extended instructor profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS course_instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    expertise TEXT[], -- Array of expertise areas
    website VARCHAR(255),
    linkedin VARCHAR(255),
    twitter VARCHAR(255),
    avatar_url VARCHAR(500),
    total_students INTEGER DEFAULT 0,
    total_courses INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_instructors_user ON course_instructors(user_id);

COMMENT ON TABLE course_instructors IS 'Extended profiles for course instructors';

-- =====================================================
-- COURSE ANNOUNCEMENTS
-- Instructor announcements to enrolled students
-- =====================================================
CREATE TABLE IF NOT EXISTS course_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_course ON course_announcements(course_id);
CREATE INDEX idx_announcements_published ON course_announcements(is_published, created_at DESC);

COMMENT ON TABLE course_announcements IS 'Course announcements from instructors';

-- =====================================================
-- COURSE DISCUSSIONS (Q&A)
-- Student questions and discussions
-- =====================================================
CREATE TABLE IF NOT EXISTS course_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES course_discussions(id) ON DELETE CASCADE, -- For replies
    title VARCHAR(255),
    content TEXT NOT NULL,
    is_question BOOLEAN DEFAULT false,
    is_answered BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discussions_course ON course_discussions(course_id);
CREATE INDEX idx_discussions_lesson ON course_discussions(lesson_id);
CREATE INDEX idx_discussions_user ON course_discussions(user_id);
CREATE INDEX idx_discussions_parent ON course_discussions(parent_id);
CREATE INDEX idx_discussions_questions ON course_discussions(is_question) WHERE is_question = true;

COMMENT ON TABLE course_discussions IS 'Course Q&A and discussions';

-- =====================================================
-- COURSE WISHLISTS
-- Track courses users want to purchase
-- =====================================================
CREATE TABLE IF NOT EXISTS course_wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_wishlists_user ON course_wishlists(user_id);
CREATE INDEX idx_wishlists_course ON course_wishlists(course_id);

COMMENT ON TABLE course_wishlists IS 'User course wishlists';

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update course stats trigger
CREATE OR REPLACE FUNCTION update_course_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE courses SET
            enrollment_count = (SELECT COUNT(*) FROM course_enrollments WHERE course_id = NEW.course_id AND status != 'cancelled'),
            average_rating = (SELECT COALESCE(AVG(rating), 0) FROM course_reviews WHERE course_id = NEW.course_id AND is_published = true),
            review_count = (SELECT COUNT(*) FROM course_reviews WHERE course_id = NEW.course_id AND is_published = true),
            updated_at = NOW()
        WHERE id = NEW.course_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_course_stats_enrollment ON course_enrollments;
CREATE TRIGGER trigger_update_course_stats_enrollment
    AFTER INSERT OR UPDATE ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_course_stats();

DROP TRIGGER IF EXISTS trigger_update_course_stats_review ON course_reviews;
CREATE TRIGGER trigger_update_course_stats_review
    AFTER INSERT OR UPDATE OR DELETE ON course_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_course_stats();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_sections_updated_at ON course_sections;
CREATE TRIGGER update_course_sections_updated_at
    BEFORE UPDATE ON course_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_lessons_updated_at ON course_lessons;
CREATE TRIGGER update_course_lessons_updated_at
    BEFORE UPDATE ON course_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON courses TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_sections TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_lessons TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_enrollments TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_progress TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_quizzes TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_questions TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON quiz_attempts TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_certificates TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_reviews TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_instructors TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_announcements TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_discussions TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_wishlists TO accountech_app;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample instructor profile
INSERT INTO course_instructors (user_id, bio, expertise, total_students, total_courses, average_rating)
SELECT id,
       'Expert in business education and Excel mastery. 10+ years teaching experience.',
       ARRAY['Excel', 'Business Analytics', 'Data Visualization', 'Financial Modeling'],
       0, 0, 0.00
FROM users
WHERE email = 'test_admin@accountech.com'
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 005_course_platform.sql completed successfully';
    RAISE NOTICE '   - Created 14 tables for complete LMS';
    RAISE NOTICE '   - Created courses, sections, lessons structure';
    RAISE NOTICE '   - Created enrollment and progress tracking';
    RAISE NOTICE '   - Created quiz and assessment system';
    RAISE NOTICE '   - Created certificate generation system';
    RAISE NOTICE '   - Created reviews and discussion forums';
    RAISE NOTICE '   - Added triggers for automatic stats updates';
    RAISE NOTICE '   - System ready for course platform launch';
END $$;
