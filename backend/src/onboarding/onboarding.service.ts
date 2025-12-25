import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface CompanyDetails {
  name: string;
  cui: string;
  regCom?: string;
  address?: string;
  city?: string;
  county?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
}

export interface TaxConfig {
  vatPayer: boolean;
  vatRate: '21' | '11' | '5' | '0';
  taxRegime: 'normal' | 'micro' | 'nonprofit';
  anafCertificate: boolean;
  sagaIntegration: boolean;
}

export interface BankDetails {
  bankName?: string;
  bankAccount?: string;
  swift?: string;
  currency: 'RON' | 'EUR' | 'USD';
}

export interface TeamMember {
  name: string;
  email: string;
  role: 'admin' | 'accountant' | 'viewer';
}

export interface OnboardingData {
  company: CompanyDetails;
  tax: TaxConfig;
  bank: BankDetails;
  team: TeamMember[];
}

export interface OnboardingStatus {
  completed: boolean;
  currentStep: number;
  completedSteps: string[];
  lastUpdated: Date;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate a URL-friendly slug from company name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Complete onboarding for a user/organization
   */
  async completeOnboarding(
    userId: string,
    data: OnboardingData,
  ): Promise<{ success: boolean; organizationId: string }> {
    this.logger.log(`Completing onboarding for user ${userId}`);

    // Validate required fields
    if (!data.company.cui || !data.company.name) {
      throw new BadRequestException('Company CUI and name are required');
    }

    // Validate CUI format (Romanian tax ID)
    const cuiRegex = /^(RO)?[0-9]{2,10}$/i;
    if (!cuiRegex.test(data.company.cui)) {
      throw new BadRequestException('Invalid CUI format');
    }

    // Validate IBAN if provided
    if (data.bank.bankAccount && !this.validateIBAN(data.bank.bankAccount)) {
      throw new BadRequestException('Invalid IBAN format');
    }

    try {
      // Use transaction to ensure data consistency
      const result = await this.prisma.$transaction(async (tx) => {
        // Generate a unique slug
        const baseSlug = this.generateSlug(data.company.name);
        let slug = baseSlug;
        let counter = 1;

        // Check for slug uniqueness
        while (true) {
          const existing = await tx.organization.findUnique({ where: { slug } });
          if (!existing) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Create or update organization
        const organization = await tx.organization.upsert({
          where: { cui: data.company.cui.toUpperCase() },
          create: {
            name: data.company.name,
            slug,
            cui: data.company.cui.toUpperCase(),
            regCom: data.company.regCom || null,
            address: data.company.address || null,
            city: data.company.city || null,
            county: data.company.county || null,
            postalCode: data.company.postalCode || null,
            phone: data.company.phone || null,
            email: data.company.email || null,
            bankName: data.bank.bankName || null,
            bankAccount: data.bank.bankAccount || null,
            defaultVatRate: parseInt(data.tax.vatRate) || 21,
            defaultCurrency: data.bank.currency || 'RON',
          },
          update: {
            name: data.company.name,
            regCom: data.company.regCom || null,
            address: data.company.address || null,
            city: data.company.city || null,
            county: data.company.county || null,
            postalCode: data.company.postalCode || null,
            phone: data.company.phone || null,
            email: data.company.email || null,
            bankName: data.bank.bankName || null,
            bankAccount: data.bank.bankAccount || null,
            defaultVatRate: parseInt(data.tax.vatRate) || 21,
            defaultCurrency: data.bank.currency || 'RON',
          },
        });

        // Check if user is already a member of the organization
        const existingMembership = await tx.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId: organization.id,
            },
          },
        });

        if (!existingMembership) {
          // Create organization membership for the user as owner
          await tx.organizationMember.create({
            data: {
              userId,
              organizationId: organization.id,
              role: 'OWNER',
            },
          });
        }

        // Set as active organization for the user
        await tx.user.update({
          where: { id: userId },
          data: {
            activeOrganizationId: organization.id,
          },
        });

        return organization;
      });

      // Emit onboarding completed event
      this.eventEmitter.emit('onboarding.completed', {
        userId,
        organizationId: result.id,
        companyName: data.company.name,
        cui: data.company.cui,
        teamSize: data.team.length,
      });

      // Send welcome email (async)
      this.sendWelcomeEmail(userId, data.company.name);

      // Send team invitations (async)
      for (const member of data.team) {
        this.sendTeamInvitation(member.email, member.name, data.company.name);
      }

      this.logger.log(`Onboarding completed for organization ${result.id}`);

      return {
        success: true,
        organizationId: result.id,
      };
    } catch (error) {
      this.logger.error(`Onboarding failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get onboarding status for a user
   */
  async getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        completed: false,
        currentStep: 1,
        completedSteps: [],
        lastUpdated: new Date(),
      };
    }

    const completedSteps: string[] = [];
    let currentStep = 1;

    // Check if user has an active organization
    if (user.activeOrganizationId) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: user.activeOrganizationId },
      });

      if (organization) {
        // Check company details
        if (organization.name && organization.cui) {
          completedSteps.push('company');
          currentStep = 2;
        }

        // Check tax configuration (defaultVatRate is set)
        if (organization.defaultVatRate !== null) {
          completedSteps.push('tax');
          currentStep = 3;
        }

        // Check bank details
        if (organization.bankAccount) {
          completedSteps.push('bank');
          currentStep = 4;
        }

        // Check if there are other members (team invites)
        const memberCount = await this.prisma.organizationMember.count({
          where: { organizationId: organization.id },
        });
        if (memberCount > 1) {
          completedSteps.push('team');
          currentStep = 5;
        }

        // If all steps completed, mark as complete
        if (completedSteps.length >= 3) {
          completedSteps.push('complete');
        }
      }
    }

    const isCompleted = completedSteps.includes('complete');

    return {
      completed: isCompleted,
      currentStep: isCompleted ? 5 : currentStep,
      completedSteps,
      lastUpdated: user.updatedAt,
    };
  }

  /**
   * Save partial onboarding progress
   * Stores in user's notificationPreferences as a JSON field
   */
  async saveProgress(
    userId: string,
    step: string,
    data: Partial<OnboardingData>,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Saving onboarding progress for user ${userId}, step: ${step}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Store progress in notificationPreferences JSON field
    const currentPrefs = typeof user.notificationPreferences === 'string'
      ? JSON.parse(user.notificationPreferences)
      : (user.notificationPreferences as object) || {};

    const updatedPrefs = {
      ...currentPrefs,
      onboardingProgress: {
        currentStep: step,
        data,
        updatedAt: new Date().toISOString(),
      },
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: JSON.stringify(updatedPrefs),
      },
    });

    return { success: true };
  }

  /**
   * Get saved onboarding progress
   */
  async getProgress(userId: string): Promise<{ step: string; data: Partial<OnboardingData> } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    try {
      const prefs = typeof user.notificationPreferences === 'string'
        ? JSON.parse(user.notificationPreferences)
        : (user.notificationPreferences as Record<string, unknown>) || {};

      if (prefs.onboardingProgress) {
        return {
          step: prefs.onboardingProgress.currentStep,
          data: prefs.onboardingProgress.data,
        };
      }
    } catch {
      // Ignore JSON parse errors
    }

    return null;
  }

  /**
   * Skip onboarding for a user
   */
  async skipOnboarding(userId: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Store skip status in notificationPreferences
    const currentPrefs = typeof user.notificationPreferences === 'string'
      ? JSON.parse(user.notificationPreferences)
      : (user.notificationPreferences as object) || {};

    const updatedPrefs = {
      ...currentPrefs,
      onboardingSkipped: true,
      onboardingSkippedAt: new Date().toISOString(),
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: JSON.stringify(updatedPrefs),
      },
    });

    return { success: true };
  }

  /**
   * Validate Romanian IBAN
   */
  private validateIBAN(iban: string): boolean {
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();

    // Romanian IBAN: RO + 2 check digits + 4 bank code + 16 account
    if (!/^RO[0-9]{2}[A-Z]{4}[A-Z0-9]{16}$/.test(cleanIban)) {
      return false;
    }

    // IBAN checksum validation
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, (char) =>
      (char.charCodeAt(0) - 55).toString(),
    );

    let remainder = '';
    for (const char of numeric) {
      remainder = (parseInt(remainder + char, 10) % 97).toString();
    }

    return parseInt(remainder, 10) === 1;
  }

  /**
   * Send welcome email (async, non-blocking)
   */
  private async sendWelcomeEmail(userId: string, companyName: string): Promise<void> {
    try {
      this.eventEmitter.emit('email.send', {
        type: 'welcome',
        userId,
        data: { companyName },
      });
    } catch (error) {
      this.logger.warn(`Failed to send welcome email: ${error.message}`);
    }
  }

  /**
   * Send team invitation email (async, non-blocking)
   */
  private async sendTeamInvitation(
    email: string,
    name: string,
    companyName: string,
  ): Promise<void> {
    try {
      this.eventEmitter.emit('email.send', {
        type: 'team_invitation',
        email,
        data: { name, companyName },
      });
    } catch (error) {
      this.logger.warn(`Failed to send team invitation: ${error.message}`);
    }
  }
}
