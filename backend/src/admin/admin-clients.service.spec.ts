import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminClientsService } from './admin-clients.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminClientsService (REQ-049 staff back-office)', () => {
  let service: AdminClientsService;
  const prisma: any = {
    user: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}), groupBy: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    invoice: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([]), aggregate: jest.fn(), count: jest.fn() },
    supportTicket: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn() },
    errorLog: { findMany: jest.fn().mockResolvedValue([]) },
    organization: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [AdminClientsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(AdminClientsService);
  });

  it('writes an audit row attributed to the staff member on tier/role change', async () => {
    prisma.user.findUnique.mockResolvedValue({ tier: 'FREE', role: 'USER', email: 'c@x.ro' });
    prisma.user.update.mockResolvedValue({ id: 'c1', tier: 'PRO', role: 'USER' });
    const r = await service.update('staff1', 'c1', { tier: 'PRO' as any, reason: 'upgrade plătit' });
    expect(r.changed).toBe(true);
    const audit = prisma.auditLog.create.mock.calls[0][0].data;
    expect(audit.userId).toBe('staff1');
    expect(audit.action).toBe('ADMIN_CLIENT_UPDATED');
    expect(audit.entityId).toBe('c1');
    expect(audit.details.before.tier).toBe('FREE');
    expect(audit.details.after.tier).toBe('PRO');
    expect(audit.details.reason).toBe('upgrade plătit');
  });

  it('is a no-op (no audit) when nothing changes', async () => {
    prisma.user.findUnique.mockResolvedValue({ tier: 'PRO', role: 'USER', email: 'c@x.ro' });
    const r = await service.update('staff1', 'c1', { tier: 'PRO' as any });
    expect(r.changed).toBe(false);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('404s on an unknown client', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.get360('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('searches clients across email/name/company/CUI', async () => {
    prisma.user.findMany.mockResolvedValue([]); prisma.user.count.mockResolvedValue(0);
    await service.list({ search: 'RO123' });
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.OR.map((o: any) => Object.keys(o)[0])).toEqual(['email', 'name', 'company', 'cui']);
  });
});
