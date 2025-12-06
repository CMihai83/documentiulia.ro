-- ================================================================
-- Community Forum & Q&A System - Database Schema
-- ================================================================
-- This migration creates the complete database structure for:
-- 1. Community Forum (discussions, threads, posts)
-- 2. Q&A System (questions, answers, voting)
-- 3. Reputation System (points, badges, rankings)
-- 4. Moderation Tools (flags, reports, moderation queue)
-- ================================================================

-- ================================================================
-- 1. FORUM CATEGORIES
-- ================================================================
CREATE TABLE IF NOT EXISTS forum_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100), -- Font Awesome icon class
    color VARCHAR(7), -- Hex color code
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    parent_id INTEGER REFERENCES forum_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_categories_slug ON forum_categories(slug);
CREATE INDEX idx_forum_categories_parent ON forum_categories(parent_id);
CREATE INDEX idx_forum_categories_active ON forum_categories(is_active);

-- Insert default categories
INSERT INTO forum_categories (name, slug, description, icon, color, order_index) VALUES
    ('General Discussion', 'general', 'General business and finance discussions', 'fa-comments', '#3B82F6', 1),
    ('Accounting & Bookkeeping', 'accounting', 'Questions about accounting, bookkeeping, and financial records', 'fa-calculator', '#10B981', 2),
    ('Tax & Legal', 'tax-legal', 'Romanian tax law, legal compliance, and regulations', 'fa-gavel', '#F59E0B', 3),
    ('Finance & Budgeting', 'finance', 'Financial planning, budgeting, and cash flow management', 'fa-chart-line', '#8B5CF6', 4),
    ('Business Growth', 'growth', 'Marketing, sales, scaling, and business strategy', 'fa-rocket', '#EF4444', 5),
    ('Technology & Tools', 'technology', 'Software, tools, and technology for business', 'fa-laptop', '#06B6D4', 6),
    ('Platform Support', 'support', 'Help with using DocumentIulia platform', 'fa-life-ring', '#6B7280', 7);

-- ================================================================
-- 2. FORUM THREADS (DISCUSSIONS)
-- ================================================================
CREATE TABLE IF NOT EXISTS forum_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INTEGER NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    thread_type VARCHAR(50) DEFAULT 'discussion', -- discussion, question, announcement

    -- Metadata
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,

    -- Status flags
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_solved BOOLEAN DEFAULT false, -- For question threads
    solved_at TIMESTAMP,
    best_answer_id UUID, -- Foreign key to forum_posts

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Moderation
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Tags
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- SEO
    meta_description TEXT,

    CONSTRAINT forum_threads_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_forum_threads_category ON forum_threads(category_id);
CREATE INDEX idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX idx_forum_threads_pinned ON forum_threads(is_pinned);
CREATE INDEX idx_forum_threads_solved ON forum_threads(is_solved);
CREATE INDEX idx_forum_threads_activity ON forum_threads(last_activity_at DESC);
CREATE INDEX idx_forum_threads_tags ON forum_threads USING GIN (tags);
CREATE INDEX idx_forum_threads_type ON forum_threads(thread_type);
CREATE INDEX idx_forum_threads_deleted ON forum_threads(is_deleted) WHERE is_deleted = false;

-- ================================================================
-- 3. FORUM POSTS (REPLIES)
-- ================================================================
CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE, -- For nested replies

    content TEXT NOT NULL,

    -- Voting
    vote_score INTEGER DEFAULT 0,
    upvote_count INTEGER DEFAULT 0,
    downvote_count INTEGER DEFAULT 0,

    -- Flags
    is_accepted_answer BOOLEAN DEFAULT false, -- For Q&A
    is_edited BOOLEAN DEFAULT false,
    edit_count INTEGER DEFAULT 0,
    last_edited_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Moderation
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Attachments
    attachments JSONB DEFAULT '[]'::JSONB
);

CREATE INDEX idx_forum_posts_thread ON forum_posts(thread_id);
CREATE INDEX idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX idx_forum_posts_parent ON forum_posts(parent_post_id);
CREATE INDEX idx_forum_posts_accepted ON forum_posts(is_accepted_answer);
CREATE INDEX idx_forum_posts_created ON forum_posts(created_at);
CREATE INDEX idx_forum_posts_deleted ON forum_posts(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_forum_posts_vote_score ON forum_posts(vote_score DESC);

-- Update thread best_answer_id foreign key
ALTER TABLE forum_threads
    ADD CONSTRAINT forum_threads_best_answer_fkey
    FOREIGN KEY (best_answer_id) REFERENCES forum_posts(id) ON DELETE SET NULL;

-- ================================================================
-- 4. FORUM VOTES
-- ================================================================
CREATE TABLE IF NOT EXISTS forum_votes (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voteable_type VARCHAR(50) NOT NULL, -- 'thread' or 'post'
    voteable_id UUID NOT NULL,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT forum_votes_unique UNIQUE (user_id, voteable_type, voteable_id)
);

CREATE INDEX idx_forum_votes_user ON forum_votes(user_id);
CREATE INDEX idx_forum_votes_voteable ON forum_votes(voteable_type, voteable_id);

-- ================================================================
-- 5. FORUM BOOKMARKS
-- ================================================================
CREATE TABLE IF NOT EXISTS forum_bookmarks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT forum_bookmarks_unique UNIQUE (user_id, thread_id)
);

