import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type ResellerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'enterprise';
export type ResellerStatus = 'pending' | 'active' | 'suspended' | 'terminated';
export type CommissionType = 'percentage' | 'fixed' | 'tiered';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ResellerAccount {
  id: string;
  userId: string;
  companyName: string;
  companyLogo?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  country: string;
  taxId?: string;
  tier: ResellerTier;
  status: ResellerStatus;
  commissionRate: number;
  commissionType: CommissionType;
  customBranding: boolean;
  whitelabelDomain?: string;
  apiKey?: string;
  createdAt: Date;
  activatedAt?: Date;
  totalRevenue: number;
  totalCommission: number;
  activeClients: number;
  lifetimeClients: number;
}

export interface ResellerClient {
  id: string;
  resellerId: string;
  tenantId: string;
  companyName: string;
  contactEmail: string;
  subscriptionPlan: string;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled';
  monthlyRevenue: number;
  lifetimeRevenue: number;
  signupDate: Date;
  lastActivityDate: Date;
  commissionEarned: number;
}

export interface CommissionTransaction {
  id: string;
  resellerId: string;
  clientId: string;
  clientName: string;
  transactionType: 'subscription' | 'addon' | 'one_time' | 'recurring';
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
  periodStart?: Date;
  periodEnd?: Date;
  status: 'pending' | 'confirmed' | 'paid';
  createdAt: Date;
}

export interface Payout {
  id: string;
  resellerId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  paymentMethod: 'bank_transfer' | 'paypal' | 'stripe';
  paymentDetails: Record<string, any>;
  transactionIds: string[];
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  reference?: string;
  notes?: string;
}

export interface ResellerDashboardStats {
  overview: {
    totalRevenue: number;
    totalCommission: number;
    pendingCommission: number;
    activeClients: number;
    newClientsThisMonth: number;
    churnedClientsThisMonth: number;
    averageRevenuePerClient: number;
  };
  performance: {
    revenueGrowth: number;
    clientGrowth: number;
    retentionRate: number;
    conversionRate: number;
  };
  tier: {
    current: ResellerTier;
    progress: number;
    nextTier: ResellerTier | null;
    requiredForNextTier: number;
  };
}

export interface ResellerLeadForm {
  id: string;
  resellerId: string;
  name: string;
  fields: ResellerLeadFormField[];
  redirectUrl?: string;
  successMessage: string;
  isActive: boolean;
  createdAt: Date;
  submissions: number;
  conversions: number;
}

export interface ResellerLeadFormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface ResellerLead {
  id: string;
  resellerId: string;
  formId: string;
  data: Record<string, any>;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source: string;
  ipAddress?: string;
  submittedAt: Date;
  convertedAt?: Date;
  clientId?: string;
  notes?: string;
}

// =================== SERVICE ===================

@Injectable()
export class ResellerDashboardService {
  private resellers = new Map<string, ResellerAccount>();
  private clients = new Map<string, ResellerClient>();
  private commissions = new Map<string, CommissionTransaction>();
  private payouts = new Map<string, Payout>();
  private leadForms = new Map<string, ResellerLeadForm>();
  private leads = new Map<string, ResellerLead>();

  // Tier thresholds (monthly revenue required)
  private tierThresholds: Record<ResellerTier, number> = {
    bronze: 0,
    silver: 5000,
    gold: 15000,
    platinum: 50000,
    enterprise: 150000,
  };

