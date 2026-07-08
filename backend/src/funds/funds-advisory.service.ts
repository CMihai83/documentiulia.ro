import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { appraise } from '../business-case/bc.model';
import { buildDeliverableHtml } from '../business-case/bc.deliverable';
import {
  coFinance, CoFinInput, rankInstruments, buildProjectionAnswers, ProjectionInput,
} from './funds-advisory.logic';
import { buildDurabilityCalendar, BeneficiaryType } from './durability.logic';

/** FND-5 dossier item templates keyed by legal basis. */
const BASE_ITEMS = [
  ['cerere_finantare', 'Financing application (Cererea de finanțare)', 'Cererea de finanțare'],
  ['plan_afaceri', 'Business plan / feasibility study', 'Plan de afaceri / studiu de fezabilitate'],
  ['situatii_financiare', 'Financial statements', 'Situații financiare'],
  ['decl_eligibilitate', 'Eligibility declaration', 'Declarație de eligibilitate'],
  ['decl_imm', 'SME declaration', 'Declarație IMM'],
  ['buget_deviz', 'Budget / deviz + quotes', 'Buget / deviz + oferte'],
  ['cert_onrc', 'ONRC registration certificate (certificat constatator)', 'Certificat constatator ONRC'],
  ['act_constitutiv', 'Articles of incorporation', 'Act constitutiv'],
  ['cert_fiscale', 'Fiscal certificates (no debts)', 'Certificate fiscale (fără datorii)'],
];
const DE_MINIMIS_ITEMS = [
  ['decl_intreprindere_unica', 'Single-undertaking declaration', 'Declarație întreprindere unică'],
  ['decl_dubla_finantare', 'No double-financing declaration', 'Declarație dublă finanțare'],
];
const GBER_ITEMS = [
  ['decl_ajutor_stat', 'State-aid declaration', 'Declarație ajutor de stat'],
  ['decl_cofinantare', 'Co-financing declaration', 'Declarație cofinanțare'],
];

