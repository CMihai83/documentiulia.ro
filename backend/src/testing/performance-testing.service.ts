import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Sprint 22: Performance Testing for Cross-Module Integrations
// Benchmarks, load testing, and performance metrics for integrated modules

// ===== TYPES =====

export type TestCategory = 'HR_FINANCE' | 'FINANCE_LOGISTICS' | 'LMS_GAMIFICATION' | 'ECOMMERCE_INVENTORY' | 'ANAF_COMPLIANCE' | 'FULL_STACK';
export type TestType = 'LATENCY' | 'THROUGHPUT' | 'LOAD' | 'STRESS' | 'SPIKE' | 'ENDURANCE';
export type TestStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  passed: boolean;
}

export interface TestResult {
  id: string;
  testName: string;
  category: TestCategory;
  type: TestType;
  status: TestStatus;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  durationMs: number;

  // Metrics
  metrics: PerformanceMetric[];

  // Load details
  concurrentUsers?: number;
  totalRequests?: number;
  requestsPerSecond?: number;

  // Results
  successRate: number;
  errorRate: number;
  errors: { code: string; message: string; count: number }[];

  // Latency stats
  latencyP50?: number;
  latencyP95?: number;
  latencyP99?: number;
  latencyMax?: number;
  latencyMin?: number;
  latencyAvg?: number;

  // Pass/fail
  passed: boolean;
  failureReasons: string[];
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  categories: TestCategory[];

  // Configuration
  config: {
    warmupRequests: number;
    testDurationSeconds: number;
    cooldownSeconds: number;
    concurrentUsers: number;
    rampUpSeconds: number;
  };

  // Status
  status: TestStatus;
  startedAt?: Date;
  completedAt?: Date;

  // Results
  results: TestResult[];
  overallPassed: boolean;
  summary?: TestSuiteSummary;
}

export interface TestSuiteSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  avgLatency: number;
  avgThroughput: number;
  totalDuration: number;
  bottlenecks: string[];
  recommendations: string[];
}

export interface Benchmark {
  id: string;
  name: string;
  category: TestCategory;
  metric: string;
  targetValue: number;
  unit: string;
  actualValue?: number;
  variance?: number;
  passed?: boolean;
}

export interface LoadTestConfig {
  category: TestCategory;
  type: TestType;
  concurrentUsers: number;
  durationSeconds: number;
  rampUpSeconds: number;
  operations: string[];
}

export interface IntegrationEndpoint {
  name: string;
  module: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  avgLatencyMs: number;
  maxLatencyMs: number;
  throughput: number;
  errorRate: number;
}

// ===== CONSTANTS =====

const PERFORMANCE_THRESHOLDS = {
  apiLatencyP95: 200, // ms
  apiLatencyP99: 500, // ms
  throughputMin: 100, // requests/sec
  errorRateMax: 0.01, // 1%
  memoryUsageMax: 80, // %
  cpuUsageMax: 70, // %
};

const DEFAULT_TEST_CONFIG = {
  warmupRequests: 50,
  testDurationSeconds: 30,
  cooldownSeconds: 5,
  concurrentUsers: 10,
  rampUpSeconds: 5,
};

@Injectable()
export class PerformanceTestingService {
  private readonly logger = new Logger(PerformanceTestingService.name);

