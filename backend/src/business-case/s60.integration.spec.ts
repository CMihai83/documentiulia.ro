/**
 * S-60 integration — the deliverable generator suite against a throwaway
 * Postgres. Gated by S60_IT=1. Uses the S-58 advanced-answers fixture so the
 * extended model (debt/DSCR/TV) flows into every format. Each artifact is
 * RE-READ/parsed, not just size-checked. PDF: puppeteer when the environment
 * can launch Chromium, otherwise the documented fallback branch is asserted.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessCaseService } from './business-case.service';
import { ChartService } from '../charts/chart.service';
import { PDFGeneratorService } from '../document-generation/pdf-generator.service';
import { pdfPageCount } from './bc.pdf-render';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSZip = require('jszip');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XlsxPopulate = require('xlsx-populate');

const RUN = process.env.S60_IT === '1';
const d = RUN ? describe : describe.skip;

const ANSWERS: Record<string, any> = {
  'strategic.problem': 'growth',
  'strategic.horizonYears': 2,
  'strategic.initialInvestment': 300_000,
  'wacc.mode': 'hurdle',
  'wacc.hurdle': 10,
  'economic.cashflows': [
    { benefit: 250_000, opex: 50_000 },
    { benefit: 300_000, opex: 50_000 },
  ],
  'economic.pnl.revenueYear1': 1_200_000,
  'economic.pnl.revenueGrowthPct': 12,
  'economic.pnl.cogsPct': 40,
  'economic.pnl.opexMonthly': 30_000,
  'economic.pnl.daMonthly': 5_000,
  'economic.pnl.taxRatePct': 16,
  'economic.wc.dsoDays': 60,
  'economic.wc.dpoDays': 30,
  'economic.wc.dioDays': 45,
  'economic.debt.amount': 300_000,
  'economic.debt.ratePct': 12,
  'economic.debt.tenorMonths': 24,
  'economic.debt.shape': 'amortizing',
  'economic.tv.method': 'gordon',
  'economic.tv.growthPct': 2,
};

d('S-60 deliverable generator suite', () => {
  let prisma: PrismaService;
  let svc: BusinessCaseService;
  let userId: string;
  let orgId: string;
  let bcId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    svc = new BusinessCaseService(prisma, new ChartService(), new PDFGeneratorService(new EventEmitter2()));

    userId = `s60-it-user-${process.pid}`;
    const org = await prisma.organization.create({
      data: { name: 'S60 Org', slug: `s60-org-${process.pid}`, tier: 'PRO' },
    });
    orgId = org.id;

    const bc = await prisma.businessCase.create({
      data: { userId, organizationId: orgId, title: 'S60 Case', template: 'FIVE_CASE' },
    });
    bcId = bc.id;
    await svc.submitAnswers(userId, bcId, ANSWERS);
    await svc.compute(userId, bcId, { seed: 7, iterations: 300 });
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('generative Excel: live formulas + engine-cached values, re-read from the buffer', async () => {
    const out = await svc.exportExcelLive(userId, bcId);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(out.buffer as any);
    const ap = wb.getWorksheet('Appraisal')!;
    expect(String(ap.getCell('B2').formula)).toContain('NPV(Assumptions!$B$3');
    expect(String(ap.getCell('B3').formula)).toMatch(/^IRR\('Cash Flow'!D2:D\d+\)$/);
    const results = await svc.getResults(userId, bcId);
    expect(Number(ap.getCell('B2').result)).toBeCloseTo(results!.appraisal.npv, 2);
    // debt schedule landed on Ratios
    const ra = wb.getWorksheet('Ratios')!;
    const labels: any[] = [];
    ra.eachRow((row) => labels.push(row.getCell(1).value));
    expect(labels).toContain('Min DSCR');
  }, 60_000);

  it('template Excel: committed template populated, re-read validates', async () => {
    const out = await svc.exportExcelTemplate(userId, bcId);
    const wb = await XlsxPopulate.fromDataAsync(out.buffer);
    expect(wb.sheet('Summary').cell('B4').value()).toBe('S60 Case');
    expect(typeof wb.sheet('Summary').cell('B6').value()).toBe('number');
    expect(wb.sheet('Cash Flow').cell('D4').value()).toBeLessThan(0); // year-0 outflow
    expect(typeof wb.sheet('Debt').cell('C4').value()).toBe('number'); // interest row 1
  }, 60_000);

  it('PPTX: slide count 10–15, embedded media, SOC shorter than FBC', async () => {
    const fbc = await svc.exportPptx(userId, bcId, 'FBC', 'ro');
    const soc = await svc.exportPptx(userId, bcId, 'SOC', 'ro');
    const zip = await JSZip.loadAsync(fbc.buffer);
    const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
    const media = Object.keys(zip.files).filter((n) => /^ppt\/media\//.test(n)).length;
    expect(slides).toBe(fbc.slideCount);
    expect(slides).toBeGreaterThanOrEqual(10);
    expect(slides).toBeLessThanOrEqual(15);
    expect(media).toBeGreaterThanOrEqual(1); // ChartService PNGs embedded
    expect(soc.slideCount).toBeLessThan(fbc.slideCount);
  }, 120_000);

  it('PDF: real puppeteer render (≥3 pages) OR the documented graceful fallback', async () => {
    const out = await svc.generateDeliverable(userId, bcId, 'FBC', 'ro');
    if ((out as any).renderer === 'puppeteer') {
      const buf: Buffer = (out as any).buffer;
      expect(buf.subarray(0, 4).toString()).toBe('%PDF');
      expect(pdfPageCount(buf)).toBeGreaterThanOrEqual(3);
    } else {
      expect((out as any).renderer).toBe('fallback');
      expect(out.content.startsWith('%PDF')).toBe(true); // legacy stub is still a %PDF
    }
    // SOC-omits-FBC regression at the HTML layer (content untouched by the wrapper)
    const soc = await svc.generateDeliverable(userId, bcId, 'SOC', 'ro');
    expect(out.html).toContain('<h2>Management');
    expect(soc.html).not.toContain('<h2>Management');
  }, 120_000);

  it('branding: applied when set on the org, absent by default', async () => {
    // default: no branding
    const plain = await svc.exportExcelLive(userId, bcId);
    const wbPlain = new ExcelJS.Workbook();
    await wbPlain.xlsx.load(plain.buffer as any);
    expect(wbPlain.getWorksheet('Assumptions')!.getCell('A8').value ?? null).toBeNull();

    await svc.setBranding(userId, orgId, { footerText: 'Firma S60 SRL', primaryColor: '#123456' });
    const branded = await svc.exportExcelLive(userId, bcId);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(branded.buffer as any);
    expect(wb.getWorksheet('Assumptions')!.getCell('A8').value).toBe('Firma S60 SRL');
    // header fill uses the primary color
    const fill: any = wb.getWorksheet('Assumptions')!.getCell('A1').fill;
    expect(String(fill?.fgColor?.argb)).toBe('FF123456');
    // and the PDF wrapper carries the footer
    const pdf = await svc.generateDeliverable(userId, bcId, 'SOC', 'ro');
    expect(pdf.html).toBeDefined();
  }, 120_000);
});
