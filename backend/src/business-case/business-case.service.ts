import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BcTemplate, TEMPLATES, validateAnswers, diffAnswers } from './bc.questionnaire';
import { resolveDiscountRate } from './bc.finance';
import { appraise, mirr, eac } from './bc.model';
import { breakEven, goalSeek, GoalDriver, GoalMetric } from './bc.goalseek';
import { computeRfq, hasRfqInputs } from './bc.rfq';
import { computeUnitEconomics, hasUnitEconomicsInputs } from './bc.uniteconomics';
import { buildExtendedModel, hasExtendedDrivers, TvValidationError } from './bc.cashflow';
import { tornado, monteCarlo } from './bc.sensitivity';
import { buildDeliverableHtml, Maturity, sectionsForMaturity } from './bc.deliverable';
import { buildChartConfigs, BcBranding } from './bc.charts';
import { generateWorkbookLive, populateWorkbookTemplate, ExcelModelInput } from './bc.excel';
import { buildBoardDeck } from './bc.pptx';
import { wrapHtmlForPrint, renderPdfViaPuppeteer } from './bc.pdf-render';
import * as fs from 'fs';
import * as path from 'path';
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

    // S-58 (BC-201..205): extended model + MIRR/EAC — strictly ADDITIVE keys so
    // existing consumers of resultsJson (results tab, FND-6) are unaffected.
    const num = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const financeRate = num(answers['economic.rates.financeRatePct'], appraisal.discountRate * 100) / 100;
    const reinvestRate = num(answers['economic.rates.reinvestRatePct'], appraisal.discountRate * 100) / 100;
    const years = Math.max(1, Math.round(num(answers['strategic.horizonYears'], 1)));
    const mirrVal = mirr(appraisal.cashflows, financeRate, reinvestRate);
    const extras = {
      mirr: mirrVal === null ? null : Number(mirrVal.toFixed(6)),
      financeRate, reinvestRate,
      eac: Number(eac(appraisal.npv, appraisal.discountRate, years).toFixed(2)),
    };
    let extended: any = null;
    if (hasExtendedDrivers(answers)) {
      try {
        extended = buildExtendedModel(answers);
      } catch (e) {
        if (e instanceof TvValidationError) throw new BadRequestException(e.message);
        throw e;
      }
    }

    // S-59 (BC-208/209/210) — strictly ADDITIVE keys, null when inputs absent.
    const rfq = hasRfqInputs(answers) ? computeRfq(answers) : null;
    const unitEconomics = hasUnitEconomicsInputs(answers) ? computeUnitEconomics(answers) : null;
    let breakEvenRes: any = null;
    try {
      breakEvenRes = breakEven(answers);
    } catch {
      breakEvenRes = null; // break-even is advisory — never fail the compute
    }

    const results = {
      assumptionVersion: latest.version,
      appraisal,
      tornado: tornado(answers),
      monteCarlo: monteCarlo(answers, { seed, iterations: opts?.iterations ?? 5000 }),
      extras,
      extended,
      rfq,
      unitEconomics,
      breakEven: breakEvenRes,
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

    // BC-301: ONE chart-config set for every format; render failures never break the document.
    const branding = await this.resolveBranding(bc);
    const charts: { npvByYear?: string; tornado?: string; mcHistogram?: string } = {};
    try {
      const set = buildChartConfigs(results, branding);
      if (set.cashTrajectory) charts.npvByYear = await this.charts.renderToDataUri(set.cashTrajectory);
      if (set.tornado) charts.tornado = await this.charts.renderToDataUri(set.tornado);
      if (set.mcHistogram) charts.mcHistogram = await this.charts.renderToDataUri(set.mcHistogram);
    } catch (e: any) {
      this.logger.warn(`Deliverable chart render failed (${e?.message}) — continuing text-only`);
    }

    const html = buildDeliverableHtml({
      title: bc.title, template, skeleton, maturity, locale,
      answers: results.appraisal ? (results as any).answers ?? {} : {},
      appraisal, tornado: results.tornado, monteCarlo: results.monteCarlo, charts,
    });

    // BC-305: real Puppeteer render (cover + TOC + page numbers); graceful fallback
    // to the legacy fromHTML stub when Chromium is unavailable — never a 500.
    const toc = sectionsForMaturity(skeleton, maturity).map((t, i) => ({ id: `s${i}`, title: t }));
    const printable = wrapHtmlForPrint(html, { title: bc.title, maturity, locale, toc, branding });
    const rendered = await renderPdfViaPuppeteer(printable, { footerText: branding?.footerText });

    await this.prisma.businessCase.update({ where: { id }, data: { status: maturity } });
    if (rendered) {
      this.logger.log(`BC ${id} deliverable generated (${maturity}, ${rendered.length} bytes, puppeteer)`);
      return {
        content: rendered.toString('latin1'), size: rendered.length, maturity, html,
        renderer: 'puppeteer' as const, buffer: rendered, filename: `${bc.title}-${maturity}.pdf`,
      };
    }
    const pdf = await this.pdf.fromHTML(html, { metadata: { title: `${bc.title} — ${maturity}` } });
    this.logger.log(`BC ${id} deliverable generated (${maturity}, ${pdf.size} bytes, fallback)`);
    return { content: pdf.content ?? '', size: pdf.size ?? 0, maturity, html, renderer: 'fallback' as const, filename: `${bc.title}-${maturity}.pdf` };
  }

  /** BC-306 — tenant branding from Organization.settings.branding (never throws). */
  private async resolveBranding(bc: { organizationId?: string | null }): Promise<BcBranding | null> {
    try {
      if (!bc.organizationId) return null;
      const org = await this.prisma.organization.findUnique({ where: { id: bc.organizationId }, select: { settings: true } });
      const b = (org?.settings as any)?.branding;
      if (!b || typeof b !== 'object') return null;
      return {
        logoDataUri: typeof b.logoDataUri === 'string' && b.logoDataUri.startsWith('data:image/') ? b.logoDataUri : undefined,
        primaryColor: typeof b.primaryColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(b.primaryColor) ? b.primaryColor : undefined,
        accentColor: typeof b.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(b.accentColor) ? b.accentColor : undefined,
        footerText: typeof b.footerText === 'string' ? b.footerText.slice(0, 200) : undefined,
      };
    } catch {
      return null;
    }
  }

  /** BC-306 — set branding on the caller's organization (merge into settings Json). */
  async setBranding(userId: string, organizationId: string | null | undefined, branding: Partial<BcBranding>) {
    if (!organizationId) throw new BadRequestException('No active organization — branding is org-level');
    const clean: any = {};
    if (branding.primaryColor !== undefined) {
      if (branding.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(branding.primaryColor)) throw new BadRequestException('primaryColor must be #rrggbb');
      clean.primaryColor = branding.primaryColor || undefined;
    }
    if (branding.accentColor !== undefined) {
      if (branding.accentColor && !/^#[0-9a-fA-F]{6}$/.test(branding.accentColor)) throw new BadRequestException('accentColor must be #rrggbb');
      clean.accentColor = branding.accentColor || undefined;
    }
    if (branding.logoDataUri !== undefined) {
      if (branding.logoDataUri && (!branding.logoDataUri.startsWith('data:image/') || branding.logoDataUri.length > 200_000)) {
        throw new BadRequestException('logoDataUri must be a data:image/* URI under 200KB');
      }
      clean.logoDataUri = branding.logoDataUri || undefined;
    }
    if (branding.footerText !== undefined) clean.footerText = String(branding.footerText ?? '').slice(0, 200) || undefined;

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { settings: true } });
    const settings = { ...((org?.settings as any) ?? {}), branding: { ...(((org?.settings as any) ?? {}).branding ?? {}), ...clean } };
    await this.prisma.organization.update({ where: { id: organizationId }, data: { settings } });
    this.logger.log(`Branding updated for org ${organizationId} by ${userId}`);
    return { branding: settings.branding };
  }

  /** Shared input for the Excel/PPTX generators. */
  private async exportInput(userId: string, id: string): Promise<{ bc: any; input: ExcelModelInput; results: any; branding: BcBranding | null }> {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    const results = (await this.getResults(userId, id)) ?? (await this.compute(userId, id));
    const branding = await this.resolveBranding(bc);
    const input: ExcelModelInput = {
      title: bc.title,
      template: bc.template,
      appraisal: results.appraisal,
      extras: results.extras ?? null,
      extended: results.extended ?? null,
      unitEconomics: results.unitEconomics ?? null,
      branding,
    };
    return { bc, input, results, branding };
  }

  /** BC-303 — generative Excel with live formulas. */
  async exportExcelLive(userId: string, id: string) {
    const { bc, input } = await this.exportInput(userId, id);
    const buffer = await generateWorkbookLive(input);
    return { buffer, filename: `${bc.title}-model.xlsx` };
  }

  /** BC-302 — branded template Excel. */
  async exportExcelTemplate(userId: string, id: string) {
    const { bc, input } = await this.exportInput(userId, id);
    const tplPath = path.join(__dirname, '../../assets/bc/bc-template.xlsx');
    const tpl = fs.readFileSync(tplPath);
    const buffer = await populateWorkbookTemplate(tpl, input);
    return { buffer, filename: `${bc.title}-summary.xlsx` };
  }

  /** BC-304 — PPTX board deck. */
  async exportPptx(userId: string, id: string, maturity: Maturity, locale: 'ro' | 'en') {
    const { bc, results, branding } = await this.exportInput(userId, id);
    const chartsPng: Record<string, string> = {};
    try {
      const set = buildChartConfigs(results, branding);
      for (const [key, cfg] of Object.entries(set)) {
        if (cfg) chartsPng[key] = (await this.charts.renderToBuffer(cfg as any)).toString('base64');
      }
    } catch (e: any) {
      this.logger.warn(`PPTX chart render failed (${e?.message}) — deck continues without images`);
    }
    const { buffer, slideCount } = await buildBoardDeck({
      title: bc.title, template: bc.template, maturity, locale, results, chartsPng: chartsPng as any, branding,
    });
    return { buffer, slideCount, filename: `${bc.title}-${maturity}.pptx` };
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
  /** BC-208 — reverse-solve one driver for a target NPV or IRR (pure, on the latest assumptions). */
  async goalSeek(userId: string, id: string, body: { driver: GoalDriver; metric: GoalMetric; target: number }) {
    const bc = await this.prisma.businessCase.findFirst({ where: { id, userId } });
    if (!bc) throw new NotFoundException(`Business case ${id} not found`);
    const latest = await this.prisma.bcAssumptionSet.findFirst({ where: { bcId: id }, orderBy: { version: 'desc' } });
    if (!latest) throw new BadRequestException('No assumptions submitted yet.');
    const drivers: GoalDriver[] = ['price', 'volume', 'capex', 'discountRate'];
    const metrics: GoalMetric[] = ['npv', 'irr'];
    if (!drivers.includes(body?.driver)) throw new BadRequestException(`driver must be one of ${drivers.join(', ')}`);
    if (!metrics.includes(body?.metric)) throw new BadRequestException(`metric must be one of ${metrics.join(', ')}`);
    const target = Number(body?.target);
    if (!Number.isFinite(target)) throw new BadRequestException('target must be a number');
    return { assumptionVersion: latest.version, ...goalSeek(latest.answers as Record<string, any>, body.driver, body.metric, target) };
  }

}
