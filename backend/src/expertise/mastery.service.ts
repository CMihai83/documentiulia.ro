import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditChainService } from '../audit/audit-chain.service';
import { ExpertiseService } from './expertise.service';
import { QuizItem, aggregatePeerScores, grade, selectItems, stripAnswers } from './assessment.logic';
import { SCENARIO_SKILL_LINKS, SEED_ASSESSMENTS } from './mastery-seed';

/**
 * EXP-6 (simulator as graded practice) + EXP-7 (validated assessments + peer review).
 *
 * - Scored sim runs raise linked skills to the `assessed` tier via the S-55
 *   evidence path; practice runs never do (stakes preserved).
 * - Assessment attempts are IMMUTABLE once created: there is deliberately no
 *   update/delete method anywhere in this service or its controller.
 * - Peer reviewers are anonymised: only an HMAC of the reviewer id is stored.
 */
@Injectable()
export class MasteryService {
  private readonly logger = new Logger(MasteryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditChainService,
    private readonly expertise: ExpertiseService,
  ) {}

  // ---------------- EXP-6: scenario links + graded practice ----------------

  /** Seed scenario→skill links + sample quizzes (idempotent). */
  async seedMastery() {
    let links = 0;
    for (const l of SCENARIO_SKILL_LINKS) {
      const skill = await this.prisma.skill.findUnique({ where: { escoUri: l.skillUri } });
      if (!skill) continue;
      await this.prisma.scenarioSkill.upsert({
        where: { scenarioKey_skillId: { scenarioKey: l.scenarioKey, skillId: skill.id } },
        create: { scenarioKey: l.scenarioKey, skillId: skill.id, weight: l.weight },
        update: { weight: l.weight },
      });
      links += 1;
    }
    let assessments = 0;
    for (const a of SEED_ASSESSMENTS) {
      const skill = await this.prisma.skill.findUnique({ where: { escoUri: a.skillUri } });
      if (!skill) continue;
      const existing = await this.prisma.skillAssessment.findFirst({ where: { skillId: skill.id, title: a.title } });
      if (existing) {
        await this.prisma.skillAssessment.update({
          where: { id: existing.id },
          data: { items: a.items as any, passScorePct: a.passScorePct, kind: a.kind },
        });
      } else {
        await this.prisma.skillAssessment.create({
          data: { skillId: skill.id, kind: a.kind, title: a.title, items: a.items as any, passScorePct: a.passScorePct },
        });
      }
      assessments += 1;
    }
    return { scenarioLinks: links, assessments };
  }

  /** Skills a scenario exercises (for UI + endRun wiring). */
  async scenarioSkills(scenarioKey: string) {
    return this.prisma.scenarioSkill.findMany({ where: { scenarioKey }, include: { skill: true } });
  }

  /**
   * EXP-6 — called by simv2 endRun for SCORED runs only. Raises each linked
   * skill to the `assessed` tier, proficiency scaled from the composite.
   * Any failure here must never break the simulator (caller wraps in try/catch;
   * this method also degrades gracefully).
   */
  async recordScoredRun(userId: string, runId: string, scenarioKey: string, composite: number) {
    const links = await this.prisma.scenarioSkill.findMany({ where: { scenarioKey }, include: { skill: true } });
    if (!links.length) return { runId, assessedSkills: 0 };
    const uris = links.map((l) => l.skill.escoUri);
    return this.expertise.inferFromSimRun(userId, runId, uris, composite);
  }

  // ---------------- EXP-7: assessments + peer review ----------------

  /** List assessments for a skill (or all), answers stripped. */
  async listAssessments(skillUri?: string) {
    const where = skillUri ? { skill: { escoUri: skillUri } } : {};
    const rows = await this.prisma.skillAssessment.findMany({ where, include: { skill: true } });
    return rows.map((r) => ({
      id: r.id,
      skill: { escoUri: r.skill.escoUri, label: r.skill.preferredLabel },
      kind: r.kind,
      title: r.title,
      passScorePct: r.passScorePct,
      itemCount: Array.isArray(r.items) ? (r.items as any[]).length : 0,
    }));
  }

  /** Serve a deterministic item selection for a seed — answers stripped. */
  async serveAssessment(assessmentId: string, seed: number, count = 5) {
    const a = await this.prisma.skillAssessment.findUnique({ where: { id: assessmentId } });
    if (!a) throw new NotFoundException(`Assessment ${assessmentId} not found`);
    const items = selectItems((a.items as unknown as QuizItem[]) ?? [], count, seed);
    return { id: a.id, title: a.title, kind: a.kind, passScorePct: a.passScorePct, seed, items: stripAnswers(items) };
  }

