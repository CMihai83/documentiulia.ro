/**
 * S-56 EXP mastery+credentials integration — throwaway postgres:15-alpine.
 * Gated by EXP_IT=1 (same flag as the S-55 spec).
 * DoD flow: scored sim run raises linked skills while practice does NOT →
 * quiz pass raises evidence + attempt immutable → credential issued, public
 * verify (no auth), tamper fails, revocation reported → profile aggregates +
 * reputation; public profile 404s with the flag off even when isPublic=true.
 */
import * as crypto from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { ExpertiseService } from './expertise.service';
import { MasteryService } from './mastery.service';
import { CredentialService } from './credential.service';
import { ProfileService } from './profile.service';

const RUN = process.env.EXP_IT === '1';
const d = RUN ? describe : describe.skip;

d('S-56 mastery + credentials integration', () => {
  let prisma: PrismaService;
  let expertise: ExpertiseService;
  let mastery: MasteryService;
  let credentials: CredentialService;
  let profiles: ProfileService;
  const userId = 'exp56-user';
  const reviewerId = 'exp56-reviewer';

  beforeAll(async () => {
    process.env.CREDENTIAL_SIGNING_KEY = crypto.randomBytes(32).toString('base64');
    delete process.env.EXPERT_PROFILES_PUBLIC;
    prisma = new PrismaService();
    await prisma.$connect();
    const audit = new AuditChainService(prisma);
    expertise = new ExpertiseService(prisma, audit);
    mastery = new MasteryService(prisma, audit, expertise);
    credentials = new CredentialService(prisma, audit);
    profiles = new ProfileService(prisma, audit);

    for (const [id, email] of [[userId, 'exp56@doc.ro'], [reviewerId, 'exp56r@doc.ro']] as const) {
      await prisma.user.upsert({ where: { id }, create: { id, email, name: id, password: 'x' }, update: {} });
    }
    await expertise.seed();
    await mastery.seedMastery();
    // clean slate for this user
    await prisma.userSkill.deleteMany({ where: { userId } });
    await prisma.credential.deleteMany({ where: { userId } });
    await prisma.assessmentAttempt.deleteMany({ where: { userId } });
    await prisma.expertProfile.deleteMany({ where: { userId } });
    await prisma.simV2Run.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('EXP-6: a SCORED run raises linked skills; a practice run does not', async () => {
    // practice runs never reach recordScoredRun (endRun gates on mode==='scored')
    const before = await prisma.userSkill.count({ where: { userId } });
    expect(before).toBe(0);

    const res = await mastery.recordScoredRun(userId, 'run-scored-1', 'services', 80);
    expect(res.assessedSkills).toBeGreaterThanOrEqual(2); // cash-flow + financial-management
    const after = await prisma.userSkill.findMany({ where: { userId }, include: { skill: true } });
    expect(after.every((s) => s.evidenceTier === 'assessed')).toBe(true);
    expect(after.some((s) => s.skill.escoUri.includes('cash-flow-management'))).toBe(true);
    // proficiency scaled: 80/100*5 = 4
    expect(after[0].proficiency).toBe(4);
    // NOTE: the practice-run guard lives in simv2.service.endRun (mode === 'scored'
    // branch only). Direct service calls model the scored path; the unit suite +
    // endRun code path cover the practice exclusion.
  });

  it('EXP-7: quiz pass raises evidence and the attempt is permanent (no mutation path)', async () => {
    const list = await mastery.listAssessments('http://data.europa.eu/esco/skill/ro-vat-tva');
    expect(list.length).toBeGreaterThan(0);
    const a = list[0];
    const served = await mastery.serveAssessment(a.id, 42, 5);
    expect((served.items[0] as any).correct).toBeUndefined(); // answers never served

    // build a perfect answer key from the seed (test knows the truth)
    const full = await prisma.skillAssessment.findUnique({ where: { id: a.id } });
    const items = full!.items as any[];
    const answers: Record<string, number> = {};
    for (const it of items) answers[it.id] = it.correct;

    const result = await mastery.submitAttempt(userId, a.id, answers, 42, 5);
    expect(result.passed).toBe(true);
    expect(result.scorePct).toBe(100);

    // evidence raised on the VAT skill
    const vat = await prisma.skill.findUnique({ where: { escoUri: 'http://data.europa.eu/esco/skill/ro-vat-tva' } });
    const us = await prisma.userSkill.findUnique({ where: { userId_skillId: { userId, skillId: vat!.id } } });
    expect(us?.evidenceTier).toBe('assessed');
    const kinds = (us?.evidence as any[]).map((e) => e.type);
    expect(kinds).toContain('auto_quiz');

    // immutability: service exposes no update/delete for attempts
    expect((mastery as any).updateAttempt).toBeUndefined();
    expect((mastery as any).deleteAttempt).toBeUndefined();
    const row = await prisma.assessmentAttempt.findUnique({ where: { id: result.attemptId } });
    expect(row?.passedAt).toBeTruthy();
  });

  it('EXP-7: anonymised peer review passes a work sample and raises to verified', async () => {
    const list = await mastery.listAssessments('http://data.europa.eu/esco/skill/business-planning');
    const ws = list.find((x) => x.kind === 'work_sample')!;
    expect(ws).toBeTruthy();
    const sub = await mastery.submitAttempt(userId, ws.id, { link: 1 } as any, 1, 5);
    expect((sub as any).pendingPeerReview).toBe(true);

    // self-review forbidden
    await expect(mastery.addPeerReview(userId, sub.attemptId, { clarity: 5 }, 90)).rejects.toThrow();

    const r = await mastery.addPeerReview(reviewerId, sub.attemptId, { clarity: 5, rigour: 4 }, 90);
    expect(r.aggregateScorePct).toBe(90);

    // reviewee-safe view: no reviewer identity anywhere
    const view = await mastery.attemptReviews(userId, sub.attemptId);
    expect(JSON.stringify(view)).not.toContain(reviewerId);
    expect((view.reviews[0] as any).reviewerRef).toBeUndefined();

    // skill raised to verified at aggregate>=pass
    const bp = await prisma.skill.findUnique({ where: { escoUri: 'http://data.europa.eu/esco/skill/business-planning' } });
    const us = await prisma.userSkill.findUnique({ where: { userId_skillId: { userId, skillId: bp!.id } } });
    expect(us?.evidenceTier).toBe('verified');
  });

  it('EXP-8: credential issued at mastery; public verify; tamper fails; revocation reported', async () => {
    // user holds ro-vat-tva at assessed/5 (from the perfect quiz) → claimable
    const cred = await credentials.claim(userId, 'http://data.europa.eu/esco/skill/ro-vat-tva');
    expect(cred.verifyCode).toBeTruthy();

    // PUBLIC verify — service path used by the guard-free controller
    const v = await credentials.verifyPublic(cred.verifyCode);
    expect(v.signatureValid).toBe(true);
    expect(v.status).toBe('valid');
    expect((v.credential as any).credentialSubject.achievement.alignment[0].targetFramework).toBe('ESCO');

    // tamper: mutate the stored vcJson → signature must fail
    const vc: any = cred.vcJson;
    vc.credentialSubject.achievement.name = 'Doctor în orice';
    await prisma.credential.update({ where: { id: cred.id }, data: { vcJson: vc } });
    const tampered = await credentials.verifyPublic(cred.verifyCode);
    expect(tampered.signatureValid).toBe(false);
    expect(tampered.status).toBe('signature_invalid');

    // revoke → reported
    await credentials.revoke(userId, cred.id);
    const revoked = await credentials.verifyPublic(cred.verifyCode);
    expect(revoked.revoked).toBe(true);
    expect(revoked.status).toBe('revoked');

    // europass export is ELM-shaped
    const eu = await credentials.europassExport(userId, cred.id);
    expect(eu.type).toBe('EuropeanDigitalCredential');
  });

  it('EXP-10: profile aggregates + reputation; public route 404s with the flag OFF even when opted in', async () => {
    await profiles.upsertProfile(userId, { headline: 'Expert TVA', bio: 'test' });
    const agg = await profiles.aggregate(userId);
    expect(agg.reputation.reputation).toBeGreaterThan(0);
    expect(agg.skills.length).toBeGreaterThan(0);

    // opt in — but the env flag is OFF, so public must still 404 (double gate)
    const vis = await profiles.setVisibility(userId, true);
    expect(vis.isPublic).toBe(true);
    expect(vis.publiclyVisible).toBe(false);
    await expect(profiles.publicProfile(userId)).rejects.toThrow(NotFoundException);

    // flag on + opt-in → public card, minimal fields
    process.env.EXPERT_PROFILES_PUBLIC = 'true';
    const pub = await profiles.publicProfile(userId);
    expect(pub.headline).toBe('Expert TVA');
    expect((pub as any).activity).toBeUndefined();
    delete process.env.EXPERT_PROFILES_PUBLIC;

    // consent trail exists for the visibility change
    const audit = await prisma.auditLog.findFirst({
      where: { userId, action: 'expertise.profile.visibility' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });
});
