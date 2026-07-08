import { buildDeliverableHtml, sectionsForMaturity, DeliverableInput } from './bc.deliverable';
import { appraise } from './bc.model';
import { tornado, monteCarlo } from './bc.sensitivity';

const ANSWERS = {
  'strategic.initialInvestment': 1000,
  'strategic.horizonYears': 5,
  'economic.cashflows': Array.from({ length: 5 }, () => ({ benefit: 500, opex: 200 })),
  'wacc.mode': 'hurdle',
  'wacc.hurdle': 10,
};

function input(maturity: 'SOC' | 'OBC' | 'FBC'): DeliverableInput {
  return {
    title: 'New warehouse', template: 'FIVE_CASE',
    skeleton: ['Strategic', 'Economic', 'Commercial', 'Financial', 'Management'],
    maturity, locale: 'en', answers: ANSWERS,
    appraisal: appraise(ANSWERS), tornado: tornado(ANSWERS),
    monteCarlo: monteCarlo(ANSWERS, { iterations: 500, seed: 1 }),
  };
}

describe('BC-107 deliverable', () => {
  it('SOC renders only Strategic + Economic; FBC renders all five cases', () => {
    expect(sectionsForMaturity(input('SOC').skeleton, 'SOC')).toEqual(['Strategic', 'Economic']);
    expect(sectionsForMaturity(input('FBC').skeleton, 'FBC')).toEqual(['Strategic', 'Economic', 'Commercial', 'Financial', 'Management']);
  });

  it('SOC HTML omits a section that FBC includes (Management)', () => {
    const soc = buildDeliverableHtml(input('SOC'));
    const fbc = buildDeliverableHtml(input('FBC'));
    expect(fbc).toContain('<h2>Management</h2>');
    expect(soc).not.toContain('<h2>Management</h2>');
    expect(soc).not.toContain('<h2>Commercial</h2>');
  });

  it('only FBC carries the sensitivity annex', () => {
    expect(buildDeliverableHtml(input('FBC'))).toContain('Annex');
    expect(buildDeliverableHtml(input('SOC'))).not.toContain('Annex');
    expect(buildDeliverableHtml(input('OBC'))).not.toContain('Annex');
  });

  it('embeds the NPV metrics and the resolved discount rate', () => {
    const html = buildDeliverableHtml(input('OBC'));
    expect(html).toContain('NPV');
    expect(html).toContain('10.00% (HURDLE)');
  });

  it('renders RO labels when locale=ro', () => {
    const html = buildDeliverableHtml({ ...input('SOC'), locale: 'ro' });
    expect(html).toContain('Maturitate');
    expect(html).toContain('Generat de DocumentIulia');
  });
});