  // Storage
  private readonly testResults: Map<string, TestResult> = new Map();
  private readonly testSuites: Map<string, TestSuite> = new Map();
  private readonly benchmarks: Map<string, Benchmark> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeBenchmarks();
  }

  // ===== TEST EXECUTION =====

  async runPerformanceTest(config: LoadTestConfig): Promise<TestResult> {
    const testId = this.generateId('test');
    const startTime = Date.now();

    this.logger.log(`Starting performance test: ${config.category} - ${config.type}`);

    const result: TestResult = {
      id: testId,
      testName: `${config.category}_${config.type}`,
      category: config.category,
      type: config.type,
      status: 'RUNNING',
      startedAt: new Date(),
      durationMs: 0,
      metrics: [],
      concurrentUsers: config.concurrentUsers,
      totalRequests: 0,
      requestsPerSecond: 0,
      successRate: 0,
      errorRate: 0,
      errors: [],
      passed: false,
      failureReasons: [],
    };

    this.testResults.set(testId, result);

    try {
      // Simulate performance test based on category
      const metrics = await this.simulateLoadTest(config);

      // Update result with metrics
      result.metrics = metrics.metrics;
      result.latencyP50 = metrics.latencyP50;
      result.latencyP95 = metrics.latencyP95;
      result.latencyP99 = metrics.latencyP99;
      result.latencyAvg = metrics.latencyAvg;
      result.latencyMax = metrics.latencyMax;
      result.latencyMin = metrics.latencyMin;
      result.totalRequests = metrics.totalRequests;
      result.requestsPerSecond = metrics.rps;
      result.successRate = metrics.successRate;
      result.errorRate = metrics.errorRate;
      result.errors = metrics.errors;

      // Check thresholds
      result.passed = this.evaluateThresholds(result);
      result.status = 'COMPLETED';

    } catch (error) {
      result.status = 'FAILED';
      result.failureReasons.push((error as Error).message);
    }

    result.completedAt = new Date();
    result.durationMs = Date.now() - startTime;

    this.eventEmitter.emit('performance.test.completed', {
      testId: result.id,
      category: result.category,
      passed: result.passed,
    });

    this.logger.log(`Performance test completed: ${result.passed ? 'PASSED' : 'FAILED'}`);
    return result;
  }

  private async simulateLoadTest(config: LoadTestConfig): Promise<{
    metrics: PerformanceMetric[];
    latencyP50: number;
    latencyP95: number;
    latencyP99: number;
    latencyAvg: number;
    latencyMax: number;
    latencyMin: number;
    totalRequests: number;
    rps: number;
    successRate: number;
    errorRate: number;
    errors: { code: string; message: string; count: number }[];
  }> {
    // Simulate realistic performance metrics based on category
    const baseMetrics = this.getCategoryBaseMetrics(config.category);

    // Apply load factor
    const loadFactor = config.concurrentUsers / 10;
    const degradation = Math.min(1.5, 1 + (loadFactor - 1) * 0.1);

    // Calculate latencies with variance
    const latencyBase = baseMetrics.baseLatency * degradation;
    const latencies = this.generateLatencyDistribution(latencyBase, config.concurrentUsers * config.durationSeconds * 10);

    latencies.sort((a, b) => a - b);

    const totalRequests = latencies.length;
    const successCount = Math.floor(totalRequests * (1 - baseMetrics.baseErrorRate * degradation));
    const errorCount = totalRequests - successCount;

    const metrics: PerformanceMetric[] = [
      {
        name: 'Response Time P95',
        value: latencies[Math.floor(latencies.length * 0.95)],
        unit: 'ms',
        threshold: PERFORMANCE_THRESHOLDS.apiLatencyP95,
        passed: latencies[Math.floor(latencies.length * 0.95)] <= PERFORMANCE_THRESHOLDS.apiLatencyP95,
      },
      {
        name: 'Response Time P99',
        value: latencies[Math.floor(latencies.length * 0.99)],
        unit: 'ms',
        threshold: PERFORMANCE_THRESHOLDS.apiLatencyP99,
        passed: latencies[Math.floor(latencies.length * 0.99)] <= PERFORMANCE_THRESHOLDS.apiLatencyP99,
      },
      {
        name: 'Throughput',
        value: totalRequests / config.durationSeconds,
        unit: 'req/s',
        threshold: PERFORMANCE_THRESHOLDS.throughputMin,
        passed: totalRequests / config.durationSeconds >= PERFORMANCE_THRESHOLDS.throughputMin,
      },
      {
        name: 'Error Rate',
        value: errorCount / totalRequests,
        unit: '%',
        threshold: PERFORMANCE_THRESHOLDS.errorRateMax,
        passed: errorCount / totalRequests <= PERFORMANCE_THRESHOLDS.errorRateMax,
      },
      {
        name: 'Memory Usage',
        value: baseMetrics.memoryUsage * degradation,
        unit: '%',
        threshold: PERFORMANCE_THRESHOLDS.memoryUsageMax,
        passed: baseMetrics.memoryUsage * degradation <= PERFORMANCE_THRESHOLDS.memoryUsageMax,
      },
      {
        name: 'CPU Usage',
        value: baseMetrics.cpuUsage * degradation,
        unit: '%',
        threshold: PERFORMANCE_THRESHOLDS.cpuUsageMax,
        passed: baseMetrics.cpuUsage * degradation <= PERFORMANCE_THRESHOLDS.cpuUsageMax,
      },
    ];

    return {
      metrics,
      latencyP50: latencies[Math.floor(latencies.length * 0.5)],
      latencyP95: latencies[Math.floor(latencies.length * 0.95)],
      latencyP99: latencies[Math.floor(latencies.length * 0.99)],
      latencyAvg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      latencyMax: latencies[latencies.length - 1],
      latencyMin: latencies[0],
      totalRequests,
      rps: totalRequests / config.durationSeconds,
      successRate: successCount / totalRequests,
      errorRate: errorCount / totalRequests,
      errors: errorCount > 0 ? [
        { code: '500', message: 'Internal Server Error', count: Math.floor(errorCount * 0.6) },
        { code: '503', message: 'Service Unavailable', count: Math.floor(errorCount * 0.3) },
        { code: '408', message: 'Request Timeout', count: Math.floor(errorCount * 0.1) },
      ] : [],
    };
  }

  private getCategoryBaseMetrics(category: TestCategory): {
    baseLatency: number;
    baseErrorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  } {
    const metrics: Record<TestCategory, { baseLatency: number; baseErrorRate: number; memoryUsage: number; cpuUsage: number }> = {
      HR_FINANCE: { baseLatency: 85, baseErrorRate: 0.002, memoryUsage: 45, cpuUsage: 35 },
      FINANCE_LOGISTICS: { baseLatency: 120, baseErrorRate: 0.003, memoryUsage: 55, cpuUsage: 45 },
      LMS_GAMIFICATION: { baseLatency: 60, baseErrorRate: 0.001, memoryUsage: 40, cpuUsage: 30 },
      ECOMMERCE_INVENTORY: { baseLatency: 95, baseErrorRate: 0.004, memoryUsage: 50, cpuUsage: 40 },
      ANAF_COMPLIANCE: { baseLatency: 180, baseErrorRate: 0.005, memoryUsage: 60, cpuUsage: 50 },
      FULL_STACK: { baseLatency: 150, baseErrorRate: 0.003, memoryUsage: 65, cpuUsage: 55 },
    };
    return metrics[category];
  }

  private generateLatencyDistribution(baseLatency: number, count: number): number[] {
    const latencies: number[] = [];
    for (let i = 0; i < count; i++) {
      // Generate realistic latency distribution (log-normal)
      const variance = baseLatency * 0.3;
      const random = Math.random() + Math.random() + Math.random() - 1.5;
      let latency = baseLatency + random * variance;

      // Add occasional spikes
      if (Math.random() < 0.02) {
        latency *= 2 + Math.random() * 3;
      }

      latencies.push(Math.max(10, Math.round(latency)));
    }
    return latencies;
  }

  private evaluateThresholds(result: TestResult): boolean {
    const failures: string[] = [];

    if (result.latencyP95 && result.latencyP95 > PERFORMANCE_THRESHOLDS.apiLatencyP95) {
      failures.push(`P95 latency ${result.latencyP95}ms exceeds threshold ${PERFORMANCE_THRESHOLDS.apiLatencyP95}ms`);
    }

    if (result.latencyP99 && result.latencyP99 > PERFORMANCE_THRESHOLDS.apiLatencyP99) {
      failures.push(`P99 latency ${result.latencyP99}ms exceeds threshold ${PERFORMANCE_THRESHOLDS.apiLatencyP99}ms`);
    }

    if (result.errorRate > PERFORMANCE_THRESHOLDS.errorRateMax) {
      failures.push(`Error rate ${(result.errorRate * 100).toFixed(2)}% exceeds threshold ${PERFORMANCE_THRESHOLDS.errorRateMax * 100}%`);
    }

    if (result.requestsPerSecond && result.requestsPerSecond < PERFORMANCE_THRESHOLDS.throughputMin) {
      failures.push(`Throughput ${result.requestsPerSecond.toFixed(1)} req/s below threshold ${PERFORMANCE_THRESHOLDS.throughputMin}`);
    }

    result.failureReasons = failures;
    return failures.length === 0;
  }

  // ===== TEST SUITES =====

  async createTestSuite(name: string, description: string, categories: TestCategory[]): Promise<TestSuite> {
    const suite: TestSuite = {
      id: this.generateId('suite'),
      name,
      description,
      categories,
      config: { ...DEFAULT_TEST_CONFIG },
      status: 'PENDING',
      results: [],
      overallPassed: false,
    };

    this.testSuites.set(suite.id, suite);
    return suite;
  }

  async runTestSuite(suiteId: string): Promise<TestSuite> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    suite.status = 'RUNNING';
    suite.startedAt = new Date();
    suite.results = [];

    this.logger.log(`Starting test suite: ${suite.name}`);

    try {
      for (const category of suite.categories) {
        // Run latency test
        const latencyResult = await this.runPerformanceTest({
          category,
          type: 'LATENCY',
          concurrentUsers: suite.config.concurrentUsers,
          durationSeconds: suite.config.testDurationSeconds,
          rampUpSeconds: suite.config.rampUpSeconds,
          operations: [],
        });
        suite.results.push(latencyResult);

        // Run throughput test
        const throughputResult = await this.runPerformanceTest({
          category,
          type: 'THROUGHPUT',
          concurrentUsers: suite.config.concurrentUsers * 2,
          durationSeconds: suite.config.testDurationSeconds,
          rampUpSeconds: suite.config.rampUpSeconds,
          operations: [],
        });
        suite.results.push(throughputResult);
      }

      suite.status = 'COMPLETED';
      suite.overallPassed = suite.results.every(r => r.passed);
      suite.summary = this.generateSuiteSummary(suite);

    } catch (error) {
      suite.status = 'FAILED';
      suite.overallPassed = false;
    }

    suite.completedAt = new Date();

    this.eventEmitter.emit('performance.suite.completed', {
      suiteId: suite.id,
      passed: suite.overallPassed,
    });

    return suite;
  }

  private generateSuiteSummary(suite: TestSuite): TestSuiteSummary {
    const passedTests = suite.results.filter(r => r.passed).length;
    const avgLatency = suite.results.reduce((sum, r) => sum + (r.latencyAvg || 0), 0) / suite.results.length;
    const avgThroughput = suite.results.reduce((sum, r) => sum + (r.requestsPerSecond || 0), 0) / suite.results.length;

    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    // Identify bottlenecks
    for (const result of suite.results) {
      if (result.latencyP99 && result.latencyP99 > PERFORMANCE_THRESHOLDS.apiLatencyP99) {
        bottlenecks.push(`${result.category}: High P99 latency (${result.latencyP99}ms)`);
      }
      if (result.errorRate > 0.005) {
        bottlenecks.push(`${result.category}: Elevated error rate (${(result.errorRate * 100).toFixed(2)}%)`);
      }
    }

    // Generate recommendations
    if (bottlenecks.length > 0) {
      recommendations.push('Consider adding caching for frequently accessed data');
      recommendations.push('Review database query optimization');
      recommendations.push('Consider horizontal scaling for high-load categories');
    }

    if (avgLatency > 100) {
      recommendations.push('Implement response compression');
      recommendations.push('Add read replicas for database-heavy operations');
    }

    return {
      totalTests: suite.results.length,
      passedTests,
      failedTests: suite.results.length - passedTests,
      avgLatency: Math.round(avgLatency),
      avgThroughput: Math.round(avgThroughput),
      totalDuration: suite.results.reduce((sum, r) => sum + r.durationMs, 0),
      bottlenecks,
      recommendations,
    };
  }

  // ===== BENCHMARKS =====

  private initializeBenchmarks(): void {
    const benchmarks: Omit<Benchmark, 'id' | 'actualValue' | 'variance' | 'passed'>[] = [
      { name: 'HR-Finance Payroll Sync', category: 'HR_FINANCE', metric: 'latency_p95', targetValue: 150, unit: 'ms' },
      { name: 'HR-Finance Employee Onboarding', category: 'HR_FINANCE', metric: 'latency_p95', targetValue: 200, unit: 'ms' },
      { name: 'Finance-Logistics Invoice Processing', category: 'FINANCE_LOGISTICS', metric: 'latency_p95', targetValue: 180, unit: 'ms' },
      { name: 'Finance-Logistics Cost Allocation', category: 'FINANCE_LOGISTICS', metric: 'latency_p95', targetValue: 250, unit: 'ms' },
      { name: 'LMS Points Award', category: 'LMS_GAMIFICATION', metric: 'latency_p95', targetValue: 50, unit: 'ms' },
      { name: 'LMS Badge Evaluation', category: 'LMS_GAMIFICATION', metric: 'latency_p95', targetValue: 80, unit: 'ms' },
      { name: 'LMS Leaderboard Update', category: 'LMS_GAMIFICATION', metric: 'latency_p95', targetValue: 100, unit: 'ms' },
      { name: 'E-Commerce Order Processing', category: 'ECOMMERCE_INVENTORY', metric: 'latency_p95', targetValue: 200, unit: 'ms' },
      { name: 'Inventory Stock Update', category: 'ECOMMERCE_INVENTORY', metric: 'latency_p95', targetValue: 80, unit: 'ms' },
      { name: 'ANAF e-Factura Submission', category: 'ANAF_COMPLIANCE', metric: 'latency_p95', targetValue: 500, unit: 'ms' },
      { name: 'ANAF SAF-T Generation', category: 'ANAF_COMPLIANCE', metric: 'latency_p95', targetValue: 1000, unit: 'ms' },
    ];

    for (const benchmark of benchmarks) {
      const id = this.generateId('bench');
      this.benchmarks.set(id, { ...benchmark, id });
    }
  }

  async runBenchmark(benchmarkId: string): Promise<Benchmark> {
    const benchmark = this.benchmarks.get(benchmarkId);
    if (!benchmark) {
      throw new Error(`Benchmark ${benchmarkId} not found`);
    }

    // Simulate benchmark execution
    const baseMetrics = this.getCategoryBaseMetrics(benchmark.category);
    const actualValue = baseMetrics.baseLatency * (0.8 + Math.random() * 0.4);

    benchmark.actualValue = Math.round(actualValue);
    benchmark.variance = Math.round(((actualValue - benchmark.targetValue) / benchmark.targetValue) * 100);
    benchmark.passed = actualValue <= benchmark.targetValue;

    this.eventEmitter.emit('performance.benchmark.completed', {
      benchmarkId: benchmark.id,
      passed: benchmark.passed,
    });

    return benchmark;
  }

  async runAllBenchmarks(): Promise<Benchmark[]> {
    const results: Benchmark[] = [];
    for (const [id] of this.benchmarks) {
      const result = await this.runBenchmark(id);
      results.push(result);
    }
    return results;
  }

  getBenchmarks(category?: TestCategory): Benchmark[] {
    const benchmarks = Array.from(this.benchmarks.values());
    return category ? benchmarks.filter(b => b.category === category) : benchmarks;
  }

  // ===== INTEGRATION ENDPOINTS =====

  getIntegrationEndpoints(category: TestCategory): IntegrationEndpoint[] {
    const endpoints: Record<TestCategory, IntegrationEndpoint[]> = {
      HR_FINANCE: [
        { name: 'Sync Payroll', module: 'HR', method: 'POST', path: '/api/hr/payroll/sync', avgLatencyMs: 120, maxLatencyMs: 350, throughput: 50, errorRate: 0.002 },
        { name: 'Update Benefits', module: 'HR', method: 'PUT', path: '/api/hr/benefits', avgLatencyMs: 85, maxLatencyMs: 200, throughput: 100, errorRate: 0.001 },
        { name: 'Get Finance Summary', module: 'Finance', method: 'GET', path: '/api/finance/summary', avgLatencyMs: 60, maxLatencyMs: 150, throughput: 200, errorRate: 0.001 },
      ],
      FINANCE_LOGISTICS: [
        { name: 'Process Invoice', module: 'Finance', method: 'POST', path: '/api/finance/invoices', avgLatencyMs: 150, maxLatencyMs: 400, throughput: 80, errorRate: 0.003 },
        { name: 'Calculate Shipping Cost', module: 'Logistics', method: 'POST', path: '/api/logistics/shipping/cost', avgLatencyMs: 100, maxLatencyMs: 250, throughput: 120, errorRate: 0.002 },
        { name: 'Allocate Costs', module: 'Finance', method: 'POST', path: '/api/finance/cost-allocation', avgLatencyMs: 180, maxLatencyMs: 500, throughput: 40, errorRate: 0.004 },
      ],
      LMS_GAMIFICATION: [
        { name: 'Award Points', module: 'LMS', method: 'POST', path: '/api/lms/points/award', avgLatencyMs: 30, maxLatencyMs: 80, throughput: 500, errorRate: 0.001 },
        { name: 'Check Badge Eligibility', module: 'LMS', method: 'GET', path: '/api/lms/badges/check', avgLatencyMs: 25, maxLatencyMs: 60, throughput: 600, errorRate: 0.001 },
        { name: 'Update Leaderboard', module: 'LMS', method: 'PUT', path: '/api/lms/leaderboard', avgLatencyMs: 50, maxLatencyMs: 120, throughput: 300, errorRate: 0.001 },
        { name: 'Get User Progress', module: 'LMS', method: 'GET', path: '/api/lms/progress', avgLatencyMs: 40, maxLatencyMs: 100, throughput: 400, errorRate: 0.001 },
      ],
      ECOMMERCE_INVENTORY: [
        { name: 'Create Order', module: 'E-Commerce', method: 'POST', path: '/api/ecommerce/orders', avgLatencyMs: 180, maxLatencyMs: 450, throughput: 60, errorRate: 0.004 },
        { name: 'Reserve Stock', module: 'Inventory', method: 'POST', path: '/api/inventory/reserve', avgLatencyMs: 50, maxLatencyMs: 120, throughput: 200, errorRate: 0.002 },
        { name: 'Update Stock', module: 'Inventory', method: 'PUT', path: '/api/inventory/stock', avgLatencyMs: 40, maxLatencyMs: 100, throughput: 250, errorRate: 0.001 },
      ],
      ANAF_COMPLIANCE: [
        { name: 'Submit e-Factura', module: 'ANAF', method: 'POST', path: '/api/anaf/efactura', avgLatencyMs: 350, maxLatencyMs: 1000, throughput: 20, errorRate: 0.005 },
        { name: 'Generate SAF-T', module: 'ANAF', method: 'POST', path: '/api/anaf/saft', avgLatencyMs: 800, maxLatencyMs: 2500, throughput: 5, errorRate: 0.003 },
        { name: 'Validate XML', module: 'ANAF', method: 'POST', path: '/api/anaf/validate', avgLatencyMs: 200, maxLatencyMs: 500, throughput: 50, errorRate: 0.002 },
      ],
      FULL_STACK: [
        { name: 'Health Check', module: 'System', method: 'GET', path: '/api/health', avgLatencyMs: 10, maxLatencyMs: 50, throughput: 1000, errorRate: 0.001 },
        { name: 'Authentication', module: 'Auth', method: 'POST', path: '/api/auth/login', avgLatencyMs: 100, maxLatencyMs: 250, throughput: 150, errorRate: 0.002 },
      ],
    };

    return endpoints[category] || [];
  }

  // ===== REPORTING =====

  getTestResult(testId: string): TestResult | undefined {
    return this.testResults.get(testId);
  }

  getTestSuite(suiteId: string): TestSuite | undefined {
    return this.testSuites.get(suiteId);
  }

  getAllTestResults(category?: TestCategory): TestResult[] {
    const results = Array.from(this.testResults.values());
    return category ? results.filter(r => r.category === category) : results;
  }

  generatePerformanceReport(): {
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      avgLatency: number;
      overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    };
    categoryResults: { category: TestCategory; passed: number; failed: number; avgLatency: number }[];
    recommendations: string[];
  } {
    const results = Array.from(this.testResults.values());

    if (results.length === 0) {
      return {
        summary: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          avgLatency: 0,
          overallHealth: 'GOOD',
        },
        categoryResults: [],
        recommendations: ['Run performance tests to generate a report'],
      };
    }

    const passedTests = results.filter(r => r.passed).length;
    const avgLatency = results.reduce((sum, r) => sum + (r.latencyAvg || 0), 0) / results.length;

    // Calculate by category
    const categoryMap = new Map<TestCategory, { passed: number; failed: number; latencies: number[] }>();
    for (const result of results) {
      const existing = categoryMap.get(result.category) || { passed: 0, failed: 0, latencies: [] };
      if (result.passed) existing.passed++;
      else existing.failed++;
      if (result.latencyAvg) existing.latencies.push(result.latencyAvg);
      categoryMap.set(result.category, existing);
    }

    const categoryResults = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      passed: data.passed,
      failed: data.failed,
      avgLatency: Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length || 0),
    }));

    // Determine health
    const passRate = passedTests / results.length;
    let overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (passRate >= 0.95 && avgLatency < 100) overallHealth = 'EXCELLENT';
    else if (passRate >= 0.85 && avgLatency < 150) overallHealth = 'GOOD';
    else if (passRate >= 0.70) overallHealth = 'FAIR';
    else overallHealth = 'POOR';

    // Generate recommendations
    const recommendations: string[] = [];
    if (avgLatency > 150) {
      recommendations.push('Consider implementing response caching');
      recommendations.push('Review database query performance');
    }
    if (passRate < 0.9) {
      recommendations.push('Investigate failed test categories');
      recommendations.push('Review error handling and retry logic');
    }
    for (const [category, data] of categoryMap) {
      if (data.failed > data.passed) {
        recommendations.push(`Focus on improving ${category} integration performance`);
      }
    }

    return {
      summary: {
        totalTests: results.length,
        passedTests,
        failedTests: results.length - passedTests,
        avgLatency: Math.round(avgLatency),
        overallHealth,
      },
      categoryResults,
      recommendations,
    };
  }

  // ===== HELPERS =====

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