CREATE INDEX idx_forum_bookmarks_user ON forum_bookmarks(user_id);
CREATE INDEX idx_forum_bookmarks_thread ON forum_bookmarks(thread_id);

-- ================================================================
-- 6. FORUM SUBSCRIPTIONS (NOTIFICATIONS)
-- ================================================================
CREATE TABLE IF NOT EXISTS forum_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) DEFAULT 'all', -- all, replies_only, accepted_answer
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT forum_subscriptions_unique UNIQUE (user_id, thread_id)
);

CREATE INDEX idx_forum_subscriptions_user ON forum_subscriptions(user_id);
CREATE INDEX idx_forum_subscriptions_thread ON forum_subscriptions(thread_id);
CREATE INDEX idx_forum_subscriptions_active ON forum_subscriptions(is_active);

-- ================================================================
-- 7. USER REPUTATION SYSTEM
-- ================================================================
CREATE TABLE IF NOT EXISTS user_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Reputation points
    total_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,

    -- Activity counts
    questions_asked INTEGER DEFAULT 0,
    answers_posted INTEGER DEFAULT 0,
    accepted_answers INTEGER DEFAULT 0,
    helpful_votes_received INTEGER DEFAULT 0,
    comments_posted INTEGER DEFAULT 0,

    -- Quality metrics
    answer_acceptance_rate DECIMAL(5, 2) DEFAULT 0.00, -- % of questions with accepted answers
    helpfulness_ratio DECIMAL(5, 2) DEFAULT 0.00, -- upvotes / downvotes

    -- Rankings
    rank VARCHAR(50) DEFAULT 'newbie', -- newbie, contributor, trusted, expert, master
    rank_level INTEGER DEFAULT 1,
    next_rank VARCHAR(50),
    points_to_next_rank INTEGER DEFAULT 100,

    -- Achievements
    badges JSONB DEFAULT '[]'::JSONB,
    badge_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_reputation_user_unique UNIQUE (user_id)
);

CREATE INDEX idx_user_reputation_user ON user_reputation(user_id);
CREATE INDEX idx_user_reputation_points ON user_reputation(total_points DESC);
CREATE INDEX idx_user_reputation_rank ON user_reputation(rank, rank_level);
CREATE INDEX idx_user_reputation_monthly ON user_reputation(monthly_points DESC);

-- ================================================================
-- 8. REPUTATION TRANSACTIONS (ACTIVITY LOG)
-- ================================================================
CREATE TABLE IF NOT EXISTS reputation_transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL, -- Can be negative for penalties
    transaction_type VARCHAR(100) NOT NULL, -- question_asked, answer_posted, answer_accepted, upvote_received, etc.
    description TEXT,
    reference_id UUID, -- ID of thread, post, or other object
    reference_type VARCHAR(50), -- thread, post, comment, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reputation_transactions_user ON reputation_transactions(user_id);
CREATE INDEX idx_reputation_transactions_type ON reputation_transactions(transaction_type);
CREATE INDEX idx_reputation_transactions_date ON reputation_transactions(created_at DESC);

-- ================================================================
-- 9. BADGES
-- ================================================================
CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100), -- Font Awesome icon
    icon_color VARCHAR(7), -- Hex color
    badge_tier VARCHAR(50) DEFAULT 'bronze', -- bronze, silver, gold, platinum
    points_value INTEGER DEFAULT 0,
    criteria JSONB, -- JSON defining how to earn this badge
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_badges_slug ON badges(slug);
CREATE INDEX idx_badges_tier ON badges(badge_tier);

