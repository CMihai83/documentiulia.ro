import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Onboarding Gamification Service
 * Track user progress, award achievements, and incentivize platform adoption
 *
 * Features:
 * - Onboarding step tracking
 * - Achievement/milestone system
 * - Points and rewards
 * - Progress badges
 * - Completion bonuses
 * - Streak tracking
 * - Referral rewards
 */

// =================== INTERFACES ===================

export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  category: OnboardingCategory;
  order: number;
  points: number;
  estimatedMinutes: number;
  isRequired: boolean;
  prerequisites?: string[];
  action: {
    type: 'navigate' | 'complete' | 'verify' | 'upload' | 'configure';
    route?: string;
    apiEndpoint?: string;
    completionCriteria?: string;
  };
}

export type OnboardingCategory =
  | 'account_setup'
  | 'company_profile'
  | 'integrations'
  | 'documents'
  | 'compliance'
  | 'team'
  | 'advanced';

export interface UserOnboardingProgress {
  userId: string;
  tenantId: string;
  completedSteps: string[];
  currentStep?: string;
  totalPoints: number;
  earnedAchievements: string[];
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;
  streak: number;
  longestStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  criteria: AchievementCriteria;
  reward?: AchievementReward;
  isHidden: boolean;
}

export type AchievementCategory =
  | 'onboarding'
  | 'usage'
  | 'compliance'
  | 'social'
  | 'milestone'
  | 'special';

export interface AchievementCriteria {
  type: 'steps_completed' | 'points_earned' | 'streak_days' | 'feature_used' |
        'documents_processed' | 'invoices_created' | 'referrals' | 'custom';
  threshold: number;
  condition?: string;
}

export interface AchievementReward {
  type: 'subscription_days' | 'feature_unlock' | 'discount' | 'badge' | 'credits';
  value: number | string;
  description: string;
}

export interface UserAchievement {
  id: string;
  odataAchievementId: string;
  userId: string;
  tenantId: string;
  earnedAt: Date;
  pointsEarned: number;
  rewardApplied: boolean;
}

export interface OnboardingReward {
  id: string;
  name: string;
  description: string;
  triggerType: 'completion_percent' | 'step_completed' | 'achievement_earned' | 'streak';
  triggerValue: number | string;
  rewardType: 'subscription_extension' | 'feature_trial' | 'discount_code' | 'credits';
  rewardValue: number | string;
  validDays: number;
  isActive: boolean;
}

export interface OnboardingStats {
  totalUsers: number;
  completedUsers: number;
  averageCompletionRate: number;
  averageTimeToComplete: number;
  stepCompletionRates: Record<string, number>;
  topAchievements: Array<{ id: string; name: string; earnedCount: number }>;
  averagePoints: number;
}

// =================== SERVICE ===================

@Injectable()
export class OnboardingGamificationService {
  private readonly logger = new Logger(OnboardingGamificationService.name);

