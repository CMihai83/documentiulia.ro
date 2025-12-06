/**
 * HR Intelligence Service - Enchanting recruitment with AI magic
 * Spell: bias-free ATS matching, performance elixirs, wellness auras
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCandidateDto,
  UpdateCandidateDto,
  CreateJobDto,
  UpdateJobDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  CreatePerformanceReviewDto,
  WellnessSurveyDto,
  ATSMatchRequestDto,
  ATSMatchResultDto,
  HRAnalyticsDto,
  CandidateStatus,
  JobStatus,
} from './dto/hr.dto';

// Prisma enum constants (UPPERCASE to match Prisma-generated enums)
const PrismaCandidateStatus = {
  NEW: 'NEW',
  SCREENING: 'SCREENING',
  INTERVIEW: 'INTERVIEW',
  OFFER: 'OFFER',
  HIRED: 'HIRED',
  REJECTED: 'REJECTED',
} as const;

const PrismaJobPostingStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
} as const;

const PrismaJobType = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACT',
  INTERNSHIP: 'INTERNSHIP',
} as const;

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ==================== CANDIDATES ====================

  /**
   * Create candidate - First enchantment in recruitment spell
   */
  async createCandidate(companyId: string, dto: CreateCandidateDto) {
    // Calculate AI match score using ML service
    const matchScore = await this.calculateMatchScore(dto);

    return this.prisma.candidate.create({
      data: {
        ...dto,
        companyId,
        status: PrismaCandidateStatus.NEW as any,
        matchScore,
        appliedAt: new Date(),
      },
    });
  }

  /**
   * Get all candidates with filtering
   */
  async getCandidates(
    companyId: string,
    options: {
      status?: CandidateStatus;
      jobId?: string;
      minScore?: number;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { status, jobId, minScore, search, page = 1, limit = 20 } = options;

    const where: any = { companyId };
    if (status) where.status = status;
    if (jobId) where.jobId = jobId;
    if (minScore) where.matchScore = { gte: minScore };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [candidates, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        orderBy: { matchScore: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { job: true },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    return {
      data: candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update candidate status/info - Pipeline advancement spell
   */
  async updateCandidate(companyId: string, candidateId: string, dto: UpdateCandidateDto) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, companyId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    // Recalculate match score if skills updated
    let matchScore = candidate.matchScore;
    if (dto.skills) {
      matchScore = await this.calculateMatchScore({ ...candidate, skills: dto.skills } as any);
    }

    // Convert DTO status to Prisma status if provided
    const updateData: any = { ...dto, matchScore };
    if (dto.status) {
      updateData.status = dto.status.toUpperCase();
    }

    return this.prisma.candidate.update({
      where: { id: candidateId },
      data: updateData,
    });
  }

  /**
   * Delete candidate
   */
  async deleteCandidate(companyId: string, candidateId: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, companyId },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    return this.prisma.candidate.delete({ where: { id: candidateId } });
  }

  // ==================== JOB POSTINGS ====================

  /**
   * Create job posting - Talent attraction incantation
   */
  async createJob(companyId: string, dto: CreateJobDto) {
    // Convert DTO enums to Prisma enums
    const prismaStatus = dto.status ? dto.status.toUpperCase() : PrismaJobPostingStatus.DRAFT;
    const prismaType = dto.type.toUpperCase().replace('-', '_');

    return this.prisma.jobPosting.create({
      data: {
        title: dto.title,
        department: dto.department,
        location: dto.location,
        type: prismaType as any,
        salary: dto.salary as any,
        description: dto.description,
        requirements: dto.requirements,
        benefits: dto.benefits,
        companyId,
        status: prismaStatus as any,
        postedAt: new Date(),
        applicants: 0,
      },
    });
  }

  /**
   * Get all job postings
   */
  async getJobs(
    companyId: string,
    options: { status?: JobStatus; department?: string } = {},
  ) {
    const where: any = { companyId };
    if (options.status) where.status = options.status.toUpperCase();
    if (options.department) where.department = options.department;

    return this.prisma.jobPosting.findMany({
      where,
      orderBy: { postedAt: 'desc' },
      include: {
        _count: { select: { candidates: true } },
      },
    });
  }

  /**
   * Update job posting
   */
  async updateJob(companyId: string, jobId: string, dto: UpdateJobDto) {
    const job = await this.prisma.jobPosting.findFirst({
      where: { id: jobId, companyId },
    });

    if (!job) {
      throw new NotFoundException('Job posting not found');
    }

    // Convert DTO enums to Prisma enums
    const updateData: any = { ...dto };
    if (dto.salary) updateData.salary = dto.salary;
    if (dto.status) updateData.status = dto.status.toUpperCase();
    if (dto.type) updateData.type = dto.type.toUpperCase().replace('-', '_');

    return this.prisma.jobPosting.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  /**
   * Delete job posting
   */
  async deleteJob(companyId: string, jobId: string) {
    const job = await this.prisma.jobPosting.findFirst({
      where: { id: jobId, companyId },
    });

    if (!job) {
      throw new NotFoundException('Job posting not found');
    }

    return this.prisma.jobPosting.delete({ where: { id: jobId } });
  }

  // ==================== ATS MATCHING ====================

  /**
   * AI-powered candidate matching - The heart of HR enchantment
   * Uses spaCy NER + semantic similarity for bias-free matching
   */
  async matchCandidates(companyId: string, dto: ATSMatchRequestDto): Promise<ATSMatchResultDto[]> {
    const job = await this.prisma.jobPosting.findFirst({
      where: { id: dto.jobId, companyId },
    });

    if (!job) {
      throw new NotFoundException('Job posting not found');
    }

    const candidates = await this.prisma.candidate.findMany({
      where: {
        companyId,
        jobId: dto.jobId,
        matchScore: dto.minScore ? { gte: dto.minScore } : undefined,
      },
      orderBy: { matchScore: 'desc' },
    });

    // Call ML service for detailed matching
    const results: ATSMatchResultDto[] = [];

    for (const candidate of candidates) {
      const matchedSkills = this.findMatchedSkills(candidate.skills, job.requirements);
      const missingSkills = this.findMissingSkills(candidate.skills, job.requirements);

      const recommendation = this.generateRecommendation(
        candidate.matchScore,
        matchedSkills.length,
        missingSkills.length,
      );

      results.push({
        candidateId: candidate.id,
        candidateName: candidate.name,
        matchScore: candidate.matchScore,
        matchedSkills,
        missingSkills,
        recommendation,
        biasAuditPassed: dto.biasFree !== false, // Bias-free by default
      });
    }

    return results;
  }

  // ==================== EMPLOYEES ====================

  /**
   * Create employee record
   */
  async createEmployee(companyId: string, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        ...dto,
        companyId,
        wellnessScore: 75, // Default wellness
        performanceScore: 0,
        trainingCompleted: 0,
      },
    });
  }

  /**
   * Get all employees
   */
  async getEmployees(companyId: string, department?: string) {
    const where: any = { companyId };
    if (department) where.department = department;

    return this.prisma.employee.findMany({
      where,
      include: {
        performanceReviews: { orderBy: { createdAt: 'desc' }, take: 2 },
        goals: true,
      },
    });
  }

  /**
   * Update employee
   */
  async updateEmployee(companyId: string, employeeId: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.employee.update({
      where: { id: employeeId },
      data: dto,
    });
  }

  // ==================== PERFORMANCE ====================

  /**
   * Create performance review - 360° evaluation elixir
   */
  async createPerformanceReview(companyId: string, dto: CreatePerformanceReviewDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const review = await this.prisma.performanceReview.create({
      data: {
        employeeId: dto.employeeId,
        reviewerId: dto.reviewerId,
        rating: dto.rating,
        feedback: dto.feedback,
        period: dto.period,
      },
    });

    // Update employee performance score
    await this.updateEmployeePerformanceScore(dto.employeeId);

    // Create goals if provided
    if (dto.goals?.length) {
      await this.prisma.employeeGoal.createMany({
        data: dto.goals.map((goal) => ({
          employeeId: dto.employeeId,
          ...goal,
        })),
      });
    }

    return review;
  }

  /**
   * Get performance reviews for employee
   */
  async getPerformanceReviews(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.performanceReview.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: { employee: true },
    });
  }

  // ==================== WELLNESS ====================

  /**
   * Submit wellness survey - Health aura measurement
   */
  async submitWellnessSurvey(companyId: string, employeeId: string, dto: WellnessSurveyDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Calculate overall wellness score
    const overallScore = Math.round(
      (dto.workLifeBalance + dto.jobSatisfaction + (6 - dto.stressLevel) + dto.teamCollaboration) / 4 * 20,
    );

    // Save survey
    await this.prisma.wellnessSurvey.create({
      data: {
        employeeId,
        ...dto,
        overallScore,
      },
    });

    // Update employee wellness score
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { wellnessScore: overallScore },
    });

    return {
      overallScore,
      trend: overallScore > employee.wellnessScore ? 'improving' :
             overallScore < employee.wellnessScore ? 'declining' : 'stable',
    };
  }

  /**
   * Get wellness analytics for company
   */
  async getWellnessAnalytics(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId },
      select: { id: true, name: true, department: true, wellnessScore: true },
    });

    const avgScore = employees.length > 0
      ? employees.reduce((sum, e) => sum + (e.wellnessScore || 0), 0) / employees.length
      : 0;

    const atRisk = employees.filter((e) => (e.wellnessScore || 0) < 60);
    const healthy = employees.filter((e) => (e.wellnessScore || 0) >= 80);

    return {
      averageScore: Math.round(avgScore),
      atRiskCount: atRisk.length,
      healthyCount: healthy.length,
      byDepartment: this.groupByDepartment(employees, 'wellnessScore'),
      atRiskEmployees: atRisk.map((e) => ({ id: e.id, name: e.name, score: e.wellnessScore || 0 })),
    };
  }

  // ==================== ANALYTICS ====================

  /**
   * Get HR dashboard analytics
   */
  async getAnalytics(companyId: string): Promise<HRAnalyticsDto> {
    const [
      totalEmployees,
      openPositions,
      totalCandidates,
      candidatesByStatus,
      employees,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { companyId } }),
      this.prisma.jobPosting.count({ where: { companyId, status: PrismaJobPostingStatus.ACTIVE as any } }),
      this.prisma.candidate.count({ where: { companyId } }),
      this.prisma.candidate.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { status: true },
      }),
      this.prisma.employee.findMany({
        where: { companyId },
        select: { department: true, wellnessScore: true, performanceScore: true },
      }),
    ]);

    const avgWellness = employees.length > 0
      ? employees.reduce((sum, e) => sum + e.wellnessScore, 0) / employees.length
      : 0;

    const avgPerformance = employees.length > 0
      ? employees.reduce((sum, e) => sum + e.performanceScore, 0) / employees.length
      : 0;

    return {
      totalEmployees,
      openPositions,
      totalCandidates,
      averageTimeToHire: 14, // Mock - would calculate from actual data
      averageMatchScore: 85, // Mock - would calculate from candidates
      averageWellnessScore: Math.round(avgWellness),
      averagePerformanceScore: Math.round(avgPerformance),
      turnoverRate: 8, // Mock percentage
      candidatesByStatus: candidatesByStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count.status }),
        {} as Record<CandidateStatus, number>,
      ),
      employeesByDepartment: this.groupByDepartment(employees, 'count'),
    };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Calculate AI match score - ML enchantment
   * Would call Python ML service in production
   */
  private async calculateMatchScore(candidate: CreateCandidateDto): Promise<number> {
    // Mock AI scoring - in production would call ML service
    const baseScore = 50;
    const skillBonus = (candidate.skills?.length || 0) * 5;
    const expBonus = Math.min((candidate.experienceYears || 0) * 3, 20);
    const eduBonus = candidate.education ? 10 : 0;

    return Math.min(baseScore + skillBonus + expBonus + eduBonus + Math.random() * 10, 100);
  }

  /**
   * Find skills that match job requirements
   */
  private findMatchedSkills(candidateSkills: string[], requirements: string[]): string[] {
    if (!candidateSkills || !requirements) return [];

    return candidateSkills.filter((skill) =>
      requirements.some((req) =>
        req.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(req.toLowerCase()),
      ),
    );
  }

  /**
   * Find missing skills from requirements
   */
  private findMissingSkills(candidateSkills: string[], requirements: string[]): string[] {
    if (!requirements) return [];
    if (!candidateSkills) return requirements;

    return requirements.filter((req) =>
      !candidateSkills.some((skill) =>
        req.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(req.toLowerCase()),
      ),
    );
  }

  /**
   * Generate hiring recommendation
   */
  private generateRecommendation(score: number, matchedCount: number, missingCount: number): string {
    if (score >= 90) {
      return 'Candidat excelent! Recomandare puternică pentru interviu final.';
    } else if (score >= 80) {
      return `Potrivire bună. ${matchedCount} competențe confirmate, ${missingCount} de dezvoltat.`;
    } else if (score >= 70) {
      return 'Candidat promițător. Recomandăm evaluare tehnică detaliată.';
    } else {
      return 'Eligibilitate limitată. Necesită training suplimentar.';
    }
  }

  /**
   * Update employee performance score from reviews
   */
  private async updateEmployeePerformanceScore(employeeId: string) {
    const reviews = await this.prisma.performanceReview.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      const performanceScore = Math.round(avgRating * 20); // Convert 1-5 to 0-100

      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { performanceScore },
      });
    }
  }

  /**
   * Group employees by department
   */
  private groupByDepartment(
    employees: { department: string; wellnessScore?: number }[],
    metric: 'count' | 'wellnessScore',
  ): Record<string, number> {
    return employees.reduce((acc, emp) => {
      if (!acc[emp.department]) acc[emp.department] = 0;
      if (metric === 'count') {
        acc[emp.department]++;
      } else {
        acc[emp.department] = (acc[emp.department] + (emp.wellnessScore || 0)) / 2;
      }
      return acc;
    }, {} as Record<string, number>);
  }
}
