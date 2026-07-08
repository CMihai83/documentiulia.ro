/**
 * BC-101 — questionnaire schema/DSL. JSON-defined question sets so new templates
 * are data, not code. BC-102 templates below reference these sets.
 */

export type FieldType =
  | 'number'
  | 'percent'
  | 'currency'
  | 'date'
  | 'select'
  | 'driver-table'
  | 'distribution';

/** A column in a driver-table field (BC-104 annual cashflow drivers). */
export interface DriverColumn {
  key: string;               // cell key within a row
  label: string;
  labelRo?: string;
  type: 'currency' | 'number' | 'percent';
  min?: number;
  max?: number;
}

export interface QuestionField {
  key: string; // unique within the case; also the model-parameter mapping key
  label: string;
  labelRo?: string;
  type: FieldType;
  help?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[]; // for select
  /** driver-table: column spec (each answer row is an object keyed by column.key). */
  columns?: DriverColumn[];
  /** driver-table: row count is driven by another numeric field (e.g. the horizon). */
  rowsFrom?: string;
  /** distribution: which model driver this distribution perturbs (BC-105 Monte-Carlo). */
  distributionTarget?: 'benefits' | 'opex' | 'capex' | 'discountRate';
  /** Conditional visibility: show only when another field satisfies a predicate. */
  visibleIf?: { field: string; equals?: string | number | boolean; gt?: number; lt?: number };
  /** Maps this answer onto a financial-model parameter path (BC engine consumes it). */
  mapsTo?: string;
}

export interface QuestionSection {
  id: string;
  title: string;
  titleRo?: string;
  fields: QuestionField[];
}

export type BcTemplate = 'FIVE_CASE' | 'PRINCE2_LEAN' | 'RFQ';

export interface TemplateDescriptor {
  template: BcTemplate;
  name: string;
  nameRo: string;
  /** Document skeleton this template produces (drives later generation stories). */
  skeleton: string[];
  /** Maturity ladder — FIVE_CASE progresses SOC→OBC→FBC. */
  maturityStages?: string[];
  sections: QuestionSection[];
}

// ---- shared sections ----
const WACC_SECTION: QuestionSection = {
  id: 'wacc',
  title: 'Discount rate (WACC)',
  titleRo: 'Rata de actualizare (WACC)',
  fields: [
    { key: 'wacc.mode', label: 'Discount-rate method', type: 'select', required: true,
      options: [{ value: 'capm', label: 'Full WACC (CAPM)' }, { value: 'hurdle', label: 'Simple hurdle rate' }] },
    { key: 'wacc.rf', label: 'Risk-free rate', type: 'percent', visibleIf: { field: 'wacc.mode', equals: 'capm' }, min: 0, max: 30, mapsTo: 'wacc.rf' },
    { key: 'wacc.erp', label: 'Equity risk premium', type: 'percent', visibleIf: { field: 'wacc.mode', equals: 'capm' }, min: 0, max: 30, mapsTo: 'wacc.erp' },
    { key: 'wacc.beta', label: 'Beta', type: 'number', visibleIf: { field: 'wacc.mode', equals: 'capm' }, min: 0, max: 5, mapsTo: 'wacc.beta' },
    { key: 'wacc.costDebtPre', label: 'Pre-tax cost of debt', type: 'percent', visibleIf: { field: 'wacc.mode', equals: 'capm' }, min: 0, max: 40, mapsTo: 'wacc.costDebtPre' },
    { key: 'wacc.taxRate', label: 'Tax rate', type: 'percent', visibleIf: { field: 'wacc.mode', equals: 'capm' }, min: 0, max: 60, mapsTo: 'wacc.taxRate' },
    { key: 'wacc.debtWeight', label: 'Debt weight (D/V)', type: 'percent', visibleIf: { field: 'wacc.mode', equals: 'capm' }, min: 0, max: 100, mapsTo: 'wacc.debtWeight' },
    { key: 'wacc.hurdle', label: 'Hurdle rate', type: 'percent', visibleIf: { field: 'wacc.mode', equals: 'hurdle' }, min: 0, max: 60, mapsTo: 'wacc.hurdle' },
    { key: 'wacc.justification', label: 'Rate justification', type: 'select', options: [
      { value: 'market-comparable', label: 'Market comparable' },
      { value: 'lender-quote', label: 'Actual lender quote' },
      { value: 'board-policy', label: 'Board hurdle policy' },
    ] },
  ],
};

