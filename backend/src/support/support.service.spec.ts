import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportService } from './support.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SupportService (REQ-049 client requests)', () => {
  let service: SupportService;
  const prisma: any = {
    supportTicket: { count: jest.fn(), create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), groupBy: jest.fn() },
    ticketMessage: { create: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [SupportService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(SupportService);
  });

  it('creates a ticket with a yearly reference and an audit row', async () => {
    prisma.supportTicket.count.mockResolvedValue(41);
    prisma.supportTicket.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 't1', ...data }));
    const t = await service.createForUser('u1', { subject: ' Factura nu se trimite ', body: 'Eroare la SPV' });
    expect(t.reference).toBe(`REQ-${new Date().getFullYear()}-000042`);
    expect(t.subject).toBe('Factura nu se trimite');
    expect(prisma.supportTicket.create.mock.calls[0][0].data.messages.create.isStaff).toBe(false);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'TICKET_CREATED', userId: 'u1' }) }));
  });

  it('scopes client reads to the requesting user (no cross-tenant access)', async () => {
    prisma.supportTicket.findFirst.mockResolvedValue(null);
    await expect(service.getForUser('u-victim', 't-other')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.supportTicket.findFirst.mock.calls[0][0].where).toEqual({ id: 't-other', userId: 'u-victim' });
  });

  it('hides internal staff notes from the client thread', async () => {
    prisma.supportTicket.findFirst.mockResolvedValue({ id: 't1', messages: [] });
    await service.getForUser('u1', 't1');
    expect(prisma.supportTicket.findFirst.mock.calls[0][0].include.messages.where).toEqual({ isInternal: false });
  });

  it('refuses client replies on a CLOSED ticket and re-opens a RESOLVED one', async () => {
    prisma.supportTicket.findFirst.mockResolvedValue({ id: 't1', status: 'CLOSED' });
    await expect(service.replyAsUser('u1', 't1', 'hi')).rejects.toBeInstanceOf(ForbiddenException);

    prisma.supportTicket.findFirst.mockResolvedValue({ id: 't1', status: 'RESOLVED' });
    prisma.ticketMessage.create.mockResolvedValue({ id: 'm1' });
    prisma.supportTicket.update.mockResolvedValue({});
    await service.replyAsUser('u1', 't1', 'still broken');
    expect(prisma.supportTicket.update.mock.calls[0][0].data.status).toBe('OPEN');
  });

  it('a visible staff reply waits on the client and assigns the first responder', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({ id: 't1', status: 'OPEN', assignedToId: null, firstResponseAt: null });
    prisma.ticketMessage.create.mockResolvedValue({ id: 'm2' });
    prisma.supportTicket.update.mockResolvedValue({});
    await service.staffReply('staff1', 't1', 'Am verificat, reîncercați.');
    const data = prisma.supportTicket.update.mock.calls[0][0].data;
    expect(data.status).toBe('WAITING_CLIENT');
    expect(data.assignedTo).toEqual({ connect: { id: 'staff1' } });
    expect(data.firstResponseAt).toBeInstanceOf(Date);
  });

  it('rejects assigning a ticket to a non-staff user', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({ id: 't1', status: 'OPEN' });
    prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    await expect(service.staffUpdate('staff1', 't1', { assignedToId: 'u-plain' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('attaches a contact-form ticket to an existing account by e-mail', async () => {
    prisma.supportTicket.count.mockResolvedValue(0);
    prisma.user.findUnique.mockResolvedValue({ id: 'u-existing' });
    prisma.supportTicket.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 't9', ...data }));
    const t = await service.createForGuest({ name: 'Ana', email: 'ANA@firma.ro', subject: 'Ofertă', body: 'Vreau detalii' });
    expect(t.userId).toBe('u-existing');
    expect(t.guestEmail).toBe('ana@firma.ro');
    expect(t.source).toBe('contact_form');
  });
});
