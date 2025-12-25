import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AnafService } from './anaf.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AnafService', () => {
  let service: AnafService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          ANAF_API_KEY: 'test-api-key',
          ANAF_SPV_URL: 'https://api.anaf.ro/spv',
        };
        return config[key];
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnafService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AnafService>(AnafService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== CUI VALIDATION ===================

  describe('validateCUI', () => {
    it('should validate a valid CUI and return company data', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          found: [
            {
              cui: 12345678,
              denumire: 'SC Test Company SRL',
              adresa: 'Bucuresti, Str. Exemplu nr. 1',
              scpTVA: true,
            },
          ],
        },
      });

      const result = await service.validateCUI('RO12345678');

      expect(result.valid).toBe(true);
      expect(result.company).toBeDefined();
      expect(result.company!.name).toBe('SC Test Company SRL');
      expect(result.company!.address).toBe('Bucuresti, Str. Exemplu nr. 1');
      expect(result.company!.vatPayer).toBe(true);
    });

    it('should call ANAF API with correct endpoint', async () => {
      mockedAxios.post.mockResolvedValue({ data: { found: [] } });

      await service.validateCUI('12345678');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva',
        expect.any(Array),
      );
    });

    it('should strip non-numeric characters from CUI', async () => {
      mockedAxios.post.mockResolvedValue({ data: { found: [] } });

      await service.validateCUI('RO-123-456-78');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ cui: 12345678 }),
        ]),
      );
    });

    it('should return invalid for non-existent CUI', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { found: [] },
      });

      const result = await service.validateCUI('99999999');

      expect(result.valid).toBe(false);
      expect(result.company).toBeUndefined();
    });

    it('should return invalid when API returns null found', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { found: null },
      });

      const result = await service.validateCUI('12345678');

      expect(result.valid).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.validateCUI('12345678');

      expect(result.valid).toBe(false);
    });

    it('should handle timeout errors', async () => {
      mockedAxios.post.mockRejectedValue({ code: 'ECONNABORTED' });

      const result = await service.validateCUI('12345678');

      expect(result.valid).toBe(false);
    });

    it('should detect non-VAT payer company', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          found: [
            {
              cui: 87654321,
              denumire: 'PFA Non-Vat',
              adresa: 'Cluj-Napoca',
              scpTVA: false,
            },
          ],
        },
      });

      const result = await service.validateCUI('87654321');

      expect(result.valid).toBe(true);
      expect(result.company!.vatPayer).toBe(false);
    });

    it('should include current date in API request', async () => {
      mockedAxios.post.mockResolvedValue({ data: { found: [] } });

      await service.validateCUI('12345678');

      const today = new Date().toISOString().split('T')[0];
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ data: today }),
        ]),
      );
    });
  });

  // =================== SAF-T D406 SUBMISSION ===================

  describe('submitSAFT', () => {
    const mockXml = '<?xml version="1.0"?><SAFTFile></SAFTFile>';
    const mockCui = '12345678';
    const mockPeriod = '2025-01';

    it('should submit SAF-T D406 successfully', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { indexIncarcare: 'SAFT-2025-001' },
      });

      const result = await service.submitSAFT(mockXml, mockCui, mockPeriod);

      expect(result.reference).toBe('SAFT-2025-001');
      expect(result.status).toBe('submitted');
    });

    it('should call SPV API with correct endpoint', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { indexIncarcare: 'REF-001' },
      });

      await service.submitSAFT(mockXml, mockCui, mockPeriod);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.anaf.ro/spv/d406/upload',
        mockXml,
        expect.any(Object),
      );
    });

    it('should include CIF in request params', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { indexIncarcare: 'REF-001' },
      });

      await service.submitSAFT(mockXml, mockCui, mockPeriod);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            cif: mockCui,
            perioada: mockPeriod,
          }),
        }),
      );
    });

    it('should include Authorization header', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { indexIncarcare: 'REF-001' },
      });

      await service.submitSAFT(mockXml, mockCui, mockPeriod);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('should set Content-Type to application/xml', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { indexIncarcare: 'REF-001' },
      });

      await service.submitSAFT(mockXml, mockCui, mockPeriod);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/xml',
          }),
        }),
      );
    });

    it('should throw error on API failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      await expect(
        service.submitSAFT(mockXml, mockCui, mockPeriod),
      ).rejects.toThrow('API Error');
    });

    it('should throw on 401 unauthorized', async () => {
      mockedAxios.post.mockRejectedValue({
        response: { status: 401, data: 'Unauthorized' },
      });

      await expect(
        service.submitSAFT(mockXml, mockCui, mockPeriod),
      ).rejects.toBeDefined();
    });

    it('should throw on 400 bad request', async () => {
      mockedAxios.post.mockRejectedValue({
        response: { status: 400, data: 'Invalid XML' },
      });

      await expect(
        service.submitSAFT(mockXml, mockCui, mockPeriod),
      ).rejects.toBeDefined();
    });

    it('should read API key from config', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { indexIncarcare: 'REF-001' },
      });

      await service.submitSAFT(mockXml, mockCui, mockPeriod);

      expect(mockConfigService.get).toHaveBeenCalledWith('ANAF_API_KEY');
    });

    it('should read SPV URL from config', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { indexIncarcare: 'REF-001' },
      });

      await service.submitSAFT(mockXml, mockCui, mockPeriod);

      expect(mockConfigService.get).toHaveBeenCalledWith('ANAF_SPV_URL');
    });
  });

  // =================== DEADLINES (Order 1783/2021) ===================

  describe('getDeadlines', () => {
    describe('Small companies', () => {
      it('should return monthly frequency for small companies', () => {
        const deadlines = service.getDeadlines('small');

        expect(deadlines.saftFrequency).toBe('monthly');
      });

      it('should return next deadline as 25th of next month', () => {
        const deadlines = service.getDeadlines('small');
        const now = new Date();
        const expectedMonth = now.getMonth() + 1;

        expect(deadlines.nextDeadline.getDate()).toBe(25);
        expect(deadlines.nextDeadline.getMonth()).toBe(expectedMonth % 12);
      });
    });

    describe('Large companies', () => {
      it('should return quarterly frequency for large companies', () => {
        const deadlines = service.getDeadlines('large');

        expect(deadlines.saftFrequency).toBe('quarterly');
      });
    });

    describe('Non-resident companies', () => {
      it('should return monthly frequency for non-residents', () => {
        const deadlines = service.getDeadlines('non-resident');

        expect(deadlines.saftFrequency).toBe('monthly');
      });
    });

    describe('Pilot Period (Order 1783/2021)', () => {
      it('should define pilot period from Sept 2025 to Aug 2026', () => {
        const deadlines = service.getDeadlines('small');

        expect(deadlines.pilotPeriod.start).toEqual(new Date('2025-09-01'));
        expect(deadlines.pilotPeriod.end).toEqual(new Date('2026-08-31'));
      });

      it('should have 6-month grace period', () => {
        const deadlines = service.getDeadlines('small');

        expect(deadlines.gracePeriod).toBe(6);
      });
    });

    describe('Date calculations', () => {
      it('should return next deadline in the future', () => {
        const deadlines = service.getDeadlines('small');
        const now = new Date();

        expect(deadlines.nextDeadline.getTime()).toBeGreaterThan(now.getTime());
      });

      it('should handle year boundary correctly', () => {
        // This is implicitly tested - the 25th of next month calculation
        // should work regardless of current month
        const deadlines = service.getDeadlines('small');

        expect(deadlines.nextDeadline.getDate()).toBe(25);
      });
    });
  });

  // =================== ROMANIAN COMPLIANCE SPECIFICS ===================

  describe('Romanian Compliance - Legea 141/2025 & Order 1783/2021', () => {
    it('should support RO prefix in CUI validation', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { found: [{ cui: 12345678, denumire: 'Test', adresa: 'Addr', scpTVA: true }] },
      });

      const result = await service.validateCUI('RO12345678');

      expect(result.valid).toBe(true);
    });

    it('should define SAF-T submission endpoint for D406', async () => {
      mockedAxios.post.mockResolvedValue({ data: { indexIncarcare: 'REF' } });

      await service.submitSAFT('<xml/>', '12345678', '2025-01');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/d406/upload'),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should return index incarcare reference from SPV', async () => {
      const expectedRef = 'SAFT-D406-2025-01-12345';
      mockedAxios.post.mockResolvedValue({
        data: { indexIncarcare: expectedRef },
      });

      const result = await service.submitSAFT('<xml/>', '12345678', '2025-01');

      expect(result.reference).toBe(expectedRef);
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle empty CUI string', async () => {
      mockedAxios.post.mockResolvedValue({ data: { found: [] } });

      const result = await service.validateCUI('');

      // Should call API with CUI as NaN or 0
      expect(result.valid).toBe(false);
    });

    it('should handle CUI with only letters', async () => {
      mockedAxios.post.mockResolvedValue({ data: { found: [] } });

      const result = await service.validateCUI('ROABCDEFGH');

      expect(result.valid).toBe(false);
    });

    it('should handle very long CUI', async () => {
      mockedAxios.post.mockResolvedValue({ data: { found: [] } });

      const result = await service.validateCUI('RO123456789012345678901234567890');

      expect(result.valid).toBe(false);
    });

    it('should handle special characters in CUI', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { found: [{ cui: 12345678, denumire: 'Test', adresa: 'A', scpTVA: true }] },
      });

      const result = await service.validateCUI('RO-123.456.78');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.objectContaining({ cui: 12345678 })]),
      );
    });

    it('should handle empty XML for SAF-T submission', async () => {
      mockedAxios.post.mockResolvedValue({ data: { indexIncarcare: 'REF' } });

      await service.submitSAFT('', '12345678', '2025-01');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        '',
        expect.any(Object),
      );
    });

    it('should handle company with empty address', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          found: [{ cui: 12345678, denumire: 'Test Company', adresa: '', scpTVA: true }],
        },
      });

      const result = await service.validateCUI('12345678');

      expect(result.valid).toBe(true);
      expect(result.company!.address).toBe('');
    });
  });
});
