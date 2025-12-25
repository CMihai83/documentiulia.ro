import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GamificationAnalyticsService,
  TimeRange,
  GamificationDashboard,
  EngagementMetrics,
  PointsAnalytics,
  BadgeAnalytics,
  StreakAnalytics,
  LeaderboardAnalytics,
  ChallengeAnalytics,
  AchievementAnalytics,
  LevelAnalytics,
  CohortAnalytics,
} from './gamification-analytics.service';

describe('GamificationAnalyticsService', () => {
  let service: GamificationAnalyticsService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationAnalyticsService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<GamificationAnalyticsService>(GamificationAnalyticsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Dashboard', () => {
    it('should return dashboard with all required sections', async () => {
      const dashboard = await service.getDashboard('LAST_30_DAYS');

      expect(dashboard).toBeDefined();
      expect(dashboard.overview).toBeDefined();
      expect(dashboard.widgets).toBeDefined();
      expect(dashboard.insights).toBeDefined();
      expect(dashboard.lastUpdated).toBeDefined();
    });

    it('should include overview metrics', async () => {
      const dashboard = await service.getDashboard();

      expect(dashboard.overview.totalUsers).toBeGreaterThan(0);
      expect(dashboard.overview.activeUsers).toBeGreaterThan(0);
      expect(dashboard.overview.totalPoints).toBeGreaterThan(0);
      expect(dashboard.overview.totalBadges).toBeGreaterThan(0);
      expect(dashboard.overview.avgEngagement).toBeGreaterThanOrEqual(0);
      expect(dashboard.overview.avgEngagement).toBeLessThanOrEqual(100);
    });

    it('should include dashboard widgets', async () => {
      const dashboard = await service.getDashboard();

      expect(dashboard.widgets.length).toBeGreaterThan(0);

      // Check widget structure
      const widget = dashboard.widgets[0];
      expect(widget.id).toBeDefined();
      expect(widget.title).toBeDefined();
      expect(widget.titleRo).toBeDefined();
      expect(widget.type).toBeDefined();
      expect(widget.data).toBeDefined();
    });

    it('should generate insights', async () => {
      const dashboard = await service.getDashboard();

      // Should have at least some insights
      expect(Array.isArray(dashboard.insights)).toBe(true);

      if (dashboard.insights.length > 0) {
        const insight = dashboard.insights[0];
        expect(insight.id).toBeDefined();
        expect(insight.type).toBeDefined();
        expect(insight.title).toBeDefined();
        expect(insight.titleRo).toBeDefined();
        expect(insight.metric).toBeDefined();
        expect(insight.severity).toBeDefined();
      }
    });

    it('should cache dashboard results', async () => {
      const dashboard1 = await service.getDashboard('LAST_7_DAYS');
      const dashboard2 = await service.getDashboard('LAST_7_DAYS');

      // Should return cached result (same lastUpdated)
      expect(dashboard1.lastUpdated.getTime()).toBe(dashboard2.lastUpdated.getTime());
    });

    it('should support different time ranges', async () => {
      const timeRanges: TimeRange[] = ['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', 'ALL_TIME'];

      for (const range of timeRanges) {
        const dashboard = await service.getDashboard(range);
        expect(dashboard).toBeDefined();
        expect(dashboard.overview).toBeDefined();
      }
    });
  });

  describe('Engagement Metrics', () => {
    it('should calculate engagement metrics', async () => {
      const metrics = await service.getEngagementMetrics('LAST_30_DAYS');

      expect(metrics.dailyActiveUsers).toBeDefined();
      expect(metrics.weeklyActiveUsers).toBeDefined();
      expect(metrics.monthlyActiveUsers).toBeDefined();
      expect(metrics.dauMauRatio).toBeDefined();
    });

    it('should include session metrics', async () => {
      const metrics = await service.getEngagementMetrics('LAST_30_DAYS');

      expect(metrics.avgSessionDuration).toBeGreaterThan(0);
      expect(metrics.avgSessionsPerUser).toBeGreaterThan(0);
      expect(metrics.avgActionsPerSession).toBeGreaterThan(0);
    });

    it('should include completion rates', async () => {
      const metrics = await service.getEngagementMetrics('LAST_30_DAYS');

      expect(metrics.lessonCompletionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.lessonCompletionRate).toBeLessThanOrEqual(100);
      expect(metrics.courseCompletionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.quizPassRate).toBeGreaterThanOrEqual(0);
    });

    it('should include retention metrics', async () => {
      const metrics = await service.getEngagementMetrics('LAST_30_DAYS');

      expect(metrics.day1Retention).toBeGreaterThanOrEqual(0);
      expect(metrics.day7Retention).toBeGreaterThanOrEqual(0);
      expect(metrics.day30Retention).toBeGreaterThanOrEqual(0);
    });

    it('should calculate overall engagement score', async () => {
      const metrics = await service.getEngagementMetrics('LAST_30_DAYS');

      expect(metrics.overallEngagementScore).toBeGreaterThanOrEqual(0);
      expect(metrics.overallEngagementScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Points Analytics', () => {
    it('should return points analytics', async () => {
      const analytics = await service.getPointsAnalytics('LAST_30_DAYS');

      expect(analytics.totalPointsAwarded).toBeGreaterThan(0);
      expect(analytics.avgPointsPerUser).toBeGreaterThan(0);
      expect(analytics.medianPointsPerUser).toBeGreaterThan(0);
    });

    it('should break down points by action', async () => {
      const analytics = await service.getPointsAnalytics('LAST_30_DAYS');

      expect(analytics.pointsByAction.length).toBeGreaterThan(0);
      expect(analytics.pointsByAction[0].action).toBeDefined();
      expect(analytics.pointsByAction[0].points).toBeGreaterThan(0);
      expect(analytics.pointsByAction[0].count).toBeGreaterThan(0);
    });

    it('should include points trend', async () => {
      const analytics = await service.getPointsAnalytics('LAST_30_DAYS');

      expect(analytics.pointsTrend.length).toBeGreaterThan(0);
      expect(analytics.pointsTrend[0].timestamp).toBeDefined();
      expect(analytics.pointsTrend[0].value).toBeGreaterThanOrEqual(0);
    });

    it('should include top earners', async () => {
      const analytics = await service.getPointsAnalytics('LAST_30_DAYS');

      expect(analytics.topEarners.length).toBeGreaterThan(0);
      expect(analytics.topEarners[0].rank).toBe(1);
      expect(analytics.topEarners[0].points).toBeGreaterThan(analytics.topEarners[1]?.points || 0);
    });

    it('should include points distribution', async () => {
      const analytics = await service.getPointsAnalytics('LAST_30_DAYS');

      expect(analytics.pointsDistribution.length).toBeGreaterThan(0);
      expect(analytics.pointsDistribution[0].range).toBeDefined();
      expect(analytics.pointsDistribution[0].count).toBeGreaterThan(0);
    });
  });

  describe('Badge Analytics', () => {
    it('should return badge analytics', async () => {
      const analytics = await service.getBadgeAnalytics('LAST_30_DAYS');

      expect(analytics.totalBadgesAwarded).toBeGreaterThan(0);
      expect(analytics.uniqueBadgesEarned).toBeGreaterThan(0);
      expect(analytics.avgBadgesPerUser).toBeGreaterThan(0);
    });

    it('should break down badges by category', async () => {
      const analytics = await service.getBadgeAnalytics('LAST_30_DAYS');

      expect(analytics.badgesByCategory.length).toBeGreaterThan(0);

      const totalPercentage = analytics.badgesByCategory.reduce((sum, b) => sum + b.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('should break down badges by rarity', async () => {
      const analytics = await service.getBadgeAnalytics('LAST_30_DAYS');

      expect(analytics.badgesByRarity.length).toBeGreaterThan(0);
      expect(analytics.badgesByRarity.some(b => b.rarity === 'COMMON')).toBe(true);
      expect(analytics.badgesByRarity.some(b => b.rarity === 'LEGENDARY')).toBe(true);
    });

    it('should include most and least earned badges', async () => {
      const analytics = await service.getBadgeAnalytics('LAST_30_DAYS');

      expect(analytics.mostEarnedBadges.length).toBeGreaterThan(0);
      expect(analytics.leastEarnedBadges.length).toBeGreaterThan(0);

      // Most earned should have higher count than least earned
      expect(analytics.mostEarnedBadges[0].count).toBeGreaterThan(
        analytics.leastEarnedBadges[0].count,
      );
    });

    it('should include recent badges', async () => {
      const analytics = await service.getBadgeAnalytics('LAST_30_DAYS');

      expect(analytics.recentBadges.length).toBeGreaterThan(0);
      expect(analytics.recentBadges[0].badgeId).toBeDefined();
      expect(analytics.recentBadges[0].userId).toBeDefined();
      expect(analytics.recentBadges[0].earnedAt).toBeDefined();
    });
  });

  describe('Streak Analytics', () => {
    it('should return streak analytics', async () => {
      const analytics = await service.getStreakAnalytics('LAST_30_DAYS');

      expect(analytics.avgCurrentStreak).toBeGreaterThan(0);
      expect(analytics.maxCurrentStreak).toBeGreaterThan(0);
      expect(analytics.avgLongestStreak).toBeGreaterThan(0);
      expect(analytics.usersWithActiveStreak).toBeGreaterThan(0);
    });

    it('should include streak distribution', async () => {
      const analytics = await service.getStreakAnalytics('LAST_30_DAYS');

      expect(analytics.streakDistribution.length).toBeGreaterThan(0);
      expect(analytics.streakDistribution[0].range).toBeDefined();
      expect(analytics.streakDistribution[0].count).toBeGreaterThan(0);
    });

    it('should include streak trend', async () => {
      const analytics = await service.getStreakAnalytics('LAST_30_DAYS');

      expect(analytics.streakTrend.length).toBeGreaterThan(0);
    });

    it('should track streak freeze usage', async () => {
      const analytics = await service.getStreakAnalytics('LAST_30_DAYS');

      expect(analytics.streakFreezeUsage).toBeDefined();
      expect(analytics.streakFreezeUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Leaderboard Analytics', () => {
    it('should return leaderboard analytics', async () => {
      const analytics = await service.getLeaderboardAnalytics('LAST_30_DAYS');

      expect(analytics.totalParticipants).toBeGreaterThan(0);
      expect(analytics.avgRankChange).toBeDefined();
      expect(analytics.competitiveness).toBeGreaterThanOrEqual(0);
      expect(analytics.competitiveness).toBeLessThanOrEqual(100);
    });

    it('should include top movers', async () => {
      const analytics = await service.getLeaderboardAnalytics('LAST_30_DAYS');

      expect(analytics.topMovers.length).toBeGreaterThan(0);
      expect(analytics.topMovers[0].userId).toBeDefined();
      expect(analytics.topMovers[0].change).toBeDefined();
      expect(['UP', 'DOWN']).toContain(analytics.topMovers[0].direction);
    });

    it('should include period distribution', async () => {
      const analytics = await service.getLeaderboardAnalytics('LAST_30_DAYS');

      expect(analytics.periodDistribution.length).toBe(4);
      expect(analytics.periodDistribution.some(p => p.period === 'DAILY')).toBe(true);
      expect(analytics.periodDistribution.some(p => p.period === 'ALL_TIME')).toBe(true);
    });
  });

  describe('Challenge Analytics', () => {
    it('should return challenge analytics', async () => {
      const analytics = await service.getChallengeAnalytics('LAST_30_DAYS');

      expect(analytics.activeChallenges).toBeGreaterThan(0);
      expect(analytics.totalParticipants).toBeGreaterThan(0);
      expect(analytics.avgCompletionRate).toBeGreaterThanOrEqual(0);
    });

    it('should break down challenges by type', async () => {
      const analytics = await service.getChallengeAnalytics('LAST_30_DAYS');

      expect(analytics.challengesByType.length).toBeGreaterThan(0);
      expect(analytics.challengesByType[0].type).toBeDefined();
      expect(analytics.challengesByType[0].completionRate).toBeGreaterThanOrEqual(0);
    });

    it('should include top challenges', async () => {
      const analytics = await service.getChallengeAnalytics('LAST_30_DAYS');

      expect(analytics.topChallenges.length).toBeGreaterThan(0);
      expect(analytics.topChallenges[0].title).toBeDefined();
      expect(analytics.topChallenges[0].participants).toBeGreaterThan(0);
    });

    it('should include completion trend', async () => {
      const analytics = await service.getChallengeAnalytics('LAST_30_DAYS');

      expect(analytics.completionTrend.length).toBeGreaterThan(0);
    });
  });

  describe('Achievement Analytics', () => {
    it('should return achievement analytics', async () => {
      const analytics = await service.getAchievementAnalytics('LAST_30_DAYS');

      expect(analytics.totalUnlocked).toBeGreaterThan(0);
      expect(analytics.avgTierUnlocked).toBeGreaterThan(0);
    });

    it('should break down achievements by category', async () => {
      const analytics = await service.getAchievementAnalytics('LAST_30_DAYS');

      expect(analytics.achievementsByCategory.length).toBeGreaterThan(0);
      expect(analytics.achievementsByCategory[0].category).toBeDefined();
      expect(analytics.achievementsByCategory[0].unlocked).toBeLessThanOrEqual(
        analytics.achievementsByCategory[0].total,
      );
    });

    it('should include most progressed achievements', async () => {
      const analytics = await service.getAchievementAnalytics('LAST_30_DAYS');

      expect(analytics.mostProgressedAchievements.length).toBeGreaterThan(0);
      expect(analytics.mostProgressedAchievements[0].avgProgress).toBeDefined();
    });

    it('should include recent unlocks', async () => {
      const analytics = await service.getAchievementAnalytics('LAST_30_DAYS');

      expect(analytics.recentUnlocks.length).toBeGreaterThan(0);
      expect(analytics.recentUnlocks[0].tier).toBeGreaterThan(0);
    });
  });

  describe('Level Analytics', () => {
    it('should return level analytics', async () => {
      const analytics = await service.getLevelAnalytics('LAST_30_DAYS');

      expect(analytics.avgLevel).toBeGreaterThan(0);
      expect(analytics.maxLevel).toBeGreaterThan(0);
      expect(analytics.maxLevel).toBeGreaterThanOrEqual(analytics.avgLevel);
    });

    it('should include level distribution', async () => {
      const analytics = await service.getLevelAnalytics('LAST_30_DAYS');

      expect(analytics.levelDistribution.length).toBeGreaterThan(0);

      const totalPercentage = analytics.levelDistribution.reduce((sum, l) => sum + l.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('should include level up trend', async () => {
      const analytics = await service.getLevelAnalytics('LAST_30_DAYS');

      expect(analytics.levelUpTrend.length).toBeGreaterThan(0);
    });

    it('should include average time to level', async () => {
      const analytics = await service.getLevelAnalytics('LAST_30_DAYS');

      expect(analytics.avgTimeToLevel.length).toBeGreaterThan(0);
      expect(analytics.avgTimeToLevel[0].level).toBeGreaterThan(0);
      expect(analytics.avgTimeToLevel[0].avgDays).toBeGreaterThan(0);

      // Higher levels should take longer
      const sorted = [...analytics.avgTimeToLevel].sort((a, b) => a.level - b.level);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].avgDays).toBeGreaterThanOrEqual(sorted[i - 1].avgDays);
      }
    });
  });

  describe('Cohort Analytics', () => {
    it('should return cohort analytics', async () => {
      const cohorts = await service.getCohortAnalytics('LAST_30_DAYS');

      expect(cohorts.length).toBeGreaterThan(0);
    });

    it('should include cohort metrics', async () => {
      const cohorts = await service.getCohortAnalytics('LAST_30_DAYS');
      const cohort = cohorts[0];

      expect(cohort.cohortId).toBeDefined();
      expect(cohort.cohortName).toBeDefined();
      expect(cohort.usersCount).toBeGreaterThan(0);
      expect(cohort.avgPoints).toBeGreaterThan(0);
      expect(cohort.avgLevel).toBeGreaterThan(0);
      expect(cohort.avgBadges).toBeGreaterThan(0);
      expect(cohort.engagementScore).toBeGreaterThanOrEqual(0);
      expect(cohort.retentionRate).toBeGreaterThanOrEqual(0);
    });

    it('should have Romanian cohort names', async () => {
      const cohorts = await service.getCohortAnalytics('LAST_30_DAYS');

      expect(cohorts.some(c => c.cohortName.includes('Ianuarie'))).toBe(true);
    });
  });

  describe('Data Export', () => {
    it('should export data as JSON', async () => {
      const result = await service.exportData({
        format: 'JSON',
        timeRange: 'LAST_30_DAYS',
        metrics: ['engagement', 'points'],
        includeCharts: false,
      });

      expect(result.id).toBeDefined();
      expect(result.format).toBe('JSON');
      expect(result.data).toBeDefined();
      expect(result.data.engagement).toBeDefined();
      expect(result.data.points).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('should export data as CSV with file URL', async () => {
      const result = await service.exportData({
        format: 'CSV',
        timeRange: 'LAST_30_DAYS',
        metrics: ['badges'],
        includeCharts: false,
      });

      expect(result.format).toBe('CSV');
      expect(result.fileUrl).toBeDefined();
      expect(result.fileUrl).toContain('.csv');
    });

    it('should emit export event', async () => {
      await service.exportData({
        format: 'JSON',
        timeRange: 'LAST_7_DAYS',
        metrics: ['streaks', 'leaderboard'],
        includeCharts: true,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'gamification.analytics.exported',
        expect.objectContaining({
          format: 'JSON',
          metrics: ['streaks', 'leaderboard'],
        }),
      );
    });

    it('should support multiple metrics in export', async () => {
      const result = await service.exportData({
        format: 'JSON',
        timeRange: 'LAST_30_DAYS',
        metrics: ['engagement', 'points', 'badges', 'streaks', 'leaderboard', 'challenges'],
        includeCharts: true,
      });

      expect(result.data.engagement).toBeDefined();
      expect(result.data.points).toBeDefined();
      expect(result.data.badges).toBeDefined();
      expect(result.data.streaks).toBeDefined();
      expect(result.data.leaderboard).toBeDefined();
      expect(result.data.challenges).toBeDefined();
    });
  });

  describe('Real-Time Metrics', () => {
    it('should return real-time metrics', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics.activeNow).toBeGreaterThan(0);
      expect(metrics.pointsLastHour).toBeGreaterThan(0);
      expect(metrics.badgesLastHour).toBeGreaterThanOrEqual(0);
      expect(metrics.challengesCompleted).toBeGreaterThanOrEqual(0);
    });

    it('should include top activity breakdown', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics.topActivity.length).toBeGreaterThan(0);
      expect(metrics.topActivity[0].action).toBeDefined();
      expect(metrics.topActivity[0].count).toBeGreaterThan(0);
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian translations in dashboard widgets', async () => {
      const dashboard = await service.getDashboard();

      dashboard.widgets.forEach(widget => {
        expect(widget.titleRo).toBeDefined();
        expect(widget.titleRo.length).toBeGreaterThan(0);
      });
    });

    it('should have Romanian translations in insights', async () => {
      const dashboard = await service.getDashboard();

      dashboard.insights.forEach(insight => {
        expect(insight.titleRo).toBeDefined();
        expect(insight.descriptionRo).toBeDefined();
      });
    });
  });
});
