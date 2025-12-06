/**
 * Gamification Service
 * Handles badges, achievements, XP, levels, and leaderboards
 * for the DocumentIulia community
 */

import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// Badge definitions
export interface BadgeDefinition {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  icon: string;
  category: 'learning' | 'community' | 'accounting' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  xpReward: number;
  criteria: {
    type: string;
    threshold: number;
  };
}

// XP configuration
export interface XpConfig {
  action: string;
  baseXp: number;
  description: string;
}

// Level thresholds
export interface Level {
  level: number;
  name: string;
  nameRo: string;
  minXp: number;
  maxXp: number;
  perks: string[];
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  // Badge definitions
  private readonly badges: BadgeDefinition[] = [
    // Learning badges
    {
      id: 'first_course',
      name: 'First Steps',
      nameRo: 'Primii Pași',
      description: 'Complete your first course',
      descriptionRo: 'Finalizează primul curs',
      icon: '🎓',
      category: 'learning',
      tier: 'bronze',
      xpReward: 100,
      criteria: { type: 'courses_completed', threshold: 1 },
    },
    {
      id: 'course_master',
      name: 'Course Master',
      nameRo: 'Maestru al Cursurilor',
      description: 'Complete 10 courses',
      descriptionRo: 'Finalizează 10 cursuri',
      icon: '📚',
      category: 'learning',
      tier: 'gold',
      xpReward: 500,
      criteria: { type: 'courses_completed', threshold: 10 },
    },
    {
      id: 'quiz_ace',
      name: 'Quiz Ace',
      nameRo: 'As al Testelor',
      description: 'Score 100% on 5 quizzes',
      descriptionRo: 'Obține 100% la 5 teste',
      icon: '✅',
      category: 'learning',
      tier: 'silver',
      xpReward: 250,
      criteria: { type: 'perfect_quizzes', threshold: 5 },
    },

    // Community badges
    {
      id: 'first_post',
      name: 'First Voice',
      nameRo: 'Prima Voce',
      description: 'Create your first forum post',
      descriptionRo: 'Creează primul post pe forum',
      icon: '💬',
      category: 'community',
      tier: 'bronze',
      xpReward: 50,
      criteria: { type: 'forum_posts', threshold: 1 },
    },
    {
      id: 'helpful_answer',
      name: 'Helpful Hand',
      nameRo: 'Mână de Ajutor',
      description: 'Have 10 answers marked as solutions',
      descriptionRo: 'Ai 10 răspunsuri marcate ca soluții',
      icon: '🤝',
      category: 'community',
      tier: 'gold',
      xpReward: 400,
      criteria: { type: 'accepted_answers', threshold: 10 },
    },
    {
      id: 'popular_topic',
      name: 'Trending Topic',
      nameRo: 'Subiect Popular',
      description: 'Create a topic with 100+ views',
      descriptionRo: 'Creează un subiect cu 100+ vizualizări',
      icon: '🔥',
      category: 'community',
      tier: 'silver',
      xpReward: 200,
      criteria: { type: 'topic_views', threshold: 100 },
    },
    {
      id: 'community_star',
      name: 'Community Star',
      nameRo: 'Stea a Comunității',
      description: 'Receive 50 likes on your posts',
      descriptionRo: 'Primește 50 de aprecieri la postări',
      icon: '⭐',
      category: 'community',
      tier: 'gold',
      xpReward: 350,
      criteria: { type: 'likes_received', threshold: 50 },
    },

    // Accounting badges
    {
      id: 'first_invoice',
      name: 'Invoice Initiate',
      nameRo: 'Inițiat în Facturare',
      description: 'Create your first invoice',
      descriptionRo: 'Creează prima factură',
      icon: '📄',
      category: 'accounting',
      tier: 'bronze',
      xpReward: 75,
      criteria: { type: 'invoices_created', threshold: 1 },
    },
    {
      id: 'efactura_pro',
      name: 'e-Factura Pro',
      nameRo: 'Pro e-Factura',
      description: 'Send 100 e-Factura to ANAF',
      descriptionRo: 'Trimite 100 e-Facturi la ANAF',
      icon: '📨',
      category: 'accounting',
      tier: 'gold',
      xpReward: 500,
      criteria: { type: 'efactura_sent', threshold: 100 },
    },
    {
      id: 'saft_master',
      name: 'SAF-T Master',
      nameRo: 'Maestru SAF-T',
      description: 'Generate 12 SAF-T reports',
      descriptionRo: 'Generează 12 rapoarte SAF-T',
      icon: '📊',
      category: 'accounting',
      tier: 'platinum',
      xpReward: 750,
      criteria: { type: 'saft_generated', threshold: 12 },
    },
    {
      id: 'expense_tracker',
      name: 'Expense Tracker',
      nameRo: 'Urmăritor de Cheltuieli',
      description: 'Log 500 expenses',
      descriptionRo: 'Înregistrează 500 cheltuieli',
      icon: '💰',
      category: 'accounting',
      tier: 'silver',
      xpReward: 300,
      criteria: { type: 'expenses_logged', threshold: 500 },
    },

    // Special badges
    {
      id: 'early_adopter',
      name: 'Early Adopter',
      nameRo: 'Pionier',
      description: 'Join during beta period',
      descriptionRo: 'Te-ai alăturat în perioada beta',
      icon: '🚀',
      category: 'special',
      tier: 'diamond',
      xpReward: 1000,
      criteria: { type: 'join_date', threshold: 0 },
    },
    {
      id: 'instructor',
      name: 'Knowledge Sharer',
      nameRo: 'Împărtășitor de Cunoștințe',
      description: 'Become a course instructor',
      descriptionRo: 'Devino instructor de cursuri',
      icon: '👨‍🏫',
      category: 'special',
      tier: 'diamond',
      xpReward: 1500,
      criteria: { type: 'courses_created', threshold: 1 },
    },
    {
      id: 'verified_accountant',
      name: 'Verified Accountant',
      nameRo: 'Contabil Verificat',
      description: 'Verify your CECCAR membership',
      descriptionRo: 'Verifică-ți calitatea de membru CECCAR',
      icon: '✓',
      category: 'special',
      tier: 'platinum',
      xpReward: 500,
      criteria: { type: 'ceccar_verified', threshold: 1 },
    },
  ];

