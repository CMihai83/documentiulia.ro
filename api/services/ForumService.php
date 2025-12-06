<?php
/**
 * Forum Service
 *
 * Handles all forum operations: threads, posts, voting, bookmarks
 */

class ForumService
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    // ============================================================
    // CATEGORIES
    // ============================================================

    /**
     * Get all forum categories with stats
     */
    public function getCategories(): array
    {
        $query = "
            SELECT
                fc.*,
                COUNT(DISTINCT ft.id) as thread_count,
                COUNT(DISTINCT fr.id) as post_count,
                MAX(ft.last_activity_at) as last_activity_at
            FROM forum_categories fc
            LEFT JOIN forum_threads ft ON fc.id = ft.category_id
            LEFT JOIN forum_replies fr ON ft.id = fr.thread_id
            WHERE fc.is_active = true
            GROUP BY fc.id
            ORDER BY fc.display_order ASC
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get single category by slug
     */
    public function getCategoryBySlug(string $slug): ?array
    {
        $query = "
            SELECT
                fc.*,
                COUNT(DISTINCT ft.id) as thread_count,
                COUNT(DISTINCT fr.id) as post_count
            FROM forum_categories fc
            LEFT JOIN forum_threads ft ON fc.id = ft.category_id
            LEFT JOIN forum_replies fr ON ft.id = fr.thread_id
            WHERE fc.slug = :slug AND fc.is_active = true
            GROUP BY fc.id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['slug' => $slug]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    // ============================================================
    // THREADS
    // ============================================================

    /**
     * Create new thread
     */
    public function createThread(array $data): array
    {
        $query = "
            INSERT INTO forum_threads (
                category_id,
                author_id,
                title,
                content,
                tags
            ) VALUES (
                :category_id,
                :author_id,
                :title,
                :content,
                :tags
            ) RETURNING id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'category_id' => $data['category_id'],
            'author_id' => $data['author_id'],
            'title' => $data['title'],
            'content' => $data['content'],
            'tags' => json_encode($data['tags'] ?? [])
        ]);

        $threadId = $stmt->fetchColumn();

        // Award reputation points for creating thread
        $this->awardPoints($data['author_id'], 5, 'thread_created', $threadId);

        return $this->getThreadById($threadId);
    }

    /**
     * Get thread by ID with author info
     */
    public function getThreadById(int $threadId): array
    {
        $query = "
            SELECT
                ft.*,
                u.email as author_email,
                u.first_name as author_first_name,
                u.last_name as author_last_name,
                ur.reputation_points as author_reputation,
                ur.rank as author_rank,
                fc.name as category_name,
                fc.slug as category_slug,
                (SELECT COUNT(*) FROM forum_replies WHERE thread_id = ft.id) as reply_count
            FROM forum_threads ft
            JOIN users u ON ft.author_id = u.id
            
            LEFT JOIN user_reputation ur ON u.id = ur.user_id
            JOIN forum_categories fc ON ft.category_id = fc.id
            WHERE ft.id = :thread_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['thread_id' => $threadId]);

        $thread = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$thread) {
            throw new Exception('Thread not found');
        }

        // Increment view count
        $this->incrementViewCount($threadId);

        // Decode JSON fields
        if ($thread['tags']) {
            $thread['tags'] = json_decode($thread['tags'], true);
        }

        return $thread;
    }

    /**
     * List threads for a category
     */
    public function listThreads(?int $categoryId, array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $where = [];
        $params = [];

        // Filter by category if provided
        if ($categoryId !== null) {
            $where[] = 'ft.category_id = :category_id';
            $params['category_id'] = $categoryId;
        }

        // Filter by tags
        if (!empty($filters['tag'])) {
            $where[] = "ft.tags @> :tag::jsonb";
            $params['tag'] = json_encode([$filters['tag']]);
        }

        // Filter by solved status
        if (isset($filters['is_solved'])) {
            $where[] = "ft.is_solved = :is_solved";
            $params['is_solved'] = $filters['is_solved'];
        }

        // Sort options
        $sortOptions = [
            'recent' => 'ft.last_activity_at DESC',
            'popular' => 'ft.reply_count DESC',
            'views' => 'ft.view_count DESC',
            'votes' => 'ft.upvote_count DESC'
        ];

        $sort = $sortOptions[$filters['sort'] ?? 'recent'] ?? $sortOptions['recent'];

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $query = "
            SELECT
                ft.id,
                ft.title,
                ft.content,
                ft.tags,
                ft.view_count,
                ft.reply_count,
                ft.upvote_count,
                ft.is_pinned,
                ft.is_locked,
                ft.is_solved,
                ft.created_at,
                ft.last_activity_at,
                u.email as author_email,
                u.first_name as author_first_name,
                u.last_name as author_last_name,
                ur.reputation_points as author_reputation,
                ur.rank as author_rank,
                -- Latest reply info
                (
                    SELECT u2.email
                    FROM forum_replies fr2
                    JOIN users u2 ON fr2.author_id = u2.id
                    WHERE fr2.thread_id = ft.id
                    ORDER BY fr2.created_at DESC
                    LIMIT 1
                ) as last_reply_author
            FROM forum_threads ft
            JOIN users u ON ft.author_id = u.id
            
            LEFT JOIN user_reputation ur ON u.id = ur.user_id
            {$whereClause}
            ORDER BY ft.is_pinned DESC, {$sort}
            LIMIT :limit OFFSET :offset
        ";

        $params['limit'] = $limit;
        $params['offset'] = $offset;

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);

        $threads = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON fields
        foreach ($threads as &$thread) {
            if ($thread['tags']) {
                $thread['tags'] = json_decode($thread['tags'], true);
            }
        }

        return $threads;
    }

    /**
     * Update thread
     */
    public function updateThread(int $threadId, string $userId, array $data): array
    {
        // Check ownership or moderator permission
        if (!$this->canEditThread($threadId, $userId)) {
            throw new Exception('Unauthorized to edit this thread');
        }

        $updates = [];
        $params = ['thread_id' => $threadId];

        if (isset($data['title'])) {
            $updates[] = 'title = :title';
            $params['title'] = $data['title'];
        }

        if (isset($data['content'])) {
            $updates[] = 'content = :content';
            $params['content'] = $data['content'];
        }

        if (isset($data['tags'])) {
            $updates[] = 'tags = :tags';
            $params['tags'] = json_encode($data['tags']);
        }

        if (empty($updates)) {
            throw new Exception('No fields to update');
        }

        $updates[] = 'updated_at = CURRENT_TIMESTAMP';
        $updateClause = implode(', ', $updates);

        $query = "UPDATE forum_threads SET {$updateClause} WHERE id = :thread_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);

        return $this->getThreadById($threadId);
    }

    /**
     * Delete thread (soft delete)
     */
    public function deleteThread(int $threadId, string $userId): bool
    {
        // Check ownership or moderator permission
        if (!$this->canDeleteThread($threadId, $userId)) {
            throw new Exception('Unauthorized to delete this thread');
        }

        $query = "DELETE FROM forum_threads WHERE id = :thread_id";

        $stmt = $this->db->prepare($query);
        return $stmt->execute(['thread_id' => $threadId]);
    }

    /**
     * Pin/unpin thread (moderator only)
     */
    public function togglePin(int $threadId, string $userId): bool
    {
        if (!$this->isModerator($userId)) {
            throw new Exception('Unauthorized - moderator only');
        }

        $query = "UPDATE forum_threads SET is_pinned = NOT is_pinned WHERE id = :thread_id";

        $stmt = $this->db->prepare($query);
        return $stmt->execute(['thread_id' => $threadId]);
    }

    /**
     * Lock/unlock thread (moderator only)
     */
    public function toggleLock(int $threadId, string $userId): bool
    {
        if (!$this->isModerator($userId)) {
            throw new Exception('Unauthorized - moderator only');
        }

        $query = "UPDATE forum_threads SET is_locked = NOT is_locked WHERE id = :thread_id";

        $stmt = $this->db->prepare($query);
        return $stmt->execute(['thread_id' => $threadId]);
    }

    /**
     * Mark thread as solved (author or moderator only)
     */
    public function markSolved(int $threadId, string $userId, ?int $bestAnswerId = null): bool
    {
        $thread = $this->getThreadById($threadId);

        if ($thread['author_id'] !== $userId && !$this->isModerator($userId)) {
            throw new Exception('Unauthorized - only thread author or moderator can mark as solved');
        }

        $query = "
            UPDATE forum_threads
            SET is_solved = true,
                solved_at = CURRENT_TIMESTAMP
            WHERE id = :thread_id
        ";

        $stmt = $this->db->prepare($query);
        $result = $stmt->execute(['thread_id' => $threadId]);

        // If best answer specified, award bonus points
        if ($bestAnswerId && $result) {
            $this->awardPoints($userId, 2, 'question_solved', $threadId);
            $this->markBestAnswer($bestAnswerId);
        }

        return $result;
    }

    // ============================================================
    // REPLIES/POSTS
    // ============================================================

    /**
     * Create reply to thread
     */
    public function createReply(array $data): array
    {
        // Check if thread is locked
        $thread = $this->getThreadById($data['thread_id']);
        if ($thread['is_locked']) {
            throw new Exception('Thread is locked - cannot add replies');
        }

        $query = "
            INSERT INTO forum_replies (
                thread_id,
                author_id,
                content,
                parent_reply_id
            ) VALUES (
                :thread_id,
                :author_id,
                :content,
                :parent_reply_id
            ) RETURNING id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'thread_id' => $data['thread_id'],
            'author_id' => $data['author_id'],
            'content' => $data['content'],
            'parent_reply_id' => $data['parent_reply_id'] ?? null
        ]);

        $replyId = $stmt->fetchColumn();

        // Award reputation points for posting reply
        $this->awardPoints($data['author_id'], 10, 'reply_posted', $replyId);

        // Update thread last_activity_at
        $this->updateThreadActivity($data['thread_id']);

        return $this->getReplyById($replyId);
    }

    /**
     * Get reply by ID
     */
    public function getReplyById(int $replyId): array
    {
        $query = "
            SELECT
                fr.*,
                u.email as author_email,
                u.first_name as author_first_name,
                u.last_name as author_last_name,
                ur.reputation_points as author_reputation,
                ur.rank as author_rank
            FROM forum_replies fr
            JOIN users u ON fr.author_id = u.id
            
            LEFT JOIN user_reputation ur ON u.id = ur.user_id
            WHERE fr.id = :reply_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['reply_id' => $replyId]);

        $reply = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reply) {
            throw new Exception('Reply not found');
        }

        return $reply;
    }

    /**
     * List replies for a thread
     */
    public function listReplies(int $threadId, int $limit = 50, int $offset = 0): array
    {
        $query = "
            SELECT
                fr.*,
                u.email as author_email,
                u.first_name as author_first_name,
                u.last_name as author_last_name,
                ur.reputation_points as author_reputation,
                ur.rank as author_rank,
                (SELECT COUNT(*) FROM forum_votes WHERE voteable_type = 'reply' AND voteable_id = fr.id AND vote_type = 'upvote') as upvote_count,
                (SELECT COUNT(*) FROM forum_votes WHERE voteable_type = 'reply' AND voteable_id = fr.id AND vote_type = 'downvote') as downvote_count
            FROM forum_replies fr
            JOIN users u ON fr.author_id = u.id
            
            LEFT JOIN user_reputation ur ON u.id = ur.user_id
            WHERE fr.thread_id = :thread_id
            ORDER BY fr.created_at ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'thread_id' => $threadId,
            'limit' => $limit,
            'offset' => $offset
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update reply
     */
    public function updateReply(int $replyId, string $userId, string $content): array
    {
        // Check ownership
        $reply = $this->getReplyById($replyId);
        if ($reply['author_id'] !== $userId && !$this->isModerator($userId)) {
            throw new Exception('Unauthorized to edit this reply');
        }

        $query = "
            UPDATE forum_replies
            SET content = :content,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :reply_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'content' => $content,
            'reply_id' => $replyId
        ]);

        return $this->getReplyById($replyId);
    }

    /**
     * Delete reply
     */
    public function deleteReply(int $replyId, string $userId): bool
    {
        $reply = $this->getReplyById($replyId);

        if ($reply['author_id'] !== $userId && !$this->isModerator($userId)) {
            throw new Exception('Unauthorized to delete this reply');
        }

        $query = "DELETE FROM forum_replies WHERE id = :reply_id";

        $stmt = $this->db->prepare($query);
        return $stmt->execute(['reply_id' => $replyId]);
    }

    /**
     * Mark reply as best answer
     */
    private function markBestAnswer(int $replyId): bool
    {
        $query = "UPDATE forum_replies SET is_best_answer = true WHERE id = :reply_id";

        $stmt = $this->db->prepare($query);
        $result = $stmt->execute(['reply_id' => $replyId]);

        if ($result) {
            // Award bonus points for accepted answer
            $reply = $this->getReplyById($replyId);
            $this->awardPoints($reply['author_id'], 15, 'answer_accepted', $replyId);
        }

        return $result;
    }

    // ============================================================
    // VOTING
    // ============================================================

    /**
     * Vote on thread or reply
     */
    public function vote(string $userId, string $voteableType, int $voteableId, string $voteType): array
    {
        if (!in_array($voteableType, ['thread', 'reply'])) {
            throw new Exception('Invalid voteable type');
        }

        if (!in_array($voteType, ['upvote', 'downvote'])) {
            throw new Exception('Invalid vote type');
        }

        // Check if already voted
        $existingVote = $this->getUserVote($userId, $voteableType, $voteableId);

        if ($existingVote) {
            if ($existingVote['vote_type'] === $voteType) {
                // Remove vote (toggle off)
                return $this->removeVote($userId, $voteableType, $voteableId);
            } else {
                // Change vote
                return $this->changeVote($userId, $voteableType, $voteableId, $voteType);
            }
        }

        // Insert new vote
        $query = "
            INSERT INTO forum_votes (user_id, voteable_type, voteable_id, vote_type)
            VALUES (:user_id, :voteable_type, :voteable_id, :vote_type)
            ON CONFLICT (user_id, voteable_type, voteable_id)
            DO UPDATE SET vote_type = :vote_type
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'voteable_type' => $voteableType,
            'voteable_id' => $voteableId,
            'vote_type' => $voteType
        ]);

        // Award/deduct reputation points
        if ($voteType === 'upvote') {
            $authorId = $this->getAuthorId($voteableType, $voteableId);
            $this->awardPoints($authorId, 2, 'upvote_received', $voteableId);
        }

        return [
            'success' => true,
            'vote_type' => $voteType,
            'counts' => $this->getVoteCounts($voteableType, $voteableId)
        ];
    }

    /**
     * Get user's vote on item
     */
    private function getUserVote(string $userId, string $voteableType, int $voteableId): ?array
    {
        $query = "
            SELECT * FROM forum_votes
            WHERE user_id = :user_id
            AND voteable_type = :voteable_type
            AND voteable_id = :voteable_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'voteable_type' => $voteableType,
            'voteable_id' => $voteableId
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Remove vote
     */
    private function removeVote(string $userId, string $voteableType, int $voteableId): array
    {
        $query = "
            DELETE FROM forum_votes
            WHERE user_id = :user_id
            AND voteable_type = :voteable_type
            AND voteable_id = :voteable_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'voteable_type' => $voteableType,
            'voteable_id' => $voteableId
        ]);

        return [
            'success' => true,
            'vote_type' => null,
            'counts' => $this->getVoteCounts($voteableType, $voteableId)
        ];
    }

    /**
     * Change vote type
     */
    private function changeVote(string $userId, string $voteableType, int $voteableId, string $newVoteType): array
    {
        $query = "
            UPDATE forum_votes
            SET vote_type = :vote_type
            WHERE user_id = :user_id
            AND voteable_type = :voteable_type
            AND voteable_id = :voteable_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'voteable_type' => $voteableType,
            'voteable_id' => $voteableId,
            'vote_type' => $newVoteType
        ]);

        return [
            'success' => true,
            'vote_type' => $newVoteType,
            'counts' => $this->getVoteCounts($voteableType, $voteableId)
        ];
    }

    /**
     * Get vote counts for item
     */
    private function getVoteCounts(string $voteableType, int $voteableId): array
    {
        $query = "
            SELECT
                COUNT(CASE WHEN vote_type = 'upvote' THEN 1 END) as upvotes,
                COUNT(CASE WHEN vote_type = 'downvote' THEN 1 END) as downvotes
            FROM forum_votes
            WHERE voteable_type = :voteable_type AND voteable_id = :voteable_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'voteable_type' => $voteableType,
            'voteable_id' => $voteableId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * Increment thread view count
     */
    private function incrementViewCount(int $threadId): void
    {
        $query = "UPDATE forum_threads SET view_count = view_count + 1 WHERE id = :thread_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['thread_id' => $threadId]);
    }

    /**
     * Update thread last activity timestamp
     */
    private function updateThreadActivity(int $threadId): void
    {
        $query = "UPDATE forum_threads SET last_activity_at = CURRENT_TIMESTAMP WHERE id = :thread_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['thread_id' => $threadId]);
    }

    /**
     * Check if user can edit thread
     */
    private function canEditThread(int $threadId, string $userId): bool
    {
        $query = "SELECT author_id FROM forum_threads WHERE id = :thread_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['thread_id' => $threadId]);

        $thread = $stmt->fetch(PDO::FETCH_ASSOC);

        return $thread && ($thread['author_id'] === $userId || $this->isModerator($userId));
    }

    /**
     * Check if user can delete thread
     */
    private function canDeleteThread(int $threadId, string $userId): bool
    {
        return $this->canEditThread($threadId, $userId);
    }

    /**
     * Check if user is moderator
     */
    private function isModerator(string $userId): bool
    {
        $query = "SELECT COUNT(*) FROM forum_moderators WHERE user_id = :user_id";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchColumn() > 0;
    }

    /**
     * Get author ID of voteable item
     */
    private function getAuthorId(string $voteableType, int $voteableId): string
    {
        $table = $voteableType === 'thread' ? 'forum_threads' : 'forum_replies';

        $query = "SELECT author_id FROM {$table} WHERE id = :id";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['id' => $voteableId]);

        return $stmt->fetchColumn();
    }

    /**
     * Award reputation points to user
     */
    private function awardPoints(string $userId, int $points, string $type, int $referenceId): void
    {
        $reputationService = new ReputationService();
        $reputationService->awardPoints($userId, $points, $type, null, $referenceId, 'forum');
    }
}
