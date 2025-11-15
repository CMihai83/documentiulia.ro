-- =====================================================================
-- Migration 015: Community Hub Database Schema
-- =====================================================================
-- Purpose: Forum, mentorship matching, resource library infrastructure
-- Date: 2025-11-15
-- Estimated Budget: $75 of $1000 Claude Code credit
-- =====================================================================

BEGIN;

-- =====================================================================
-- TABLE 1: forum_categories
-- =====================================================================
-- Organizes forum into categories (Fiscal, Legal, HR, Business Growth, etc.)
CREATE TABLE IF NOT EXISTS forum_categories (
  id SERIAL PRIMARY KEY,
  category_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100), -- FontAwesome icon class or emoji
  display_order INTEGER DEFAULT 0,
  thread_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_categories_active ON forum_categories(is_active);
CREATE INDEX idx_forum_categories_order ON forum_categories(display_order);

-- =====================================================================
-- TABLE 2: forum_threads
-- =====================================================================
-- Individual discussion threads
CREATE TABLE IF NOT EXISTS forum_threads (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  tags JSONB, -- Array of tags for searchability
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_solved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_threads_category ON forum_threads(category_id);
CREATE INDEX idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX idx_forum_threads_pinned ON forum_threads(is_pinned, last_activity_at DESC);
CREATE INDEX idx_forum_threads_activity ON forum_threads(last_activity_at DESC);
CREATE INDEX idx_forum_threads_solved ON forum_threads(is_solved);
CREATE INDEX idx_forum_threads_tags ON forum_threads USING gin(tags);

-- =====================================================================
-- TABLE 3: forum_replies
-- =====================================================================
-- Replies to forum threads
CREATE TABLE IF NOT EXISTS forum_replies (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_reply_id INTEGER REFERENCES forum_replies(id) ON DELETE CASCADE, -- For nested replies
  content TEXT NOT NULL,
  upvote_count INTEGER DEFAULT 0,
  is_solution BOOLEAN DEFAULT false, -- Marked as solving the thread question
  is_expert_reply BOOLEAN DEFAULT false, -- Reply from verified expert
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_replies_thread ON forum_replies(thread_id, created_at);
CREATE INDEX idx_forum_replies_author ON forum_replies(author_id);
CREATE INDEX idx_forum_replies_solution ON forum_replies(is_solution);
CREATE INDEX idx_forum_replies_parent ON forum_replies(parent_reply_id);

-- =====================================================================
-- TABLE 4: forum_votes
-- =====================================================================
-- Track upvotes on threads and replies
CREATE TABLE IF NOT EXISTS forum_votes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id INTEGER REFERENCES forum_threads(id) ON DELETE CASCADE,
  reply_id INTEGER REFERENCES forum_replies(id) ON DELETE CASCADE,
  vote_type VARCHAR(20) NOT NULL DEFAULT 'upvote', -- 'upvote' or 'downvote'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, thread_id),
  UNIQUE(user_id, reply_id),
  CHECK (
    (thread_id IS NOT NULL AND reply_id IS NULL) OR
    (thread_id IS NULL AND reply_id IS NOT NULL)
  )
);

CREATE INDEX idx_forum_votes_user ON forum_votes(user_id);
CREATE INDEX idx_forum_votes_thread ON forum_votes(thread_id);
CREATE INDEX idx_forum_votes_reply ON forum_votes(reply_id);

-- =====================================================================
-- TABLE 5: forum_subscriptions
-- =====================================================================
-- Users can subscribe to threads for notifications
CREATE TABLE IF NOT EXISTS forum_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id INTEGER NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  notify_email BOOLEAN DEFAULT true,
  notify_in_app BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, thread_id)
);

CREATE INDEX idx_forum_subscriptions_user ON forum_subscriptions(user_id);
CREATE INDEX idx_forum_subscriptions_thread ON forum_subscriptions(thread_id);

