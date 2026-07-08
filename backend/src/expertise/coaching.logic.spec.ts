import { rankCareerMoves, RO_OCCUPATION_DEMAND } from './coaching.logic';

describe('S-57 EXP-11 coaching.logic', () => {
  const entries = [
    { escoUri: 'http://data.europa.eu/esco/occupation/accountant', label: 'Contabil', readiness: 0.6 },
    { escoUri: 'http://data.europa.eu/esco/occupation/financial-manager', label: 'Manager financiar', readiness: 0.9 },
    { escoUri: 'http://data.europa.eu/esco/occupation/entrepreneur', label: 'Antreprenor', readiness: 0.2 },
  ];

  it('ranks by readiness × demand (deterministic)', () => {
    const a = rankCareerMoves(entries);
    const b = rankCareerMoves(entries);
    expect(a).toEqual(b);
    // scores: accountant 0.6*0.85=0.51, fin-manager 0.9*0.7=0.63, entrepreneur 0.2*0.6=0.12
    expect(a.map((s) => s.label)).toEqual(['Manager financiar', 'Contabil', 'Antreprenor']);
    expect(a[0].score).toBe(0.63);
    expect(a[1].score).toBe(0.51);
  });

  it('every seeded suggestion carries an INDICATIVE salary range', () => {
    const a = rankCareerMoves(entries);
    for (const s of a) {
      expect(s.salary).not.toBeNull();
      expect(s.salary!.minEur).toBeLessThan(s.salary!.maxEur);
      expect(s.salary!.source).toContain('indicative');
    }
  });

  it('flags mastered occupations instead of hiding them', () => {
    const a = rankCareerMoves([{ escoUri: RO_OCCUPATION_DEMAND[0].escoUri, label: 'X', readiness: 0.97 }]);
    expect(a).toHaveLength(1);
    expect(a[0].mastered).toBe(true);
  });

  it('unknown occupations get neutral demand and no salary claim', () => {
    const a = rankCareerMoves([{ escoUri: 'http://example.org/unknown', label: 'Y', readiness: 1 }]);
    expect(a[0].demand).toBe(0.5);
    expect(a[0].salary).toBeNull();
  });
});
