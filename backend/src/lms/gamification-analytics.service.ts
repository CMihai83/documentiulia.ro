import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Sprint 22: LMS Gamification Analytics Dashboard
// Comprehensive analytics, insights, and reporting for gamification engagement

// ===== TYPES =====

export type TimeRange = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'THIS_MONTH' | 'THIS_YEAR' | 'ALL_TIME';
export type MetricGranularity = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
export type ChartType = 'LINE' | 'BAR' | 'PIE' | 'AREA' | 'DONUT';

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  titleRo: string; // Romanian translation
  type: 'METRIC' | 'CHART' | 'TABLE' | 'PROGRESS' | 'LEADERBOARD';
  chartType?: ChartType;
  data: any;
  change?: {
    value: number;
    percentage: number;
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
  };
  lastUpdated: Date;
}

export interface EngagementMetrics {
  // Active users
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  dauMauRatio: number; // Stickiness

  // Session metrics
  avgSessionDuration: number; // seconds
  avgSessionsPerUser: number;
  avgActionsPerSession: number;

  // Completion metrics
  lessonCompletionRate: number;
  courseCompletionRate: number;
  quizPassRate: number;
  avgQuizScore: number;

  // Retention
  day1Retention: number;
  day7Retention: number;
  day30Retention: number;

  // Engagement score (composite)
  overallEngagementScore: number;
}

export interface PointsAnalytics {
  totalPointsAwarded: number;
  avgPointsPerUser: number;
  medianPointsPerUser: number;
  pointsByAction: { action: string; points: number; count: number }[];
  pointsTrend: TimeSeriesDataPoint[];
  topEarners: { userId: string; userName: string; points: number; rank: number }[];
  pointsDistribution: { range: string; count: number }[];
}

export interface BadgeAnalytics {
  totalBadgesAwarded: number;
  uniqueBadgesEarned: number;
  avgBadgesPerUser: number;
  badgesByCategory: { category: string; count: number; percentage: number }[];
  badgesByRarity: { rarity: string; count: number; percentage: number }[];
  mostEarnedBadges: { badgeId: string; name: string; count: number }[];
  leastEarnedBadges: { badgeId: string; name: string; count: number }[];
  recentBadges: { badgeId: string; userId: string; earnedAt: Date }[];
}

export interface StreakAnalytics {
  avgCurrentStreak: number;
  maxCurrentStreak: number;
  avgLongestStreak: number;
  usersWithActiveStreak: number;
  streakBreakRate: number;
  streakDistribution: { range: string; count: number }[];
  streakTrend: TimeSeriesDataPoint[];
  streakFreezeUsage: number;
}

export interface LeaderboardAnalytics {
  totalParticipants: number;
  avgRankChange: number;
  topMovers: { userId: string; change: number; direction: 'UP' | 'DOWN' }[];
  periodDistribution: { period: string; participants: number }[];
  competitiveness: number; // 0-100 score
}

export interface ChallengeAnalytics {
  activeChallenges: number;
  totalParticipants: number;
  avgCompletionRate: number;
  challengesByType: { type: string; count: number; completionRate: number }[];
  topChallenges: { challengeId: string; title: string; participants: number }[];
  completionTrend: TimeSeriesDataPoint[];
}

export interface AchievementAnalytics {
  totalUnlocked: number;
  avgTierUnlocked: number;
  achievementsByCategory: { category: string; unlocked: number; total: number }[];
  mostProgressedAchievements: { achievementId: string; name: string; avgProgress: number }[];
  recentUnlocks: { achievementId: string; userId: string; tier: number; unlockedAt: Date }[];
}

export interface LevelAnalytics {
  avgLevel: number;
  maxLevel: number;
  levelDistribution: { level: number; count: number; percentage: number }[];
  levelUpTrend: TimeSeriesDataPoint[];
  avgTimeToLevel: { level: number; avgDays: number }[];
}

export interface CohortAnalytics {
  cohortId: string;
  cohortName: string;
  usersCount: number;
  avgPoints: number;
  avgLevel: number;
  avgBadges: number;
  engagementScore: number;
  retentionRate: number;
}

