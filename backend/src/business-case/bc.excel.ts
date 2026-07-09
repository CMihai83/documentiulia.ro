import * as ExcelJS from 'exceljs';
import { BcBranding } from './bc.charts';

/**
 * S-60 Excel generators.
 *
 * BC-303 generative path (ExcelJS): builds Assumptions / Cash Flow / Appraisal /
 * Ratios from scratch. Appraisal cells hold LIVE Excel formulas (=NPV/=IRR/=MIRR)
 * referencing the Cash Flow sheet, with cached results set to the engine outputs
 * so the stored values match the platform to the cent while a bank analyst who
 * edits the assumptions sees everything recalculate.
 *
 * BC-302 template path (xlsx-populate): loads the committed branded template at
 * backend/assets/bc/bc-template.xlsx and injects values at documented addresses.
 *
 * Excel NPV note: Excel's NPV() discounts from t=1, so the year-0 flow is added
 * undiscounted outside the call — `='Cash Flow'!D2+NPV(rate, 'Cash Flow'!D3:Dn)`
 * matches the engine's convention exactly.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const XlsxPopulate = require('xlsx-populate');

export interface ExcelModelInput {
  title: string;
  template: string;
  appraisal: {
    discountRate: number;
    npv: number;
    irr: number | null;
    paybackYears: number | null;
    discountedPaybackYears: number | null;
    bcr: number;
    roi: number;
    cashflows: { year: number; capex: number; benefit: number; opex: number; net: number }[];
  };
  extras?: { mirr: number | null; eac: number | null; financeRate?: number; reinvestRate?: number } | null;
  extended?: {
    annual?: any[];
    debtSchedule?: { rows: { period: number; opening: number; interest: number; principal: number; payment: number; closing: number }[] } | null;
    coverage?: { rows: { period: number; dscr: number | null; interestCover: number | null }[]; minDscr?: number | null } | null;
  } | null;
  unitEconomics?: { cac?: number; ltv?: number; ltvToCac?: number; cacPaybackMonths?: number; capped?: boolean } | null;
  branding?: BcBranding | null;
}

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B7681' } };

function applyHeader(ws: ExcelJS.Worksheet, row: number, cols: string[], color?: string) {
  const fill: ExcelJS.Fill = color
    ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color.replace('#', '').toUpperCase() } }
    : HEADER_FILL;
  cols.forEach((label, i) => {
    const c = ws.getRow(row).getCell(i + 1);
    c.value = label;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = fill;
  });
}

/** BC-303 — generative workbook with live formulas. Returns the xlsx buffer. */
export async function generateWorkbookLive(input: ExcelModelInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DocumentIulia';
  const primary = input.branding?.primaryColor;

  // ---- Assumptions ----
  const asm = wb.addWorksheet('Assumptions');
  applyHeader(asm, 1, ['Assumption', 'Value'], primary);
  asm.getCell('A2').value = 'Title';
  asm.getCell('B2').value = input.title;
  asm.getCell('A3').value = 'Discount rate';
  asm.getCell('B3').value = input.appraisal.discountRate;
  asm.getCell('A4').value = 'Finance rate (MIRR)';
  asm.getCell('B4').value = input.extras?.financeRate ?? input.appraisal.discountRate;
  asm.getCell('A5').value = 'Reinvest rate (MIRR)';
  asm.getCell('B5').value = input.extras?.reinvestRate ?? input.appraisal.discountRate;
  asm.getCell('A6').value = 'Horizon (years)';
  asm.getCell('B6').value = Math.max(...input.appraisal.cashflows.map((r) => r.year));
  if (input.branding?.footerText) {
    asm.getCell('A8').value = input.branding.footerText;
    asm.getCell('A8').font = { italic: true, size: 9 };
  }
  // BC-306: tenant logo on the Assumptions sheet (generative path only —
  // xlsx-populate cannot inject images into the template path).
  if (input.branding?.logoDataUri?.startsWith('data:image/png;base64,')) {
    try {
      const imageId = wb.addImage({ base64: input.branding.logoDataUri.split(',')[1], extension: 'png' });
      asm.addImage(imageId, { tl: { col: 3, row: 1 }, ext: { width: 120, height: 48 } });
    } catch { /* logo is cosmetic — never fail the workbook */ }
  }
  asm.getColumn(1).width = 26;
  asm.getColumn(2).width = 18;

  // ---- Cash Flow (net in column D, rows 2..N+1; year 0 first) ----
  const cf = wb.addWorksheet('Cash Flow');
  applyHeader(cf, 1, ['Year', 'Benefit', 'Opex', 'Net'], primary);
  input.appraisal.cashflows.forEach((r, i) => {
    const row = cf.getRow(i + 2);
    row.getCell(1).value = r.year;
    row.getCell(2).value = r.benefit;
    row.getCell(3).value = r.year === 0 ? r.capex : r.opex;
    row.getCell(4).value = r.net;
  });
  const lastRow = input.appraisal.cashflows.length + 1; // data ends here
  ['A', 'B', 'C', 'D'].forEach((c) => (cf.getColumn(c).width = 14));

  // ---- Appraisal (LIVE formulas + cached engine results) ----
  const ap = wb.addWorksheet('Appraisal');
  applyHeader(ap, 1, ['Metric', 'Value'], primary);
  const rows: { label: string; formula?: string; value: number | string | null }[] = [
    {
      label: 'NPV',
      formula: `'Cash Flow'!D2+NPV(Assumptions!$B$3,'Cash Flow'!D3:D${lastRow})`,
      value: input.appraisal.npv,
    },
    { label: 'IRR', formula: `IRR('Cash Flow'!D2:D${lastRow})`, value: input.appraisal.irr },
    {
      label: 'MIRR',
      formula: `MIRR('Cash Flow'!D2:D${lastRow},Assumptions!$B$4,Assumptions!$B$5)`,
      value: input.extras?.mirr ?? null,
    },
    { label: 'Payback (years)', value: input.appraisal.paybackYears },
    { label: 'Discounted payback (years)', value: input.appraisal.discountedPaybackYears },
    { label: 'BCR', value: input.appraisal.bcr },
    { label: 'ROI', value: input.appraisal.roi },
    { label: 'EAC', value: input.extras?.eac ?? null },
  ];
  rows.forEach((r, i) => {
    const row = ap.getRow(i + 2);
    row.getCell(1).value = r.label;
    if (r.formula && r.value !== null && r.value !== undefined) {
      row.getCell(2).value = { formula: r.formula, result: r.value as number } as ExcelJS.CellFormulaValue;
    } else {
      row.getCell(2).value = r.value ?? 'n/a';
    }
  });
  ap.getColumn(1).width = 28;
  ap.getColumn(2).width = 18;

  // ---- Ratios (values; debt schedule + DSCR when the extended model exists) ----
  const ra = wb.addWorksheet('Ratios');
  applyHeader(ra, 1, ['Ratio', 'Value'], primary);
  const ratioRows: [string, number | string | null][] = [];
  const cov = input.extended?.coverage;
  if (cov?.minDscr !== undefined && cov?.minDscr !== null) ratioRows.push(['Min DSCR', cov.minDscr]);
  if (input.unitEconomics?.ltvToCac !== undefined) ratioRows.push(['LTV / CAC', input.unitEconomics.ltvToCac ?? null]);
  if (input.unitEconomics?.cacPaybackMonths !== undefined) ratioRows.push(['CAC payback (months)', input.unitEconomics.cacPaybackMonths ?? null]);
  ratioRows.push(['BCR', input.appraisal.bcr], ['ROI', input.appraisal.roi]);
  ratioRows.forEach(([label, value], i) => {
    ra.getRow(i + 2).getCell(1).value = label;
    ra.getRow(i + 2).getCell(2).value = value ?? 'n/a';
  });
  const debt = input.extended?.debtSchedule;
  if (debt?.rows?.length) {
    const start = ratioRows.length + 4;
    applyHeader(ra, start, ['Period', 'Opening', 'Interest', 'Principal', 'Payment', 'Closing'], primary);
    debt.rows.forEach((d, i) => {
      const row = ra.getRow(start + 1 + i);
      row.getCell(1).value = d.period;
      row.getCell(2).value = d.opening;
      row.getCell(3).value = d.interest;
      row.getCell(4).value = d.principal;
      row.getCell(5).value = d.payment;
      row.getCell(6).value = d.closing;
    });
  }
  ra.getColumn(1).width = 24;

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

/**
 * BC-302 — template path. Injects values into the committed branded template.
 * Documented addresses — Summary: B4 title, B5 template, B6 NPV, B7 IRR, B8 MIRR,
 * B9 payback, A11 footer; Cash Flow: table from row 4; Debt: table from row 4.
 */
export async function populateWorkbookTemplate(templateBuf: Buffer, input: ExcelModelInput): Promise<Buffer> {
  const wb = await XlsxPopulate.fromDataAsync(templateBuf);
  const summary = wb.sheet('Summary');
  summary.cell('B4').value(input.title);
  summary.cell('B5').value(input.template);
  summary.cell('B6').value(input.appraisal.npv);
  summary.cell('B7').value(input.appraisal.irr ?? 'n/a');
  summary.cell('B8').value(input.extras?.mirr ?? 'n/a');
  summary.cell('B9').value(input.appraisal.paybackYears ?? 'n/a');
  if (input.branding?.footerText) summary.cell('A11').value(input.branding.footerText);

  const cf = wb.sheet('Cash Flow');
  input.appraisal.cashflows.forEach((r, i) => {
    const row = 4 + i;
    cf.cell(`A${row}`).value(r.year);
    cf.cell(`B${row}`).value(r.benefit);
    cf.cell(`C${row}`).value(r.year === 0 ? r.capex : r.opex);
    cf.cell(`D${row}`).value(r.net);
  });

  const debt = input.extended?.debtSchedule;
  const debtSheet = wb.sheet('Debt');
  if (debt?.rows?.length && debtSheet) {
    debt.rows.forEach((d, i) => {
      const row = 4 + i;
      debtSheet.cell(`A${row}`).value(d.period);
      debtSheet.cell(`B${row}`).value(d.opening);
      debtSheet.cell(`C${row}`).value(d.interest);
      debtSheet.cell(`D${row}`).value(d.principal);
      debtSheet.cell(`E${row}`).value(d.payment);
      debtSheet.cell(`F${row}`).value(d.closing);
    });
  }

  return (await wb.outputAsync()) as Buffer;
}
