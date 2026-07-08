import { MarketplaceService } from './marketplace.service';

const prismaEmpty = { expertEngagement: { findMany: async () => [] } } as any;

describe('marketplace slots — Europe/Bucharest window (DST-correct)', () => {
  const svc = new MarketplaceService(prismaEmpty, undefined as any, undefined as any, undefined as any);

  it('summer date (EEST, UTC+3): local 09-17 => 06:00Z..13:00Z starts', async () => {
    const r = await svc.slots('x', '2026-07-15'); // Wednesday, summer
    expect(r.timezone).toBe('Europe/Bucharest');
    expect(r.slots[0].startsAt).toBe('2026-07-15T06:00:00.000Z');
    expect(r.slots[r.slots.length - 1].startsAt).toBe('2026-07-15T13:00:00.000Z');
    expect(r.slots).toHaveLength(8);
    expect(r.slots[0].localHour).toBe(9);
  });

  it('winter date (EET, UTC+2): local 09-17 => 07:00Z..14:00Z starts', async () => {
    const r = await svc.slots('x', '2027-01-04'); // Monday, winter
    expect(r.slots[0].startsAt).toBe('2027-01-04T07:00:00.000Z');
    expect(r.slots[r.slots.length - 1].startsAt).toBe('2027-01-04T14:00:00.000Z');
    expect(r.slots).toHaveLength(8);
  });

  it('weekends return no slots', async () => {
    const r = await svc.slots('x', '2026-07-18'); // Saturday
    expect(r.slots).toHaveLength(0);
  });

  it('offset helper: DST boundary is derived from the scheduled date', () => {
    expect(MarketplaceService.bucharestOffsetHours(new Date('2026-07-15T12:00:00Z'))).toBe(3);
    expect(MarketplaceService.bucharestOffsetHours(new Date('2027-01-04T12:00:00Z'))).toBe(2);
  });
});
