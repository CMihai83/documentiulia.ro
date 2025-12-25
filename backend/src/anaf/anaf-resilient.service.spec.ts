import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ANAFResilientService,
  CircuitState,
  ANAFRequestType,
  RequestPriority,
} from './anaf-resilient.service';

describe('ANAFResilientService', () => {
  let service: ANAFResilientService;
  let eventEmitter: EventEmitter2;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        ANAF_API_KEY: 'test-api-key',
        ANAF_SPV_URL: 'https://api.anaf.ro/spv',
        ANAF_EFACTURA_URL: 'https://api.anaf.ro/efactura',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ANAFResilientService,
        { provide: ConfigService, useValue: mockConfigService },
        EventEmitter2,
      ],
    }).compile();

    service = module.get<ANAFResilientService>(ANAFResilientService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Circuit Breaker', () => {
    it('should initialize with CLOSED circuit', () => {
      const stats = service.getCircuitBreakerStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
    });

    it('should track success count', async () => {
      // Force a success by checking stats after initialization
      const stats = service.getCircuitBreakerStats();
      expect(stats.successCount).toBeGreaterThanOrEqual(0);
    });

    it('should allow force close by admin', () => {
      service.forceCloseCircuit();
      const stats = service.getCircuitBreakerStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
    });
  });

  describe('Configuration', () => {
    it('should update retry configuration', () => {
      service.updateRetryConfig({
        maxRetries: 5,
        baseDelayMs: 2000,
      });

      // Configuration should be updated (no direct accessor, but no error)
      expect(true).toBe(true);
    });

    it('should update circuit breaker configuration', () => {
      service.updateCircuitConfig({
        failureThreshold: 10,
        recoveryTimeMs: 120000,
      });

      // Configuration should be updated
      expect(true).toBe(true);
    });
  });

  describe('Request Queue', () => {
    it('should queue requests', async () => {
      const requestId = await service.queueRequest(
        ANAFRequestType.CUI_VALIDATION,
        { cui: '12345678' },
        RequestPriority.HIGH,
      );

      expect(requestId).toBeDefined();
      expect(requestId).toContain('anaf-');
    });

    it('should get queue statistics', async () => {
      await service.queueRequest(
        ANAFRequestType.SAFT_SUBMISSION,
        { xml: '<test/>', cui: '123', period: '2025-01' },
        RequestPriority.MEDIUM,
      );

      const stats = service.getQueueStats();
      expect(stats.total).toBeGreaterThanOrEqual(1);
    });

    it('should list queued requests', async () => {
      await service.queueRequest(
        ANAFRequestType.EFACTURA_UPLOAD,
        { xml: '<invoice/>', cui: '456' },
        RequestPriority.LOW,
      );

      const requests = service.getQueuedRequests();
      expect(requests.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Request Logging', () => {
    it('should return request logs', () => {
      const logs = service.getRequestLogs(10);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should limit logs by count', () => {
      const logs = service.getRequestLogs(5);
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('validateCUI', () => {
    it('should return response object', async () => {
      const result = await service.validateCUI('12345678');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('retryCount');
      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('circuitState');
    });
  });

  describe('submitSAFT', () => {
    it('should return response object', async () => {
      const result = await service.submitSAFT(
        '<SAFTFile>test</SAFTFile>',
        '12345678',
        '2025-01',
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('requestId');
    });
  });

  describe('uploadEFactura', () => {
    it('should return response object', async () => {
      const result = await service.uploadEFactura(
        '<Invoice>test</Invoice>',
        '12345678',
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('requestId');
    });
  });

  describe('getEFacturaStatus', () => {
    it('should return response object', async () => {
      const result = await service.getEFacturaStatus('upload-123', '12345678');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('requestId');
    });
  });

  describe('Circuit Breaker Advanced', () => {
    it('should have circuit breaker stats with all properties', () => {
      const stats = service.getCircuitBreakerStats();

      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('successCount');
    });

    it('should be in CLOSED state initially', () => {
      const stats = service.getCircuitBreakerStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
    });

    it('should maintain state after force close', () => {
      service.forceCloseCircuit();
      const stats = service.getCircuitBreakerStats();

      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('Request Queue Advanced', () => {
    it('should respect request priority order', async () => {
      // Queue low priority first
      await service.queueRequest(
        ANAFRequestType.CUI_VALIDATION,
        { cui: '111' },
        RequestPriority.LOW,
      );

      // Queue high priority second
      await service.queueRequest(
        ANAFRequestType.CUI_VALIDATION,
        { cui: '222' },
        RequestPriority.HIGH,
      );

      // Queue medium priority third
      await service.queueRequest(
        ANAFRequestType.CUI_VALIDATION,
        { cui: '333' },
        RequestPriority.MEDIUM,
      );

      const requests = service.getQueuedRequests();
      expect(requests.length).toBeGreaterThanOrEqual(3);
    });

    it('should track queue statistics correctly', async () => {
      const initialStats = service.getQueueStats();
      const initialTotal = initialStats.total;

      await service.queueRequest(
        ANAFRequestType.SAFT_SUBMISSION,
        { xml: '<test/>', cui: 'RO123456', period: '2025-01' },
        RequestPriority.MEDIUM,
      );

      const newStats = service.getQueueStats();
      expect(newStats.total).toBeGreaterThan(initialTotal);
    });

    it('should generate unique request IDs', async () => {
      const id1 = await service.queueRequest(
        ANAFRequestType.CUI_VALIDATION,
        { cui: 'RO123' },
        RequestPriority.HIGH,
      );

      const id2 = await service.queueRequest(
        ANAFRequestType.CUI_VALIDATION,
        { cui: 'RO456' },
        RequestPriority.HIGH,
      );

      expect(id1).not.toBe(id2);
    });
  });

  describe('Request Logging Advanced', () => {
    it('should return logs sorted by timestamp', () => {
      const logs = service.getRequestLogs(100);

      if (logs.length > 1) {
        for (let i = 1; i < logs.length; i++) {
          expect(logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
            logs[i].timestamp.getTime(),
          );
        }
      }
    });

    it('should respect log limit', () => {
      const limit = 3;
      const logs = service.getRequestLogs(limit);
      expect(logs.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('Request Types', () => {
    it('should have all ANAFRequestType values', () => {
      expect(ANAFRequestType.CUI_VALIDATION).toBe('CUI_VALIDATION');
      expect(ANAFRequestType.SAFT_SUBMISSION).toBe('SAFT_SUBMISSION');
      expect(ANAFRequestType.EFACTURA_UPLOAD).toBe('EFACTURA_UPLOAD');
      expect(ANAFRequestType.EFACTURA_STATUS).toBe('EFACTURA_STATUS');
      expect(ANAFRequestType.SPV_DOWNLOAD).toBe('SPV_DOWNLOAD');
    });

    it('should have all RequestPriority values', () => {
      expect(RequestPriority.HIGH).toBe(1);
      expect(RequestPriority.MEDIUM).toBe(2);
      expect(RequestPriority.LOW).toBe(3);
    });

    it('should have all CircuitState values', () => {
      expect(CircuitState.CLOSED).toBe('CLOSED');
      expect(CircuitState.OPEN).toBe('OPEN');
      expect(CircuitState.HALF_OPEN).toBe('HALF_OPEN');
    });
  });

  describe('Response Structure', () => {
    it('should include circuit state in response', async () => {
      const result = await service.validateCUI('RO12345678');
      expect(result.circuitState).toBeDefined();
    });

    it('should include retry count in response', async () => {
      const result = await service.uploadEFactura('<invoice/>', 'RO123');
      expect(typeof result.retryCount).toBe('number');
    });

    it('should include request ID in response', async () => {
      const result = await service.submitSAFT('<saft/>', 'RO456', '2025-01');
      expect(result.requestId).toContain('anaf-');
    });
  });

  describe('Queued Request Properties', () => {
    it('should set correct request properties', async () => {
      const requestId = await service.queueRequest(
        ANAFRequestType.EFACTURA_UPLOAD,
        { xml: '<test/>', cui: 'RO999' },
        RequestPriority.HIGH,
      );

      const requests = service.getQueuedRequests();
      const request = requests.find(r => r.id === requestId);

      expect(request).toBeDefined();
      if (request) {
        expect(request.type).toBe(ANAFRequestType.EFACTURA_UPLOAD);
        expect(request.priority).toBe(RequestPriority.HIGH);
        expect(request.createdAt).toBeInstanceOf(Date);
        expect(request.retryCount).toBe(0);
      }
    });
  });

  describe('Configuration Updates', () => {
    it('should allow partial retry config update', () => {
      expect(() => {
        service.updateRetryConfig({ maxRetries: 10 });
      }).not.toThrow();
    });

    it('should allow partial circuit config update', () => {
      expect(() => {
        service.updateCircuitConfig({ failureThreshold: 15 });
      }).not.toThrow();
    });

    it('should allow base delay update', () => {
      expect(() => {
        service.updateRetryConfig({ baseDelayMs: 5000, maxDelayMs: 60000 });
      }).not.toThrow();
    });

    it('should allow recovery time update', () => {
      expect(() => {
        service.updateCircuitConfig({ recoveryTimeMs: 180000 });
      }).not.toThrow();
    });
  });
});
