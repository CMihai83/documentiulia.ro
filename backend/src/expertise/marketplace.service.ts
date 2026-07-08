import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { ExpertiseService } from './expertise.service';
import { ProfileService } from './profile.service';
import { readiness } from './gap.logic';
import { rankCareerMoves, RO_OCCUPATION_DEMAND } from './coaching.logic';

const SESSION_TYPES = ['mentoring', 'business_plan_review', 'sim_debrief'] as const;

/**
 * S-57 — EXP-11 career coaching + EXP-12 expert-for-hire marketplace.
 *
 * Marketplace visibility is CONSENT-BASED and separate from the S-56 public
 * profile: an expert appears to other authenticated PRO users ONLY after an
 * explicit, withdrawable marketplaceOptIn (both directions consent-logged).
 * paymentStatus is an honest placeholder — no live payments until Stripe lands.
 */
@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
    private readonly expertise: ExpertiseService,
    private readonly profiles: ProfileService,
  ) {}

  // ---------------- EXP-11: career coaching ----------------

  async coach(userId: string) {
    const [occupations, current] = await Promise.all([
      this.prisma.occupation.findMany({ select: { escoUri: true, label: true } }),
      this.expertise.currentSkills(userId),
    ]);
    const entries = [] as { escoUri: string; label: string; readiness: number }[];
    for (const occ of occupations) {
      const { required } = await this.expertise.requiredForOccupation(occ.escoUri);
      entries.push({ escoUri: occ.escoUri, label: occ.label, readiness: readiness(required, current) });
    }
    const suggestions = rankCareerMoves(entries, RO_OCCUPATION_DEMAND);
    return {
      suggestions,
      note: 'Salariile sunt estimări orientative (2025-26), nu date live. / Salary ranges are indicative estimates, not live data.',
    };
  }

  // ---------------- EXP-12: marketplace opt-in (consent) ----------------

  async setMarketplaceOptIn(
    userId: string,
    dto: { optIn: boolean; hourlyRateEur?: number; sessionTypes?: string[] },
  ) {
    const sessionTypes = (dto.sessionTypes ?? []).filter((t) => (SESSION_TYPES as readonly string[]).includes(t));
    const saved = await this.prisma.expertProfile.upsert({
      where: { userId },
      create: { userId, marketplaceOptIn: dto.optIn, hourlyRateEur: dto.hourlyRateEur ?? null, sessionTypes },
      update: {
        marketplaceOptIn: dto.optIn,
        ...(dto.hourlyRateEur !== undefined ? { hourlyRateEur: dto.hourlyRateEur } : {}),
        ...(dto.sessionTypes !== undefined ? { sessionTypes } : {}),
      },
    });
    await this.audit
      .appendAudit({
        userId,
        action: 'expertise.marketplace.opt',
        entity: 'ExpertProfile',
        entityId: saved.id,
        details: {
          marketplaceOptIn: dto.optIn,
          consent: dto.optIn ? 'explicit_opt_in' : 'withdrawn',
          purpose: 'listing in the authenticated expert-for-hire marketplace (PRO users)',
        },
      })
      .catch((e) => this.logger.warn(`consent audit failed: ${e?.message}`));
    return { marketplaceOptIn: saved.marketplaceOptIn, hourlyRateEur: saved.hourlyRateEur, sessionTypes: saved.sessionTypes };
  }

  // ---------------- EXP-12: search (opted-in experts only) ----------------

  async search() {
    const profiles = await this.prisma.expertProfile.findMany({
      where: { marketplaceOptIn: true },
      orderBy: { reputationScore: 'desc' },
      take: 50,
    });
    const cards = await Promise.all(
      profiles.map(async (p) => {
        const [skills, credentialCount] = await Promise.all([
          this.prisma.userSkill.findMany({
            where: { userId: p.userId, evidenceTier: { in: ['assessed', 'verified'] } },
            include: { skill: { select: { preferredLabel: true } } },
            take: 6,
          }),
          this.prisma.credential.count({ where: { userId: p.userId, revoked: false } }),
        ]);
        return {
          expertUserId: p.userId,
          headline: p.headline,
          reputation: p.reputationScore,
          hourlyRateEur: p.hourlyRateEur,
          sessionTypes: p.sessionTypes,
          verifiedSkills: skills.map((s) => ({ label: s.skill.preferredLabel, tier: s.evidenceTier, proficiency: s.proficiency })),
          credentialCount,
        };
      }),
    );
    return { experts: cards, paymentNote: 'Plata online în curând — rezervările sunt confirmate fără plată. / Online payment coming soon.' };
  }

  // ---------------- EXP-12: availability (consulting pattern — simple) ----------------

  /**
   * Business-hour hourly slots (09–17 Europe/Bucharest, weekdays) minus the
   * expert's active bookings. The Bucharest offset is derived from the DATE
   * BEING SCHEDULED (DST-correct: summer EEST = UTC+3 → 06:00Z, winter EET =
   * UTC+2 → 07:00Z), not from the server's current date.
   */
  async slots(expertUserId: string, dateIso: string) {
    const day = new Date(`${dateIso}T12:00:00Z`); // noon avoids midnight edge cases
    if (Number.isNaN(day.getTime())) throw new BadRequestException('Invalid date');
    const offsetH = MarketplaceService.bucharestOffsetHours(day);
    const dow = day.getUTCDay();
    if (dow === 0 || dow === 6) return { date: dateIso, timezone: 'Europe/Bucharest', slots: [] };
    const windowStart = new Date(`${dateIso}T00:00:00Z`);
    windowStart.setUTCHours(9 - offsetH); // 09:00 local as a UTC instant
    const windowEnd = new Date(windowStart.getTime() + 8 * 3600_000); // 17:00 local
    const busy = await this.prisma.expertEngagement.findMany({
      where: {
        expertUserId,
        status: { in: ['requested', 'confirmed'] },
        scheduledAt: { gte: windowStart, lt: windowEnd },
      },
      select: { scheduledAt: true },
    });
    const busyStarts = new Set(busy.map((b) => b.scheduledAt.getTime()));
    const slots = [];
    for (let i = 0; i < 8; i++) {
      const startsAt = new Date(windowStart.getTime() + i * 3600_000);
      if (!busyStarts.has(startsAt.getTime())) {
        slots.push({ startsAt: startsAt.toISOString(), localHour: 9 + i, durationMin: 60 });
      }
    }
    return { date: dateIso, timezone: 'Europe/Bucharest', slots };
  }

  /** UTC offset (hours) of Europe/Bucharest at the given instant, via Intl (no deps). */
  static bucharestOffsetHours(at: Date): number {
    const tz = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Bucharest',
      hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(at);
    const get = (t: string) => Number(tz.find((x) => x.type === t)!.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
    return Math.round((asUtc - at.getTime()) / 3600_000);
  }

  // ---------------- EXP-12: booking lifecycle ----------------

  async book(clientUserId: string, dto: { expertUserId: string; sessionType: string; scheduledAt: string }) {
    if (dto.expertUserId === clientUserId) throw new ForbiddenException('You cannot book yourself.');
    if (!(SESSION_TYPES as readonly string[]).includes(dto.sessionType)) {
      throw new BadRequestException(`sessionType must be one of ${SESSION_TYPES.join(', ')}`);
    }
    const profile = await this.prisma.expertProfile.findUnique({ where: { userId: dto.expertUserId } });
    if (!profile?.marketplaceOptIn) throw new NotFoundException('Expert not available in the marketplace.');
    const when = new Date(dto.scheduledAt);
    if (Number.isNaN(when.getTime()) || when <= new Date()) throw new BadRequestException('scheduledAt must be a future datetime.');
    const clash = await this.prisma.expertEngagement.findFirst({
      where: { expertUserId: dto.expertUserId, scheduledAt: when, status: { in: ['requested', 'confirmed'] } },
    });
    if (clash) throw new BadRequestException('Slot already taken.');
    const eng = await this.prisma.expertEngagement.create({
      data: {
        expertUserId: dto.expertUserId,
        clientUserId,
        sessionType: dto.sessionType,
        scheduledAt: when,
        status: 'requested',
        paymentStatus: 'pending_hold', // placeholder — no live payments yet
      },
    });
    await this.audit
      .appendAudit({ userId: clientUserId, action: 'expertise.engagement.book', entity: 'ExpertEngagement', entityId: eng.id, details: { expertUserId: dto.expertUserId, sessionType: dto.sessionType } })
      .catch(() => undefined);
    return eng;
  }

  async myEngagements(userId: string) {
    return this.prisma.expertEngagement.findMany({
      where: { OR: [{ expertUserId: userId }, { clientUserId: userId }] },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });
  }

  async transition(userId: string, engagementId: string, action: 'confirm' | 'complete' | 'cancel') {
    const eng = await this.prisma.expertEngagement.findUnique({ where: { id: engagementId } });
    if (!eng) throw new NotFoundException('Engagement not found');
    const isExpert = eng.expertUserId === userId;
    const isClient = eng.clientUserId === userId;
    if (!isExpert && !isClient) throw new ForbiddenException('Not your engagement.');

    let status: string;
    if (action === 'confirm') {
      if (!isExpert) throw new ForbiddenException('Only the expert can confirm.');
      if (eng.status !== 'requested') throw new BadRequestException(`Cannot confirm from '${eng.status}'.`);
      status = 'confirmed';
    } else if (action === 'complete') {
      if (!isExpert) throw new ForbiddenException('Only the expert can complete.');
      if (eng.status !== 'confirmed') throw new BadRequestException(`Cannot complete from '${eng.status}'.`);
      status = 'completed';
    } else {
      if (eng.status === 'completed') throw new BadRequestException('Cannot cancel a completed session.');
      status = 'cancelled';
    }
    const paymentStatus = status === 'completed' ? 'released' : status === 'cancelled' ? 'refunded' : eng.paymentStatus;
    return this.prisma.expertEngagement.update({ where: { id: engagementId }, data: { status, paymentStatus } });
  }

  async rate(clientUserId: string, engagementId: string, rating: number, comment?: string) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestException('rating must be an integer 1–5');
    const eng = await this.prisma.expertEngagement.findUnique({ where: { id: engagementId } });
    if (!eng) throw new NotFoundException('Engagement not found');
    if (eng.clientUserId !== clientUserId) throw new ForbiddenException('Only the client can rate.');
    if (eng.status !== 'completed') throw new BadRequestException('Only completed sessions can be rated.');
    if (eng.rating != null) throw new BadRequestException('Already rated.');
    const saved = await this.prisma.expertEngagement.update({
      where: { id: engagementId },
      data: { rating, ratingComment: comment ?? null },
    });
    // deterministic reputation refresh for the expert
    const aggregate = await this.profiles.aggregate(eng.expertUserId);
    return { engagement: saved, expertReputation: aggregate.reputation.reputation };
  }
}