const STRATEGIC_SECTION: QuestionSection = {
  id: 'strategic',
  title: 'Strategic case',
  titleRo: 'Cazul strategic',
  fields: [
    { key: 'strategic.problem', label: 'Problem / driver for change', type: 'select', required: true, options: [
      { value: 'growth', label: 'Growth opportunity' }, { value: 'compliance', label: 'Compliance need' },
      { value: 'cost', label: 'Cost reduction' }, { value: 'risk', label: 'Risk mitigation' } ] },
    { key: 'strategic.horizonYears', label: 'Appraisal horizon (years)', type: 'number', required: true, min: 1, max: 30, mapsTo: 'model.years' },
    { key: 'strategic.initialInvestment', label: 'Initial investment', type: 'currency', required: true, min: 0, mapsTo: 'model.capex0' },
  ],
};

/**
 * BC-104 — economic case: the annual benefit/opex streams that drive NPV/IRR.
 * The driver-table has one row per appraisal year (row count == horizon).
 */
const ECONOMIC_SECTION: QuestionSection = {
  id: 'economic',
  title: 'Economic case (cashflows)',
  titleRo: 'Cazul economic (fluxuri)',
  fields: [
    {
      key: 'economic.cashflows',
      label: 'Annual benefit & operating-cost streams',
      labelRo: 'Fluxuri anuale de beneficii și costuri',
      type: 'driver-table',
      required: true,
      rowsFrom: 'strategic.horizonYears',
      mapsTo: 'model.cashflows',
      columns: [
        { key: 'benefit', label: 'Benefit / inflow', labelRo: 'Beneficiu / încasare', type: 'currency', min: 0 },
        { key: 'opex', label: 'Operating cost', labelRo: 'Cost de operare', type: 'currency', min: 0 },
      ],
    },
    // BC-105 Monte-Carlo distributions (optional; sampled only if provided).
    { key: 'economic.dist.benefits', label: 'Benefit uncertainty', type: 'distribution', distributionTarget: 'benefits' },
    { key: 'economic.dist.opex', label: 'Op-cost uncertainty', type: 'distribution', distributionTarget: 'opex' },
    { key: 'economic.dist.capex', label: 'Capex uncertainty', type: 'distribution', distributionTarget: 'capex' },
  ],
};

const RFQ_SECTION: QuestionSection = {
  id: 'rfq',
  title: 'RFQ costing',
  titleRo: 'Cost ofertă',
  fields: [
    { key: 'rfq.method', label: 'Pricing method', type: 'select', required: true, options: [
      { value: 'cost-plus', label: 'Cost-plus (markup)' }, { value: 'target-margin', label: 'Target margin' } ] },
    { key: 'rfq.directMaterial', label: 'Direct material', type: 'currency', required: true, min: 0, mapsTo: 'rfq.material' },
    { key: 'rfq.directLabour', label: 'Direct labour', type: 'currency', required: true, min: 0, mapsTo: 'rfq.labour' },
    { key: 'rfq.overheadPct', label: 'Overhead %', type: 'percent', min: 0, max: 200, mapsTo: 'rfq.overheadPct' },
    { key: 'rfq.markupPct', label: 'Markup %', type: 'percent', visibleIf: { field: 'rfq.method', equals: 'cost-plus' }, min: 0, max: 500, mapsTo: 'rfq.markupPct' },
    { key: 'rfq.targetMarginPct', label: 'Target margin %', type: 'percent', visibleIf: { field: 'rfq.method', equals: 'target-margin' }, min: 0, max: 95, mapsTo: 'rfq.targetMarginPct' },
    // S-59 (BC-209) — all optional: should-cost benchmark + bid/no-bid scoring
    { key: 'rfq.shouldCostBenchmark', label: 'Should-cost benchmark', labelRo: 'Reper should-cost', type: 'currency', min: 0 },
    { key: 'rfq.bid.marginThresholdPct', label: 'Minimum acceptable margin %', labelRo: 'Marjă minimă acceptabilă %', type: 'percent', min: 0, max: 95 },
    { key: 'rfq.bid.capacityFitPct', label: 'Capacity fit (0–100)', labelRo: 'Potrivire capacitate (0–100)', type: 'number', min: 0, max: 100 },
    { key: 'rfq.bid.strategicFitPct', label: 'Strategic fit (0–100)', labelRo: 'Potrivire strategică (0–100)', type: 'number', min: 0, max: 100 },
    { key: 'rfq.bid.weightMargin', label: 'Weight: margin', labelRo: 'Pondere: marjă', type: 'number', min: 0, max: 100 },
    { key: 'rfq.bid.weightCapacity', label: 'Weight: capacity', labelRo: 'Pondere: capacitate', type: 'number', min: 0, max: 100 },
    { key: 'rfq.bid.weightStrategic', label: 'Weight: strategic', labelRo: 'Pondere: strategic', type: 'number', min: 0, max: 100 },
    { key: 'rfq.bid.scoreThreshold', label: 'Bid threshold score', labelRo: 'Prag scor ofertare', type: 'number', min: 0, max: 100 },
  ],
};


