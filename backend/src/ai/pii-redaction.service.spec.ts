import { PiiRedactionService } from './pii-redaction.service';

describe('PiiRedactionService (GI-AI-1)', () => {
  const svc = new PiiRedactionService();

  describe('CNP checksum', () => {
    it('accepts a checksum-valid CNP', () => {
      expect(svc.isValidCnp('1960623086543')).toBe(true);
    });
    it('rejects a wrong control digit', () => {
      expect(svc.isValidCnp('1960623086544')).toBe(false);
    });
    it('rejects an impossible date', () => {
      expect(svc.isValidCnp('1963423086543')).toBe(false); // month 34
    });
    it('rejects a 13-digit non-CNP (invoice-like number)', () => {
      expect(svc.isValidCnp('1234567890123')).toBe(false);
    });
  });

  describe('redact', () => {
    it('redacts a valid CNP but leaves a random 13-digit number', () => {
      const r = svc.redact('CNP 1960623086543 factura 1234567890123');
      expect(r.text).toContain('[CNP_1]');
      expect(r.text).toContain('1234567890123'); // not PII, untouched
      expect(r.text).not.toContain('1960623086543');
      expect(r.map['[CNP_1]']).toBe('1960623086543');
    });
    it('redacts IBAN, email, phone', () => {
      const r = svc.redact('IBAN RO49AAAA1B31007593840000 mail ion@test.ro tel +40721234567');
      expect(r.text).toContain('[IBAN_1]');
      expect(r.text).toContain('[EMAIL_1]');
      expect(r.text).toContain('[PHONE_1]');
      expect(r.text).not.toContain('ion@test.ro');
    });
    it('gives a repeated value one stable placeholder', () => {
      const r = svc.redact('ion@test.ro and again ion@test.ro');
      expect(r.counts.EMAIL).toBe(1);
      expect((r.text.match(/\[EMAIL_1\]/g) || []).length).toBe(2);
    });
    it('handles empty input', () => {
      expect(svc.redact('').text).toBe('');
    });
  });

  describe('rehydrate (round-trip)', () => {
    it('restores the original values in a response', () => {
      const original = 'Clientul cu CNP 1960623086543 și email ion@test.ro';
      const { text, map } = svc.redact(original);
      // the LLM echoes placeholders back:
      const modelReply = `Am procesat clientul ${text.match(/\[CNP_1\]/) ? '[CNP_1]' : ''} — trimit la ${text.includes('[EMAIL_1]') ? '[EMAIL_1]' : ''}`;
      const rehydrated = svc.rehydrate(modelReply, map);
      expect(rehydrated).toContain('1960623086543');
      expect(rehydrated).toContain('ion@test.ro');
    });
  });

  describe('hasPii', () => {
    it('true when PII found, false otherwise', () => {
      expect(svc.hasPii(svc.redact('ion@test.ro').counts)).toBe(true);
      expect(svc.hasPii(svc.redact('no pii here').counts)).toBe(false);
    });
  });
});
