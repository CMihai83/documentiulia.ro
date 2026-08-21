import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TicketPriority, TicketStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * REQ-049 — Client requests (support tickets).
 *
 * One inbox for everything a client asks of the team: dashboard requests from
 * authenticated users AND public contact-form submissions (guests). Staff
 * operate it from the back-office; clients see only their own threads.
 */
export interface CreateTicketInput {
  subject: string;
  body: string;
  category?: string;
  priority?: TicketPriority;
}

export interface GuestTicketInput {
  name: string;
  email: string;
  company?: string;
  subject: string;
  body: string;
}

export interface StaffTicketQuery {
  status?: TicketStatus | 'ALL';
  assignedToId?: string | 'me' | 'unassigned';
  search?: string;
  page?: number;
  limit?: number;
}

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.ACCOUNTANT];

export function isStaffRole(role?: string | null): boolean {
  return STAFF_ROLES.includes(role as UserRole);
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- helpers

  private async nextReference(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.supportTicket.count({
      where: { reference: { startsWith: `REQ-${year}-` } },
    });
    // count()+1 is acceptable here: the unique index makes a collision loud,
    // and the retry below resolves the rare race.
    return `REQ-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async audit(userId: string, action: string, ticketId: string, details: Record<string, unknown>) {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action, entity: 'SupportTicket', entityId: ticketId, details: details as Prisma.InputJsonValue },
      });
    } catch (e) {
      this.logger.warn(`audit write failed for ${action} ${ticketId}: ${(e as Error).message}`);
    }
  }

  private readonly ticketInclude = {
    user: { select: { id: true, email: true, name: true, company: true, cui: true, tier: true } },
    assignedTo: { select: { id: true, email: true, name: true } },
    _count: { select: { messages: true } },
  } satisfies Prisma.SupportTicketInclude;

  // ---------------------------------------------------------------- client side

  async createForUser(userId: string, input: CreateTicketInput) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const reference = await this.nextReference();
        const ticket = await this.prisma.supportTicket.create({
          data: {
            reference,
            userId,
            subject: input.subject.trim(),
            category: input.category || 'general',
            priority: input.priority || TicketPriority.NORMAL,
            source: 'dashboard',
            messages: { create: { authorId: userId, isStaff: false, body: input.body.trim() } },
          },
          include: this.ticketInclude,
        });
        await this.audit(userId, 'TICKET_CREATED', ticket.id, { reference, category: ticket.category });
        return ticket;
      } catch (e) {
        if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2002' && attempt < 2) continue;
        throw e;
      }
    }
    throw new Error('Could not allocate a ticket reference');
  }

  /** Public contact form → same inbox. No auth; guest identity captured on the ticket. */
  async createForGuest(input: GuestTicketInput, meta?: { ipAddress?: string }) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const reference = await this.nextReference();
        // If the guest e-mail belongs to a registered user, attach the ticket
        // to them so it shows up in their dashboard too.
        const existing = await this.prisma.user.findUnique({
          where: { email: input.email.toLowerCase() },
          select: { id: true },
        });
        const ticket = await this.prisma.supportTicket.create({
          data: {
            reference,
            userId: existing?.id,
            guestName: input.name,
            guestEmail: input.email.toLowerCase(),
            guestCompany: input.company,
            subject: input.subject.trim(),
            category: 'general',
            source: 'contact_form',
            messages: {
              create: {
                authorId: existing?.id,
                isStaff: false,
                body: input.body.trim() + (meta?.ipAddress ? `\n\n— trimis din formularul public (IP ${meta.ipAddress})` : ''),
              },
            },
          },
        });
        return ticket;
      } catch (e) {
        if ((e as Prisma.PrismaClientKnownRequestError).code === 'P2002' && attempt < 2) continue;
        throw e;
      }
    }
    throw new Error('Could not allocate a ticket reference');
  }

  async listForUser(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { assignedTo: { select: { name: true } }, _count: { select: { messages: true } } },
    });
  }

  async getForUser(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        messages: {
          where: { isInternal: false }, // clients never see internal notes
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Cererea nu a fost găsită.');
    return ticket;
  }

  async replyAsUser(userId: string, ticketId: string, body: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id: ticketId, userId } });
    if (!ticket) throw new NotFoundException('Cererea nu a fost găsită.');
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ForbiddenException('Cererea este închisă. Deschideți o cerere nouă.');
    }
    const [message] = await this.prisma.$transaction([
      this.prisma.ticketMessage.create({ data: { ticketId, authorId: userId, isStaff: false, body: body.trim() } }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        // a client reply re-opens a resolved ticket and clears "waiting on client"
        data: { status: ([TicketStatus.WAITING_CLIENT, TicketStatus.RESOLVED] as TicketStatus[]).includes(ticket.status) ? TicketStatus.OPEN : ticket.status },
      }),
    ]);
    return message;
  }

  // ---------------------------------------------------------------- staff side

  async staffList(staffId: string, q: StaffTicketQuery) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
    const where: Prisma.SupportTicketWhereInput = {};
    if (q.status && q.status !== 'ALL') where.status = q.status;
    if (q.assignedToId === 'me') where.assignedToId = staffId;
    else if (q.assignedToId === 'unassigned') where.assignedToId = null;
    else if (q.assignedToId) where.assignedToId = q.assignedToId;
    if (q.search) {
      where.OR = [
        { reference: { contains: q.search, mode: 'insensitive' } },
        { subject: { contains: q.search, mode: 'insensitive' } },
        { guestEmail: { contains: q.search, mode: 'insensitive' } },
        { user: { email: { contains: q.search, mode: 'insensitive' } } },
        { user: { company: { contains: q.search, mode: 'insensitive' } } },
      ];
    }
    const [items, total, counts] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: this.ticketInclude,
        orderBy: [{ status: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    return { items, total, page, limit, byStatus };
  }

  async staffGet(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        ...this.ticketInclude,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async staffReply(staffId: string, ticketId: string, body: string, opts?: { internal?: boolean; status?: TicketStatus }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const internal = Boolean(opts?.internal);
    const nextStatus = opts?.status
      ?? (internal ? ticket.status : TicketStatus.WAITING_CLIENT); // a visible staff reply waits on the client by default
    const data: Prisma.SupportTicketUpdateInput = {
      status: nextStatus,
      assignedTo: ticket.assignedToId ? undefined : { connect: { id: staffId } }, // first responder takes it
      firstResponseAt: ticket.firstResponseAt ?? (internal ? undefined : new Date()),
      resolvedAt: nextStatus === TicketStatus.RESOLVED ? new Date() : undefined,
      closedAt: nextStatus === TicketStatus.CLOSED ? new Date() : undefined,
    };
    const [message] = await this.prisma.$transaction([
      this.prisma.ticketMessage.create({ data: { ticketId, authorId: staffId, isStaff: true, isInternal: internal, body: body.trim() } }),
      this.prisma.supportTicket.update({ where: { id: ticketId }, data }),
    ]);
    await this.audit(staffId, internal ? 'TICKET_NOTE' : 'TICKET_REPLY', ticketId, { status: nextStatus });
    return message;
  }

  async staffUpdate(staffId: string, ticketId: string, patch: { status?: TicketStatus; priority?: TicketPriority; assignedToId?: string | null; category?: string }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (patch.assignedToId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: patch.assignedToId }, select: { role: true } });
      if (!assignee || !isStaffRole(assignee.role)) throw new ForbiddenException('Assignee must be a staff member');
    }
    const data: Prisma.SupportTicketUncheckedUpdateInput = {
      status: patch.status,
      priority: patch.priority,
      category: patch.category,
      assignedToId: patch.assignedToId === undefined ? undefined : patch.assignedToId,
      resolvedAt: patch.status === TicketStatus.RESOLVED ? new Date() : undefined,
      closedAt: patch.status === TicketStatus.CLOSED ? new Date() : undefined,
    };
    const updated = await this.prisma.supportTicket.update({ where: { id: ticketId }, data, include: this.ticketInclude });
    await this.audit(staffId, 'TICKET_UPDATED', ticketId, { from: { status: ticket.status, priority: ticket.priority, assignedToId: ticket.assignedToId }, to: patch });
    return updated;
  }

  async staffMembers() {
    return this.prisma.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  }
}
