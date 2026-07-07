import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';
import { createGamificationPrismaFake } from './testing/gamification-prisma.fake';

describe('GamificationService', () => {
  let service: GamificationService;
  let prismaFake: ReturnType<typeof createGamificationPrismaFake>;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    prismaFake = createGamificationPrismaFake();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PrismaService, useValue: prismaFake },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);

    jest.clearAllMocks();
  });

  /** Backdate the user's streak so the next recordActivity sees a day gap. */
  const backdateStreak = (userId: string, daysAgo: number) => {
    const row = prismaFake.__db.streaks.find((r: any) => r.userId === userId);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    row.lastActivityDate = d;
  };

  describe('Points Management', () => {
    it('should award points for completing a lesson', async () => {
      const transaction = await service.awardPoints('user-1', 'LESSON_COMPLETE');

      expect(transaction.points).toBe(10);
      expect(transaction.action).toBe('LESSON_COMPLETE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'gamification.points.awarded',
        expect.objectContaining({ userId: 'user-1', action: 'LESSON_COMPLETE' }),
      );
    });

    it('should award more points for course completion', async () => {
      const transaction = await service.awardPoints('user-1', 'COURSE_COMPLETE');

      expect(transaction.points).toBe(100);
    });

    it('should award points for perfect quiz score', async () => {
      const transaction = await service.awardPoints('user-1', 'PERFECT_SCORE');

      expect(transaction.points).toBe(50);
    });

    it('should accumulate points correctly', async () => {
      await service.awardPoints('user-2', 'LESSON_COMPLETE'); // 10
      await service.awardPoints('user-2', 'LESSON_COMPLETE'); // 10
      await service.awardPoints('user-2', 'QUIZ_PASS'); // 25

      const userPoints = await service.getUserPoints('user-2');
      expect(userPoints.totalPoints).toBe(45);
    });

    it('should level up when threshold is reached and emit level.up', async () => {
      // Award enough points to level up (100 for level 2)
      for (let i = 0; i < 10; i++) {
        await service.awardPoints('user-3', 'LESSON_COMPLETE'); // 10 each
      }

      const userPoints = await service.getUserPoints('user-3');
      expect(userPoints.level).toBeGreaterThanOrEqual(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'gamification.level.up',
        expect.objectContaining({ userId: 'user-3', newLevel: expect.any(Number) }),
      );
    });

    it('should apply a 10% streak bonus at a 7+ day streak', async () => {
      // Seed a 7-day streak directly in storage
      await service.getStreak('user-bonus');
      const row = prismaFake.__db.streaks.find((r: any) => r.userId === 'user-bonus');
      row.currentStreak = 7;

      const tx = await service.awardPoints('user-bonus', 'COURSE_COMPLETE'); // 100 + floor(10)
      expect(tx.points).toBe(110);
      expect(tx.description).toContain('bonus streak');
    });

    it('should track points history (newest first)', async () => {
      await service.awardPoints('user-4', 'LESSON_COMPLETE');
      await service.awardPoints('user-4', 'QUIZ_PASS');

      const history = await service.getPointsHistory('user-4');
      expect(history.length).toBe(2);
      expect(history[0].action).toBe('QUIZ_PASS');
    });
  });

  describe('Badges', () => {
    it('should award a badge and persist it', async () => {
      const userBadge = await service.awardBadge('user-5', 'first-lesson');

      expect(userBadge).not.toBeNull();
      expect(userBadge?.badgeId).toBe('first-lesson');
      expect(userBadge?.isNew).toBe(true);
      expect(prismaFake.__db.userBadges.length).toBe(1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'gamification.badge.earned',
        expect.objectContaining({ userId: 'user-5', badgeId: 'first-lesson' }),
      );
    });

    it('should not award duplicate badges (unique constraint)', async () => {
      await service.awardBadge('user-6', 'first-lesson');
      const duplicate = await service.awardBadge('user-6', 'first-lesson');

      expect(duplicate).toBeNull();
      expect(prismaFake.__db.userBadges.filter((b: any) => b.userId === 'user-6').length).toBe(1);
    });

    it('should retrieve user badges with catalog badge joined', async () => {
      await service.awardBadge('user-7', 'first-lesson');
      await service.awardBadge('user-7', 'first-course');

      const badges = await service.getUserBadges('user-7');
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

    it('should mark badge as seen', async () => {
      await service.awardBadge('user-8', 'first-lesson');
      await service.markBadgeSeen('user-8', 'first-lesson');

      const badges = await service.getUserBadges('user-8');
      expect(badges[0].isNew).toBe(false);
    });
  });

  describe('Achievements', () => {
    it('should update achievement progress', async () => {
      const achievement = await service.updateAchievementProgress('user-9', 'course-completion', 1);

      expect(achievement.currentValue).toBe(1);
      expect(achievement.status).toBe('IN_PROGRESS');
    });

    it('should unlock achievement tiers (and persist them)', async () => {
      const achievement = await service.updateAchievementProgress('user-10', 'course-completion', 5);

      expect(achievement.unlockedTiers).toContain(1);
      expect(achievement.unlockedTiers).toContain(2);
      expect(achievement.unlockedTiers).toContain(3);

      const persisted = prismaFake.__db.userAchievements.find(
        (r: any) => r.userId === 'user-10' && r.achievementId === 'course-completion',
      );
      expect(persisted.unlockedTiers).toEqual(expect.arrayContaining([1, 2, 3]));
    });

    it('should retrieve all achievements', () => {
      const achievements = service.getAllAchievements();

      expect(achievements.length).toBeGreaterThan(0);
      expect(achievements[0].tiers).toBeDefined();
      expect(achievements[0].tiers.length).toBeGreaterThan(0);
    });

    it('should retrieve user achievements with progress', async () => {
      await service.updateAchievementProgress('user-11', 'course-completion', 2);

      const userAchievements = await service.getUserAchievements('user-11');
      expect(userAchievements.length).toBeGreaterThan(0);
      expect(userAchievements[0].achievement).toBeDefined();
    });
  });

  describe('Streaks', () => {
    it('should record activity and maintain streak', async () => {
      const streak = await service.recordActivity('user-12');

      expect(streak.currentStreak).toBeGreaterThanOrEqual(0);
      expect(streak.lastActivityDate).toBeDefined();
    });

    it('should increment the streak on a consecutive day', async () => {
      await service.recordActivity('user-inc'); // creates streak (day 0)
      backdateStreak('user-inc', 1); // pretend last activity was yesterday

      const streak = await service.recordActivity('user-inc');
      expect(streak.currentStreak).toBe(1);
      expect(streak.longestStreak).toBeGreaterThanOrEqual(1);
    });

    it('should reset the streak after a multi-day gap', async () => {
      await service.getStreak('user-gap');
      const row = prismaFake.__db.streaks.find((r: any) => r.userId === 'user-gap');
      row.currentStreak = 5;
      row.streakFreezeAvailable = 0;
      backdateStreak('user-gap', 3);

      const streak = await service.recordActivity('user-gap');
      expect(streak.currentStreak).toBe(1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'gamification.streak.broken',
        expect.objectContaining({ userId: 'user-gap', previousStreak: 5 }),
      );
    });

    it('should preserve the streak with a freeze on a 2-day gap', async () => {
      await service.getStreak('user-frozen');
      const row = prismaFake.__db.streaks.find((r: any) => r.userId === 'user-frozen');
      row.currentStreak = 5;
      backdateStreak('user-frozen', 2);

      const streak = await service.recordActivity('user-frozen');
      expect(streak.currentStreak).toBe(6);
      expect(streak.streakFreezeAvailable).toBe(1); // consumed one of 2
    });

    it('should get streak info', async () => {
      await service.recordActivity('user-13');
      const streak = await service.getStreak('user-13');

      expect(streak).toBeDefined();
      expect(streak.userId).toBe('user-13');
    });

    it('should have streak freeze available', async () => {
      const streak = await service.getStreak('user-14');

      expect(streak.streakFreezeAvailable).toBeGreaterThan(0);
    });

    it('should use streak freeze', async () => {
      const result = await service.useStreakFreeze('user-15');

      expect(result).toBe(true);

      const streak = await service.getStreak('user-15');
      expect(streak.streakFreezeAvailable).toBe(1); // Started with 2
    });
  });

  describe('Leaderboards', () => {
    beforeEach(async () => {
      // Create some users with points
      for (let i = 1; i <= 5; i++) {
        const userId = `leaderboard-user-${i}`;
        for (let j = 0; j < i * 2; j++) {
          await service.awardPoints(userId, 'LESSON_COMPLETE');
        }
      }
    });

    it('should generate leaderboard', async () => {
      const leaderboard = await service.getLeaderboard('ALL_TIME', 10);

      expect(leaderboard.length).toBeGreaterThan(0);
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[0].points).toBeGreaterThanOrEqual(leaderboard[1]?.points || 0);
    });

    it('should get user rank', async () => {
      const rank = await service.getUserRank('leaderboard-user-5', 'ALL_TIME');

      expect(rank).toBeGreaterThan(0);
    });

    it('should support different leaderboard periods', async () => {
      const daily = await service.getLeaderboard('DAILY', 10);
      const weekly = await service.getLeaderboard('WEEKLY', 10);
      const monthly = await service.getLeaderboard('MONTHLY', 10);
      const allTime = await service.getLeaderboard('ALL_TIME', 10);

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

    it('should join a challenge', async () => {
      const challenges = service.getActiveChallenges();
      if (challenges.length > 0) {
        const userChallenge = await service.joinChallenge('user-16', challenges[0].id);

        expect(userChallenge.challengeId).toBe(challenges[0].id);
        expect(userChallenge.progress).toBe(0);
        expect(userChallenge.completed).toBe(false);
      }
    });

    it('should update challenge progress', async () => {
      const challenges = service.getActiveChallenges();
      if (challenges.length > 0) {
        await service.joinChallenge('user-17', challenges[0].id);
        const updated = await service.updateChallengeProgress('user-17', challenges[0].id, 5);

        expect(updated.progress).toBe(5);
      }
    });

    it('should retrieve user challenges', async () => {
      const challenges = service.getActiveChallenges();
      if (challenges.length > 0) {
        await service.joinChallenge('user-18', challenges[0].id);
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
    it('should reset weekly stats', async () => {
      await service.awardPoints('user-19', 'COURSE_COMPLETE');
      await service.resetPeriodStats('weekly');

      const userPoints = await service.getUserPoints('user-19');
      expect(userPoints.weeklyPoints).toBe(0);
      expect(userPoints.totalPoints).toBeGreaterThan(0); // Total should remain
    });

    it('should reset monthly stats', async () => {
      await service.awardPoints('user-20', 'COURSE_COMPLETE');
      await service.resetPeriodStats('monthly');

      const userPoints = await service.getUserPoints('user-20');
      expect(userPoints.monthlyPoints).toBe(0);
    });
  });

  describe('Persistence (restart durability at the fake level)', () => {
    it('a second service instance over the same storage sees the same state', async () => {
      await service.awardPoints('user-persist', 'COURSE_COMPLETE');
      await service.awardBadge('user-persist', 'first-course');

      const module2: TestingModule = await Test.createTestingModule({
        providers: [
          GamificationService,
          { provide: EventEmitter2, useValue: mockEventEmitter },
          { provide: PrismaService, useValue: prismaFake },
        ],
      }).compile();
      const service2 = module2.get<GamificationService>(GamificationService);

      const points = await service2.getUserPoints('user-persist');
      const badges = await service2.getUserBadges('user-persist');
      expect(points.totalPoints).toBeGreaterThan(0);
      expect(badges.some((b) => b.badgeId === 'first-course')).toBe(true);
    });
  });
});
