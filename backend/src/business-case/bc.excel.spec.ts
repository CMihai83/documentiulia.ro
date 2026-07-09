import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { generateWorkbookLive, populateWorkbookTemplate, ExcelModelInput } from './bc.excel';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const XlsxPopulate = require('xlsx-populate');

const INPUT: ExcelModelInput = {
  title: 'Extindere Fabrică',
  template: 'FIVE_CASE',
  appraisal: {
    discountRate: 0.1,
    npv: 24342.6,
    irr: 0.234,
    paybackYears: 2.0,
    discountedPaybackYears: 2.36,
    bcr: 1.19,
    roi: 0.5,
    cashflows: [
      { year: 0, capex: 100000, benefit: 0, opex: 0, net: -100000 },
      { year: 1, capex: 0, benefit: 60000, opex: 10000, net: 50000 },
      { year: 2, capex: 0, benefit: 60000, opex: 10000, net: 50000 },
      { year: 3, capex: 0, benefit: 60000, opex: 10000, net: 50000 },
    ],
  },
  extras: { mirr: 0.181, eac: 9788.35, financeRate: 0.1, reinvestRate: 0.12 },
  extended: {
    debtSchedule: {
      rows: [
        { period: 1, opening: 300000, interest: 3000, principal: 11122.04, payment: 14122.04, closing: 288877.96 },
        { period: 2, opening: 288877.96, interest: 2888.78, principal: 11233.26, payment: 14122.04, closing: 277644.7 },
      ],
    },
    coverage: { rows: [{ period: 1, dscr: 1.2, interestCover: 4 }], minDscr: 1.2 },
  },
  unitEconomics: { cac: 200, ltv: 2400, ltvToCac: 12, cacPaybackMonths: 1.67 },
};

describe('BC-303 generative Excel (live formulas)', () => {
  it('writes NPV/IRR/MIRR as real formulas with engine-cached values, re-read verified', async () => {
    const buf = await generateWorkbookLive(INPUT);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);

    expect(wb.worksheets.map((w) => w.name)).toEqual(['Assumptions', 'Cash Flow', 'Appraisal', 'Ratios']);

    const ap = wb.getWorksheet('Appraisal')!;
    const npvCell = ap.getCell('B2');
    const irrCell = ap.getCell('B3');
    const mirrCell = ap.getCell('B4');
    // formulas present as FORMULAS referencing the Cash Flow sheet
    expect(String(npvCell.formula)).toBe("'Cash Flow'!D2+NPV(Assumptions!$B$3,'Cash Flow'!D3:D5)");
    expect(String(irrCell.formula)).toBe("IRR('Cash Flow'!D2:D5)");
    expect(String(mirrCell.formula)).toBe("MIRR('Cash Flow'!D2:D5,Assumptions!$B$4,Assumptions!$B$5)");
    // cached results match the engine to the cent
    expect(Number(npvCell.result ?? (npvCell.value as any)?.result)).toBeCloseTo(24342.6, 2);
    expect(Number(irrCell.result ?? (irrCell.value as any)?.result)).toBeCloseTo(0.234, 6);
    expect(Number(mirrCell.result ?? (mirrCell.value as any)?.result)).toBeCloseTo(0.181, 6);

    // cash-flow rows landed (net column D)
    const cf = wb.getWorksheet('Cash Flow')!;
    expect(cf.getCell('D2').value).toBe(-100000);
    expect(cf.getCell('D5').value).toBe(50000);

    // ratios include debt schedule rows
    const ra = wb.getWorksheet('Ratios')!;
    const values: any[] = [];
    ra.eachRow((row) => values.push(row.getCell(1).value));
    expect(values).toContain('Min DSCR');
  });

  it('applies branding (footer text present) and defaults stay unbranded', async () => {
    const branded = await generateWorkbookLive({ ...INPUT, branding: { footerText: 'Firma Demo SRL — confidențial' } });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(branded as any);
    expect(wb.getWorksheet('Assumptions')!.getCell('A8').value).toBe('Firma Demo SRL — confidențial');

    const plain = await generateWorkbookLive(INPUT);
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(plain as any);
    expect(wb2.getWorksheet('Assumptions')!.getCell('A8').value ?? null).toBeNull();
  });
});

describe('BC-302 template Excel', () => {
  const templatePath = path.join(__dirname, '../../assets/bc/bc-template.xlsx');

  it('populates the committed template and re-read validates fields + tables', async () => {
    const tpl = fs.readFileSync(templatePath);
    const buf = await populateWorkbookTemplate(tpl, INPUT);
    const wb = await XlsxPopulate.fromDataAsync(buf);
    expect(wb.sheet('Summary').cell('B4').value()).toBe('Extindere Fabrică');
    expect(wb.sheet('Summary').cell('B6').value()).toBeCloseTo(24342.6, 2);
    expect(wb.sheet('Cash Flow').cell('A4').value()).toBe(0);
    expect(wb.sheet('Cash Flow').cell('D4').value()).toBe(-100000);
    expect(wb.sheet('Cash Flow').cell('D7').value()).toBe(50000);
    expect(wb.sheet('Debt').cell('C4').value()).toBeCloseTo(3000, 2);
    expect(wb.sheet('Debt').cell('F4').value()).toBeCloseTo(288877.96, 2);
  });
});
