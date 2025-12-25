import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  HealthCheckService,
  HealthCheckResult,
  HealthStatus,
  ComponentType,
} from './health-check.service';

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.stopAllChecks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default health checks', () => {
      const checks = service.getAllChecks();
      expect(checks.length).toBeGreaterThan(0);
    });

    it('should have database check', () => {
      const checks = service.getAllChecks();
      const dbCheck = checks.find((c) => c.type === 'DATABASE');
      expect(dbCheck).toBeDefined();
    });

    it('should have cache check', () => {
      const checks = service.getAllChecks();
      const cacheCheck = checks.find((c) => c.type === 'CACHE');
      expect(cacheCheck).toBeDefined();
    });

    it('should have ANAF API check', () => {
      const checks = service.getAllChecks();
      const anafCheck = checks.find((c) => c.type === 'ANAF_API');
      expect(anafCheck).toBeDefined();
    });

    it('should have SAGA API check', () => {
      const checks = service.getAllChecks();
      const sagaCheck = checks.find((c) => c.type === 'SAGA_API');
      expect(sagaCheck).toBeDefined();
    });
  });

  describe('Running Health Checks', () => {
    it('should run single check', async () => {
      const result = await service.runCheck('PostgreSQL Database');

      expect(result.name).toBe('PostgreSQL Database');
      expect(result.status).toBe('HEALTHY');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should return check details', async () => {
      const result = await service.runCheck('Redis Cache');

      expect(result.details).toBeDefined();
      expect(result.details?.hitRate).toBeDefined();
    });

    it('should run all checks', async () => {
      const results = await service.runAllChecks();

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.status === 'HEALTHY')).toBe(true);
    });

    it('should emit health.checked event', async () => {
      await service.runCheck('PostgreSQL Database');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'health.checked',
        expect.objectContaining({ name: 'PostgreSQL Database' }),
      );
    });

    it('should throw error for non-existent check', async () => {
      await expect(service.runCheck('Non-Existent')).rejects.toThrow('Health check not found');
    });

    it('should include Romanian name', async () => {
      const result = await service.runCheck('PostgreSQL Database');

      expect(result.nameRo).toBe('Baza de Date PostgreSQL');
    });
  });

  describe('Overall Health Status', () => {
    it('should return system health', async () => {
      const health = await service.getHealth();

      expect(health.status).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.components.length).toBeGreaterThan(0);
    });

    it('should include version', async () => {
      const health = await service.getHealth();

      expect(health.version).toBe('1.0.0');
    });

    it('should include environment', async () => {
      const health = await service.getHealth();

      expect(health.environment).toBeDefined();
    });

    it('should include metrics', async () => {
      const health = await service.getHealth();

      expect(health.metrics).toBeDefined();
      expect(health.metrics.cpu).toBeDefined();
      expect(health.metrics.memory).toBeDefined();
    });

    it('should be HEALTHY when all checks pass', async () => {
      const health = await service.getHealth();

      expect(health.status).toBe('HEALTHY');
    });

    it('should detect DEGRADED status for non-critical failures', async () => {
      // Register a failing non-critical check
      service.registerCheck({
        name: 'Non-Critical Service',
        nameRo: 'Serviciu Non-Critic',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: false, message: 'Service down' }),
      });

      const health = await service.getHealth();

      expect(health.status).toBe('DEGRADED');
    });

    it('should detect UNHEALTHY status for critical failures', async () => {
      // Register a failing critical check
      service.registerCheck({
        name: 'Critical Service',
        nameRo: 'Serviciu Critic',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: true,
        checkFn: async () => ({ healthy: false, message: 'Critical failure' }),
      });

      const health = await service.getHealth();

      expect(health.status).toBe('UNHEALTHY');
    });
  });

  describe('Liveness and Readiness', () => {
    it('should return liveness status', async () => {
      const liveness = await service.getLiveness();

      expect(liveness.alive).toBe(true);
    });

    it('should return readiness when healthy', async () => {
      // Run checks first
      await service.runAllChecks();

      const readiness = await service.getReadiness();

      expect(readiness.ready).toBe(true);
    });

    it('should return not ready when critical component fails', async () => {
      // Disable default critical checks first
      service.disableCheck('PostgreSQL Database');
      service.disableCheck('Redis Cache');

      // Register and run a failing critical check
      service.registerCheck({
        name: 'Critical DB',
        nameRo: 'DB Critic',
        type: 'DATABASE',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: true,
        checkFn: async () => ({ healthy: false }),
      });

      await service.runCheck('Critical DB');

      const readiness = await service.getReadiness();

      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toContain('Critical DB');
    });
  });

  describe('Component Health', () => {
    it('should get component health', async () => {
      await service.runCheck('PostgreSQL Database');

      const health = service.getComponentHealth('PostgreSQL Database');

      expect(health).toBeDefined();
      expect(health?.status).toBe('HEALTHY');
    });

    it('should return undefined for unchecked component', () => {
      const health = service.getComponentHealth('Unknown Component');

      expect(health).toBeUndefined();
    });

    it('should get components by type', async () => {
      await service.runAllChecks();

      const cacheComponents = service.getComponentsByType('CACHE');

      expect(cacheComponents.length).toBeGreaterThan(0);
      expect(cacheComponents.every((c) => c.type === 'CACHE')).toBe(true);
    });
  });

  describe('Metrics', () => {
    it('should get system metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics.cpu).toBeDefined();
      expect(metrics.memory).toBeDefined();
      expect(metrics.disk).toBeDefined();
      expect(metrics.network).toBeDefined();
      expect(metrics.requests).toBeDefined();
    });

    it('should include CPU metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.cores).toBeGreaterThan(0);
    });

    it('should include memory metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics.memory.used).toBeGreaterThan(0);
      expect(metrics.memory.total).toBeGreaterThan(0);
      expect(metrics.memory.usagePercent).toBeGreaterThanOrEqual(0);
    });

    it('should include disk metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics.disk.used).toBeGreaterThan(0);
      expect(metrics.disk.total).toBeGreaterThan(0);
    });

    it('should record request metrics', () => {
      service.recordRequest(true, 50);
      service.recordRequest(true, 100);
      service.recordRequest(false, 500);

      const metrics = service.getMetrics();

      expect(metrics.requests.total).toBe(3);
      expect(metrics.requests.successful).toBe(2);
      expect(metrics.requests.failed).toBe(1);
    });

    it('should calculate average response time', () => {
      service.recordRequest(true, 100);
      service.recordRequest(true, 200);

      const metrics = service.getMetrics();

      expect(metrics.requests.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Alerts', () => {
    it('should create alert on status change to UNHEALTHY', async () => {
      // First run a healthy check
      await service.runCheck('PostgreSQL Database');

      // Register failing check
      service.registerCheck({
        name: 'Failing Service',
        nameRo: 'Serviciu Eșuat',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: true,
        checkFn: async () => ({ healthy: false, message: 'Service error' }),
      });

      // Run healthy first, then fail
      service.registerCheck({
        name: 'Toggle Service',
        nameRo: 'Serviciu Comutabil',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: true }),
      });

      await service.runCheck('Toggle Service');

      // Now make it fail
      service.registerCheck({
        name: 'Toggle Service',
        nameRo: 'Serviciu Comutabil',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: false }),
      });

      await service.runCheck('Toggle Service');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'health.alert',
        expect.objectContaining({ component: 'Toggle Service' }),
      );
    });

    it('should get active alerts', async () => {
      // Create an alert by toggling status
      service.registerCheck({
        name: 'Alert Test',
        nameRo: 'Test Alertă',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: true }),
      });

      await service.runCheck('Alert Test');

      service.registerCheck({
        name: 'Alert Test',
        nameRo: 'Test Alertă',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: false }),
      });

      await service.runCheck('Alert Test');

      const alerts = service.getAlerts();

      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should acknowledge alert', async () => {
      service.registerCheck({
        name: 'Ack Test',
        nameRo: 'Test Confirmare',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: true }),
      });

      await service.runCheck('Ack Test');

      service.registerCheck({
        name: 'Ack Test',
        nameRo: 'Test Confirmare',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: false }),
      });

      await service.runCheck('Ack Test');

      const alerts = service.getAlerts();
      const alert = alerts[0];

      const acknowledged = service.acknowledgeAlert(alert.id);

      expect(acknowledged.acknowledgedAt).toBeDefined();
    });

    it('should emit alert acknowledged event', async () => {
      service.registerCheck({
        name: 'Ack Event',
        nameRo: 'Eveniment Confirmare',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: true }),
      });

      await service.runCheck('Ack Event');

      service.registerCheck({
        name: 'Ack Event',
        nameRo: 'Eveniment Confirmare',
        type: 'CUSTOM',
        enabled: true,
        interval: 60000,
        timeout: 1000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: false }),
      });

      await service.runCheck('Ack Event');

      const alerts = service.getAlerts();
      service.acknowledgeAlert(alerts[0].id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'health.alert.acknowledged',
        expect.objectContaining({ alertId: alerts[0].id }),
      );
    });

    it('should throw error when acknowledging non-existent alert', () => {
      expect(() => service.acknowledgeAlert('non-existent')).toThrow('Alert not found');
    });

    it('should clear resolved alerts', async () => {
      const cleared = service.clearResolvedAlerts();

      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe('History', () => {
    it('should record health history', async () => {
      await service.getHealth();
      await service.getHealth();

      const history = service.getHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter history by date', async () => {
      await service.getHealth();

      const futureDate = new Date(Date.now() + 86400000);
      const history = service.getHistory(futureDate);

      expect(history.length).toBe(0);
    });

    it('should limit history results', async () => {
      await service.getHealth();
      await service.getHealth();
      await service.getHealth();

      const history = service.getHistory(undefined, 2);

      expect(history.length).toBeLessThanOrEqual(2);
    });

    it('should calculate uptime stats', async () => {
      await service.getHealth();
      await service.getHealth();

      const stats = service.getUptimeStats();

      expect(stats.totalChecks).toBeGreaterThan(0);
      expect(stats.uptimePercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Check Configuration', () => {
    it('should register custom check', () => {
      service.registerCheck({
        name: 'Custom Check',
        nameRo: 'Verificare Personalizată',
        type: 'CUSTOM',
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 2,
        critical: false,
        checkFn: async () => ({ healthy: true }),
      });

      const checks = service.getAllChecks();
      const customCheck = checks.find((c) => c.name === 'Custom Check');

      expect(customCheck).toBeDefined();
    });

    it('should unregister check', () => {
      service.registerCheck({
        name: 'Temp Check',
        nameRo: 'Verificare Temporară',
        type: 'CUSTOM',
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: true }),
      });

      service.unregisterCheck('Temp Check');

      const checks = service.getAllChecks();
      const tempCheck = checks.find((c) => c.name === 'Temp Check');

      expect(tempCheck).toBeUndefined();
    });

    it('should enable check', () => {
      service.registerCheck({
        name: 'Enable Test',
        nameRo: 'Test Activare',
        type: 'CUSTOM',
        enabled: false,
        interval: 30000,
        timeout: 5000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: true }),
      });

      service.enableCheck('Enable Test');

      const checks = service.getAllChecks();
      const check = checks.find((c) => c.name === 'Enable Test');

      expect(check?.enabled).toBe(true);
    });

    it('should emit check enabled event', () => {
      service.registerCheck({
        name: 'Enable Event',
        nameRo: 'Eveniment Activare',
        type: 'CUSTOM',
        enabled: false,
        interval: 30000,
        timeout: 5000,
        retries: 1,
        critical: false,
        checkFn: async () => ({ healthy: true }),
      });

      service.enableCheck('Enable Event');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'health.check.enabled',
        expect.objectContaining({ name: 'Enable Event' }),
      );
    });

    it('should disable check', () => {
      service.disableCheck('PostgreSQL Database');

      const checks = service.getAllChecks();
      const dbCheck = checks.find((c) => c.name === 'PostgreSQL Database');

      expect(dbCheck?.enabled).toBe(false);
    });

    it('should emit check disabled event', () => {
      service.disableCheck('Redis Cache');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'health.check.disabled',
        expect.objectContaining({ name: 'Redis Cache' }),
      );
    });

    it('should update check interval', () => {
      service.updateCheckInterval('PostgreSQL Database', 60000);

      const checks = service.getAllChecks();
      const dbCheck = checks.find((c) => c.name === 'PostgreSQL Database');

      expect(dbCheck?.interval).toBe(60000);
    });

    it('should emit check updated event', () => {
      service.updateCheckInterval('PostgreSQL Database', 45000);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'health.check.updated',
        expect.objectContaining({ name: 'PostgreSQL Database', interval: 45000 }),
      );
    });

    it('should throw error when enabling non-existent check', () => {
      expect(() => service.enableCheck('Non-Existent')).toThrow('Check not found');
    });

    it('should throw error when disabling non-existent check', () => {
      expect(() => service.disableCheck('Non-Existent')).toThrow('Check not found');
    });
  });

  describe('Romanian Language Support', () => {
    it('should have Romanian check names', () => {
      const checks = service.getAllChecks();

      expect(checks.every((c) => c.nameRo)).toBe(true);
    });

    it('should have Romanian ANAF check name', () => {
      const checks = service.getAllChecks();
      const anafCheck = checks.find((c) => c.type === 'ANAF_API');

      expect(anafCheck?.nameRo).toBe('API ANAF');
    });

    it('should return Romanian names in results', async () => {
      const result = await service.runCheck('SAGA API');

      expect(result.nameRo).toBe('API SAGA');
    });
  });
});
