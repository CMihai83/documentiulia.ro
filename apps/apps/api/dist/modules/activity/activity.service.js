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
exports.ActivityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ActivityService = class ActivityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(userId, dto) {
        return this.prisma.activityLog.create({
            data: {
                userId,
                action: dto.action,
                entityType: dto.entityType,
                entityId: dto.entityId,
                metadata: dto.metadata,
                ipAddress: dto.ipAddress,
                userAgent: dto.userAgent,
            },
        });
    }
    async findAll(filters) {
        const { userId, action, entityType, entityId, startDate, endDate, page = 1, limit = 50, } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (userId) {
            where.userId = userId;
        }
        if (action) {
            where.action = action;
        }
        if (entityType) {
            where.entityType = entityType;
        }
        if (entityId) {
            where.entityId = entityId;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        const [logs, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
            }),
            this.prisma.activityLog.count({ where }),
        ]);
        return {
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getByEntity(entityType, entityId) {
        return this.prisma.activityLog.findMany({
            where: { entityType, entityId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
            take: 100,
        });
    }
    async getByUser(userId, limit = 50) {
        return this.prisma.activityLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async findByCompany(companyId, filters) {
        const { action, entityType, startDate, endDate, page = 1, limit = 50 } = filters;
        const skip = (page - 1) * limit;
        const companyUsers = await this.prisma.companyUser.findMany({
            where: { companyId },
            select: { userId: true },
        });
        const userIds = companyUsers.map((cu) => cu.userId);
        const where = {
            userId: { in: userIds },
        };
        if (action) {
            where.action = action;
        }
        if (entityType) {
            where.entityType = entityType;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        const [logs, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
            }),
            this.prisma.activityLog.count({ where }),
        ]);
        return {
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getRecentActivity(limit = 20) {
        return this.prisma.activityLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async getStats(startDate, endDate) {
        const where = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = startDate;
            }
            if (endDate) {
                where.createdAt.lte = endDate;
            }
        }
        const [total, byAction, byEntityType, byUser] = await Promise.all([
            this.prisma.activityLog.count({ where }),
            this.prisma.activityLog.groupBy({
                by: ['action'],
                where,
                _count: true,
            }),
            this.prisma.activityLog.groupBy({
                by: ['entityType'],
                where,
                _count: true,
            }),
            this.prisma.activityLog.groupBy({
                by: ['userId'],
                where,
                _count: true,
                orderBy: { _count: { userId: 'desc' } },
                take: 10,
            }),
        ]);
        return {
            total,
            byAction: byAction.reduce((acc, item) => {
                acc[item.action] = item._count;
                return acc;
            }, {}),
            byEntityType: byEntityType.reduce((acc, item) => {
                acc[item.entityType] = item._count;
                return acc;
            }, {}),
            topUsers: byUser.map((u) => ({
                userId: u.userId,
                count: u._count,
            })),
        };
    }
    async logCreate(userId, entityType, entityId, metadata) {
        return this.log(userId, { action: 'create', entityType, entityId, metadata });
    }
    async logUpdate(userId, entityType, entityId, metadata) {
        return this.log(userId, { action: 'update', entityType, entityId, metadata });
    }
    async logDelete(userId, entityType, entityId, metadata) {
        return this.log(userId, { action: 'delete', entityType, entityId, metadata });
    }
    async logView(userId, entityType, entityId) {
        return this.log(userId, { action: 'view', entityType, entityId });
    }
    async logExport(userId, entityType, entityId, format) {
        return this.log(userId, {
            action: 'export',
            entityType,
            entityId,
            metadata: { format },
        });
    }
    async logLogin(userId, ipAddress, userAgent) {
        return this.log(userId, {
            action: 'login',
            entityType: 'user',
            entityId: userId,
            ipAddress,
            userAgent,
        });
    }
    async cleanup(retentionDays = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const result = await this.prisma.activityLog.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });
        return { deleted: result.count };
    }
};
exports.ActivityService = ActivityService;
exports.ActivityService = ActivityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityService);
//# sourceMappingURL=activity.service.js.map