export interface GamificationInsight {
  id: string;
  type: 'TREND' | 'ANOMALY' | 'RECOMMENDATION' | 'WARNING';
  title: string;
  titleRo: string;
  description: string;
  descriptionRo: string;
  metric: string;
  value: number;
  expectedValue?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  actionable: boolean;
  suggestedAction?: string;
  createdAt: Date;
}

export interface GamificationDashboard {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalPoints: number;
    totalBadges: number;
    avgEngagement: number;
  };
  widgets: DashboardWidget[];
  insights: GamificationInsight[];
  lastUpdated: Date;
}

export interface ExportRequest {
  format: 'CSV' | 'JSON' | 'PDF' | 'XLSX';
  timeRange: TimeRange;
  metrics: string[];
  includeCharts: boolean;
}

export interface ExportResult {
  id: string;
  format: string;
  fileUrl?: string;
  data?: any;
  generatedAt: Date;
}

// ===== CONSTANTS =====

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ENGAGEMENT_WEIGHTS = {
  points: 0.25,
  badges: 0.20,
  streaks: 0.20,
  completion: 0.20,
  social: 0.15,
};

@Injectable()
export class GamificationAnalyticsService {
  private readonly logger = new Logger(GamificationAnalyticsService.name);

  // Simulated storage (in production, would connect to gamification service data)
  private readonly userActivity: Map<string, { userId: string; action: string; timestamp: Date }[]> = new Map();
  private readonly userSessions: Map<string, { userId: string; startTime: Date; endTime?: Date; actions: number }[]> = new Map();
  private readonly dashboardCache: Map<string, { data: any; cachedAt: Date }> = new Map();

