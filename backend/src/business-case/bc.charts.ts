import type { ChartConfiguration } from 'chart.js';

/**
 * BC-301 — ONE chart-config builder for every deliverable format.
 * HTML/PDF embed these rendered as data-URIs, PPTX as PNG buffers, Excel as
 * images where used. No format builds its own chart code: they all consume
 * this set, rendered once through ChartService.
 *
 * Pure: takes the computed resultsJson shape (appraisal/tornado/monteCarlo/
 * extended) and returns Chart.js configurations. Colors follow the platform
 * palette (teal primary / gold accent) unless branding overrides them.
 */

export interface BcBranding {
  logoDataUri?: string;
  primaryColor?: string;
  accentColor?: string;
  footerText?: string;
}

export interface BcChartSet {
  cashTrajectory?: ChartConfiguration;
  tornado?: ChartConfiguration;
  mcHistogram?: ChartConfiguration;
  debtDscr?: ChartConfiguration;
}

const TEAL = '#0b7681';
const GOLD = '#c79a3a';

function bar(labels: string[], datasets: { label?: string; data: number[]; color?: string }[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((d) => ({ label: d.label ?? '', data: d.data, backgroundColor: d.color ?? TEAL })),
    },
    options: { responsive: false, plugins: { legend: { display: datasets.length > 1 } } },
  } as ChartConfiguration;
}

function line(labels: string[], datasets: { label?: string; data: number[]; color?: string }[]): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d) => ({
        label: d.label ?? '',
        data: d.data,
        borderColor: d.color ?? TEAL,
        backgroundColor: 'transparent',
        pointRadius: 0,
        borderWidth: 2,
      })),
    },
    options: { responsive: false, plugins: { legend: { display: datasets.length > 1 } } },
  } as ChartConfiguration;
}

/** Build the full chart set from a computed results object (resultsJson shape). */
export function buildChartConfigs(results: any, branding?: BcBranding | null): BcChartSet {
  const primary = branding?.primaryColor || TEAL;
  const accent = branding?.accentColor || GOLD;
  const set: BcChartSet = {};

  // Cash trajectory: prefer the S-58 extended annual FCFF; fall back to the
  // simple appraisal net-cashflow bars (the pre-S-58 chart).
  const annual = results?.extended?.annual;
  if (Array.isArray(annual) && annual.length) {
    set.cashTrajectory = bar(
      annual.map((r: any) => `Y${r.year}`),
      [
        { label: 'FCFF', data: annual.map((r: any) => Number(r.fcff ?? 0)), color: primary },
        { label: 'FCFE', data: annual.map((r: any) => Number(r.fcfe ?? 0)), color: accent },
      ],
    );
  } else if (Array.isArray(results?.appraisal?.cashflows)) {
    const cf = results.appraisal.cashflows as { year: number; net: number }[];
    set.cashTrajectory = bar(cf.map((r) => `Y${r.year}`), [{ label: 'Net', data: cf.map((r) => r.net), color: primary }]);
  }

  if (Array.isArray(results?.tornado) && results.tornado.length) {
    const rows = results.tornado.map((b: any) => ({ label: String(b.key ?? b.label ?? ''), value: Number(b.swing ?? b.value ?? 0) }));
    set.tornado = {
      type: 'bar',
      data: {
        labels: rows.map((r: { label: string }) => r.label),
        datasets: [{ label: 'ΔNPV', data: rows.map((r: { value: number }) => r.value), backgroundColor: accent }],
      },
      options: { indexAxis: 'y', responsive: false, plugins: { legend: { display: false } } },
    } as ChartConfiguration;
  }

  const hist = results?.monteCarlo?.histogram;
  if (Array.isArray(hist) && hist.length) {
    set.mcHistogram = bar(
      hist.map((b: any) => String(Math.round((Number(b.x0) + Number(b.x1)) / 2))),
      [{ label: 'NPV', data: hist.map((b: any) => Number(b.count)), color: accent }],
    );
  }

  const cov = results?.extended?.coverage?.rows;
  if (Array.isArray(cov) && cov.length) {
    const labels = cov.map((r: any) => `P${r.period}`);
    set.debtDscr = line(labels, [
      { label: 'DSCR', data: cov.map((r: any) => Number(r.dscr ?? 0)), color: primary },
      { label: 'DSCR = 1.0', data: cov.map(() => 1), color: '#b91c1c' },
    ]);
  }

  return set;
}
