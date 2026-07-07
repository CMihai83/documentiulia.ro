import { SaftValidatorService } from './saft-validator.service';

/**
 * DOC-42-4 — SAF-T D406 validator refresh:
 * monthly/quarterly period detection + Romanian-language errors.
 */
describe('SaftValidatorService — period type & RO messages (DOC-42-4)', () => {
  let svc: SaftValidatorService;
  beforeEach(() => {
    svc = new SaftValidatorService();
  });

  describe('detectPeriod', () => {
    it('detects a full calendar month', () => {
      expect(svc.detectPeriod('2026-07-01', '2026-07-31').type).toBe('monthly');
    });
    it('detects a full calendar quarter', () => {
      expect(svc.detectPeriod('2026-07-01', '2026-09-30').type).toBe('quarterly');
    });
    it('detects a full calendar year', () => {
      expect(svc.detectPeriod('2026-01-01', '2026-12-31').type).toBe('annual');
    });
    it('rejects a partial month', () => {
      expect(svc.detectPeriod('2026-07-01', '2026-07-15').type).toBe('invalid');
    });
    it('rejects a period not starting on day 1', () => {
      expect(svc.detectPeriod('2026-07-05', '2026-08-31').type).toBe('invalid');
    });
    it('rejects 3 months not aligned to a calendar quarter (Feb–Apr)', () => {
      expect(svc.detectPeriod('2026-02-01', '2026-04-30').type).toBe('invalid');
    });
  });

  const doc = (start: string, end: string, country = 'RO', basis = 'A') =>
    `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile>
  <Header>
    <AuditFileVersion>2.0</AuditFileVersion>
    <AuditFileCountry>${country}</AuditFileCountry>
    <AuditFileDateCreated>2026-08-01</AuditFileDateCreated>
    <SoftwareCompanyName>DocumentIulia</SoftwareCompanyName>
    <SoftwareID>DI-ERP</SoftwareID>
    <SoftwareVersion>1.0</SoftwareVersion>
    <Company>
      <RegistrationNumber>RO12345678</RegistrationNumber>
      <Name>Test SRL</Name>
      <Address>Str. Exemplu 1</Address>
    </Company>
    <DefaultCurrencyCode>RON</DefaultCurrencyCode>
    <SelectionCriteria>
      <SelectionStartDate>${start}</SelectionStartDate>
      <SelectionEndDate>${end}</SelectionEndDate>
    </SelectionCriteria>
    <TaxAccountingBasis>${basis}</TaxAccountingBasis>
  </Header>
</AuditFile>`;

  it('valid monthly D406 passes with no errors', () => {
    const r = svc.validate(doc('2026-07-01', '2026-07-31'));
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes('monthly'))).toBe(true);
  });

  it('valid quarterly D406 passes and is detected as quarterly', () => {
    const r = svc.validate(doc('2026-07-01', '2026-09-30'), { expectedPeriodType: 'quarterly' });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes('quarterly'))).toBe(true);
  });

  // --- 3 invalid fixtures, each must yield an actionable RO message ---

  it('invalid #1: partial-month period → SAFT-SEL-PERIOD (RO)', () => {
    const r = svc.validate(doc('2026-07-01', '2026-07-20'));
    const e = r.errors.find((x) => x.code === 'SAFT-SEL-PERIOD');
    expect(e).toBeDefined();
    expect(e!.messageRo).toContain('Perioada D406');
    expect(r.valid).toBe(false);
  });

  it('invalid #2: wrong country → SAFT-HDR-COUNTRY (RO)', () => {
    const r = svc.validate(doc('2026-07-01', '2026-07-31', 'FR'));
    const e = r.errors.find((x) => x.code === 'SAFT-HDR-COUNTRY');
    expect(e).toBeDefined();
    expect(e!.messageRo).toContain('RO');
    expect(r.valid).toBe(false);
  });

  it('invalid #3: monthly file when quarterly expected → SAFT-SEL-PERIOD-MISMATCH (RO)', () => {
    const r = svc.validate(doc('2026-07-01', '2026-07-31'), { expectedPeriodType: 'quarterly' });
    const e = r.errors.find((x) => x.code === 'SAFT-SEL-PERIOD-MISMATCH');
    expect(e).toBeDefined();
    expect(e!.messageRo).toContain('trimestrial');
    expect(r.valid).toBe(false);
  });

  it('every error carries a non-empty Romanian message', () => {
    const r = svc.validate(doc('2026-07-01', '2026-07-20', 'FR', 'X'));
    expect(r.errors.length).toBeGreaterThan(0);
    for (const e of r.errors) {
      expect(typeof e.messageRo).toBe('string');
      expect((e.messageRo as string).length).toBeGreaterThan(0);
    }
  });
});
