import { renderPolicy, diffPolicies, ropaHash, retentionText } from './policy.logic';
import { templateEntries } from './ropa.logic';

const ORG = { name: 'Test SRL', cui: 'RO123', email: 'dpo@test.ro' };

describe('GE-POLICY logic — policy derives from the RoPA', () => {
  const base = templateEntries('services'); // retention 36 months

  it('retention text renders RO year/month forms', () => {
    expect(retentionText(60, 'ro')).toBe('5 ani');
    expect(retentionText(12, 'ro')).toBe('1 an');
    expect(retentionText(30, 'ro')).toBe('30 de luni');
    expect(retentionText(24, 'en')).toBe('2 years');
  });

  it('privacy policy contains the RoPA purposes, recipients and retention', () => {
    const { html } = renderPolicy('privacy', 'ro', ORG, base, '2026-07-09');
    expect(html).toContain('Evidență clienți și contracte');
    expect(html).toContain('Contabil');
    expect(html).toContain('3 ani'); // 36 months
    expect(html).toContain('confidențialitate'); // RO diacritics survive
    expect(html).toContain('nu constituie consultanță juridică');
  });

  it('DERIVATION: changing RoPA retention changes the regenerated policy', () => {
    const v1 = renderPolicy('privacy', 'ro', ORG, base, '2026-07-09');
    const modified = [{ ...base[0], retentionMonths: 120 }];
    const v2 = renderPolicy('privacy', 'ro', ORG, modified, '2026-07-09');
    expect(v1.html).toContain('3 ani');
    expect(v2.html).toContain('10 ani');
    expect(v2.html).not.toContain('3 ani');
    expect(v1.sourceRopaHash).not.toBe(v2.sourceRopaHash);
    const d = diffPolicies(v1.html, v2.html);
    expect(d.added.join(' ')).toContain('10 ani');
    expect(d.removed.join(' ')).toContain('3 ani');
  });

  it('cookie policy lists only consent-based processes', () => {
    const eco = templateEntries('ecommerce'); // marketing entry is consent-based
    const { html } = renderPolicy('cookie', 'ro', ORG, eco, '2026-07-09');
    expect(html).toContain('Marketing direct');
    expect(html).not.toContain('Comenzi și livrare'); // contract-based → not in consent section
  });

  it('ropaHash is stable for identical entries', () => {
    expect(ropaHash(base)).toBe(ropaHash(JSON.parse(JSON.stringify(base))));
  });
});
