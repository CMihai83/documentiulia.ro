/**
 * EU Funds Service - Grant aura manifestation for Romanian SMBs
 * Spell: PNRR scanner, Cohesion tracker, InvestEU vouchers
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CompanyProfileDto,
  EligibilityCheckDto,
  EligibilityResultDto,
  CreateApplicationDto,
  UpdateApplicationDto,
  UpdateMilestoneDto,
  FundsAnalyticsDto,
  InvestEUVoucherDto,
  FundSource,
  ProgramStatus,
  ApplicationStatus,
} from './dto/eu-funds.dto';

// Prisma uses uppercase enum values - map them
const PrismaFundingProgramStatus = {
  OPEN: 'OPEN',
  UPCOMING: 'UPCOMING',
  CLOSED: 'CLOSED',
} as const;

const PrismaApplicationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CONTRACTED: 'CONTRACTED',
} as const;

const PrismaFundSource = {
  PNRR: 'PNRR',
  COHESION: 'COHESION',
  INVESTEU: 'INVESTEU',
  HORIZON: 'HORIZON',
  DIGITAL: 'DIGITAL',
} as const;

const PrismaMilestoneStatus = {
  COMPLETED: 'COMPLETED',
  CURRENT: 'CURRENT',
  UPCOMING: 'UPCOMING',
} as const;

@Injectable()
export class EuFundsService {
  constructor(private prisma: PrismaService) {}

  // ==================== FUNDING PROGRAMS ====================

  /**
   * Get all available funding programs with filtering
   */
  async getPrograms(options: {
    source?: FundSource;
    status?: ProgramStatus;
    sector?: string;
    minFunding?: number;
    maxFunding?: number;
  } = {}) {
    const where: any = {};

    if (options.source) {
      where.source = options.source.toUpperCase();
    }
    if (options.status) {
      where.status = options.status.toUpperCase();
    }
    if (options.sector) {
      where.sectors = { has: options.sector };
    }
    if (options.minFunding) {
      where.maxFunding = { gte: options.minFunding };
    }
    if (options.maxFunding) {
      where.minFunding = { lte: options.maxFunding };
    }

    return this.prisma.fundingProgram.findMany({
      where,
      orderBy: { deadline: 'asc' },
    });
  }

  /**
   * Get single funding program by ID
   */
  async getProgram(programId: string) {
    const program = await this.prisma.fundingProgram.findUnique({
      where: { id: programId },
      include: {
        _count: { select: { applications: true } },
      },
    });

    if (!program) {
      throw new NotFoundException('Funding program not found');
    }

    return program;
  }

  // ==================== ELIGIBILITY CHECK ====================

  /**
   * AI-powered eligibility check - Match company profile to funding programs
   * Uses rule-based matching with AI scoring
   */
  async checkEligibility(dto: EligibilityCheckDto): Promise<EligibilityResultDto[]> {
    const { companyProfile, fundSource, requestedAmount } = dto;

    // Get relevant programs
    const programsWhere: any = { status: PrismaFundingProgramStatus.OPEN };
    if (fundSource) {
      programsWhere.source = fundSource.toUpperCase();
    }

    const programs = await this.prisma.fundingProgram.findMany({
      where: programsWhere,
    });

    const results: EligibilityResultDto[] = [];

    for (const program of programs) {
      const eligibilityResult = this.calculateEligibility(companyProfile, program, requestedAmount);

      if (eligibilityResult.score >= 50) {
        results.push(eligibilityResult);
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate eligibility score for a company-program pair
   */
  private calculateEligibility(
    company: CompanyProfileDto,
    program: any,
    requestedAmount?: number,
  ): EligibilityResultDto {
    let score = 0;
    const matchedCriteria: string[] = [];
    const missingCriteria: string[] = [];

    // Check company size (SMB focus)
    const companySize = this.determineCompanySize(company.employees, company.revenue);
    if (['micro', 'small', 'medium'].includes(companySize)) {
      score += 20;
      matchedCriteria.push('IMM eligibil (micro/mic/mediu)');
    } else {
      missingCriteria.push('Doar IMM-uri eligibile');
    }

    // Check sector match
    const sectorLower = company.sector?.toLowerCase() || '';
    const programSectors = (program.sectors || []).map((s: string) => s.toLowerCase());
    if (programSectors.includes(sectorLower) || programSectors.includes('all')) {
      score += 20;
      matchedCriteria.push(`Sector ${company.sector} eligibil`);
    } else {
      missingCriteria.push(`Sectorul ${company.sector} nu este eligibil pentru acest program`);
    }

    // Check company age
    const companyAge = new Date().getFullYear() - company.founded;
    if (companyAge >= 2) {
      score += 15;
      matchedCriteria.push(`${companyAge} ani de activitate (min. 2 ani)`);
    } else {
      missingCriteria.push('Minim 2 ani de activitate necesari');
    }

    // Check fiscal compliance
    if (company.hasAnafCertificate) {
      score += 10;
      matchedCriteria.push('Certificat ANAF valabil');
    } else {
      missingCriteria.push('Certificat fiscal ANAF necesar');
    }

    // Check no tax debts
    if (company.hasTaxDebts === false) {
      score += 10;
      matchedCriteria.push('Fara datorii fiscale');
    } else if (company.hasTaxDebts === true) {
      missingCriteria.push('Datorii fiscale existente - trebuie achitate');
      score -= 20;
    }

    // Check profitability
    if (company.profitableLast2Years) {
      score += 15;
      matchedCriteria.push('Profit in ultimii 2 ani');
    } else if (company.profitableLast2Years === false) {
      missingCriteria.push('Profitabilitate in ultimii 2 ani necesara');
    }

    // Check funding amount fit
    const amount = requestedAmount || (program.minFunding + program.maxFunding) / 2;
    if (amount >= program.minFunding && amount <= program.maxFunding) {
      score += 10;
      matchedCriteria.push(`Suma solicitata in interval (${program.minFunding}-${program.maxFunding} EUR)`);
    } else {
      missingCriteria.push(`Suma trebuie sa fie intre ${program.minFunding}-${program.maxFunding} EUR`);
    }

    // Calculate days until deadline
    const deadline = new Date(program.deadline);
    const today = new Date();
    const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Generate recommendation
    const recommendation = this.generateRecommendation(score, matchedCriteria.length, missingCriteria.length, daysUntilDeadline);

    return {
      programId: program.id,
      programName: program.name,
      score: Math.max(0, Math.min(100, score)),
      matchedCriteria,
      missingCriteria,
      estimatedFunding: Math.min(amount, program.maxFunding),
      recommendation,
      documentsRequired: program.documentsRequired || [],
      daysUntilDeadline,
    };
  }

  /**
   * Determine company size based on EU SME definition
   */
  private determineCompanySize(employees: number, revenue: number): string {
    if (employees < 10 && revenue < 2000000) return 'micro';
    if (employees < 50 && revenue < 10000000) return 'small';
    if (employees < 250 && revenue < 50000000) return 'medium';
    return 'large';
  }

  /**
   * Generate AI recommendation based on eligibility analysis
   */
  private generateRecommendation(score: number, matched: number, missing: number, daysLeft: number): string {
    if (score >= 90) {
      return `Excelent! Compania dvs. indeplineste ${matched} criterii. Recomandam depunerea imediata - mai aveti ${daysLeft} zile pana la deadline.`;
    } else if (score >= 75) {
      return `Potrivire buna (${score}%). ${missing > 0 ? `Rezolvati ${missing} criterii lipsa pentru sanse maxime.` : ''} Deadline: ${daysLeft} zile.`;
    } else if (score >= 60) {
      return `Eligibilitate partiala (${score}%). Necesita imbunatatiri la ${missing} criterii inainte de aplicare.`;
    } else if (score >= 50) {
      return `Eligibilitate limitata (${score}%). Recomandam consultanta specializata pentru pregatirea dosarului.`;
    } else {
      return `Program nepotrivit pentru profilul companiei. Verificati alte programe disponibile.`;
    }
  }

  // ==================== APPLICATIONS ====================

  /**
   * Create new funding application
   */
  async createApplication(companyId: string, dto: CreateApplicationDto) {
    // Verify program exists and is open
    const program = await this.prisma.fundingProgram.findUnique({
      where: { id: dto.programId },
    });

    if (!program) {
      throw new NotFoundException('Funding program not found');
    }

    if (program.status !== PrismaFundingProgramStatus.OPEN) {
      throw new BadRequestException('Program is not open for applications');
    }

    // Check funding amount is within limits
    if (dto.requestedAmount < program.minFunding || dto.requestedAmount > program.maxFunding) {
      throw new BadRequestException(
        `Requested amount must be between ${program.minFunding} and ${program.maxFunding} EUR`,
      );
    }

    // Calculate eligibility score
    const eligibilityResults = await this.checkEligibility({
      companyProfile: dto.companyProfile,
      fundSource: program.source.toLowerCase() as FundSource,
      requestedAmount: dto.requestedAmount,
    });

    const matchingProgram = eligibilityResults.find((r) => r.programId === dto.programId);
    const eligibilityScore = matchingProgram?.score || 0;

    // Calculate cofinancing if not provided
    const cofinancingAmount = dto.cofinancingAmount ||
      Math.ceil(dto.requestedAmount * (program.cofinancing / 100));

    return this.prisma.fundApplication.create({
      data: {
        companyId,
        programId: dto.programId,
        requestedAmount: dto.requestedAmount,
        cofinancingAmount,
        projectDescription: dto.projectDescription,
        projectObjectives: dto.projectObjectives || [],
        newJobsCreated: dto.newJobsCreated || 0,
        companyProfile: dto.companyProfile as any,
        eligibilityScore,
        status: PrismaApplicationStatus.DRAFT,
        submittedAt: new Date(),
        lastUpdated: new Date(),
      },
      include: {
        program: true,
      },
    });
  }

  /**
   * Get all applications for a company
   */
  async getApplications(companyId: string, options: {
    status?: ApplicationStatus;
    programId?: string;
  } = {}) {
    const where: any = { companyId };
    if (options.status) {
      where.status = options.status.toUpperCase().replace('-', '_');
    }
    if (options.programId) where.programId = options.programId;

    return this.prisma.fundApplication.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        program: true,
        milestones: true,
      },
    });
  }

  /**
   * Get single application by ID
   */
  async getApplication(companyId: string, applicationId: string) {
    const application = await this.prisma.fundApplication.findFirst({
      where: { id: applicationId, companyId },
      include: {
        program: true,
        milestones: { orderBy: { date: 'asc' } },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  /**
   * Update application
   */
  async updateApplication(companyId: string, applicationId: string, dto: UpdateApplicationDto) {
    const application = await this.prisma.fundApplication.findFirst({
      where: { id: applicationId, companyId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Only allow updates to draft or submitted applications
    if (![PrismaApplicationStatus.DRAFT, PrismaApplicationStatus.SUBMITTED].includes(application.status as any)) {
      throw new BadRequestException('Cannot update application in current status');
    }

    const updateData: any = {
      lastUpdated: new Date(),
    };

    if (dto.status) updateData.status = dto.status.toUpperCase().replace('-', '_');
    if (dto.requestedAmount) updateData.requestedAmount = dto.requestedAmount;
    if (dto.projectDescription) updateData.projectDescription = dto.projectDescription;
    if (dto.projectObjectives) updateData.projectObjectives = dto.projectObjectives;
    if (dto.newJobsCreated !== undefined) updateData.newJobsCreated = dto.newJobsCreated;
    if (dto.reviewNotes) updateData.reviewNotes = dto.reviewNotes;

    return this.prisma.fundApplication.update({
      where: { id: applicationId },
      data: updateData,
      include: {
        program: true,
      },
    });
  }

  /**
   * Submit application for review
   */
  async submitApplication(companyId: string, applicationId: string) {
    const application = await this.prisma.fundApplication.findFirst({
      where: { id: applicationId, companyId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== PrismaApplicationStatus.DRAFT) {
      throw new BadRequestException('Only draft applications can be submitted');
    }

    return this.prisma.fundApplication.update({
      where: { id: applicationId },
      data: {
        status: PrismaApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Delete application (only drafts)
   */
  async deleteApplication(companyId: string, applicationId: string) {
    const application = await this.prisma.fundApplication.findFirst({
      where: { id: applicationId, companyId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== PrismaApplicationStatus.DRAFT) {
      throw new BadRequestException('Only draft applications can be deleted');
    }

    return this.prisma.fundApplication.delete({ where: { id: applicationId } });
  }

  // ==================== MILESTONES ====================

  /**
   * Update milestone status
   */
  async updateMilestone(companyId: string, applicationId: string, milestoneId: string, dto: UpdateMilestoneDto) {
    const application = await this.prisma.fundApplication.findFirst({
      where: { id: applicationId, companyId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const statusMap: Record<string, string> = {
      'completed': PrismaMilestoneStatus.COMPLETED,
      'current': PrismaMilestoneStatus.CURRENT,
      'upcoming': PrismaMilestoneStatus.UPCOMING,
    };

    return this.prisma.applicationMilestone.update({
      where: { id: milestoneId },
      data: {
        status: (statusMap[dto.status] || PrismaMilestoneStatus.UPCOMING) as any,
        notes: dto.notes,
      },
    });
  }

  // ==================== ANALYTICS ====================

  /**
   * Get EU Funds dashboard analytics
   */
  async getAnalytics(companyId: string): Promise<FundsAnalyticsDto> {
    const [
      openPrograms,
      applications,
      fundingPrograms,
    ] = await Promise.all([
      this.prisma.fundingProgram.count({ where: { status: PrismaFundingProgramStatus.OPEN } }),
      this.prisma.fundApplication.findMany({ where: { companyId } }),
      this.prisma.fundingProgram.findMany({ where: { status: PrismaFundingProgramStatus.OPEN } }),
    ]);

    // Calculate totals
    const totalAvailableFunding = fundingPrograms.reduce((sum, p) => sum + p.availableBudget, 0);
    const totalFundingRequested = applications.reduce((sum, a) => sum + a.requestedAmount, 0);
    const approvedApplications = applications.filter((a) =>
      [PrismaApplicationStatus.APPROVED, PrismaApplicationStatus.CONTRACTED].includes(a.status as any),
    );
    const totalFundingApproved = approvedApplications.reduce((sum, a) => sum + a.requestedAmount, 0);

    // Applications by status
    const applicationsByStatus = applications.reduce((acc, app) => {
      const statusKey = app.status.toLowerCase().replace('_', '-') as ApplicationStatus;
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    }, {} as Record<ApplicationStatus, number>);

    // Funding by source
    const fundingBySource = fundingPrograms.reduce((acc, prog) => {
      const sourceKey = prog.source.toLowerCase() as FundSource;
      acc[sourceKey] = (acc[sourceKey] || 0) + prog.availableBudget;
      return acc;
    }, {} as Record<FundSource, number>);

    // Upcoming deadlines
    const upcomingDeadlines = fundingPrograms
      .filter((p) => new Date(p.deadline) > new Date())
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5)
      .map((p) => ({
        programName: p.name,
        deadline: p.deadline,
        daysLeft: Math.ceil((new Date(p.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      }));

    return {
      totalAvailableFunding,
      openPrograms,
      applicationsSubmitted: applications.length,
      totalFundingRequested,
      totalFundingApproved,
      averageSuccessRate: applications.length > 0
        ? Math.round((approvedApplications.length / applications.length) * 100)
        : 0,
      applicationsByStatus,
      fundingBySource,
      upcomingDeadlines,
    };
  }

  // ==================== INVESTEU VOUCHERS ====================

  /**
   * Apply for InvestEU voucher (simplified process)
   */
  async applyForVoucher(companyId: string, dto: InvestEUVoucherDto) {
    // Find InvestEU voucher program
    const voucherProgram = await this.prisma.fundingProgram.findFirst({
      where: {
        source: PrismaFundSource.INVESTEU,
        status: PrismaFundingProgramStatus.OPEN,
        maxFunding: { gte: dto.amount },
        minFunding: { lte: dto.amount },
      },
    });

    if (!voucherProgram) {
      throw new NotFoundException('No matching InvestEU voucher program available');
    }

    // Create simplified voucher application
    return this.prisma.fundApplication.create({
      data: {
        companyId,
        programId: voucherProgram.id,
        requestedAmount: dto.amount,
        cofinancingAmount: 0,
        projectDescription: `${dto.type}: ${dto.purpose}`,
        projectObjectives: dto.supportingDocuments || [],
        newJobsCreated: 0,
        companyProfile: {} as any,
        eligibilityScore: 100,
        status: PrismaApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
        lastUpdated: new Date(),
      },
      include: {
        program: true,
      },
    });
  }

  // ==================== SEED DATA ====================

  /**
   * Seed initial funding programs (for development/demo)
   */
  async seedPrograms() {
    const programs = [
      {
        name: 'PNRR - Digitalizare IMM',
        source: PrismaFundSource.PNRR,
        totalBudget: 500000000,
        availableBudget: 320000000,
        deadline: '2025-06-30',
        minFunding: 25000,
        maxFunding: 100000,
        cofinancing: 10,
        eligibility: ['IMM', 'Minim 2 ani activitate', 'Profit anul anterior'],
        sectors: ['retail', 'services', 'manufacturing', 'it'],
        description: 'Program de digitalizare pentru IMM-uri in cadrul PNRR. Finantare pentru software, hardware si training.',
        status: PrismaFundingProgramStatus.OPEN,
        successRate: 68,
        documentsRequired: ['CUI', 'Bilant', 'Plan de afaceri', 'Certificat fiscal'],
      },
      {
        name: 'PNRR - Eficienta Energetica',
        source: PrismaFundSource.PNRR,
        totalBudget: 750000000,
        availableBudget: 450000000,
        deadline: '2025-09-30',
        minFunding: 50000,
        maxFunding: 500000,
        cofinancing: 15,
        eligibility: ['IMM', 'Audit energetic', 'Cladire proprie sau concesionata'],
        sectors: ['manufacturing', 'tourism', 'construction'],
        description: 'Program pentru renovare energetica si instalare panouri solare pentru IMM-uri.',
        status: PrismaFundingProgramStatus.OPEN,
        successRate: 72,
        documentsRequired: ['CUI', 'Audit energetic', 'Certificat fiscal', 'Documente cladire'],
      },
      {
        name: 'Fonduri de Coeziune - Inovare',
        source: PrismaFundSource.COHESION,
        totalBudget: 200000000,
        availableBudget: 180000000,
        deadline: '2025-12-15',
        minFunding: 100000,
        maxFunding: 1000000,
        cofinancing: 20,
        eligibility: ['IMM', 'Departament R&D', 'Proiect inovativ'],
        sectors: ['it', 'manufacturing', 'health', 'energy'],
        description: 'Finantare pentru proiecte de inovare si cercetare-dezvoltare in IMM-uri.',
        status: PrismaFundingProgramStatus.OPEN,
        successRate: 45,
        documentsRequired: ['CUI', 'Plan R&D', 'CV echipa', 'Brevete existente'],
      },
      {
        name: 'InvestEU - Voucher Digitalizare',
        source: PrismaFundSource.INVESTEU,
        totalBudget: 50000000,
        availableBudget: 35000000,
        deadline: '2025-12-31',
        minFunding: 5000,
        maxFunding: 50000,
        cofinancing: 0,
        eligibility: ['IMM', 'Minim 1 an activitate'],
        sectors: ['retail', 'services', 'manufacturing', 'it', 'tourism', 'construction'],
        description: 'Vouchere pentru achizitie software, licente si servicii cloud pentru digitalizare.',
        status: PrismaFundingProgramStatus.OPEN,
        successRate: 85,
        documentsRequired: ['CUI', 'Oferta furnizor', 'Declaratie pe proprie raspundere'],
      },
      {
        name: 'Horizon Europe - Green Tech',
        source: PrismaFundSource.HORIZON,
        totalBudget: 100000000,
        availableBudget: 80000000,
        deadline: '2026-03-31',
        minFunding: 500000,
        maxFunding: 5000000,
        cofinancing: 30,
        eligibility: ['IMM inovator', 'Parteneriat european', 'TRL 6+'],
        sectors: ['energy', 'manufacturing', 'it'],
        description: 'Finantare europeana pentru tehnologii verzi si sustenabilitate in cadrul Horizon Europe.',
        status: PrismaFundingProgramStatus.UPCOMING,
        successRate: 25,
        documentsRequired: ['CUI', 'Consortiu european', 'Plan tehnic detaliat', 'TRL assessment'],
      },
    ];

    for (const program of programs) {
      await this.prisma.fundingProgram.upsert({
        where: { name: program.name },
        update: program,
        create: program,
      });
    }

    return { seeded: programs.length };
  }
}
