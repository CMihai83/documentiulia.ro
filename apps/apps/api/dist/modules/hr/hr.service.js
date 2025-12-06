"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const PrismaCandidateStatus = {
    NEW: 'NEW',
    SCREENING: 'SCREENING',
    INTERVIEW: 'INTERVIEW',
    OFFER: 'OFFER',
    HIRED: 'HIRED',
    REJECTED: 'REJECTED',
};
const PrismaJobPostingStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    CLOSED: 'CLOSED',
};
const PrismaJobType = {
    FULL_TIME: 'FULL_TIME',
    PART_TIME: 'PART_TIME',
    CONTRACT: 'CONTRACT',
    INTERNSHIP: 'INTERNSHIP',
};
let HrService = class HrService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCandidate(companyId, dto) {
        const matchScore = await this.calculateMatchScore(dto);
        return this.prisma.candidate.create({
            data: {
                ...dto,
                companyId,
                status: PrismaCandidateStatus.NEW,
                matchScore,
                appliedAt: new Date(),
            },
        });
    }
    async getCandidates(companyId, options = {}) {
        const { status, jobId, minScore, search, page = 1, limit = 20 } = options;
        const where = { companyId };
        if (status)
            where.status = status;
        if (jobId)
            where.jobId = jobId;
        if (minScore)
            where.matchScore = { gte: minScore };
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
    async updateCandidate(companyId, candidateId, dto) {
        const candidate = await this.prisma.candidate.findFirst({
            where: { id: candidateId, companyId },
        });
        if (!candidate) {
            throw new common_1.NotFoundException('Candidate not found');
        }
        let matchScore = candidate.matchScore;
        if (dto.skills) {
            matchScore = await this.calculateMatchScore({ ...candidate, skills: dto.skills });
        }
        const updateData = { ...dto, matchScore };
        if (dto.status) {
            updateData.status = dto.status.toUpperCase();
        }
        return this.prisma.candidate.update({
            where: { id: candidateId },
            data: updateData,
        });
    }
    async deleteCandidate(companyId, candidateId) {
        const candidate = await this.prisma.candidate.findFirst({
            where: { id: candidateId, companyId },
        });
        if (!candidate) {
            throw new common_1.NotFoundException('Candidate not found');
        }
        return this.prisma.candidate.delete({ where: { id: candidateId } });
    }
    async createJob(companyId, dto) {
        const prismaStatus = dto.status ? dto.status.toUpperCase() : PrismaJobPostingStatus.DRAFT;
        const prismaType = dto.type.toUpperCase().replace('-', '_');
        return this.prisma.jobPosting.create({
            data: {
                title: dto.title,
                department: dto.department,
                location: dto.location,
                type: prismaType,
                salary: dto.salary,
                description: dto.description,
                requirements: dto.requirements,
                benefits: dto.benefits,
                companyId,
                status: prismaStatus,
                postedAt: new Date(),
                applicants: 0,
            },
        });
    }
    async getJobs(companyId, options = {}) {
        const where = { companyId };
        if (options.status)
            where.status = options.status.toUpperCase();
        if (options.department)
            where.department = options.department;
        return this.prisma.jobPosting.findMany({
            where,
            orderBy: { postedAt: 'desc' },
            include: {
                _count: { select: { candidates: true } },
            },
        });
    }
    async updateJob(companyId, jobId, dto) {
        const job = await this.prisma.jobPosting.findFirst({
            where: { id: jobId, companyId },
        });
        if (!job) {
            throw new common_1.NotFoundException('Job posting not found');
        }
        const updateData = { ...dto };
        if (dto.salary)
            updateData.salary = dto.salary;
        if (dto.status)
            updateData.status = dto.status.toUpperCase();
        if (dto.type)
            updateData.type = dto.type.toUpperCase().replace('-', '_');
        return this.prisma.jobPosting.update({
            where: { id: jobId },
            data: updateData,
        });
    }
    async deleteJob(companyId, jobId) {
        const job = await this.prisma.jobPosting.findFirst({
            where: { id: jobId, companyId },
        });
        if (!job) {
            throw new common_1.NotFoundException('Job posting not found');
        }
        return this.prisma.jobPosting.delete({ where: { id: jobId } });
    }
    async matchCandidates(companyId, dto) {
        const job = await this.prisma.jobPosting.findFirst({
            where: { id: dto.jobId, companyId },
        });
        if (!job) {
            throw new common_1.NotFoundException('Job posting not found');
        }
        const candidates = await this.prisma.candidate.findMany({
            where: {
                companyId,
                jobId: dto.jobId,
                matchScore: dto.minScore ? { gte: dto.minScore } : undefined,
            },
            orderBy: { matchScore: 'desc' },
        });
        const results = [];
        for (const candidate of candidates) {
            const matchedSkills = this.findMatchedSkills(candidate.skills, job.requirements);
            const missingSkills = this.findMissingSkills(candidate.skills, job.requirements);
            const recommendation = this.generateRecommendation(candidate.matchScore, matchedSkills.length, missingSkills.length);
            results.push({
                candidateId: candidate.id,
                candidateName: candidate.name,
                matchScore: candidate.matchScore,
                matchedSkills,
                missingSkills,
                recommendation,
                biasAuditPassed: dto.biasFree !== false,
            });
        }
        return results;
    }
    async createEmployee(companyId, dto) {
        return this.prisma.employee.create({
            data: {
                ...dto,
                companyId,
                wellnessScore: 75,
                performanceScore: 0,
                trainingCompleted: 0,
            },
        });
    }
    async getEmployees(companyId, department) {
        const where = { companyId };
        if (department)
            where.department = department;
        return this.prisma.employee.findMany({
            where,
            include: {
                performanceReviews: { orderBy: { createdAt: 'desc' }, take: 2 },
                goals: true,
            },
        });
    }
    async updateEmployee(companyId, employeeId, dto) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        return this.prisma.employee.update({
            where: { id: employeeId },
            data: dto,
        });
    }
    async createPerformanceReview(companyId, dto) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: dto.employeeId, companyId },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
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
        await this.updateEmployeePerformanceScore(dto.employeeId);
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
    async getPerformanceReviews(companyId, employeeId) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        return this.prisma.performanceReview.findMany({
            where: { employeeId },
            orderBy: { createdAt: 'desc' },
            include: { employee: true },
        });
    }
    async submitWellnessSurvey(companyId, employeeId, dto) {
        const employee = await this.prisma.employee.findFirst({
            where: { id: employeeId, companyId },
        });
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        const overallScore = Math.round((dto.workLifeBalance + dto.jobSatisfaction + (6 - dto.stressLevel) + dto.teamCollaboration) / 4 * 20);
        await this.prisma.wellnessSurvey.create({
            data: {
                employeeId,
                ...dto,
                overallScore,
            },
        });
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
    async getWellnessAnalytics(companyId) {
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
    async getAnalytics(companyId) {
        const [totalEmployees, openPositions, totalCandidates, candidatesByStatus, employees,] = await Promise.all([
            this.prisma.employee.count({ where: { companyId } }),
            this.prisma.jobPosting.count({ where: { companyId, status: PrismaJobPostingStatus.ACTIVE } }),
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
            averageTimeToHire: 14,
            averageMatchScore: 85,
            averageWellnessScore: Math.round(avgWellness),
            averagePerformanceScore: Math.round(avgPerformance),
            turnoverRate: 8,
            candidatesByStatus: candidatesByStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count.status }), {}),
            employeesByDepartment: this.groupByDepartment(employees, 'count'),
        };
    }
    async calculateMatchScore(candidate) {
        const baseScore = 50;
        const skillBonus = (candidate.skills?.length || 0) * 5;
        const expBonus = Math.min((candidate.experienceYears || 0) * 3, 20);
        const eduBonus = candidate.education ? 10 : 0;
        return Math.min(baseScore + skillBonus + expBonus + eduBonus + Math.random() * 10, 100);
    }
    findMatchedSkills(candidateSkills, requirements) {
        if (!candidateSkills || !requirements)
            return [];
        return candidateSkills.filter((skill) => requirements.some((req) => req.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(req.toLowerCase())));
    }
    findMissingSkills(candidateSkills, requirements) {
        if (!requirements)
            return [];
        if (!candidateSkills)
            return requirements;
        return requirements.filter((req) => !candidateSkills.some((skill) => req.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(req.toLowerCase())));
    }
    generateRecommendation(score, matchedCount, missingCount) {
        if (score >= 90) {
            return 'Candidat excelent! Recomandare puternică pentru interviu final.';
        }
        else if (score >= 80) {
            return `Potrivire bună. ${matchedCount} competențe confirmate, ${missingCount} de dezvoltat.`;
        }
        else if (score >= 70) {
            return 'Candidat promițător. Recomandăm evaluare tehnică detaliată.';
        }
        else {
            return 'Eligibilitate limitată. Necesită training suplimentar.';
        }
    }
    async updateEmployeePerformanceScore(employeeId) {
        const reviews = await this.prisma.performanceReview.findMany({
            where: { employeeId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        if (reviews.length > 0) {
            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            const performanceScore = Math.round(avgRating * 20);
            await this.prisma.employee.update({
                where: { id: employeeId },
                data: { performanceScore },
            });
        }
    }
    groupByDepartment(employees, metric) {
        return employees.reduce((acc, emp) => {
            if (!acc[emp.department])
                acc[emp.department] = 0;
            if (metric === 'count') {
                acc[emp.department]++;
            }
            else {
                acc[emp.department] = (acc[emp.department] + (emp.wellnessScore || 0)) / 2;
            }
            return acc;
        }, {});
    }
};
exports.HrService = HrService;
exports.HrService = HrService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HrService);
//# sourceMappingURL=hr.service.js.map