import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SagaService } from './saga.service';
import { HttpException } from '@nestjs/common';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('SagaService', () => {
  let service: SagaService;
  let configService: ConfigService;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SAGA_API_URL: 'https://api.saga.ro/v3.2',
          SAGA_API_KEY: 'test-key',
          SAGA_CLIENT_ID: 'test-client',
          SAGA_CLIENT_SECRET: 'test-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SagaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SagaService>(SagaService);
    configService = module.get<ConfigService>(ConfigService);

    // Get the mocked axios instance
    const axios = require('axios');
    mockAxiosInstance = axios.create.mock.results[0].value;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { status: 'connected', version: '3.2' },
      });

      const result = await service.getConnectionStatus();

      expect(result).toEqual({
        connected: true,
        version: '3.2',
        lastChecked: expect.any(Date),
      });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/status');
    });

    it('should handle connection errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      const result = await service.getConnectionStatus();

      expect(result).toEqual({
        connected: false,
        error: 'Connection failed',
        lastChecked: expect.any(Date),
      });
    });
  });

  describe('syncInvoice', () => {
    const mockInvoice = {
      number: 'INV001',
      date: '2024-01-15',
      partner: {
        name: 'Test Partner',
        cui: '12345678',
      },
      lines: [{
        description: 'Test item',
        quantity: 1,
        unitPrice: 100,
        vatRate: 21,
      }],
      totals: {
        net: 100,
        vat: 21,
        gross: 121,
      },
    };

    it('should sync invoice successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { sagaId: 'SAGA001', status: 'created' },
      });

      const result = await service.syncInvoice(mockInvoice);

      expect(result).toEqual({
        sagaId: 'SAGA001',
        status: 'created',
      });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/invoices', mockInvoice);
    });

    it('should throw HttpException on sync failure', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 400, data: { message: 'Invalid invoice data' } },
      });

      await expect(service.syncInvoice(mockInvoice)).rejects.toThrow(HttpException);
    });
  });

  describe('authenticate', () => {
    it('should authenticate and set access token', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      await (service as any).authenticate();

      expect((service as any).accessToken).toBe('test-token');
      expect((service as any).tokenExpiry).toBeDefined();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: 'test-client',
        client_secret: 'test-secret',
      });
    });
  });

  describe('printInvoice', () => {
    it('should return PDF buffer for invoice', async () => {
      const mockPdfBuffer = Buffer.from('fake-pdf-data');
      mockAxiosInstance.get.mockResolvedValue({
        data: mockPdfBuffer,
        headers: { 'content-type': 'application/pdf' },
      });

      const result = await service.printInvoice('SAGA001');

      expect(result).toBe(mockPdfBuffer);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/invoices/SAGA001/pdf');
    });
  });
});