/**
 * S-58 (BC-201..205) — advanced financial model. Every field OPTIONAL so
 * existing cases keep validating; `economic.pnl.revenueYear1 > 0` activates the
 * extended FCFF/FCFE monthly model.
 */
const ADVANCED_MODEL_SECTION: QuestionSection = {
  id: 'advanced',
  title: 'Advanced financial model (FCFF/FCFE)',
  titleRo: 'Model financiar avansat (FCFF/FCFE)',
  fields: [
    { key: 'economic.pnl.revenueYear1', label: 'Year-1 annual revenue', labelRo: 'Venit anual (anul 1)', type: 'currency', min: 0 },
    { key: 'economic.pnl.revenueGrowthPct', label: 'Annual revenue growth %', labelRo: 'Creștere anuală venit %', type: 'percent', min: -50, max: 200 },
    { key: 'economic.pnl.cogsPct', label: 'COGS % of revenue', labelRo: 'COGS % din venit', type: 'percent', min: 0, max: 95 },
    { key: 'economic.pnl.opexMonthly', label: 'Monthly opex', labelRo: 'Cheltuieli operaționale lunare', type: 'currency', min: 0 },
    { key: 'economic.pnl.daMonthly', label: 'Monthly D&A', labelRo: 'Amortizare lunară', type: 'currency', min: 0 },
    { key: 'economic.pnl.taxRatePct', label: 'Profit-tax rate %', labelRo: 'Cotă impozit profit %', type: 'percent', min: 0, max: 60 },
    { key: 'economic.pnl.capexMonthly', label: 'Recurring monthly capex', labelRo: 'Capex lunar recurent', type: 'currency', min: 0 },
    // BC-205 working capital
    { key: 'economic.wc.dsoDays', label: 'DSO (days sales outstanding)', labelRo: 'DSO (zile încasare)', type: 'number', min: 0, max: 365 },
    { key: 'economic.wc.dpoDays', label: 'DPO (days payables outstanding)', labelRo: 'DPO (zile plată)', type: 'number', min: 0, max: 365 },
    { key: 'economic.wc.dioDays', label: 'DIO (days inventory outstanding)', labelRo: 'DIO (zile stoc)', type: 'number', min: 0, max: 365 },
    { key: 'economic.wc.dsoTargetDays', label: 'DSO target (improvement)', labelRo: 'Țintă DSO', type: 'number', min: 0, max: 365 },
    { key: 'economic.wc.dpoTargetDays', label: 'DPO target', labelRo: 'Țintă DPO', type: 'number', min: 0, max: 365 },
    { key: 'economic.wc.dioTargetDays', label: 'DIO target', labelRo: 'Țintă DIO', type: 'number', min: 0, max: 365 },
    { key: 'economic.wc.improveMonths', label: 'Months to reach targets', labelRo: 'Luni până la țintă', type: 'number', min: 1, max: 60 },
    // BC-204 debt
    { key: 'economic.debt.amount', label: 'Debt amount', labelRo: 'Credit (sumă)', type: 'currency', min: 0 },
    { key: 'economic.debt.ratePct', label: 'Interest rate %/yr', labelRo: 'Dobândă %/an', type: 'percent', min: 0, max: 40, visibleIf: { field: 'economic.debt.amount', gt: 0 } },
    { key: 'economic.debt.tenorMonths', label: 'Tenor (months)', labelRo: 'Durată (luni)', type: 'number', min: 1, max: 360, visibleIf: { field: 'economic.debt.amount', gt: 0 } },
    { key: 'economic.debt.shape', label: 'Repayment shape', labelRo: 'Tip rambursare', type: 'select', visibleIf: { field: 'economic.debt.amount', gt: 0 }, options: [
      { value: 'amortizing', label: 'Amortizing (level annuity)' },
      { value: 'interest_only', label: 'Interest-only (bullet)' },
      { value: 'balloon', label: 'Balloon' },
    ] },
    { key: 'economic.debt.graceMonths', label: 'Grace period (months)', labelRo: 'Perioadă de grație (luni)', type: 'number', min: 0, max: 60, visibleIf: { field: 'economic.debt.amount', gt: 0 } },
    { key: 'economic.debt.balloonPct', label: 'Balloon % of amount', labelRo: 'Balon % din sumă', type: 'percent', min: 0, max: 90, visibleIf: { field: 'economic.debt.shape', equals: 'balloon' } },
    // BC-203 terminal value
    { key: 'economic.tv.method', label: 'Terminal value method', labelRo: 'Metodă valoare terminală', type: 'select', options: [
      { value: 'none', label: 'None' },
      { value: 'gordon', label: 'Perpetuity growth (Gordon)' },
      { value: 'exit_multiple', label: 'Exit multiple (× EBITDA)' },
    ] },
    { key: 'economic.tv.growthPct', label: 'Perpetuity growth %', labelRo: 'Creștere perpetuă %', type: 'percent', min: -5, max: 10, visibleIf: { field: 'economic.tv.method', equals: 'gordon' } },
    { key: 'economic.tv.exitMultiple', label: 'Exit multiple (× EBITDA)', labelRo: 'Multiplu exit (× EBITDA)', type: 'number', min: 0, max: 30, visibleIf: { field: 'economic.tv.method', equals: 'exit_multiple' } },
    // BC-202 MIRR rates (optional; default to the discount rate)
    { key: 'economic.rates.financeRatePct', label: 'MIRR finance rate %', labelRo: 'Rată finanțare MIRR %', type: 'percent', min: 0, max: 40 },
    { key: 'economic.rates.reinvestRatePct', label: 'MIRR reinvestment rate %', labelRo: 'Rată reinvestire MIRR %', type: 'percent', min: 0, max: 40 },
  ],
};

