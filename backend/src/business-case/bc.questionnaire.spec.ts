import { validateAnswers, isVisible, diffAnswers, TEMPLATES } from './bc.questionnaire';

describe('BC-101 questionnaire DSL', () => {
  it('exposes the three BC-102 templates with skeletons', () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(['FIVE_CASE', 'PRINCE2_LEAN', 'RFQ']);
    expect(TEMPLATES.FIVE_CASE.maturityStages).toEqual(['SOC', 'OBC', 'FBC']);
    expect(TEMPLATES.RFQ.skeleton.length).toBeGreaterThan(0);
  });

  it('flags missing required fields', () => {
    const errors = validateAnswers('FIVE_CASE', {});
    const keys = errors.map((e) => e.field);
    expect(keys).toContain('strategic.problem');
    expect(keys).toContain('wacc.mode');
  });

  it('exempts hidden fields from validation (visibleIf)', () => {
    // hurdle mode → CAPM fields hidden, so their absence is not an error
    const errors = validateAnswers('FIVE_CASE', {
      'strategic.problem': 'growth', 'strategic.horizonYears': 5, 'strategic.initialInvestment': 100000,
      'wacc.mode': 'hurdle', 'wacc.hurdle': 12,
    });
    expect(errors).toEqual([]);
  });

  it('enforces numeric ranges on visible fields', () => {
    const errors = validateAnswers('FIVE_CASE', {
      'strategic.problem': 'growth', 'strategic.horizonYears': 99, 'strategic.initialInvestment': 100000,
      'wacc.mode': 'hurdle', 'wacc.hurdle': 12,
    });
    expect(errors.some((e) => e.field === 'strategic.horizonYears')).toBe(true);
  });

  it('isVisible evaluates equals predicate', () => {
    const capmField = TEMPLATES.FIVE_CASE.sections.flatMap((s) => s.fields).find((f) => f.key === 'wacc.rf')!;
    expect(isVisible(capmField, { 'wacc.mode': 'capm' })).toBe(true);
    expect(isVisible(capmField, { 'wacc.mode': 'hurdle' })).toBe(false);
  });

  it('diffAnswers reports field-level changes', () => {
    const d = diffAnswers({ a: 1, b: 2 }, { a: 1, b: 5, c: 9 });
    expect(d).toEqual(expect.arrayContaining([
      { field: 'b', from: 2, to: 5 },
      { field: 'c', from: undefined, to: 9 },
    ]));
    expect(d.find((c) => c.field === 'a')).toBeUndefined();
  });
});