  // XP actions
  private readonly xpActions: XpConfig[] = [
    { action: 'course_complete', baseXp: 100, description: 'Complete a course' },
    { action: 'lesson_complete', baseXp: 15, description: 'Complete a lesson' },
    { action: 'quiz_pass', baseXp: 25, description: 'Pass a quiz' },
    { action: 'quiz_perfect', baseXp: 50, description: 'Score 100% on quiz' },
    { action: 'forum_post', baseXp: 10, description: 'Create a forum post' },
    { action: 'forum_reply', baseXp: 5, description: 'Reply to a topic' },
    { action: 'answer_accepted', baseXp: 30, description: 'Answer marked as solution' },
    { action: 'post_liked', baseXp: 2, description: 'Receive a like' },
    { action: 'invoice_created', baseXp: 5, description: 'Create an invoice' },
    { action: 'efactura_sent', baseXp: 10, description: 'Send e-Factura' },
    { action: 'expense_logged', baseXp: 2, description: 'Log an expense' },
    { action: 'daily_login', baseXp: 5, description: 'Daily login bonus' },
    { action: 'streak_bonus', baseXp: 10, description: 'Login streak bonus (per day)' },
  ];

  // Levels
  private readonly levels: Level[] = [
    { level: 1, name: 'Novice', nameRo: 'Novice', minXp: 0, maxXp: 99, perks: [] },
    { level: 2, name: 'Beginner', nameRo: 'Începător', minXp: 100, maxXp: 299, perks: ['forum_signature'] },
    { level: 3, name: 'Apprentice', nameRo: 'Ucenic', minXp: 300, maxXp: 599, perks: ['custom_avatar'] },
    { level: 4, name: 'Intermediate', nameRo: 'Intermediar', minXp: 600, maxXp: 999, perks: ['priority_support'] },
    { level: 5, name: 'Advanced', nameRo: 'Avansat', minXp: 1000, maxXp: 1999, perks: ['beta_features'] },
    { level: 6, name: 'Expert', nameRo: 'Expert', minXp: 2000, maxXp: 3499, perks: ['course_creation'] },
    { level: 7, name: 'Master', nameRo: 'Maestru', minXp: 3500, maxXp: 5499, perks: ['verified_badge'] },
    { level: 8, name: 'Grand Master', nameRo: 'Mare Maestru', minXp: 5500, maxXp: 7999, perks: ['custom_title'] },
    { level: 9, name: 'Legend', nameRo: 'Legendă', minXp: 8000, maxXp: 11999, perks: ['mentorship'] },
    { level: 10, name: 'Titan', nameRo: 'Titan', minXp: 12000, maxXp: Infinity, perks: ['all_perks'] },
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Get user's gamification profile
   */
  async getUserProfile(userId: string): Promise<{
    xp: number;
    level: Level;
    badges: any[];
    stats: any;
    recentActivity: any[];
    nextLevelProgress: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrollments: true,
        forumTopics: true,
        forumReplies: true,
        courseReviews: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate XP from activities (simplified - in production, store XP in user table)
    let totalXp = 0;
    totalXp += (user.enrollments?.filter(e => e.completedAt)?.length || 0) * 100;
    totalXp += (user.forumTopics?.length || 0) * 10;
    totalXp += (user.forumReplies?.length || 0) * 5;

    // Determine level
    const level = this.getLevelForXp(totalXp);
    const nextLevelProgress = this.calculateLevelProgress(totalXp, level);

    // Get earned badges
    const earnedBadges = await this.checkEarnedBadges(userId, {
      coursesCompleted: user.enrollments?.filter(e => e.completedAt)?.length || 0,
      forumPosts: (user.forumTopics?.length || 0) + (user.forumReplies?.length || 0),
      invoicesCreated: 0, // Would query from companies
    });

    return {
      xp: totalXp,
      level,
      badges: earnedBadges,
      stats: {
        coursesCompleted: user.enrollments?.filter(e => e.completedAt)?.length || 0,
        forumPosts: user.forumTopics?.length || 0,
        forumReplies: user.forumReplies?.length || 0,
        helpfulAnswers: user.forumReplies?.filter(r => r.isAccepted)?.length || 0,
      },
      recentActivity: [],
      nextLevelProgress,
    };
  }

  /**
   * Award XP to user
   */
  async awardXp(
    userId: string,
    action: string,
    multiplier: number = 1,
  ): Promise<{ xpAwarded: number; newTotal: number; leveledUp: boolean; newLevel?: Level }> {
    const xpConfig = this.xpActions.find(x => x.action === action);
    if (!xpConfig) {
      this.logger.warn(`Unknown XP action: ${action}`);
      return { xpAwarded: 0, newTotal: 0, leveledUp: false };
    }

    const xpAwarded = Math.round(xpConfig.baseXp * multiplier);

    // In production, update user's XP in database
    // For now, just return the calculated values
    const currentXp = 0; // Would fetch from DB
    const newTotal = currentXp + xpAwarded;

    const oldLevel = this.getLevelForXp(currentXp);
    const newLevel = this.getLevelForXp(newTotal);
    const leveledUp = newLevel.level > oldLevel.level;

    this.logger.log(`Awarded ${xpAwarded} XP to user ${userId} for ${action}`);

    return {
      xpAwarded,
      newTotal,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
    };
  }

  /**
   * Check and award badges
   */
  async checkEarnedBadges(
    userId: string,
    stats: Record<string, number>,
  ): Promise<any[]> {
    const earnedBadges: any[] = [];

    for (const badge of this.badges) {
      const statValue = this.getStatForCriteria(stats, badge.criteria.type);
      if (statValue >= badge.criteria.threshold) {
        earnedBadges.push({
          ...badge,
          earnedAt: new Date().toISOString(),
          progress: 100,
        });
      } else {
        // Include progress for unearned badges
        earnedBadges.push({
          ...badge,
          earnedAt: null,
          progress: Math.min(100, Math.round((statValue / badge.criteria.threshold) * 100)),
        });
      }
    }

    return earnedBadges.sort((a, b) => {
      if (a.earnedAt && !b.earnedAt) return -1;
      if (!a.earnedAt && b.earnedAt) return 1;
      return b.progress - a.progress;
    });
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    timeframe: 'daily' | 'weekly' | 'monthly' | 'alltime' = 'monthly',
    limit: number = 50,
  ): Promise<any[]> {
    // In production, query from aggregated stats table
    // Mock leaderboard for now
    return [
      { rank: 1, userId: 'user1', name: 'Maria P.', xp: 12500, level: 10, badges: 15 },
      { rank: 2, userId: 'user2', name: 'Ion M.', xp: 8200, level: 9, badges: 12 },
      { rank: 3, userId: 'user3', name: 'Ana C.', xp: 6100, level: 7, badges: 10 },
      { rank: 4, userId: 'user4', name: 'Mihai D.', xp: 4500, level: 6, badges: 8 },
      { rank: 5, userId: 'user5', name: 'Elena S.', xp: 3200, level: 5, badges: 7 },
    ];
  }

  /**
   * Get all available badges
   */
  getAllBadges(): BadgeDefinition[] {
    return this.badges;
  }

  /**
   * Get XP actions configuration
   */
  getXpActions(): XpConfig[] {
    return this.xpActions;
  }

  /**
   * Get all levels
   */
  getAllLevels(): Level[] {
    return this.levels;
  }

  /**
   * Get level for XP amount
   */
  private getLevelForXp(xp: number): Level {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (xp >= this.levels[i].minXp) {
        return this.levels[i];
      }
    }
    return this.levels[0];
  }

  /**
   * Calculate progress to next level
   */
  private calculateLevelProgress(xp: number, currentLevel: Level): number {
    if (currentLevel.level === this.levels.length) {
      return 100; // Max level
    }
    const xpInLevel = xp - currentLevel.minXp;
    const levelRange = currentLevel.maxXp - currentLevel.minXp + 1;
    return Math.min(100, Math.round((xpInLevel / levelRange) * 100));
  }

  /**
   * Get stat value for badge criteria
   */
  private getStatForCriteria(stats: Record<string, number>, criteriaType: string): number {
    const mapping: Record<string, string> = {
      courses_completed: 'coursesCompleted',
      forum_posts: 'forumPosts',
      invoices_created: 'invoicesCreated',
      accepted_answers: 'helpfulAnswers',
    };
    return stats[mapping[criteriaType] || criteriaType] || 0;
  }
}
