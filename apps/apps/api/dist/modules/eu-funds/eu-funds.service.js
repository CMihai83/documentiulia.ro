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
exports.EuFundsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const PrismaFundingProgramStatus = {
    OPEN: 'OPEN',
    UPCOMING: 'UPCOMING',
    CLOSED: 'CLOSED',
};
const PrismaApplicationStatus = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    UNDER_REVIEW: 'UNDER_REVIEW',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    CONTRACTED: 'CONTRACTED',
};
const PrismaFundSource = {
    PNRR: 'PNRR',
    COHESION: 'COHESION',
    INVESTEU: 'INVESTEU',
    HORIZON: 'HORIZON',
    DIGITAL: 'DIGITAL',
};
const PrismaMilestoneStatus = {
    COMPLETED: 'COMPLETED',
    CURRENT: 'CURRENT',
    UPCOMING: 'UPCOMING',
};
let EuFundsService = class EuFundsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPrograms(options = {}) {
        const where = {};
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
    async getProgram(programId) {
        const program = await this.prisma.fundingProgram.findUnique({
            where: { id: programId },
            include: {
                _count: { select: { applications: true } },
            },
        });
        if (!program) {
            throw new common_1.NotFoundException('Funding program not found');
        }
        return program;
    }
    async checkEligibility(dto) {
        const { companyProfile, fundSource, requestedAmount } = dto;
        const programsWhere = { status: PrismaFundingProgramStatus.OPEN };
        if (fundSource) {
            programsWhere.source = fundSource.toUpperCase();
        }
        const programs = await this.prisma.fundingProgram.findMany({
            where: programsWhere,
        });
        const results = [];
        for (const program of programs) {
            const eligibilityResult = this.calculateEligibility(companyProfile, program, requestedAmount);
            if (eligibilityResult.score >= 50) {
                results.push(eligibilityResult);
            }
        }
        return results.sort((a, b) => b.score - a.score);
    }
    calculateEligibility(company, program, requestedAmount) {
        let score = 0;
        const matchedCriteria = [];
        const missingCriteria = [];
        const companySize = this.determineCompanySize(company.employees, company.revenue);
        if (['micro', 'small', 'medium'].includes(companySize)) {
            score += 20;
            matchedCriteria.push('IMM eligibil (micro/mic/mediu)');
        }
        else {
            missingCriteria.push('Doar IMM-uri eligibile');
        }
        const sectorLower = company.sector?.toLowerCase() || '';
        const programSectors = (program.sectors || []).map((s) => s.toLowerCase());
        if (programSectors.includes(sectorLower) || programSectors.includes('all')) {
            score += 20;
            matchedCriteria.push(`Sector ${company.sector} eligibil`);
        }
        else {
            missingCriteria.push(`Sectorul ${company.sector} nu este eligibil pentru acest program`);
        }
        const companyAge = new Date().getFullYear() - company.founded;
        if (companyAge >= 2) {
            score += 15;
            matchedCriteria.push(`${companyAge} ani de activitate (min. 2 ani)`);
        }
        else {
            missingCriteria.push('Minim 2 ani de activitate necesari');
        }
        if (company.hasAnafCertificate) {
            score += 10;
            matchedCriteria.push('Certificat ANAF valabil');
        }
        else {
            missingCriteria.push('Certificat fiscal ANAF necesar');
        }
        if (company.hasTaxDebts === false) {
            score += 10;
            matchedCriteria.push('Fara datorii fiscale');
        }
        else if (company.hasTaxDebts === true) {
            missingCriteria.push('Datorii fiscale existente - trebuie achitate');
            score -= 20;
        }
        if (company.profitableLast2Years) {
            score += 15;
            matchedCriteria.push('Profit in ultimii 2 ani');
        }
        else if (company.profitableLast2Years === false) {
            missingCriteria.push('Profitabilitate in ultimii 2 ani necesara');
        }
        const amount = requestedAmount || (program.minFunding + program.maxFunding) / 2;
        if (amount >= program.minFunding && amount <= program.maxFunding) {
            score += 10;
            matchedCriteria.push(`Suma solicitata in interval (${program.minFunding}-${program.maxFunding} EUR)`);
        }
        else {
            missingCriteria.push(`Suma trebuie sa fie intre ${program.minFunding}-${program.maxFunding} EUR`);
        }
        const deadline = new Date(program.deadline);
        const today = new Date();
        const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
    determineCompanySize(employees, revenue) {
        if (employees < 10 && revenue < 2000000)
            return 'micro';
        if (employees < 50 && revenue < 10000000)
            return 'small';
        if (employees < 250 && revenue < 50000000)
            return 'medium';
        return 'large';
    }
    generateRecommendation(score, matched, missing, daysLeft) {
        if (score >= 90) {
            return `Excelent! Compania dvs. indeplineste ${matched} criterii. Recomandam depunerea imediata - mai aveti ${daysLeft} zile pana la deadline.`;
        }
        else if (score >= 75) {
            return `Potrivire buna (${score}%). ${missing > 0 ? `Rezolvati ${missing} criterii lipsa pentru sanse maxime.` : ''} Deadline: ${daysLeft} zile.`;
        }
        else if (score >= 60) {
            return `Eligibilitate partiala (${score}%). Necesita imbunatatiri la ${missing} criterii inainte de aplicare.`;
        }
        else if (score >= 50) {
            return `Eligibilitate limitata (${score}%). Recomandam consultanta specializata pentru pregatirea dosarului.`;
        }
        else {
            return `Program nepotrivit pentru profilul companiei. Verificati alte programe disponibile.`;
        }
    }
    async createApplication(companyId, dto) {
        const program = await this.prisma.fundingProgram.findUnique({
            where: { id: dto.programId },
        });
        if (!program) {
            throw new common_1.NotFoundException('Funding program not found');
        }
        if (program.status !== PrismaFundingProgramStatus.OPEN) {
            throw new common_1.BadRequestException('Program is not open for applications');
        }
        if (dto.requestedAmount < program.minFunding || dto.requestedAmount > program.maxFunding) {
            throw new common_1.BadRequestException(`Requested amount must be between ${program.minFunding} and ${program.maxFunding} EUR`);
        }
        const eligibilityResults = await this.checkEligibility({
            companyProfile: dto.companyProfile,
            fundSource: program.source.toLowerCase(),
            requestedAmount: dto.requestedAmount,
        });
        const matchingProgram = eligibilityResults.find((r) => r.programId === dto.programId);
        const eligibilityScore = matchingProgram?.score || 0;
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
                companyProfile: dto.companyProfile,
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
    async getApplications(companyId, options = {}) {
        const where = { companyId };
        if (options.status) {
            where.status = options.status.toUpperCase().replace('-', '_');
        }
        if (options.programId)
            where.programId = options.programId;
        return this.prisma.fundApplication.findMany({
            where,
            orderBy: { submittedAt: 'desc' },
            include: {
                program: true,
                milestones: true,
            },
        });
    }
    async getApplication(companyId, applicationId) {
        const application = await this.prisma.fundApplication.findFirst({
            where: { id: applicationId, companyId },
            include: {
                program: true,
                milestones: { orderBy: { date: 'asc' } },
            },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        return application;
    }
    async updateApplication(companyId, applicationId, dto) {
        const application = await this.prisma.fundApplication.findFirst({
            where: { id: applicationId, companyId },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        if (![PrismaApplicationStatus.DRAFT, PrismaApplicationStatus.SUBMITTED].includes(application.status)) {
            throw new common_1.BadRequestException('Cannot update application in current status');
        }
        const updateData = {
            lastUpdated: new Date(),
        };
        if (dto.status)
            updateData.status = dto.status.toUpperCase().replace('-', '_');
        if (dto.requestedAmount)
            updateData.requestedAmount = dto.requestedAmount;
        if (dto.projectDescription)
            updateData.projectDescription = dto.projectDescription;
        if (dto.projectObjectives)
            updateData.projectObjectives = dto.projectObjectives;
        if (dto.newJobsCreated !== undefined)
            updateData.newJobsCreated = dto.newJobsCreated;
        if (dto.reviewNotes)
            updateData.reviewNotes = dto.reviewNotes;
        return this.prisma.fundApplication.update({
            where: { id: applicationId },
            data: updateData,
            include: {
                program: true,
            },
        });
    }
    async submitApplication(companyId, applicationId) {
        const application = await this.prisma.fundApplication.findFirst({
            where: { id: applicationId, companyId },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        if (application.status !== PrismaApplicationStatus.DRAFT) {
            throw new common_1.BadRequestException('Only draft applications can be submitted');
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
    async deleteApplication(companyId, applicationId) {
        const application = await this.prisma.fundApplication.findFirst({
            where: { id: applicationId, companyId },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        if (application.status !== PrismaApplicationStatus.DRAFT) {
            throw new common_1.BadRequestException('Only draft applications can be deleted');
        }
        return this.prisma.fundApplication.delete({ where: { id: applicationId } });
    }
    async updateMilestone(companyId, applicationId, milestoneId, dto) {
        const application = await this.prisma.fundApplication.findFirst({
            where: { id: applicationId, companyId },
        });
        if (!application) {
            throw new common_1.NotFoundException('Application not found');
        }
        const statusMap = {
            'completed': PrismaMilestoneStatus.COMPLETED,
            'current': PrismaMilestoneStatus.CURRENT,
            'upcoming': PrismaMilestoneStatus.UPCOMING,
        };
        return this.prisma.applicationMilestone.update({
            where: { id: milestoneId },
            data: {
                status: (statusMap[dto.status] || PrismaMilestoneStatus.UPCOMING),
                notes: dto.notes,
            },
        });
    }
    async getAnalytics(companyId) {
        const [openPrograms, applications, fundingPrograms,] = await Promise.all([
            this.prisma.fundingProgram.count({ where: { status: PrismaFundingProgramStatus.OPEN } }),
            this.prisma.fundApplication.findMany({ where: { companyId } }),
            this.prisma.fundingProgram.findMany({ where: { status: PrismaFundingProgramStatus.OPEN } }),
        ]);
        const totalAvailableFunding = fundingPrograms.reduce((sum, p) => sum + p.availableBudget, 0);
        const totalFundingRequested = applications.reduce((sum, a) => sum + a.requestedAmount, 0);
        const approvedApplications = applications.filter((a) => [PrismaApplicationStatus.APPROVED, PrismaApplicationStatus.CONTRACTED].includes(a.status));
        const totalFundingApproved = approvedApplications.reduce((sum, a) => sum + a.requestedAmount, 0);
        const applicationsByStatus = applications.reduce((acc, app) => {
            const statusKey = app.status.toLowerCase().replace('_', '-');
            acc[statusKey] = (acc[statusKey] || 0) + 1;
            return acc;
        }, {});
        const fundingBySource = fundingPrograms.reduce((acc, prog) => {
            const sourceKey = prog.source.toLowerCase();
            acc[sourceKey] = (acc[sourceKey] || 0) + prog.availableBudget;
            return acc;
        }, {});
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
    async applyForVoucher(companyId, dto) {
        const voucherProgram = await this.prisma.fundingProgram.findFirst({
            where: {
                source: PrismaFundSource.INVESTEU,
                status: PrismaFundingProgramStatus.OPEN,
                maxFunding: { gte: dto.amount },
                minFunding: { lte: dto.amount },
            },
        });
        if (!voucherProgram) {
            throw new common_1.NotFoundException('No matching InvestEU voucher program available');
        }
        return this.prisma.fundApplication.create({
            data: {
                companyId,
                programId: voucherProgram.id,
                requestedAmount: dto.amount,
                cofinancingAmount: 0,
                projectDescription: `${dto.type}: ${dto.purpose}`,
                projectObjectives: dto.supportingDocuments || [],
                newJobsCreated: 0,
                companyProfile: {},
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
};
exports.EuFundsService = EuFundsService;
exports.EuFundsService = EuFundsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EuFundsService);
//# sourceMappingURL=eu-funds.service.js.map