-- Insert default badges
INSERT INTO badges (name, slug, description, icon, icon_color, badge_tier, points_value, criteria) VALUES
    ('First Post', 'first-post', 'Posted your first forum thread or reply', 'fa-comment', '#CD7F32', 'bronze', 10, '{"type": "first_post"}'),
    ('First Question', 'first-question', 'Asked your first question', 'fa-question-circle', '#CD7F32', 'bronze', 10, '{"type": "first_question"}'),
    ('First Answer', 'first-answer', 'Posted your first answer', 'fa-lightbulb', '#CD7F32', 'bronze', 10, '{"type": "first_answer"}'),
    ('Problem Solver', 'problem-solver', 'Had an answer accepted', 'fa-check-circle', '#CD7F32', 'bronze', 15, '{"type": "accepted_answer", "count": 1}'),
    ('Helpful', 'helpful', 'Received 10 upvotes', 'fa-thumbs-up', '#C0C0C0', 'silver', 25, '{"type": "upvotes_received", "count": 10}'),
    ('Popular Question', 'popular-question', 'Asked a question with 100+ views', 'fa-eye', '#C0C0C0', 'silver', 20, '{"type": "question_views", "count": 100}'),
    ('Great Answer', 'great-answer', 'Answer upvoted 25+ times', 'fa-star', '#FFD700', 'gold', 50, '{"type": "answer_upvotes", "count": 25}'),
    ('Expert', 'expert', '100 accepted answers', 'fa-graduation-cap', '#FFD700', 'gold', 100, '{"type": "accepted_answers", "count": 100}'),
    ('Community Leader', 'community-leader', '1000+ reputation points', 'fa-crown', '#E5E4E2', 'platinum', 200, '{"type": "total_points", "count": 1000}'),
    ('Daily Contributor', 'daily-contributor', 'Posted for 30 days straight', 'fa-calendar-check', '#C0C0C0', 'silver', 50, '{"type": "consecutive_days", "count": 30}');

-- ================================================================
-- 10. USER BADGES (EARNED BADGES)
-- ================================================================
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_badges_unique UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_badges_earned ON user_badges(earned_at DESC);

