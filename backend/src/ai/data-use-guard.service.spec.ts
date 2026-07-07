import { ForbiddenException } from '@nestjs/common';
import { DataUseGuardService } from './data-use-guard.service';

describe('DataUseGuardService (GI-AI-2 · Art 28(10))', () => {
  const makePrisma = (authorized: boolean | null) =>
    ({
      organization: {
        findUnique: jest.fn().mockResolvedValue(authorized === null ? null : { aiTrainingAuthorized: authorized }),
        update: jest.fn().mockResolvedValue({}),
      },
    }) as any;

  it('throws when the org has not authorised', async () => {
    const svc = new DataUseGuardService(makePrisma(false));
    await expect(svc.assertTrainingAllowed('org1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when the org is missing', async () => {
    const svc = new DataUseGuardService(makePrisma(null));
    await expect(svc.assertTrainingAllowed('org1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when no org context', async () => {
    const svc = new DataUseGuardService(makePrisma(false));
    await expect(svc.assertTrainingAllowed('')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows when authorised', async () => {
    const svc = new DataUseGuardService(makePrisma(true));
    await expect(svc.assertTrainingAllowed('org1')).resolves.toBeUndefined();
    expect(await svc.isTrainingAllowed('org1')).toBe(true);
  });

  it('scrubForCalibration strips person-level fields, keeps aggregates', () => {
    const svc = new DataUseGuardService(makePrisma(true));
    const scrubbed = svc.scrubForCalibration({
      revenue: 100000,
      headcount: 12,
      employees: [{ name: 'Ion', cnp: '1960623086543', salary: 5000, role: 'dev' }],
      customer: { email: 'a@b.ro', totalOrders: 8 },
    });
    expect(scrubbed.revenue).toBe(100000);
    expect(scrubbed.headcount).toBe(12);
    expect(scrubbed.employees[0].role).toBe('dev');
    expect(scrubbed.employees[0].name).toBeUndefined();
    expect(scrubbed.employees[0].cnp).toBeUndefined();
    expect(scrubbed.employees[0].salary).toBeUndefined();
    expect(scrubbed.customer.email).toBeUndefined();
    expect(scrubbed.customer.totalOrders).toBe(8);
  });
});
