import axios from 'axios';
import { AnafLookupService } from './anaf-lookup.service';

jest.mock('axios');
const mockedPost = axios.post as jest.Mock;

describe('AnafLookupService (DOC-44-4)', () => {
  let service: AnafLookupService;
  let redis: { get: jest.Mock; set: jest.Mock };

  beforeEach(() => {
    redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(true) };
    service = new AnafLookupService(redis as any);
    mockedPost.mockReset();
  });

  describe('validateFormat', () => {
    it('accepts 2–10 digit CUIs, with or without RO prefix', () => {
      expect(service.validateFormat('12345678')).toBe(true);
      expect(service.validateFormat('RO12345678')).toBe(true);
      expect(service.validateFormat(45)).toBe(true);
    });
    it('rejects too-short / non-numeric / empty', () => {
      expect(service.validateFormat('1')).toBe(false);
      expect(service.validateFormat('abc')).toBe(false);
      expect(service.validateFormat('' as any)).toBe(false);
    });
  });

  it('short-circuits invalid format without calling ANAF', async () => {
    const r = await service.lookup('x');
    expect(r.formatValid).toBe(false);
    expect(r.valid).toBe(false);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('returns a cached result without calling ANAF', async () => {
    redis.get.mockResolvedValueOnce({ cui: '12345678', formatValid: true, found: true, valid: true, cached: false });
    const r = await service.lookup('RO12345678');
    expect(r.cached).toBe(true);
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('parses an active VAT payer and caches it', async () => {
    mockedPost.mockResolvedValueOnce({ status: 200, data: { found: [{ date_generale: { denumire: 'Test SRL', adresa: 'Cluj', statusRO_e_Factura: true }, inregistrare_scop_Tva: { scpTVA: true }, stare_inactiv: { statusInactivi: false } }] } });
    const r = await service.lookup('12345678');
    expect(r.valid).toBe(true);
    expect(r.company?.name).toBe('Test SRL');
    expect(r.company?.vatPayer).toBe(true);
    expect(r.company?.eFacturaEnrolled).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('anaf:cui:12345678', expect.any(Object), 24 * 60 * 60);
  });

  it('marks inactive taxpayers as not valid', async () => {
    mockedPost.mockResolvedValueOnce({ status: 200, data: { found: [{ date_generale: { denumire: 'Dead SRL' }, stare_inactiv: { statusInactivi: true } }] } });
    const r = await service.lookup('12345678');
    expect(r.found).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.company?.inactive).toBe(true);
  });

  it('handles not-found with a Romanian message', async () => {
    mockedPost.mockResolvedValueOnce({ status: 200, data: { notfound: [{ cui: 999 }] } });
    const r = await service.lookup('99999999');
    expect(r.found).toBe(false);
    expect(r.errorRo).toContain('negăsit');
  });

  it('retries on a 5xx then succeeds', async () => {
    mockedPost
      .mockResolvedValueOnce({ status: 503, data: {} })
      .mockResolvedValueOnce({ status: 200, data: { found: [{ date_generale: { denumire: 'OK SRL' }, stare_inactiv: { statusInactivi: false } }] } });
    const r = await service.lookup('12345678');
    expect(mockedPost).toHaveBeenCalledTimes(2);
    expect(r.valid).toBe(true);
  });

  it('does not retry a non-retryable (4xx) error', async () => {
    mockedPost.mockRejectedValue({ message: 'bad request', response: { status: 400 } });
    const r = await service.lookup('12345678');
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(r.valid).toBe(false);
    expect(r.error).toContain('failed');
  });

  it('rate-limits to ~10/sec (11th call waits)', async () => {
    mockedPost.mockResolvedValue({ status: 200, data: { found: [{ date_generale: { denumire: 'X' }, stare_inactiv: { statusInactivi: false } }] } });
    const start = Date.now();
    await Promise.all(Array.from({ length: 11 }, (_, i) => service.lookup(`1000000${i}`)));
    expect(Date.now() - start).toBeGreaterThanOrEqual(900);
  });

  describe('assertUsable', () => {
    it('ok for an active found CUI', async () => {
      mockedPost.mockResolvedValueOnce({ status: 200, data: { found: [{ date_generale: { denumire: 'X' }, stare_inactiv: { statusInactivi: false } }] } });
      expect((await service.assertUsable('12345678')).ok).toBe(true);
    });
    it('blocks an inactive taxpayer with a reason', async () => {
      mockedPost.mockResolvedValueOnce({ status: 200, data: { found: [{ date_generale: { denumire: 'X' }, stare_inactiv: { statusInactivi: true } }] } });
      const r = await service.assertUsable('12345678');
      expect(r.ok).toBe(false);
      expect(r.reason).toContain('inactiv');
    });
  });
});
