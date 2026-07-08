/**
 * BC-205 — working-capital sub-model (research 02 §A3: "where naïve models lie
 * about cash"). Pure & deterministic.
 *
 * Convention (documented so tests/Excel match to the cent): 30-day months
 * (360-day year). Balances are computed from the CURRENT month's run-rate:
 *   AR_t  = revenue_t × DSO_t / 30
 *   INV_t = cogs_t    × DIO_t / 30
 *   AP_t  = cogs_t    × DPO_t / 30
 *   NWC_t = AR_t + INV_t − AP_t
 *   ΔNWC_t = NWC_t − NWC_{t−1}   (NWC_0 = 0: the model starts empty)
 * Cash impact of ΔNWC is NEGATIVE in FCF (growth in NWC absorbs cash).
 * DSO↑ absorbs cash, DPO↑ releases — asserted in the spec.
 *
 * Improvement glide-path: days interpolate LINEARLY from the start value to the
 * target, reaching it AT month `improveMonths`, then hold.
 */

export interface WorkingCapitalInputs {
  dsoDays: number;
  dpoDays: number;
  dioDays: number;
  /** Optional linear improvements (e.g. DSO 60 → 45 over 12 months). */
  dsoTargetDays?: number;
  dpoTargetDays?: number;
  dioTargetDays?: number;
  improveMonths?: number; // months to reach the targets (≥1); default 12
}

export interface WorkingCapitalRow {
  month: number;       // 1-based operating month
  dsoDays: number;
  dpoDays: number;
  dioDays: number;
  receivables: number; // AR
  inventory: number;   // INV
  payables: number;    // AP
  nwc: number;         // AR + INV − AP
  deltaNwc: number;    // NWC_t − NWC_{t−1}
}

const num = (v: any, d = 0): number => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Linear glide from `start` to `target` reached AT month `over`, then held. */
export function glideDays(start: number, target: number | undefined, over: number, month: number): number {
  if (target === undefined || !Number.isFinite(target) || over <= 0) return start;
  if (month >= over) return target;
  return start + ((target - start) * month) / over;
}

/**
 * Per-month working-capital rows for aligned revenue/COGS series.
 * `revenue[i]`/`cogs[i]` are operating months 1..N (index 0 = month 1).
 * Zero/empty series are safe (all-zero rows).
 */
export function buildWorkingCapital(
  revenue: number[],
  cogs: number[],
  inputs: WorkingCapitalInputs,
): WorkingCapitalRow[] {
  const n = revenue.length;
  const over = Math.max(1, Math.round(num(inputs.improveMonths, 12)));
  const rows: WorkingCapitalRow[] = [];
  let prevNwc = 0;
  for (let m = 1; m <= n; m++) {
    const dso = glideDays(num(inputs.dsoDays), inputs.dsoTargetDays, over, m);
    const dpo = glideDays(num(inputs.dpoDays), inputs.dpoTargetDays, over, m);
    const dio = glideDays(num(inputs.dioDays), inputs.dioTargetDays, over, m);
    const rev = num(revenue[m - 1]);
    const cg = num(cogs[m - 1]);
    const receivables = (rev * dso) / 30;
    const inventory = (cg * dio) / 30;
    const payables = (cg * dpo) / 30;
    const nwc = receivables + inventory - payables;
    rows.push({
      month: m,
      dsoDays: dso, dpoDays: dpo, dioDays: dio,
      receivables, inventory, payables,
      nwc,
      deltaNwc: nwc - prevNwc,
    });
    prevNwc = nwc;
  }
  return rows;
}