-- ================================================================
-- 11. MODERATION FLAGS
-- ================================================================
CREATE TABLE IF NOT EXISTS moderation_flags (
    id SERIAL PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flaggable_type VARCHAR(50) NOT NULL, -- 'thread' or 'post'
    flaggable_id UUID NOT NULL,
    flag_type VARCHAR(100) NOT NULL, -- spam, inappropriate, off-topic, harassment, duplicate, etc.
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed

    -- Resolution
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    resolution_notes TEXT,
    action_taken VARCHAR(100), -- deleted, edited, warned, banned, none

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_flags_reporter ON moderation_flags(reporter_id);
CREATE INDEX idx_moderation_flags_flaggable ON moderation_flags(flaggable_type, flaggable_id);
CREATE INDEX idx_moderation_flags_status ON moderation_flags(status);
CREATE INDEX idx_moderation_flags_created ON moderation_flags(created_at DESC);

-- ================================================================
-- 12. USER PERMISSIONS & MODERATORS
-- ================================================================
CREATE TABLE IF NOT EXISTS forum_moderators (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES forum_categories(id) ON DELETE CASCADE, -- NULL = global moderator

    -- Permissions
    can_edit_posts BOOLEAN DEFAULT true,
    can_delete_posts BOOLEAN DEFAULT true,
    can_lock_threads BOOLEAN DEFAULT true,
    can_pin_threads BOOLEAN DEFAULT true,
    can_ban_users BOOLEAN DEFAULT false,
    can_resolve_flags BOOLEAN DEFAULT true,

    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT forum_moderators_unique UNIQUE (user_id, category_id)
);

CREATE INDEX idx_forum_moderators_user ON forum_moderators(user_id);
CREATE INDEX idx_forum_moderators_category ON forum_moderators(category_id);

-- ================================================================
-- 13. USER WARNINGS & BANS
-- ================================================================
CREATE TABLE IF NOT EXISTS user_warnings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issued_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warning_type VARCHAR(100) NOT NULL, -- spam, harassment, off-topic, etc.
    description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'minor', -- minor, moderate, severe

    -- Consequences
    points_deducted INTEGER DEFAULT 0,
    temporary_ban_until TIMESTAMP,
    permanent_ban BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_warnings_user ON user_warnings(user_id);
CREATE INDEX idx_user_warnings_issued_by ON user_warnings(issued_by);
CREATE INDEX idx_user_warnings_created ON user_warnings(created_at DESC);

-- ================================================================
-- 14. NOTIFICATION QUEUE (FOR FORUM ACTIVITY)
-- ================================================================
CREATE TABLE IF NOT EXISTS forum_notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL, -- new_reply, accepted_answer, upvote, badge_earned, etc.
    title VARCHAR(500),
    message TEXT,
    link_url VARCHAR(500),

    -- Reference to source
    source_id UUID,
    source_type VARCHAR(50), -- thread, post, badge, etc.
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who triggered this notification

    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forum_notifications_user ON forum_notifications(user_id);
CREATE INDEX idx_forum_notifications_read ON forum_notifications(is_read);
CREATE INDEX idx_forum_notifications_created ON forum_notifications(created_at DESC);
CREATE INDEX idx_forum_notifications_type ON forum_notifications(notification_type);

-- ================================================================
-- 15. VIEWS AND FUNCTIONS
-- ================================================================

-- View: Category stats
CREATE OR REPLACE VIEW forum_category_stats AS
SELECT
    fc.id,
    fc.name,
    fc.slug,
    COUNT(DISTINCT ft.id) AS thread_count,
    COUNT(DISTINCT fp.id) AS post_count,
    MAX(ft.last_activity_at) AS last_activity_at
FROM forum_categories fc
LEFT JOIN forum_threads ft ON fc.id = ft.category_id AND ft.is_deleted = false
LEFT JOIN forum_posts fp ON ft.id = fp.thread_id AND fp.is_deleted = false
GROUP BY fc.id, fc.name, fc.slug;

-- View: Thread with post counts and last activity
CREATE OR REPLACE VIEW forum_thread_details AS
SELECT
    ft.*,
    u.email AS author_email,
    u.id AS author_id,
    fc.name AS category_name,
    fc.slug AS category_slug,
    COUNT(DISTINCT fp.id) AS total_replies,
    MAX(fp.created_at) AS last_reply_at,
    up.first_name AS author_first_name,
    up.last_name AS author_last_name
FROM forum_threads ft
JOIN users u ON ft.author_id = u.id
JOIN forum_categories fc ON ft.category_id = fc.id
LEFT JOIN forum_posts fp ON ft.id = fp.thread_id AND fp.is_deleted = false
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE ft.is_deleted = false
GROUP BY ft.id, u.id, u.email, fc.id, fc.name, fc.slug, up.first_name, up.last_name;

-- Function: Update thread reply count
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE forum_threads
        SET reply_count = reply_count + 1,
            last_activity_at = NEW.created_at
        WHERE id = NEW.thread_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE forum_threads
        SET reply_count = reply_count - 1
        WHERE id = OLD.thread_id AND reply_count > 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_reply_count
AFTER INSERT OR DELETE ON forum_posts
FOR EACH ROW EXECUTE FUNCTION update_thread_reply_count();

-- Function: Update post vote score
CREATE OR REPLACE FUNCTION update_post_vote_score()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.vote_type = 'upvote' THEN
            UPDATE forum_posts
            SET vote_score = vote_score + 1,
                upvote_count = upvote_count + 1
            WHERE id = NEW.voteable_id AND NEW.voteable_type = 'post';
        ELSE
            UPDATE forum_posts
            SET vote_score = vote_score - 1,
                downvote_count = downvote_count + 1
            WHERE id = NEW.voteable_id AND NEW.voteable_type = 'post';
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.vote_type = 'upvote' THEN
            UPDATE forum_posts
            SET vote_score = vote_score - 1,
                upvote_count = upvote_count - 1
            WHERE id = OLD.voteable_id AND OLD.voteable_type = 'post' AND upvote_count > 0;
        ELSE
            UPDATE forum_posts
            SET vote_score = vote_score + 1,
                downvote_count = downvote_count - 1
            WHERE id = OLD.voteable_id AND OLD.voteable_type = 'post' AND downvote_count > 0;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_vote_score
AFTER INSERT OR DELETE ON forum_votes
FOR EACH ROW EXECUTE FUNCTION update_post_vote_score();

-- Function: Award reputation points
CREATE OR REPLACE FUNCTION award_reputation_points(
    p_user_id UUID,
    p_points INTEGER,
    p_transaction_type VARCHAR(100),
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert transaction
    INSERT INTO reputation_transactions (
        user_id,
        points_earned,
        transaction_type,
        description,
        reference_id,
        reference_type
    ) VALUES (
        p_user_id,
        p_points,
        p_transaction_type,
        p_description,
        p_reference_id,
        p_reference_type
    );

    -- Update user reputation
    INSERT INTO user_reputation (user_id, total_points, monthly_points, weekly_points)
    VALUES (p_user_id, p_points, p_points, p_points)
    ON CONFLICT (user_id) DO UPDATE
    SET total_points = user_reputation.total_points + p_points,
        monthly_points = user_reputation.monthly_points + p_points,
        weekly_points = user_reputation.weekly_points + p_points,
        updated_at = CURRENT_TIMESTAMP;

    -- TODO: Check and update rank based on new total_points
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Community Forum & Q&A System schema created successfully!' as message;
