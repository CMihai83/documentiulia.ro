import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateActivityLogDto, ActivityFilterDto } from './dto/activity.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async log(userId: string, dto: CreateActivityLogDto) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        action: dto.action,
        entityType: dto.entityType,
        entityId: dto.entityId,
        metadata: dto.metadata as Prisma.InputJsonValue,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  async findAll(filters: ActivityFilterDto) {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {};

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

  async getByEntity(entityType: string, entityId: string) {
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

  async getByUser(userId: string, limit = 50) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByCompany(companyId: string, filters: ActivityFilterDto) {
    const { action, entityType, startDate, endDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    // Get users who belong to this company
    const companyUsers = await this.prisma.companyUser.findMany({
      where: { companyId },
      select: { userId: true },
    });
    const userIds = companyUsers.map((cu) => cu.userId);

    const where: Prisma.ActivityLogWhereInput = {
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

  async getStats(startDate?: Date, endDate?: Date) {
    const where: Prisma.ActivityLogWhereInput = {};

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
      }, {} as Record<string, number>),
      byEntityType: byEntityType.reduce((acc, item) => {
        acc[item.entityType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      topUsers: byUser.map((u) => ({
        userId: u.userId,
        count: u._count,
      })),
    };
  }

  // Helper methods for common logging actions
  async logCreate(userId: string, entityType: string, entityId: string, metadata?: Record<string, any>) {
    return this.log(userId, { action: 'create', entityType, entityId, metadata });
  }

  async logUpdate(userId: string, entityType: string, entityId: string, metadata?: Record<string, any>) {
    return this.log(userId, { action: 'update', entityType, entityId, metadata });
  }

  async logDelete(userId: string, entityType: string, entityId: string, metadata?: Record<string, any>) {
    return this.log(userId, { action: 'delete', entityType, entityId, metadata });
  }

  async logView(userId: string, entityType: string, entityId: string) {
    return this.log(userId, { action: 'view', entityType, entityId });
  }

  async logExport(userId: string, entityType: string, entityId: string, format: string) {
    return this.log(userId, {
      action: 'export',
      entityType,
      entityId,
      metadata: { format },
    });
  }

  async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    return this.log(userId, {
      action: 'login',
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  // Cleanup old activity logs
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
}
