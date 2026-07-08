import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { SEED_SKILLS, SEED_OCCUPATIONS, SeedSkill, SeedOccupation } from './esco-seed';
import { analyseGaps, radarData, readiness, RequiredSkill, CurrentSkill, SkillGap } from './gap.logic';
import { buildPath, orderGapsTopologically, totalMinutes, Difficulty, GapInput, ResourceRef } from './path.logic';

export type EvidenceTier = 'self_declared' | 'course' | 'assessed' | 'verified';
const TIER_RANK: Record<EvidenceTier, number> = { self_declared: 0, course: 1, assessed: 2, verified: 3 };

@Injectable()
export class ExpertiseService {
  private readonly logger = new Logger(ExpertiseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
  ) {}

  // ---------------- EXP-1: taxonomy import + search ----------------

  /** Generic importer — idempotent by escoUri, preserves hierarchy + version. */
  async importGraph(
    skills: SeedSkill[],
    occupations: SeedOccupation[],
    version = 'ESCO-1.2',
  ): Promise<{ skills: number; occupations: number; links: number }> {
    for (const s of skills) {
      await this.prisma.skill.upsert({
        where: { escoUri: s.escoUri },
        create: {
          escoUri: s.escoUri,
          preferredLabel: s.preferredLabel,
          altLabels: s.altLabels ?? [],
          description: s.description ?? '',
          skillType: s.skillType ?? 'skill',
          reuseLevel: s.reuseLevel ?? '',
          parentUri: s.parentUri ?? null,
          taxonomyVersion: version,
        },
        update: {
          preferredLabel: s.preferredLabel,
          altLabels: s.altLabels ?? [],
          description: s.description ?? '',
          skillType: s.skillType ?? 'skill',
          reuseLevel: s.reuseLevel ?? '',
          parentUri: s.parentUri ?? null,
          taxonomyVersion: version,
        },
      });
    }

    let links = 0;
    for (const o of occupations) {
      const occ = await this.prisma.occupation.upsert({
        where: { escoUri: o.escoUri },
        create: { escoUri: o.escoUri, label: o.label, iscoGroup: o.iscoGroup ?? '', description: o.description ?? '', taxonomyVersion: version },
        update: { label: o.label, iscoGroup: o.iscoGroup ?? '', description: o.description ?? '', taxonomyVersion: version },
      });
      for (const link of o.skills) {
        const skill = await this.prisma.skill.findUnique({ where: { escoUri: link.uri } });
        if (!skill) continue;
        await this.prisma.occupationSkill.upsert({
          where: { occupationId_skillId: { occupationId: occ.id, skillId: skill.id } },
          create: { occupationId: occ.id, skillId: skill.id, relation: link.relation, level: link.level },
          update: { relation: link.relation, level: link.level },
        });
        links += 1;
      }
    }
    return { skills: skills.length, occupations: occupations.length, links };
  }

  /** Seed the curated domain slice. */
  seed() {
    return this.importGraph(SEED_SKILLS, SEED_OCCUPATIONS);
  }

  /** Search skills by label/altLabel; optionally return a subtree under a parent. */
  async searchSkills(query?: string, rootUri?: string) {
    if (rootUri) {
      const root = await this.prisma.skill.findUnique({ where: { escoUri: rootUri } });
      if (!root) throw new NotFoundException(`Skill ${rootUri} not found`);
      const children = await this.prisma.skill.findMany({ where: { parentUri: rootUri }, orderBy: { preferredLabel: 'asc' } });
      return { root, children };
    }
    const where = query
      ? { OR: [{ preferredLabel: { contains: query, mode: 'insensitive' as const } }, { altLabels: { has: query } }] }
      : {};
    return this.prisma.skill.findMany({ where, orderBy: { preferredLabel: 'asc' }, take: 100 });
  }

  // ---------------- EXP-2: user skills + evidence tiers ----------------

