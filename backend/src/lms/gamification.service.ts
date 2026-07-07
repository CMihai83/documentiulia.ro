import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

// Sprint 21: LMS Gamification & Engagement Features
// Points, badges, leaderboards, streaks, and achievements for learning motivation
// S-47/F-2: user state (points, transactions, badges, achievements, streaks) is
// persisted via Prisma; catalogs (badge/achievement/challenge definitions) stay
// code-defined and are seeded in the constructor.

// ===== TYPES =====

export type BadgeCategory = 'COMPLETION' | 'STREAK' | 'MASTERY' | 'SPEED' | 'ENGAGEMENT' | 'SOCIAL' | 'SPECIAL';
export type BadgeRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type LeaderboardPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';
export type AchievementStatus = 'LOCKED' | 'IN_PROGRESS' | 'UNLOCKED';
export type PointsAction = 'LESSON_COMPLETE' | 'COURSE_COMPLETE' | 'QUIZ_PASS' | 'PERFECT_SCORE' | 'STREAK_BONUS' | 'BADGE_EARNED' | 'REFERRAL' | 'REVIEW_SUBMITTED' | 'DAILY_LOGIN';

export interface Badge {
  id: string;
  name: string;
  nameRo: string; // Romanian translation
  description: string;
  descriptionRo: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  points: number;
  requirements: {
    type: string;
    target: number;
    current?: number;
  }[];
  secret: boolean; // Hidden until earned
}

export interface UserBadge {
  badgeId: string;
  userId: string;
  earnedAt: Date;
  progress: number; // 0-100
  isNew: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  icon: string;
  category: string;
  tiers: {
    level: number;
    name: string;
    target: number;
    points: number;
    badge?: string;
  }[];
}

export interface UserAchievement {
  achievementId: string;
  userId: string;
  currentTier: number;
  progress: number;
  currentValue: number;
  status: AchievementStatus;
  unlockedTiers: number[];
  lastUpdated: Date;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  action: PointsAction;
  points: number;
  description: string;
  metadata?: {
    courseId?: string;
    lessonId?: string;
    quizId?: string;
    badgeId?: string;
  };
  createdAt: Date;
}

export interface UserPoints {
  userId: string;
  totalPoints: number;
  level: number;
  levelProgress: number; // 0-100
  pointsToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
  weeklyPoints: number;
  monthlyPoints: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar?: string;
  points: number;
  level: number;
  badgeCount: number;
  streak: number;
  change: number; // Rank change from previous period
}

export interface Streak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  streakFreezeAvailable: number;
  streakFreezeUsed: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  titleRo: string;
  description: string;
  descriptionRo: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL';
  target: number;
  currentMetric: string;
  points: number;
  badgeId?: string;
  startDate: Date;
  endDate: Date;
  participants: number;
}

export interface UserChallenge {
  challengeId: string;
  userId: string;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  joinedAt: Date;
}

// ===== CONSTANTS =====

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500,
  10000, 13000, 16500, 20500, 25000, 30000, 36000, 43000, 51000, 60000,
];