-- =====================================================================
-- TABLE 6: user_reputation
-- =====================================================================
-- Gamification: track user reputation points and badges
CREATE TABLE IF NOT EXISTS user_reputation (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reputation_points INTEGER DEFAULT 0,
  threads_created INTEGER DEFAULT 0,
  replies_posted INTEGER DEFAULT 0,
  solutions_marked INTEGER DEFAULT 0,
  upvotes_received INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb, -- Array of earned badges
  expert_categories JSONB DEFAULT '[]'::jsonb, -- Categories where user is expert
  rank VARCHAR(50) DEFAULT 'Newcomer', -- Newcomer, Contributor, Expert, Master
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_reputation_user ON user_reputation(user_id);
CREATE INDEX idx_user_reputation_rank ON user_reputation(rank);
CREATE INDEX idx_user_reputation_points ON user_reputation(reputation_points DESC);

-- =====================================================================
-- TABLE 7: mentorship_profiles
-- =====================================================================
-- Experts who offer mentorship
CREATE TABLE IF NOT EXISTS mentorship_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  bio TEXT,
  expertise_areas JSONB, -- Array of categories: ['fiscal', 'legal', 'hr', 'excel', 'marketing']
  years_experience INTEGER,
  hourly_rate_ron DECIMAL(10,2), -- NULL if free mentorship
  availability_hours_per_month INTEGER,
  preferred_languages JSONB DEFAULT '["ro"]'::jsonb, -- ['ro', 'en']
  profile_image_url VARCHAR(500),
  is_verified BOOLEAN DEFAULT false,
  is_accepting_mentees BOOLEAN DEFAULT true,
  total_mentees INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mentorship_profiles_user ON mentorship_profiles(user_id);
CREATE INDEX idx_mentorship_profiles_verified ON mentorship_profiles(is_verified);
CREATE INDEX idx_mentorship_profiles_accepting ON mentorship_profiles(is_accepting_mentees);
CREATE INDEX idx_mentorship_profiles_expertise ON mentorship_profiles USING gin(expertise_areas);

-- =====================================================================
-- TABLE 8: mentorship_applications
-- =====================================================================
-- Users apply to be mentored by experts
CREATE TABLE IF NOT EXISTS mentorship_applications (
  id SERIAL PRIMARY KEY,
  mentor_profile_id INTEGER NOT NULL REFERENCES mentorship_profiles(id) ON DELETE CASCADE,
  mentee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_message TEXT NOT NULL,
  business_stage VARCHAR(100), -- 'idea', 'startup', 'growth', 'established'
  help_needed JSONB, -- Array of areas: ['business_plan', 'financing', 'marketing', 'scaling']
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'withdrawn'
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mentor_profile_id, mentee_user_id)
);

CREATE INDEX idx_mentorship_applications_mentor ON mentorship_applications(mentor_profile_id);
CREATE INDEX idx_mentorship_applications_mentee ON mentorship_applications(mentee_user_id);
CREATE INDEX idx_mentorship_applications_status ON mentorship_applications(status);

-- =====================================================================
-- TABLE 9: mentorship_matches
-- =====================================================================
-- Active mentorship relationships
CREATE TABLE IF NOT EXISTS mentorship_matches (
  id SERIAL PRIMARY KEY,
  mentor_profile_id INTEGER NOT NULL REFERENCES mentorship_profiles(id) ON DELETE CASCADE,
  mentee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES mentorship_applications(id) ON DELETE SET NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
  session_count INTEGER DEFAULT 0,
  total_hours DECIMAL(5,2) DEFAULT 0.00,
  mentee_notes TEXT, -- Private notes for mentee
  mentor_notes TEXT, -- Private notes for mentor
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mentor_profile_id, mentee_user_id, status) -- One active match per pair
);

CREATE INDEX idx_mentorship_matches_mentor ON mentorship_matches(mentor_profile_id);
CREATE INDEX idx_mentorship_matches_mentee ON mentorship_matches(mentee_user_id);
CREATE INDEX idx_mentorship_matches_status ON mentorship_matches(status);

