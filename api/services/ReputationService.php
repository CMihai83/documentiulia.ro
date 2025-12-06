<?php
/**
 * Reputation Service
 *
 * Handles user reputation points, ranks, and badge awards
 */

class ReputationService
{
    private $db;

    // Reputation point values
    private const POINTS = [
        'thread_created' => 5,
        'reply_posted' => 10,
        'answer_accepted' => 15,
        'upvote_received' => 2,
        'downvote_received' => -1,
        'question_solved' => 2,
        'badge_earned_bronze' => 10,
        'badge_earned_silver' => 25,
        'badge_earned_gold' => 50,
        'badge_earned_platinum' => 200,
    ];

    // Rank thresholds
    private const RANKS = [
        'newbie' => ['min' => 0, 'max' => 99, 'next' => 'contributor'],
        'contributor' => ['min' => 100, 'max' => 299, 'next' => 'trusted'],
        'trusted' => ['min' => 300, 'max' => 599, 'next' => 'expert'],
        'expert' => ['min' => 600, 'max' => 999, 'next' => 'master'],
        'master' => ['min' => 1000, 'max' => PHP_INT_MAX, 'next' => null],
    ];

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Award reputation points to user
     */
    public function awardPoints(
        string $userId,
        int $points,
        string $transactionType,
        ?string $description = null,
        ?int $referenceId = null,
        ?string $referenceType = null
    ): void {
        // Insert transaction
        $query = "
            INSERT INTO reputation_transactions (
                user_id,
                points_earned,
                transaction_type,
                description,
                reference_id,
                reference_type
            ) VALUES (
                :user_id,
                :points,
                :transaction_type,
                :description,
                :reference_id,
                :reference_type
            )
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'points' => $points,
            'transaction_type' => $transactionType,
            'description' => $description,
            'reference_id' => $referenceId,
            'reference_type' => $referenceType
        ]);

        // Update or create user reputation
        $this->updateUserReputation($userId, $points);

        // Check for rank changes
        $this->checkAndUpdateRank($userId);

        // Check for badge awards
        $this->checkAndAwardBadges($userId);
    }

    /**
     * Update user reputation totals
     */
    private function updateUserReputation(string $userId, int $points): void
    {
        $query = "
            INSERT INTO user_reputation (
                user_id,
                total_points,
                monthly_points,
                weekly_points,
                last_activity_at
            ) VALUES (
                :user_id,
                :points,
                :points,
                :points,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id) DO UPDATE
            SET total_points = user_reputation.total_points + :points,
                monthly_points = user_reputation.monthly_points + :points,
                weekly_points = user_reputation.weekly_points + :points,
                last_activity_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'points' => $points
        ]);

        // Update activity stats
        $this->updateActivityStats($userId, $points);
    }

    /**
     * Update user activity statistics
     */
    private function updateActivityStats(string $userId, int $points): void
    {
        // Get transaction details to determine what to increment
        $query = "
            SELECT transaction_type
            FROM reputation_transactions
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT 1
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['user_id' => $userId]);
        $lastTransaction = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lastTransaction) {
            return;
        }

        $updates = [];

        switch ($lastTransaction['transaction_type']) {
            case 'thread_created':
                $updates[] = 'questions_asked = questions_asked + 1';
                break;
            case 'reply_posted':
                $updates[] = 'answers_posted = answers_posted + 1';
                break;
            case 'answer_accepted':
                $updates[] = 'accepted_answers = accepted_answers + 1';
                break;
            case 'upvote_received':
                $updates[] = 'helpful_votes_received = helpful_votes_received + 1';
                break;
        }

        if (empty($updates)) {
            return;
        }

        $updateClause = implode(', ', $updates);

        $query = "
            UPDATE user_reputation
            SET {$updateClause}
            WHERE user_id = :user_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['user_id' => $userId]);

        // Recalculate ratios
        $this->recalculateRatios($userId);
    }

    /**
     * Recalculate quality ratios
     */
    private function recalculateRatios(string $userId): void
    {
        $query = "
            UPDATE user_reputation
            SET answer_acceptance_rate = CASE
                    WHEN questions_asked > 0
                    THEN (accepted_answers::DECIMAL / questions_asked * 100)
                    ELSE 0
                END,
                helpfulness_ratio = CASE
                    WHEN helpful_votes_received > 0
                    THEN (helpful_votes_received::DECIMAL / GREATEST(1, helpful_votes_received))
                    ELSE 0
                END
            WHERE user_id = :user_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['user_id' => $userId]);
    }

    /**
     * Check and update user rank based on total points
     */
    private function checkAndUpdateRank(string $userId): void
    {
        $reputation = $this->getUserReputation($userId);
        $totalPoints = $reputation['total_points'];

        $newRank = null;
        $newLevel = 1;
        $nextRank = null;
        $pointsToNext = 0;

        foreach (self::RANKS as $rank => $thresholds) {
            if ($totalPoints >= $thresholds['min'] && $totalPoints <= $thresholds['max']) {
                $newRank = $rank;
                $nextRank = $thresholds['next'];

                if ($nextRank) {
                    $pointsToNext = self::RANKS[$nextRank]['min'] - $totalPoints;
                }

                // Calculate level within rank (every 50 points = 1 level)
                $pointsInRank = $totalPoints - $thresholds['min'];
                $newLevel = floor($pointsInRank / 50) + 1;

                break;
            }
        }

        if ($newRank && $newRank !== $reputation['rank']) {
            // Rank changed - update and notify
            $query = "
                UPDATE user_reputation
                SET rank = :rank,
                    rank_level = :level,
                    next_rank = :next_rank,
                    points_to_next_rank = :points_to_next
                WHERE user_id = :user_id
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                'user_id' => $userId,
                'rank' => $newRank,
                'level' => $newLevel,
                'next_rank' => $nextRank,
                'points_to_next' => $pointsToNext
            ]);

            // Send notification about rank change
            $this->notifyRankChange($userId, $newRank);
        } else {
            // Just update level and points to next
            $query = "
                UPDATE user_reputation
                SET rank_level = :level,
                    points_to_next_rank = :points_to_next
                WHERE user_id = :user_id
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                'user_id' => $userId,
                'level' => $newLevel,
                'points_to_next' => $pointsToNext
            ]);
        }
    }

    /**
     * Check and award badges based on achievements
     */
    private function checkAndAwardBadges(string $userId): void
    {
        $reputation = $this->getUserReputation($userId);

        // Get all active badges
        $query = "SELECT * FROM badges WHERE is_active = true";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $badges = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($badges as $badge) {
            // Check if user already has this badge
            if ($this->hasBadge($userId, $badge['id'])) {
                continue;
            }

            // Check if user meets criteria
            if ($this->meetsBadgeCriteria($userId, $reputation, $badge)) {
                $this->awardBadge($userId, $badge);
            }
        }
    }

    /**
     * Check if user meets badge criteria
     */
    private function meetsBadgeCriteria(string $userId, array $reputation, array $badge): bool
    {
        $criteria = json_decode($badge['criteria'], true);

        if (!$criteria || !isset($criteria['type'])) {
            return false;
        }

        $count = $criteria['count'] ?? 1;

        switch ($criteria['type']) {
            case 'first_post':
                return $reputation['questions_asked'] >= 1 || $reputation['answers_posted'] >= 1;

            case 'first_question':
                return $reputation['questions_asked'] >= 1;

            case 'first_answer':
                return $reputation['answers_posted'] >= 1;

            case 'accepted_answer':
                return $reputation['accepted_answers'] >= $count;

            case 'upvotes_received':
                return $reputation['helpful_votes_received'] >= $count;

            case 'question_views':
                // Check if user has any question with >= count views
                $query = "
                    SELECT COUNT(*) FROM forum_threads
                    WHERE author_id = :user_id AND view_count >= :count
                ";
                $stmt = $this->db->prepare($query);
                $stmt->execute(['user_id' => $userId, 'count' => $count]);
                return $stmt->fetchColumn() > 0;

            case 'answer_upvotes':
                // Check if user has any answer with >= count upvotes
                $query = "
                    SELECT COUNT(*) FROM forum_replies fr
                    LEFT JOIN (
                        SELECT voteable_id, COUNT(*) as upvotes
                        FROM forum_votes
                        WHERE voteable_type = 'reply' AND vote_type = 'upvote'
                        GROUP BY voteable_id
                    ) v ON fr.id = v.voteable_id
                    WHERE fr.author_id = :user_id AND COALESCE(v.upvotes, 0) >= :count
                ";
                $stmt = $this->db->prepare($query);
                $stmt->execute(['user_id' => $userId, 'count' => $count]);
                return $stmt->fetchColumn() > 0;

            case 'total_points':
                return $reputation['total_points'] >= $count;

            case 'consecutive_days':
                // Check if user has posted for count consecutive days
                return $this->hasConsecutiveDays($userId, $count);

            default:
                return false;
        }
    }

    /**
     * Check if user has consecutive days of activity
     */
    private function hasConsecutiveDays(string $userId, int $requiredDays): bool
    {
        $query = "
            SELECT DATE(created_at) as activity_date
            FROM reputation_transactions
            WHERE user_id = :user_id
            GROUP BY DATE(created_at)
            ORDER BY activity_date DESC
            LIMIT :limit
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'limit' => $requiredDays
        ]);

        $dates = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (count($dates) < $requiredDays) {
            return false;
        }

        // Check if dates are consecutive
        $consecutiveCount = 1;
        for ($i = 0; $i < count($dates) - 1; $i++) {
            $current = new DateTime($dates[$i]);
            $next = new DateTime($dates[$i + 1]);
            $diff = $current->diff($next)->days;

            if ($diff === 1) {
                $consecutiveCount++;
            } else {
                break;
            }
        }

        return $consecutiveCount >= $requiredDays;
    }

    /**
     * Award badge to user
     */
    private function awardBadge(string $userId, array $badge): void
    {
        $query = "
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (:user_id, :badge_id)
            ON CONFLICT (user_id, badge_id) DO NOTHING
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'badge_id' => $badge['id']
        ]);

        // Update badge count in user_reputation
        $query = "
            UPDATE user_reputation
            SET badge_count = badge_count + 1,
                badges = badges || :badge::jsonb
            WHERE user_id = :user_id
        ";

        $badgeData = json_encode([
            'id' => $badge['id'],
            'name' => $badge['name'],
            'tier' => $badge['badge_tier'],
            'earned_at' => date('Y-m-d H:i:s')
        ]);

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'badge' => $badgeData
        ]);

        // Award bonus points for earning badge
        $bonusPoints = $badge['points_value'] ?? 0;
        if ($bonusPoints > 0) {
            $this->awardPoints(
                $userId,
                $bonusPoints,
                'badge_earned_' . $badge['badge_tier'],
                'Earned badge: ' . $badge['name']
            );
        }

        // Send notification
        $this->notifyBadgeEarned($userId, $badge);
    }

    /**
     * Check if user has badge
     */
    private function hasBadge(string $userId, int $badgeId): bool
    {
        $query = "
            SELECT COUNT(*) FROM user_badges
            WHERE user_id = :user_id AND badge_id = :badge_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'badge_id' => $badgeId
        ]);

        return $stmt->fetchColumn() > 0;
    }

    /**
     * Get user reputation data
     */
    public function getUserReputation(string $userId): array
    {
        $query = "
            SELECT * FROM user_reputation WHERE user_id = :user_id
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['user_id' => $userId]);

        $reputation = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reputation) {
            // Create default reputation entry
            $this->initializeUserReputation($userId);
            return $this->getUserReputation($userId);
        }

        // Decode JSON fields
        if ($reputation['badges']) {
            $reputation['badges'] = json_decode($reputation['badges'], true) ?? [];
        }

        return $reputation;
    }

    /**
     * Initialize reputation for new user
     */
    private function initializeUserReputation(string $userId): void
    {
        $query = "
            INSERT INTO user_reputation (user_id)
            VALUES (:user_id)
            ON CONFLICT (user_id) DO NOTHING
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['user_id' => $userId]);
    }

    /**
     * Get leaderboard
     */
    public function getLeaderboard(string $period = 'all_time', int $limit = 50): array
    {
        $orderColumn = match($period) {
            'weekly' => 'weekly_points',
            'monthly' => 'monthly_points',
            default => 'total_points'
        };

        $query = "
            SELECT
                ur.*,
                u.email,
                up.first_name,
                up.last_name
            FROM user_reputation ur
            JOIN users u ON ur.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            ORDER BY ur.{$orderColumn} DESC
            LIMIT :limit
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute(['limit' => $limit]);

        $leaderboard = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON and add rank position
        foreach ($leaderboard as $index => &$entry) {
            $entry['position'] = $index + 1;
            if ($entry['badges']) {
                $entry['badges'] = json_decode($entry['badges'], true) ?? [];
            }
        }

        return $leaderboard;
    }

    /**
     * Get user's reputation history
     */
    public function getUserHistory(string $userId, int $limit = 100): array
    {
        $query = "
            SELECT * FROM reputation_transactions
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT :limit
        ";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'limit' => $limit
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Send notification about rank change
     */
    private function notifyRankChange(string $userId, string $newRank): void
    {
        $query = "
            INSERT INTO forum_notifications (
                user_id,
                notification_type,
                title,
                message,
                link_url
            ) VALUES (
                :user_id,
                'rank_change',
                'Congratulations! You reached a new rank',
                :message,
                '/profile/reputation'
            )
        ";

        $message = "You are now a " . ucfirst($newRank) . "! Keep up the great work in the community.";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'message' => $message
        ]);
    }

    /**
     * Send notification about badge earned
     */
    private function notifyBadgeEarned(string $userId, array $badge): void
    {
        $query = "
            INSERT INTO forum_notifications (
                user_id,
                notification_type,
                title,
                message,
                link_url,
                source_id,
                source_type
            ) VALUES (
                :user_id,
                'badge_earned',
                'You earned a badge!',
                :message,
                '/profile/badges',
                :badge_id,
                'badge'
            )
        ";

        $message = "You earned the '{$badge['name']}' badge! {$badge['description']}";

        $stmt = $this->db->prepare($query);
        $stmt->execute([
            'user_id' => $userId,
            'message' => $message,
            'badge_id' => $badge['id']
        ]);
    }

    /**
     * Reset monthly/weekly points (cron job)
     */
    public function resetPeriodPoints(string $period = 'monthly'): void
    {
        $column = $period === 'weekly' ? 'weekly_points' : 'monthly_points';

        $query = "UPDATE user_reputation SET {$column} = 0";

        $stmt = $this->db->prepare($query);
        $stmt->execute();
    }
}
