import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Tier, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * REQ-049 A1 — staff view of clients: search, client-360, account changes.
 * Every mutation writes an AuditLog row attributed to the staff member.
 */
export interface ClientListQuery {
  search?: string;
  tier?: Tier;
  role?: UserRole;
  page?: number;
  limit?: number;
}

@Injectable()
export class AdminClientsService {
  private readonly logger = new Logger(AdminClientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d7 = new Date(now.getTime() - 7 * 86400000);
    const [
      usersTotal, usersNew30, orgsTotal,
      invoices30, efactura30, openTickets, unassignedTickets, waitingTickets,
      activeUsers7, tierCounts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.organization.count(),
      this.prisma.invoice.aggregate({
        where: { invoiceDate: { gte: d30 }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
        _count: true, _sum: { grossAmount: true },
      }),
      this.prisma.invoice.count({ where: { spvSubmittedAt: { gte: d30 } } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN', assignedToId: null } }),
      this.prisma.supportTicket.count({ where: { status: 'WAITING_CLIENT' } }),
      this.prisma.auditLog.groupBy({ by: ['userId'], where: { createdAt: { gte: d7 } } }).then((r) => r.length),
      this.prisma.user.groupBy({ by: ['tier'], _count: { _all: true } }),
    ]);
    const newestClients = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' }, take: 8,
      select: { id: true, email: true, name: true, company: true, cui: true, tier: true, createdAt: true },
    });
    return {
      users: { total: usersTotal, new30d: usersNew30, active7d: activeUsers7 },
      organizations: orgsTotal,
      invoices30d: { count: invoices30._count, value: Number(invoices30._sum.grossAmount || 0) },
      efacturaSubmissions30d: efactura30,
      tickets: { open: openTickets, unassigned: unassignedTickets, waitingClient: waitingTickets },
      byTier: Object.fromEntries(tierCounts.map((t) => [t.tier, t._count._all])),
      newestClients,
      generatedAt: now,
    };
  }

  async list(q: ClientListQuery) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
    const where: Prisma.UserWhereInput = {};
    if (q.tier) where.tier = q.tier;
    if (q.role) where.role = q.role;
    if (q.search) {
      where.OR = [
        { email: { contains: q.search, mode: 'insensitive' } },
        { name: { contains: q.search, mode: 'insensitive' } },
        { company: { contains: q.search, mode: 'insensitive' } },
        { cui: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, company: true, cui: true, tier: true, role: true,
          createdAt: true, emailVerified: true, mfaEnabled: true,
          _count: { select: { invoices: true, supportTickets: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    // last activity from the audit log, one query for the page
    const ids = items.map((u) => u.id);
    const last = ids.length ? await this.prisma.auditLog.groupBy({
      by: ['userId'], where: { userId: { in: ids } }, _max: { createdAt: true },
    }) : [];
    const lastMap = new Map(last.map((l) => [l.userId, l._max.createdAt]));
    return {
      items: items.map((u) => ({ ...u, lastActivityAt: lastMap.get(u.id) ?? null })),
      total, page, limit,
    };
  }

  async get360(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, company: true, cui: true, address: true, tier: true, role: true,
        language: true, createdAt: true, updatedAt: true, emailVerified: true, mfaEnabled: true,
        activeOrganizationId: true,
        organizationMemberships: {
          where: { isActive: true },
          select: { role: true, organization: { select: { id: true, name: true, cui: true, tier: true, isActive: true, createdAt: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('Client not found');

    const [invoiceStats, recentInvoices, tickets, recentErrors, lastActivity, recentAudit] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['type'], where: { userId, status: { notIn: ['DRAFT', 'CANCELLED'] } },
        _count: { _all: true }, _sum: { grossAmount: true },
      }),
      this.prisma.invoice.findMany({
        where: { userId }, orderBy: { invoiceDate: 'desc' }, take: 10,
        select: { id: true, invoiceNumber: true, type: true, invoiceDate: true, partnerName: true, grossAmount: true, currency: true, status: true, paymentStatus: true, efacturaStatus: true, spvSubmitted: true },
      }),
      this.prisma.supportTicket.findMany({
        where: { userId }, orderBy: { updatedAt: 'desc' }, take: 10,
        select: { id: true, reference: true, subject: true, status: true, priority: true, updatedAt: true },
      }),
      this.prisma.errorLog.findMany({
        where: { userId }, orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, message: true, type: true, url: true, createdAt: true },
      }),
      this.prisma.auditLog.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true, action: true } }),
      this.prisma.auditLog.findMany({
        where: { entity: 'User', entityId: userId, action: { startsWith: 'ADMIN_' } },
        orderBy: { createdAt: 'desc' }, take: 10,
        select: { id: true, action: true, details: true, createdAt: true, user: { select: { email: true, name: true } } },
      }),
    ]);

    const efactura = await this.prisma.invoice.groupBy({
      by: ['efacturaStatus'], where: { userId, spvSubmitted: true }, _count: { _all: true },
    });

    return {
      profile: user,
      organization: user.organizationMemberships[0]?.organization ?? null,
      invoices: {
        byType: Object.fromEntries(invoiceStats.map((s) => [s.type, { count: s._count._all, value: Number(s._sum.grossAmount || 0) }])),
        recent: recentInvoices,
      },
      efactura: Object.fromEntries(efactura.map((e) => [e.efacturaStatus ?? 'unknown', e._count._all])),
      tickets,
      recentErrors,
      lastActivity,
      staffChanges: recentAudit,
    };
  }

  async update(staffId: string, userId: string, patch: { tier?: Tier; role?: UserRole; reason?: string }) {
    const before = await this.prisma.user.findUnique({ where: { id: userId }, select: { tier: true, role: true, email: true } });
    if (!before) throw new NotFoundException('Client not found');
    const data: Prisma.UserUpdateInput = {};
    if (patch.tier && patch.tier !== before.tier) data.tier = patch.tier;
    if (patch.role && patch.role !== before.role) data.role = patch.role;
    if (Object.keys(data).length === 0) return { changed: false, before };

    const after = await this.prisma.user.update({ where: { id: userId }, data, select: { id: true, tier: true, role: true } });
    await this.prisma.auditLog.create({
      data: {
        userId: staffId, action: 'ADMIN_CLIENT_UPDATED', entity: 'User', entityId: userId,
        details: { before: { tier: before.tier, role: before.role }, after: { tier: after.tier, role: after.role }, reason: patch.reason ?? null, target: before.email } as Prisma.InputJsonValue,
      },
    });
    this.logger.log(`staff ${staffId} changed client ${userId}: ${JSON.stringify(data)}`);
    return { changed: true, before, after };
  }
}
