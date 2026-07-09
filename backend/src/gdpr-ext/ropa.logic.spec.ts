import { proposeFromUsage, templateEntries, completeness, CNP_CATEGORY, RETENTION_DEFAULTS_MONTHS } from './ropa.logic';

describe('GE-ROPA logic', () => {
  it('proposes entries from actual module usage with RO retention defaults', () => {
    const all = proposeFromUsage({ invoices: 10, employees: 3, partners: 5, documents: 2 });
    const names = all.map((e) => e.processName);
    expect(names).toEqual(
      expect.arrayContaining(['Facturare și evidență clienți', 'Resurse umane și salarizare', 'Procesare documente (OCR)']),
    );
    const billing = all.find((e) => e.processName.startsWith('Facturare'))!;
    expect(billing.retentionMonths).toBe(RETENTION_DEFAULTS_MONTHS.accountingBilling); // 10y tax law
    const hr = all.find((e) => e.processName.startsWith('Resurse'))!;
    expect(hr.retentionMonths).toBe(600); // 50y payroll
    expect(hr.specialCategories).toContain(CNP_CATEGORY);
  });

  it('proposes nothing for an empty org', () => {
    expect(proposeFromUsage({ invoices: 0, employees: 0, partners: 0, documents: 0 })).toHaveLength(0);
  });

  it('accounting-practice template includes a PROCESSOR entry (accountant acting for clients)', () => {
    const t = templateEntries('accounting-practice');
    expect(t.some((e) => e.role === 'processor')).toBe(true);
    expect(t.find((e) => e.role === 'processor')!.legalBasis).toContain('Art. 28');
  });

  it('completeness: full entry = 100%, missing retention drops it and is named', () => {
    const full = templateEntries('services')[0];
    expect(completeness(full).pct).toBe(100);
    const partial = { ...full, retentionMonths: null, recipients: [] };
    const c = completeness(partial);
    expect(c.pct).toBeLessThan(100);
    expect(c.missing).toEqual(expect.arrayContaining(['Termenul de păstrare', 'Destinatarii']));
  });

  it('CNP triggers the Law 190/2018 warning', () => {
    const hr = proposeFromUsage({ invoices: 0, employees: 1, partners: 0, documents: 0 })[0];
    expect(completeness(hr).warnings.join(' ')).toContain('190/2018');
  });
});
