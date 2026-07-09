import { createHash } from 'crypto';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EfacturaService } from '../anaf/efactura.service';
import { RedisService } from '../redis/redis.service';
import { VatCalculationService } from '../vat/services/vat-calculation.service';
import { renderPdfViaPuppeteer } from '../business-case/bc.pdf-render';

export interface FreeInvoiceParty {
  name: string;
  cui?: string;
  address: string;
  city?: string;
  county?: string;
  email?: string;
}

export interface FreeInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface FreeInvoiceInput {
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string;
  seller: FreeInvoiceParty & { iban?: string; bank?: string };
  buyer: FreeInvoiceParty;
  lines: FreeInvoiceLine[];
  vatCategory?: 'STANDARD' | 'REDUCED';
  notes?: string;
}

const MONTHLY_CAP = 3;
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * DOC-W0-4 — free invoice + e-Factura UBL 2.1 XML for anonymous visitors.
 * Cap: 3/month per hashed IP (Redis, ~32-day TTL) — the 4th attempt gets a
 * friendly 429 with a signup CTA, never a 500. Nothing is persisted to the DB.
 */
@Injectable()
export class ToolsInvoiceService {
  private readonly logger = new Logger(ToolsInvoiceService.name);

  constructor(
    private readonly efactura: EfacturaService,
    private readonly vatCalc: VatCalculationService,
    private readonly redis: RedisService,
  ) {}