  // Analytics data storage
  private readonly pointsHistory: Map<string, TimeSeriesDataPoint[]> = new Map();
  private readonly badgeAwards: Map<string, { badgeId: string; userId: string; category: string; rarity: string; awardedAt: Date }[]> = new Map();
  private readonly streakHistory: Map<string, { streak: number; date: Date }[]> = new Map();
  private readonly levelUps: Map<string, { userId: string; fromLevel: number; toLevel: number; date: Date }[]> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    // Initialize with sample data for testing
    this.initializeSampleData();
  }

  // ===== DASHBOARD =====

  async getDashboard(timeRange: TimeRange = 'LAST_30_DAYS'): Promise<GamificationDashboard> {
    const cacheKey = `dashboard-${timeRange}`;
    const cached = this.dashboardCache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_TTL) {
      return cached.data;
    }

    const engagement = await this.getEngagementMetrics(timeRange);
    const points = await this.getPointsAnalytics(timeRange);
    const badges = await this.getBadgeAnalytics(timeRange);

    const dashboard: GamificationDashboard = {
      overview: {
        totalUsers: this.getTotalUsers(),
        activeUsers: engagement.dailyActiveUsers,
        totalPoints: points.totalPointsAwarded,
        totalBadges: badges.totalBadgesAwarded,
        avgEngagement: engagement.overallEngagementScore,
      },
      widgets: this.buildWidgets(timeRange, engagement, points, badges),
      insights: this.generateInsights(engagement, points, badges),
      lastUpdated: new Date(),
    };

    this.dashboardCache.set(cacheKey, { data: dashboard, cachedAt: new Date() });

    return dashboard;
  }

  private buildWidgets(
    timeRange: TimeRange,
    engagement: EngagementMetrics,
    points: PointsAnalytics,
    badges: BadgeAnalytics,
  ): DashboardWidget[] {
    return [
      // Active Users Widget
      {
        id: 'active-users',
        title: 'Active Users',
        titleRo: 'Utilizatori Activi',
        type: 'METRIC',
        data: {
          dau: engagement.dailyActiveUsers,
          wau: engagement.weeklyActiveUsers,
          mau: engagement.monthlyActiveUsers,
        },
        change: {
          value: Math.floor(Math.random() * 50) - 25,
          percentage: Math.floor(Math.random() * 20) - 10,
          direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
        },
        lastUpdated: new Date(),
      },
      // Points Trend Widget
      {
        id: 'points-trend',
        title: 'Points Trend',
        titleRo: 'Tendință Puncte',
        type: 'CHART',
        chartType: 'AREA',
        data: points.pointsTrend,
        lastUpdated: new Date(),
      },
      // Badge Distribution Widget
      {
        id: 'badge-distribution',
        title: 'Badge Distribution',
        titleRo: 'Distribuție Insigne',
        type: 'CHART',
        chartType: 'DONUT',
        data: badges.badgesByCategory,
        lastUpdated: new Date(),
      },
      // Top Earners Widget
      {
        id: 'top-earners',
        title: 'Top Earners',
        titleRo: 'Top Câștigători',
        type: 'LEADERBOARD',
        data: points.topEarners.slice(0, 5),
        lastUpdated: new Date(),
      },
      // Engagement Score Widget
      {
        id: 'engagement-score',
        title: 'Engagement Score',
        titleRo: 'Scor Implicare',
        type: 'PROGRESS',
        data: {
          score: engagement.overallEngagementScore,
          target: 100,
          breakdown: {
            completion: engagement.courseCompletionRate,
            retention: engagement.day7Retention,
            activity: engagement.dauMauRatio * 100,
          },
        },
        lastUpdated: new Date(),
      },
      // Recent Badges Widget
      {
        id: 'recent-badges',
        title: 'Recent Badges',
        titleRo: 'Insigne Recente',
        type: 'TABLE',
        data: badges.recentBadges.slice(0, 10),
        lastUpdated: new Date(),
      },
    ];
  }

  // ===== ENGAGEMENT METRICS =====

  async getEngagementMetrics(timeRange: TimeRange): Promise<EngagementMetrics> {
    const { startDate, endDate } = this.getDateRange(timeRange);

    // Calculate active users
    const activeUsers = this.calculateActiveUsers(startDate, endDate);
    const dau = activeUsers.daily;
    const wau = activeUsers.weekly;
    const mau = activeUsers.monthly;

    // Session metrics
    const sessions = this.calculateSessionMetrics(startDate, endDate);

    // Completion rates
    const completionRates = this.calculateCompletionRates(startDate, endDate);

    // Retention
    const retention = this.calculateRetention(startDate, endDate);

    // Engagement score
    const engagementScore = this.calculateEngagementScore({
      dauMau: mau > 0 ? (dau / mau) : 0,
      completionRate: completionRates.course,
      retention: retention.day7,
      avgSessions: sessions.avgPerUser,
    });

    return {
      dailyActiveUsers: dau,
      weeklyActiveUsers: wau,
      monthlyActiveUsers: mau,
      dauMauRatio: mau > 0 ? dau / mau : 0,
      avgSessionDuration: sessions.avgDuration,
      avgSessionsPerUser: sessions.avgPerUser,
      avgActionsPerSession: sessions.avgActions,
      lessonCompletionRate: completionRates.lesson,
      courseCompletionRate: completionRates.course,
      quizPassRate: completionRates.quiz,
      avgQuizScore: completionRates.avgQuizScore,
      day1Retention: retention.day1,
      day7Retention: retention.day7,
      day30Retention: retention.day30,
      overallEngagementScore: engagementScore,
    };
  }

  private calculateActiveUsers(startDate: Date, endDate: Date): { daily: number; weekly: number; monthly: number } {
    const allActivities = Array.from(this.userActivity.values()).flat();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyUsers = new Set(allActivities.filter(a => a.timestamp >= dayAgo).map(a => a.userId));
    const weeklyUsers = new Set(allActivities.filter(a => a.timestamp >= weekAgo).map(a => a.userId));
    const monthlyUsers = new Set(allActivities.filter(a => a.timestamp >= monthAgo).map(a => a.userId));

    return {
      daily: dailyUsers.size || 150, // Default sample data
      weekly: weeklyUsers.size || 450,
      monthly: monthlyUsers.size || 1200,
    };
  }

  private calculateSessionMetrics(startDate: Date, endDate: Date): { avgDuration: number; avgPerUser: number; avgActions: number } {
    // Sample metrics (would calculate from real data)
    return {
      avgDuration: 1250, // ~21 minutes
      avgPerUser: 3.5,
      avgActions: 12.4,
    };
  }

  private calculateCompletionRates(startDate: Date, endDate: Date): { lesson: number; course: number; quiz: number; avgQuizScore: number } {
    // Sample rates (would calculate from real data)
    return {
      lesson: 78.5,
      course: 42.3,
      quiz: 85.2,
      avgQuizScore: 76.8,
    };
  }

  private calculateRetention(startDate: Date, endDate: Date): { day1: number; day7: number; day30: number } {
    // Sample retention (would calculate from real data)
    return {
      day1: 65.4,
      day7: 42.1,
      day30: 28.7,
    };
  }

  private calculateEngagementScore(metrics: { dauMau: number; completionRate: number; retention: number; avgSessions: number }): number {
    const score =
      (metrics.dauMau * 100) * ENGAGEMENT_WEIGHTS.points +
      metrics.completionRate * ENGAGEMENT_WEIGHTS.completion +
      metrics.retention * ENGAGEMENT_WEIGHTS.streaks +
      Math.min(100, metrics.avgSessions * 20) * ENGAGEMENT_WEIGHTS.badges +
      50 * ENGAGEMENT_WEIGHTS.social; // Social baseline

    return Math.min(100, Math.max(0, score));
  }

  // ===== POINTS ANALYTICS =====

  async getPointsAnalytics(timeRange: TimeRange): Promise<PointsAnalytics> {
    const { startDate, endDate } = this.getDateRange(timeRange);

    // Generate sample data
    const totalPoints = 2450000;
    const userCount = 1200;

    const pointsByAction = [
      { action: 'LESSON_COMPLETE', points: 980000, count: 98000 },
      { action: 'COURSE_COMPLETE', points: 450000, count: 4500 },
      { action: 'QUIZ_PASS', points: 375000, count: 15000 },
      { action: 'PERFECT_SCORE', points: 250000, count: 5000 },
      { action: 'DAILY_LOGIN', points: 145000, count: 29000 },
      { action: 'BADGE_EARNED', points: 125000, count: 5000 },
      { action: 'STREAK_BONUS', points: 75000, count: 15000 },
      { action: 'REVIEW_SUBMITTED', points: 45000, count: 3000 },
      { action: 'REFERRAL', points: 5000, count: 50 },
    ];

    return {
      totalPointsAwarded: totalPoints,
      avgPointsPerUser: Math.floor(totalPoints / userCount),
      medianPointsPerUser: Math.floor(totalPoints / userCount * 0.85),
      pointsByAction,
      pointsTrend: this.generateTimeSeries(timeRange, 'points'),
      topEarners: this.generateTopEarners(10),
      pointsDistribution: [
        { range: '0-500', count: 350 },
        { range: '501-1000', count: 280 },
        { range: '1001-2500', count: 250 },
        { range: '2501-5000', count: 180 },
        { range: '5001-10000', count: 95 },
        { range: '10000+', count: 45 },
      ],
    };
  }

  // ===== BADGE ANALYTICS =====

  async getBadgeAnalytics(timeRange: TimeRange): Promise<BadgeAnalytics> {
    return {
      totalBadgesAwarded: 5280,
      uniqueBadgesEarned: 15,
      avgBadgesPerUser: 4.4,
      badgesByCategory: [
        { category: 'COMPLETION', count: 2100, percentage: 39.8 },
        { category: 'STREAK', count: 1200, percentage: 22.7 },
        { category: 'MASTERY', count: 850, percentage: 16.1 },
        { category: 'SPEED', count: 530, percentage: 10.0 },
        { category: 'ENGAGEMENT', count: 400, percentage: 7.6 },
        { category: 'SOCIAL', count: 150, percentage: 2.8 },
        { category: 'SPECIAL', count: 50, percentage: 1.0 },
      ],
      badgesByRarity: [
        { rarity: 'COMMON', count: 2500, percentage: 47.3 },
        { rarity: 'UNCOMMON', count: 1500, percentage: 28.4 },
        { rarity: 'RARE', count: 850, percentage: 16.1 },
        { rarity: 'EPIC', count: 350, percentage: 6.6 },
        { rarity: 'LEGENDARY', count: 80, percentage: 1.5 },
      ],
      mostEarnedBadges: [
        { badgeId: 'first-lesson', name: 'Primul Pas', count: 1150 },
        { badgeId: 'week-streak', name: 'Săptămână Perfectă', count: 780 },
        { badgeId: 'first-course', name: 'Absolvent', count: 620 },
        { badgeId: 'quiz-master', name: 'Expert Quiz', count: 450 },
        { badgeId: 'speed-learner', name: 'Învățător Rapid', count: 320 },
      ],
      leastEarnedBadges: [
        { badgeId: 'legendary-streak', name: 'Legendă', count: 12 },
        { badgeId: 'course-master-10', name: 'Maestru Cursuri', count: 25 },
        { badgeId: 'perfect-month', name: 'Lună Perfectă', count: 38 },
        { badgeId: 'social-butterfly', name: 'Fluture Social', count: 45 },
        { badgeId: 'mentor', name: 'Mentor', count: 52 },
      ],
      recentBadges: this.generateRecentBadges(10),
    };
  }

  // ===== STREAK ANALYTICS =====

  async getStreakAnalytics(timeRange: TimeRange): Promise<StreakAnalytics> {
    return {
      avgCurrentStreak: 4.8,
      maxCurrentStreak: 127,
      avgLongestStreak: 12.3,
      usersWithActiveStreak: 680,
      streakBreakRate: 15.2,
      streakDistribution: [
        { range: '1-3 days', count: 450 },
        { range: '4-7 days', count: 320 },
        { range: '8-14 days', count: 180 },
        { range: '15-30 days', count: 95 },
        { range: '31-60 days', count: 42 },
        { range: '60+ days', count: 18 },
      ],
      streakTrend: this.generateTimeSeries(timeRange, 'streaks'),
      streakFreezeUsage: 234,
    };
  }

  // ===== LEADERBOARD ANALYTICS =====

  async getLeaderboardAnalytics(timeRange: TimeRange): Promise<LeaderboardAnalytics> {
    return {
      totalParticipants: 1105,
      avgRankChange: 3.2,
      topMovers: [
        { userId: 'user-125', change: 45, direction: 'UP' as const },
        { userId: 'user-892', change: 38, direction: 'UP' as const },
        { userId: 'user-456', change: 32, direction: 'UP' as const },
        { userId: 'user-234', change: -28, direction: 'DOWN' as const },
        { userId: 'user-567', change: -24, direction: 'DOWN' as const },
      ],
      periodDistribution: [
        { period: 'DAILY', participants: 420 },
        { period: 'WEEKLY', participants: 680 },
        { period: 'MONTHLY', participants: 890 },
        { period: 'ALL_TIME', participants: 1105 },
      ],
      competitiveness: 72.5,
    };
  }

  // ===== CHALLENGE ANALYTICS =====

  async getChallengeAnalytics(timeRange: TimeRange): Promise<ChallengeAnalytics> {
    return {
      activeChallenges: 8,
      totalParticipants: 3250,
      avgCompletionRate: 58.4,
      challengesByType: [
        { type: 'DAILY', count: 3, completionRate: 72.5 },
        { type: 'WEEKLY', count: 3, completionRate: 55.2 },
        { type: 'MONTHLY', count: 1, completionRate: 38.7 },
        { type: 'SPECIAL', count: 1, completionRate: 45.8 },
      ],
      topChallenges: [
        { challengeId: 'ch-daily-1', title: 'Completează 3 Lecții', participants: 890 },
        { challengeId: 'ch-weekly-1', title: 'Scor Perfect la Quiz', participants: 650 },
        { challengeId: 'ch-weekly-2', title: 'Streak de 7 Zile', participants: 520 },
        { challengeId: 'ch-special-1', title: 'Campion de Iarnă', participants: 480 },
      ],
      completionTrend: this.generateTimeSeries(timeRange, 'challenges'),
    };
  }

  // ===== ACHIEVEMENT ANALYTICS =====

  async getAchievementAnalytics(timeRange: TimeRange): Promise<AchievementAnalytics> {
    return {
      totalUnlocked: 4520,
      avgTierUnlocked: 2.1,
      achievementsByCategory: [
        { category: 'Learning', unlocked: 1850, total: 2400 },
        { category: 'Engagement', unlocked: 1200, total: 1800 },
        { category: 'Social', unlocked: 680, total: 1200 },
        { category: 'Mastery', unlocked: 450, total: 1000 },
        { category: 'Special', unlocked: 340, total: 600 },
      ],
      mostProgressedAchievements: [
        { achievementId: 'course-completion', name: 'Cursuri Complete', avgProgress: 68.5 },
        { achievementId: 'lesson-master', name: 'Maestru Lecții', avgProgress: 72.3 },
        { achievementId: 'quiz-expert', name: 'Expert Quiz', avgProgress: 55.8 },
        { achievementId: 'streak-keeper', name: 'Păstrător Streak', avgProgress: 45.2 },
      ],
      recentUnlocks: this.generateRecentUnlocks(10),
    };
  }

  // ===== LEVEL ANALYTICS =====

  async getLevelAnalytics(timeRange: TimeRange): Promise<LevelAnalytics> {
    return {
      avgLevel: 5.8,
      maxLevel: 18,
      levelDistribution: [
        { level: 1, count: 180, percentage: 15.0 },
        { level: 2, count: 165, percentage: 13.8 },
        { level: 3, count: 155, percentage: 12.9 },
        { level: 4, count: 140, percentage: 11.7 },
        { level: 5, count: 125, percentage: 10.4 },
        { level: 6, count: 105, percentage: 8.8 },
        { level: 7, count: 90, percentage: 7.5 },
        { level: 8, count: 75, percentage: 6.3 },
        { level: 9, count: 60, percentage: 5.0 },
        { level: 10, count: 45, percentage: 3.8 },
        { level: 11, count: 25, percentage: 2.1 },
        { level: 12, count: 18, percentage: 1.5 },
        { level: 13, count: 10, percentage: 0.8 },
        { level: 14, count: 5, percentage: 0.4 },
        { level: 15, count: 2, percentage: 0.2 },
      ],
      levelUpTrend: this.generateTimeSeries(timeRange, 'levelups'),
      avgTimeToLevel: [
        { level: 2, avgDays: 3 },
        { level: 3, avgDays: 7 },
        { level: 5, avgDays: 18 },
        { level: 7, avgDays: 35 },
        { level: 10, avgDays: 75 },
        { level: 15, avgDays: 180 },
      ],
    };
  }

  // ===== COHORT ANALYTICS =====

  async getCohortAnalytics(timeRange: TimeRange): Promise<CohortAnalytics[]> {
    return [
      {
        cohortId: 'jan-2025',
        cohortName: 'Ianuarie 2025',
        usersCount: 320,
        avgPoints: 2850,
        avgLevel: 6.2,
        avgBadges: 5.1,
        engagementScore: 72.5,
        retentionRate: 45.8,
      },
      {
        cohortId: 'dec-2024',
        cohortName: 'Decembrie 2024',
        usersCount: 280,
        avgPoints: 3450,
        avgLevel: 7.1,
        avgBadges: 5.8,
        engagementScore: 68.3,
        retentionRate: 42.1,
      },
      {
        cohortId: 'nov-2024',
        cohortName: 'Noiembrie 2024',
        usersCount: 250,
        avgPoints: 4120,
        avgLevel: 7.8,
        avgBadges: 6.4,
        engagementScore: 65.2,
        retentionRate: 38.5,
      },
      {
        cohortId: 'oct-2024',
        cohortName: 'Octombrie 2024',
        usersCount: 195,
        avgPoints: 4850,
        avgLevel: 8.5,
        avgBadges: 7.2,
        engagementScore: 62.8,
        retentionRate: 35.2,
      },
    ];
  }

  // ===== INSIGHTS =====

  private generateInsights(
    engagement: EngagementMetrics,
    points: PointsAnalytics,
    badges: BadgeAnalytics,
  ): GamificationInsight[] {
    const insights: GamificationInsight[] = [];

    // Engagement insights
    if (engagement.dauMauRatio < 0.1) {
      insights.push({
        id: 'insight-1',
        type: 'WARNING',
        title: 'Low Daily Engagement',
        titleRo: 'Implicare Zilnică Scăzută',
        description: 'Less than 10% of monthly users are active daily',
        descriptionRo: 'Mai puțin de 10% din utilizatorii lunari sunt activi zilnic',
        metric: 'DAU/MAU Ratio',
        value: engagement.dauMauRatio * 100,
        expectedValue: 15,
        severity: 'HIGH',
        actionable: true,
        suggestedAction: 'Implement daily login rewards and push notifications',
        createdAt: new Date(),
      });
    }

    // Streak insight
    if (engagement.day7Retention < 40) {
      insights.push({
        id: 'insight-2',
        type: 'RECOMMENDATION',
        title: 'Week 1 Retention Opportunity',
        titleRo: 'Oportunitate Retenție Săptămâna 1',
        description: 'Day 7 retention is below target',
        descriptionRo: 'Retenția la ziua 7 este sub țintă',
        metric: 'Day 7 Retention',
        value: engagement.day7Retention,
        expectedValue: 45,
        severity: 'MEDIUM',
        actionable: true,
        suggestedAction: 'Add streak freeze rewards and day-7 special badge',
        createdAt: new Date(),
      });
    }

    // Points trend insight
    if (points.avgPointsPerUser > 2000) {
      insights.push({
        id: 'insight-3',
        type: 'TREND',
        title: 'Strong Point Accumulation',
        titleRo: 'Acumulare Puternică de Puncte',
        description: 'Average points per user exceeds benchmark',
        descriptionRo: 'Media punctelor per utilizator depășește benchmark-ul',
        metric: 'Avg Points/User',
        value: points.avgPointsPerUser,
        expectedValue: 1500,
        severity: 'LOW',
        actionable: false,
        createdAt: new Date(),
      });
    }

    // Badge distribution insight
    const legendaryPct = badges.badgesByRarity.find(b => b.rarity === 'LEGENDARY')?.percentage || 0;
    if (legendaryPct < 2) {
      insights.push({
        id: 'insight-4',
        type: 'ANOMALY',
        title: 'Rare Badge Scarcity',
        titleRo: 'Lipsă Insigne Rare',
        description: 'Very few legendary badges have been earned',
        descriptionRo: 'Foarte puține insigne legendare au fost câștigate',
        metric: 'Legendary Badge %',
        value: legendaryPct,
        expectedValue: 3,
        severity: 'LOW',
        actionable: true,
        suggestedAction: 'Review legendary badge criteria for achievability',
        createdAt: new Date(),
      });
    }

    // Course completion insight
    if (engagement.courseCompletionRate > 40) {
      insights.push({
        id: 'insight-5',
        type: 'TREND',
        title: 'Excellent Course Completion',
        titleRo: 'Completare Cursuri Excelentă',
        description: 'Course completion rate is above industry average',
        descriptionRo: 'Rata de completare a cursurilor este peste media industriei',
        metric: 'Course Completion Rate',
        value: engagement.courseCompletionRate,
        expectedValue: 35,
        severity: 'LOW',
        actionable: false,
        createdAt: new Date(),
      });
    }

    return insights;
  }

  // ===== EXPORT =====

  async exportData(request: ExportRequest): Promise<ExportResult> {
    const { startDate, endDate } = this.getDateRange(request.timeRange);

    const data: any = {};

    if (request.metrics.includes('engagement')) {
      data.engagement = await this.getEngagementMetrics(request.timeRange);
    }
    if (request.metrics.includes('points')) {
      data.points = await this.getPointsAnalytics(request.timeRange);
    }
    if (request.metrics.includes('badges')) {
      data.badges = await this.getBadgeAnalytics(request.timeRange);
    }
    if (request.metrics.includes('streaks')) {
      data.streaks = await this.getStreakAnalytics(request.timeRange);
    }
    if (request.metrics.includes('leaderboard')) {
      data.leaderboard = await this.getLeaderboardAnalytics(request.timeRange);
    }
    if (request.metrics.includes('challenges')) {
      data.challenges = await this.getChallengeAnalytics(request.timeRange);
    }

    const result: ExportResult = {
      id: this.generateId(),
      format: request.format,
      data: request.format === 'JSON' ? data : undefined,
      fileUrl: request.format !== 'JSON' ? `/exports/gamification-${Date.now()}.${request.format.toLowerCase()}` : undefined,
      generatedAt: new Date(),
    };

    this.eventEmitter.emit('gamification.analytics.exported', {
      format: request.format,
      metrics: request.metrics,
    });

    return result;
  }

  // ===== REAL-TIME METRICS =====

  async getRealTimeMetrics(): Promise<{
    activeNow: number;
    pointsLastHour: number;
    badgesLastHour: number;
    challengesCompleted: number;
    topActivity: { action: string; count: number }[];
  }> {
    return {
      activeNow: Math.floor(Math.random() * 50) + 80,
      pointsLastHour: Math.floor(Math.random() * 5000) + 10000,
      badgesLastHour: Math.floor(Math.random() * 20) + 30,
      challengesCompleted: Math.floor(Math.random() * 10) + 15,
      topActivity: [
        { action: 'LESSON_COMPLETE', count: 145 },
        { action: 'QUIZ_PASS', count: 78 },
        { action: 'DAILY_LOGIN', count: 65 },
        { action: 'BADGE_EARNED', count: 32 },
        { action: 'COURSE_COMPLETE', count: 12 },
      ],
    };
  }

  // ===== HELPER METHODS =====

  private getDateRange(timeRange: TimeRange): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;

    switch (timeRange) {
      case 'TODAY':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'YESTERDAY':
        startDate = new Date(now.setDate(now.getDate() - 1));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'LAST_7_DAYS':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'LAST_30_DAYS':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'LAST_90_DAYS':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case 'THIS_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'THIS_YEAR':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'ALL_TIME':
      default:
        startDate = new Date('2024-01-01');
    }

    return { startDate, endDate };
  }

  private generateTimeSeries(timeRange: TimeRange, metric: string): TimeSeriesDataPoint[] {
    const { startDate, endDate } = this.getDateRange(timeRange);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const dataPoints: TimeSeriesDataPoint[] = [];

    const baseValues: Record<string, number> = {
      points: 50000,
      streaks: 600,
      challenges: 150,
      levelups: 80,
    };

    const base = baseValues[metric] || 100;

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      // Add some variance
      const variance = (Math.random() - 0.5) * base * 0.3;
      const trend = i * (base * 0.01); // Slight upward trend

      dataPoints.push({
        timestamp: date,
        value: Math.floor(base + variance + trend),
      });
    }

    return dataPoints;
  }

  private generateTopEarners(count: number): { userId: string; userName: string; points: number; rank: number }[] {
    const earners = [];
    for (let i = 0; i < count; i++) {
      earners.push({
        userId: `user-${100 + i}`,
        userName: `Top User ${i + 1}`,
        points: 15000 - i * 1200,
        rank: i + 1,
      });
    }
    return earners;
  }

  private generateRecentBadges(count: number): { badgeId: string; userId: string; earnedAt: Date }[] {
    const badges = [
      'first-lesson', 'week-streak', 'first-course', 'quiz-master',
      'speed-learner', 'perfect-quiz', 'social-share', 'mentor',
    ];
    const recent = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setMinutes(date.getMinutes() - i * 15);
      recent.push({
        badgeId: badges[i % badges.length],
        userId: `user-${1000 + Math.floor(Math.random() * 200)}`,
        earnedAt: date,
      });
    }
    return recent;
  }

  private generateRecentUnlocks(count: number): { achievementId: string; userId: string; tier: number; unlockedAt: Date }[] {
    const achievements = ['course-completion', 'lesson-master', 'quiz-expert', 'streak-keeper'];
    const unlocks = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setMinutes(date.getMinutes() - i * 20);
      unlocks.push({
        achievementId: achievements[i % achievements.length],
        userId: `user-${2000 + Math.floor(Math.random() * 100)}`,
        tier: Math.floor(Math.random() * 3) + 1,
        unlockedAt: date,
      });
    }
    return unlocks;
  }

  private getTotalUsers(): number {
    return 1200;
  }

  private initializeSampleData(): void {
    // Initialize sample activity data
    for (let i = 0; i < 50; i++) {
      const userId = `user-${i}`;
      const activities: { userId: string; action: string; timestamp: Date }[] = [];

      for (let j = 0; j < Math.floor(Math.random() * 20) + 5; j++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        activities.push({
          userId,
          action: ['LESSON_COMPLETE', 'QUIZ_PASS', 'DAILY_LOGIN'][Math.floor(Math.random() * 3)],
          timestamp: date,
        });
      }

      this.userActivity.set(userId, activities);
    }

    this.logger.log('Sample analytics data initialized');
  }

  private generateId(): string {
    return `analytics-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