/**
 * S-59 (BC-210 + BC-208 accounting break-even) — optional unit-economics inputs.
 */
const UNIT_ECONOMICS_SECTION: QuestionSection = {
  id: 'unitEconomics',
  title: 'Unit economics (optional)',
  titleRo: 'Economie unitară (opțional)',
  fields: [
    { key: 'ue.pricePerUnit', label: 'Price per unit', labelRo: 'Preț pe unitate', type: 'currency', min: 0 },
    { key: 'ue.variableCostPerUnit', label: 'Variable cost per unit', labelRo: 'Cost variabil pe unitate', type: 'currency', min: 0 },
    { key: 'ue.ordersPerMonth', label: 'Orders per customer / month', labelRo: 'Comenzi per client / lună', type: 'number', min: 0, max: 1000 },
    { key: 'ue.monthlyChurnPct', label: 'Monthly churn %', labelRo: 'Churn lunar %', type: 'percent', min: 0, max: 100 },
    { key: 'ue.marketingSpendMonthly', label: 'Monthly marketing spend', labelRo: 'Buget marketing lunar', type: 'currency', min: 0 },
    { key: 'ue.newCustomersMonthly', label: 'New customers / month', labelRo: 'Clienți noi / lună', type: 'number', min: 0 },
    { key: 'ue.fixedCostsMonthly', label: 'Fixed costs / month', labelRo: 'Costuri fixe / lună', type: 'currency', min: 0 },
  ],
};

