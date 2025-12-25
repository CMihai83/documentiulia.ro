import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PartnerType, Prisma } from '@prisma/client';

export interface CreatePartnerDto {
  name: string;
  cui?: string;
  regCom?: string;
  address?: string;
  city?: string;
  county?: string;
  country?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  bankName?: string;
  bankAccount?: string;
  type?: PartnerType;
}

export interface UpdatePartnerDto extends Partial<CreatePartnerDto> {
  isActive?: boolean;
}

export interface PartnerListQuery {
  type?: PartnerType;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePartnerDto) {
    // Check for duplicate CUI if provided
    if (dto.cui) {
      const existing = await this.prisma.partner.findFirst({
        where: { userId, cui: dto.cui },
      });
      if (existing) {
        throw new ConflictException(`Partner with CUI ${dto.cui} already exists`);
      }
    }

    return this.prisma.partner.create({
      data: {
        userId,
        name: dto.name,
        cui: dto.cui,
        regCom: dto.regCom,
        address: dto.address,
        city: dto.city,
        county: dto.county,
        country: dto.country || 'Romania',
        postalCode: dto.postalCode,
        email: dto.email,
        phone: dto.phone,
        contactPerson: dto.contactPerson,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        type: dto.type || PartnerType.CUSTOMER,
      },
    });
  }

  async findAll(userId: string, query: PartnerListQuery) {
    const { type, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PartnerWhereInput = { userId };

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cui: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [partners, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      data: partners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(userId: string, id: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, userId },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    return partner;
  }

  async findByCui(userId: string, cui: string) {
    return this.prisma.partner.findFirst({
      where: { userId, cui },
    });
  }

  async update(userId: string, id: string, dto: UpdatePartnerDto) {
    await this.findById(userId, id);

    // Check for duplicate CUI if changing
    if (dto.cui) {
      const existing = await this.prisma.partner.findFirst({
        where: { userId, cui: dto.cui, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Partner with CUI ${dto.cui} already exists`);
      }
    }

    return this.prisma.partner.update({
      where: { id },
      data: dto,
    });
  }

  async delete(userId: string, id: string) {
    await this.findById(userId, id);

    return this.prisma.partner.delete({
      where: { id },
    });
  }

  async toggleActive(userId: string, id: string) {
    const partner = await this.findById(userId, id);

    return this.prisma.partner.update({
      where: { id },
      data: { isActive: !partner.isActive },
    });
  }

  async getStats(userId: string) {
    const [total, customers, suppliers, active] = await Promise.all([
      this.prisma.partner.count({ where: { userId } }),
      this.prisma.partner.count({ where: { userId, type: PartnerType.CUSTOMER } }),
      this.prisma.partner.count({ where: { userId, type: PartnerType.SUPPLIER } }),
      this.prisma.partner.count({ where: { userId, isActive: true } }),
    ]);

    return {
      total,
      customers,
      suppliers,
      both: total - customers - suppliers,
      active,
      inactive: total - active,
    };
  }

  // Sync partner stats from invoices
  async syncPartnerStats(userId: string, partnerCui: string) {
    const partner = await this.findByCui(userId, partnerCui);
    if (!partner) return;

    const invoices = await this.prisma.invoice.findMany({
      where: { userId, partnerCui },
      select: { grossAmount: true },
    });

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.grossAmount),
      0,
    );

    await this.prisma.partner.update({
      where: { id: partner.id },
      data: {
        invoiceCount: invoices.length,
        totalRevenue,
      },
    });
  }

  // Get partner dashboard summary
  async getDashboardSummary(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get basic stats
    const stats = await this.getStats(userId);

    // Get top partners by revenue
    const topPartners = await this.prisma.partner.findMany({
      where: { userId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        cui: true,
        type: true,
        totalRevenue: true,
        invoiceCount: true,
      },
    });

    // Get recent partners
    const recentPartners = await this.prisma.partner.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        cui: true,
        type: true,
        createdAt: true,
      },
    });

    // Get partners with recent invoices
    const partnersWithRecentInvoices = await this.prisma.invoice.groupBy({
      by: ['partnerId'],
      where: {
        userId,
        invoiceDate: { gte: thirtyDaysAgo },
        partnerId: { not: null },
      },
      _count: { id: true },
      _sum: { grossAmount: true },
    });

    // Get previous period for comparison
    const [currentMonthNew, previousMonthNew] = await Promise.all([
      this.prisma.partner.count({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.partner.count({
        where: {
          userId,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
    ]);

    // Calculate growth
    const growthRate = previousMonthNew > 0
      ? Math.round(((currentMonthNew - previousMonthNew) / previousMonthNew) * 100)
      : currentMonthNew > 0 ? 100 : 0;

    return {
      stats,
      topPartners,
      recentPartners,
      activeInLast30Days: partnersWithRecentInvoices.length,
      newThisMonth: currentMonthNew,
      growthRate,
      totalRevenue: topPartners.reduce((sum, p) => sum + Number(p.totalRevenue || 0), 0),
    };
  }

  // =================== CREDIT SCORING ===================

  /**
   * Calculate partner credit score based on payment history
   * Romanian business credit scoring model
   */
  async calculateCreditScore(userId: string, partnerId: string): Promise<{
    partnerId: string;
    partnerName: string;
    creditScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    creditLimit: number;
    factors: {
      paymentBehavior: { score: number; weight: number; details: string };
      invoiceHistory: { score: number; weight: number; details: string };
      relationshipAge: { score: number; weight: number; details: string };
      businessSize: { score: number; weight: number; details: string };
      overdueHistory: { score: number; weight: number; details: string };
    };
    recommendations: string[];
    lastCalculated: Date;
  }> {
    const partner = await this.findById(userId, partnerId);

    // Get all invoices for this partner
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        OR: [
          { partnerId },
          { partnerCui: partner.cui },
        ],
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Calculate factors
    const factors = {
      paymentBehavior: this.calculatePaymentBehaviorScore(invoices),
      invoiceHistory: this.calculateInvoiceHistoryScore(invoices),
      relationshipAge: this.calculateRelationshipAgeScore(partner.createdAt),
      businessSize: this.calculateBusinessSizeScore(invoices),
      overdueHistory: this.calculateOverdueHistoryScore(invoices),
    };

    // Weighted average
    const weights = {
      paymentBehavior: 0.35,
      invoiceHistory: 0.20,
      relationshipAge: 0.15,
      businessSize: 0.15,
      overdueHistory: 0.15,
    };

    const creditScore = Math.round(
      factors.paymentBehavior.score * weights.paymentBehavior +
      factors.invoiceHistory.score * weights.invoiceHistory +
      factors.relationshipAge.score * weights.relationshipAge +
      factors.businessSize.score * weights.businessSize +
      factors.overdueHistory.score * weights.overdueHistory
    );

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (creditScore >= 80) riskLevel = 'low';
    else if (creditScore >= 60) riskLevel = 'medium';
    else if (creditScore >= 40) riskLevel = 'high';
    else riskLevel = 'critical';

    // Calculate credit limit based on score and history
    const averageInvoice = invoices.length > 0
      ? invoices.reduce((sum, inv) => sum + Number(inv.grossAmount), 0) / invoices.length
      : 0;

    const creditLimit = Math.round(averageInvoice * (creditScore / 50) * 3);

    // Generate recommendations
    const recommendations = this.generateCreditRecommendations(factors, creditScore);

    return {
      partnerId,
      partnerName: partner.name,
      creditScore,
      riskLevel,
      creditLimit,
      factors: {
        paymentBehavior: { ...factors.paymentBehavior, weight: weights.paymentBehavior },
        invoiceHistory: { ...factors.invoiceHistory, weight: weights.invoiceHistory },
        relationshipAge: { ...factors.relationshipAge, weight: weights.relationshipAge },
        businessSize: { ...factors.businessSize, weight: weights.businessSize },
        overdueHistory: { ...factors.overdueHistory, weight: weights.overdueHistory },
      },
      recommendations,
      lastCalculated: new Date(),
    };
  }

  private calculatePaymentBehaviorScore(invoices: any[]): { score: number; details: string } {
    if (invoices.length === 0) {
      return { score: 50, details: 'Fără istoric de facturi' };
    }

    const paidInvoices = invoices.filter(inv => inv.paymentStatus === 'PAID');
    const onTimePayments = paidInvoices.filter(inv => {
      if (!inv.paymentDate || !inv.dueDate) return true;
      return new Date(inv.paymentDate) <= new Date(inv.dueDate);
    });

    const paymentRate = paidInvoices.length / invoices.length;
    const onTimeRate = paidInvoices.length > 0 ? onTimePayments.length / paidInvoices.length : 0;

    const score = Math.round(paymentRate * 50 + onTimeRate * 50);
    const details = `${Math.round(paymentRate * 100)}% factori plătite, ${Math.round(onTimeRate * 100)}% la termen`;

    return { score, details };
  }

  private calculateInvoiceHistoryScore(invoices: any[]): { score: number; details: string } {
    const count = invoices.length;

    if (count === 0) return { score: 30, details: 'Fără facturi' };
    if (count >= 50) return { score: 100, details: `${count} facturi - relație stabilă` };
    if (count >= 20) return { score: 80, details: `${count} facturi - istoric bun` };
    if (count >= 10) return { score: 60, details: `${count} facturi - istoric moderat` };
    if (count >= 5) return { score: 45, details: `${count} facturi - istoric limitat` };

    return { score: 30, details: `${count} facturi - partener nou` };
  }

  private calculateRelationshipAgeScore(createdAt: Date): { score: number; details: string } {
    const now = new Date();
    const monthsAge = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (monthsAge >= 36) return { score: 100, details: `${monthsAge} luni - relație pe termen lung` };
    if (monthsAge >= 24) return { score: 85, details: `${monthsAge} luni - relație stabilă` };
    if (monthsAge >= 12) return { score: 70, details: `${monthsAge} luni - relație în dezvoltare` };
    if (monthsAge >= 6) return { score: 50, details: `${monthsAge} luni - relație recentă` };

    return { score: 30, details: `${monthsAge} luni - partener nou` };
  }

  private calculateBusinessSizeScore(invoices: any[]): { score: number; details: string } {
    if (invoices.length === 0) return { score: 50, details: 'Fără date de evaluare' };

    const totalValue = invoices.reduce((sum, inv) => sum + Number(inv.grossAmount), 0);
    const avgValue = totalValue / invoices.length;

    // Romanian business classification thresholds (in RON)
    if (avgValue >= 100000) return { score: 95, details: `Facturi medii: ${avgValue.toLocaleString('ro-RO')} RON - afacere mare` };
    if (avgValue >= 50000) return { score: 80, details: `Facturi medii: ${avgValue.toLocaleString('ro-RO')} RON - afacere medie-mare` };
    if (avgValue >= 20000) return { score: 65, details: `Facturi medii: ${avgValue.toLocaleString('ro-RO')} RON - afacere medie` };
    if (avgValue >= 5000) return { score: 50, details: `Facturi medii: ${avgValue.toLocaleString('ro-RO')} RON - afacere mică` };

    return { score: 35, details: `Facturi medii: ${avgValue.toLocaleString('ro-RO')} RON - microîntreprindere` };
  }

  private calculateOverdueHistoryScore(invoices: any[]): { score: number; details: string } {
    const now = new Date();
    const overdueInvoices = invoices.filter(inv => {
      if (inv.paymentStatus === 'PAID') return false;
      if (!inv.dueDate) return false;
      return new Date(inv.dueDate) < now;
    });

    const overdueRate = invoices.length > 0 ? overdueInvoices.length / invoices.length : 0;

    // Calculate average overdue days
    let totalOverdueDays = 0;
    for (const inv of overdueInvoices) {
      const dueDate = new Date(inv.dueDate);
      totalOverdueDays += Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    const avgOverdueDays = overdueInvoices.length > 0 ? totalOverdueDays / overdueInvoices.length : 0;

    if (overdueRate === 0) return { score: 100, details: 'Fără facturi restante' };
    if (overdueRate < 0.1 && avgOverdueDays < 30) return { score: 80, details: `${Math.round(overdueRate * 100)}% restante, media ${Math.round(avgOverdueDays)} zile` };
    if (overdueRate < 0.2 && avgOverdueDays < 60) return { score: 60, details: `${Math.round(overdueRate * 100)}% restante, media ${Math.round(avgOverdueDays)} zile` };
    if (overdueRate < 0.3) return { score: 40, details: `${Math.round(overdueRate * 100)}% restante - risc moderat` };

    return { score: 20, details: `${Math.round(overdueRate * 100)}% restante - risc ridicat!` };
  }

  private generateCreditRecommendations(factors: any, creditScore: number): string[] {
    const recommendations: string[] = [];

    if (creditScore >= 80) {
      recommendations.push('Partener de încredere - poate beneficia de termene de plată extinse');
    } else if (creditScore >= 60) {
      recommendations.push('Partener stabil - monitorizare periodică recomandată');
    } else if (creditScore >= 40) {
      recommendations.push('Risc moderat - se recomandă plata în avans sau garanții');
      if (factors.overdueHistory.score < 50) {
        recommendations.push('Atenție: istoric de întârzieri la plată');
      }
    } else {
      recommendations.push('Risc ridicat - se recomandă plata 100% în avans');
      recommendations.push('Verificați capacitatea de plată înainte de noi tranzacții');
    }

    if (factors.paymentBehavior.score < 50) {
      recommendations.push('Comportament de plată sub medie - monitorizare strictă');
    }

    if (factors.invoiceHistory.score < 40) {
      recommendations.push('Istoric limitat - tranzacții de testare recomandate');
    }

    return recommendations;
  }

  /**
   * Get credit scores for all partners
   */
  async getCreditScoresSummary(userId: string): Promise<{
    totalPartners: number;
    byRiskLevel: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    averageScore: number;
    totalCreditExposure: number;
    partnersNeedingReview: { id: string; name: string; score: number; reason: string }[];
  }> {
    const partners = await this.prisma.partner.findMany({
      where: { userId, isActive: true },
    });

    const scores: { partnerId: string; name: string; score: number; riskLevel: string }[] = [];
    let totalScore = 0;
    const byRiskLevel = { low: 0, medium: 0, high: 0, critical: 0 };
    const partnersNeedingReview: { id: string; name: string; score: number; reason: string }[] = [];

    for (const partner of partners) {
      try {
        const creditData = await this.calculateCreditScore(userId, partner.id);
        scores.push({
          partnerId: partner.id,
          name: partner.name,
          score: creditData.creditScore,
          riskLevel: creditData.riskLevel,
        });
        totalScore += creditData.creditScore;
        byRiskLevel[creditData.riskLevel]++;

        if (creditData.riskLevel === 'high' || creditData.riskLevel === 'critical') {
          partnersNeedingReview.push({
            id: partner.id,
            name: partner.name,
            score: creditData.creditScore,
            reason: creditData.riskLevel === 'critical' ? 'Risc critic' : 'Risc ridicat',
          });
        }
      } catch {
        // Skip partners that fail scoring
      }
    }

    // Get total credit exposure (unpaid invoices)
    const unpaidInvoices = await this.prisma.invoice.aggregate({
      where: {
        userId,
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      _sum: { grossAmount: true },
    });

    return {
      totalPartners: partners.length,
      byRiskLevel,
      averageScore: scores.length > 0 ? Math.round(totalScore / scores.length) : 0,
      totalCreditExposure: Number(unpaidInvoices._sum.grossAmount) || 0,
      partnersNeedingReview: partnersNeedingReview.slice(0, 10),
    };
  }

  /**
   * Get partners sorted by credit score
   */
  async getPartnersByRisk(
    userId: string,
    riskLevel?: 'low' | 'medium' | 'high' | 'critical',
    limit: number = 20,
  ): Promise<{ partnerId: string; name: string; cui: string | null; creditScore: number; riskLevel: string; creditLimit: number }[]> {
    const partners = await this.prisma.partner.findMany({
      where: { userId, isActive: true },
      take: limit * 2, // Get more to filter by risk
    });

    const results: { partnerId: string; name: string; cui: string | null; creditScore: number; riskLevel: string; creditLimit: number }[] = [];

    for (const partner of partners) {
      try {
        const creditData = await this.calculateCreditScore(userId, partner.id);

        if (!riskLevel || creditData.riskLevel === riskLevel) {
          results.push({
            partnerId: partner.id,
            name: partner.name,
            cui: partner.cui,
            creditScore: creditData.creditScore,
            riskLevel: creditData.riskLevel,
            creditLimit: creditData.creditLimit,
          });
        }
      } catch {
        // Skip
      }
    }

    return results
      .sort((a, b) => a.creditScore - b.creditScore) // Lowest score first (highest risk)
      .slice(0, limit);
  }

  // Import partners from existing invoices
  async importFromInvoices(userId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { userId },
      select: {
        partnerName: true,
        partnerCui: true,
        partnerAddress: true,
        type: true,
        grossAmount: true,
      },
    });

    const partnerMap = new Map<string, {
      name: string;
      cui: string | null;
      address: string | null;
      type: PartnerType;
      invoiceCount: number;
      totalRevenue: number;
    }>();

    for (const inv of invoices) {
      const key = inv.partnerCui || inv.partnerName;
      const existing = partnerMap.get(key);

      if (existing) {
        existing.invoiceCount++;
        existing.totalRevenue += Number(inv.grossAmount);
      } else {
        partnerMap.set(key, {
          name: inv.partnerName,
          cui: inv.partnerCui,
          address: inv.partnerAddress,
          type: inv.type === 'ISSUED' ? PartnerType.CUSTOMER : PartnerType.SUPPLIER,
          invoiceCount: 1,
          totalRevenue: Number(inv.grossAmount),
        });
      }
    }

    let imported = 0;
    for (const partner of partnerMap.values()) {
      // Skip if already exists
      if (partner.cui) {
        const existing = await this.findByCui(userId, partner.cui);
        if (existing) continue;
      }

      await this.prisma.partner.create({
        data: {
          userId,
          name: partner.name,
          cui: partner.cui,
          address: partner.address,
          type: partner.type,
          invoiceCount: partner.invoiceCount,
          totalRevenue: partner.totalRevenue,
        },
      });
      imported++;
    }

    return { imported, total: partnerMap.size };
  }
}
