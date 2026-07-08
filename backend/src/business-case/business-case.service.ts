import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BcTemplate, TEMPLATES, validateAnswers, diffAnswers } from './bc.questionnaire';
import { resolveDiscountRate } from './bc.finance';
import { appraise } from './bc.model';
import { tornado, monteCarlo } from './bc.sensitivity';
import { buildDeliverableHtml, Maturity } from './bc.deliverable';
import { ChartService } from '../charts/chart.service';
import { PDFGeneratorService } from '../document-generation/pdf-generator.service';

@Injectable()
export class BusinessCaseService {
  private readonly logger = new Logger(BusinessCaseService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly charts: ChartService,
    private readonly pdf: PDFGeneratorService,
  ) {}

  /** BC-102 — the questionnaire (sections + fields) for a template. */
  getQuestionnaire(template: BcTemplate) {
    const t = TEMPLATES[template];
    if (!t) throw new BadRequestException(`Unknown template ${template}`);
    return t;
  }

  listTemplates() {
    return Object.values(TEMPLATES).map((t) => ({
      template: t.template, name: t.name, nameRo: t.nameRo, skeleton: t.skeleton, maturityStages: t.maturityStages,
    }));
  }

  async create(userId: string, organizationId: string | undefined, dto: { title: string; template: BcTemplate }) {
    if (!TEMPLATES[dto.template]) throw new BadRequestException(`Unknown template ${dto.template}`);
    const bc = await this.prisma.businessCase.create({
      data: { userId, organizationId, title: dto.title, template: dto.template, status: 'DRAFT' },
    });
    this.logger.log(`Business case ${bc.id} created (${dto.template})`);
    return bc;
  }

