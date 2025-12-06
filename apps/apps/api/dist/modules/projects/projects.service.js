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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ProjectsService = class ProjectsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        return this.prisma.project.create({
            data: {
                companyId,
                name: dto.name,
                description: dto.description,
                code: dto.code,
                clientId: dto.clientId,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                budget: dto.budget,
                currency: dto.currency || 'RON',
                status: dto.status || 'PLANNING',
            },
            include: {
                client: {
                    select: { id: true, name: true },
                },
            },
        });
    }
    async findAll(companyId, filters) {
        const { status, clientId, search, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = { companyId };
        if (status) {
            where.status = status;
        }
        if (clientId) {
            where.clientId = clientId;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [projects, total] = await Promise.all([
            this.prisma.project.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    client: {
                        select: { id: true, name: true },
                    },
                },
            }),
            this.prisma.project.count({ where }),
        ]);
        return {
            data: projects,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const project = await this.prisma.project.findFirst({
            where: { id, companyId },
            include: {
                client: true,
            },
        });
        if (!project) {
            throw new common_1.NotFoundException('Proiectul nu a fost găsit');
        }
        return project;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        return this.prisma.project.update({
            where: { id },
            data: {
                ...dto,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            },
            include: {
                client: {
                    select: { id: true, name: true },
                },
            },
        });
    }
    async delete(companyId, id) {
        await this.findOne(companyId, id);
        await this.prisma.project.delete({ where: { id } });
        return { message: 'Proiectul a fost șters' };
    }
    async updateStatus(companyId, id, status) {
        await this.findOne(companyId, id);
        return this.prisma.project.update({
            where: { id },
            data: { status: status },
        });
    }
    async getStats(companyId) {
        const [total, planning, inProgress, onHold, completed, cancelled, totalBudget,] = await Promise.all([
            this.prisma.project.count({ where: { companyId } }),
            this.prisma.project.count({ where: { companyId, status: 'PLANNING' } }),
            this.prisma.project.count({ where: { companyId, status: 'IN_PROGRESS' } }),
            this.prisma.project.count({ where: { companyId, status: 'ON_HOLD' } }),
            this.prisma.project.count({ where: { companyId, status: 'COMPLETED' } }),
            this.prisma.project.count({ where: { companyId, status: 'CANCELLED' } }),
            this.prisma.project.aggregate({
                where: { companyId, budget: { not: null } },
                _sum: { budget: true },
            }),
        ]);
        return {
            total,
            byStatus: {
                planning,
                inProgress,
                onHold,
                completed,
                cancelled,
            },
            totalBudget: totalBudget._sum.budget?.toNumber() || 0,
        };
    }
    async getByClient(companyId, clientId) {
        return this.prisma.project.findMany({
            where: { companyId, clientId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getActiveProjects(companyId) {
        return this.prisma.project.findMany({
            where: {
                companyId,
                status: { in: ['PLANNING', 'IN_PROGRESS'] },
            },
            orderBy: { startDate: 'asc' },
            include: {
                client: {
                    select: { id: true, name: true },
                },
            },
        });
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map