export const TEMPLATES: Record<BcTemplate, TemplateDescriptor> = {
  FIVE_CASE: {
    template: 'FIVE_CASE',
    name: 'Five Case Model (HM Treasury)',
    nameRo: 'Modelul celor 5 cazuri',
    skeleton: ['Strategic', 'Economic', 'Commercial', 'Financial', 'Management'],
    maturityStages: ['SOC', 'OBC', 'FBC'],
    sections: [STRATEGIC_SECTION, ECONOMIC_SECTION, ADVANCED_MODEL_SECTION, UNIT_ECONOMICS_SECTION, WACC_SECTION],
  },
  PRINCE2_LEAN: {
    template: 'PRINCE2_LEAN',
    name: 'PRINCE2 / lean business case',
    nameRo: 'Caz de afaceri PRINCE2 (lean)',
    skeleton: ['Exec summary', 'Reasons', 'Options', 'Benefits', 'Costs', 'Investment appraisal', 'Risks'],
    sections: [STRATEGIC_SECTION, ECONOMIC_SECTION, ADVANCED_MODEL_SECTION, UNIT_ECONOMICS_SECTION, WACC_SECTION],
  },
  RFQ: {
    template: 'RFQ',
    name: 'RFQ / tender costing',
    nameRo: 'Cost ofertă / licitație',
    skeleton: ['Cost breakdown', 'Pricing', 'Bid recommendation'],
    sections: [RFQ_SECTION],
  },
};

/** Flatten a template's fields, keyed. */
function fieldsOf(t: BcTemplate): QuestionField[] {
  return TEMPLATES[t].sections.flatMap((s) => s.fields);
}

/** Is a field visible given the current answers? (evaluates visibleIf) */
export function isVisible(field: QuestionField, answers: Record<string, any>): boolean {
  const v = field.visibleIf;
  if (!v) return true;
  const val = answers[v.field];
  if (v.equals !== undefined) return val === v.equals;
  if (v.gt !== undefined) return typeof val === 'number' && val > v.gt;
  if (v.lt !== undefined) return typeof val === 'number' && val < v.lt;
  return true;
}

export interface ValidationError { field: string; message: string; }

/** BC-101 — validate an answer set against a template's DSL (required + ranges + visibility). */
export function validateAnswers(template: BcTemplate, answers: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of fieldsOf(template)) {
    if (!isVisible(f, answers)) continue; // hidden fields are exempt
    const val = answers[f.key];
    if (f.required && (val === undefined || val === null || val === '')) {
      errors.push({ field: f.key, message: `${f.label} is required` });
      continue;
    }
    if (val === undefined || val === null || val === '') continue;
    if ((f.type === 'number' || f.type === 'percent' || f.type === 'currency')) {
      const n = Number(val);
      if (!Number.isFinite(n)) errors.push({ field: f.key, message: `${f.label} must be a number` });
      else {
        if (f.min !== undefined && n < f.min) errors.push({ field: f.key, message: `${f.label} must be ≥ ${f.min}` });
        if (f.max !== undefined && n > f.max) errors.push({ field: f.key, message: `${f.label} must be ≤ ${f.max}` });
      }
    }
    if (f.type === 'select' && f.options && !f.options.some((o) => o.value === val)) {
      errors.push({ field: f.key, message: `${f.label}: invalid choice` });
    }
    if (f.type === 'driver-table') {
      if (!Array.isArray(val)) {
        errors.push({ field: f.key, message: `${f.label} must be a table of rows` });
      } else {
        if (f.rowsFrom) {
          const expected = Number(answers[f.rowsFrom]);
          if (Number.isFinite(expected) && val.length !== expected) {
            errors.push({ field: f.key, message: `${f.label} must have exactly ${expected} row(s) (one per year)` });
          }
        }
        for (const col of f.columns ?? []) {
          for (let r = 0; r < val.length; r++) {
            const cell = Number(val[r]?.[col.key]);
            if (!Number.isFinite(cell)) { errors.push({ field: `${f.key}[${r}].${col.key}`, message: `${col.label} (year ${r + 1}) must be a number` }); continue; }
            if (col.min !== undefined && cell < col.min) errors.push({ field: `${f.key}[${r}].${col.key}`, message: `${col.label} (year ${r + 1}) must be ≥ ${col.min}` });
            if (col.max !== undefined && cell > col.max) errors.push({ field: `${f.key}[${r}].${col.key}`, message: `${col.label} (year ${r + 1}) must be ≤ ${col.max}` });
          }
        }
      }
    }
  }
  return errors;
}

/** Field-level diff between two answer sets (BC-105 preview; used by the versions diff). */
export function diffAnswers(a: Record<string, any>, b: Record<string, any>) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const changes: { field: string; from: any; to: any }[] = [];
  for (const k of keys) {
    if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) changes.push({ field: k, from: a?.[k], to: b?.[k] });
  }
  return changes;
}
