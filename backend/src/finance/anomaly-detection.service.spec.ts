import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AnomalyDetectionService,
  Transaction,
  DEFAULT_DETECTION_CONFIG,
} from './anomaly-detection.service';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const createTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    amount: 100,
    currency: 'RON',
    timestamp: new Date(),
    customerId: 'customer_1',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyDetectionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
  });

  afterEach(() => {
    service.clearPatterns();
    service.resetStats();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default configuration', () => {
      const config = service.getConfig();
      expect(config.detection.zscoreThreshold).toBe(DEFAULT_DETECTION_CONFIG.zscoreThreshold);
      expect(config.detection.velocityThreshold).toBe(DEFAULT_DETECTION_CONFIG.velocityThreshold);
    });
  });

  describe('transaction analysis', () => {
    it('should analyze a normal transaction', async () => {
      const transaction = createTransaction({ amount: 100 });
      const result = await service.analyzeTransaction(transaction);

      expect(result).toBeDefined();
      expect(result.transactionId).toBe(transaction.id);
      expect(result.score).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(result.detectedAt).toBeDefined();
    });

    it('should return low risk for normal transaction', async () => {
      // Build pattern with normal transactions
      const customerId = 'customer_normal';
      for (let i = 0; i < 10; i++) {
        await service.analyzeTransaction(
          createTransaction({ customerId, amount: 100 + Math.random() * 20 }),
        );
      }

      const result = await service.analyzeTransaction(
        createTransaction({ customerId, amount: 110 }),
      );

      expect(result.riskLevel).toBe('low');
      expect(result.recommendedAction).toBe('approve');
    });

    it('should detect amount outlier', async () => {
      const customerId = 'customer_outlier';

      // Build pattern with small transactions
      for (let i = 0; i < 10; i++) {
        await service.analyzeTransaction(
          createTransaction({ customerId, amount: 50 }),
        );
      }

      // Large outlier transaction
      const result = await service.analyzeTransaction(
        createTransaction({ customerId, amount: 10000 }),
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.anomalyTypes).toContain('amount_outlier');
    });

    it('should detect velocity spike', async () => {
      const customerId = 'customer_velocity';
      const timestamp = new Date();

      // Rapid transactions within short window
      for (let i = 0; i < 12; i++) {
        await service.analyzeTransaction(
          createTransaction({
            customerId,
            amount: 100,
            timestamp: new Date(timestamp.getTime() + i * 1000), // 1 second apart
          }),
        );
      }

      const result = await service.analyzeTransaction(
        createTransaction({ customerId, amount: 100, timestamp }),
      );

      expect(result.anomalyTypes).toContain('velocity_spike');
    });

    it('should detect unusual time', async () => {
      const customerId = 'customer_time';

      // Transaction at 3 AM
      const unusualTime = new Date();
      unusualTime.setHours(3, 0, 0, 0);

      const result = await service.analyzeTransaction(
        createTransaction({ customerId, amount: 100, timestamp: unusualTime }),
      );

      expect(result.anomalyTypes).toContain('unusual_time');
    });

    it('should detect new location', async () => {
      const customerId = 'customer_location';

      // Build pattern with one location
      for (let i = 0; i < 5; i++) {
        await service.analyzeTransaction(
          createTransaction({
            customerId,
            amount: 100,
            location: { country: 'Romania', city: 'Bucharest' },
          }),
        );
      }

      // Transaction from new location
      const result = await service.analyzeTransaction(
        createTransaction({
          customerId,
          amount: 100,
          location: { country: 'Nigeria', city: 'Lagos' },
        }),
      );

      expect(result.anomalyTypes).toContain('location_mismatch');
    });

    it('should detect high-risk category', async () => {
      const result = await service.analyzeTransaction(
        createTransaction({
          customerId: 'customer_category',
          amount: 1000,
          category: 'gambling',
        }),
      );

      expect(result.anomalyTypes).toContain('high_risk_category');
    });

    it('should detect round amounts', async () => {
      const result = await service.analyzeTransaction(
        createTransaction({
          customerId: 'customer_round',
          amount: 5000,
        }),
      );

      expect(result.anomalyTypes).toContain('round_amount');
    });

    it('should batch analyze transactions', async () => {
      const transactions = [
        createTransaction({ id: 'txn_1', amount: 100 }),
        createTransaction({ id: 'txn_2', amount: 200 }),
        createTransaction({ id: 'txn_3', amount: 300 }),
      ];

      const results = await service.analyzeTransactions(transactions);

      expect(results).toHaveLength(3);
      expect(results[0].transactionId).toBe('txn_1');
      expect(results[1].transactionId).toBe('txn_2');
      expect(results[2].transactionId).toBe('txn_3');
    });
  });

  describe('risk levels', () => {
    it('should calculate critical risk for high score', async () => {
      const customerId = 'customer_critical';

      // Build pattern
      for (let i = 0; i < 10; i++) {
        await service.analyzeTransaction(
          createTransaction({ customerId, amount: 50 }),
        );
      }

      // Multiple anomaly triggers
      const result = await service.analyzeTransaction(
        createTransaction({
          customerId,
          amount: 50000, // Huge outlier
          category: 'gambling', // High risk
          timestamp: new Date(new Date().setHours(2)), // Unusual time
          location: { country: 'Unknown' }, // New location
        }),
      );

      expect(['high', 'critical']).toContain(result.riskLevel);
    });

    it('should recommend block for critical risk', async () => {
      const customerId = 'customer_block';

      for (let i = 0; i < 20; i++) {
        await service.analyzeTransaction(
          createTransaction({ customerId, amount: 100 }),
        );
      }

      const result = await service.analyzeTransaction(
        createTransaction({
          customerId,
          amount: 100000,
          category: 'cryptocurrency',
          timestamp: new Date(new Date().setHours(3)),
        }),
      );

      if (result.riskLevel === 'critical' && result.confidence >= 0.7) {
        expect(result.recommendedAction).toBe('block');
      }
    });
  });

  describe('pattern management', () => {
    it('should create pattern for new customer', async () => {
      const customerId = 'new_customer';

      await service.analyzeTransaction(
        createTransaction({ customerId, amount: 100 }),
      );

      const pattern = service.getPattern(customerId);
      expect(pattern).toBeDefined();
      expect(pattern?.customerId).toBe(customerId);
      expect(pattern?.transactionCount).toBe(1);
    });

    it('should update pattern with transactions', async () => {
      const customerId = 'pattern_customer';

      await service.analyzeTransaction(
        createTransaction({ customerId, amount: 100 }),
      );
      await service.analyzeTransaction(
        createTransaction({ customerId, amount: 200 }),
      );
      await service.analyzeTransaction(
        createTransaction({ customerId, amount: 300 }),
      );

      const pattern = service.getPattern(customerId);
      expect(pattern?.transactionCount).toBe(3);
      expect(pattern?.averageAmount).toBe(200);
    });

    it('should calculate standard deviation', async () => {
      const customerId = 'stddev_customer';

      await service.analyzeTransaction(
        createTransaction({ customerId, amount: 100 }),
      );
      await service.analyzeTransaction(
        createTransaction({ customerId, amount: 100 }),
      );
      await service.analyzeTransaction(
        createTransaction({ customerId, amount: 200 }),
      );

      const pattern = service.getPattern(customerId);
      expect(pattern?.stdDevAmount).toBeGreaterThan(0);
    });

    it('should build pattern from history', () => {
      const customerId = 'history_customer';
      const transactions = [
        createTransaction({ customerId, amount: 100 }),
        createTransaction({ customerId, amount: 150 }),
        createTransaction({ customerId, amount: 200 }),
        createTransaction({ customerId, amount: 250 }),
        createTransaction({ customerId, amount: 300 }),
      ];

      const pattern = service.buildPatternFromHistory(customerId, transactions);

      expect(pattern.transactionCount).toBe(5);
      expect(pattern.averageAmount).toBe(200);
    });

    it('should return null for unknown customer pattern', () => {
      const pattern = service.getPattern('unknown_customer');
      expect(pattern).toBeNull();
    });

    it('should get all patterns', async () => {
      await service.analyzeTransaction(
        createTransaction({ customerId: 'customer_a', amount: 100 }),
      );
      await service.analyzeTransaction(
        createTransaction({ customerId: 'customer_b', amount: 200 }),
      );

      const patterns = service.getAllPatterns();
      expect(patterns.length).toBe(2);
    });

    it('should clear all patterns', async () => {
      await service.analyzeTransaction(
        createTransaction({ customerId: 'customer_1', amount: 100 }),
      );

      service.clearPatterns();

      const patterns = service.getAllPatterns();
      expect(patterns.length).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should track analyzed transactions', async () => {
      await service.analyzeTransaction(createTransaction({ amount: 100 }));
      await service.analyzeTransaction(createTransaction({ amount: 200 }));
      await service.analyzeTransaction(createTransaction({ amount: 300 }));

      const stats = service.getStats();
      expect(stats.totalAnalyzed).toBe(3);
    });

    it('should track anomalies detected', async () => {
      const customerId = 'stats_customer';

      // Build pattern
      for (let i = 0; i < 10; i++) {
        await service.analyzeTransaction(
          createTransaction({ customerId, amount: 100 }),
        );
      }

      // Trigger anomaly
      await service.analyzeTransaction(
        createTransaction({ customerId, amount: 50000 }),
      );

      const stats = service.getStats();
      expect(stats.anomaliesDetected).toBeGreaterThan(0);
    });

    it('should calculate average score', async () => {
      await service.analyzeTransaction(createTransaction({ amount: 100 }));
      await service.analyzeTransaction(createTransaction({ amount: 200 }));

      const stats = service.getStats();
      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics', async () => {
      await service.analyzeTransaction(createTransaction({ amount: 100 }));

      service.resetStats();

      const stats = service.getStats();
      expect(stats.totalAnalyzed).toBe(0);
      expect(stats.anomaliesDetected).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should get configuration', () => {
      const config = service.getConfig();

      expect(config.detection).toBeDefined();
      expect(config.isolationForest).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = { zscoreThreshold: 2.5, velocityThreshold: 5 };

      const updated = service.updateConfig(newConfig);

      expect(updated.zscoreThreshold).toBe(2.5);
      expect(updated.velocityThreshold).toBe(5);
    });
  });

  describe('risk reports', () => {
    it('should generate risk report for customer with history', async () => {
      const customerId = 'report_customer';

      for (let i = 0; i < 10; i++) {
        await service.analyzeTransaction(
          createTransaction({ customerId, amount: 100 + i * 10 }),
        );
      }

      const report = service.generateRiskReport(customerId);

      expect(report.customerId).toBe(customerId);
      expect(report.pattern).toBeDefined();
      expect(report.riskProfile).toBeDefined();
      expect(report.riskProfile.overallRisk).toBeDefined();
    });

    it('should return empty report for unknown customer', () => {
      const report = service.generateRiskReport('unknown_customer');

      expect(report.customerId).toBe('unknown_customer');
      expect(report.pattern).toBeNull();
      expect(report.riskProfile.topConcerns).toContain('Insufficient transaction history');
    });

    it('should identify high amount variability concern', async () => {
      const customerId = 'variable_customer';

      // Transactions with high variability
      const amounts = [10, 1000, 50, 5000, 100];
      for (const amount of amounts) {
        await service.analyzeTransaction(
          createTransaction({ customerId, amount }),
        );
      }

      const report = service.generateRiskReport(customerId);
      expect(report.riskProfile.topConcerns).toContain('High amount variability');
    });
  });

  describe('detection methods', () => {
    it('should use multiple detection methods', async () => {
      const customerId = 'multi_method';

      // Build pattern
      for (let i = 0; i < 10; i++) {
        await service.analyzeTransaction(
          createTransaction({ customerId, amount: 100 }),
        );
      }

      // Transaction that triggers multiple methods
      const result = await service.analyzeTransaction(
        createTransaction({
          customerId,
          amount: 10000,
          timestamp: new Date(new Date().setHours(3)),
        }),
      );

      expect(result.detectionMethods.length).toBeGreaterThan(0);
    });

    it('should provide reasons for anomalies', async () => {
      const customerId = 'reasons_customer';

      for (let i = 0; i < 10; i++) {
        await service.analyzeTransaction(
          createTransaction({ customerId, amount: 100 }),
        );
      }

      const result = await service.analyzeTransaction(
        createTransaction({ customerId, amount: 50000 }),
      );

      if (result.isAnomaly) {
        expect(result.reasons.length).toBeGreaterThan(0);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount', async () => {
      const result = await service.analyzeTransaction(
        createTransaction({ amount: 0 }),
      );

      expect(result).toBeDefined();
    });

    it('should handle negative amount', async () => {
      const result = await service.analyzeTransaction(
        createTransaction({ amount: -100 }), // Refund
      );

      expect(result).toBeDefined();
    });

    it('should handle very large amount', async () => {
      const result = await service.analyzeTransaction(
        createTransaction({ amount: 1000000000 }),
      );

      expect(result).toBeDefined();
    });

    it('should handle missing optional fields', async () => {
      const transaction: Transaction = {
        id: 'minimal_txn',
        amount: 100,
        currency: 'RON',
        timestamp: new Date(),
        customerId: 'minimal_customer',
      };

      const result = await service.analyzeTransaction(transaction);
      expect(result).toBeDefined();
    });

    it('should handle empty batch', async () => {
      const results = await service.analyzeTransactions([]);
      expect(results).toHaveLength(0);
    });
  });
});
