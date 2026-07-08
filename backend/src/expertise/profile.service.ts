import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { computeReputation } from './reputation.logic';

/**
 * EXP-10 — expert profile + reputation. PRIVATE BY DEFAULT.
 *
 * Public exposure is DOUBLE-GATED (GDPR / DPO requirement):
 *   1. the user must explicitly opt in (isPublic=true, consent-logged), AND
 *   2. the EXPERT_PROFILES_PUBLIC env flag must be 'true' — it stays OFF at
 *      deploy until the DPO review clears public profiles for go-live.
 * With either gate closed, the public route 404s.
 */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
  ) {}

  private publicFlagOn(): boolean {
    return process.env.EXPERT_PROFILES_PUBLIC === 'true';
  }

  async upsertProfile(userId: string, dto: { headline?: string; bio?: string }) {
    const saved = await this.prisma.expertProfile.upsert({
      where: { userId },
      create: { userId, headline: dto.headline ?? '', bio: dto.bio ?? '' },
      update: { headline: dto.headline, bio: dto.bio },
    });
    await this.audit
      .appendAudit({ userId, action: 'expertise.profile.update', entity: 'ExpertProfile', entityId: saved.id, details: { fields: Object.keys(dto) } })
      .catch((e) => this.logger.warn(`audit failed: ${e?.message}`));
    return saved;
  }

  /** Explicit opt-in/out for public visibility — consent-logged (GDPR). */
  async setVisibility(userId: string, isPublic: boolean) {
    const saved = await this.prisma.expertProfile.upsert({
      where: { userId },
      create: { userId, isPublic },
      update: { isPublic },
    });
    await this.audit
      .appendAudit({
        userId,
        action: 'expertise.profile.visibility',
        entity: 'ExpertProfile',
        entityId: saved.id,
        details: { isPublic, consent: isPublic ? 'explicit_opt_in' : 'withdrawn', note: 'public go-live additionally gated by EXPERT_PROFILES_PUBLIC + DPO review' },
      })
      .catch((e) => this.logger.warn(`audit failed: ${e?.message}`));
    return { isPublic: saved.isPublic, publiclyVisible: saved.isPublic && this.publicFlagOn() };
  }

  /** Recompute and persist the reputation score; returns the full aggregate. */
  async aggregate(userId: string) {
    const [skills, credentials, attempts, runs, profile, ratedEngagements] = await Promise.all([
      this.prisma.userSkill.findMany({ where: { userId }, include: { skill: true } }),
      this.prisma.credential.findMany({ where: { userId } }),
      this.prisma.assessmentAttempt.findMany({ where: { userId }, include: { peerReviews: true, assessment: { select: { title: true } } } }),
      this.prisma.simV2Run.findMany({ where: { userId, mode: 'scored', status: 'ended' }, select: { scoreJson: true, updatedAt: true } }),
      this.prisma.expertProfile.findUnique({ where: { userId } }),
      // S-57 EXP-12: client ratings on completed marketplace engagements
      this.prisma.expertEngagement.findMany({ where: { expertUserId: userId, status: 'completed', rating: { not: null } }, select: { rating: true } }),
    ]);

    const peerReviewScores = attempts.flatMap((a) => a.peerReviews.map((r) => r.scorePct));
    const simComposites = runs
      .map((r) => (r.scoreJson as any)?.composite)
      .filter((c: any) => typeof c === 'number');

    const breakdown = computeReputation({
      skills: skills.map((s) => ({ evidenceTier: s.evidenceTier, proficiency: s.proficiency })),
      activeCredentials: credentials.filter((c) => !c.revoked).length,
      peerReviewScores,
      simComposites,
      engagementRatings: ratedEngagements.map((e) => e.rating as number),
    });

    const saved = await this.prisma.expertProfile.upsert({
      where: { userId },
      create: { userId, reputationScore: breakdown.reputation },
      update: { reputationScore: breakdown.reputation },
    });

    // Activity feed from existing events (newest first)
    const activity = [
      ...credentials.map((c) => ({ at: c.issuedAt, kind: 'credential', label: (c.vcJson as any)?.credentialSubject?.achievement?.name ?? 'Credential' })),
      ...attempts.filter((a) => a.passed).map((a) => ({ at: a.passedAt ?? a.createdAt, kind: 'assessment_passed', label: a.assessment?.title ?? 'Assessment' })),
      ...runs.slice(0, 5).map((r) => ({ at: r.updatedAt, kind: 'sim_run', label: `Simulare scor ${(r.scoreJson as any)?.composite ?? '?'}` })),
    ]
      .sort((a, b) => new Date(b.at as any).getTime() - new Date(a.at as any).getTime())
      .slice(0, 20);

    return {
      profile: { headline: saved.headline, bio: saved.bio, isPublic: saved.isPublic, publiclyVisible: saved.isPublic && this.publicFlagOn() },
      reputation: breakdown,
      skills: skills.map((s) => ({ label: s.skill.preferredLabel, escoUri: s.skill.escoUri, proficiency: s.proficiency, evidenceTier: s.evidenceTier })),
      credentials: credentials.map((c) => ({ id: c.id, verifyCode: c.verifyCode, revoked: c.revoked, issuedAt: c.issuedAt, name: (c.vcJson as any)?.credentialSubject?.achievement?.name })),
      endorsements: (saved.endorsements as any[]) ?? [],
      activity,
    };
  }

  /**
   * PUBLIC profile view — 404 unless BOTH gates are open (user opt-in AND the
   * EXPERT_PROFILES_PUBLIC flag). Never returns email/ids beyond the slug used.
   */
  async publicProfile(userId: string) {
    if (!this.publicFlagOn()) throw new NotFoundException('Not found');
    const profile = await this.prisma.expertProfile.findUnique({ where: { userId } });
    if (!profile || !profile.isPublic) throw new NotFoundException('Not found');
    const agg = await this.aggregate(userId);
    // public card: no internal ids, no activity timestamps beyond what's shown
    return {
      headline: agg.profile.headline,
      bio: agg.profile.bio,
      reputation: agg.reputation.reputation,
      skills: agg.skills.filter((s) => s.evidenceTier === 'assessed' || s.evidenceTier === 'verified'),
      credentials: agg.credentials.filter((c) => !c.revoked).map((c) => ({ name: c.name, verifyCode: c.verifyCode })),
    };
  }

  /** Endorse another user's skill (consent-logged; endorser recorded by ref only). */
  async endorse(endorserUserId: string, targetUserId: string, skillUri: string, note?: string) {
    if (endorserUserId === targetUserId) throw new NotFoundException('Cannot endorse yourself');
    const profile = await this.prisma.expertProfile.upsert({
      where: { userId: targetUserId },
      create: { userId: targetUserId },
      update: {},
    });
    const entry = { skillUri, note: note?.slice(0, 200) ?? '', at: new Date().toISOString() };
    const endorsements = [...(((profile.endorsements as any[]) ?? [])), entry];
    await this.prisma.expertProfile.update({ where: { userId: targetUserId }, data: { endorsements: endorsements as any } });
    await this.audit
      .appendAudit({ userId: endorserUserId, action: 'expertise.profile.endorse', entity: 'ExpertProfile', entityId: profile.id, details: { targetUserId, skillUri } })
      .catch(() => undefined);
    return { endorsements: endorsements.length };
  }
}