  /**
   * Upsert a user's skill. Evidence tier only ever RAISES (a verified skill is
   * not downgraded by a later self-declaration). Every write is consent-logged.
   */
  async setUserSkill(
    userId: string,
    skillId: string,
    proficiency: number,
    tier: EvidenceTier,
    evidenceEntry?: Record<string, any>,
    validUntil?: Date | null,
  ) {
    const prof = Math.max(0, Math.min(5, Math.round(proficiency)));
    const existing = await this.prisma.userSkill.findUnique({ where: { userId_skillId: { userId, skillId } } });
    const effectiveTier: EvidenceTier =
      existing && TIER_RANK[existing.evidenceTier as EvidenceTier] > TIER_RANK[tier]
        ? (existing.evidenceTier as EvidenceTier)
        : tier;
    const evidence = [
      ...((existing?.evidence as any[]) ?? []),
      ...(evidenceEntry ? [{ ...evidenceEntry, tier, at: new Date().toISOString() }] : []),
    ];

    const saved = await this.prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: {
        userId, skillId, proficiency: prof, evidenceTier: effectiveTier, evidence,
        verified: effectiveTier === 'verified', validUntil: validUntil ?? null,
      },
      update: {
        proficiency: Math.max(existing?.proficiency ?? 0, prof),
        evidenceTier: effectiveTier, evidence, verified: effectiveTier === 'verified',
        validUntil: validUntil ?? existing?.validUntil ?? null,
      },
    });

    // GDPR: consent-log every skill/evidence write (append-only, hash-chained).
    await this.audit.appendAudit({
      userId,
      action: 'expertise.user_skill.write',
      entity: 'UserSkill',
      entityId: saved.id,
      details: { skillId, proficiency: prof, evidenceTier: effectiveTier, purpose: 'skills_profile' },
    }).catch((e) => this.logger.warn(`consent-log failed: ${e?.message}`));

    return saved;
  }

  /** List a user's skills, flagging any past their validity window. */
  async listUserSkills(userId: string) {
    const now = new Date();
    const rows = await this.prisma.userSkill.findMany({ where: { userId }, include: { skill: true } });
    return rows.map((r) => ({ ...r, expired: !!r.validUntil && r.validUntil < now }));
  }

  /**
   * EXP-2 auto-infer — an LMS course completion raises the user's skills to the
   * `course` tier. Courses map to skills by tag/label overlap (no explicit link
   * table yet — see follow-up). Called by the LMS on completion (or via endpoint).
   */
  async inferFromLmsCompletion(userId: string, courseId: string) {
    const course = await this.prisma.lMSCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException(`Course ${courseId} not found`);
    const terms = [course.title, ...(course.tags ?? [])].map((t) => t.toLowerCase());
    const skills = await this.prisma.skill.findMany();
    const matched = skills.filter((s) =>
      terms.some((t) => s.preferredLabel.toLowerCase().includes(t) || s.altLabels.some((a) => t.includes(a.toLowerCase())) || t.includes(s.preferredLabel.toLowerCase())),
    );
    const out = [];
    for (const s of matched) {
      out.push(await this.setUserSkill(userId, s.id, 3, 'course', { type: 'lms_completion', ref: courseId, note: course.title }));
    }
    return { courseId, matchedSkills: out.length };
  }

  /**
   * EXP-2 auto-infer — a scored simulator run raises the tagged skills to the
   * `assessed` tier, proficiency scaled from the composite score (0-100 → 0-5).
   */
  async inferFromSimRun(userId: string, runId: string, skillUris: string[], compositeScore: number) {
    const prof = Math.max(1, Math.min(5, Math.round((compositeScore / 100) * 5)));
    const out = [];
    for (const uri of skillUris) {
      const skill = await this.prisma.skill.findUnique({ where: { escoUri: uri } });
      if (!skill) continue;
      out.push(await this.setUserSkill(userId, skill.id, prof, 'assessed', { type: 'sim_run', ref: runId, score: compositeScore }));
    }
    return { runId, assessedSkills: out.length, proficiency: prof };
  }

  // ---------------- EXP-3: gap analysis ----------------

  async requiredForOccupation(occUri: string): Promise<{ occLabel: string; required: RequiredSkill[]; skillIdByEsco: Map<string, string>; parentByEsco: Map<string, string | null> }> {
    const occ = await this.prisma.occupation.findUnique({
      where: { escoUri: occUri },
      include: { occupationSkills: { include: { skill: true } } },
    });
    if (!occ) throw new NotFoundException(`Occupation ${occUri} not found`);
    const required: RequiredSkill[] = occ.occupationSkills.map((os) => ({
      skillId: os.skillId,
      label: os.skill.preferredLabel,
      relation: os.relation as 'essential' | 'optional',
      requiredLevel: os.level,
    }));
    const parentByEsco = new Map<string, string | null>();
    for (const os of occ.occupationSkills) parentByEsco.set(os.skillId, os.skill.parentUri ?? null);
    return { occLabel: occ.label, required, skillIdByEsco: new Map(), parentByEsco };
  }

  async currentSkills(userId: string): Promise<CurrentSkill[]> {
    const rows = await this.prisma.userSkill.findMany({ where: { userId } });
    const now = new Date();
    return rows
      .filter((r) => !r.validUntil || r.validUntil >= now) // expired evidence doesn't count
      .map((r) => ({ skillId: r.skillId, proficiency: r.proficiency }));
  }

  async analyseGapForOccupation(userId: string, occUri: string) {
    const { occLabel, required } = await this.requiredForOccupation(occUri);
    const current = await this.currentSkills(userId);
    const gaps = analyseGaps(required, current);
    const enriched = await this.attachResources(gaps);
    return {
      occupation: occLabel,
      readiness: readiness(required, current),
      radar: radarData(required, current),
      gaps: enriched,
    };
  }

  /** Attach LMS learning resources (courses) to each gap by tag/label overlap. */
  private async attachResources(gaps: SkillGap[]) {
    const skills = await this.prisma.skill.findMany({ where: { id: { in: gaps.map((g) => g.skillId) } } });
    const byId = new Map(skills.map((s) => [s.id, s]));
    const courses = await this.prisma.lMSCourse.findMany({ where: { status: { not: 'LMS_ARCHIVED' as any } }, take: 200 }).catch(() => [] as any[]);
    return gaps.map((g) => {
      const skill = byId.get(g.skillId);
      const label = skill?.preferredLabel.toLowerCase() ?? '';
      const alts = (skill?.altLabels ?? []).map((a) => a.toLowerCase());
      const matches = courses.filter((c: any) => {
        const hay = [c.title, ...(c.tags ?? [])].join(' ').toLowerCase();
        return hay.includes(label) || alts.some((a) => hay.includes(a));
      });
      return {
        ...g,
        resources: matches.slice(0, 3).map((c: any) => ({ type: 'lms_course', id: c.id, title: c.title, minutes: c.duration ?? 120 })),
      };
    });
  }

  // ---------------- EXP-5: mastery path ----------------

  async buildMasteryPath(userId: string, occUri: string, difficulty: Difficulty = 'standard') {
    const { occLabel, required, parentByEsco } = await this.requiredForOccupation(occUri);
    const occ = await this.prisma.occupation.findUnique({ where: { escoUri: occUri } });
    const current = await this.currentSkills(userId);
    const gaps = analyseGaps(required, current);
    const enriched = await this.attachResources(gaps);

    // resolve prerequisite links WITHIN the gap set (a gap whose parent skill is also a gap)
    const gapSkillIds = new Set(gaps.map((g) => g.skillId));
    const skillRows = await this.prisma.skill.findMany({ where: { id: { in: [...gapSkillIds] } } });
    const idByEsco = new Map(skillRows.map((s) => [s.escoUri, s.id]));
    const gapInputs: GapInput[] = gaps.map((g) => {
      const parentEsco = parentByEsco.get(g.skillId) ?? null;
      const parentSkillId = parentEsco ? idByEsco.get(parentEsco) ?? null : null;
      return { skillId: g.skillId, label: g.label, weight: g.weight, parentSkillId: parentSkillId && gapSkillIds.has(parentSkillId) ? parentSkillId : null };
    });

    const ordered = orderGapsTopologically(gapInputs);
    const resources = new Map<string, ResourceRef[]>();
    for (const e of enriched) {
      const first = (e as any).resources?.[0];
      resources.set(e.skillId, first ? [{ skillId: e.skillId, kind: 'course', refId: first.id, title: first.title, estMinutes: first.minutes }] : []);
    }
    const steps = buildPath(ordered, resources, difficulty);
    const est = totalMinutes(steps);

    const path = await this.prisma.learningPath.create({
      data: {
        userId,
        targetOccupationId: occ?.id ?? null,
        title: `Traseu către ${occLabel}`,
        difficulty,
        estTotalMinutes: est,
        steps: {
          create: steps.map((s) => ({
            order: s.order, kind: s.kind, refId: s.refId, skillId: s.skillId,
            title: s.title, estMinutes: s.estMinutes,
          })),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    return path;
  }

  listPaths(userId: string) {
    return this.prisma.learningPath.findMany({ where: { userId }, include: { steps: { orderBy: { order: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  }
}
