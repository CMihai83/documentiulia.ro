import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Sprint 21: LMS Gamification & Engagement Features
// Points, badges, leaderboards, streaks, and achievements for learning motivation

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

  // Storage
  private readonly badges: Map<string, Badge> = new Map();
  private readonly userBadges: Map<string, UserBadge[]> = new Map();
  private readonly achievements: Map<string, Achievement> = new Map();
  private readonly userAchievements: Map<string, UserAchievement[]> = new Map();
  private readonly pointsTransactions: Map<string, PointsTransaction[]> = new Map();
  private readonly userPoints: Map<string, UserPoints> = new Map();
  private readonly streaks: Map<string, Streak> = new Map();
  private readonly challenges: Map<string, Challenge> = new Map();
  private readonly userChallenges: Map<string, UserChallenge[]> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeBadges();
    this.initializeAchievements();
    this.initializeChallenges();
  }

  // ===== POINTS MANAGEMENT =====

  awardPoints(userId: string, action: PointsAction, metadata?: Record<string, any>): PointsTransaction {
    const points = POINTS_CONFIG[action];
    const userPts = this.getOrCreateUserPoints(userId);

    // Check for streak bonus
    const streak = this.getOrCreateStreak(userId);
    let streakBonus = 0;
    if (streak.currentStreak >= 7) {
      streakBonus = Math.floor(points * 0.1); // 10% bonus for 7+ day streak
    }

    const totalPoints = points + streakBonus;

    const transaction: PointsTransaction = {
      id: this.generateId(),
      userId,
      action,
      points: totalPoints,
      description: this.getPointsDescription(action, streakBonus),
      metadata,
      createdAt: new Date(),
    };

    // Save transaction
    const userTransactions = this.pointsTransactions.get(userId) || [];
    userTransactions.push(transaction);
    this.pointsTransactions.set(userId, userTransactions);

    // Update user points
    userPts.totalPoints += totalPoints;
    userPts.weeklyPoints += totalPoints;
    userPts.monthlyPoints += totalPoints;
    this.updateLevel(userPts);

    // Check for achievements
    this.checkAchievements(userId, action);

    // Emit event
    this.eventEmitter.emit('gamification.points.awarded', {
      userId,
      action,
      points: totalPoints,
      totalPoints: userPts.totalPoints,
      level: userPts.level,
    });

    this.logger.log(`Awarded ${totalPoints} points to user ${userId} for ${action}`);
    return transaction;
  }

  getPointsHistory(userId: string, limit: number = 50): PointsTransaction[] {
    const transactions = this.pointsTransactions.get(userId) || [];
    return transactions.slice(-limit).reverse();
  }

  getUserPoints(userId: string): UserPoints {
    return this.getOrCreateUserPoints(userId);
  }

  private getOrCreateUserPoints(userId: string): UserPoints {
    let userPts = this.userPoints.get(userId);
    if (!userPts) {
      userPts = {
        userId,
        totalPoints: 0,
        level: 1,
        levelProgress: 0,
        pointsToNextLevel: LEVEL_THRESHOLDS[1],
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date(),
        weeklyPoints: 0,
        monthlyPoints: 0,
      };
      this.userPoints.set(userId, userPts);
    }
    return userPts;
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

  awardBadge(userId: string, badgeId: string): UserBadge | null {
    const badge = this.badges.get(badgeId);
    if (!badge) return null;

    // Check if already earned
    const userBadgeList = this.userBadges.get(userId) || [];
    if (userBadgeList.find(b => b.badgeId === badgeId)) {
      return null; // Already has badge
    }

    const userBadge: UserBadge = {
      badgeId,
      userId,
      earnedAt: new Date(),
      progress: 100,
      isNew: true,
    };

    userBadgeList.push(userBadge);
    this.userBadges.set(userId, userBadgeList);

    // Award points for badge
    this.awardPoints(userId, 'BADGE_EARNED', { badgeId });

    // Emit event
    this.eventEmitter.emit('gamification.badge.earned', {
      userId,
      badgeId,
      badgeName: badge.name,
      rarity: badge.rarity,
    });

    this.logger.log(`User ${userId} earned badge: ${badge.name}`);
    return userBadge;
  }

  getUserBadges(userId: string): (UserBadge & { badge: Badge })[] {
    const userBadgeList = this.userBadges.get(userId) || [];
    return userBadgeList.map(ub => ({
      ...ub,
      badge: this.badges.get(ub.badgeId)!,
    })).filter(b => b.badge);
  }

  getAllBadges(): Badge[] {
    return Array.from(this.badges.values());
  }

  getBadge(badgeId: string): Badge | undefined {
    return this.badges.get(badgeId);
  }

  markBadgeSeen(userId: string, badgeId: string): void {
    const userBadgeList = this.userBadges.get(userId) || [];
    const userBadge = userBadgeList.find(b => b.badgeId === badgeId);
    if (userBadge) {
      userBadge.isNew = false;
    }
  }

  private initializeBadges(): void {
    const badgeDefinitions: Badge[] = [
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

  updateAchievementProgress(userId: string, achievementId: string, value: number): UserAchievement {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      throw new NotFoundException(`Achievement ${achievementId} not found`);
    }

    let userAch = this.getUserAchievement(userId, achievementId);
    if (!userAch) {
      userAch = {
        achievementId,
        userId,
        currentTier: 0,
        progress: 0,
        currentValue: 0,
        status: 'IN_PROGRESS',
        unlockedTiers: [],
        lastUpdated: new Date(),
      };
      const userAchList = this.userAchievements.get(userId) || [];
      userAchList.push(userAch);
      this.userAchievements.set(userId, userAchList);
    }

    userAch.currentValue = value;
    userAch.lastUpdated = new Date();

    // Check tier unlocks
    for (const tier of achievement.tiers) {
      if (value >= tier.target && !userAch.unlockedTiers.includes(tier.level)) {
        userAch.unlockedTiers.push(tier.level);
        userAch.currentTier = tier.level;

        // Award tier badge if exists
        if (tier.badge) {
          this.awardBadge(userId, tier.badge);
        }

        // Award tier points
        this.awardPoints(userId, 'BADGE_EARNED', { achievementId, tier: tier.level });

        this.eventEmitter.emit('gamification.achievement.tier.unlocked', {
          userId,
          achievementId,
          tier: tier.level,
          tierName: tier.name,
        });
      }
    }

    // Calculate progress to next tier
    const nextTier = achievement.tiers.find(t => t.level > userAch!.currentTier);
    if (nextTier) {
      const prevTarget = achievement.tiers.find(t => t.level === userAch!.currentTier)?.target || 0;
      userAch.progress = ((value - prevTarget) / (nextTier.target - prevTarget)) * 100;
    } else {
      userAch.progress = 100;
      userAch.status = 'UNLOCKED';
    }

    return userAch;
  }

  getUserAchievements(userId: string): (UserAchievement & { achievement: Achievement })[] {
    const userAchList = this.userAchievements.get(userId) || [];
    return userAchList.map(ua => ({
      ...ua,
      achievement: this.achievements.get(ua.achievementId)!,
    })).filter(a => a.achievement);
  }

  private getUserAchievement(userId: string, achievementId: string): UserAchievement | undefined {
    const userAchList = this.userAchievements.get(userId) || [];
    return userAchList.find(a => a.achievementId === achievementId);
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

  private checkAchievements(userId: string, action: PointsAction): void {
    const userPts = this.getUserPoints(userId);

    // Update points collector achievement
    this.updateAchievementProgress(userId, 'points-collector', userPts.totalPoints);

    // Check based on action type
    switch (action) {
      case 'COURSE_COMPLETE':
        const courses = this.pointsTransactions.get(userId)?.filter(t => t.action === 'COURSE_COMPLETE').length || 0;
        this.updateAchievementProgress(userId, 'course-completion', courses);
        break;
      case 'PERFECT_SCORE':
        const perfects = this.pointsTransactions.get(userId)?.filter(t => t.action === 'PERFECT_SCORE').length || 0;
        this.updateAchievementProgress(userId, 'quiz-perfection', perfects);
        break;
    }
  }

  // ===== STREAKS =====

  recordActivity(userId: string): Streak {
    const streak = this.getOrCreateStreak(userId);
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

      // Award streak bonus
      this.awardPoints(userId, 'STREAK_BONUS');

      // Check streak badges
      this.updateAchievementProgress(userId, 'streak-master', streak.currentStreak);

      if (streak.currentStreak === 7) {
        this.awardBadge(userId, 'week-streak');
      } else if (streak.currentStreak === 30) {
        this.awardBadge(userId, 'month-streak');
      } else if (streak.currentStreak === 100) {
        this.awardBadge(userId, 'hundred-streak');
      }
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

    streak.lastActivityDate = new Date();
    streak.streakFreezeUsed = false;

    // Update user points
    const userPts = this.getOrCreateUserPoints(userId);
    userPts.currentStreak = streak.currentStreak;
    userPts.longestStreak = streak.longestStreak;
    userPts.lastActiveDate = streak.lastActivityDate;

    return streak;
  }

  getStreak(userId: string): Streak {
    return this.getOrCreateStreak(userId);
  }

  useStreakFreeze(userId: string): boolean {
    const streak = this.getOrCreateStreak(userId);
    if (streak.streakFreezeAvailable > 0) {
      streak.streakFreezeAvailable--;
      return true;
    }
    return false;
  }

  private getOrCreateStreak(userId: string): Streak {
    let streak = this.streaks.get(userId);
    if (!streak) {
      streak = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(),
        streakFreezeAvailable: 2, // Start with 2 freezes
        streakFreezeUsed: false,
      };
      this.streaks.set(userId, streak);
    }
    return streak;
  }

  // ===== LEADERBOARDS =====

  getLeaderboard(period: LeaderboardPeriod, limit: number = 50): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    for (const [userId, userPts] of this.userPoints) {
      let points: number;
      switch (period) {
        case 'DAILY':
          points = this.getDailyPoints(userId);
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

      entries.push({
        rank: 0,
        userId,
        userName: `User ${userId.substring(0, 8)}`, // In production, fetch from user service
        points,
        level: userPts.level,
        badgeCount: (this.userBadges.get(userId) || []).length,
        streak: userPts.currentStreak,
        change: 0, // In production, compare to previous period
      });
    }

    // Sort and assign ranks
    entries.sort((a, b) => b.points - a.points);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries.slice(0, limit);
  }

  getUserRank(userId: string, period: LeaderboardPeriod): number {
    const leaderboard = this.getLeaderboard(period, 1000);
    const entry = leaderboard.find(e => e.userId === userId);
    return entry?.rank || 0;
  }

  private getDailyPoints(userId: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = this.pointsTransactions.get(userId) || [];
    return transactions
      .filter(t => t.createdAt >= today)
      .reduce((sum, t) => sum + t.points, 0);
  }

  // ===== CHALLENGES =====

  joinChallenge(userId: string, challengeId: string): UserChallenge {
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

  updateChallengeProgress(userId: string, challengeId: string, progress: number): UserChallenge {
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
      this.awardPoints(userId, 'BADGE_EARNED', { challengeId });

      if (challenge.badgeId) {
        this.awardBadge(userId, challenge.badgeId);
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

  private generateId(): string {
    return `gam-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Reset weekly/monthly stats (call from cron job)
  resetPeriodStats(period: 'weekly' | 'monthly'): void {
    for (const userPts of this.userPoints.values()) {
      if (period === 'weekly') {
        userPts.weeklyPoints = 0;
      } else {
        userPts.monthlyPoints = 0;
      }
    }
    this.logger.log(`Reset ${period} stats for all users`);
  }
}