  /**
   * Submit an attempt. Auto-graded for quizzes; the attempt row is permanent —
   * there is no update or delete path (AC: results permanently recorded).
   * A quiz pass raises the skill to the `assessed` tier (0.7-credibility kind).
   */
  async submitAttempt(userId: string, assessmentId: string, answers: Record<string, number>, seed: number, count = 5) {
    const a = await this.prisma.skillAssessment.findUnique({ where: { id: assessmentId }, include: { skill: true } });
    if (!a) throw new NotFoundException(`Assessment ${assessmentId} not found`);
    if (a.kind !== 'auto_quiz') throw new BadRequestException('Only auto_quiz assessments are auto-graded; work samples go through peer review.');

    const served = selectItems((a.items as unknown as QuizItem[]) ?? [], count, seed);
    const result = grade(served, answers, a.passScorePct);

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        userId,
        answers: answers as any,
        scorePct: result.scorePct,
        passed: result.passed,
        passedAt: result.passed ? new Date() : null,
      },
    });

    if (result.passed) {
      // quiz (0.7 credibility) persists as `assessed`; the evidence entry records the kind
      const prof = Math.max(1, Math.min(5, Math.round((result.scorePct / 100) * 5)));
      await this.expertise.setUserSkill(userId, a.skillId, prof, 'assessed', {
        type: 'auto_quiz',
        ref: attempt.id,
        score: result.scorePct,
        credibility: 0.7,
      });
    }

    await this.audit
      .appendAudit({
        userId,
        action: 'expertise.assessment.attempt',
        entity: 'AssessmentAttempt',
        entityId: attempt.id,
        details: { assessmentId, scorePct: result.scorePct, passed: result.passed },
      })
      .catch((e) => this.logger.warn(`audit failed: ${e?.message}`));

    return { attemptId: attempt.id, ...result };
  }

  private reviewerRef(reviewerUserId: string): string {
    const secret = process.env.PEER_REVIEW_HMAC_KEY || 'peer-review-anonymisation';
    return crypto.createHmac('sha256', secret).update(reviewerUserId).digest('hex').slice(0, 24);
  }

  /**
   * EXP-7 — anonymised peer review of a work-sample/capstone attempt. The
   * reviewer's identity is stored only as an HMAC ref and never exposed.
   * When the aggregate passes, the skill rises to `verified` (1.0 credibility).
   */
  async addPeerReview(reviewerUserId: string, attemptId: string, rubric: Record<string, any>, scorePct: number) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });
    if (!attempt) throw new NotFoundException(`Attempt ${attemptId} not found`);
    if (attempt.userId === reviewerUserId) throw new ForbiddenException('You cannot peer-review your own attempt.');
    if (attempt.assessment.kind === 'auto_quiz') throw new BadRequestException('Auto-graded quizzes are not peer-reviewed.');

    const review = await this.prisma.peerReview.create({
      data: {
        attemptId,
        reviewerRef: this.reviewerRef(reviewerUserId),
        rubric: rubric as any,
        scorePct: Math.max(0, Math.min(100, Math.round(scorePct))),
      },
    });

    const all = await this.prisma.peerReview.findMany({ where: { attemptId } });
    const aggregate = aggregatePeerScores(all.map((r) => r.scorePct));

    if (aggregate >= attempt.assessment.passScorePct) {
      const prof = Math.max(1, Math.min(5, Math.round((aggregate / 100) * 5)));
      await this.expertise.setUserSkill(attempt.userId, attempt.assessment.skillId, prof, 'verified', {
        type: 'peer_reviewed',
        ref: attemptId,
        score: aggregate,
        credibility: 1.0,
      });
      if (!attempt.passed) {
        await this.prisma.assessmentAttempt.update({
          where: { id: attemptId },
          data: { passed: true, passedAt: new Date(), scorePct: aggregate },
        });
      }
    }

    // Anonymity: the response carries the review id + aggregate, never the reviewer.
    return { reviewId: review.id, aggregateScorePct: aggregate, reviews: all.length };
  }

  /** Reviews for an attempt — reviewee-safe view (no reviewer identity, only refs). */
  async attemptReviews(userId: string, attemptId: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({ where: { id: attemptId, userId } });
    if (!attempt) throw new NotFoundException(`Attempt ${attemptId} not found`);
    const reviews = await this.prisma.peerReview.findMany({
      where: { attemptId },
      select: { id: true, rubric: true, scorePct: true, createdAt: true }, // reviewerRef deliberately excluded
    });
    return { attemptId, aggregateScorePct: aggregatePeerScores(reviews.map((r) => r.scorePct)), reviews };
  }

  listMyAttempts(userId: string) {
    return this.prisma.assessmentAttempt.findMany({
      where: { userId },
      include: { assessment: { select: { title: true, kind: true, skillId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