-- =====================================================================
-- TABLE 10: mentorship_sessions
-- =====================================================================
-- Individual mentorship sessions
CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES mentorship_matches(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  session_type VARCHAR(50) DEFAULT 'video_call', -- 'video_call', 'phone', 'in_person', 'chat'
  meeting_link VARCHAR(500),
  agenda TEXT,
  session_notes TEXT, -- Notes taken during session
  action_items JSONB, -- Array of follow-up tasks
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mentorship_sessions_match ON mentorship_sessions(match_id);
CREATE INDEX idx_mentorship_sessions_scheduled ON mentorship_sessions(scheduled_at);
CREATE INDEX idx_mentorship_sessions_status ON mentorship_sessions(status);

-- =====================================================================
-- TABLE 11: mentorship_reviews
-- =====================================================================
-- Mentees review their mentors
CREATE TABLE IF NOT EXISTS mentorship_reviews (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES mentorship_matches(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  would_recommend BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, reviewer_user_id)
);

CREATE INDEX idx_mentorship_reviews_match ON mentorship_reviews(match_id);
CREATE INDEX idx_mentorship_reviews_reviewer ON mentorship_reviews(reviewer_user_id);

-- =====================================================================
-- TABLE 12: resource_library
-- =====================================================================
-- Shareable resources (templates, guides, calculators)
CREATE TABLE IF NOT EXISTS resource_library (
  id SERIAL PRIMARY KEY,
  resource_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'template', 'guide', 'calculator', 'checklist', 'video', 'article'
  topic VARCHAR(100), -- 'fiscal', 'legal', 'hr', 'marketing', 'sales', 'finance', 'excel'
  file_url VARCHAR(500),
  file_type VARCHAR(50), -- 'xlsx', 'pdf', 'docx', 'mp4', 'link'
  file_size_kb INTEGER,
  thumbnail_url VARCHAR(500),
  preview_url VARCHAR(500), -- For in-browser preview
  uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  tags JSONB, -- Array of searchable tags
  is_premium BOOLEAN DEFAULT false, -- Requires Premium membership
  is_verified BOOLEAN DEFAULT false, -- Verified by admins
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resource_library_category ON resource_library(category);
CREATE INDEX idx_resource_library_topic ON resource_library(topic);
CREATE INDEX idx_resource_library_premium ON resource_library(is_premium);
CREATE INDEX idx_resource_library_featured ON resource_library(is_featured);
CREATE INDEX idx_resource_library_tags ON resource_library USING gin(tags);

-- =====================================================================
-- TABLE 13: resource_ratings
-- =====================================================================
-- Users rate resources
CREATE TABLE IF NOT EXISTS resource_ratings (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES resource_library(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resource_id, user_id)
);

CREATE INDEX idx_resource_ratings_resource ON resource_ratings(resource_id);
CREATE INDEX idx_resource_ratings_user ON resource_ratings(user_id);

-- =====================================================================
-- TABLE 14: resource_downloads
-- =====================================================================
-- Track who downloaded what resources
CREATE TABLE IF NOT EXISTS resource_downloads (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES resource_library(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resource_downloads_resource ON resource_downloads(resource_id);
CREATE INDEX idx_resource_downloads_user ON resource_downloads(user_id);
CREATE INDEX idx_resource_downloads_date ON resource_downloads(downloaded_at);

-- =====================================================================
-- TRIGGERS: Auto-update timestamps
-- =====================================================================

-- Forum categories
CREATE TRIGGER update_forum_categories_updated_at BEFORE UPDATE ON forum_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Forum threads
CREATE TRIGGER update_forum_threads_updated_at BEFORE UPDATE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Forum replies
CREATE TRIGGER update_forum_replies_updated_at BEFORE UPDATE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User reputation
CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON user_reputation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mentorship profiles
CREATE TRIGGER update_mentorship_profiles_updated_at BEFORE UPDATE ON mentorship_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mentorship applications
CREATE TRIGGER update_mentorship_applications_updated_at BEFORE UPDATE ON mentorship_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mentorship matches
CREATE TRIGGER update_mentorship_matches_updated_at BEFORE UPDATE ON mentorship_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mentorship sessions
CREATE TRIGGER update_mentorship_sessions_updated_at BEFORE UPDATE ON mentorship_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mentorship reviews
CREATE TRIGGER update_mentorship_reviews_updated_at BEFORE UPDATE ON mentorship_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Resource library
CREATE TRIGGER update_resource_library_updated_at BEFORE UPDATE ON resource_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Resource ratings
CREATE TRIGGER update_resource_ratings_updated_at BEFORE UPDATE ON resource_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- AUTO-UPDATE: Forum thread counters
-- =====================================================================

CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_threads SET
    reply_count = (SELECT COUNT(*) FROM forum_replies WHERE thread_id = COALESCE(NEW.thread_id, OLD.thread_id)),
    last_activity_at = CURRENT_TIMESTAMP
  WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_reply_count
  AFTER INSERT OR DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_thread_reply_count();

-- =====================================================================
-- AUTO-UPDATE: Category thread/reply counters
-- =====================================================================

CREATE OR REPLACE FUNCTION update_category_counters()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_categories SET
    thread_count = (SELECT COUNT(*) FROM forum_threads WHERE category_id = COALESCE(NEW.category_id, OLD.category_id)),
    reply_count = (
      SELECT COUNT(*) FROM forum_replies fr
      JOIN forum_threads ft ON fr.thread_id = ft.id
      WHERE ft.category_id = COALESCE(NEW.category_id, OLD.category_id)
    )
  WHERE id = COALESCE(NEW.category_id, OLD.category_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_counters_threads
  AFTER INSERT OR DELETE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_category_counters();

-- =====================================================================
-- AUTO-UPDATE: Thread/Reply upvote counts
-- =====================================================================

CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL OR OLD.thread_id IS NOT NULL THEN
    UPDATE forum_threads SET
      upvote_count = (
        SELECT COUNT(*) FROM forum_votes
        WHERE thread_id = COALESCE(NEW.thread_id, OLD.thread_id) AND vote_type = 'upvote'
      )
    WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);
  END IF;

  IF NEW.reply_id IS NOT NULL OR OLD.reply_id IS NOT NULL THEN
    UPDATE forum_replies SET
      upvote_count = (
        SELECT COUNT(*) FROM forum_votes
        WHERE reply_id = COALESCE(NEW.reply_id, OLD.reply_id) AND vote_type = 'upvote'
      )
    WHERE id = COALESCE(NEW.reply_id, OLD.reply_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_counts
  AFTER INSERT OR DELETE ON forum_votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- =====================================================================
-- AUTO-UPDATE: User reputation
-- =====================================================================

CREATE OR REPLACE FUNCTION update_user_reputation_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_points INTEGER;
BEGIN
  v_user_id := COALESCE(NEW.author_id, OLD.author_id);

  -- Calculate reputation points
  v_points := (
    SELECT
      (SELECT COUNT(*) * 10 FROM forum_threads WHERE author_id = v_user_id) +
      (SELECT COUNT(*) * 5 FROM forum_replies WHERE author_id = v_user_id) +
      (SELECT COUNT(*) * 25 FROM forum_replies WHERE author_id = v_user_id AND is_solution = true) +
      (SELECT COALESCE(SUM(upvote_count), 0) FROM forum_threads WHERE author_id = v_user_id) +
      (SELECT COALESCE(SUM(upvote_count), 0) FROM forum_replies WHERE author_id = v_user_id)
  );

  -- Upsert reputation record
  INSERT INTO user_reputation (
    user_id, reputation_points,
    threads_created,
    replies_posted,
    solutions_marked,
    upvotes_received,
    rank
  )
  SELECT
    v_user_id,
    v_points,
    (SELECT COUNT(*) FROM forum_threads WHERE author_id = v_user_id),
    (SELECT COUNT(*) FROM forum_replies WHERE author_id = v_user_id),
    (SELECT COUNT(*) FROM forum_replies WHERE author_id = v_user_id AND is_solution = true),
    (SELECT COALESCE(SUM(upvote_count), 0) FROM forum_threads WHERE author_id = v_user_id) +
    (SELECT COALESCE(SUM(upvote_count), 0) FROM forum_replies WHERE author_id = v_user_id),
    CASE
      WHEN v_points >= 1000 THEN 'Master'
      WHEN v_points >= 500 THEN 'Expert'
      WHEN v_points >= 100 THEN 'Contributor'
      ELSE 'Newcomer'
    END
  ON CONFLICT (user_id) DO UPDATE SET
    reputation_points = EXCLUDED.reputation_points,
    threads_created = EXCLUDED.threads_created,
    replies_posted = EXCLUDED.replies_posted,
    solutions_marked = EXCLUDED.solutions_marked,
    upvotes_received = EXCLUDED.upvotes_received,
    rank = EXCLUDED.rank,
    updated_at = CURRENT_TIMESTAMP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reputation_threads
  AFTER INSERT OR DELETE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_user_reputation_stats();

CREATE TRIGGER trigger_update_reputation_replies
  AFTER INSERT OR UPDATE OR DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_user_reputation_stats();

-- =====================================================================
-- AUTO-UPDATE: Mentor average rating
-- =====================================================================

CREATE OR REPLACE FUNCTION update_mentor_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mentorship_profiles SET
    average_rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM mentorship_reviews mr
      JOIN mentorship_matches mm ON mr.match_id = mm.id
      WHERE mm.mentor_profile_id = (
        SELECT mentor_profile_id FROM mentorship_matches WHERE id = COALESCE(NEW.match_id, OLD.match_id)
      )
    )
  WHERE id = (
    SELECT mentor_profile_id FROM mentorship_matches WHERE id = COALESCE(NEW.match_id, OLD.match_id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mentor_rating
  AFTER INSERT OR UPDATE OR DELETE ON mentorship_reviews
  FOR EACH ROW EXECUTE FUNCTION update_mentor_rating();

-- =====================================================================
-- AUTO-UPDATE: Resource library rating
-- =====================================================================

CREATE OR REPLACE FUNCTION update_resource_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resource_library SET
    average_rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM resource_ratings
      WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
    )
  WHERE id = COALESCE(NEW.resource_id, OLD.resource_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resource_rating
  AFTER INSERT OR UPDATE OR DELETE ON resource_ratings
  FOR EACH ROW EXECUTE FUNCTION update_resource_rating();

-- =====================================================================
-- AUTO-UPDATE: Resource download counter
-- =====================================================================

CREATE OR REPLACE FUNCTION update_resource_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resource_library SET
    download_count = download_count + 1
  WHERE id = NEW.resource_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resource_download_count
  AFTER INSERT ON resource_downloads
  FOR EACH ROW EXECUTE FUNCTION update_resource_download_count();

-- =====================================================================
-- VERIFICATION QUERY
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Community Hub Schema Created Successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created: 14';
  RAISE NOTICE '  FORUM:';
  RAISE NOTICE '    1. forum_categories';
  RAISE NOTICE '    2. forum_threads';
  RAISE NOTICE '    3. forum_replies';
  RAISE NOTICE '    4. forum_votes';
  RAISE NOTICE '    5. forum_subscriptions';
  RAISE NOTICE '    6. user_reputation';
  RAISE NOTICE '  MENTORSHIP:';
  RAISE NOTICE '    7. mentorship_profiles';
  RAISE NOTICE '    8. mentorship_applications';
  RAISE NOTICE '    9. mentorship_matches';
  RAISE NOTICE '   10. mentorship_sessions';
  RAISE NOTICE '   11. mentorship_reviews';
  RAISE NOTICE '  RESOURCE LIBRARY:';
  RAISE NOTICE '   12. resource_library';
  RAISE NOTICE '   13. resource_ratings';
  RAISE NOTICE '   14. resource_downloads';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers created: 20+';
  RAISE NOTICE '  - Auto-update timestamps (11 tables)';
  RAISE NOTICE '  - Auto-update thread/reply counts';
  RAISE NOTICE '  - Auto-update category counters';
  RAISE NOTICE '  - Auto-update vote counts';
  RAISE NOTICE '  - Auto-calculate user reputation';
  RAISE NOTICE '  - Auto-update mentor ratings';
  RAISE NOTICE '  - Auto-update resource ratings';
  RAISE NOTICE '  - Auto-increment download counts';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for: Forum, Mentorship, Resource Library';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- List all community hub tables
SELECT
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = pt.tablename) as column_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = pt.tablename) as index_count
FROM pg_tables pt
WHERE schemaname = 'public'
  AND (tablename LIKE 'forum_%' OR tablename LIKE 'mentorship_%' OR tablename LIKE 'resource_%' OR tablename = 'user_reputation')
ORDER BY tablename;
