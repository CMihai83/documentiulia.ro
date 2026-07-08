import {
  matchProgram,
  rankMatches,
  consolidate,
  isFirmInDifficulty,
  FundingProfileLike,
  FundingProgramLike,
} from './funds-matching.logic';
import { classifySize, countyToNuts2, caenAntecedents, isExcludedSector } from './funds-reference';

const baseProfile = (over: Partial<FundingProfileLike> = {}): FundingProfileLike => ({
  county: 'Cluj',
  caenPrimary: '6201',
  caenSecondary: [],
  foundedDate: '2022-01-01',
  headcount: 8,
  turnoverEur: 1_000_000,
  balanceSheetEur: 900_000,
  subscribedCapitalEur: 50_000,
  accumulatedLossEur: 0,
  equityEur: 200_000,
  partnerLinks: [],
  anafDebt: false,
  insolvent: false,
  ...over,
});

const baseProgram = (over: Partial<FundingProgramLike> = {}): FundingProgramLike => ({
  id: 'p1',
  name: 'Test Program',
  legalBasis: 'de_minimis',
  sizeEligibility: ['micro', 'small', 'medium'],
  coFinancingPct: 10,
  aidIntensityPct: null,
  ceilingEur: 200_000,
  caenWhitelist: ['6201', '6202'],
  caenBlacklist: [],
  regions: [],
  interventionField: null,
  status: 'open',
  closesAt: null,
  ...over,
});

describe('FND reference data', () => {
  it('maps counties to NUTS-2, București-Ilfov = RO32', () => {
    expect(countyToNuts2('Cluj')).toBe('RO11');
    expect(countyToNuts2('București')).toBe('RO32');
    expect(countyToNuts2('Ilfov')).toBe('RO32');
    expect(countyToNuts2('Nowhere')).toBeUndefined();
  });
  it('classifies enterprise size per Rec. 2003/361', () => {
    expect(classifySize(5, 1_000_000, 800_000)).toBe('micro');
    expect(classifySize(30, 8_000_000, 6_000_000)).toBe('small');
    expect(classifySize(120, 30_000_000, 20_000_000)).toBe('medium');
    expect(classifySize(400, 80_000_000, 60_000_000)).toBe('large');
  });
  it('resolves CAEN Rev.2 antecedents and flags excluded sectors', () => {
    expect(caenAntecedents('6201')).toContain('6201');
    expect(isExcludedSector('0111')).toBe(true); // agriculture
    expect(isExcludedSector('9200')).toBe(true); // gambling
    expect(isExcludedSector('6201')).toBe(false);
  });
});

describe('FND-2 consolidation (never in isolation)', () => {
  it('adds linked at 100% and partner pro-rata', () => {
    const p = baseProfile({
      headcount: 40, turnoverEur: 8_000_000, balanceSheetEur: 7_000_000,
      partnerLinks: [
        { relation: 'linked', sharePct: 100, headcount: 20, turnoverEur: 5_000_000, balanceSheetEur: 4_000_000 },
        { relation: 'partner', sharePct: 30, headcount: 10, turnoverEur: 3_000_000, balanceSheetEur: 2_000_000 },
      ],
    });
    const c = consolidate(p);
    expect(c.headcount).toBe(40 + 20 + 3); // 30% of 10 = 3
    expect(c.turnoverEur).toBe(8_000_000 + 5_000_000 + 900_000);
    // standalone would be 'small'; consolidated crosses into 'medium'
    expect(classifySize(c.headcount, c.turnoverEur, c.balanceSheetEur)).toBe('medium');
  });
});

describe('FND-2 seven filters — pass and fail branches', () => {
  it('CAEN pass on whitelist', () => {
    const r = matchProgram(baseProfile(), baseProgram());
    expect(r.perFilter.find(f => f.filter === 'caen')!.pass).toBe(true);
  });
  it('CAEN fail when not on whitelist', () => {
    const r = matchProgram(baseProfile({ caenPrimary: '4791', caenSecondary: [] }), baseProgram());
    expect(r.perFilter.find(f => f.filter === 'caen')!.pass).toBe(false);
  });
  it('CAEN fail on blacklist even if globally allowed', () => {
    const r = matchProgram(baseProfile({ caenPrimary: '9200' }), baseProgram({ caenWhitelist: [], caenBlacklist: ['9200'] }));
    expect(r.perFilter.find(f => f.filter === 'caen')!.pass).toBe(false);
  });
  it('region pass national, fail out-of-region', () => {
    expect(matchProgram(baseProfile(), baseProgram({ regions: [] })).perFilter.find(f => f.filter === 'region')!.pass).toBe(true);
    expect(matchProgram(baseProfile({ county: 'Cluj' }), baseProgram({ regions: ['RO42'] })).perFilter.find(f => f.filter === 'region')!.pass).toBe(false);
  });
  it('size pass and fail', () => {
    expect(matchProgram(baseProfile({ headcount: 5 }), baseProgram()).perFilter.find(f => f.filter === 'size')!.pass).toBe(true);
    expect(matchProgram(baseProfile({ headcount: 400, turnoverEur: 80_000_000, balanceSheetEur: 60_000_000 }), baseProgram()).perFilter.find(f => f.filter === 'size')!.pass).toBe(false);
  });
  it('project type pass and fail', () => {
    const prog = baseProgram({ interventionField: 'digitalization' });
    expect(matchProgram(baseProfile(), prog, { projectType: 'digitalization' }).perFilter.find(f => f.filter === 'projectType')!.pass).toBe(true);
    expect(matchProgram(baseProfile(), prog, { projectType: 'green energy' }).perFilter.find(f => f.filter === 'projectType')!.pass).toBe(false);
  });
  it('age/difficulty: fail firm-in-difficulty, ANAF debt, insolvency, <1yr', () => {
    expect(matchProgram(baseProfile({ accumulatedLossEur: 30_000, subscribedCapitalEur: 50_000 }), baseProgram()).perFilter.find(f => f.filter === 'ageDifficulty')!.pass).toBe(false);
    expect(matchProgram(baseProfile({ anafDebt: true }), baseProgram()).perFilter.find(f => f.filter === 'ageDifficulty')!.pass).toBe(false);
    expect(matchProgram(baseProfile({ insolvent: true }), baseProgram()).perFilter.find(f => f.filter === 'ageDifficulty')!.pass).toBe(false);
    expect(matchProgram(baseProfile({ foundedDate: '2026-06-01' }), baseProgram()).perFilter.find(f => f.filter === 'ageDifficulty')!.pass).toBe(false);
    expect(matchProgram(baseProfile(), baseProgram()).perFilter.find(f => f.filter === 'ageDifficulty')!.pass).toBe(true);
  });
  it('de minimis: pass within headroom, fail over ceiling', () => {
    const prog = baseProgram({ legalBasis: 'de_minimis', ceilingEur: 500_000, coFinancingPct: 0 });
    const okReq = { requestedCostEur: 100_000, deMinimisHeadroomEur: 300_000 };
    expect(matchProgram(baseProfile(), prog, okReq).perFilter.find(f => f.filter === 'deMinimis')!.pass).toBe(true);
    const overReq = { requestedCostEur: 400_000, deMinimisHeadroomEur: 50_000 };
    expect(matchProgram(baseProfile(), prog, overReq).perFilter.find(f => f.filter === 'deMinimis')!.pass).toBe(false);
  });
  it('legal basis recognised vs unknown', () => {
    expect(matchProgram(baseProfile(), baseProgram({ legalBasis: 'gber_14' })).perFilter.find(f => f.filter === 'legalBasis')!.pass).toBe(true);
    expect(matchProgram(baseProfile(), baseProgram({ legalBasis: 'mystery' })).perFilter.find(f => f.filter === 'legalBasis')!.pass).toBe(false);
  });
});