  private capKey(ip: string): string {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const iphash = createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 24);
    return `tools:invcap:${iphash}:${month}`;
  }

  async remaining(ip: string): Promise<number> {
    const used = Number((await this.redis.get<string>(this.capKey(ip))) ?? 0);
    return Math.max(0, MONTHLY_CAP - used);
  }

  async generate(input: FreeInvoiceInput, ip: string) {
    // ---- cap gate (friendly, never a 500) ----
    const key = this.capKey(ip);
    const used = await this.redis.incr(key);
    if (used === 1) await this.redis.expire(key, 32 * 24 * 3600);
    if (used > MONTHLY_CAP) {
      throw new HttpException(
        {
          message:
            'Ai folosit cele 3 facturi gratuite din această lună. Creează-ți un cont gratuit pentru facturare nelimitată.',
          messageEn: 'You have used the 3 free invoices this month. Create a free account for unlimited invoicing.',
          cta: '/register',
          cap: MONTHLY_CAP,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.validate(input);

    // ---- totals with the statutory date-aware rate ----
    const cfg = this.vatCalc.getVatRates(new Date(input.invoiceDate));
    const rate = input.vatCategory === 'REDUCED' ? cfg.reduced : cfg.standard;
    const lines = input.lines.map((l, i) => {
      const total = r2(l.quantity * l.unitPrice);
      return {
        id: String(i + 1),
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate: rate,
        total,
      };
    });
    const net = r2(lines.reduce((s, l) => s + l.total, 0));
    const vat = r2((net * rate) / 100);
    const gross = r2(net + vat);

    // ---- e-Factura UBL 2.1 XML via the existing CIUS-RO builder ----
    const xml = this.efactura.generateB2BUBL({
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      note: input.notes,
      supplier: {
        cui: input.seller.cui || '0000000000000',
        name: input.seller.name,
        address: input.seller.address,
        city: input.seller.city || 'București',
        county: input.seller.county,
        country: 'RO',
        email: input.seller.email,
        bankAccount: input.seller.iban,
        bankName: input.seller.bank,
      },
      customer: {
        cui: input.buyer.cui || '0000000000000',
        name: input.buyer.name,
        address: input.buyer.address,
        city: input.buyer.city || 'București',
        county: input.buyer.county,
        country: 'RO',
        email: input.buyer.email,
      },
      lines,
      totals: { net, vat, gross },
    } as any);

    // ---- PDF (best-effort; XML is the compliance artifact) ----
    let pdfBase64: string | null = null;
    try {
      const buf = await renderPdfViaPuppeteer(this.invoiceHtml(input, lines, { net, vat, gross }, rate), { footerText: 'DocumentIulia.ro — factură generată gratuit' });
      if (buf) pdfBase64 = buf.toString('base64');
    } catch (e: any) {
      this.logger.warn(`Invoice PDF render unavailable: ${e?.message}`);
    }

    return {
      xml,
      pdfBase64,
      totals: { net, vat, gross, vatRate: rate },
      remaining: Math.max(0, MONTHLY_CAP - used),
      cta: 'Cont gratuit → facturare nelimitată, e-Factura direct în SPV.',
    };
  }

  private validate(i: FreeInvoiceInput): void {
    const bad = (msg: string) => {
      throw new HttpException({ message: msg }, HttpStatus.BAD_REQUEST);
    };
    if (!i?.invoiceNumber?.trim()) bad('Numărul facturii este obligatoriu.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i?.invoiceDate ?? '')) bad('Data facturii trebuie să fie YYYY-MM-DD.');
    if (!i?.seller?.name?.trim() || !i?.seller?.address?.trim()) bad('Datele furnizorului sunt incomplete.');
    if (!i?.buyer?.name?.trim() || !i?.buyer?.address?.trim()) bad('Datele cumpărătorului sunt incomplete.');
    if (!Array.isArray(i?.lines) || i.lines.length === 0 || i.lines.length > 50) bad('Factura trebuie să aibă între 1 și 50 de linii.');
    for (const l of i.lines) {
      if (!l.description?.trim()) bad('Fiecare linie are nevoie de o descriere.');
      if (!(l.quantity > 0) || !(l.unitPrice >= 0)) bad('Cantitatea și prețul trebuie să fie pozitive.');
    }
  }

  private invoiceHtml(
    i: FreeInvoiceInput,
    lines: Array<{ description: string; quantity: number; unitPrice: number; total: number }>,
    totals: { net: number; vat: number; gross: number },
    rate: number,
  ): string {
    const esc = (s?: string) =>
      (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows = lines
      .map(
        (l, idx) =>
          `<tr><td>${idx + 1}</td><td>${esc(l.description)}</td><td class="n">${l.quantity}</td><td class="n">${l.unitPrice.toFixed(2)}</td><td class="n">${l.total.toFixed(2)}</td></tr>`,
      )
      .join('');
    return `<style>
      body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111}
      h1{font-size:20px;margin:0 0 4px} .muted{color:#666}
      table{width:100%;border-collapse:collapse;margin-top:14px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left} td.n,th.n{text-align:right}
      .tot{margin-top:10px;width:40%;margin-left:auto} .tot td{border:none;padding:3px 8px}
      .parties{display:flex;gap:40px;margin-top:12px} .parties div{flex:1}
      .foot{margin-top:24px;font-size:10px;color:#888}
    </style>
    <h1>FACTURĂ ${esc(i.invoiceNumber)}</h1>
    <div class="muted">Data: ${esc(i.invoiceDate)}${i.dueDate ? ' · Scadență: ' + esc(i.dueDate) : ''}</div>
    <div class="parties">
      <div><b>Furnizor</b><br>${esc(i.seller.name)}<br>${i.seller.cui ? 'CUI: ' + esc(i.seller.cui) + '<br>' : ''}${esc(i.seller.address)}${i.seller.iban ? '<br>IBAN: ' + esc(i.seller.iban) : ''}</div>
      <div><b>Cumpărător</b><br>${esc(i.buyer.name)}<br>${i.buyer.cui ? 'CUI: ' + esc(i.buyer.cui) + '<br>' : ''}${esc(i.buyer.address)}</div>
    </div>
    <table><thead><tr><th>#</th><th>Descriere</th><th class="n">Cant.</th><th class="n">Preț unitar</th><th class="n">Valoare</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="tot">
      <tr><td>Subtotal (fără TVA)</td><td class="n">${totals.net.toFixed(2)} RON</td></tr>
      <tr><td>TVA ${rate}%</td><td class="n">${totals.vat.toFixed(2)} RON</td></tr>
      <tr><td><b>TOTAL</b></td><td class="n"><b>${totals.gross.toFixed(2)} RON</b></td></tr>
    </table>
    ${i.notes ? `<p>${esc(i.notes)}</p>` : ''}
    <p class="foot">Generat gratuit cu DocumentIulia.ro — facturare nelimitată cu cont gratuit. Document informativ; XML-ul e-Factura însoțitor este formatul fiscal.</p>`;
  }
}
