/**
 * Pure, dependency-free validation for migration staging (DOC-46-1).
 * Kept separate so it can be unit-tested without a DB or file parser.
 */

export type MigrationEntity = 'customer' | 'product' | 'invoice';
export type RowStatus = 'valid' | 'warning' | 'error';

export interface RowResult {
  status: RowStatus;
  errors: string[];
}

/** RO CUI format check (2–10 digits, optional RO prefix). */
export function isValidCuiFormat(cui: unknown): boolean {
  if (cui === null || cui === undefined) return false;
  const clean = String(cui).toUpperCase().replace(/^RO/, '').replace(/\D/g, '');
  return clean.length >= 2 && clean.length <= 10;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function pick(row: Record<string, any>, keys: string[]): any {
  for (const k of Object.keys(row)) {
    const lk = k.toLowerCase().trim();
    if (keys.includes(lk)) return row[k];
  }
  return undefined;
}

/** Guess the entity type from a row's column names. */
export function detectEntityType(row: Record<string, any>): MigrationEntity | null {
  const cols = Object.keys(row).map((k) => k.toLowerCase().trim());
  const has = (...ks: string[]) => ks.some((k) => cols.includes(k));
  if (has('invoicenumber', 'numar_factura', 'nrfactura', 'invoice_no', 'numarfactura')) return 'invoice';
  if (has('cui', 'cif', 'cod_fiscal', 'codfiscal')) return 'customer';
  if (has('sku', 'cod_produs', 'codprodus', 'product_code', 'barcode')) return 'product';
  if (has('name', 'denumire', 'nume')) return 'customer';
  return null;
}

/** Validate a single parsed row for the given entity type. */
export function validateRow(entity: MigrationEntity, row: Record<string, any>): RowResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (entity === 'customer') {
    const name = pick(row, ['name', 'denumire', 'nume']);
    const cui = pick(row, ['cui', 'cif', 'cod_fiscal', 'codfiscal']);
    if (!name || String(name).trim() === '') errors.push('Nume/denumire lipsă');
    if (cui && !isValidCuiFormat(cui)) errors.push(`CUI format invalid: ${cui}`);
    if (!cui) warnings.push('CUI lipsă (client persoană fizică?)');
  } else if (entity === 'product') {
    const code = pick(row, ['sku', 'cod_produs', 'codprodus', 'product_code', 'cod']);
    const name = pick(row, ['name', 'denumire', 'nume']);
    const price = num(pick(row, ['price', 'pret', 'unit_price', 'pret_unitar']));
    if (!code || String(code).trim() === '') errors.push('Cod produs lipsă');
    if (!name || String(name).trim() === '') errors.push('Denumire produs lipsă');
    if (price !== null && price < 0) errors.push('Preț negativ');
  } else if (entity === 'invoice') {
    const number = pick(row, ['invoicenumber', 'numar_factura', 'nrfactura', 'invoice_no', 'numarfactura']);
    const dateRaw = pick(row, ['date', 'data', 'invoice_date', 'data_factura']);
    const total = num(pick(row, ['total', 'total_amount', 'valoare', 'suma']));
    if (!number || String(number).trim() === '') errors.push('Număr factură lipsă');
    if (!dateRaw || isNaN(new Date(String(dateRaw)).getTime())) errors.push('Dată factură invalidă');
    if (total === null) errors.push('Total factură lipsă/invalid');
    else if (total < 0) errors.push('Total negativ');
  }

  if (errors.length) return { status: 'error', errors };
  if (warnings.length) return { status: 'warning', errors: warnings };
  return { status: 'valid', errors: [] };
}

/** Numeric total of an invoice row (for reconciliation), else 0. */
export function invoiceTotal(row: Record<string, any>): number {
  return num(pick(row, ['total', 'total_amount', 'valoare', 'suma'])) ?? 0;
}