  // Commission rates by tier
  private tierCommissionRates: Record<ResellerTier, number> = {
    bronze: 10,
    silver: 15,
    gold: 20,
    platinum: 25,
    enterprise: 30,
  };

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDemoData();
  }

  private initializeDemoData(): void {
    // Demo reseller
    const reseller: ResellerAccount = {
      id: 'reseller-demo-1',
      userId: 'user-demo-1',
      companyName: 'Tech Partners SRL',
      contactName: 'Alexandru Ionescu',
      contactEmail: 'alex@techpartners.ro',
      contactPhone: '+40722123456',
      address: 'Str. Victoriei 100, Sector 1',
      country: 'RO',
      taxId: 'RO12345678',
      tier: 'gold',
      status: 'active',
      commissionRate: 20,
      commissionType: 'percentage',
      customBranding: true,
      whitelabelDomain: 'erp.techpartners.ro',
      apiKey: 'rsk_demo_xxxxxxxxxxxxxxxx',
      createdAt: new Date('2024-01-15'),
      activatedAt: new Date('2024-01-20'),
      totalRevenue: 125000,
      totalCommission: 25000,
      activeClients: 15,
      lifetimeClients: 22,
    };
    this.resellers.set(reseller.id, reseller);
  }

  // =================== RESELLER ACCOUNT ===================

  async registerReseller(params: {
    userId: string;
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    address?: string;
    country: string;
    taxId?: string;
  }): Promise<ResellerAccount> {
    const id = `reseller-${Date.now()}`;
    const reseller: ResellerAccount = {
      id,
      userId: params.userId,
      companyName: params.companyName,
      contactName: params.contactName,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      address: params.address,
      country: params.country,
      taxId: params.taxId,
      tier: 'bronze',
      status: 'pending',
      commissionRate: this.tierCommissionRates.bronze,
      commissionType: 'percentage',
      customBranding: false,
      createdAt: new Date(),
      totalRevenue: 0,
      totalCommission: 0,
      activeClients: 0,
      lifetimeClients: 0,
    };

    this.resellers.set(id, reseller);

    this.eventEmitter.emit('reseller.registered', { reseller });

    return reseller;
  }

  async getResellerByUserId(userId: string): Promise<ResellerAccount | null> {
    for (const reseller of this.resellers.values()) {
      if (reseller.userId === userId) {
        return reseller;
      }
    }
    return null;
  }

  async getReseller(resellerId: string): Promise<ResellerAccount> {
    const reseller = this.resellers.get(resellerId);
    if (!reseller) {
      throw new NotFoundException('Reseller not found');
    }
    return reseller;
  }

  async updateReseller(
    resellerId: string,
    updates: Partial<ResellerAccount>,
  ): Promise<ResellerAccount> {
    const reseller = await this.getReseller(resellerId);
    const updated = { ...reseller, ...updates };
    this.resellers.set(resellerId, updated);
    return updated;
  }

  async activateReseller(resellerId: string): Promise<ResellerAccount> {
    const reseller = await this.getReseller(resellerId);
    const apiKey = `rsk_${this.generateApiKey()}`;

    const updated = {
      ...reseller,
      status: 'active' as ResellerStatus,
      activatedAt: new Date(),
      apiKey,
    };

    this.resellers.set(resellerId, updated);
    this.eventEmitter.emit('reseller.activated', { reseller: updated });

    return updated;
  }

  async regenerateApiKey(resellerId: string): Promise<string> {
    const reseller = await this.getReseller(resellerId);
    const newApiKey = `rsk_${this.generateApiKey()}`;

    const updated = { ...reseller, apiKey: newApiKey };
    this.resellers.set(resellerId, updated);

    return newApiKey;
  }

  private generateApiKey(): string {
    return Array.from({ length: 32 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
  }

  // =================== DASHBOARD STATS ===================

  async getDashboardStats(resellerId: string): Promise<ResellerDashboardStats> {
    const reseller = await this.getReseller(resellerId);
    const clients = await this.getResellerClients(resellerId);
    const commissions = await this.getCommissions(resellerId);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const newClientsThisMonth = clients.filter(
      c => new Date(c.signupDate) >= thisMonth
    ).length;

    const churnedClientsThisMonth = clients.filter(
      c => c.subscriptionStatus === 'canceled' &&
           new Date(c.lastActivityDate) >= thisMonth
    ).length;

    const pendingCommission = commissions
      .filter(c => c.status === 'pending' || c.status === 'confirmed')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const activeClients = clients.filter(
      c => c.subscriptionStatus === 'active' || c.subscriptionStatus === 'trial'
    ).length;

    const totalActiveRevenue = clients
      .filter(c => c.subscriptionStatus === 'active')
      .reduce((sum, c) => sum + c.monthlyRevenue, 0);

    // Calculate tier progress
    const currentTierIndex = Object.keys(this.tierThresholds).indexOf(reseller.tier);
    const tiers = Object.keys(this.tierThresholds) as ResellerTier[];
    const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
    const currentThreshold = this.tierThresholds[reseller.tier];
    const nextThreshold = nextTier ? this.tierThresholds[nextTier] : currentThreshold;
    const progress = nextTier
      ? Math.min(100, ((totalActiveRevenue - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
      : 100;

    return {
      overview: {
        totalRevenue: reseller.totalRevenue,
        totalCommission: reseller.totalCommission,
        pendingCommission,
        activeClients,
        newClientsThisMonth,
        churnedClientsThisMonth,
        averageRevenuePerClient: activeClients > 0
          ? Math.round(totalActiveRevenue / activeClients)
          : 0,
      },
      performance: {
        revenueGrowth: 12.5, // Would calculate from historical data
        clientGrowth: 8.3,
        retentionRate: 94.5,
        conversionRate: 32.0,
      },
      tier: {
        current: reseller.tier,
        progress: Math.round(progress),
        nextTier,
        requiredForNextTier: nextTier ? nextThreshold - totalActiveRevenue : 0,
      },
    };
  }

  async getRevenueChart(
    resellerId: string,
    period: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<Array<{ date: string; revenue: number; commission: number }>> {
    await this.getReseller(resellerId);

    // Generate demo chart data
    const dataPoints = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 12 : 12;
    const data: Array<{ date: string; revenue: number; commission: number }> = [];

    const now = new Date();
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date(now);
      if (period === 'week' || period === 'month') {
        date.setDate(date.getDate() - i);
      } else {
        date.setMonth(date.getMonth() - i);
      }

      const baseRevenue = 3000 + Math.random() * 2000;
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round(baseRevenue),
        commission: Math.round(baseRevenue * 0.2),
      });
    }

    return data;
  }

  // =================== CLIENT MANAGEMENT ===================

  async getResellerClients(resellerId: string): Promise<ResellerClient[]> {
    await this.getReseller(resellerId);
    return Array.from(this.clients.values()).filter(c => c.resellerId === resellerId);
  }

  async addClient(
    resellerId: string,
    params: {
      tenantId: string;
      companyName: string;
      contactEmail: string;
      subscriptionPlan: string;
    },
  ): Promise<ResellerClient> {
    const reseller = await this.getReseller(resellerId);

    const id = `client-${Date.now()}`;
    const client: ResellerClient = {
      id,
      resellerId,
      tenantId: params.tenantId,
      companyName: params.companyName,
      contactEmail: params.contactEmail,
      subscriptionPlan: params.subscriptionPlan,
      subscriptionStatus: 'trial',
      monthlyRevenue: 0,
      lifetimeRevenue: 0,
      signupDate: new Date(),
      lastActivityDate: new Date(),
      commissionEarned: 0,
    };

    this.clients.set(id, client);

    // Update reseller stats
    const updated = {
      ...reseller,
      activeClients: reseller.activeClients + 1,
      lifetimeClients: reseller.lifetimeClients + 1,
    };
    this.resellers.set(resellerId, updated);

    this.eventEmitter.emit('reseller.client_added', { reseller: updated, client });

    return client;
  }

  async getClientDetails(
    resellerId: string,
    clientId: string,
  ): Promise<ResellerClient & { commissionHistory: CommissionTransaction[] }> {
    await this.getReseller(resellerId);

    const client = this.clients.get(clientId);
    if (!client || client.resellerId !== resellerId) {
      throw new NotFoundException('Client not found');
    }

    const commissionHistory = Array.from(this.commissions.values())
      .filter(c => c.clientId === clientId);

    return { ...client, commissionHistory };
  }

  // =================== COMMISSIONS ===================

  async getCommissions(
    resellerId: string,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<CommissionTransaction[]> {
    await this.getReseller(resellerId);

    let commissions = Array.from(this.commissions.values())
      .filter(c => c.resellerId === resellerId);

    if (filters?.status) {
      commissions = commissions.filter(c => c.status === filters.status);
    }
    if (filters?.startDate) {
      commissions = commissions.filter(c => c.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      commissions = commissions.filter(c => c.createdAt <= filters.endDate!);
    }

    return commissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async recordCommission(
    resellerId: string,
    params: {
      clientId: string;
      clientName: string;
      transactionType: CommissionTransaction['transactionType'];
      grossAmount: number;
      currency: string;
      periodStart?: Date;
      periodEnd?: Date;
    },
  ): Promise<CommissionTransaction> {
    const reseller = await this.getReseller(resellerId);

    const commissionAmount = params.grossAmount * (reseller.commissionRate / 100);

    const id = `commission-${Date.now()}`;
    const commission: CommissionTransaction = {
      id,
      resellerId,
      clientId: params.clientId,
      clientName: params.clientName,
      transactionType: params.transactionType,
      grossAmount: params.grossAmount,
      commissionRate: reseller.commissionRate,
      commissionAmount,
      currency: params.currency,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      status: 'pending',
      createdAt: new Date(),
    };

    this.commissions.set(id, commission);

    this.eventEmitter.emit('reseller.commission_recorded', { commission });

    return commission;
  }

  async getCommissionSummary(resellerId: string): Promise<{
    pending: number;
    confirmed: number;
    paid: number;
    total: number;
    currency: string;
  }> {
    const commissions = await this.getCommissions(resellerId);

    return {
      pending: commissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.commissionAmount, 0),
      confirmed: commissions
        .filter(c => c.status === 'confirmed')
        .reduce((sum, c) => sum + c.commissionAmount, 0),
      paid: commissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.commissionAmount, 0),
      total: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      currency: 'EUR',
    };
  }

  // =================== PAYOUTS ===================

  async getPayouts(resellerId: string): Promise<Payout[]> {
    await this.getReseller(resellerId);
    return Array.from(this.payouts.values())
      .filter(p => p.resellerId === resellerId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  async requestPayout(
    resellerId: string,
    params: {
      amount: number;
      currency: string;
      paymentMethod: Payout['paymentMethod'];
      paymentDetails: Record<string, any>;
    },
  ): Promise<Payout> {
    const reseller = await this.getReseller(resellerId);
    const commissionSummary = await this.getCommissionSummary(resellerId);

    const availableBalance = commissionSummary.confirmed;
    if (params.amount > availableBalance) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${availableBalance} ${params.currency}`,
      );
    }

    // Get confirmed commission IDs
    const confirmedCommissions = await this.getCommissions(resellerId, { status: 'confirmed' });
    let remainingAmount = params.amount;
    const transactionIds: string[] = [];

    for (const commission of confirmedCommissions) {
      if (remainingAmount <= 0) break;
      transactionIds.push(commission.id);
      remainingAmount -= commission.commissionAmount;
    }

    const id = `payout-${Date.now()}`;
    const payout: Payout = {
      id,
      resellerId,
      amount: params.amount,
      currency: params.currency,
      status: 'pending',
      paymentMethod: params.paymentMethod,
      paymentDetails: params.paymentDetails,
      transactionIds,
      requestedAt: new Date(),
    };

    this.payouts.set(id, payout);

    this.eventEmitter.emit('reseller.payout_requested', { payout, reseller });

    return payout;
  }

  async getPayoutDetails(resellerId: string, payoutId: string): Promise<Payout> {
    await this.getReseller(resellerId);

    const payout = this.payouts.get(payoutId);
    if (!payout || payout.resellerId !== resellerId) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }

  // =================== LEAD GENERATION ===================

  async createLeadForm(
    resellerId: string,
    params: {
      name: string;
      fields: ResellerLeadFormField[];
      redirectUrl?: string;
      successMessage?: string;
    },
  ): Promise<ResellerLeadForm> {
    await this.getReseller(resellerId);

    const id = `form-${Date.now()}`;
    const form: ResellerLeadForm = {
      id,
      resellerId,
      name: params.name,
      fields: params.fields,
      redirectUrl: params.redirectUrl,
      successMessage: params.successMessage || 'Thank you for your interest!',
      isActive: true,
      createdAt: new Date(),
      submissions: 0,
      conversions: 0,
    };

    this.leadForms.set(id, form);

    return form;
  }

  async getLeadForms(resellerId: string): Promise<ResellerLeadForm[]> {
    await this.getReseller(resellerId);
    return Array.from(this.leadForms.values()).filter(f => f.resellerId === resellerId);
  }

  async getLeadForm(formId: string): Promise<ResellerLeadForm> {
    const form = this.leadForms.get(formId);
    if (!form) {
      throw new NotFoundException('Lead form not found');
    }
    return form;
  }

  async submitLead(
    formId: string,
    data: Record<string, any>,
    metadata: { source: string; ipAddress?: string },
  ): Promise<ResellerLead> {
    const form = await this.getLeadForm(formId);

    const id = `lead-${Date.now()}`;
    const lead: ResellerLead = {
      id,
      resellerId: form.resellerId,
      formId,
      data,
      status: 'new',
      source: metadata.source,
      ipAddress: metadata.ipAddress,
      submittedAt: new Date(),
    };

    this.leads.set(id, lead);

    // Update form stats
    const updatedForm = { ...form, submissions: form.submissions + 1 };
    this.leadForms.set(formId, updatedForm);

    this.eventEmitter.emit('reseller.lead_submitted', { lead, form });

    return lead;
  }

  async getLeads(
    resellerId: string,
    filters?: { status?: string; formId?: string },
  ): Promise<ResellerLead[]> {
    await this.getReseller(resellerId);

    let leads = Array.from(this.leads.values())
      .filter(l => l.resellerId === resellerId);

    if (filters?.status) {
      leads = leads.filter(l => l.status === filters.status);
    }
    if (filters?.formId) {
      leads = leads.filter(l => l.formId === filters.formId);
    }

    return leads.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async updateLeadStatus(
    resellerId: string,
    leadId: string,
    status: ResellerLead['status'],
    notes?: string,
  ): Promise<ResellerLead> {
    await this.getReseller(resellerId);

    const lead = this.leads.get(leadId);
    if (!lead || lead.resellerId !== resellerId) {
      throw new NotFoundException('Lead not found');
    }

    const updated: ResellerLead = {
      ...lead,
      status,
      notes: notes || lead.notes,
      convertedAt: status === 'converted' ? new Date() : lead.convertedAt,
    };

    this.leads.set(leadId, updated);

    // Update form conversion stats
    if (status === 'converted') {
      const form = this.leadForms.get(lead.formId);
      if (form) {
        const updatedForm = { ...form, conversions: form.conversions + 1 };
        this.leadForms.set(lead.formId, updatedForm);
      }
    }

    return updated;
  }

  // =================== WHITE-LABEL BRANDING ===================

  async getBrandingSettings(resellerId: string): Promise<{
    customBranding: boolean;
    whitelabelDomain?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName: string;
    supportEmail?: string;
    termsUrl?: string;
    privacyUrl?: string;
  }> {
    const reseller = await this.getReseller(resellerId);

    return {
      customBranding: reseller.customBranding,
      whitelabelDomain: reseller.whitelabelDomain,
      logoUrl: reseller.companyLogo,
      primaryColor: '#0066CC',
      secondaryColor: '#003366',
      companyName: reseller.companyName,
      supportEmail: reseller.contactEmail,
    };
  }

  async updateBrandingSettings(
    resellerId: string,
    settings: {
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      supportEmail?: string;
      termsUrl?: string;
      privacyUrl?: string;
    },
  ): Promise<void> {
    const reseller = await this.getReseller(resellerId);

    if (!reseller.customBranding) {
      throw new BadRequestException(
        'Custom branding is not enabled for your tier. Upgrade to Gold or higher.',
      );
    }

    // Store branding settings (would be in database)
    this.eventEmitter.emit('reseller.branding_updated', { resellerId, settings });
  }

  // =================== TIER MANAGEMENT ===================

  async checkTierUpgrade(resellerId: string): Promise<{
    eligible: boolean;
    currentTier: ResellerTier;
    suggestedTier: ResellerTier;
    benefits: string[];
  }> {
    const reseller = await this.getReseller(resellerId);
    const clients = await this.getResellerClients(resellerId);

    const monthlyRevenue = clients
      .filter(c => c.subscriptionStatus === 'active')
      .reduce((sum, c) => sum + c.monthlyRevenue, 0);

    let suggestedTier: ResellerTier = 'bronze';
    for (const [tier, threshold] of Object.entries(this.tierThresholds)) {
      if (monthlyRevenue >= threshold) {
        suggestedTier = tier as ResellerTier;
      }
    }

    const tierBenefits: Record<ResellerTier, string[]> = {
      bronze: ['10% commission', 'Basic support', 'Standard reports'],
      silver: ['15% commission', 'Priority support', 'Advanced reports', 'Co-marketing'],
      gold: ['20% commission', 'Dedicated support', 'Custom branding', 'API access', 'Lead forms'],
      platinum: ['25% commission', 'Account manager', 'White-label domain', 'Priority payouts'],
      enterprise: ['30% commission', 'Custom terms', 'SLA guarantees', 'Dedicated infrastructure'],
    };

    return {
      eligible: suggestedTier !== reseller.tier &&
                Object.keys(this.tierThresholds).indexOf(suggestedTier) >
                Object.keys(this.tierThresholds).indexOf(reseller.tier),
      currentTier: reseller.tier,
      suggestedTier,
      benefits: tierBenefits[suggestedTier],
    };
  }

  async requestTierUpgrade(resellerId: string): Promise<void> {
    const upgrade = await this.checkTierUpgrade(resellerId);

    if (!upgrade.eligible) {
      throw new BadRequestException('Not eligible for tier upgrade');
    }

    this.eventEmitter.emit('reseller.tier_upgrade_requested', {
      resellerId,
      currentTier: upgrade.currentTier,
      requestedTier: upgrade.suggestedTier,
    });
  }

  // =================== ANALYTICS & REPORTS ===================

  async getPerformanceReport(
    resellerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    period: { start: Date; end: Date };
    revenue: { total: number; byMonth: Array<{ month: string; amount: number }> };
    clients: { new: number; churned: number; active: number };
    commissions: { earned: number; pending: number; paid: number };
    topClients: Array<{ name: string; revenue: number; commission: number }>;
  }> {
    await this.getReseller(resellerId);
    const clients = await this.getResellerClients(resellerId);
    const commissions = await this.getCommissions(resellerId);

    const topClients = clients
      .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue)
      .slice(0, 5)
      .map(c => ({
        name: c.companyName,
        revenue: c.lifetimeRevenue,
        commission: c.commissionEarned,
      }));

    return {
      period: { start: startDate, end: endDate },
      revenue: {
        total: clients.reduce((sum, c) => sum + c.lifetimeRevenue, 0),
        byMonth: [], // Would aggregate by month
      },
      clients: {
        new: clients.filter(c => new Date(c.signupDate) >= startDate).length,
        churned: clients.filter(c => c.subscriptionStatus === 'canceled').length,
        active: clients.filter(c => c.subscriptionStatus === 'active').length,
      },
      commissions: {
        earned: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
        pending: commissions
          .filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
        paid: commissions
          .filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + c.commissionAmount, 0),
      },
      topClients,
    };
  }

  async exportReport(
    resellerId: string,
    type: 'clients' | 'commissions' | 'payouts',
    format: 'csv' | 'xlsx' | 'pdf',
  ): Promise<{ url: string; expiresAt: Date }> {
    await this.getReseller(resellerId);

    // Generate export (would create actual file)
    const url = `https://exports.documentiulia.ro/reseller/${resellerId}/${type}-${Date.now()}.${format}`;

    return {
      url,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }
}