  // Storage
  private steps: Map<string, OnboardingStep> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private userProgress: Map<string, UserOnboardingProgress> = new Map();
  private userAchievements: Map<string, UserAchievement[]> = new Map();
  private rewards: Map<string, OnboardingReward> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultSteps();
    this.initializeDefaultAchievements();
    this.initializeDefaultRewards();
  }

  // =================== INITIALIZATION ===================

  private initializeDefaultSteps(): void {
    const defaultSteps: OnboardingStep[] = [
      // Account Setup
      {
        id: 'verify-email',
        name: 'Verify Email',
        description: 'Confirm your email address to secure your account',
        category: 'account_setup',
        order: 1,
        points: 10,
        estimatedMinutes: 2,
        isRequired: true,
        action: { type: 'verify' },
      },
      {
        id: 'set-password',
        name: 'Set Strong Password',
        description: 'Create a secure password for your account',
        category: 'account_setup',
        order: 2,
        points: 10,
        estimatedMinutes: 2,
        isRequired: true,
        action: { type: 'configure', route: '/settings/security' },
      },
      {
        id: 'enable-2fa',
        name: 'Enable Two-Factor Authentication',
        description: 'Add an extra layer of security to your account',
        category: 'account_setup',
        order: 3,
        points: 25,
        estimatedMinutes: 5,
        isRequired: false,
        action: { type: 'configure', route: '/settings/security' },
      },

      // Company Profile
      {
        id: 'company-basic-info',
        name: 'Add Company Information',
        description: 'Enter your company name, CUI, and registration number',
        category: 'company_profile',
        order: 4,
        points: 20,
        estimatedMinutes: 5,
        isRequired: true,
        action: { type: 'configure', route: '/settings/company' },
      },
      {
        id: 'company-address',
        name: 'Add Company Address',
        description: 'Enter your registered business address',
        category: 'company_profile',
        order: 5,
        points: 15,
        estimatedMinutes: 3,
        isRequired: true,
        prerequisites: ['company-basic-info'],
        action: { type: 'configure', route: '/settings/company' },
      },
      {
        id: 'company-logo',
        name: 'Upload Company Logo',
        description: 'Add your logo to appear on invoices and documents',
        category: 'company_profile',
        order: 6,
        points: 15,
        estimatedMinutes: 3,
        isRequired: false,
        action: { type: 'upload', route: '/settings/company' },
      },
      {
        id: 'bank-details',
        name: 'Add Bank Details',
        description: 'Enter your bank account for payments',
        category: 'company_profile',
        order: 7,
        points: 20,
        estimatedMinutes: 5,
        isRequired: true,
        action: { type: 'configure', route: '/settings/banking' },
      },

      // Integrations
      {
        id: 'connect-anaf',
        name: 'Connect to ANAF',
        description: 'Link your account with ANAF for e-Factura and SPV',
        category: 'integrations',
        order: 8,
        points: 50,
        estimatedMinutes: 10,
        isRequired: false,
        action: { type: 'configure', route: '/settings/integrations/anaf' },
      },
      {
        id: 'connect-bank',
        name: 'Connect Bank Account',
        description: 'Link your bank for automatic reconciliation',
        category: 'integrations',
        order: 9,
        points: 40,
        estimatedMinutes: 10,
        isRequired: false,
        action: { type: 'configure', route: '/settings/integrations/banking' },
      },
      {
        id: 'connect-saga',
        name: 'Connect SAGA',
        description: 'Integrate with SAGA accounting software',
        category: 'integrations',
        order: 10,
        points: 40,
        estimatedMinutes: 15,
        isRequired: false,
        action: { type: 'configure', route: '/settings/integrations/saga' },
      },

      // Documents
      {
        id: 'first-invoice',
        name: 'Create First Invoice',
        description: 'Issue your first invoice using the platform',
        category: 'documents',
        order: 11,
        points: 30,
        estimatedMinutes: 10,
        isRequired: true,
        action: { type: 'complete', route: '/invoices/new' },
      },
      {
        id: 'first-ocr',
        name: 'Process Document with OCR',
        description: 'Upload and process a document using AI-powered OCR',
        category: 'documents',
        order: 12,
        points: 25,
        estimatedMinutes: 5,
        isRequired: false,
        action: { type: 'upload', route: '/documents/upload' },
      },
      {
        id: 'first-partner',
        name: 'Add First Partner/Client',
        description: 'Add a business partner or client to your contacts',
        category: 'documents',
        order: 13,
        points: 15,
        estimatedMinutes: 5,
        isRequired: true,
        action: { type: 'complete', route: '/partners/new' },
      },

      // Compliance
      {
        id: 'vat-settings',
        name: 'Configure VAT Settings',
        description: 'Set up your VAT rates and preferences',
        category: 'compliance',
        order: 14,
        points: 20,
        estimatedMinutes: 5,
        isRequired: true,
        action: { type: 'configure', route: '/settings/tax' },
      },
      {
        id: 'review-d406',
        name: 'Review SAF-T D406 Settings',
        description: 'Ensure your D406 declaration settings are correct',
        category: 'compliance',
        order: 15,
        points: 25,
        estimatedMinutes: 10,
        isRequired: false,
        prerequisites: ['connect-anaf'],
        action: { type: 'configure', route: '/compliance/d406' },
      },

      // Team
      {
        id: 'invite-team',
        name: 'Invite Team Member',
        description: 'Invite a colleague to collaborate on your account',
        category: 'team',
        order: 16,
        points: 20,
        estimatedMinutes: 5,
        isRequired: false,
        action: { type: 'complete', route: '/settings/team' },
      },

      // Advanced
      {
        id: 'customize-invoice-template',
        name: 'Customize Invoice Template',
        description: 'Personalize your invoice design and layout',
        category: 'advanced',
        order: 17,
        points: 20,
        estimatedMinutes: 10,
        isRequired: false,
        action: { type: 'configure', route: '/settings/templates' },
      },
      {
        id: 'setup-workflow',
        name: 'Create First Workflow',
        description: 'Automate a business process with workflow automation',
        category: 'advanced',
        order: 18,
        points: 35,
        estimatedMinutes: 15,
        isRequired: false,
        action: { type: 'complete', route: '/workflows/new' },
      },
      {
        id: 'mobile-app',
        name: 'Install Mobile App',
        description: 'Download and log in to the mobile app',
        category: 'advanced',
        order: 19,
        points: 25,
        estimatedMinutes: 5,
        isRequired: false,
        action: { type: 'verify' },
      },
    ];

    defaultSteps.forEach(step => this.steps.set(step.id, step));
    this.logger.log(`Initialized ${defaultSteps.length} onboarding steps`);
  }

  private initializeDefaultAchievements(): void {
    const defaultAchievements: Achievement[] = [
      // Onboarding
      {
        id: 'first-steps',
        name: 'First Steps',
        nameRo: 'Primii Pasi',
        description: 'Complete your first onboarding step',
        descriptionRo: 'Finalizeaza primul pas de onboarding',
        icon: 'rocket',
        category: 'onboarding',
        points: 10,
        rarity: 'common',
        criteria: { type: 'steps_completed', threshold: 1 },
        isHidden: false,
      },
      {
        id: 'getting-started',
        name: 'Getting Started',
        nameRo: 'La Inceput de Drum',
        description: 'Complete 5 onboarding steps',
        descriptionRo: 'Finalizeaza 5 pasi de onboarding',
        icon: 'star',
        category: 'onboarding',
        points: 25,
        rarity: 'common',
        criteria: { type: 'steps_completed', threshold: 5 },
        isHidden: false,
      },
      {
        id: 'halfway-there',
        name: 'Halfway There',
        nameRo: 'La Jumatatea Drumului',
        description: 'Complete 50% of onboarding',
        descriptionRo: 'Finalizeaza 50% din onboarding',
        icon: 'flag',
        category: 'onboarding',
        points: 50,
        rarity: 'uncommon',
        criteria: { type: 'steps_completed', threshold: 10 },
        isHidden: false,
      },
      {
        id: 'onboarding-complete',
        name: 'Fully Onboarded',
        nameRo: 'Onboarding Complet',
        description: 'Complete all required onboarding steps',
        descriptionRo: 'Finalizeaza toti pasii obligatorii de onboarding',
        icon: 'trophy',
        category: 'onboarding',
        points: 100,
        rarity: 'rare',
        criteria: { type: 'steps_completed', threshold: 15 },
        reward: { type: 'subscription_days', value: 7, description: '7 days free subscription' },
        isHidden: false,
      },
      {
        id: 'completionist',
        name: 'Completionist',
        nameRo: 'Perfectionistul',
        description: 'Complete ALL onboarding steps including optional ones',
        descriptionRo: 'Finalizeaza TOTI pasii de onboarding, inclusiv cei optionali',
        icon: 'crown',
        category: 'onboarding',
        points: 200,
        rarity: 'epic',
        criteria: { type: 'steps_completed', threshold: 19 },
        reward: { type: 'subscription_days', value: 14, description: '14 days free subscription' },
        isHidden: false,
      },

      // Streaks
      {
        id: 'streak-3',
        name: '3-Day Streak',
        nameRo: 'Serie de 3 Zile',
        description: 'Complete steps 3 days in a row',
        descriptionRo: 'Finalizeaza pasi 3 zile la rand',
        icon: 'fire',
        category: 'milestone',
        points: 30,
        rarity: 'uncommon',
        criteria: { type: 'streak_days', threshold: 3 },
        isHidden: false,
      },
      {
        id: 'streak-7',
        name: 'Weekly Warrior',
        nameRo: 'Razboinic Saptamanal',
        description: 'Complete steps 7 days in a row',
        descriptionRo: 'Finalizeaza pasi 7 zile la rand',
        icon: 'fire',
        category: 'milestone',
        points: 75,
        rarity: 'rare',
        criteria: { type: 'streak_days', threshold: 7 },
        reward: { type: 'discount', value: '10%', description: '10% discount on next month' },
        isHidden: false,
      },

      // Usage
      {
        id: 'invoice-master',
        name: 'Invoice Master',
        nameRo: 'Maestru al Facturilor',
        description: 'Create 10 invoices',
        descriptionRo: 'Creeaza 10 facturi',
        icon: 'document',
        category: 'usage',
        points: 50,
        rarity: 'uncommon',
        criteria: { type: 'invoices_created', threshold: 10 },
        isHidden: false,
      },
      {
        id: 'ocr-wizard',
        name: 'OCR Wizard',
        nameRo: 'Magicianul OCR',
        description: 'Process 25 documents with OCR',
        descriptionRo: 'Proceseaza 25 de documente cu OCR',
        icon: 'scan',
        category: 'usage',
        points: 75,
        rarity: 'rare',
        criteria: { type: 'documents_processed', threshold: 25 },
        isHidden: false,
      },

      // Social
      {
        id: 'team-player',
        name: 'Team Player',
        nameRo: 'Jucator de Echipa',
        description: 'Invite 3 team members',
        descriptionRo: 'Invita 3 membri in echipa',
        icon: 'users',
        category: 'social',
        points: 50,
        rarity: 'uncommon',
        criteria: { type: 'referrals', threshold: 3 },
        isHidden: false,
      },
      {
        id: 'ambassador',
        name: 'Platform Ambassador',
        nameRo: 'Ambasador al Platformei',
        description: 'Refer 5 new companies to the platform',
        descriptionRo: 'Recomanda 5 companii noi pe platforma',
        icon: 'megaphone',
        category: 'social',
        points: 150,
        rarity: 'epic',
        criteria: { type: 'referrals', threshold: 5 },
        reward: { type: 'credits', value: 100, description: '100 platform credits' },
        isHidden: false,
      },

      // Special
      {
        id: 'early-adopter',
        name: 'Early Adopter',
        nameRo: 'Adoptator Timpuriu',
        description: 'Joined during the platform launch period',
        descriptionRo: 'S-a alaturat in perioada de lansare',
        icon: 'sparkles',
        category: 'special',
        points: 100,
        rarity: 'legendary',
        criteria: { type: 'custom', threshold: 0, condition: 'registration_before_launch' },
        isHidden: true,
      },
      {
        id: 'speed-demon',
        name: 'Speed Demon',
        nameRo: 'Demonul Vitezei',
        description: 'Complete onboarding within 24 hours',
        descriptionRo: 'Finalizeaza onboarding-ul in 24 de ore',
        icon: 'lightning',
        category: 'special',
        points: 150,
        rarity: 'epic',
        criteria: { type: 'custom', threshold: 24, condition: 'hours_to_complete' },
        isHidden: true,
      },
    ];

    defaultAchievements.forEach(a => this.achievements.set(a.id, a));
    this.logger.log(`Initialized ${defaultAchievements.length} achievements`);
  }

  private initializeDefaultRewards(): void {
    const defaultRewards: OnboardingReward[] = [
      {
        id: 'reward-25-percent',
        name: '25% Completion Bonus',
        description: 'Bonus for completing 25% of onboarding',
        triggerType: 'completion_percent',
        triggerValue: 25,
        rewardType: 'credits',
        rewardValue: 25,
        validDays: 30,
        isActive: true,
      },
      {
        id: 'reward-50-percent',
        name: '50% Completion Bonus',
        description: 'Bonus for completing 50% of onboarding',
        triggerType: 'completion_percent',
        triggerValue: 50,
        rewardType: 'feature_trial',
        rewardValue: 'advanced_reporting',
        validDays: 14,
        isActive: true,
      },
      {
        id: 'reward-100-percent',
        name: 'Full Completion Bonus',
        description: 'Bonus for completing all required steps',
        triggerType: 'completion_percent',
        triggerValue: 100,
        rewardType: 'subscription_extension',
        rewardValue: 7,
        validDays: 90,
        isActive: true,
      },
      {
        id: 'reward-anaf-connect',
        name: 'ANAF Connection Bonus',
        description: 'Bonus for connecting ANAF integration',
        triggerType: 'step_completed',
        triggerValue: 'connect-anaf',
        rewardType: 'discount_code',
        rewardValue: 'ANAF20',
        validDays: 30,
        isActive: true,
      },
    ];

    defaultRewards.forEach(r => this.rewards.set(r.id, r));
    this.logger.log(`Initialized ${defaultRewards.length} onboarding rewards`);
  }

  // =================== PROGRESS TRACKING ===================

  async startOnboarding(userId: string, tenantId: string): Promise<UserOnboardingProgress> {
    const progress: UserOnboardingProgress = {
      userId,
      tenantId,
      completedSteps: [],
      currentStep: 'verify-email',
      totalPoints: 0,
      earnedAchievements: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      streak: 0,
      longestStreak: 0,
    };

    this.userProgress.set(userId, progress);
    this.userAchievements.set(userId, []);

    this.eventEmitter.emit('onboarding.started', { userId, tenantId });

    return progress;
  }

  async completeStep(userId: string, stepId: string): Promise<{
    progress: UserOnboardingProgress;
    pointsEarned: number;
    newAchievements: Achievement[];
    newRewards: OnboardingReward[];
  }> {
    const progress = this.userProgress.get(userId);
    if (!progress) {
      throw new Error('Onboarding not started for user');
    }

    const step = this.steps.get(stepId);
    if (!step) {
      throw new Error('Invalid step ID');
    }

    // Check prerequisites
    if (step.prerequisites) {
      const missingPrereqs = step.prerequisites.filter(p => !progress.completedSteps.includes(p));
      if (missingPrereqs.length > 0) {
        throw new Error(`Prerequisites not met: ${missingPrereqs.join(', ')}`);
      }
    }

    // Check if already completed
    if (progress.completedSteps.includes(stepId)) {
      return { progress, pointsEarned: 0, newAchievements: [], newRewards: [] };
    }

    // Complete step
    progress.completedSteps.push(stepId);
    progress.totalPoints += step.points;
    progress.lastActivityAt = new Date();

    // Update streak
    const lastActivity = new Date(progress.lastActivityAt);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) {
      progress.streak++;
      if (progress.streak > progress.longestStreak) {
        progress.longestStreak = progress.streak;
      }
    } else {
      progress.streak = 1;
    }

    // Find next step
    const completedCount = progress.completedSteps.length;
    const allSteps = Array.from(this.steps.values()).sort((a, b) => a.order - b.order);
    const nextStep = allSteps.find(s => !progress.completedSteps.includes(s.id));
    progress.currentStep = nextStep?.id;

    // Check if all required steps completed
    const requiredSteps = allSteps.filter(s => s.isRequired);
    const allRequiredCompleted = requiredSteps.every(s => progress.completedSteps.includes(s.id));
    if (allRequiredCompleted && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    this.userProgress.set(userId, progress);

    // Check for new achievements
    const newAchievements = await this.checkAchievements(userId, progress);

    // Check for rewards
    const newRewards = await this.checkRewards(userId, progress, stepId);

    this.eventEmitter.emit('onboarding.step.completed', {
      userId,
      stepId,
      pointsEarned: step.points,
      totalPoints: progress.totalPoints,
      completionPercent: Math.round((completedCount / allSteps.length) * 100),
    });

    return {
      progress,
      pointsEarned: step.points,
      newAchievements,
      newRewards,
    };
  }

  private async checkAchievements(
    userId: string,
    progress: UserOnboardingProgress,
  ): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];
    const userAchievementList = this.userAchievements.get(userId) || [];
    const earnedIds = userAchievementList.map(ua => ua.odataAchievementId);

    for (const [id, achievement] of this.achievements) {
      if (earnedIds.includes(id)) continue;

      let earned = false;

      switch (achievement.criteria.type) {
        case 'steps_completed':
          earned = progress.completedSteps.length >= achievement.criteria.threshold;
          break;
        case 'points_earned':
          earned = progress.totalPoints >= achievement.criteria.threshold;
          break;
        case 'streak_days':
          earned = progress.streak >= achievement.criteria.threshold;
          break;
      }

      if (earned) {
        const userAchievement: UserAchievement = {
          id: `ua-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          odataAchievementId: id,
          userId,
          tenantId: progress.tenantId,
          earnedAt: new Date(),
          pointsEarned: achievement.points,
          rewardApplied: false,
        };

        userAchievementList.push(userAchievement);
        progress.earnedAchievements.push(id);
        progress.totalPoints += achievement.points;
        newAchievements.push(achievement);

        this.eventEmitter.emit('achievement.earned', {
          userId,
          achievementId: id,
          achievementName: achievement.name,
          points: achievement.points,
        });
      }
    }

    this.userAchievements.set(userId, userAchievementList);

    return newAchievements;
  }

  private async checkRewards(
    userId: string,
    progress: UserOnboardingProgress,
    completedStepId: string,
  ): Promise<OnboardingReward[]> {
    const newRewards: OnboardingReward[] = [];
    const totalSteps = this.steps.size;
    const completionPercent = Math.round((progress.completedSteps.length / totalSteps) * 100);

    for (const [id, reward] of this.rewards) {
      if (!reward.isActive) continue;

      let triggered = false;

      switch (reward.triggerType) {
        case 'completion_percent':
          triggered = completionPercent >= (reward.triggerValue as number);
          break;
        case 'step_completed':
          triggered = completedStepId === reward.triggerValue;
          break;
        case 'streak':
          triggered = progress.streak >= (reward.triggerValue as number);
          break;
      }

      if (triggered) {
        newRewards.push(reward);

        this.eventEmitter.emit('reward.triggered', {
          userId,
          rewardId: id,
          rewardName: reward.name,
          rewardType: reward.rewardType,
          rewardValue: reward.rewardValue,
        });
      }
    }

    return newRewards;
  }

  // =================== GETTERS ===================

  async getUserProgress(userId: string): Promise<UserOnboardingProgress | null> {
    return this.userProgress.get(userId) || null;
  }

  async getUserAchievements(userId: string): Promise<Array<Achievement & { earnedAt: Date }>> {
    const userAchievementList = this.userAchievements.get(userId) || [];

    return userAchievementList.map(ua => {
      const achievement = this.achievements.get(ua.odataAchievementId)!;
      return { ...achievement, earnedAt: ua.earnedAt };
    });
  }

  async getOnboardingStatus(userId: string): Promise<{
    progress: UserOnboardingProgress | null;
    steps: Array<OnboardingStep & { completed: boolean }>;
    achievements: Array<Achievement & { earned: boolean; earnedAt?: Date }>;
    completionPercent: number;
    nextStep: OnboardingStep | null;
  }> {
    const progress = this.userProgress.get(userId) || null;
    const completedSteps = progress?.completedSteps || [];
    const userAchievementList = this.userAchievements.get(userId) || [];
    const earnedIds = userAchievementList.map(ua => ua.odataAchievementId);

    const steps = Array.from(this.steps.values())
      .sort((a, b) => a.order - b.order)
      .map(step => ({
        ...step,
        completed: completedSteps.includes(step.id),
      }));

    const achievements = Array.from(this.achievements.values())
      .filter(a => !a.isHidden || earnedIds.includes(a.id))
      .map(achievement => {
        const userAchievement = userAchievementList.find(ua => ua.odataAchievementId === achievement.id);
        return {
          ...achievement,
          earned: earnedIds.includes(achievement.id),
          earnedAt: userAchievement?.earnedAt,
        };
      });

    const completionPercent = Math.round((completedSteps.length / steps.length) * 100);
    const nextStep = steps.find(s => !s.completed) || null;

    return {
      progress,
      steps,
      achievements,
      completionPercent,
      nextStep,
    };
  }

  async getAllSteps(): Promise<OnboardingStep[]> {
    return Array.from(this.steps.values()).sort((a, b) => a.order - b.order);
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return Array.from(this.achievements.values()).filter(a => !a.isHidden);
  }

  async getLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    tenantId: string;
    points: number;
    achievementCount: number;
    completionPercent: number;
  }>> {
    const totalSteps = this.steps.size;

    return Array.from(this.userProgress.values())
      .map(p => ({
        userId: p.userId,
        tenantId: p.tenantId,
        points: p.totalPoints,
        achievementCount: p.earnedAchievements.length,
        completionPercent: Math.round((p.completedSteps.length / totalSteps) * 100),
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }

  async getStats(): Promise<OnboardingStats> {
    const allProgress = Array.from(this.userProgress.values());
    const totalUsers = allProgress.length;
    const completedUsers = allProgress.filter(p => p.completedAt).length;
    const totalSteps = this.steps.size;

    const stepCompletionRates: Record<string, number> = {};
    for (const [stepId] of this.steps) {
      const completed = allProgress.filter(p => p.completedSteps.includes(stepId)).length;
      stepCompletionRates[stepId] = totalUsers > 0 ? Math.round((completed / totalUsers) * 100) : 0;
    }

    const achievementCounts: Record<string, number> = {};
    for (const userAchievementList of this.userAchievements.values()) {
      for (const ua of userAchievementList) {
        achievementCounts[ua.odataAchievementId] = (achievementCounts[ua.odataAchievementId] || 0) + 1;
      }
    }

    const topAchievements = Object.entries(achievementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        id,
        name: this.achievements.get(id)?.name || id,
        earnedCount: count,
      }));

    const totalPoints = allProgress.reduce((sum, p) => sum + p.totalPoints, 0);

    return {
      totalUsers,
      completedUsers,
      averageCompletionRate: totalUsers > 0
        ? Math.round(allProgress.reduce((sum, p) => sum + (p.completedSteps.length / totalSteps), 0) / totalUsers * 100)
        : 0,
      averageTimeToComplete: 0, // Would calculate from completedAt - startedAt
      stepCompletionRates,
      topAchievements,
      averagePoints: totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0,
    };
  }
}
