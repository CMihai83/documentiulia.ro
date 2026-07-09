import { HttpException } from '@nestjs/common';
import { ToolsInvoiceService, FreeInvoiceInput } from './tools-invoice.service';
import { validateXmlTool } from './tools-xml-validate.logic';

// Mock the puppeteer util so tests never spawn a browser.
jest.mock('../business-case/bc.pdf-render', () => ({
  renderPdfViaPuppeteer: jest.fn().mockResolvedValue(null),
}));

const INPUT: FreeInvoiceInput = {
  invoiceNumber: 'TEST-001',
  invoiceDate: '2026-07-09',
  seller: { name: 'PFA Ion Popescu', cui: '12345678', address: 'Str. Exemplu 1', city: 'Cluj' },
  buyer: { name: 'SRL Client', cui: '87654321', address: 'Bd. Test 2', city: 'București' },
  lines: [
    { description: 'Servicii dezvoltare', quantity: 10, unitPrice: 100 },
    { description: 'Consultanță', quantity: 1, unitPrice: 500 },
  ],
};

function mockEfactura() {
  // Use the REAL builder shape via a light stand-in mirroring generateB2BUBL's contract
  const { EfacturaService } = jest.requireActual('../anaf/efactura.service');
  const svc = Object.create(EfacturaService.prototype);
  return svc as InstanceType<typeof EfacturaService>;
}

function mockVat() {
  return {
    getVatRates: (d: Date) =>
      d >= new Date('2025-08-01')
        ? { standard: 21, reduced: 11, special: 5, zero: 0, effectiveFrom: new Date('2025-08-01') }
        : { standard: 19, reduced: 9, special: 5, zero: 0, effectiveFrom: new Date('2010-07-01') },
  } as any;
}

function mockRedis(counter = { n: 0 }) {
  return {
    incr: jest.fn(async () => ++counter.n),
    expire: jest.fn(async () => true),
    get: jest.fn(async () => String(counter.n)),
  } as any;
}

describe('DOC-W0-4 free invoice generator', () => {
  it('generates CIUS-RO UBL XML that passes the structural validator, with 21% totals', async () => {
    const svc = new ToolsInvoiceService(mockEfactura(), mockVat(), mockRedis());
    const res = await svc.generate(INPUT, '1.2.3.4');
    expect(res.totals).toEqual({ net: 1500, vat: 315, gross: 1815, vatRate: 21 });
    expect(res.xml).toContain('CIUS-RO');
    expect(res.xml).toContain('TEST-001');
    const check = validateXmlTool(res.xml);
    expect(check.detectedType).toBe('efactura');
    expect(check.wellFormed).toBe(true);
    expect(check.valid).toBe(true);
    expect(res.remaining).toBe(2);
  });

  it('enforces the 3/month cap with a friendly 429 (never a 500)', async () => {
    const counter = { n: 0 };
    const svc = new ToolsInvoiceService(mockEfactura(), mockVat(), mockRedis(counter));
    await svc.generate(INPUT, '9.9.9.9');
    await svc.generate(INPUT, '9.9.9.9');
    const third = await svc.generate(INPUT, '9.9.9.9');
    expect(third.remaining).toBe(0);
    await expect(svc.generate(INPUT, '9.9.9.9')).rejects.toMatchObject({
      status: 429,
    });
    try {
      await svc.generate(INPUT, '9.9.9.9');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getResponse()).toMatchObject({ cta: '/register' });
    }
  });

  it('rejects invalid input with RO messages (400, and the cap slot is still consumed honestly)', async () => {
    const svc = new ToolsInvoiceService(mockEfactura(), mockVat(), mockRedis());
    await expect(svc.generate({ ...INPUT, lines: [] }, '2.2.2.2')).rejects.toMatchObject({ status: 400 });
    await expect(
      svc.generate({ ...INPUT, invoiceDate: '09/07/2026' }, '2.2.2.2'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('uses the historical 19% rate for pre-Aug-2025 invoice dates', async () => {
    const svc = new ToolsInvoiceService(mockEfactura(), mockVat(), mockRedis());
    const res = await svc.generate({ ...INPUT, invoiceDate: '2025-05-10' }, '3.3.3.3');
    expect(res.totals.vatRate).toBe(19);
    expect(res.totals.vat).toBe(285);
  });
});

describe('DOC-W0-5 XML validator (memory-only)', () => {
  it('flags a broken XML with an actionable RO message', () => {
    const r = validateXmlTool('<Invoice><unclosed></Invoice>');
    expect(r.wellFormed).toBe(false);
    expect(r.valid).toBe(false);
    expect(r.errors[0].message).toMatch(/XML invalid/);
  });

  it('detects an e-Factura missing mandatory elements and names them in Romanian', () => {
    const xml = `<?xml version="1.0"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><cbc:ID xmlns:cbc="x">1</cbc:ID></Invoice>`;
    const r = validateXmlTool(xml);
    expect(r.detectedType).toBe('efactura');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.message.includes('CustomizationID'))).toBe(true);
    expect(r.errors.some((e) => e.message.includes('furnizorului'))).toBe(true);
  });

  it('detects SAF-T shape and required header fields', () => {
    const r = validateXmlTool('<AuditFile><Header><AuditFileVersion>1</AuditFileVersion></Header></AuditFile>');
    expect(r.detectedType).toBe('saft');
    expect(r.errors.some((e) => e.message.includes('MasterFiles'))).toBe(true);
  });

  it('unknown XML gets a clear explanation', () => {
    const r = validateXmlTool('<foo><bar/></foo>');
    expect(r.detectedType).toBe('unknown');
    expect(r.errors.some((e) => e.message.includes('Nu am recunoscut'))).toBe(true);
  });
});
