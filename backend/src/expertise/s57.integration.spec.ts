/**
 * S-57 integration — coaching, marketplace lifecycle, funds auto-refresh.
 * Gated by S57_IT=1 so it never runs in the normal unit sweep.
 * AI-1 is tested against a LOCAL node:http mock server — never live gov sites.
 */
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { ExpertiseService } from './expertise.service';
import { ProfileService } from './profile.service';
import { MarketplaceService } from './marketplace.service';
import { FundsRefreshService } from '../funds/funds-refresh.service';
import { computeReputation } from './reputation.logic';

const RUN = process.env.S57_IT === '1';
const d = RUN ? describe : describe.skip;

d('S-57 integration', () => {
  let prisma: PrismaClient;
  let audit: AuditChainService;
  let expertise: ExpertiseService;
  let profiles: ProfileService;
  let marketplace: MarketplaceService;
  let refresh: FundsRefreshService;
  let expertId: string;
  let clientId: string;
  let nonOptedId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    const svc = prisma as unknown as PrismaService;
    audit = new AuditChainService(svc as any);
    expertise = new ExpertiseService(svc as any, audit);
    profiles = new ProfileService(svc as any, audit);
    marketplace = new MarketplaceService(svc as any, audit, expertise, profiles);
    refresh = new FundsRefreshService(svc as any, audit);

    // seed skills/occupations via the existing seeder
    await expertise.seed();

    const mk = (email: string) =>
      prisma.user.create({ data: { email, password: 'x', name: email.split('@')[0] } });
    expertId = (await mk('s57-expert@it.ro')).id;
    clientId = (await mk('s57-client@it.ro')).id;
    nonOptedId = (await mk('s57-hidden@it.ro')).id;
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('EXP-11: coach returns suggestions ranked by readiness×demand with indicative salaries', async () => {
    const res = await marketplace.coach(clientId);
    expect(res.suggestions.length).toBeGreaterThanOrEqual(3);
    const scores = res.suggestions.map((s) => s.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(res.suggestions.some((s) => s.salary?.source.includes('indicative'))).toBe(true);
    expect(res.note).toContain('orientative');
  }, 30000);

  it('EXP-12: only opted-in experts are listed (consent-logged), non-opted absent', async () => {
    await marketplace.setMarketplaceOptIn(expertId, { optIn: true, hourlyRateEur: 80, sessionTypes: ['mentoring'] });
    await profiles.upsertProfile(nonOptedId, { headline: 'hidden expert' }); // has a profile, no opt-in
    const res = await marketplace.search();
    const ids = res.experts.map((e) => e.expertUserId);
    expect(ids).toContain(expertId);
    expect(ids).not.toContain(nonOptedId);
    // consent audit entry exists
    const consent = await prisma.auditLog.findFirst({
      where: { userId: expertId, action: 'expertise.marketplace.opt' },
    });
    expect(consent).toBeTruthy();
  }, 30000);

  it('EXP-12: book → confirm → complete → rate moves reputation to the exact computed value; self-booking rejected', async () => {
    await expect(
      marketplace.book(expertId, { expertUserId: expertId, sessionType: 'mentoring', scheduledAt: '2027-01-04T10:00:00Z' }),
    ).rejects.toThrow(/cannot book yourself/i);

    const eng = await marketplace.book(clientId, {
      expertUserId: expertId,
      sessionType: 'mentoring',
      scheduledAt: '2027-01-04T10:00:00Z',
    });
    expect(eng.status).toBe('requested');
    expect(eng.paymentStatus).toBe('pending_hold'); // honest placeholder

    // the booked hour disappears from availability (2027-01-04 is winter EET,
    // UTC+2 -> the local 09-17 window is 07:00Z..15:00Z; 10:00Z = 12:00 local)
    const slots = await marketplace.slots(expertId, '2027-01-04');
    const starts = slots.slots.map((s) => s.startsAt);
    expect(starts[0]).toBe('2027-01-04T07:00:00.000Z'); // winter window start
    expect(starts).not.toContain('2027-01-04T10:00:00.000Z'); // booked slot gone
    expect(starts).toHaveLength(7); // 8 business hours minus the booking

    await expect(marketplace.transition(clientId, eng.id, 'confirm')).rejects.toThrow(/only the expert/i);
    await marketplace.transition(expertId, eng.id, 'confirm');
    await marketplace.transition(expertId, eng.id, 'complete');

    const rated = await marketplace.rate(clientId, eng.id, 5, 'excelent');
    // exact determinism: recompute expected reputation from the DB state
    const [skills, creds, engs] = await Promise.all([
      prisma.userSkill.findMany({ where: { userId: expertId } }),
      prisma.credential.count({ where: { userId: expertId, revoked: false } }),
      prisma.expertEngagement.findMany({ where: { expertUserId: expertId, status: 'completed', rating: { not: null } } }),
    ]);
    const expected = computeReputation({
      skills: skills.map((s) => ({ evidenceTier: s.evidenceTier, proficiency: s.proficiency })),
      activeCredentials: creds,
      peerReviewScores: [],
      simComposites: [],
      engagementRatings: engs.map((e) => e.rating as number),
    }).reputation;
    expect(rated.expertReputation).toBe(expected);
    await expect(marketplace.rate(clientId, eng.id, 4)).rejects.toThrow(/already rated/i);
  }, 30000);

  it('AI-1: refresh vs a LOCAL mock server — pending revisions, no auto-apply, approve applies + audit, idempotent, one failure does not stop the sweep', async () => {
    // local mock: /closed returns a changed page; /boom returns 500
    const server: Server = createServer((req, res) => {
      if (req.url === '/closed') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><p>Apel închis din 15.03.2026. Buget total 25 milioane EUR.</p></body></html>');
      } else {
        res.writeHead(500);
        res.end('boom');
      }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as AddressInfo).port;

    const progA = await prisma.fundingProgram.create({
      data: {
        name: 'S57 IT Program A', authority: 'test', purpose: 'test', beneficiaryType: 'SMEs',
        sizeEligibility: ['micro'], legalBasis: 'de_minimis', status: 'open',
        ceilingEur: 100000, closesAt: new Date('2026-01-01T00:00:00Z'),
        caenWhitelist: [], caenBlacklist: [], regions: [],
        sourceUrl: `http://127.0.0.1:${port}/closed`,
      },
    });
    const progB = await prisma.fundingProgram.create({
      data: {
        name: 'S57 IT Program B (failing url)', authority: 'test', purpose: 'test', beneficiaryType: 'SMEs',
        sizeEligibility: ['micro'], legalBasis: 'de_minimis', status: 'open',
        caenWhitelist: [], caenBlacklist: [], regions: [],
        sourceUrl: `http://127.0.0.1:${port}/boom`,
      },
    });

    try {
      const first = await refresh.refreshAll();
      expect(first.failures).toBeGreaterThanOrEqual(1); // B failed, sweep continued
      const pending = await prisma.fundingProgramRevision.findMany({ where: { programId: progA.id } });
      expect(pending).toHaveLength(1);
      const changes = pending[0].proposedChanges as any[];
      expect(changes.map((c) => c.field).sort()).toEqual(['ceilingEur', 'closesAt', 'status']);

      // NOTHING auto-applied
      const before = await prisma.fundingProgram.findUnique({ where: { id: progA.id } });
      expect(before!.status).toBe('open');
      expect(before!.ceilingEur).toBe(100000);

      // idempotent re-fetch: same content → no duplicate revision
      const second = await refresh.refreshAll();
      expect(second.revisionsCreated).toBe(0);
      expect(await prisma.fundingProgramRevision.count({ where: { programId: progA.id } })).toBe(1);

      // approve applies + audit entry
      await refresh.approve(pending[0].id, clientId);
      const after = await prisma.fundingProgram.findUnique({ where: { id: progA.id } });
      expect(after!.status).toBe('closed');
      expect(after!.ceilingEur).toBe(25_000_000);
      expect(after!.closesAt!.toISOString().slice(0, 10)).toBe('2026-03-15');
      const auditRow = await prisma.auditLog.findFirst({ where: { action: 'funds.revision.approve', entityId: progA.id } });
      expect(auditRow).toBeTruthy();

      // approving twice is refused
      await expect(refresh.approve(pending[0].id, clientId)).rejects.toThrow(/already/i);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
      await prisma.fundingProgramRevision.deleteMany({ where: { programId: { in: [progA.id, progB.id] } } });
      await prisma.fundingProgram.deleteMany({ where: { id: { in: [progA.id, progB.id] } } });
    }
  }, 60000);
});
