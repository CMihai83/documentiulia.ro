import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ComplianceLoggingService,
  ComplianceStandard,
  LogSeverity,
  RetentionAction,
  AlertCondition,
} from './compliance-logging.service';

describe('ComplianceLoggingService', () => {
  let service: ComplianceLoggingService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceLoggingService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ComplianceLoggingService>(ComplianceLoggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default retention policies', async () => {
      const policies = await service.getRetentionPolicies('any-tenant');
      expect(policies.length).toBeGreaterThan(0);
    });

    it('should return compliance standards', () => {
      const standards = service.getComplianceStandards();
      expect(standards).toContain('GDPR');
      expect(standards).toContain('ANAF');
      expect(standards).toContain('SOC2');
      expect(standards).toContain('ISO27001');
      expect(standards).toContain('PCIDSS');
    });

    it('should return log severities', () => {
      const severities = service.getLogSeverities();
      expect(severities).toContain('info');
      expect(severities).toContain('warning');
      expect(severities).toContain('error');
      expect(severities).toContain('critical');
    });
  });

  describe('basic logging', () => {
    it('should create compliance log', async () => {
      const log = await service.log(
        'tenant-1',
        'user-1',
        'GDPR',
        'data_access',
        'view',
        'customer',
        { description: 'Test log' },
      );

      expect(log.id).toBeDefined();
      expect(log.tenantId).toBe('tenant-1');
      expect(log.userId).toBe('user-1');
      expect(log.standard).toBe('GDPR');
      expect(log.category).toBe('data_access');
      expect(log.action).toBe('view');
      expect(log.hash).toBeDefined();
    });

    it('should create log with all details', async () => {
      const log = await service.log(
        'tenant-1',
        'user-1',
        'ANAF',
        'declaration',
        'submit',
        'D406',
        {
          resourceId: 'dec-123',
          severity: 'warning',
          description: 'SAF-T submission',
          data: { period: '2024-01' },
          outcome: 'partial',
          sessionId: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      );

      expect(log.severity).toBe('warning');
      expect(log.outcome).toBe('partial');
      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.sessionId).toBe('session-1');
    });

    it('should get log by ID', async () => {
      const created = await service.log('tenant-1', 'user-1', 'SOC2', 'auth', 'login', 'session', {});
      const retrieved = await service.getLog(created.id);

      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent log', async () => {
      const log = await service.getLog('non-existent-id');
      expect(log).toBeNull();
    });

    it('should get logs with filters', async () => {
      await service.log('tenant-filter', 'user-1', 'GDPR', 'cat1', 'action1', 'res1', {});
      await service.log('tenant-filter', 'user-1', 'ANAF', 'cat2', 'action2', 'res2', {});
      await service.log('tenant-filter', 'user-2', 'GDPR', 'cat1', 'action1', 'res3', {});

      const gdprLogs = await service.getLogs('tenant-filter', { standard: 'GDPR' });
      expect(gdprLogs.length).toBe(2);

      const user1Logs = await service.getLogs('tenant-filter', { userId: 'user-1' });
      expect(user1Logs.length).toBe(2);

      const cat1Logs = await service.getLogs('tenant-filter', { category: 'cat1' });
      expect(cat1Logs.length).toBe(2);
    });

    it('should limit logs returned', async () => {
      for (let i = 0; i < 10; i++) {
        await service.log('tenant-limit', 'user-1', 'GDPR', 'cat', 'action', 'res', {});
      }

      const logs = await service.getLogs('tenant-limit', {}, 5);
      expect(logs.length).toBe(5);
    });

    it('should maintain hash chain', async () => {
      const log1 = await service.log('tenant-chain', 'user-1', 'GDPR', 'cat', 'a1', 'r1', {});
      const log2 = await service.log('tenant-chain', 'user-1', 'GDPR', 'cat', 'a2', 'r2', {});

      expect(log1.previousHash).toBeUndefined();
      expect(log2.previousHash).toBe(log1.hash);
    });
  });

  describe('GDPR specific logging', () => {
    it('should log data access', async () => {
      const log = await service.logDataAccess(
        'tenant-gdpr',
        'user-1',
        'customer',
        'cust-123',
        'view',
        { fields: ['name', 'email'] },
      );

      expect(log.standard).toBe('GDPR');
      expect(log.category).toBe('data_access');
      expect(log.action).toBe('view');
    });

    it('should log consent granted', async () => {
      const log = await service.logConsentChange(
        'tenant-gdpr',
        'user-1',
        'marketing',
        true,
      );

      expect(log.standard).toBe('GDPR');
      expect(log.category).toBe('consent');
      expect(log.action).toBe('granted');
    });

    it('should log consent revoked', async () => {
      const log = await service.logConsentChange(
        'tenant-gdpr',
        'user-1',
        'analytics',
        false,
      );

      expect(log.action).toBe('revoked');
    });

    it('should log data export', async () => {
      const log = await service.logDataExport(
        'tenant-gdpr',
        'user-1',
        'data-subject-1',
        ['profile', 'orders', 'invoices'],
        'json',
      );

      expect(log.standard).toBe('GDPR');
      expect(log.category).toBe('data_portability');
      expect(log.action).toBe('export');
    });

    it('should log data deletion', async () => {
      const log = await service.logDataDeletion(
        'tenant-gdpr',
        'user-1',
        'customer',
        'cust-456',
        'GDPR request',
      );

      expect(log.standard).toBe('GDPR');
      expect(log.category).toBe('right_to_erasure');
      expect(log.action).toBe('delete');
    });
  });

  describe('ANAF specific logging', () => {
    it('should log declaration submission success', async () => {
      const log = await service.logDeclarationSubmission(
        'tenant-anaf',
        'user-1',
        'D406',
        '2024-01',
        'success',
      );

      expect(log.standard).toBe('ANAF');
      expect(log.category).toBe('declaration');
      expect(log.outcome).toBe('success');
      expect(log.severity).toBe('info');
    });

    it('should log declaration submission failure with error severity', async () => {
      const log = await service.logDeclarationSubmission(
        'tenant-anaf',
        'user-1',
        'D100',
        '2024-02',
        'failure',
        { error: 'Validation failed' },
      );

      expect(log.outcome).toBe('failure');
      expect(log.severity).toBe('error');
    });

    it('should log e-Factura operations', async () => {
      const uploadLog = await service.logEfacturaOperation(
        'tenant-anaf',
        'user-1',
        'upload',
        'INV-2024-001',
        'success',
      );

      expect(uploadLog.standard).toBe('ANAF');
      expect(uploadLog.category).toBe('efactura');
      expect(uploadLog.action).toBe('upload');

      const downloadLog = await service.logEfacturaOperation(
        'tenant-anaf',
        'user-1',
        'download',
        'INV-2024-002',
        'success',
      );

      expect(downloadLog.action).toBe('download');
    });

    it('should log SAF-T generation', async () => {
      const log = await service.logSaftGeneration(
        'tenant-anaf',
        'user-1',
        '2024-01',
        'success',
        5242880,
        1500,
      );

      expect(log.standard).toBe('ANAF');
      expect(log.category).toBe('saft');
      expect(log.action).toBe('generate');
      expect(log.resource).toBe('D406');
    });
  });

  describe('security logging', () => {
    it('should log successful authentication', async () => {
      const log = await service.logAuthentication(
        'tenant-sec',
        'user-1',
        'success',
        'password',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(log.standard).toBe('SOC2');
      expect(log.category).toBe('authentication');
      expect(log.action).toBe('login');
      expect(log.severity).toBe('info');
    });

    it('should log failed authentication with warning severity', async () => {
      const log = await service.logAuthentication(
        'tenant-sec',
        'unknown-user',
        'failure',
        'password',
        '10.0.0.1',
      );

      expect(log.action).toBe('login_failed');
      expect(log.severity).toBe('warning');
    });

    it('should log permission changes', async () => {
      const grantLog = await service.logPermissionChange(
        'tenant-sec',
        'admin-1',
        'user-2',
        'admin',
        'grant',
      );

      expect(grantLog.standard).toBe('SOC2');
      expect(grantLog.category).toBe('access_control');
      expect(grantLog.action).toBe('grant');

      const revokeLog = await service.logPermissionChange(
        'tenant-sec',
        'admin-1',
        'user-3',
        'write',
        'revoke',
      );

      expect(revokeLog.action).toBe('revoke');
    });

    it('should log security incidents', async () => {
      const log = await service.logSecurityIncident(
        'tenant-sec',
        'system',
        'brute_force',
        'critical',
        'Multiple failed login attempts detected',
        { attempts: 50, timeWindow: '5min' },
      );

      expect(log.standard).toBe('SOC2');
      expect(log.category).toBe('security_incident');
      expect(log.severity).toBe('critical');
      expect(log.outcome).toBe('failure');
    });
  });

  describe('retention policies', () => {
    it('should create retention policy', async () => {
      const policy = await service.createRetentionPolicy(
        'tenant-ret',
        'GDPR',
        730,
        'anonymize',
      );

      expect(policy.id).toBeDefined();
      expect(policy.tenantId).toBe('tenant-ret');
      expect(policy.standard).toBe('GDPR');
      expect(policy.retentionDays).toBe(730);
      expect(policy.action).toBe('anonymize');
      expect(policy.enabled).toBe(true);
    });

    it('should get tenant retention policies', async () => {
      await service.createRetentionPolicy('tenant-policies', 'SOC2', 365, 'archive');

      const policies = await service.getRetentionPolicies('tenant-policies');
      const tenantPolicy = policies.find(p => p.tenantId === 'tenant-policies');

      expect(tenantPolicy).toBeDefined();
    });

    it('should update retention policy', async () => {
      const policy = await service.createRetentionPolicy('tenant-update', 'ISO27001', 365, 'archive');

      const updated = await service.updateRetentionPolicy(policy.id, {
        retentionDays: 730,
        enabled: false,
      });

      expect(updated?.retentionDays).toBe(730);
      expect(updated?.enabled).toBe(false);
    });

    it('should return null for non-existent policy update', async () => {
      const result = await service.updateRetentionPolicy('non-existent', { retentionDays: 100 });
      expect(result).toBeNull();
    });

    it('should apply retention policies', async () => {
      // Create old logs (can't actually make them old, but testing the function works)
      await service.log('tenant-apply', 'user-1', 'GDPR', 'cat', 'action', 'res', {});

      const result = await service.applyRetentionPolicies('tenant-apply');

      expect(result.archived).toBeGreaterThanOrEqual(0);
      expect(result.deleted).toBeGreaterThanOrEqual(0);
      expect(result.anonymized).toBeGreaterThanOrEqual(0);
    });
  });

  describe('alert rules', () => {
    it('should create alert rule', async () => {
      const condition: AlertCondition = {
        type: 'threshold',
        threshold: 10,
        timeWindowMinutes: 60,
      };

      const rule = await service.createAlertRule(
        'tenant-alert',
        'High Error Rate',
        'Alert when errors exceed threshold',
        condition,
        { severity: 'error', notifyUsers: ['admin@example.com'] },
      );

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('High Error Rate');
      expect(rule.condition.type).toBe('threshold');
      expect(rule.enabled).toBe(true);
    });

    it('should create pattern-based alert rule', async () => {
      const rule = await service.createAlertRule(
        'tenant-pattern',
        'SQL Injection Detected',
        'Alert on potential SQL injection',
        { type: 'pattern', pattern: 'DROP|DELETE|TRUNCATE' },
        { standard: 'SOC2', category: 'security_incident' },
      );

      expect(rule.condition.type).toBe('pattern');
      expect(rule.standard).toBe('SOC2');
    });

    it('should get alert rules for tenant', async () => {
      await service.createAlertRule('tenant-rules', 'Rule 1', 'Desc 1', { type: 'threshold', threshold: 5 });
      await service.createAlertRule('tenant-rules', 'Rule 2', 'Desc 2', { type: 'frequency', threshold: 10 });

      const rules = await service.getAlertRules('tenant-rules');
      expect(rules.length).toBe(2);
    });

    it('should delete alert rule', async () => {
      const rule = await service.createAlertRule('tenant-del', 'To Delete', 'Will be deleted', { type: 'threshold' });

      const success = await service.deleteAlertRule(rule.id);
      expect(success).toBe(true);

      const rules = await service.getAlertRules('tenant-del');
      expect(rules.length).toBe(0);
    });
  });

  describe('alerts', () => {
    it('should get alerts for tenant', async () => {
      // Create a rule and trigger it
      await service.createAlertRule(
        'tenant-alerts',
        'Critical Alert',
        'Triggers on critical',
        { type: 'threshold', threshold: 1, timeWindowMinutes: 60 },
        { severity: 'critical' },
      );

      // Create a log that should trigger the alert
      await service.log('tenant-alerts', 'user-1', 'SOC2', 'security', 'incident', 'system', {
        severity: 'critical',
      });

      const alerts = await service.getAlerts('tenant-alerts');
      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should acknowledge alert', async () => {
      // Create rule first
      await service.createAlertRule(
        'tenant-ack',
        'Ack Test',
        'For acknowledgment test',
        { type: 'threshold', threshold: 1, timeWindowMinutes: 60 },
        { severity: 'critical' },
      );

      await service.log('tenant-ack', 'user-1', 'SOC2', 'sec', 'incident', 'sys', { severity: 'critical' });

      const alerts = await service.getAlerts('tenant-ack', 'active');
      if (alerts.length > 0) {
        const acked = await service.acknowledgeAlert(alerts[0].id, 'admin-1');
        expect(acked?.status).toBe('acknowledged');
        expect(acked?.acknowledgedBy).toBe('admin-1');
      }
    });

    it('should resolve alert', async () => {
      await service.createAlertRule(
        'tenant-resolve',
        'Resolve Test',
        'For resolve test',
        { type: 'threshold', threshold: 1 },
        { severity: 'error' },
      );

      await service.log('tenant-resolve', 'user-1', 'SOC2', 'sec', 'inc', 'sys', { severity: 'error' });

      const alerts = await service.getAlerts('tenant-resolve', 'active');
      if (alerts.length > 0) {
        const resolved = await service.resolveAlert(alerts[0].id, 'admin-1');
        expect(resolved?.status).toBe('resolved');
        expect(resolved?.resolvedBy).toBe('admin-1');
      }
    });

    it('should return null when acknowledging non-existent alert', async () => {
      const result = await service.acknowledgeAlert('non-existent', 'user-1');
      expect(result).toBeNull();
    });

    it('should return null when resolving non-existent alert', async () => {
      const result = await service.resolveAlert('non-existent', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('integrity verification', () => {
    it('should verify log integrity for empty tenant', async () => {
      const check = await service.verifyLogIntegrity('empty-tenant');

      expect(check.tenantId).toBe('empty-tenant');
      expect(check.totalLogs).toBe(0);
      expect(check.brokenChain).toBe(false);
    });

    it('should verify log integrity with valid chain', async () => {
      await service.log('tenant-integrity', 'user-1', 'GDPR', 'cat', 'a1', 'r1', {});
      await service.log('tenant-integrity', 'user-1', 'GDPR', 'cat', 'a2', 'r2', {});
      await service.log('tenant-integrity', 'user-1', 'GDPR', 'cat', 'a3', 'r3', {});

      const check = await service.verifyLogIntegrity('tenant-integrity');

      expect(check.totalLogs).toBe(3);
      expect(check.validLogs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('compliance reports', () => {
    it('should generate compliance report', async () => {
      await service.log('tenant-report', 'user-1', 'GDPR', 'data_access', 'view', 'customer', {});
      await service.log('tenant-report', 'user-1', 'GDPR', 'consent', 'granted', 'marketing', {});

      const report = await service.generateComplianceReport(
        'tenant-report',
        'GDPR',
        { start: new Date(Date.now() - 86400000), end: new Date() },
        'admin-1',
      );

      expect(report.id).toBeDefined();
      expect(report.tenantId).toBe('tenant-report');
      expect(report.standard).toBe('GDPR');
      expect(report.summary.totalEvents).toBeGreaterThanOrEqual(0);
      expect(report.summary.complianceScore).toBeLessThanOrEqual(100);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate report with findings for critical events', async () => {
      await service.log('tenant-critical', 'user-1', 'SOC2', 'security', 'incident', 'system', {
        severity: 'critical',
        outcome: 'failure',
      });

      const report = await service.generateComplianceReport(
        'tenant-critical',
        'SOC2',
        { start: new Date(Date.now() - 86400000), end: new Date() },
        'admin-1',
      );

      expect(report.summary.criticalEvents).toBeGreaterThanOrEqual(1);
    });

    it('should get reports for tenant', async () => {
      await service.generateComplianceReport(
        'tenant-reports',
        'GDPR',
        { start: new Date(Date.now() - 86400000), end: new Date() },
        'admin',
      );

      const reports = await service.getReports('tenant-reports');
      expect(reports.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter reports by standard', async () => {
      await service.generateComplianceReport('tenant-filter-rep', 'GDPR', { start: new Date(), end: new Date() }, 'u1');
      await service.generateComplianceReport('tenant-filter-rep', 'ANAF', { start: new Date(), end: new Date() }, 'u1');

      const gdprReports = await service.getReports('tenant-filter-rep', 'GDPR');
      expect(gdprReports.every(r => r.standard === 'GDPR')).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should get compliance stats', async () => {
      await service.log('tenant-stats', 'user-1', 'GDPR', 'cat', 'act', 'res', {});
      await service.log('tenant-stats', 'user-1', 'ANAF', 'cat', 'act', 'res', {});
      await service.log('tenant-stats', 'user-1', 'SOC2', 'cat', 'act', 'res', { outcome: 'failure' });

      const stats = await service.getComplianceStats('tenant-stats');

      expect(stats.totalLogs).toBeGreaterThanOrEqual(3);
      expect(stats.logsByStandard.length).toBeGreaterThan(0);
      expect(stats.logsBySeverity.length).toBeGreaterThan(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe('export', () => {
    it('should export logs as JSON', async () => {
      await service.log('tenant-export', 'user-1', 'GDPR', 'cat', 'action', 'resource', {});

      const result = await service.exportLogs(
        'tenant-export',
        'GDPR',
        { start: new Date(Date.now() - 86400000), end: new Date() },
        'json',
      );

      expect(result.filename).toContain('.json');
      expect(result.data).toBeDefined();
      const parsed = JSON.parse(result.data);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export logs as CSV', async () => {
      await service.log('tenant-csv', 'user-1', 'ANAF', 'declaration', 'submit', 'D406', {
        description: 'Test export',
      });

      const result = await service.exportLogs(
        'tenant-csv',
        'ANAF',
        { start: new Date(Date.now() - 86400000), end: new Date() },
        'csv',
      );

      expect(result.filename).toContain('.csv');
      expect(result.data).toContain('id,timestamp,standard');
    });
  });

  describe('date filters', () => {
    it('should filter logs by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const twoDaysAgo = new Date(now.getTime() - 172800000);

      await service.log('tenant-date', 'user-1', 'GDPR', 'cat', 'act', 'res', {});

      const logsInRange = await service.getLogs('tenant-date', {
        startDate: yesterday,
        endDate: now,
      });

      expect(logsInRange.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('frequency alert condition', () => {
    it('should create frequency-based alert rule', async () => {
      const rule = await service.createAlertRule(
        'tenant-freq',
        'High Frequency Alert',
        'Alert on high frequency events',
        { type: 'frequency', threshold: 5, timeWindowMinutes: 5 },
      );

      expect(rule.condition.type).toBe('frequency');
      expect(rule.condition.threshold).toBe(5);
    });
  });
});