const POINTS_CONFIG: Record<PointsAction, number> = {
  LESSON_COMPLETE: 10,
  COURSE_COMPLETE: 100,
  QUIZ_PASS: 25,
  PERFECT_SCORE: 50,
  STREAK_BONUS: 5,
  BADGE_EARNED: 25,
  REFERRAL: 100,
  REVIEW_SUBMITTED: 15,
  DAILY_LOGIN: 5,
};

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  // Catalog storage (code-defined; seeded in constructor)
  private readonly badges: Map<string, Badge> = new Map();
  private readonly achievements: Map<string, Achievement> = new Map();
  private readonly challenges: Map<string, Challenge> = new Map();
  // Challenges' user state is still in-memory (documented follow-up; not part of F-2 AC)
  private readonly userChallenges: Map<string, UserChallenge[]> = new Map();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {
    this.initializeBadges();
    this.initializeAchievements();
    this.initializeChallenges();
  }

  // ===== ROW MAPPERS =====

  private mapUserPoints(row: any, streak?: { currentStreak: number; longestStreak: number } | null): UserPoints {
    return {
      userId: row.userId,
      totalPoints: row.totalPoints,
      level: row.level,
      levelProgress: row.levelProgress,
      pointsToNextLevel: row.pointsToNextLevel,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      lastActiveDate: row.lastActiveDate ?? row.updatedAt ?? new Date(),
      weeklyPoints: row.weeklyPoints,
      monthlyPoints: row.monthlyPoints,
    };
  }

  private mapTransaction(row: any): PointsTransaction {
    return {
      id: row.id,
      userId: row.userId,
      action: row.action as PointsAction,
      points: row.points,
      description: row.description,
      metadata: row.metadata ?? undefined,
      createdAt: row.createdAt,
    };
  }

  private mapUserBadge(row: any): UserBadge {
    return { badgeId: row.badgeId, userId: row.userId, earnedAt: row.earnedAt, progress: row.progress, isNew: row.isNew };
  }

  private mapUserAchievement(row: any): UserAchievement {
    return {
      achievementId: row.achievementId,
      userId: row.userId,
      currentTier: row.currentTier,
      progress: row.progress,
      currentValue: row.currentValue,
      status: row.status as AchievementStatus,
      unlockedTiers: row.unlockedTiers ?? [],
      lastUpdated: row.lastUpdated,
    };
  }

  private mapStreak(row: any): Streak {
    return {
      userId: row.userId,
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      lastActivityDate: row.lastActivityDate ?? row.createdAt ?? new Date(),
      streakFreezeAvailable: row.streakFreezeAvailable,
      streakFreezeUsed: row.streakFreezeUsed,
    };
  }

  // ===== POINTS MANAGEMENT =====

  async awardPoints(userId: string, action: PointsAction, metadata?: Record<string, any>): Promise<PointsTransaction> {
    const points = POINTS_CONFIG[action];
    const userPtsRow = await this.getOrCreateUserPointsRow(userId);

    // Check for streak bonus
    const streak = await this.getStreak(userId);
    let streakBonus = 0;
    if (streak.currentStreak >= 7) {
      streakBonus = Math.floor(points * 0.1); // 10% bonus for 7+ day streak
    }

    const totalPoints = points + streakBonus;

    // Save transaction
    const txRow = await this.prisma.gamificationPointsTransaction.create({
      data: {
        userId,
        action,
        points: totalPoints,
        description: this.getPointsDescription(action, streakBonus),
        metadata: metadata ?? undefined,
      },
    });

    // Update user points
    const userPts = this.mapUserPoints(userPtsRow, streak);
    userPts.totalPoints += totalPoints;
    userPts.weeklyPoints += totalPoints;
    userPts.monthlyPoints += totalPoints;
    this.updateLevel(userPts);
    await this.prisma.gamificationUserPoints.update({
      where: { userId },
      data: {
        totalPoints: userPts.totalPoints,
        weeklyPoints: userPts.weeklyPoints,
        monthlyPoints: userPts.monthlyPoints,
        level: userPts.level,
        levelProgress: userPts.levelProgress,
        pointsToNextLevel: userPts.pointsToNextLevel,
      },
    });

    // Check for achievements
    await this.checkAchievements(userId, action);

    // Emit event
    this.eventEmitter.emit('gamification.points.awarded', {
      userId,
      action,
      points: totalPoints,
      totalPoints: userPts.totalPoints,
      level: userPts.level,
    });

    this.logger.log(`Awarded ${totalPoints} points to user ${userId} for ${action}`);
    return this.mapTransaction(txRow);
  }

  async getPointsHistory(userId: string, limit: number = 50): Promise<PointsTransaction[]> {
    const rows = await this.prisma.gamificationPointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.mapTransaction(r));
  }

  async getUserPoints(userId: string): Promise<UserPoints> {
    const row = await this.getOrCreateUserPointsRow(userId);
    const streakRow = await this.prisma.gamificationStreak.findUnique({ where: { userId } });
    return this.mapUserPoints(row, streakRow);
  }

  private async getOrCreateUserPointsRow(userId: string): Promise<any> {
    const existing = await this.prisma.gamificationUserPoints.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.gamificationUserPoints.create({
      data: {
        userId,
        totalPoints: 0,
        level: 1,
        levelProgress: 0,
        pointsToNextLevel: LEVEL_THRESHOLDS[1],
        weeklyPoints: 0,
        monthlyPoints: 0,
        lastActiveDate: new Date(),
      },
    });
  }

  private updateLevel(userPts: UserPoints): void {
    let newLevel = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (userPts.totalPoints >= LEVEL_THRESHOLDS[i]) {
        newLevel = i + 1;
      } else {
        break;
      }
    }

    const previousLevel = userPts.level;
    userPts.level = newLevel;

    if (newLevel < LEVEL_THRESHOLDS.length) {
      const currentThreshold = LEVEL_THRESHOLDS[newLevel - 1];
      const nextThreshold = LEVEL_THRESHOLDS[newLevel];
      userPts.pointsToNextLevel = nextThreshold - userPts.totalPoints;
      userPts.levelProgress = ((userPts.totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    } else {
      userPts.levelProgress = 100;
      userPts.pointsToNextLevel = 0;
    }

    // Level up notification
    if (newLevel > previousLevel) {
      this.eventEmitter.emit('gamification.level.up', {
        userId: userPts.userId,
        newLevel,
        previousLevel,
        totalPoints: userPts.totalPoints,
      });
    }
  }

  private getPointsDescription(action: PointsAction, streakBonus: number): string {
    const descriptions: Record<PointsAction, string> = {
      LESSON_COMPLETE: 'Lecție finalizată',
      COURSE_COMPLETE: 'Curs finalizat',
      QUIZ_PASS: 'Test promovat',
      PERFECT_SCORE: 'Scor perfect',
      STREAK_BONUS: 'Bonus streak',
      BADGE_EARNED: 'Insignă câștigată',
      REFERRAL: 'Invitație acceptată',
      REVIEW_SUBMITTED: 'Recenzie trimisă',
      DAILY_LOGIN: 'Conectare zilnică',
    };

    let desc = descriptions[action];
    if (streakBonus > 0) {
      desc += ` (+${streakBonus} bonus streak)`;
    }
    return desc;
  }

  // ===== BADGES =====

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge | null> {
    const badge = this.badges.get(badgeId);
    if (!badge) return null;

    // Check if already earned (also enforced by @@unique([userId, badgeId]))
    const existing = await this.prisma.gamificationUserBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    });
    if (existing) {
      return null; // Already has badge
    }

    let row: any;
    try {
      row = await this.prisma.gamificationUserBadge.create({
        data: { userId, badgeId, earnedAt: new Date(), progress: 100, isNew: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') return null; // Concurrent duplicate award
      throw e;
    }

    // Award points for badge
    await this.awardPoints(userId, 'BADGE_EARNED', { badgeId });

    // Emit event
    this.eventEmitter.emit('gamification.badge.earned', {
      userId,
      badgeId,
      badgeName: badge.name,
      rarity: badge.rarity,
    });

    this.logger.log(`User ${userId} earned badge: ${badge.name}`);
    return this.mapUserBadge(row);
  }

  async getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]> {
    const rows = await this.prisma.gamificationUserBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'asc' },
    });
    return rows
      .map((r) => ({ ...this.mapUserBadge(r), badge: this.badges.get(r.badgeId)! }))
      .filter((b) => b.badge);
  }

  getAllBadges(): Badge[] {
    return Array.from(this.badges.values());
  }

  getBadge(badgeId: string): Badge | undefined {
    return this.badges.get(badgeId);
  }

  async markBadgeSeen(userId: string, badgeId: string): Promise<void> {
    await this.prisma.gamificationUserBadge.updateMany({
      where: { userId, badgeId },
      data: { isNew: false },
    });
  }

  private initializeBadges(): void {
    const badgeDefinitions: Badge[] = [
      // SIM-12 — behavioral badges from the business simulator
      { id: 'sim-cash-buffer', name: 'Cash Cushion', nameRo: 'Rezervă de Cash', description: 'Held 3+ months of runway going into a downturn', descriptionRo: 'Ai păstrat rezervă de 3+ luni înainte de o recesiune', icon: '💰', category: 'SPECIAL', rarity: 'UNCOMMON', points: 150, requirements: [{ type: 'sim_cash_buffer', target: 1 }], secret: false },
      { id: 'sim-delegator', name: 'The Delegator', nameRo: 'Delegatorul', description: 'Delegated 3+ operational classes to free strategic focus', descriptionRo: 'Ai delegat 3+ activități operaționale pentru a elibera focusul strategic', icon: '🤝', category: 'SPECIAL', rarity: 'UNCOMMON', points: 150, requirements: [{ type: 'sim_delegate', target: 3 }], secret: false },
      { id: 'sim-survivor', name: 'Recession Survivor', nameRo: 'Supraviețuitor de Recesiune', description: 'Finished a run through a recession with positive equity', descriptionRo: 'Ai încheiat o simulare printr-o recesiune cu capital pozitiv', icon: '🛡️', category: 'SPECIAL', rarity: 'RARE', points: 300, requirements: [{ type: 'sim_survivor', target: 1 }], secret: false },

      // Completion badges
      {
        id: 'first-lesson',
        name: 'First Step',
        nameRo: 'Primul Pas',
        description: 'Complete your first lesson',
        descriptionRo: 'Finalizează prima ta lecție',
        icon: '🎯',
        category: 'COMPLETION',
        rarity: 'COMMON',
        points: 25,
        requirements: [{ type: 'lessons_completed', target: 1 }],
        secret: false,
      },
      {
        id: 'first-course',
        name: 'Course Graduate',
        nameRo: 'Absolvent',
        description: 'Complete your first course',
        descriptionRo: 'Finalizează primul tău curs',
        icon: '🎓',
        category: 'COMPLETION',
        rarity: 'UNCOMMON',
        points: 100,
        requirements: [{ type: 'courses_completed', target: 1 }],
        secret: false,
      },
      {
        id: 'five-courses',
        name: 'Dedicated Learner',
        nameRo: 'Învățăcel Dedicat',
        description: 'Complete 5 courses',
        descriptionRo: 'Finalizează 5 cursuri',
        icon: '📚',
        category: 'COMPLETION',
        rarity: 'RARE',
        points: 500,
        requirements: [{ type: 'courses_completed', target: 5 }],
        secret: false,
      },
      {
        id: 'ten-courses',
        name: 'Knowledge Seeker',
        nameRo: 'Căutător de Cunoștințe',
        description: 'Complete 10 courses',
        descriptionRo: 'Finalizează 10 cursuri',
        icon: '🏆',
        category: 'COMPLETION',
        rarity: 'EPIC',
        points: 1000,
        requirements: [{ type: 'courses_completed', target: 10 }],
        secret: false,
      },

      // Streak badges
      {
        id: 'week-streak',
        name: 'Week Warrior',
        nameRo: 'Războinic Săptămânal',
        description: 'Maintain a 7-day learning streak',
        descriptionRo: 'Menține un streak de 7 zile',
        icon: '🔥',
        category: 'STREAK',
        rarity: 'UNCOMMON',
        points: 75,
        requirements: [{ type: 'streak_days', target: 7 }],
        secret: false,
      },
      {
        id: 'month-streak',
        name: 'Consistency Champion',
        nameRo: 'Campion al Consistenței',
        description: 'Maintain a 30-day learning streak',
        descriptionRo: 'Menține un streak de 30 zile',
        icon: '💪',
        category: 'STREAK',
        rarity: 'RARE',
        points: 300,
        requirements: [{ type: 'streak_days', target: 30 }],
        secret: false,
      },
      {
        id: 'hundred-streak',
        name: 'Unstoppable',
        nameRo: 'De Neoprit',
        description: 'Maintain a 100-day learning streak',
        descriptionRo: 'Menține un streak de 100 zile',
        icon: '⚡',
        category: 'STREAK',
        rarity: 'LEGENDARY',
        points: 1000,
        requirements: [{ type: 'streak_days', target: 100 }],
        secret: false,
      },

      // Mastery badges
      {
        id: 'perfect-quiz',
        name: 'Perfect Score',
        nameRo: 'Scor Perfect',
        description: 'Get 100% on a quiz',
        descriptionRo: 'Obține 100% la un test',
        icon: '💯',
        category: 'MASTERY',
        rarity: 'UNCOMMON',
        points: 50,
        requirements: [{ type: 'perfect_quizzes', target: 1 }],
        secret: false,
      },
      {
        id: 'quiz-master',
        name: 'Quiz Master',
        nameRo: 'Maestru al Testelor',
        description: 'Get 100% on 10 quizzes',
        descriptionRo: 'Obține 100% la 10 teste',
        icon: '🧠',
        category: 'MASTERY',
        rarity: 'EPIC',
        points: 500,
        requirements: [{ type: 'perfect_quizzes', target: 10 }],
        secret: false,
      },

      // Speed badges
      {
        id: 'speed-learner',
        name: 'Speed Learner',
        nameRo: 'Învățare Rapidă',
        description: 'Complete a course in one day',
        descriptionRo: 'Finalizează un curs într-o zi',
        icon: '⚡',
        category: 'SPEED',
        rarity: 'RARE',
        points: 150,
        requirements: [{ type: 'course_completed_day', target: 1 }],
        secret: false,
      },

      // Engagement badges
      {
        id: 'first-review',
        name: 'Helpful Reviewer',
        nameRo: 'Recenzent Util',
        description: 'Submit your first course review',
        descriptionRo: 'Trimite prima ta recenzie',
        icon: '⭐',
        category: 'ENGAGEMENT',
        rarity: 'COMMON',
        points: 25,
        requirements: [{ type: 'reviews_submitted', target: 1 }],
        secret: false,
      },
      {
        id: 'forum-contributor',
        name: 'Community Helper',
        nameRo: 'Ajutor Comunitar',
        description: 'Answer 10 forum questions',
        descriptionRo: 'Răspunde la 10 întrebări pe forum',
        icon: '🤝',
        category: 'SOCIAL',
        rarity: 'RARE',
        points: 200,
        requirements: [{ type: 'forum_answers', target: 10 }],
        secret: false,
      },

      // Special badges
      {
        id: 'early-bird',
        name: 'Early Bird',
        nameRo: 'Matinal',
        description: 'Complete a lesson before 7 AM',
        descriptionRo: 'Finalizează o lecție înainte de ora 7',
        icon: '🌅',
        category: 'SPECIAL',
        rarity: 'UNCOMMON',
        points: 50,
        requirements: [{ type: 'lesson_before_7am', target: 1 }],
        secret: true,
      },
      {
        id: 'night-owl',
        name: 'Night Owl',
        nameRo: 'Bufniță de Noapte',
        description: 'Complete a lesson after midnight',
        descriptionRo: 'Finalizează o lecție după miezul nopții',
        icon: '🦉',
        category: 'SPECIAL',
        rarity: 'UNCOMMON',
        points: 50,
        requirements: [{ type: 'lesson_after_midnight', target: 1 }],
        secret: true,
      },
      {
        id: 'vat-expert',
        name: 'VAT Expert',
        nameRo: 'Expert TVA',
        description: 'Complete all VAT & Tax courses',
        descriptionRo: 'Finalizează toate cursurile de TVA',
        icon: '📊',
        category: 'MASTERY',
        rarity: 'EPIC',
        points: 750,
        requirements: [{ type: 'category_completed', target: 1 }],
        secret: false,
      },
    ];

    for (const badge of badgeDefinitions) {
      this.badges.set(badge.id, badge);
    }

    this.logger.log(`Initialized ${this.badges.size} badges`);
  }

  // ===== ACHIEVEMENTS =====

  async updateAchievementProgress(userId: string, achievementId: string, value: number): Promise<UserAchievement> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      throw new NotFoundException(`Achievement ${achievementId} not found`);
    }

    let row = await this.prisma.gamificationUserAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
    });
    if (!row) {
      row = await this.prisma.gamificationUserAchievement.create({
        data: {
          userId,
          achievementId,
          currentTier: 0,
          progress: 0,
          currentValue: 0,
          status: 'IN_PROGRESS',
          unlockedTiers: [],
          lastUpdated: new Date(),
        },
      });
    }
    const userAch = this.mapUserAchievement(row);

    userAch.currentValue = value;
    userAch.lastUpdated = new Date();

    // Check tier unlocks
    const newlyUnlocked: { level: number; name: string; badge?: string }[] = [];
    for (const tier of achievement.tiers) {
      if (value >= tier.target && !userAch.unlockedTiers.includes(tier.level)) {
        userAch.unlockedTiers.push(tier.level);
        userAch.currentTier = tier.level;
        newlyUnlocked.push({ level: tier.level, name: tier.name, badge: tier.badge });
      }
    }

    // Calculate progress to next tier
    const nextTier = achievement.tiers.find(t => t.level > userAch.currentTier);
    if (nextTier) {
      const prevTarget = achievement.tiers.find(t => t.level === userAch.currentTier)?.target || 0;
      userAch.progress = ((value - prevTarget) / (nextTier.target - prevTarget)) * 100;
    } else {
      userAch.progress = 100;
      userAch.status = 'UNLOCKED';
    }

    // Persist BEFORE cascading awards so re-entrant reads (awardPoints ->
    // checkAchievements -> this method) see the unlocked tiers and terminate.
    await this.prisma.gamificationUserAchievement.update({
      where: { userId_achievementId: { userId, achievementId } },
      data: {
        currentTier: userAch.currentTier,
        progress: userAch.progress,
        currentValue: userAch.currentValue,
        status: userAch.status,
        unlockedTiers: userAch.unlockedTiers,
        lastUpdated: userAch.lastUpdated,
      },
    });

    for (const tier of newlyUnlocked) {
      // Award tier badge if exists
      if (tier.badge) {
        await this.awardBadge(userId, tier.badge);
      }

      // Award tier points
      await this.awardPoints(userId, 'BADGE_EARNED', { achievementId, tier: tier.level });

      this.eventEmitter.emit('gamification.achievement.tier.unlocked', {
        userId,
        achievementId,
        tier: tier.level,
        tierName: tier.name,
      });
    }

    return userAch;
  }

  async getUserAchievements(userId: string): Promise<(UserAchievement & { achievement: Achievement })[]> {
    const rows = await this.prisma.gamificationUserAchievement.findMany({ where: { userId } });
    return rows
      .map((r) => ({ ...this.mapUserAchievement(r), achievement: this.achievements.get(r.achievementId)! }))
      .filter((a) => a.achievement);
  }

  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  private initializeAchievements(): void {
    const achievementDefinitions: Achievement[] = [
      {
        id: 'course-completion',
        name: 'Course Completionist',
        nameRo: 'Completist de Cursuri',
        description: 'Complete courses to unlock higher tiers',
        descriptionRo: 'Finalizează cursuri pentru a debloca nivele superioare',
        icon: '📚',
        category: 'learning',
        tiers: [
          { level: 1, name: 'Beginner', target: 1, points: 50, badge: 'first-course' },
          { level: 2, name: 'Learner', target: 3, points: 150 },
          { level: 3, name: 'Dedicated', target: 5, points: 300, badge: 'five-courses' },
          { level: 4, name: 'Scholar', target: 10, points: 500, badge: 'ten-courses' },
          { level: 5, name: 'Master', target: 25, points: 1000 },
        ],
      },
      {
        id: 'streak-master',
        name: 'Streak Master',
        nameRo: 'Maestrul Streak-ului',
        description: 'Build your learning streak',
        descriptionRo: 'Construiește-ți streak-ul de învățare',
        icon: '🔥',
        category: 'consistency',
        tiers: [
          { level: 1, name: 'Started', target: 3, points: 25 },
          { level: 2, name: 'Week Warrior', target: 7, points: 75, badge: 'week-streak' },
          { level: 3, name: 'Fortnight Fighter', target: 14, points: 150 },
          { level: 4, name: 'Month Master', target: 30, points: 300, badge: 'month-streak' },
          { level: 5, name: 'Unstoppable', target: 100, points: 1000, badge: 'hundred-streak' },
        ],
      },
      {
        id: 'quiz-perfection',
        name: 'Quiz Perfection',
        nameRo: 'Perfecțiunea Testelor',
        description: 'Achieve perfect scores on quizzes',
        descriptionRo: 'Obține scoruri perfecte la teste',
        icon: '💯',
        category: 'mastery',
        tiers: [
          { level: 1, name: 'First Perfect', target: 1, points: 50, badge: 'perfect-quiz' },
          { level: 2, name: 'Consistent', target: 5, points: 200 },
          { level: 3, name: 'Quiz Master', target: 10, points: 500, badge: 'quiz-master' },
          { level: 4, name: 'Genius', target: 25, points: 1000 },
        ],
      },
      {
        id: 'points-collector',
        name: 'Points Collector',
        nameRo: 'Colector de Puncte',
        description: 'Accumulate learning points',
        descriptionRo: 'Acumulează puncte de învățare',
        icon: '💎',
        category: 'progress',
        tiers: [
          { level: 1, name: 'Novice', target: 500, points: 50 },
          { level: 2, name: 'Adept', target: 2500, points: 100 },
          { level: 3, name: 'Expert', target: 10000, points: 250 },
          { level: 4, name: 'Master', target: 25000, points: 500 },
          { level: 5, name: 'Legend', target: 50000, points: 1000 },
        ],
      },
    ];

    for (const achievement of achievementDefinitions) {
      this.achievements.set(achievement.id, achievement);
    }

    this.logger.log(`Initialized ${this.achievements.size} achievements`);
  }

  private async checkAchievements(userId: string, action: PointsAction): Promise<void> {
    const row = await this.prisma.gamificationUserPoints.findUnique({ where: { userId } });
    const totalPoints = row?.totalPoints ?? 0;

    // Update points collector achievement
    await this.updateAchievementProgress(userId, 'points-collector', totalPoints);

    // Check based on action type
    switch (action) {
      case 'COURSE_COMPLETE': {
        const courses = await this.prisma.gamificationPointsTransaction.count({
          where: { userId, action: 'COURSE_COMPLETE' },
        });
        await this.updateAchievementProgress(userId, 'course-completion', courses);
        break;
      }
      case 'PERFECT_SCORE': {
        const perfects = await this.prisma.gamificationPointsTransaction.count({
          where: { userId, action: 'PERFECT_SCORE' },
        });
        await this.updateAchievementProgress(userId, 'quiz-perfection', perfects);
        break;
      }
    }
  }

  // ===== STREAKS =====

  async recordActivity(userId: string): Promise<Streak> {
    const streak = await this.getOrCreateStreakRow(userId).then((r) => this.mapStreak(r));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = new Date(streak.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, no change
      return streak;
    } else if (daysDiff === 1) {
      // Consecutive day
      streak.currentStreak++;
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    } else if (daysDiff === 2 && streak.streakFreezeAvailable > 0 && !streak.streakFreezeUsed) {
      // Use streak freeze
      streak.streakFreezeAvailable--;
      streak.streakFreezeUsed = true;
      streak.currentStreak++;
    } else {
      // Streak broken
      this.eventEmitter.emit('gamification.streak.broken', {
        userId,
        previousStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      });
      streak.currentStreak = 1;
    }

    const consecutiveDay = daysDiff === 1;
    streak.lastActivityDate = new Date();
    const persistedFreezeUsed = false; // freeze consumption applies to a single gap
    await this.prisma.gamificationStreak.update({
      where: { userId },
      data: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastActivityDate: streak.lastActivityDate,
        streakFreezeAvailable: streak.streakFreezeAvailable,
        streakFreezeUsed: persistedFreezeUsed,
      },
    });
    streak.streakFreezeUsed = persistedFreezeUsed;

    // Update user points row (streak values are joined from the streak table on read)
    await this.getOrCreateUserPointsRow(userId);
    await this.prisma.gamificationUserPoints.update({
      where: { userId },
      data: { lastActiveDate: streak.lastActivityDate },
    });

    if (consecutiveDay) {
      // Award streak bonus (reads the just-persisted streak for the 7+ day bonus)
      await this.awardPoints(userId, 'STREAK_BONUS');

      // Check streak badges
      await this.updateAchievementProgress(userId, 'streak-master', streak.currentStreak);

      if (streak.currentStreak === 7) {
        await this.awardBadge(userId, 'week-streak');
      } else if (streak.currentStreak === 30) {
        await this.awardBadge(userId, 'month-streak');
      } else if (streak.currentStreak === 100) {
        await this.awardBadge(userId, 'hundred-streak');
      }
    }

    return streak;
  }

  async getStreak(userId: string): Promise<Streak> {
    const row = await this.getOrCreateStreakRow(userId);
    return this.mapStreak(row);
  }

  async useStreakFreeze(userId: string): Promise<boolean> {
    const row = await this.getOrCreateStreakRow(userId);
    if (row.streakFreezeAvailable > 0) {
      await this.prisma.gamificationStreak.update({
        where: { userId },
        data: { streakFreezeAvailable: row.streakFreezeAvailable - 1 },
      });
      return true;
    }
    return false;
  }

  private async getOrCreateStreakRow(userId: string): Promise<any> {
    const existing = await this.prisma.gamificationStreak.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.gamificationStreak.create({
      data: {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(),
        streakFreezeAvailable: 2, // Start with 2 freezes
        streakFreezeUsed: false,
      },
    });
  }

  // ===== LEADERBOARDS =====

  async getLeaderboard(period: LeaderboardPeriod, limit: number = 50): Promise<LeaderboardEntry[]> {
    const rows = await this.prisma.gamificationUserPoints.findMany();
    if (rows.length === 0) return [];

    const badgeCounts = await this.prisma.gamificationUserBadge.groupBy({
      by: ['userId'],
      _count: { _all: true },
    });
    const badgeCountMap = new Map<string, number>(badgeCounts.map((b: any) => [b.userId, b._count._all]));

    const streakRows = await this.prisma.gamificationStreak.findMany();
    const streakMap = new Map<string, number>(streakRows.map((s: any) => [s.userId, s.currentStreak]));

    let dailyMap = new Map<string, number>();
    if (period === 'DAILY') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daily = await this.prisma.gamificationPointsTransaction.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: today } },
        _sum: { points: true },
      });
      dailyMap = new Map<string, number>(daily.map((d: any) => [d.userId, d._sum.points ?? 0]));
    }

    const entries: LeaderboardEntry[] = rows.map((userPts: any) => {
      let points: number;
      switch (period) {
        case 'DAILY':
          points = dailyMap.get(userPts.userId) ?? 0;
          break;
        case 'WEEKLY':
          points = userPts.weeklyPoints;
          break;
        case 'MONTHLY':
          points = userPts.monthlyPoints;
          break;
        case 'ALL_TIME':
        default:
          points = userPts.totalPoints;
      }

      return {
        rank: 0,
        userId: userPts.userId,
        userName: `User ${userPts.userId.substring(0, 8)}`, // In production, fetch from user service
        points,
        level: userPts.level,
        badgeCount: badgeCountMap.get(userPts.userId) ?? 0,
        streak: streakMap.get(userPts.userId) ?? 0,
        change: 0, // In production, compare to previous period
      };
    });

    // Sort and assign ranks
    entries.sort((a, b) => b.points - a.points);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries.slice(0, limit);
  }

  async getUserRank(userId: string, period: LeaderboardPeriod): Promise<number> {
    const leaderboard = await this.getLeaderboard(period, 1000);
    const entry = leaderboard.find(e => e.userId === userId);
    return entry?.rank || 0;
  }

  // ===== CHALLENGES =====

  async joinChallenge(userId: string, challengeId: string): Promise<UserChallenge> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new NotFoundException(`Challenge ${challengeId} not found`);
    }

    const userChallengeList = this.userChallenges.get(userId) || [];
    const existing = userChallengeList.find(c => c.challengeId === challengeId);
    if (existing) {
      return existing;
    }

    const userChallenge: UserChallenge = {
      challengeId,
      userId,
      progress: 0,
      completed: false,
      joinedAt: new Date(),
    };

    userChallengeList.push(userChallenge);
    this.userChallenges.set(userId, userChallengeList);
    challenge.participants++;

    return userChallenge;
  }

  async updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<UserChallenge> {
    const userChallengeList = this.userChallenges.get(userId) || [];
    const userChallenge = userChallengeList.find(c => c.challengeId === challengeId);

    if (!userChallenge) {
      throw new NotFoundException('User has not joined this challenge');
    }

    const challenge = this.challenges.get(challengeId)!;
    userChallenge.progress = Math.min(progress, challenge.target);

    if (userChallenge.progress >= challenge.target && !userChallenge.completed) {
      userChallenge.completed = true;
      userChallenge.completedAt = new Date();

      // Award challenge rewards
      await this.awardPoints(userId, 'BADGE_EARNED', { challengeId });

      if (challenge.badgeId) {
        await this.awardBadge(userId, challenge.badgeId);
      }

      this.eventEmitter.emit('gamification.challenge.completed', {
        userId,
        challengeId,
        challengeTitle: challenge.title,
      });
    }

    return userChallenge;
  }

  getActiveChallenges(): Challenge[] {
    const now = new Date();
    return Array.from(this.challenges.values())
      .filter(c => c.startDate <= now && c.endDate >= now);
  }

  getUserChallenges(userId: string): (UserChallenge & { challenge: Challenge })[] {
    const userChallengeList = this.userChallenges.get(userId) || [];
    return userChallengeList.map(uc => ({
      ...uc,
      challenge: this.challenges.get(uc.challengeId)!,
    })).filter(c => c.challenge);
  }

  private initializeChallenges(): void {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthEnd = new Date(now);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const challengeDefinitions: Challenge[] = [
      {
        id: 'weekly-lessons',
        title: 'Weekly Learning Sprint',
        titleRo: 'Sprint Săptămânal de Învățare',
        description: 'Complete 10 lessons this week',
        descriptionRo: 'Finalizează 10 lecții săptămâna aceasta',
        type: 'WEEKLY',
        target: 10,
        currentMetric: 'lessons_completed',
        points: 150,
        startDate: now,
        endDate: weekEnd,
        participants: 0,
      },
      {
        id: 'monthly-course',
        title: 'Monthly Course Challenge',
        titleRo: 'Provocarea Lunară',
        description: 'Complete a full course this month',
        descriptionRo: 'Finalizează un curs complet luna aceasta',
        type: 'MONTHLY',
        target: 1,
        currentMetric: 'courses_completed',
        points: 300,
        badgeId: 'first-course',
        startDate: now,
        endDate: monthEnd,
        participants: 0,
      },
      {
        id: 'quiz-champion',
        title: 'Quiz Champion',
        titleRo: 'Campionul Testelor',
        description: 'Pass 5 quizzes with 80%+ score',
        descriptionRo: 'Promovează 5 teste cu scor 80%+',
        type: 'WEEKLY',
        target: 5,
        currentMetric: 'quizzes_passed',
        points: 200,
        startDate: now,
        endDate: weekEnd,
        participants: 0,
      },
    ];

    for (const challenge of challengeDefinitions) {
      this.challenges.set(challenge.id, challenge);
    }

    this.logger.log(`Initialized ${this.challenges.size} challenges`);
  }

  // ===== HELPERS =====

  // Reset weekly/monthly stats (call from cron job)
  async resetPeriodStats(period: 'weekly' | 'monthly'): Promise<void> {
    await this.prisma.gamificationUserPoints.updateMany({
      data: period === 'weekly' ? { weeklyPoints: 0 } : { monthlyPoints: 0 },
    });
    this.logger.log(`Reset ${period} stats for all users`);
  }
}
