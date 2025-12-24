import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Stripe Connect Service for Multi-Tenant Platform
 * Enables marketplace/platform model where:
 * - Platform (DocumentIulia) collects fees
 * - Tenants/Organizations have connected accounts
 * - Split payments between platform and tenants
 */

export type ConnectedAccountStatus = 'pending' | 'active' | 'restricted' | 'disabled';
export type PayoutSchedule = 'instant' | 'daily' | 'weekly' | 'monthly' | 'manual';

export interface ConnectedAccount {
  id: string;
  organizationId: string;
  stripeAccountId: string;
  status: ConnectedAccountStatus;
  businessType: 'individual' | 'company';
  businessName?: string;
  country: string;
  currency: string;
  email: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
  payoutSchedule: PayoutSchedule;
  platformFeePercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConnectedAccountDto {
  organizationId: string;
  email: string;
  country?: string;
  businessType?: 'individual' | 'company';
  businessName?: string;
}

export interface TransferDto {
  amount: number;
  currency: string;
  destinationAccountId: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PlatformFeeConfig {
  basePercent: number;
  minFee: number;
  maxFee?: number;
  tierOverrides: Record<string, number>; // tier -> fee percent
}

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  // In-memory storage (use database in production)
  private connectedAccounts: Map<string, ConnectedAccount> = new Map();
  private accountsByOrg: Map<string, string> = new Map(); // orgId -> accountId

  // Platform fee configuration
  private platformFeeConfig: PlatformFeeConfig = {
    basePercent: 5,
    minFee: 100, // 1 RON minimum
    tierOverrides: {
      'gratuit': 10,
      'pro': 5,
      'business': 3,
      'enterprise': 2,
    },
  };

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.log('Stripe Connect service initialized');
  }

  /**
   * Create a Stripe Connect account for an organization
   */
  async createConnectedAccount(dto: CreateConnectedAccountDto): Promise<ConnectedAccount> {
    // Check if organization already has a connected account
    const existingAccountId = this.accountsByOrg.get(dto.organizationId);
    if (existingAccountId) {
      const existing = this.connectedAccounts.get(existingAccountId);
      if (existing) {
        return existing;
      }
    }

    const id = `acct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stripeAccountId = `acct_stripe_${Math.random().toString(36).substr(2, 16)}`;

    const account: ConnectedAccount = {
      id,
      organizationId: dto.organizationId,
      stripeAccountId,
      status: 'pending',
      businessType: dto.businessType || 'company',
      businessName: dto.businessName,
      country: dto.country || 'RO',
      currency: dto.country === 'RO' ? 'RON' : 'EUR',
      email: dto.email,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirements: {
        currentlyDue: ['business_profile', 'external_account', 'tos_acceptance'],
        eventuallyDue: ['representative_document', 'company_verification'],
        pastDue: [],
      },
      payoutSchedule: 'weekly',
      platformFeePercent: this.platformFeeConfig.basePercent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.connectedAccounts.set(id, account);
    this.accountsByOrg.set(dto.organizationId, id);

    this.logger.log(`Connected account ${id} created for organization ${dto.organizationId}`);

    return account;
  }

  /**
   * Get account onboarding link
   */
  async getOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const account = this.connectedAccounts.get(accountId);
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    // In production, this would call Stripe API to create an account link
    const onboardingUrl = `https://connect.stripe.com/setup/${account.stripeAccountId}?return_url=${encodeURIComponent(returnUrl)}&refresh_url=${encodeURIComponent(refreshUrl)}`;

    return onboardingUrl;
  }

  /**
   * Get connected account by ID
   */
  getConnectedAccount(accountId: string): ConnectedAccount | null {
    return this.connectedAccounts.get(accountId) || null;
  }

  /**
   * Get connected account by organization ID
   */
  getAccountByOrganization(organizationId: string): ConnectedAccount | null {
    const accountId = this.accountsByOrg.get(organizationId);
    if (!accountId) return null;
    return this.connectedAccounts.get(accountId) || null;
  }

  /**
   * Update account status after webhook or verification
   */
  async updateAccountStatus(
    accountId: string,
    status: Partial<Pick<ConnectedAccount, 'status' | 'chargesEnabled' | 'payoutsEnabled' | 'detailsSubmitted' | 'requirements'>>,
  ): Promise<ConnectedAccount> {
    const account = this.connectedAccounts.get(accountId);
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    Object.assign(account, status, { updatedAt: new Date() });
    this.connectedAccounts.set(accountId, account);

    this.logger.log(`Connected account ${accountId} updated: status=${account.status}`);

    return account;
  }

  /**
   * Complete account setup (simulate successful onboarding)
   */
  async completeAccountSetup(accountId: string): Promise<ConnectedAccount> {
    return this.updateAccountStatus(accountId, {
      status: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      requirements: {
        currentlyDue: [],
        eventuallyDue: [],
        pastDue: [],
      },
    });
  }

  /**
   * Create a destination charge (platform charges, splits with connected account)
   */
  async createDestinationCharge(
    amount: number,
    currency: string,
    destinationAccountId: string,
    applicationFeeAmount?: number,
    metadata?: Record<string, string>,
  ): Promise<{
    chargeId: string;
    amount: number;
    currency: string;
    applicationFee: number;
    transferAmount: number;
    destinationAccountId: string;
  }> {
    const account = this.connectedAccounts.get(destinationAccountId);
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    if (!account.chargesEnabled) {
      throw new BadRequestException('Connected account cannot accept charges');
    }

    // Calculate platform fee
    const fee = applicationFeeAmount ?? Math.max(
      this.platformFeeConfig.minFee,
      Math.round(amount * account.platformFeePercent / 100),
    );

    const chargeId = `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transferAmount = amount - fee;

    this.logger.log(`Destination charge ${chargeId}: ${amount} ${currency}, fee: ${fee}, transfer: ${transferAmount}`);

    return {
      chargeId,
      amount,
      currency: currency.toUpperCase(),
      applicationFee: fee,
      transferAmount,
      destinationAccountId,
    };
  }

  /**
   * Create a direct transfer to connected account
   */
  async createTransfer(dto: TransferDto): Promise<{
    transferId: string;
    amount: number;
    currency: string;
    destinationAccountId: string;
    status: string;
  }> {
    const account = this.connectedAccounts.get(dto.destinationAccountId);
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    const transferId = `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`Transfer ${transferId}: ${dto.amount} ${dto.currency} to ${dto.destinationAccountId}`);