describe('FND-2 grant estimation + București-Ilfov reduced intensity', () => {
  it('GBER: București-Ilfov medium gets 40 + 10 = 50% intensity; Vest large gets 50%', () => {
    const prog = baseProgram({ legalBasis: 'gber_14', caenWhitelist: [], sizeEligibility: [], ceilingEur: null });
    const biMedium = matchProgram(
      baseProfile({ county: 'București', headcount: 120, turnoverEur: 30_000_000, balanceSheetEur: 20_000_000 }),
      prog, { requestedCostEur: 1_000_000 },
    );
    expect(biMedium.nuts2).toBe('RO32');
    expect(biMedium.effectiveIntensityPct).toBe(50); // 40 base + 10 medium bonus
    expect(biMedium.estMaxGrantEur).toBe(500_000);
    // A less-developed region small enterprise gets a much higher intensity
    const clujSmall = matchProgram(
      baseProfile({ county: 'Cluj', headcount: 20, turnoverEur: 5_000_000, balanceSheetEur: 4_000_000 }),
      prog, { requestedCostEur: 1_000_000 },
    );
    expect(clujSmall.effectiveIntensityPct).toBe(80); // 60 base + 20 small bonus
    expect(clujSmall.estMaxGrantEur).toBeGreaterThan(biMedium.estMaxGrantEur!);
  });
  it('de minimis grant capped by ceiling', () => {
    const prog = baseProgram({ legalBasis: 'de_minimis', coFinancingPct: 0, ceilingEur: 50_000 });
    const r = matchProgram(baseProfile(), prog, { requestedCostEur: 200_000, deMinimisHeadroomEur: 300_000 });
    expect(r.estMaxGrantEur).toBe(50_000);
  });
});

describe('FND-2 ranking + closed programs', () => {
  it('eligible first, then by grant desc; closed never eligible', () => {
    const progs = [
      baseProgram({ id: 'small', ceilingEur: 20_000, coFinancingPct: 0, legalBasis: 'de_minimis' }),
      baseProgram({ id: 'big', ceilingEur: 200_000, coFinancingPct: 0, legalBasis: 'de_minimis' }),
      baseProgram({ id: 'closed', status: 'closed', ceilingEur: 999_000, coFinancingPct: 0 }),
    ];
    const ranked = rankMatches(baseProfile(), progs, { requestedCostEur: 300_000, deMinimisHeadroomEur: 300_000 });
    expect(ranked[0].programId).toBe('big');
    expect(ranked[1].programId).toBe('small');
    expect(ranked.find(r => r.programId === 'closed')!.eligible).toBe(false);
  });
  it('performance: 500 programs ranked in <2s', () => {
    const many: FundingProgramLike[] = Array.from({ length: 500 }, (_, i) =>
      baseProgram({ id: `p${i}`, regions: i % 2 ? ['RO11'] : [], legalBasis: i % 3 ? 'gber_14' : 'de_minimis' }));
    const start = process.hrtime.bigint();
    const ranked = rankMatches(baseProfile(), many, { requestedCostEur: 500_000 });
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    expect(ranked.length).toBe(500);
    expect(ms).toBeLessThan(2000);
  });
});

describe('isFirmInDifficulty', () => {
  it('true when accumulated loss > half capital or negative equity', () => {
    expect(isFirmInDifficulty({ subscribedCapitalEur: 100_000, accumulatedLossEur: 60_000 })).toBe(true);
    expect(isFirmInDifficulty({ equityEur: -1 })).toBe(true);
    expect(isFirmInDifficulty({ subscribedCapitalEur: 100_000, accumulatedLossEur: 10_000, equityEur: 90_000 })).toBe(false);
  });
});