@Injectable()
export class FundsAdvisoryService {
  private readonly logger = new Logger(FundsAdvisoryService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- FND-5 dossier checklist ----------------
  async createChecklist(userId: string, organizationId: string | null, programId: string | null) {
    let legalBasis = 'de_minimis';
    if (programId) {
      const prog = await this.prisma.fundingProgram.findUnique({ where: { id: programId } });
      if (prog) legalBasis = prog.legalBasis;
    }
    const templ = [
      ...BASE_ITEMS,
      ...(legalBasis === 'de_minimis' ? DE_MINIMIS_ITEMS : GBER_ITEMS),
    ];
    return this.prisma.dossierChecklist.create({
      data: {
        userId, organizationId, programId, legalBasis,
        items: {
          create: templ.map(([code, label, labelRo], i) => ({
            code, label, labelRo, order: i, required: true, status: 'missing',
          })),
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });
  }

  async getChecklist(id: string) {
    const c = await this.prisma.dossierChecklist.findUnique({
      where: { id }, include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!c) throw new NotFoundException('Checklist not found');
    return { ...c, completeness: this.completeness(c.items) };
  }

  async setItemStatus(itemId: string, status: 'missing' | 'uploaded' | 'verified', documentId?: string) {
    const item = await this.prisma.dossierItem.update({
      where: { id: itemId }, data: { status, documentId: documentId ?? undefined },
    });
    // roll checklist status
    const items = await this.prisma.dossierItem.findMany({ where: { checklistId: item.checklistId } });
    const complete = items.every((i) => !i.required || i.status === 'verified');
    await this.prisma.dossierChecklist.update({
      where: { id: item.checklistId }, data: { status: complete ? 'complete' : 'open' },
    });
    return item;
  }

  private completeness(items: { required: boolean; status: string }[]): number {
    const req = items.filter((i) => i.required);
    if (!req.length) return 100;
    const done = req.filter((i) => i.status === 'verified' || i.status === 'uploaded').length;
    return Math.round((done / req.length) * 100);
  }

  // ---------------- FND-6 projection (BC engine) ----------------
  async createProjection(
    userId: string, organizationId: string | null,
    dto: ProjectionInput & { title: string; programId?: string; indicatorTargets?: any },
  ) {
    const answers = buildProjectionAnswers(dto);
    const result = appraise(answers);
    return this.prisma.fundingProjection.create({
      data: {
        userId, organizationId, programId: dto.programId ?? null, title: dto.title,
        implementationYears: dto.implementationYears, durabilityYears: dto.durabilityYears,
        answers, resultJson: result as any, indicatorTargets: dto.indicatorTargets ?? undefined,
      },
    });
  }

  /** FND-6 one-click export → a BC deliverable (HTML) via the shared BC generator. */
  async exportProjectionDeliverable(id: string, locale: 'ro' | 'en' = 'ro', maturity: 'SOC' | 'OBC' | 'FBC' = 'OBC') {
    const proj = await this.prisma.fundingProjection.findUnique({ where: { id } });
    if (!proj) throw new NotFoundException('Projection not found');
    const appraisal = proj.resultJson as any;
    const html = buildDeliverableHtml({
      title: proj.title, template: 'FIVE_CASE',
      skeleton: ['Strategic', 'Economic', 'Commercial', 'Financial', 'Management'],
      maturity, locale, answers: proj.answers as any, appraisal,
      tornado: [], monteCarlo: { p10: appraisal.npv, p50: appraisal.npv, p90: appraisal.npv, mean: appraisal.npv, probNpvPositive: appraisal.npv > 0 ? 1 : 0, probIrrAboveHurdle: 0, histogram: [] } as any,
    });
    return { id: proj.id, title: proj.title, maturity, locale, html };
  }

  // ---------------- FND-7 co-financing / VAT ----------------
  async coFinance(organizationId: string | null, input: CoFinInput) {
    // default vatRegistered from the profile when not supplied
    if (input.vatRegistered === undefined && organizationId) {
      const prof = await this.prisma.fundingProfile.findUnique({ where: { organizationId } });
      if (prof) input = { ...input, vatRegistered: prof.vatPayer };
    }
    return coFinance(input);
  }

  // ---------------- FND-8 financing marketplace ----------------
  async seedInstruments() {
    const seed = INSTRUMENT_SEED;
    for (const inst of seed) {
      const exists = await this.prisma.financingInstrument.findFirst({ where: { name: inst.name } });
      if (!exists) await this.prisma.financingInstrument.create({ data: inst });
    }
    return { seeded: seed.length };
  }

  async rankInstruments(reimbursementGapEur: number) {
    const instruments = await this.prisma.financingInstrument.findMany({ where: { active: true } });
    return rankInstruments(instruments as any, reimbursementGapEur);
  }

  // ---------------- FND-9 durability tracker ----------------
  async createDurability(
    userId: string, organizationId: string | null,
    dto: { title: string; finalPaymentDate: string | Date; beneficiaryType: BeneficiaryType; programId?: string },
  ) {
    const fp = new Date(dto.finalPaymentDate);
    const { durabilityYears, events } = buildDurabilityCalendar(fp, dto.beneficiaryType);
    const obligation = await this.prisma.durabilityObligation.create({
      data: {
        userId, organizationId, programId: dto.programId ?? null, title: dto.title,
        finalPaymentDate: fp, beneficiaryType: dto.beneficiaryType, durabilityYears,
        events: {
          create: events.map((e) => ({
            kind: e.kind, dueDate: e.dueDate, description: e.description,
            descriptionRo: e.descriptionRo, alertAt: e.alertAt, status: 'pending',
          })),
        },
      },
      include: { events: { orderBy: { dueDate: 'asc' } } },
    });
    // Each DurabilityEvent persists alertAt (dueDate − 30d); the notification
    // scheduler polls these rows to fire in-app/email reminders. See follow-ups.
    return obligation;
  }

  async listDurability(userId: string) {
    return this.prisma.durabilityObligation.findMany({
      where: { userId }, include: { events: { orderBy: { dueDate: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

const INSTRUMENT_SEED = [
  {
    name: 'IMM Plus — bridge credit', nameRo: 'IMM Plus — credit punte', type: 'grant_bridge',
    provider: 'FNGCIMM / banks', maxCoveragePct: 100, forReimbursementGap: true,
    minAmountEur: 5000, maxAmountEur: 1000000,
    eligibilitySnippet: 'Bridges the grant reimbursement gap until funds are disbursed.',
    eligibilitySnippetRo: 'Acoperă decalajul până la rambursarea grantului.',
    sourceUrl: 'https://www.fngcimm.ro/',
  },
  {
    name: 'Scrisoare de garanție bancară (FNGCIMM)', nameRo: 'Scrisoare de garanție (FNGCIMM)', type: 'guarantee',
    provider: 'FNGCIMM', maxCoveragePct: 80, forReimbursementGap: true,
    eligibilitySnippet: 'Bank guarantee for advance payment; FNGCIMM covers up to ~80%.',
    eligibilitySnippetRo: 'Garanție pentru avans; FNGCIMM acoperă până la ~80%.',
    sourceUrl: 'https://www.fngcimm.ro/',
  },
  {
    name: 'Leasing financiar', nameRo: 'Leasing financiar', type: 'leasing',
    provider: 'Leasing companies', maxCoveragePct: 100, forReimbursementGap: false,
    eligibilitySnippet: 'Finance eligible equipment purchases outside the grant timeline.',
    eligibilitySnippetRo: 'Finanțează achiziții de echipamente eligibile.',
  },
  {
    name: 'Factoring', nameRo: 'Factoring', type: 'factoring',
    provider: 'Banks / factors', maxCoveragePct: 90, forReimbursementGap: true,
    eligibilitySnippet: 'Advance on receivables to ease the reimbursement gap.',
    eligibilitySnippetRo: 'Avans pe creanțe pentru decalajul de rambursare.',
  },
  {
    name: 'Venture capital / equity', nameRo: 'Capital de risc', type: 'equity',
    provider: 'VC funds', forReimbursementGap: false,
    eligibilitySnippet: 'Equity for scale-ups; complements grant co-financing.',
    eligibilitySnippetRo: 'Capital pentru scale-up; completează cofinanțarea.',
  },
];
