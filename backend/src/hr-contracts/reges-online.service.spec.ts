import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RegesOnlineService } from './reges-online.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RegesOnlineService (REQ-047)', () => {
  let service: RegesOnlineService;
  let fetchMock: jest.Mock;

  const env: Record<string, string> = {
    REGES_USERNAME: 'api-user',
    REGES_PASSWORD: 'api-pass',
    REGES_API_URL: 'https://api.dev.inspectiamuncii.org',
    REGES_SSO_TOKEN_URL: 'https://sso.dev.inspectiamuncii.org/realms/API/protocol/openid-connect/token',
  };

  const contract = {
    id: 'contract-123456789',
    userId: 'u1',
    employeeId: 'emp-1',
    startDate: new Date('2026-08-03'), // a Monday
    endDate: null,
    salary: 5500,
    workHours: 40,
    signedAt: new Date('2026-07-20'),
    createdAt: new Date('2026-07-19'),
    employee: { cnp: '1900101223344', firstName: 'Ion', lastName: 'Popescu' },
  };

  const prismaMock = {
    hRContract: {
      findUnique: jest.fn().mockResolvedValue(contract),
      findMany: jest.fn().mockResolvedValue([contract]),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    fetchMock = jest.fn()
      // token
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ access_token: 'tok-1', expires_in: 300 }),
        text: async () => '',
      } as any)
      // api call
      .mockResolvedValue({
        ok: true, status: 200,
        json: async () => ({ ok: true }),
        text: async () => JSON.stringify({ receivedMessageId: 'x' }),
      } as any);
    global.fetch = fetchMock as any;

    const module = await Test.createTestingModule({
      providers: [
        RegesOnlineService,
        { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(RegesOnlineService);
  });

  it('reports configured status with dev URLs', () => {
    const st = service.status();
    expect(st.configured).toBe(true);
    expect(st.apiUrl).toContain('api.dev.inspectiamuncii.org');
  });

  it('authenticates via Keycloak password grant and caches the token', async () => {
    await service.submitContractOperation('AdaugareContract', { numarContract: '1' });
    await service.submitContractOperation('ModificareContract', { numarContract: '1' });
    const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('openid-connect/token'));
    expect(tokenCalls).toHaveLength(1); // cached on second call
    const body = String(tokenCalls[0][1].body);
    expect(body).toContain('grant_type=password');
    expect(body).toContain('client_id=reges-api');
    expect(body).toContain('username=api-user');
  });

  it('wraps contract operations in the official Message envelope', async () => {
    const res = await service.submitContractOperation('AdaugareContract', { numarContract: '9022' });
    expect(res.submitted).toBe(true);
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/api/Contract'));
    const payload = JSON.parse(call[1].body);
    expect(payload.$type).toBe('contract');
    expect(payload.header.operation).toBe('AdaugareContract');
    expect(payload.header.clientApplication).toBe('DocumentIulia');
    expect(payload.header.version).toBe('5');
    expect(payload.header.messageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.continut.$type).toBe('continutContract');
    expect(payload.continut.numarContract).toBe('9022');
  });

  it('maps an HRContract onto continutContract and records the submission', async () => {
    const res = await service.registerContractById('contract-123456789', { corCod: 251204 });
    expect(res.submitted).toBe(true);
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/api/Contract'));
    const payload = JSON.parse(call[1].body);
    expect(payload.continut.cor.cod).toBe(251204);
    expect(payload.continut.salariu).toBe(5500);
    expect(payload.continut.tipDurata).toBe('Nedeterminata');
    expect(payload.continut.timpMunca.norma).toBe('NormaIntreaga840');
    expect(prismaMock.hRContract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revisalSubmitted: true, revisalStatus: 'REGES_SUBMITTED' }),
      }),
    );
  });

  it('rejects contract registration without a COR code', async () => {
    await expect(service.registerContractById('contract-123456789')).rejects.toThrow(/COR/);
  });

  it('deadline is the CALENDAR day before start (Monday start -> Sunday)', () => {
    const deadline = service.registrationDeadline(new Date('2026-08-03T09:00:00')); // Monday
    expect(deadline.getDay()).toBe(0); // Sunday
    expect(deadline.getDate()).toBe(2);
    expect(service.isRegistrationOverdue(new Date('2026-08-03'), new Date('2026-08-03T08:00:00'))).toBe(true);
    expect(service.isRegistrationOverdue(new Date('2026-08-03'), new Date('2026-08-01T08:00:00'))).toBe(false);
  });

  it('deadline alerts flag unsubmitted contracts with fine exposure', async () => {
    const alerts = await service.deadlineAlerts('u1', new Date('2026-08-04T10:00:00'));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('OVERDUE');
    expect(alerts[0].fineRisk).toContain('20.000 lei');
    expect(alerts[0].employee).toBe('Ion Popescu');
  });

  it('surfaces a clear error when credentials are missing', async () => {
    const module = await Test.createTestingModule({
      providers: [
        RegesOnlineService,
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    const unconfigured = module.get(RegesOnlineService);
    expect(unconfigured.status().configured).toBe(false);
    await expect(unconfigured.submitContractOperation('AdaugareContract', {})).rejects.toThrow(/REGES_USERNAME/);
  });
});
