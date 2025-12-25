import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AuditTrailService,
  AuditAction,
  AuditCategory,
  ComplianceFramework,
  SeverityLevel,
} from './audit-trail.service';

describe('AuditTrailService', () => {
  let service: AuditTrailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditTrailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<AuditTrailService>(AuditTrailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== AUDIT LOGGING TESTS ===================

  describe('Audit Logging', () => {
    it('should log an action', async () => {
      const entry = await service.logAction('tenant-1', 'create', 'data', 'invoice', {
        userId: 'user-1',
        userName: 'John Doe',
        resourceId: 'inv-123',
        resourceName: 'Invoice #123',
      });

      expect(entry).toBeDefined();
      expect(entry.id).toMatch(/^aud-/);
      expect(entry.tenantId).toBe('tenant-1');
      expect(entry.action).toBe('create');
      expect(entry.category).toBe('data');
      expect(entry.resourceType).toBe('invoice');
      expect(entry.userId).toBe('user-1');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should log action with old and new values', async () => {
      const entry = await service.logAction('tenant-1', 'update', 'data', 'customer', {
        userId: 'user-1',
        resourceId: 'cust-123',
        oldValue: { name: 'Old Name', email: 'old@email.com' },
        newValue: { name: 'New Name', email: 'old@email.com' },
      });

      expect(entry.changes).toBeDefined();
      expect(entry.changes!.length).toBe(1);
      expect(entry.changes![0].field).toBe('name');
      expect(entry.changes![0].oldValue).toBe('Old Name');
      expect(entry.changes![0].newValue).toBe('New Name');
    });

    it('should redact sensitive fields', async () => {
      const entry = await service.logAction('tenant-1', 'update', 'authentication', 'user', {
        userId: 'user-1',
        oldValue: { password: 'oldpass123', salary: 5000 },
        newValue: { password: 'newpass456', salary: 6000 },
      });

      expect(entry.changes).toBeDefined();
      const passwordChange = entry.changes!.find(c => c.field === 'password');
      const salaryChange = entry.changes!.find(c => c.field === 'salary');

      expect(passwordChange!.oldValue).toBe('[REDACTED]');
      expect(passwordChange!.newValue).toBe('[REDACTED]');
      expect(passwordChange!.sensitive).toBe(true);
      expect(salaryChange!.sensitive).toBe(true);
    });

    it('should determine severity based on action and category', async () => {
      const loginEntry = await service.logAction('tenant-1', 'login', 'authentication', 'session', {});
      const deleteEntry = await service.logAction('tenant-1', 'delete', 'data', 'invoice', {});
      const permissionEntry = await service.logAction('tenant-1', 'permission_change', 'authorization', 'role', {});
      const financialEntry = await service.logAction('tenant-1', 'create', 'financial', 'transaction', {});

      expect(loginEntry.severity).toBe('low');
      expect(deleteEntry.severity).toBe('high');
      expect(permissionEntry.severity).toBe('high');
      expect(financialEntry.severity).toBe('medium');
    });

    it('should log failed actions with error message', async () => {
      const entry = await service.logAction('tenant-1', 'create', 'data', 'invoice', {
        userId: 'user-1',
        success: false,
        errorMessage: 'Validation failed: missing required field',
      });

      expect(entry.success).toBe(false);
      expect(entry.errorMessage).toBe('Validation failed: missing required field');
    });

    it('should include compliance flags', async () => {
      const entry = await service.logAction('tenant-1', 'export', 'compliance', 'customer_data', {
        userId: 'user-1',
        complianceFlags: ['GDPR', 'SOC2'],
      });

      expect(entry.complianceFlags).toContain('GDPR');
      expect(entry.complianceFlags).toContain('SOC2');
    });

    it('should include IP address and user agent', async () => {
      const entry = await service.logAction('tenant-1', 'login', 'authentication', 'session', {
        userId: 'user-1',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Chrome/120.0',
        sessionId: 'sess-abc123',
      });

      expect(entry.ipAddress).toBe('192.168.1.100');
      expect(entry.userAgent).toBe('Mozilla/5.0 Chrome/120.0');
      expect(entry.sessionId).toBe('sess-abc123');
    });

    it('should get audit entry by ID', async () => {
      const created = await service.logAction('tenant-1', 'create', 'data', 'invoice', {
        userId: 'user-1',
      });

      const retrieved = await service.getAuditEntry(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should return null for non-existent entry', async () => {
      const result = await service.getAuditEntry('non-existent-id');
      expect(result).toBeNull();
    });
  });

  // =================== QUERY AUDIT LOG TESTS ===================

  describe('Query Audit Log', () => {
    beforeEach(async () => {
      // Create various audit entries for testing
      await service.logAction('tenant-1', 'create', 'data', 'invoice', { userId: 'user-1' });
      await service.logAction('tenant-1', 'update', 'data', 'invoice', { userId: 'user-1' });
      await service.logAction('tenant-1', 'delete', 'data', 'invoice', { userId: 'user-2' });
      await service.logAction('tenant-2', 'create', 'data', 'order', { userId: 'user-3' });
      await service.logAction('tenant-1', 'login', 'authentication', 'session', { userId: 'user-1' });
    });

    it('should query by tenant ID', async () => {
      const entries = await service.queryAuditLog({ tenantId: 'tenant-1' });
      expect(entries.length).toBe(4);
      expect(entries.every(e => e.tenantId === 'tenant-1')).toBe(true);
    });

    it('should query by user ID', async () => {
      const entries = await service.queryAuditLog({ tenantId: 'tenant-1', userId: 'user-1' });
      expect(entries.length).toBe(3);
    });

    it('should query by action', async () => {
      const entries = await service.queryAuditLog({ tenantId: 'tenant-1', action: 'create' });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('create');
    });

    it('should query by category', async () => {
      const entries = await service.queryAuditLog({ tenantId: 'tenant-1', category: 'authentication' });
      expect(entries.length).toBe(1);
      expect(entries[0].category).toBe('authentication');
    });

    it('should query by resource type', async () => {
      const entries = await service.queryAuditLog({ tenantId: 'tenant-1', resourceType: 'invoice' });
      expect(entries.length).toBe(3);
    });

    it('should query by severity', async () => {
      const entries = await service.queryAuditLog({ tenantId: 'tenant-1', severity: 'high' });
      expect(entries.every(e => e.severity === 'high')).toBe(true);
    });

    it('should query by success status', async () => {
      await service.logAction('tenant-1', 'create', 'data', 'invoice', { success: false });
      const entries = await service.queryAuditLog({ tenantId: 'tenant-1', success: false });
      expect(entries.every(e => e.success === false)).toBe(true);
    });

    it('should query with date range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60000);
      const future = new Date(now.getTime() + 60000);

      const entries = await service.queryAuditLog({
        tenantId: 'tenant-1',
        fromDate: past,
        toDate: future,
      });

      expect(entries.length).toBeGreaterThan(0);
    });

    it('should limit results', async () => {
      const entries = await service.queryAuditLog({ tenantId: 'tenant-1', limit: 2 });
      expect(entries.length).toBe(2);
    });

    it('should sort by timestamp descending', async () => {
      const entries = await service.queryAuditLog({ tenantId: 'tenant-1' });
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(entries[i].timestamp.getTime());
      }
    });
  });

  // =================== DATA ACCESS LOGGING TESTS ===================

  describe('Data Access Logging', () => {
    it('should log data access', async () => {
      const log = await service.logDataAccess(
        'tenant-1',
        'user-1',
        'customer',
        ['cust-1', 'cust-2'],
        'view',
      );

      expect(log).toBeDefined();
      expect(log.id).toMatch(/^dal-/);
      expect(log.tenantId).toBe('tenant-1');
      expect(log.userId).toBe('user-1');
      expect(log.dataType).toBe('customer');
      expect(log.dataIds).toEqual(['cust-1', 'cust-2']);
      expect(log.accessType).toBe('view');
    });

    it('should log sensitive data access with high severity', async () => {
      const log = await service.logDataAccess(
        'tenant-1',
        'user-1',
        'personal_data',
        ['pd-1'],
        'export',
        {
          purpose: 'GDPR request',
          legalBasis: 'consent',
          sensitiveData: true,
        },
      );

      expect(log.sensitiveData).toBe(true);
      expect(log.purpose).toBe('GDPR request');
      expect(log.legalBasis).toBe('consent');
    });

    it('should get data access logs', async () => {
      await service.logDataAccess('tenant-1', 'user-1', 'customer', ['c1'], 'view');
      await service.logDataAccess('tenant-1', 'user-1', 'invoice', ['i1'], 'download');
      await service.logDataAccess('tenant-1', 'user-2', 'customer', ['c2'], 'export');

      const logs = await service.getDataAccessLogs('tenant-1');
      expect(logs.length).toBe(3);
    });

    it('should filter data access logs by user', async () => {
      await service.logDataAccess('tenant-1', 'user-1', 'customer', ['c1'], 'view');
      await service.logDataAccess('tenant-1', 'user-2', 'customer', ['c2'], 'view');

      const logs = await service.getDataAccessLogs('tenant-1', { userId: 'user-1' });
      expect(logs.length).toBe(1);
      expect(logs[0].userId).toBe('user-1');
    });

    it('should filter data access logs by data type', async () => {
      await service.logDataAccess('tenant-1', 'user-1', 'customer', ['c1'], 'view');
      await service.logDataAccess('tenant-1', 'user-1', 'invoice', ['i1'], 'view');

      const logs = await service.getDataAccessLogs('tenant-1', { dataType: 'customer' });
      expect(logs.length).toBe(1);
      expect(logs[0].dataType).toBe('customer');
    });

    it('should filter sensitive data access logs only', async () => {
      await service.logDataAccess('tenant-1', 'user-1', 'customer', ['c1'], 'view', { sensitiveData: false });
      await service.logDataAccess('tenant-1', 'user-1', 'medical', ['m1'], 'view', { sensitiveData: true });

      const logs = await service.getDataAccessLogs('tenant-1', { sensitiveOnly: true });
      expect(logs.length).toBe(1);
      expect(logs[0].sensitiveData).toBe(true);
    });

    it('should create audit entry for data access', async () => {
      await service.logDataAccess('tenant-1', 'user-1', 'customer', ['c1', 'c2'], 'export');

      const auditEntries = await service.queryAuditLog({
        tenantId: 'tenant-1',
        action: 'data_access',
      });

      expect(auditEntries.length).toBe(1);
      expect(auditEntries[0].metadata!.accessType).toBe('export');
    });
  });

  // =================== CONSENT MANAGEMENT TESTS ===================

  describe('Consent Management', () => {
    it('should record consent', async () => {
      const record = await service.recordConsent(
        'tenant-1',
        'cust-123',
        'customer',
        'marketing_emails',
        '1.0',
        'explicit',
      );

      expect(record).toBeDefined();
      expect(record.id).toMatch(/^cns-/);
      expect(record.tenantId).toBe('tenant-1');
      expect(record.subjectId).toBe('cust-123');
      expect(record.subjectType).toBe('customer');
      expect(record.consentType).toBe('marketing_emails');
      expect(record.version).toBe('1.0');
      expect(record.method).toBe('explicit');
      expect(record.givenAt).toBeInstanceOf(Date);
    });

    it('should record consent with proof', async () => {
      const record = await service.recordConsent(
        'tenant-1',
        'cust-123',
        'customer',
        'data_processing',
        '2.0',
        'explicit',
        {
          proof: 'checkbox_clicked_at_2024-01-15T10:30:00Z',
          metadata: { formId: 'signup-form', ipAddress: '192.168.1.1' },
        },
      );

      expect(record.proof).toBe('checkbox_clicked_at_2024-01-15T10:30:00Z');
      expect(record.metadata!.formId).toBe('signup-form');
    });

    it('should revoke consent', async () => {
      const created = await service.recordConsent(
        'tenant-1',
        'cust-123',
        'customer',
        'marketing_emails',
        '1.0',
        'explicit',
      );

      const revoked = await service.revokeConsent(created.id);
      expect(revoked).toBeDefined();
      expect(revoked!.revokedAt).toBeInstanceOf(Date);
    });

    it('should return null when revoking non-existent consent', async () => {
      const result = await service.revokeConsent('non-existent');
      expect(result).toBeNull();
    });

    it('should return null when revoking already revoked consent', async () => {
      const created = await service.recordConsent(
        'tenant-1',
        'cust-123',
        'customer',
        'marketing_emails',
        '1.0',
        'explicit',
      );

      await service.revokeConsent(created.id);
      const secondRevoke = await service.revokeConsent(created.id);
      expect(secondRevoke).toBeNull();
    });

    it('should get consent records', async () => {
      await service.recordConsent('tenant-1', 'cust-1', 'customer', 'marketing', '1.0', 'explicit');
      await service.recordConsent('tenant-1', 'cust-2', 'customer', 'analytics', '1.0', 'implied');
      await service.recordConsent('tenant-2', 'emp-1', 'employee', 'hr_data', '1.0', 'explicit');

      const records = await service.getConsentRecords('tenant-1');
      expect(records.length).toBe(2);
    });

    it('should filter consent records by subject', async () => {
      await service.recordConsent('tenant-1', 'cust-1', 'customer', 'marketing', '1.0', 'explicit');
      await service.recordConsent('tenant-1', 'cust-1', 'customer', 'analytics', '1.0', 'explicit');
      await service.recordConsent('tenant-1', 'cust-2', 'customer', 'marketing', '1.0', 'explicit');

      const records = await service.getConsentRecords('tenant-1', { subjectId: 'cust-1' });
      expect(records.length).toBe(2);
    });

    it('should filter consent records by type', async () => {
      await service.recordConsent('tenant-1', 'cust-1', 'customer', 'marketing', '1.0', 'explicit');
      await service.recordConsent('tenant-1', 'cust-2', 'customer', 'marketing', '1.0', 'explicit');
      await service.recordConsent('tenant-1', 'cust-3', 'customer', 'analytics', '1.0', 'explicit');

      const records = await service.getConsentRecords('tenant-1', { consentType: 'marketing' });
      expect(records.length).toBe(2);
    });

    it('should filter active consent records only', async () => {
      const active = await service.recordConsent('tenant-1', 'cust-1', 'customer', 'marketing', '1.0', 'explicit');
      const toRevoke = await service.recordConsent('tenant-1', 'cust-2', 'customer', 'marketing', '1.0', 'explicit');
      await service.revokeConsent(toRevoke.id);

      const records = await service.getConsentRecords('tenant-1', { activeOnly: true });
      expect(records.length).toBe(1);
      expect(records[0].id).toBe(active.id);
    });

    it('should check consent status - has consent', async () => {
      await service.recordConsent('tenant-1', 'cust-1', 'customer', 'marketing', '1.0', 'explicit');

      const result = await service.checkConsent('tenant-1', 'cust-1', 'marketing');
      expect(result.hasConsent).toBe(true);
      expect(result.record).toBeDefined();
    });

    it('should check consent status - no consent', async () => {
      const result = await service.checkConsent('tenant-1', 'cust-1', 'marketing');
      expect(result.hasConsent).toBe(false);
      expect(result.record).toBeUndefined();
    });

    it('should check consent status - revoked consent', async () => {
      const record = await service.recordConsent('tenant-1', 'cust-1', 'customer', 'marketing', '1.0', 'explicit');
      await service.revokeConsent(record.id);

      const result = await service.checkConsent('tenant-1', 'cust-1', 'marketing');
      expect(result.hasConsent).toBe(false);
    });

    it('should create audit entry for consent given', async () => {
      await service.recordConsent('tenant-1', 'cust-1', 'customer', 'marketing', '1.0', 'explicit');

      const entries = await service.queryAuditLog({
        tenantId: 'tenant-1',
        action: 'consent_given',
      });

      expect(entries.length).toBe(1);
    });

    it('should create audit entry for consent revoked', async () => {
      const record = await service.recordConsent('tenant-1', 'cust-1', 'customer', 'marketing', '1.0', 'explicit');
      await service.revokeConsent(record.id);

      const entries = await service.queryAuditLog({
        tenantId: 'tenant-1',
        action: 'consent_revoked',
      });

      expect(entries.length).toBe(1);
    });
  });

  // =================== RETENTION POLICIES TESTS ===================

  describe('Retention Policies', () => {
    it('should create retention policy', async () => {
      const policy = await service.createRetentionPolicy(
        'tenant-1',
        'Customer Data Retention',
        'customer',
        365,
        730,
        'GDPR Art. 6',
      );

      expect(policy).toBeDefined();
      expect(policy.id).toMatch(/^rp-/);
      expect(policy.tenantId).toBe('tenant-1');
      expect(policy.name).toBe('Customer Data Retention');
      expect(policy.dataType).toBe('customer');
      expect(policy.retentionDays).toBe(365);
      expect(policy.deletionDays).toBe(730);
      expect(policy.legalBasis).toBe('GDPR Art. 6');
    });

    it('should create retention policy with archive and exceptions', async () => {
      const policy = await service.createRetentionPolicy(
        'tenant-1',
        'Invoice Retention',
        'invoice',
        365,
        3650,
        'Tax regulations',
        {
          archiveDays: 180,
          exceptions: ['ongoing_disputes', 'audit_requests'],
        },
      );

      expect(policy.archiveDays).toBe(180);
      expect(policy.exceptions).toContain('ongoing_disputes');
      expect(policy.exceptions).toContain('audit_requests');
    });

    it('should get retention policies for tenant', async () => {
      await service.createRetentionPolicy('tenant-1', 'Policy A', 'customer', 365, 730, 'GDPR');
      await service.createRetentionPolicy('tenant-1', 'Policy B', 'invoice', 365, 3650, 'Tax');
      await service.createRetentionPolicy('tenant-2', 'Policy C', 'order', 180, 365, 'Contract');

      const policies = await service.getRetentionPolicies('tenant-1');
      expect(policies.length).toBe(2);
    });

    it('should sort retention policies by data type', async () => {
      await service.createRetentionPolicy('tenant-1', 'Z Policy', 'order', 180, 365, 'Contract');
      await service.createRetentionPolicy('tenant-1', 'A Policy', 'customer', 365, 730, 'GDPR');

      const policies = await service.getRetentionPolicies('tenant-1');
      expect(policies[0].dataType).toBe('customer');
      expect(policies[1].dataType).toBe('order');
    });

    it('should apply retention policy', async () => {
      const policy = await service.createRetentionPolicy(
        'tenant-1',
        'Test Policy',
        'customer',
        30,
        60,
        'Test',
      );

      const result = await service.applyRetentionPolicy(policy.id);

      expect(result).toBeDefined();
      expect(result!.policy.lastApplied).toBeInstanceOf(Date);
      expect(typeof result!.archived).toBe('number');
      expect(typeof result!.deleted).toBe('number');
    });

    it('should return null when applying non-existent policy', async () => {
      const result = await service.applyRetentionPolicy('non-existent');
      expect(result).toBeNull();
    });

    it('should create audit entry for retention applied', async () => {
      const policy = await service.createRetentionPolicy(
        'tenant-1',
        'Test Policy',
        'customer',
        30,
        60,
        'Test',
      );

      await service.applyRetentionPolicy(policy.id);

      const entries = await service.queryAuditLog({
        tenantId: 'tenant-1',
        action: 'retention_applied',
      });

      expect(entries.length).toBe(1);
    });
  });

  // =================== COMPLIANCE REPORTING TESTS ===================

  describe('Compliance Reporting', () => {
    beforeEach(async () => {
      // Create audit entries with compliance flags
      await service.logAction('tenant-1', 'create', 'data', 'customer', {
        userId: 'user-1',
        complianceFlags: ['GDPR'],
      });
      await service.logAction('tenant-1', 'update', 'data', 'customer', {
        userId: 'user-1',
        complianceFlags: ['GDPR'],
      });
      await service.logAction('tenant-1', 'delete', 'data', 'customer', {
        userId: 'user-2',
        complianceFlags: ['GDPR'],
        success: false,
        errorMessage: 'Access denied',
      });
    });

    it('should generate compliance report', async () => {
      const now = new Date();
      const report = await service.generateComplianceReport(
        'tenant-1',
        'GDPR',
        'audit',
        { start: new Date(now.getTime() - 3600000), end: now },
        'admin-1',
      );

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^rpt-/);
      expect(report.tenantId).toBe('tenant-1');
      expect(report.framework).toBe('GDPR');
      expect(report.reportType).toBe('audit');
      expect(report.generatedBy).toBe('admin-1');
    });

    it('should include summary in compliance report', async () => {
      const now = new Date();
      const report = await service.generateComplianceReport(
        'tenant-1',
        'GDPR',
        'audit',
        { start: new Date(now.getTime() - 3600000), end: now },
        'admin-1',
      );

      expect(report.summary).toBeDefined();
      expect(report.summary.totalEvents).toBe(3);
      expect(report.summary.byAction.create).toBe(1);
      expect(report.summary.byAction.update).toBe(1);
      expect(report.summary.byAction.delete).toBe(1);
      expect(report.summary.failedActions).toBe(1);
    });

    it('should calculate compliance score', async () => {
      const now = new Date();
      const report = await service.generateComplianceReport(
        'tenant-1',
        'GDPR',
        'audit',
        { start: new Date(now.getTime() - 3600000), end: now },
        'admin-1',
      );

      expect(report.summary.complianceScore).toBeDefined();
      expect(report.summary.complianceScore).toBeLessThanOrEqual(100);
      expect(report.summary.complianceScore).toBeGreaterThanOrEqual(0);
    });

    it('should include entries in report', async () => {
      const now = new Date();
      const report = await service.generateComplianceReport(
        'tenant-1',
        'GDPR',
        'audit',
        { start: new Date(now.getTime() - 3600000), end: now },
        'admin-1',
      );

      expect(report.entries.length).toBe(3);
    });

    it('should create audit entry for report generation', async () => {
      const now = new Date();
      await service.generateComplianceReport(
        'tenant-1',
        'GDPR',
        'audit',
        { start: new Date(now.getTime() - 3600000), end: now },
        'admin-1',
      );

      const entries = await service.queryAuditLog({
        tenantId: 'tenant-1',
        action: 'export',
        resourceType: 'compliance_report',
      });

      expect(entries.length).toBe(1);
    });
  });

  // =================== USER ACTIVITY TESTS ===================

  describe('User Activity', () => {
    beforeEach(async () => {
      await service.logAction('tenant-1', 'login', 'authentication', 'session', { userId: 'user-1' });
      await service.logAction('tenant-1', 'create', 'data', 'invoice', { userId: 'user-1' });
      await service.logAction('tenant-1', 'update', 'data', 'invoice', { userId: 'user-1' });
      await service.logAction('tenant-1', 'logout', 'authentication', 'session', { userId: 'user-1' });
      await service.logAction('tenant-1', 'login', 'authentication', 'session', { userId: 'user-2' });
    });

    it('should get user activity', async () => {
      const activity = await service.getUserActivity('tenant-1', 'user-1');
      expect(activity.length).toBe(4);
      expect(activity.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should limit user activity results', async () => {
      const activity = await service.getUserActivity('tenant-1', 'user-1', { limit: 2 });
      expect(activity.length).toBe(2);
    });
  });

  // =================== RESOURCE HISTORY TESTS ===================

  describe('Resource History', () => {
    beforeEach(async () => {
      await service.logAction('tenant-1', 'create', 'data', 'invoice', { userId: 'user-1', resourceId: 'inv-1' });
      await service.logAction('tenant-1', 'update', 'data', 'invoice', { userId: 'user-1', resourceId: 'inv-1' });
      await service.logAction('tenant-1', 'update', 'data', 'invoice', { userId: 'user-2', resourceId: 'inv-1' });
      await service.logAction('tenant-1', 'create', 'data', 'invoice', { userId: 'user-1', resourceId: 'inv-2' });
    });

    it('should get resource history', async () => {
      const history = await service.getResourceHistory('tenant-1', 'invoice', 'inv-1');
      expect(history.length).toBe(3);
      expect(history.every(e => e.resourceId === 'inv-1')).toBe(true);
    });

    it('should return empty array for non-existent resource', async () => {
      const history = await service.getResourceHistory('tenant-1', 'invoice', 'non-existent');
      expect(history.length).toBe(0);
    });
  });

  // =================== METADATA TESTS ===================

  describe('Metadata', () => {
    it('should return all audit actions', () => {
      const actions = service.getAuditActions();
      expect(actions).toContain('create');
      expect(actions).toContain('read');
      expect(actions).toContain('update');
      expect(actions).toContain('delete');
      expect(actions).toContain('login');
      expect(actions).toContain('consent_given');
      expect(actions.length).toBe(17);
    });

    it('should return all audit categories', () => {
      const categories = service.getAuditCategories();
      expect(categories).toContain('authentication');
      expect(categories).toContain('authorization');
      expect(categories).toContain('data');
      expect(categories).toContain('compliance');
      expect(categories.length).toBe(6);
    });

    it('should return all compliance frameworks', () => {
      const frameworks = service.getComplianceFrameworks();
      expect(frameworks).toContain('GDPR');
      expect(frameworks).toContain('SOC2');
      expect(frameworks).toContain('ISO27001');
      expect(frameworks).toContain('ANAF');
      expect(frameworks).toContain('PCI_DSS');
      expect(frameworks.length).toBe(5);
    });

    it('should return all severity levels', () => {
      const levels = service.getSeverityLevels();
      expect(levels).toContain('low');
      expect(levels).toContain('medium');
      expect(levels).toContain('high');
      expect(levels).toContain('critical');
      expect(levels.length).toBe(4);
    });
  });
});