    return {
      transferId,
      amount: dto.amount,
      currency: dto.currency.toUpperCase(),
      destinationAccountId: dto.destinationAccountId,
      status: 'pending',
    };
  }

  /**
   * Create a payout to connected account's bank
   */
  async createPayout(
    accountId: string,
    amount: number,
    currency: string,
  ): Promise<{
    payoutId: string;
    amount: number;
    currency: string;
    status: string;
    arrivalDate: Date;
  }> {
    const account = this.connectedAccounts.get(accountId);
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    if (!account.payoutsEnabled) {
      throw new BadRequestException('Payouts not enabled for this account');
    }

    const payoutId = `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 2); // T+2 for bank transfers

    this.logger.log(`Payout ${payoutId}: ${amount} ${currency} to ${accountId}`);

    return {
      payoutId,
      amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      arrivalDate,
    };
  }

  /**
   * Set custom platform fee for an account
   */
  async setPlatformFee(accountId: string, feePercent: number): Promise<ConnectedAccount> {
    const account = this.connectedAccounts.get(accountId);
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    if (feePercent < 0 || feePercent > 50) {
      throw new BadRequestException('Fee percent must be between 0 and 50');
    }

    account.platformFeePercent = feePercent;
    account.updatedAt = new Date();
    this.connectedAccounts.set(accountId, account);

    this.logger.log(`Platform fee for ${accountId} set to ${feePercent}%`);

    return account;
  }

  /**
   * Update payout schedule for an account
   */
  async setPayoutSchedule(accountId: string, schedule: PayoutSchedule): Promise<ConnectedAccount> {
    const account = this.connectedAccounts.get(accountId);
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    account.payoutSchedule = schedule;
    account.updatedAt = new Date();
    this.connectedAccounts.set(accountId, account);

    this.logger.log(`Payout schedule for ${accountId} set to ${schedule}`);

    return account;
  }

  /**
   * List all connected accounts
   */
  listConnectedAccounts(status?: ConnectedAccountStatus): ConnectedAccount[] {
    let accounts = Array.from(this.connectedAccounts.values());
    if (status) {
      accounts = accounts.filter(a => a.status === status);
    }
    return accounts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get platform revenue metrics
   */
  getPlatformMetrics(): {
    totalAccounts: number;
    activeAccounts: number;
    pendingAccounts: number;
    totalPlatformFees: number;
    averageFeePercent: number;
    accountsByCountry: Record<string, number>;
  } {
    const accounts = Array.from(this.connectedAccounts.values());
    const activeAccounts = accounts.filter(a => a.status === 'active');

    const accountsByCountry: Record<string, number> = {};
    for (const account of accounts) {
      accountsByCountry[account.country] = (accountsByCountry[account.country] || 0) + 1;
    }

    return {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      pendingAccounts: accounts.filter(a => a.status === 'pending').length,
      totalPlatformFees: 0, // Would calculate from actual transactions
      averageFeePercent: activeAccounts.length > 0
        ? activeAccounts.reduce((sum, a) => sum + a.platformFeePercent, 0) / activeAccounts.length
        : this.platformFeeConfig.basePercent,
      accountsByCountry,
    };
  }

  /**
   * Process Stripe Connect webhook
   */
  async processWebhook(eventType: string, data: Record<string, any>): Promise<void> {
    this.logger.log(`Processing Connect webhook: ${eventType}`);

    switch (eventType) {
      case 'account.updated':
        await this.handleAccountUpdated(data);
        break;
      case 'account.application.deauthorized':
        await this.handleAccountDeauthorized(data);
        break;
      case 'payout.paid':
        this.logger.log(`Payout completed: ${data.id}`);
        break;
      case 'payout.failed':
        this.logger.warn(`Payout failed: ${data.id} - ${data.failure_message}`);
        break;
      default:
        this.logger.debug(`Unhandled Connect webhook: ${eventType}`);
    }
  }

  private async handleAccountUpdated(data: Record<string, any>): Promise<void> {
    const stripeAccountId = data.id;

    // Find account by Stripe account ID
    for (const account of this.connectedAccounts.values()) {
      if (account.stripeAccountId === stripeAccountId) {
        await this.updateAccountStatus(account.id, {
          chargesEnabled: data.charges_enabled ?? account.chargesEnabled,
          payoutsEnabled: data.payouts_enabled ?? account.payoutsEnabled,
          detailsSubmitted: data.details_submitted ?? account.detailsSubmitted,
          status: data.charges_enabled && data.payouts_enabled ? 'active' : account.status,
        });
        break;
      }
    }
  }

  private async handleAccountDeauthorized(data: Record<string, any>): Promise<void> {
    const stripeAccountId = data.id;

    for (const account of this.connectedAccounts.values()) {
      if (account.stripeAccountId === stripeAccountId) {
        await this.updateAccountStatus(account.id, {
          status: 'disabled',
          chargesEnabled: false,
          payoutsEnabled: false,
        });
        this.logger.warn(`Account ${account.id} deauthorized`);
        break;
      }
    }
  }
}
