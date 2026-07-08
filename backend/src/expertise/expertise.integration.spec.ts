/**
 * EXP integration — runs against a throwaway postgres:15-alpine.
 * Gated by EXP_IT=1 so it never runs in the normal unit sweep.
 * Verifies the DoD flow: import seed → a user gains a `course`-tier skill from an
 * LMS completion → gap vs a target occupation returns essential-first ranked gaps →
 * path builder emits a prerequisite-respecting sequence with duration → consent
 * logged per skill write.
 */
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { ExpertiseService } from './expertise.service';

const RUN = process.env.EXP_IT === '1';
const d = RUN ? describe : describe.skip;

d('EXP integration', () => {
  let prisma: PrismaService;
  let svc: ExpertiseService;
  const userId = 'exp-it-user';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    svc = new ExpertiseService(prisma, new AuditChainService(prisma));

    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: 'exp-it@doc.ro', name: 'EXP IT', password: 'x' },
      update: {},
    });
    // clean slate
    await prisma.userSkill.deleteMany({ where: { userId } });
    await prisma.learningPathStep.deleteMany({ where: { path: { userId } } });
    await prisma.learningPath.deleteMany({ where: { userId } });
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it('EXP-1: import seed is idempotent and preserves hierarchy', async () => {
    const first = await svc.seed();
    expect(first.skills).toBeGreaterThan(10);
    const skillCount1 = await prisma.skill.count();
    await svc.seed(); // re-import
    const skillCount2 = await prisma.skill.count();
    expect(skillCount2).toBe(skillCount1); // idempotent, no dupes
    const vat = await prisma.skill.findUnique({ where: { escoUri: 'http://data.europa.eu/esco/skill/ro-vat-tva' } });
    expect(vat?.parentUri).toBe('http://data.europa.eu/esco/skill/tax-legislation'); // hierarchy kept
  });

  it('EXP-2: an LMS completion auto-raises a matching skill to the course tier + consent-logged', async () => {
    const course = await prisma.lMSCourse.create({
      data: { title: 'TVA în practică', slug: `tva-${Date.now()}`, description: 'VAT', category: 'ACCOUNTING' as any, duration: 90, tags: ['TVA'] },
    });
    const auditBefore = await prisma.auditLog.count({ where: { userId } }).catch(() => 0);
    const res = await svc.inferFromLmsCompletion(userId, course.id);
    expect(res.matchedSkills).toBeGreaterThanOrEqual(1);
    const us = await prisma.userSkill.findFirst({ where: { userId, skill: { escoUri: 'http://data.europa.eu/esco/skill/ro-vat-tva' } } });
    expect(us?.evidenceTier).toBe('course');
    // consent logged
    const auditAfter = await prisma.auditLog.count({ where: { userId } }).catch(() => 0);
    expect(auditAfter).toBeGreaterThan(auditBefore);
  });

  it('EXP-2: evidence tier only raises, never downgrades', async () => {
    const skill = await prisma.skill.findUniqueOrThrow({ where: { escoUri: 'http://data.europa.eu/esco/skill/ro-vat-tva' } });
    await svc.setUserSkill(userId, skill.id, 4, 'assessed'); // raise to assessed
    await svc.setUserSkill(userId, skill.id, 2, 'self_declared'); // attempt downgrade
    const us = await prisma.userSkill.findUnique({ where: { userId_skillId: { userId, skillId: skill.id } } });
    expect(us?.evidenceTier).toBe('assessed'); // stayed at the higher tier
    expect(us?.proficiency).toBe(4); // proficiency also only raises
  });

  it('EXP-3: gap vs Contabil is essential-first and links resources', async () => {
    const gap = await svc.analyseGapForOccupation(userId, 'http://data.europa.eu/esco/occupation/accountant');
    expect(gap.occupation).toBe('Contabil');
    expect(gap.gaps.length).toBeGreaterThan(0);
    // all essential gaps precede any optional gap
    const firstOptional = gap.gaps.findIndex((g: any) => g.relation === 'optional');
    const lastEssential = gap.gaps.map((g: any) => g.relation).lastIndexOf('essential');
    if (firstOptional !== -1) expect(lastEssential).toBeLessThan(firstOptional);
    expect(gap.radar.length).toBeGreaterThan(0);
    expect(typeof gap.readiness).toBe('number');
  });

  it('EXP-5: path respects prerequisites (parent skill before child) and has a duration', async () => {
    const path = await svc.buildMasteryPath(userId, 'http://data.europa.eu/esco/occupation/accountant', 'standard');
    expect(path.steps.length).toBeGreaterThan(0);
    expect(path.estTotalMinutes).toBeGreaterThan(0);
    // SAF-T (child of VAT) must not appear before VAT if both are gaps
    const orderBySkill = new Map<string, number>();
    for (const s of path.steps) if (!orderBySkill.has(s.skillId!)) orderBySkill.set(s.skillId!, s.order);
    const vat = await prisma.skill.findUniqueOrThrow({ where: { escoUri: 'http://data.europa.eu/esco/skill/ro-vat-tva' } });
    const saft = await prisma.skill.findUniqueOrThrow({ where: { escoUri: 'http://data.europa.eu/esco/skill/ro-saft-d406' } });
    if (orderBySkill.has(vat.id) && orderBySkill.has(saft.id)) {
      expect(orderBySkill.get(vat.id)!).toBeLessThan(orderBySkill.get(saft.id)!);
    }
  });
});
