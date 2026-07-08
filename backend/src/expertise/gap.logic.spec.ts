import { analyseGaps, radarData, readiness, RequiredSkill, CurrentSkill } from './gap.logic';

const req: RequiredSkill[] = [
  { skillId: 'acc', label: 'Accounting', relation: 'essential', requiredLevel: 4 },
  { skillId: 'vat', label: 'VAT', relation: 'essential', requiredLevel: 3 },
  { skillId: 'erp', label: 'ERP', relation: 'optional', requiredLevel: 3 },
];

describe('EXP-3 gap.logic', () => {
  it('returns only unmet requirements as gaps', () => {
    const cur: CurrentSkill[] = [{ skillId: 'acc', proficiency: 4 }]; // acc met
    const gaps = analyseGaps(req, cur);
    expect(gaps.map((g) => g.skillId)).toEqual(['vat', 'erp']);
  });

  it('ranks essential above optional regardless of deficit', () => {
    // optional erp deficit 3 (weight 9) vs essential vat deficit 1 (weight 10)
    const cur: CurrentSkill[] = [{ skillId: 'acc', proficiency: 4 }, { skillId: 'vat', proficiency: 2 }];
    const gaps = analyseGaps(req, cur);
    expect(gaps[0].skillId).toBe('vat'); // essential wins despite smaller deficit
    expect(gaps[0].weight).toBe(10); // 10 × deficit(1)
    expect(gaps[1].skillId).toBe('erp');
    expect(gaps[1].weight).toBe(9); // 3 × deficit(3)
  });

  it('weights by level deficit within the same relation', () => {
    const cur: CurrentSkill[] = [{ skillId: 'acc', proficiency: 1 }, { skillId: 'vat', proficiency: 2 }];
    const gaps = analyseGaps(req, cur);
    // acc deficit 3 (weight 30) ranks above vat deficit 1 (weight 10)
    expect(gaps[0].skillId).toBe('acc');
    expect(gaps[0].deficit).toBe(3);
  });

  it('is deterministic on ties (label order)', () => {
    const r2: RequiredSkill[] = [
      { skillId: 'b', label: 'Bravo', relation: 'essential', requiredLevel: 3 },
      { skillId: 'a', label: 'Alpha', relation: 'essential', requiredLevel: 3 },
    ];
    const gaps = analyseGaps(r2, []);
    expect(gaps.map((g) => g.label)).toEqual(['Alpha', 'Bravo']);
  });

  it('takes the highest proficiency when a skill appears twice', () => {
    const cur: CurrentSkill[] = [{ skillId: 'vat', proficiency: 1 }, { skillId: 'vat', proficiency: 3 }];
    const gaps = analyseGaps(req, cur);
    expect(gaps.find((g) => g.skillId === 'vat')).toBeUndefined(); // 3 >= required 3 → met
  });

  it('radar returns required vs current per axis', () => {
    const cur: CurrentSkill[] = [{ skillId: 'acc', proficiency: 2 }];
    const radar = radarData(req, cur);
    expect(radar).toContainEqual({ skillId: 'acc', label: 'Accounting', required: 4, current: 2 });
    expect(radar.find((a) => a.skillId === 'vat')!.current).toBe(0);
  });

  it('readiness is the share of essential requirement-levels met', () => {
    const cur: CurrentSkill[] = [{ skillId: 'acc', proficiency: 4 }, { skillId: 'vat', proficiency: 0 }];
    // essential need = 4+3=7, have = 4+0=4 → 0.571
    expect(readiness(req, cur)).toBeCloseTo(0.571, 2);
  });
});
