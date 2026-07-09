import { Logger } from '@nestjs/common';
import { BcBranding } from './bc.charts';

/**
 * BC-305 — real PDF rendering for the BC deliverable.
 *
 * Wraps the EXISTING bc.deliverable HTML (content layer untouched) with a cover
 * + table of contents and prints it via Puppeteer (A4, page numbers in the
 * footer template). Fallback contract: if Chromium cannot launch or the render
 * fails for ANY reason, the caller falls back to the legacy fromHTML stub and
 * marks renderer:'fallback' — the endpoint never 500s over PDF rendering.
 *
 * The Docker image installs the Chromium shared libraries (see Dockerfile);
 * bare hosts without them exercise the fallback path by design.
 */

const logger = new Logger('BcPdfRender');

export interface TocEntry {
  id: string;
  title: string;
}

/** Prepend a cover + TOC to the deliverable HTML and add print CSS. */
export function wrapHtmlForPrint(
  html: string,
  opts: { title: string; maturity: string; locale: 'ro' | 'en'; toc: TocEntry[]; branding?: BcBranding | null },
): string {
  const t = opts.locale === 'en' ? { toc: 'Table of contents' } : { toc: 'Cuprins' };
  const primary = opts.branding?.primaryColor || '#0b7681';
  const logo = opts.branding?.logoDataUri ? `<img src="${opts.branding.logoDataUri}" style="height:56px" alt="logo" />` : '';
  const tocItems = opts.toc.map((e, i) => `<li>${i + 1}. ${e.title}</li>`).join('\n');
  const cover = `
  <section class="bc-cover">
    ${logo}
    <h1 style="color:${primary}">${opts.title}</h1>
    <p class="bc-maturity">${opts.maturity}</p>
  </section>
  <section class="bc-toc">
    <h2 style="color:${primary}">${t.toc}</h2>
    <ol class="bc-toc-list">${tocItems}</ol>
  </section>`;
  const printCss = `
  <style>
    @media print {
      .bc-cover { page-break-after: always; padding-top: 35%; text-align: center; }
      .bc-toc { page-break-after: always; }
      h2 { page-break-before: always; }
      .bc-toc h2, .bc-cover h1 { page-break-before: avoid; }
    }
    .bc-toc-list li { margin: 4px 0; font-size: 13px; }
    .bc-maturity { color: #666; letter-spacing: 2px; }
  </style>`;
  // inject right after <body> if present, else prepend
  if (html.includes('<body>')) return html.replace('<body>', `<body>${printCss}${cover}`);
  return `${printCss}${cover}${html}`;
}

/** Render HTML to a real PDF via Puppeteer. Returns null when unavailable (caller falls back). */
export async function renderPdfViaPuppeteer(
  html: string,
  opts: { footerText?: string | null },
): Promise<Buffer | null> {
  let browser: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-crashpad', '--disable-crash-reporter', '--crash-dumps-dir=/tmp'],
      timeout: 20_000,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20_000 });
    const footerLeft = (opts.footerText ?? 'DocumentIulia').slice(0, 80).replace(/</g, '&lt;');
    const pdf: Buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-size:8px;color:#888;padding:0 12mm;display:flex;justify-content:space-between;">
        <span>${footerLeft}</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
      margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
    });
    return Buffer.from(pdf);
  } catch (e: any) {
    logger.warn(`Puppeteer render unavailable (${String(e?.message).slice(0, 160)}) — falling back to stub renderer`);
    return null;
  } finally {
    try {
      if (browser) await browser.close();
    } catch {
      /* ignore */
    }
  }
}

/** Count pages in a PDF buffer (naive /Type /Page scan; good enough for tests). */
export function pdfPageCount(buf: Buffer): number {
  const s = buf.toString('latin1');
  const matches = s.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}
