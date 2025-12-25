import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PerformanceTestingService,
  TestCategory,
  TestType,
} from './performance-testing.service';

describe('PerformanceTestingService', () => {
  let service: PerformanceTestingService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceTestingService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PerformanceTestingService>(PerformanceTestingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Performance Tests', () => {
    it('should run a latency performance test', async () => {
      const result = await service.runPerformanceTest({
        category: 'HR_FINANCE',
        type: 'LATENCY',
        concurrentUsers: 10,
        durationSeconds: 5,
        rampUpSeconds: 1,
        operations: [],
      });

      expect(result.id).toBeDefined();
      expect(result.category).toBe('HR_FINANCE');
      expect(result.type).toBe('LATENCY');
      expect(result.status).toBe('COMPLETED');
      expect(result.metrics.length).toBeGreaterThan(0);
    });

    it('should calculate latency percentiles', async () => {
      const result = await service.runPerformanceTest({
        category: 'LMS_GAMIFICATION',
        type: 'LATENCY',
        concurrentUsers: 10,
        durationSeconds: 5,
        rampUpSeconds: 1,
        operations: [],
      });

      expect(result.latencyP50).toBeDefined();
      expect(result.latencyP95).toBeDefined();
      expect(result.latencyP99).toBeDefined();
      expect(result.latencyAvg).toBeDefined();
      expect(result.latencyMin).toBeDefined();
      expect(result.latencyMax).toBeDefined();

      // P50 < P95 < P99 < Max
      expect(result.latencyP50).toBeLessThanOrEqual(result.latencyP95!);
      expect(result.latencyP95).toBeLessThanOrEqual(result.latencyP99!);
      expect(result.latencyP99).toBeLessThanOrEqual(result.latencyMax!);
    });

    it('should calculate throughput', async () => {
      const result = await service.runPerformanceTest({
        category: 'ECOMMERCE_INVENTORY',
        type: 'THROUGHPUT',
        concurrentUsers: 20,
        durationSeconds: 5,
        rampUpSeconds: 1,
        operations: [],
      });

      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.requestsPerSecond).toBeGreaterThan(0);
    });

    it('should calculate success and error rates', async () => {
      const result = await service.runPerformanceTest({
        category: 'FINANCE_LOGISTICS',
        type: 'LOAD',
        concurrentUsers: 10,
        durationSeconds: 5,
        rampUpSeconds: 1,
        operations: [],
      });

      expect(result.successRate).toBeGreaterThan(0);
      expect(result.successRate).toBeLessThanOrEqual(1);
      expect(result.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate + result.errorRate).toBeCloseTo(1, 5);
    });

    it('should emit event on test completion', async () => {
      await service.runPerformanceTest({
        category: 'ANAF_COMPLIANCE',
        type: 'LATENCY',
        concurrentUsers: 5,
        durationSeconds: 3,
        rampUpSeconds: 1,
        operations: [],
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'performance.test.completed',
        expect.objectContaining({ category: 'ANAF_COMPLIANCE' }),
      );
    });

    it('should include metrics with thresholds', async () => {
      const result = await service.runPerformanceTest({
        category: 'HR_FINANCE',
        type: 'LATENCY',
        concurrentUsers: 10,
        durationSeconds: 5,
        rampUpSeconds: 1,
        operations: [],
      });

      const p95Metric = result.metrics.find(m => m.name === 'Response Time P95');
      expect(p95Metric).toBeDefined();
      expect(p95Metric?.threshold).toBeDefined();
      expect(typeof p95Metric?.passed).toBe('boolean');
    });

    it('should handle different test categories', async () => {
      const categories: TestCategory[] = [
        'HR_FINANCE',
        'FINANCE_LOGISTICS',
        'LMS_GAMIFICATION',
        'ECOMMERCE_INVENTORY',
        'ANAF_COMPLIANCE',
        'FULL_STACK',
      ];

      for (const category of categories) {
        const result = await service.runPerformanceTest({
          category,
          type: 'LATENCY',
          concurrentUsers: 5,
          durationSeconds: 2,
          rampUpSeconds: 1,
          operations: [],
        });

        expect(result.category).toBe(category);
        expect(result.status).toBe('COMPLETED');
      }
    });

    it('should track errors in results', async () => {
      const result = await service.runPerformanceTest({
        category: 'ANAF_COMPLIANCE', // Higher error rate category
        type: 'STRESS',
        concurrentUsers: 50, // High load to increase errors
        durationSeconds: 5,
        rampUpSeconds: 1,
        operations: [],
      });

      // May or may not have errors depending on simulation
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Test Suites', () => {
    it('should create a test suite', async () => {
      const suite = await service.createTestSuite(
        'Integration Performance Suite',
        'Test all cross-module integrations',
        ['HR_FINANCE', 'FINANCE_LOGISTICS'],
      );

      expect(suite.id).toBeDefined();
      expect(suite.name).toBe('Integration Performance Suite');
      expect(suite.categories.length).toBe(2);
      expect(suite.status).toBe('PENDING');
    });

    it('should run a test suite', async () => {
      const suite = await service.createTestSuite(
        'Quick Suite',
        'Quick performance check',
        ['LMS_GAMIFICATION'],
      );

      const result = await service.runTestSuite(suite.id);

      expect(result.status).toBe('COMPLETED');
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(typeof result.overallPassed).toBe('boolean');
    });

    it('should generate suite summary', async () => {
      const suite = await service.createTestSuite(
        'Summary Suite',
        'Test summary generation',
        ['HR_FINANCE'],
      );

      const result = await service.runTestSuite(suite.id);

      expect(result.summary).toBeDefined();
      expect(result.summary?.totalTests).toBeGreaterThan(0);
      expect(result.summary?.avgLatency).toBeGreaterThanOrEqual(0);
      expect(result.summary?.avgThroughput).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.summary?.bottlenecks)).toBe(true);
      expect(Array.isArray(result.summary?.recommendations)).toBe(true);
    });

    it('should track started and completed times', async () => {
      const suite = await service.createTestSuite(
        'Timing Suite',
        'Test timing',
        ['LMS_GAMIFICATION'],
      );

      const result = await service.runTestSuite(suite.id);

      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.completedAt!.getTime()).toBeGreaterThan(result.startedAt!.getTime());
    });

    it('should emit event on suite completion', async () => {
      const suite = await service.createTestSuite(
        'Event Suite',
        'Test events',
        ['HR_FINANCE'],
      );

      await service.runTestSuite(suite.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'performance.suite.completed',
        expect.objectContaining({ suiteId: suite.id }),
      );
    });

    it('should throw error for non-existent suite', async () => {
      await expect(service.runTestSuite('non-existent')).rejects.toThrow();
    });
  });

  describe('Benchmarks', () => {
    it('should have initialized benchmarks', () => {
      const benchmarks = service.getBenchmarks();

      expect(benchmarks.length).toBeGreaterThan(0);
      expect(benchmarks[0].name).toBeDefined();
      expect(benchmarks[0].targetValue).toBeGreaterThan(0);
    });

    it('should get benchmarks by category', () => {
      const hrBenchmarks = service.getBenchmarks('HR_FINANCE');
      const lmsBenchmarks = service.getBenchmarks('LMS_GAMIFICATION');

      expect(hrBenchmarks.every(b => b.category === 'HR_FINANCE')).toBe(true);
      expect(lmsBenchmarks.every(b => b.category === 'LMS_GAMIFICATION')).toBe(true);
    });

    it('should run a benchmark', async () => {
      const benchmarks = service.getBenchmarks('LMS_GAMIFICATION');
      const benchmark = benchmarks[0];

      const result = await service.runBenchmark(benchmark.id);

      expect(result.actualValue).toBeDefined();
      expect(result.variance).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should run all benchmarks', async () => {
      const results = await service.runAllBenchmarks();

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(b => b.actualValue !== undefined)).toBe(true);
    });

    it('should emit event on benchmark completion', async () => {
      const benchmarks = service.getBenchmarks();
      await service.runBenchmark(benchmarks[0].id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'performance.benchmark.completed',
        expect.objectContaining({ benchmarkId: benchmarks[0].id }),
      );
    });
  });

  describe('Integration Endpoints', () => {
    it('should get integration endpoints for HR_FINANCE', () => {
      const endpoints = service.getIntegrationEndpoints('HR_FINANCE');

      expect(endpoints.length).toBeGreaterThan(0);
      expect(endpoints[0].name).toBeDefined();
      expect(endpoints[0].path).toBeDefined();
      expect(endpoints[0].avgLatencyMs).toBeGreaterThan(0);
    });

    it('should get integration endpoints for LMS_GAMIFICATION', () => {
      const endpoints = service.getIntegrationEndpoints('LMS_GAMIFICATION');

      expect(endpoints.length).toBeGreaterThan(0);
      expect(endpoints.some(e => e.name.includes('Points'))).toBe(true);
    });

    it('should get integration endpoints for ANAF_COMPLIANCE', () => {
      const endpoints = service.getIntegrationEndpoints('ANAF_COMPLIANCE');

      expect(endpoints.length).toBeGreaterThan(0);
      expect(endpoints.some(e => e.name.includes('e-Factura'))).toBe(true);
      expect(endpoints.some(e => e.name.includes('SAF-T'))).toBe(true);
    });

    it('should include all endpoint metrics', () => {
      const endpoints = service.getIntegrationEndpoints('ECOMMERCE_INVENTORY');

      for (const endpoint of endpoints) {
        expect(endpoint.avgLatencyMs).toBeGreaterThan(0);
        expect(endpoint.maxLatencyMs).toBeGreaterThan(endpoint.avgLatencyMs);
        expect(endpoint.throughput).toBeGreaterThan(0);
        expect(endpoint.errorRate).toBeGreaterThanOrEqual(0);
        expect(endpoint.errorRate).toBeLessThan(1);
      }
    });
  });

  describe('Performance Report', () => {
    it('should generate empty report when no tests run', () => {
      const report = service.generatePerformanceReport();

      expect(report.summary.totalTests).toBe(0);
      expect(report.categoryResults.length).toBe(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate report after running tests', async () => {
      await service.runPerformanceTest({
        category: 'HR_FINANCE',
        type: 'LATENCY',
        concurrentUsers: 10,
        durationSeconds: 3,
        rampUpSeconds: 1,
        operations: [],
      });

      await service.runPerformanceTest({
        category: 'LMS_GAMIFICATION',
        type: 'LATENCY',
        concurrentUsers: 10,
        durationSeconds: 3,
        rampUpSeconds: 1,
        operations: [],
      });

      const report = service.generatePerformanceReport();

      expect(report.summary.totalTests).toBe(2);
      expect(report.categoryResults.length).toBe(2);
      expect(report.summary.avgLatency).toBeGreaterThan(0);
    });

    it('should categorize overall health', async () => {
      await service.runPerformanceTest({
        category: 'LMS_GAMIFICATION', // Low latency category
        type: 'LATENCY',
        concurrentUsers: 5,
        durationSeconds: 3,
        rampUpSeconds: 1,
        operations: [],
      });

      const report = service.generatePerformanceReport();

      expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).toContain(report.summary.overallHealth);
    });

    it('should include category breakdown', async () => {
      await service.runPerformanceTest({
        category: 'HR_FINANCE',
        type: 'LATENCY',
        concurrentUsers: 10,
        durationSeconds: 3,
        rampUpSeconds: 1,
        operations: [],
      });

      const report = service.generatePerformanceReport();
      const hrResult = report.categoryResults.find(r => r.category === 'HR_FINANCE');

      expect(hrResult).toBeDefined();
      expect(hrResult?.passed).toBeGreaterThanOrEqual(0);
      expect(hrResult?.avgLatency).toBeGreaterThan(0);
    });
  });

  describe('Test Result Retrieval', () => {
    it('should retrieve test result by ID', async () => {
      const result = await service.runPerformanceTest({
        category: 'HR_FINANCE',
        type: 'LATENCY',
        concurrentUsers: 10,
        durationSeconds: 3,
        rampUpSeconds: 1,
        operations: [],
      });

      const retrieved = service.getTestResult(result.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(result.id);
    });

    it('should retrieve test suite by ID', async () => {
      const suite = await service.createTestSuite(
        'Retrieval Test',
        'Test retrieval',
        ['HR_FINANCE'],
      );

      const retrieved = service.getTestSuite(suite.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(suite.id);
    });

    it('should get all test results', async () => {
      await service.runPerformanceTest({
        category: 'HR_FINANCE',
        type: 'LATENCY',
        concurrentUsers: 5,
        durationSeconds: 2,
        rampUpSeconds: 1,
        operations: [],
      });

      await service.runPerformanceTest({
        category: 'LMS_GAMIFICATION',
        type: 'THROUGHPUT',
        concurrentUsers: 5,
        durationSeconds: 2,
        rampUpSeconds: 1,
        operations: [],
      });

      const allResults = service.getAllTestResults();
      expect(allResults.length).toBe(2);
    });

    it('should filter test results by category', async () => {
      await service.runPerformanceTest({
        category: 'HR_FINANCE',
        type: 'LATENCY',
        concurrentUsers: 5,
        durationSeconds: 2,
        rampUpSeconds: 1,
        operations: [],
      });

      await service.runPerformanceTest({
        category: 'LMS_GAMIFICATION',
        type: 'LATENCY',
        concurrentUsers: 5,
        durationSeconds: 2,
        rampUpSeconds: 1,
        operations: [],
      });

      const hrResults = service.getAllTestResults('HR_FINANCE');
      const lmsResults = service.getAllTestResults('LMS_GAMIFICATION');

      expect(hrResults.every(r => r.category === 'HR_FINANCE')).toBe(true);
      expect(lmsResults.every(r => r.category === 'LMS_GAMIFICATION')).toBe(true);
    });
  });
});
