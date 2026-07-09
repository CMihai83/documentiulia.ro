import { buildBoardDeck, PptxDeckInput } from './bc.pptx';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSZip = require('jszip');

// a 1x1 transparent PNG
const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const RESULTS = {
  appraisal: {
    npv: 24342.6, irr: 0.234, paybackYears: 2, bcr: 1.19, roi: 0.5, discountRate: 0.1,
    cashflows: [{ year: 0, net: -100000 }, { year: 1, net: 50000 }, { year: 2, net: 50000 }, { year: 3, net: 50000 }],
  },
  extras: { mirr: 0.181, eac: 9788.35 },
  tornado: [{ key: 'price', swing: 5000 }, { key: 'volume', swing: 3000 }],
  monteCarlo: { p10: 10000, p50: 24000, p90: 39000, probNpvPositive: 0.94, histogram: [] },
  extended: { dscrWarning: true, coverage: { minDscr: 0.9, rows: [] }, debtSchedule: { rows: [{ period: 1 }] } },
  unitEconomics: { cac: 200, ltv: 2400, ltvToCac: 12, cacPaybackMonths: 1.67 },
  rfq: { costSheet: { fullCost: 1050 }, price: 1260, bidScore: 81, recommendation: 'BID' },
};

const CHARTS = { cashTrajectory: PNG_1PX, tornado: PNG_1PX, mcHistogram: PNG_1PX, debtDscr: PNG_1PX };

async function slideStats(buffer: Buffer): Promise<{ slides: number; media: number }> {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files);
  return {
    slides: names.filter((n: string) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length,
    media: names.filter((n: string) => /^ppt\/media\//.test(n)).length,
  };
}

const base: Omit<PptxDeckInput, 'maturity'> = {
  title: 'Extindere Fabrică', template: 'FIVE_CASE', locale: 'ro', results: RESULTS, chartsPng: CHARTS,
};

describe('BC-304 PPTX board deck', () => {
  it('FBC deck: 10–15 slides with embedded chart images', async () => {
    const { buffer, slideCount } = await buildBoardDeck({ ...base, maturity: 'FBC' });
    const st = await slideStats(buffer);
    expect(st.slides).toBe(slideCount);
    expect(st.slides).toBeGreaterThanOrEqual(10);
    expect(st.slides).toBeLessThanOrEqual(15);
    expect(st.media).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('SOC deck is shorter than FBC but still ≥ 10 slides', async () => {
    const fbc = await buildBoardDeck({ ...base, maturity: 'FBC' });
    const soc = await buildBoardDeck({ ...base, maturity: 'SOC' });
    expect(soc.slideCount).toBeLessThan(fbc.slideCount);
    expect(soc.slideCount).toBeGreaterThanOrEqual(10);
  }, 30000);

  it('renders EN locale and branding logo without crashing', async () => {
    const { buffer } = await buildBoardDeck({
      ...base,
      locale: 'en',
      maturity: 'OBC',
      branding: { logoDataUri: `data:image/png;base64,${PNG_1PX}`, footerText: 'Acme SRL', primaryColor: '#123456' },
    });
    const st = await slideStats(buffer);
    expect(st.slides).toBeGreaterThanOrEqual(10);
  }, 30000);
});
