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
  ],
};

export const TEMPLATES: Record<BcTemplate, TemplateDescriptor> = {
  FIVE_CASE: {
    template: 'FIVE_CASE',
    name: 'Five Case Model (HM Treasury)',
    nameRo: 'Modelul celor 5 cazuri',
    skeleton: ['Strategic', 'Economic', 'Commercial', 'Financial', 'Management'],
    maturityStages: ['SOC', 'OBC', 'FBC'],
    sections: [STRATEGIC_SECTION, WACC_SECTION],
  },
  PRINCE2_LEAN: {
    template: 'PRINCE2_LEAN',
    name: 'PRINCE2 / lean business case',
    nameRo: 'Caz de afaceri PRINCE2 (lean)',
    skeleton: ['Exec summary', 'Reasons', 'Options', 'Benefits', 'Costs', 'Investment appraisal', 'Risks'],
    sections: [STRATEGIC_SECTION, WACC_SECTION],
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
