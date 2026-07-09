/**
 * One-time builder for the committed BC workbook template (bc-template.xlsx).
 * Kept for provenance — re-run `node assets/bc/build-template.js` to regenerate.
 * Layout contract (consumed by populateWorkbookTemplate in bc.excel.ts):
 *   Summary:  A1 brand title bar · B4 title · B5 template · B6 NPV · B7 IRR
 *             B8 MIRR · B9 payback · A11 footer text
 *   Cash Flow: headers row 3 (Year/Benefit/Opex·Capex/Net), data from row 4
 *   Debt:      headers row 3 (Period/Opening/Interest/Principal/Payment/Closing), data from row 4
 */
const ExcelJS = require('exceljs');

(async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DocumentIulia';
  const teal = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B7681' } };
  const white = { bold: true, color: { argb: 'FFFFFFFF' } };

  const s = wb.addWorksheet('Summary');
  s.mergeCells('A1:D1');
  s.getCell('A1').value = 'DocumentIulia — Business Case';
  s.getCell('A1').fill = teal;
  s.getCell('A1').font = { ...white, size: 14 };
  const labels = [['A4','Title'],['A5','Template'],['A6','NPV'],['A7','IRR'],['A8','MIRR'],['A9','Payback (years)']];
  for (const [addr, label] of labels) { s.getCell(addr).value = label; s.getCell(addr).font = { bold: true }; }
  s.getCell('A11').value = '';
  s.getColumn(1).width = 22; s.getColumn(2).width = 24;

  const cf = wb.addWorksheet('Cash Flow');
  cf.mergeCells('A1:D1');
  cf.getCell('A1').value = 'Cash Flow';
  cf.getCell('A1').fill = teal; cf.getCell('A1').font = white;
  ['Year','Benefit','Opex/Capex','Net'].forEach((h, i) => {
    const c = cf.getRow(3).getCell(i + 1); c.value = h; c.font = { bold: true }; c.fill = teal; c.font = white;
  });
  ['A','B','C','D'].forEach((c) => (cf.getColumn(c).width = 14));

  const d = wb.addWorksheet('Debt');
  d.mergeCells('A1:F1');
  d.getCell('A1').value = 'Debt schedule';
  d.getCell('A1').fill = teal; d.getCell('A1').font = white;
  ['Period','Opening','Interest','Principal','Payment','Closing'].forEach((h, i) => {
    const c = d.getRow(3).getCell(i + 1); c.value = h; c.fill = teal; c.font = white;
  });
  ['A','B','C','D','E','F'].forEach((c) => (d.getColumn(c).width = 13));

  await wb.xlsx.writeFile(__dirname + '/bc-template.xlsx');
  console.log('bc-template.xlsx written');
})();
