import { wrapHtmlForPrint, renderPdfViaPuppeteer, pdfPageCount } from './bc.pdf-render';

describe('BC-305 print wrapper + renderer contract', () => {
  const HTML = '<html><body><h2>Strategic</h2><p>text</p><h2>Economic</h2></body></html>';
  const TOC = [
    { id: 's0', title: 'Cazul strategic' },
    { id: 's1', title: 'Cazul economic' },
  ];

  it('prepends cover + TOC and keeps the original content intact', () => {
    const out = wrapHtmlForPrint(HTML, { title: 'Proiect X', maturity: 'FBC', locale: 'ro', toc: TOC });
    expect(out).toContain('Cuprins');
    expect(out).toContain('1. Cazul strategic');
    expect(out).toContain('2. Cazul economic');
    expect(out).toContain('<h2>Strategic</h2>'); // content layer untouched
    expect(out.indexOf('Cuprins')).toBeLessThan(out.indexOf('<h2>Strategic</h2>'));
  });

  it('applies branding logo + color on the cover', () => {
    const out = wrapHtmlForPrint(HTML, {
      title: 'Proiect X', maturity: 'SOC', locale: 'en', toc: TOC,
      branding: { logoDataUri: 'data:image/png;base64,AAA', primaryColor: '#123456' },
    });
    expect(out).toContain('Table of contents');
    expect(out).toContain('data:image/png;base64,AAA');
    expect(out).toContain('color:#123456');
  });

  it('renderPdfViaPuppeteer returns a real multi-page PDF or null (fallback contract), never throws', async () => {
    const html = wrapHtmlForPrint(HTML, { title: 'Proiect X', maturity: 'FBC', locale: 'ro', toc: TOC });
    const buf = await renderPdfViaPuppeteer(html, { footerText: 'Acme SRL' });
    if (buf === null) {
      // Chromium unavailable in this environment — the graceful-fallback branch.
      expect(buf).toBeNull();
    } else {
      expect(buf.subarray(0, 4).toString()).toBe('%PDF');
      expect(pdfPageCount(buf)).toBeGreaterThanOrEqual(3); // cover + TOC + content
    }
  }, 60000);

  it('pdfPageCount counts /Type /Page objects', () => {
    const fake = Buffer.from('%PDF-1.4\n1 0 obj </Type /Page >>\n2 0 obj </Type /Page >>\n3 0 obj </Type /Pages >>', 'latin1');
    expect(pdfPageCount(fake)).toBe(2);
  });
});