  async list(userId: string) {
    return this.prisma.businessCase.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  async get(userId: string, id: string) {
    const bc = await this.prisma.businessCase.findFirst({
      where: { id, userId },
      include: { assumptionSets: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    return { ...bc, latest: bc.assumptionSets[0] ?? null };
  }

  /**
   * BC-101/105 — submit answers as a NEW versioned assumption set (never overwrite:
   * every change is auditable). Validates against the template DSL first.
   */
  async submitAnswers(userId: string, id: string, answers: Record<string, any>) {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);

    const errors = validateAnswers(bc.template as BcTemplate, answers);
    if (errors.length) throw new BadRequestException({ message: 'Validation failed', errors });

    const last = await this.prisma.bcAssumptionSet.findFirst({
      where: { bcId: id }, orderBy: { version: 'desc' }, select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;
    const set = await this.prisma.bcAssumptionSet.create({ data: { bcId: id, version, answers } });

    // BC-103: derive the discount rate for the summary (also proves the mapping works).
    const wacc = resolveDiscountRate(answers);
    await this.prisma.businessCase.update({ where: { id }, data: { updatedAt: new Date() } });
    this.logger.log(`Business case ${id} answers v${version} saved (rate ${(wacc.rate * 100).toFixed(2)}% via ${wacc.method})`);
    return { version: set.version, createdAt: set.createdAt, discountRate: wacc };
  }

  async listVersions(userId: string, id: string) {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    return this.prisma.bcAssumptionSet.findMany({
      where: { bcId: id }, orderBy: { version: 'desc' }, select: { version: true, createdAt: true },
    });
  }

  /**
   * BC-106 — run the full appraisal (NPV/IRR/payback + tornado + Monte-Carlo)
   * against the LATEST assumption version and upsert a snapshot keyed to it.
   * Re-running on the same version refreshes it; a new answer version yields a
   * new snapshot row.
   */
  async compute(userId: string, id: string, opts?: { seed?: number; iterations?: number }) {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    const latest = await this.prisma.bcAssumptionSet.findFirst({
      where: { bcId: id }, orderBy: { version: 'desc' },
    });
    if (!latest) throw new BadRequestException('No assumptions submitted yet — save answers before computing.');

    const answers = latest.answers as Record<string, any>;
    const seed = (opts?.seed ?? 12345) >>> 0;
    const appraisal = appraise(answers);
    const results = {
      assumptionVersion: latest.version,
      appraisal,
      tornado: tornado(answers),
      monteCarlo: monteCarlo(answers, { seed, iterations: opts?.iterations ?? 5000 }),
      computedAt: new Date().toISOString(),
    };

    const snapshot = await this.prisma.bcResult.upsert({
      where: { bcId_assumptionVersion: { bcId: id, assumptionVersion: latest.version } },
      create: { bcId: id, assumptionVersion: latest.version, resultsJson: results as any },
      update: { resultsJson: results as any, createdAt: new Date() },
    });
    this.logger.log(`BC ${id} appraised v${latest.version}: NPV ${appraisal.npv}, IRR ${appraisal.irr}`);
    return { id: snapshot.id, ...results };
  }

  /** BC-106 — latest persisted appraisal snapshot. */
  async getResults(userId: string, id: string) {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    const snap = await this.prisma.bcResult.findFirst({
      where: { bcId: id }, orderBy: { assumptionVersion: 'desc' },
    });
    if (!snap) return null;
    return { id: snap.id, createdAt: snap.createdAt, ...(snap.resultsJson as any) };
  }

  /**
   * BC-107 — generate the SOC/OBC/FBC deliverable as a PDF. Computes the
   * appraisal if none is cached, renders embedded charts, assembles the
   * maturity-appropriate HTML, and stamps BusinessCase.status = maturity.
   */
  async generateDeliverable(userId: string, id: string, maturity: Maturity, locale: 'ro' | 'en') {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    const template = bc.template as BcTemplate;
    const skeleton = TEMPLATES[template]?.skeleton ?? [];

    const results = (await this.getResults(userId, id)) ?? (await this.compute(userId, id));
    const appraisal = results.appraisal;

    // Embedded charts (data URIs) — never throw the whole PDF over a chart error.
    const charts: { npvByYear?: string; tornado?: string; mcHistogram?: string } = {};
    try {
      const cf = appraisal.cashflows as { year: number; net: number }[];
      charts.npvByYear = await this.charts.renderToDataUri(
        this.charts.barConfig(cf.map((r) => `Y${r.year}`), [{ label: 'Net', data: cf.map((r) => r.net), color: '#0b7681' }]),
      );
      charts.tornado = await this.charts.renderToDataUri(
        this.charts.tornadoConfig(results.tornado.map((b: any) => ({ label: b.key, value: b.swing }))),
      );
      const h = results.monteCarlo.histogram as { x0: number; x1: number; count: number }[];
      charts.mcHistogram = await this.charts.renderToDataUri(
        this.charts.barConfig(h.map((b) => String(Math.round((b.x0 + b.x1) / 2))), [{ label: 'NPV', data: h.map((b) => b.count), color: '#c79a3a' }]),
      );
    } catch (e: any) {
      this.logger.warn(`Deliverable chart render failed (${e?.message}) — continuing text-only`);
    }

    const html = buildDeliverableHtml({
      title: bc.title, template, skeleton, maturity, locale,
      answers: results.appraisal ? (results as any).answers ?? {} : {},
      appraisal, tornado: results.tornado, monteCarlo: results.monteCarlo, charts,
    });

    const pdf = await this.pdf.fromHTML(html, { metadata: { title: `${bc.title} — ${maturity}` } });
    await this.prisma.businessCase.update({ where: { id }, data: { status: maturity } });
    this.logger.log(`BC ${id} deliverable generated (${maturity}, ${pdf.size} bytes)`);
    return { content: pdf.content ?? '', size: pdf.size ?? 0, maturity, html, filename: `${bc.title}-${maturity}.pdf` };
  }

  /** BC-105 — field-level diff between two assumption-set versions. */
  async diff(userId: string, id: string, vA: number, vB: number) {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    const [a, b] = await Promise.all([
      this.prisma.bcAssumptionSet.findUnique({ where: { bcId_version: { bcId: id, version: vA } } }),
      this.prisma.bcAssumptionSet.findUnique({ where: { bcId_version: { bcId: id, version: vB } } }),
    ]);
    if (!a || !b) throw new NotFoundException('One or both versions not found');
    return { from: vA, to: vB, changes: diffAnswers(a.answers as any, b.answers as any) };
  }
}
