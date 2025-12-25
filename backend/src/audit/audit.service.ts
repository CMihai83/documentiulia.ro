import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto, AuditLogResponseDto, AuditLogListResponseDto } from './dto/audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AuditLogQueryDto): Promise<AuditLogListResponseDto> {
    const {
      userId,
      organizationId,
      action,
      entity,
      entityId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = query;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (action) {
      where.action = action;
    }

    if (entity) {
      where.entity = entity;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const data: AuditLogResponseDto[] = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user?.name || undefined,
      userEmail: log.user?.email || undefined,
      organizationId: log.organizationId || undefined,
      organizationName: log.organization?.name || undefined,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId || undefined,
      details: log.details as Record<string, any> || undefined,
      ipAddress: log.ipAddress || undefined,
      createdAt: log.createdAt,
    }));

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string): Promise<AuditLogResponseDto | null> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!log) {
      return null;
    }

    return {
      id: log.id,
      userId: log.userId,
      userName: log.user?.name || undefined,
      userEmail: log.user?.email || undefined,
      organizationId: log.organizationId || undefined,
      organizationName: log.organization?.name || undefined,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId || undefined,
      details: log.details as Record<string, any> || undefined,
      ipAddress: log.ipAddress || undefined,
      createdAt: log.createdAt,
    };
  }

  async getDistinctActions(): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return result.map((r) => r.action);
  }

  async getDistinctEntities(): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
      orderBy: { entity: 'asc' },
    });
    return result.map((r) => r.entity);
  }

  /**
   * Export audit logs to CSV or JSON format
   */
  async exportAuditLogs(query: AuditLogQueryDto & { format?: 'csv' | 'json' }): Promise<{
    data: string;
    filename: string;
    contentType: string;
    totalRecords: number;
  }> {
    const { format = 'csv', limit: _unused, offset: _offset, ...filterQuery } = query;

    // Fetch all logs matching the query (up to 10000 for export)
    const where: any = {};

    if (filterQuery.userId) where.userId = filterQuery.userId;
    if (filterQuery.organizationId) where.organizationId = filterQuery.organizationId;
    if (filterQuery.action) where.action = filterQuery.action;
    if (filterQuery.entity) where.entity = filterQuery.entity;
    if (filterQuery.entityId) where.entityId = filterQuery.entityId;

    if (filterQuery.startDate || filterQuery.endDate) {
      where.createdAt = {};
      if (filterQuery.startDate) where.createdAt.gte = filterQuery.startDate;
      if (filterQuery.endDate) where.createdAt.lte = filterQuery.endDate;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const totalRecords = logs.length;

    if (format === 'json') {
      const exportData = logs.map(log => ({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        user: {
          id: log.userId,
          name: log.user?.name || null,
          email: log.user?.email || null,
        },
        organization: log.organizationId ? {
          id: log.organizationId,
          name: log.organization?.name || null,
        } : null,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
      }));

      return {
        data: JSON.stringify(exportData, null, 2),
        filename: `audit-logs-${timestamp}.json`,
        contentType: 'application/json',
        totalRecords,
      };
    }

    // CSV format
    const csvHeaders = [
      'ID',
      'Timestamp',
      'User ID',
      'User Name',
      'User Email',
      'Organization ID',
      'Organization Name',
      'Action',
      'Entity',
      'Entity ID',
      'IP Address',
      'Details',
    ];

    const csvRows = logs.map(log => [
      log.id,
      log.createdAt.toISOString(),
      log.userId,
      log.user?.name || '',
      log.user?.email || '',
      log.organizationId || '',
      log.organization?.name || '',
      log.action,
      log.entity,
      log.entityId || '',
      log.ipAddress || '',
      log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '',
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return {
      data: csvContent,
      filename: `audit-logs-${timestamp}.csv`,
      contentType: 'text/csv',
      totalRecords,
    };
  }

  /**
   * Get audit summary for compliance reporting
   */
  async getComplianceSummary(organizationId: string, startDate: Date, endDate: Date): Promise<{
    period: { start: string; end: string };
    summary: {
      totalEvents: number;
      uniqueUsers: number;
      byAction: Array<{ action: string; count: number }>;
      byEntity: Array<{ entity: string; count: number }>;
      byDay: Array<{ date: string; count: number }>;
    };
    sensitiveActions: {
      total: number;
      events: Array<{
        action: string;
        entity: string;
        timestamp: string;
        userId: string;
        userName?: string;
      }>;
    };
    accessPatterns: {
      peakHour: number;
      averageDaily: number;
      byHour: Array<{ hour: number; count: number }>;
    };
  }> {
    const where = {
      organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [logs, uniqueUsers, actionGroups, entityGroups] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: { entity: true },
        orderBy: { _count: { entity: 'desc' } },
      }),
    ]);

    // Group by day
    const byDayMap = new Map<string, number>();
    const byHourMap = new Map<number, number>();

    for (const log of logs) {
      const day = log.createdAt.toISOString().split('T')[0];
      byDayMap.set(day, (byDayMap.get(day) || 0) + 1);

      const hour = log.createdAt.getHours();
      byHourMap.set(hour, (byHourMap.get(hour) || 0) + 1);
    }

    const byDay = Array.from(byDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byHour = Array.from(byHourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // Find peak hour
    let peakHour = 0;
    let maxHourCount = 0;
    for (const { hour, count } of byHour) {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = hour;
      }
    }

    // Identify sensitive actions
    const sensitiveActionTypes = ['DELETE', 'BULK_DELETE', 'ADMIN_ACCESS', 'PERMISSION_CHANGE', 'DATA_EXPORT', 'USER_IMPERSONATION'];
    const sensitiveEvents = logs
      .filter(log => sensitiveActionTypes.some(sa => log.action.toUpperCase().includes(sa)))
      .map(log => ({
        action: log.action,
        entity: log.entity,
        timestamp: log.createdAt.toISOString(),
        userId: log.userId,
        userName: log.user?.name || undefined,
      }));

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalEvents: logs.length,
        uniqueUsers: uniqueUsers.length,
        byAction: actionGroups.map(a => ({ action: a.action, count: a._count.action })),
        byEntity: entityGroups.map(e => ({ entity: e.entity, count: e._count.entity })),
        byDay,
      },
      sensitiveActions: {
        total: sensitiveEvents.length,
        events: sensitiveEvents.slice(0, 50),
      },
      accessPatterns: {
        peakHour,
        averageDaily: Math.round(logs.length / daysDiff),
        byHour,
      },
    };
  }

  async getStats(organizationId?: string): Promise<{
    totalLogs: number;
    todayLogs: number;
    topActions: { action: string; count: number }[];
    topEntities: { entity: string; count: number }[];
  }> {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, actionCounts, entityCounts] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({
        where: {
          ...where,
          createdAt: { gte: today },
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 5,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: { entity: true },
        orderBy: { _count: { entity: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalLogs,
      todayLogs,
      topActions: actionCounts.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      topEntities: entityCounts.map((e) => ({
        entity: e.entity,
        count: e._count.entity,
      })),
    };
  }
}
