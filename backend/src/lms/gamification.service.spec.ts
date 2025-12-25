import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GamificationService, PointsAction, BadgeRarity, LeaderboardPeriod } from './gamification.service';

describe('GamificationService', () => {
  let service: GamificationService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Points Management', () => {
    it('should award points for completing a lesson', () => {
      const transaction = service.awardPoints('user-1', 'LESSON_COMPLETE');

      expect(transaction.points).toBe(10);
      expect(transaction.action).toBe('LESSON_COMPLETE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'gamification.points.awarded',
        expect.objectContaining({ userId: 'user-1', action: 'LESSON_COMPLETE' }),
      );
    });

    it('should award more points for course completion', () => {
      const transaction = service.awardPoints('user-1', 'COURSE_COMPLETE');

      expect(transaction.points).toBe(100);
    });

    it('should award points for perfect quiz score', () => {
      const transaction = service.awardPoints('user-1', 'PERFECT_SCORE');

      expect(transaction.points).toBe(50);
    });

    it('should accumulate points correctly', () => {
      service.awardPoints('user-2', 'LESSON_COMPLETE'); // 10
      service.awardPoints('user-2', 'LESSON_COMPLETE'); // 10
      service.awardPoints('user-2', 'QUIZ_PASS'); // 25

      const userPoints = service.getUserPoints('user-2');
      expect(userPoints.totalPoints).toBe(45);
    });

    it('should level up when threshold is reached', () => {
      // Award enough points to level up (100 for level 2)
      for (let i = 0; i < 10; i++) {
        service.awardPoints('user-3', 'LESSON_COMPLETE'); // 10 each
      }

      const userPoints = service.getUserPoints('user-3');
      expect(userPoints.level).toBeGreaterThanOrEqual(2);
    });

    it('should track points history', () => {
      service.awardPoints('user-4', 'LESSON_COMPLETE');
      service.awardPoints('user-4', 'QUIZ_PASS');

      const history = service.getPointsHistory('user-4');
      expect(history.length).toBe(2);
    });
  });

  describe('Badges', () => {
    it('should award a badge', () => {
      const userBadge = service.awardBadge('user-5', 'first-lesson');

      expect(userBadge).not.toBeNull();
      expect(userBadge?.badgeId).toBe('first-lesson');
      expect(userBadge?.isNew).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'gamification.badge.earned',
        expect.objectContaining({ userId: 'user-5', badgeId: 'first-lesson' }),
      );
    });

    it('should not award duplicate badges', () => {
      service.awardBadge('user-6', 'first-lesson');
      const duplicate = service.awardBadge('user-6', 'first-lesson');

      expect(duplicate).toBeNull();
    });

    it('should retrieve user badges', () => {
      service.awardBadge('user-7', 'first-lesson');
      service.awardBadge('user-7', 'first-course');

      const badges = service.getUserBadges('user-7');
      expect(badges.length).toBe(2);
      expect(badges[0].badge).toBeDefined();
    });

    it('should have all expected badges initialized', () => {
      const allBadges = service.getAllBadges();

      expect(allBadges.length).toBeGreaterThan(10);
      expect(allBadges.some(b => b.category === 'COMPLETION')).toBe(true);
      expect(allBadges.some(b => b.category === 'STREAK')).toBe(true);
      expect(allBadges.some(b => b.category === 'MASTERY')).toBe(true);
    });

    it('should mark badge as seen', () => {
      service.awardBadge('user-8', 'first-lesson');
      service.markBadgeSeen('user-8', 'first-lesson');

      const badges = service.getUserBadges('user-8');
      expect(badges[0].isNew).toBe(false);
    });
  });

  describe('Achievements', () => {
    it('should update achievement progress', () => {
      const achievement = service.updateAchievementProgress('user-9', 'course-completion', 1);

      expect(achievement.currentValue).toBe(1);
      expect(achievement.status).toBe('IN_PROGRESS');
    });

    it('should unlock achievement tiers', () => {
      const achievement = service.updateAchievementProgress('user-10', 'course-completion', 5);

      expect(achievement.unlockedTiers).toContain(1);
      expect(achievement.unlockedTiers).toContain(2);
      expect(achievement.unlockedTiers).toContain(3);
    });

    it('should retrieve all achievements', () => {
      const achievements = service.getAllAchievements();

      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements[0].tiers).toBeDefined();
      expect(achievements[0].tiers.length).toBeGreaterThan(0);
    });

    it('should retrieve user achievements with progress', () => {
      service.updateAchievementProgress('user-11', 'course-completion', 2);

      const userAchievements = service.getUserAchievements('user-11');
      expect(userAchievements.length).toBeGreaterThan(0);
      expect(userAchievements[0].achievement).toBeDefined();
    });
  });

  describe('Streaks', () => {
    it('should record activity and maintain streak', () => {
      const streak = service.recordActivity('user-12');

      expect(streak.currentStreak).toBeGreaterThanOrEqual(0);
      expect(streak.lastActivityDate).toBeDefined();
    });

    it('should get streak info', () => {
      service.recordActivity('user-13');
      const streak = service.getStreak('user-13');

      expect(streak).toBeDefined();
      expect(streak.userId).toBe('user-13');
    });

    it('should have streak freeze available', () => {
      const streak = service.getStreak('user-14');

      expect(streak.streakFreezeAvailable).toBeGreaterThan(0);
    });

    it('should use streak freeze', () => {
      const result = service.useStreakFreeze('user-15');

      expect(result).toBe(true);

      const streak = service.getStreak('user-15');
      expect(streak.streakFreezeAvailable).toBe(1); // Started with 2
    });
  });

  describe('Leaderboards', () => {
    beforeEach(() => {
      // Create some users with points
      for (let i = 1; i <= 5; i++) {
        const userId = `leaderboard-user-${i}`;
        for (let j = 0; j < i * 2; j++) {
          service.awardPoints(userId, 'LESSON_COMPLETE');
        }
      }
    });

    it('should generate leaderboard', () => {
      const leaderboard = service.getLeaderboard('ALL_TIME', 10);

      expect(leaderboard.length).toBeGreaterThan(0);
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].points).toBeGreaterThanOrEqual(leaderboard[1]?.points || 0);
    });

    it('should get user rank', () => {
      const rank = service.getUserRank('leaderboard-user-5', 'ALL_TIME');

      expect(rank).toBeGreaterThan(0);
    });

    it('should support different leaderboard periods', () => {
      const daily = service.getLeaderboard('DAILY', 10);
      const weekly = service.getLeaderboard('WEEKLY', 10);
      const monthly = service.getLeaderboard('MONTHLY', 10);
      const allTime = service.getLeaderboard('ALL_TIME', 10);

      expect(Array.isArray(daily)).toBe(true);
      expect(Array.isArray(weekly)).toBe(true);
      expect(Array.isArray(monthly)).toBe(true);
      expect(Array.isArray(allTime)).toBe(true);
    });
  });

  describe('Challenges', () => {
    it('should get active challenges', () => {
      const challenges = service.getActiveChallenges();

      expect(Array.isArray(challenges)).toBe(true);
      // Should have at least 1 initialized challenge
      expect(challenges.length).toBeGreaterThan(0);
    });

    it('should join a challenge', () => {
      const challenges = service.getActiveChallenges();
      if (challenges.length > 0) {
        const userChallenge = service.joinChallenge('user-16', challenges[0].id);

        expect(userChallenge.challengeId).toBe(challenges[0].id);
        expect(userChallenge.progress).toBe(0);
        expect(userChallenge.completed).toBe(false);
      }
    });

    it('should update challenge progress', () => {
      const challenges = service.getActiveChallenges();
      if (challenges.length > 0) {
        service.joinChallenge('user-17', challenges[0].id);
        const updated = service.updateChallengeProgress('user-17', challenges[0].id, 5);

        expect(updated.progress).toBe(5);
      }
    });

    it('should retrieve user challenges', () => {
      const challenges = service.getActiveChallenges();
      if (challenges.length > 0) {
        service.joinChallenge('user-18', challenges[0].id);
        const userChallenges = service.getUserChallenges('user-18');

        expect(userChallenges.length).toBe(1);
        expect(userChallenges[0].challenge).toBeDefined();
      }
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian translations for badges', () => {
      const badge = service.getBadge('first-lesson');

      expect(badge?.nameRo).toBeDefined();
      expect(badge?.descriptionRo).toBeDefined();
      expect(badge?.nameRo).toBe('Primul Pas');
    });

    it('should have Romanian translations for achievements', () => {
      const achievements = service.getAllAchievements();

      expect(achievements[0].nameRo).toBeDefined();
      expect(achievements[0].descriptionRo).toBeDefined();
    });
  });

  describe('Period Stats Reset', () => {
    it('should reset weekly stats', () => {
      service.awardPoints('user-19', 'COURSE_COMPLETE');
      service.resetPeriodStats('weekly');

      const userPoints = service.getUserPoints('user-19');
      expect(userPoints.weeklyPoints).toBe(0);
      expect(userPoints.totalPoints).toBeGreaterThan(0); // Total should remain
    });

    it('should reset monthly stats', () => {
      service.awardPoints('user-20', 'COURSE_COMPLETE');
      service.resetPeriodStats('monthly');

      const userPoints = service.getUserPoints('user-20');
      expect(userPoints.monthlyPoints).toBe(0);
    });
  });
});
