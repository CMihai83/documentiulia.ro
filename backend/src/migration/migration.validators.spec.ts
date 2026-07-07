import { detectEntityType, validateRow, isValidCuiFormat, invoiceTotal } from './migration.validators';

describe('migration.validators (DOC-46-1)', () => {
  describe('detectEntityType', () => {
    it('detects invoice by invoice-number columns', () => {
      expect(detectEntityType({ numar_factura: 'F001', total: '100' })).toBe('invoice');
    });
    it('detects customer by CUI column', () => {
      expect(detectEntityType({ denumire: 'X SRL', cui: 'RO123' })).toBe('customer');
    });
    it('detects product by SKU column', () => {
      expect(detectEntityType({ sku: 'P1', denumire: 'Widget' })).toBe('product');
    });
    it('detects product by generic code + price (over customer name fallback)', () => {
      expect(detectEntityType({ cod: 'P1', denumire: 'Widget', pret: '10' })).toBe('product');
    });
    it('keeps a bare code + name as customer (no price signal)', () => {
      expect(detectEntityType({ cod: 'C1', denumire: 'Client SRL' })).toBe('customer');
    });
    it('falls back to customer when only a name is present', () => {
      expect(detectEntityType({ nume: 'Ion' })).toBe('customer');
    });
    it('returns null when nothing matches', () => {
      expect(detectEntityType({ foo: 'bar' })).toBeNull();
    });
  });

  describe('isValidCuiFormat', () => {
    it('accepts RO-prefixed and plain', () => {
      expect(isValidCuiFormat('RO12345678')).toBe(true);
      expect(isValidCuiFormat(45)).toBe(true);
    });
    it('rejects too short / non-numeric', () => {
      expect(isValidCuiFormat('1')).toBe(false);
      expect(isValidCuiFormat('abc')).toBe(false);
    });
  });

  describe('validateRow — customer', () => {
    it('valid with name + good CUI', () => {
      expect(validateRow('customer', { denumire: 'X SRL', cui: '12345678' }).status).toBe('valid');
    });
    it('error on missing name', () => {
      const r = validateRow('customer', { cui: '12345678' });
      expect(r.status).toBe('error');
      expect(r.errors.join()).toMatch(/Nume/);
    });
    it('error on bad CUI format', () => {
      expect(validateRow('customer', { denumire: 'X', cui: 'AB' }).status).toBe('error');
    });
    it('warning when CUI missing (individual)', () => {
      expect(validateRow('customer', { denumire: 'Ion Popescu' }).status).toBe('warning');
    });
  });

  describe('validateRow — product', () => {
    it('valid with code + name', () => {
      expect(validateRow('product', { cod_produs: 'P1', denumire: 'Widget', pret: '10.5' }).status).toBe('valid');
    });
    it('error on missing code', () => {
      expect(validateRow('product', { denumire: 'Widget' }).status).toBe('error');
    });
    it('error on negative price', () => {
      expect(validateRow('product', { cod: 'P1', denumire: 'W', pret: '-5' }).status).toBe('error');
    });
  });

  describe('validateRow — invoice', () => {
    it('valid with number + date + total', () => {
      expect(validateRow('invoice', { numar_factura: 'F1', data: '2026-07-01', total: '119.00' }).status).toBe('valid');
    });
    it('error on invalid date', () => {
      expect(validateRow('invoice', { numar_factura: 'F1', data: 'not-a-date', total: '10' }).status).toBe('error');
    });
    it('error on missing/invalid total', () => {
      expect(validateRow('invoice', { numar_factura: 'F1', data: '2026-07-01' }).status).toBe('error');
    });
  });

  describe('invoiceTotal', () => {
    it('parses comma decimals', () => {
      expect(invoiceTotal({ total: '1 234,50' })).toBe(1234.5);
    });
    it('0 when absent', () => {
      expect(invoiceTotal({ x: 1 })).toBe(0);
    });
  });
});
