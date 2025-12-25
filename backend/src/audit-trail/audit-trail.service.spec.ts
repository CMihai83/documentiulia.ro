import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditTrailService,
  AuditAction,
  EntityType,
  FieldChange,
} from './audit-trail.service';

describe('AuditTrailService', () => {
  let service: AuditTrailService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditTrailService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AuditTrailService>(AuditTrailService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('Basic Logging', () => {
    it('should log audit entry', async () => {
      const entry = await service.log(
        'CREATE',
        'INVOICE',
        'inv-123',
        'user-1',
        'John Doe',
      );

      expect(entry.id).toBeDefined();
      expect(entry.action).toBe('CREATE');
      expect(entry.entityType).toBe('INVOICE');
      expect(entry.entityId).toBe('inv-123');
      expect(entry.userId).toBe('user-1');
      expect(entry.userName).toBe('John Doe');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.logged', expect.any(Object));
    });

    it('should include Romanian translations', async () => {
      const entry = await service.log('CREATE', 'INVOICE', 'inv-123', 'user-1', 'John');

      expect(entry.actionRo).toBe('Creare');
      expect(entry.entityTypeRo).toBe('Factură');
    });

    it('should log with all options', async () => {
      const entry = await service.log('UPDATE', 'CUSTOMER', 'cust-1', 'user-1', 'John', {
        entityName: 'SC Test SRL',
        userRole: 'admin',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
        tenantId: 'tenant-1',
        metadata: { source: 'web' },
      });

      expect(entry.entityName).toBe('SC Test SRL');
      expect(entry.userRole).toBe('admin');
      expect(entry.ipAddress).toBe('192.168.1.1');
      expect(entry.userAgent).toBe('Mozilla/5.0');
      expect(entry.sessionId).toBe('session-123');
      expect(entry.tenantId).toBe('tenant-1');
      expect(entry.metadata?.source).toBe('web');
    });

    it('should log field changes', async () => {
      const changes: FieldChange[] = [
        { field: 'name', fieldRo: 'Nume', oldValue: 'Old Name', newValue: 'New Name' },
        { field: 'email', fieldRo: 'Email', oldValue: 'old@test.ro', newValue: 'new@test.ro' },
      ];

      const entry = await service.log('UPDATE', 'CUSTOMER', 'cust-1', 'user-1', 'John', {
        changes,
      });

      expect(entry.changes).toHaveLength(2);
      expect(entry.changes![0].field).toBe('name');
    });

    it('should generate tamper-proof hash', async () => {
      const entry = await service.log('CREATE', 'INVOICE', 'inv-1', 'user-1', 'John');

      expect(entry.hash).toBeDefined();
      expect(entry.hash.length).toBe(64); // SHA-256 hex
      expect(entry.previousHash).toBeDefined();
    });

    it('should chain hashes', async () => {
      const entry1 = await service.log('CREATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      const entry2 = await service.log('CREATE', 'INVOICE', 'inv-2', 'user-1', 'John');

      expect(entry2.previousHash).toBe(entry1.hash);
    });
  });

  describe('Convenience Methods', () => {
    it('should log create', async () => {
      const entry = await service.logCreate(
        'INVOICE',
        'inv-1',
        'INV-2025-001',
        'user-1',
        'John',
        { amount: 1000 },
      );

      expect(entry.action).toBe('CREATE');
      expect(entry.entityName).toBe('INV-2025-001');
      expect(entry.newValue).toEqual({ amount: 1000 });
    });

    it('should log update', async () => {
      const changes: FieldChange[] = [
        { field: 'amount', fieldRo: 'Sumă', oldValue: 1000, newValue: 1500 },
      ];

      const entry = await service.logUpdate(
        'INVOICE',
        'inv-1',
        'INV-2025-001',
        'user-1',
        'John',
        changes,
      );

      expect(entry.action).toBe('UPDATE');
      expect(entry.changes).toHaveLength(1);
    });

    it('should log delete', async () => {
      const entry = await service.logDelete(
        'INVOICE',
        'inv-1',
        'INV-2025-001',
        'user-1',
        'John',
        { amount: 1000, customerName: 'Test' },
      );

      expect(entry.action).toBe('DELETE');
      expect(entry.previousValue).toBeDefined();
    });

    it('should log login', async () => {
      const entry = await service.logLogin('user-1', 'John Doe', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
        success: true,
      });

      expect(entry.action).toBe('LOGIN');
      expect(entry.entityType).toBe('USER');
      expect(entry.metadata?.success).toBe(true);
    });

    it('should log logout', async () => {
      const entry = await service.logLogout('user-1', 'John Doe', {
        sessionId: 'session-123',
      });

      expect(entry.action).toBe('LOGOUT');
    });

    it('should log approval', async () => {
      const entry = await service.logApproval(
        'INVOICE',
        'inv-1',
        'INV-2025-001',
        'user-1',
        'Manager',
        true,
        'Approved for payment',
      );

      expect(entry.action).toBe('APPROVE');
      expect(entry.metadata?.approved).toBe(true);
      expect(entry.metadata?.comment).toBe('Approved for payment');
    });

    it('should log rejection', async () => {
      const entry = await service.logApproval(
        'INVOICE',
        'inv-1',
        'INV-2025-001',
        'user-1',
        'Manager',
        false,
        'Missing information',
      );

      expect(entry.action).toBe('REJECT');
      expect(entry.metadata?.approved).toBe(false);
    });

    it('should log export', async () => {
      const entry = await service.logExport(
        'INVOICE',
        'user-1',
        'John',
        100,
        'CSV',
      );

      expect(entry.action).toBe('EXPORT');
      expect(entry.entityId).toBe('BULK');
      expect(entry.metadata?.recordCount).toBe(100);
      expect(entry.metadata?.format).toBe('CSV');
    });

    it('should log import', async () => {
      const entry = await service.logImport(
        'CUSTOMER',
        'user-1',
        'John',
        100,
        95,
        5,
      );

      expect(entry.action).toBe('IMPORT');
      expect(entry.metadata?.recordCount).toBe(100);
      expect(entry.metadata?.successCount).toBe(95);
      expect(entry.metadata?.errorCount).toBe(5);
    });
  });

  describe('Severity Classification', () => {
    it('should mark DELETE as CRITICAL', async () => {
      const entry = await service.log('DELETE', 'INVOICE', 'inv-1', 'user-1', 'John');
      expect(entry.severity).toBe('CRITICAL');
    });

    it('should mark APPROVE as CRITICAL', async () => {
      const entry = await service.log('APPROVE', 'INVOICE', 'inv-1', 'user-1', 'John');
      expect(entry.severity).toBe('CRITICAL');
    });

    it('should mark SUBMIT as CRITICAL', async () => {
      const entry = await service.log('SUBMIT', 'DECLARATION', 'decl-1', 'user-1', 'John');
      expect(entry.severity).toBe('CRITICAL');
    });

    it('should mark settings UPDATE as WARNING', async () => {
      const entry = await service.log('UPDATE', 'SETTING', 'setting-1', 'user-1', 'John');
      expect(entry.severity).toBe('WARNING');
    });

    it('should mark role UPDATE as WARNING', async () => {
      const entry = await service.log('UPDATE', 'ROLE', 'role-1', 'user-1', 'John');
      expect(entry.severity).toBe('WARNING');
    });

    it('should mark regular CREATE as INFO', async () => {
      const entry = await service.log('CREATE', 'PRODUCT', 'prod-1', 'user-1', 'John');
      expect(entry.severity).toBe('INFO');
    });

    it('should emit critical event for critical actions', async () => {
      await service.log('DELETE', 'INVOICE', 'inv-1', 'user-1', 'John');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.critical', expect.any(Object));
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await service.log('CREATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('UPDATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('CREATE', 'CUSTOMER', 'cust-1', 'user-2', 'Jane');
      await service.log('DELETE', 'PRODUCT', 'prod-1', 'user-1', 'John');
    });

    it('should query all entries', async () => {
      const result = await service.query({});
      expect(result.total).toBe(4);
    });

    it('should filter by action', async () => {
      const result = await service.query({ action: 'CREATE' });
      expect(result.entries.every((e) => e.action === 'CREATE')).toBe(true);
    });

    it('should filter by multiple actions', async () => {
      const result = await service.query({ action: ['CREATE', 'UPDATE'] });
      expect(result.entries.every((e) => ['CREATE', 'UPDATE'].includes(e.action))).toBe(true);
    });

    it('should filter by entity type', async () => {
      const result = await service.query({ entityType: 'INVOICE' });
      expect(result.entries.every((e) => e.entityType === 'INVOICE')).toBe(true);
    });

    it('should filter by entity id', async () => {
      const result = await service.query({ entityId: 'inv-1' });
      expect(result.entries.every((e) => e.entityId === 'inv-1')).toBe(true);
    });

    it('should filter by user id', async () => {
      const result = await service.query({ userId: 'user-1' });
      expect(result.entries.every((e) => e.userId === 'user-1')).toBe(true);
    });

    it('should filter by severity', async () => {
      const result = await service.query({ severity: 'CRITICAL' });
      expect(result.entries.every((e) => e.severity === 'CRITICAL')).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);

      const result = await service.query({
        startDate: hourAgo,
        endDate: now,
      });

      expect(result.total).toBeGreaterThan(0);
    });

    it('should search by text', async () => {
      await service.log('CREATE', 'INVOICE', 'inv-search', 'user-1', 'John', {
        entityName: 'Căutare Test',
      });

      const result = await service.query({ searchText: 'Căutare' });
      expect(result.entries.some((e) => e.entityName?.includes('Căutare'))).toBe(true);
    });

    it('should paginate results', async () => {
      const page1 = await service.query({ page: 1, pageSize: 2 });
      const page2 = await service.query({ page: 2, pageSize: 2 });

      expect(page1.entries.length).toBeLessThanOrEqual(2);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBeGreaterThan(0);

      if (page2.entries.length > 0) {
        expect(page1.entries[0].id).not.toBe(page2.entries[0].id);
      }
    });

    it('should sort by timestamp desc by default', async () => {
      const result = await service.query({});

      for (let i = 1; i < result.entries.length; i++) {
        expect(result.entries[i].timestamp.getTime()).toBeLessThanOrEqual(
          result.entries[i - 1].timestamp.getTime(),
        );
      }
    });

    it('should sort ascending', async () => {
      const result = await service.query({ sortOrder: 'asc' });

      for (let i = 1; i < result.entries.length; i++) {
        expect(result.entries[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result.entries[i - 1].timestamp.getTime(),
        );
      }
    });
  });

  describe('Entity History', () => {
    it('should get entity history', async () => {
      await service.log('CREATE', 'INVOICE', 'inv-history', 'user-1', 'John');
      await service.log('UPDATE', 'INVOICE', 'inv-history', 'user-1', 'John');
      await service.log('UPDATE', 'INVOICE', 'inv-history', 'user-2', 'Jane');

      const history = await service.getEntityHistory('INVOICE', 'inv-history');

      expect(history.length).toBe(3);
      expect(history.every((e) => e.entityId === 'inv-history')).toBe(true);
    });
  });

  describe('User Activity', () => {
    it('should get user activity', async () => {
      await service.log('CREATE', 'INVOICE', 'inv-1', 'user-activity', 'Test User');
      await service.log('UPDATE', 'CUSTOMER', 'cust-1', 'user-activity', 'Test User');

      const activity = await service.getUserActivity('user-activity');

      expect(activity.length).toBe(2);
      expect(activity.every((e) => e.userId === 'user-activity')).toBe(true);
    });
  });

  describe('Integrity Verification', () => {
    it('should verify valid chain', async () => {
      await service.log('CREATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('UPDATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('DELETE', 'INVOICE', 'inv-1', 'user-1', 'John');

      const result = await service.verifyIntegrity();

      expect(result.valid).toBe(true);
      expect(result.checkedCount).toBe(3);
      expect(result.invalidEntries).toHaveLength(0);
    });
  });

  describe('Compliance Reports', () => {
    beforeEach(async () => {
      await service.log('CREATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('DELETE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('CREATE', 'CUSTOMER', 'cust-1', 'user-2', 'Jane');
    });

    it('should generate compliance report', async () => {
      const startDate = new Date(Date.now() - 86400000);
      const endDate = new Date();

      const report = await service.generateComplianceReport(startDate, endDate);

      expect(report.id).toBeDefined();
      expect(report.nameRo).toBeDefined();
      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(report.summary.totalActions).toBeGreaterThan(0);
      expect(report.summary.criticalActions).toBeGreaterThan(0);
      expect(report.summary.uniqueUsers).toBeGreaterThan(0);
    });

    it('should generate ANAF audit report', async () => {
      await service.log('SUBMIT', 'DECLARATION', 'decl-1', 'user-1', 'John');
      await service.log('CREATE', 'TRANSACTION', 'trans-1', 'user-1', 'John');

      const report = await service.generateANAFAuditReport(2025, 1);

      expect(report.nameRo).toContain('ANAF');
      expect(report.nameRo).toContain('2025');
    });

    it('should generate annual ANAF report', async () => {
      const report = await service.generateANAFAuditReport(2025);

      expect(report.name).toContain('2025');
      expect(report.period.start.getMonth()).toBe(0); // January
      expect(report.period.end.getMonth()).toBe(11); // December
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.log('CREATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('UPDATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('DELETE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('CREATE', 'CUSTOMER', 'cust-1', 'user-2', 'Jane');
    });

    it('should return total entries', () => {
      const stats = service.getStats();
      expect(stats.totalEntries).toBe(4);
    });

    it('should count entries by action', () => {
      const stats = service.getStats();
      expect(stats.entriesByAction.CREATE).toBe(2);
      expect(stats.entriesByAction.UPDATE).toBe(1);
      expect(stats.entriesByAction.DELETE).toBe(1);
    });

    it('should count entries by entity', () => {
      const stats = service.getStats();
      expect(stats.entriesByEntity.INVOICE).toBe(3);
      expect(stats.entriesByEntity.CUSTOMER).toBe(1);
    });

    it('should count entries by severity', () => {
      const stats = service.getStats();
      expect(stats.entriesBySeverity.CRITICAL).toBeGreaterThan(0);
      expect(stats.entriesBySeverity.INFO).toBeGreaterThan(0);
    });

    it('should return recent activity', () => {
      const stats = service.getStats();
      expect(stats.recentActivity.length).toBeGreaterThan(0);
    });

    it('should return top users', () => {
      const stats = service.getStats();
      expect(stats.topUsers.length).toBeGreaterThan(0);
      expect(stats.topUsers[0].count).toBeGreaterThanOrEqual(stats.topUsers[1]?.count || 0);
    });
  });

  describe('Data Sanitization', () => {
    it('should redact sensitive fields in changes', async () => {
      const changes: FieldChange[] = [
        { field: 'password', fieldRo: 'Parolă', oldValue: 'old123', newValue: 'new456' },
        { field: 'name', fieldRo: 'Nume', oldValue: 'Old', newValue: 'New' },
      ];

      const entry = await service.log('UPDATE', 'USER', 'user-1', 'admin', 'Admin', {
        changes,
      });

      expect(entry.changes![0].oldValue).toBe('[REDACTED]');
      expect(entry.changes![0].newValue).toBe('[REDACTED]');
      expect(entry.changes![1].oldValue).toBe('Old');
    });

    it('should redact sensitive fields in objects', async () => {
      const entry = await service.log('CREATE', 'USER', 'user-1', 'admin', 'Admin', {
        newValue: {
          name: 'John',
          password: 'secret123',
          token: 'abc123',
        },
      });

      expect(entry.newValue.name).toBe('John');
      expect(entry.newValue.password).toBe('[REDACTED]');
      expect(entry.newValue.token).toBe('[REDACTED]');
    });
  });

  describe('Anonymization', () => {
    it('should anonymize user data', async () => {
      await service.log('CREATE', 'INVOICE', 'inv-1', 'user-to-anonymize', 'John Doe');
      await service.log('UPDATE', 'INVOICE', 'inv-1', 'user-to-anonymize', 'John Doe');

      const count = await service.anonymizeUser('user-to-anonymize');

      expect(count).toBe(2);

      const history = await service.getEntityHistory('INVOICE', 'inv-1');
      for (const entry of history) {
        expect(entry.userName).toBe('Utilizator Anonim');
        expect(entry.ipAddress).toBeUndefined();
      }
    });

    it('should throw error when anonymization is disabled', async () => {
      service.configure({ enableAnonymization: false });

      await expect(service.anonymizeUser('user-1')).rejects.toThrow('Anonymization is disabled');
    });
  });

  describe('Export', () => {
    beforeEach(async () => {
      await service.log('CREATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      await service.log('UPDATE', 'INVOICE', 'inv-1', 'user-1', 'John');
    });

    it('should export to JSON', async () => {
      const json = await service.exportToJson({});
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should export to CSV', async () => {
      const csv = await service.exportToCsv({});
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('ID');
      expect(lines[0]).toContain('Timestamp');
      expect(lines[0]).toContain('Action');
    });
  });

  describe('Configuration', () => {
    it('should return default config', () => {
      const config = service.getConfig();

      expect(config.retentionYears).toBe(10);
      expect(config.enableHashing).toBe(true);
      expect(config.enableAnonymization).toBe(true);
    });

    it('should update config', () => {
      service.configure({ retentionYears: 5 });
      const config = service.getConfig();

      expect(config.retentionYears).toBe(5);
    });

    it('should emit event on config change', () => {
      service.configure({ retentionYears: 7 });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.configured', expect.any(Object));
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian action translations', async () => {
      const actions: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'];

      for (const action of actions) {
        const entry = await service.log(action, 'INVOICE', 'inv-1', 'user-1', 'John');
        expect(entry.actionRo).toBeDefined();
        expect(entry.actionRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian entity type translations', async () => {
      const entityTypes: EntityType[] = ['INVOICE', 'CUSTOMER', 'EMPLOYEE', 'DECLARATION'];

      for (const entityType of entityTypes) {
        const entry = await service.log('CREATE', entityType, 'entity-1', 'user-1', 'John');
        expect(entry.entityTypeRo).toBeDefined();
        expect(entry.entityTypeRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian diacritics in translations', async () => {
      const entry = await service.log('CREATE', 'INVOICE', 'inv-1', 'user-1', 'John');
      expect(entry.entityTypeRo).toBe('Factură');
      expect(entry.entityTypeRo).toMatch(/[ăîâșțĂÎÂȘȚ]/);
    });

    it('should have Romanian compliance report names', async () => {
      const report = await service.generateComplianceReport(new Date(), new Date());
      expect(report.nameRo).toBeDefined();
    });
  });

  describe('Events', () => {
    it('should emit audit.logged event', async () => {
      await service.log('CREATE', 'INVOICE', 'inv-1', 'user-1', 'John');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.logged', expect.objectContaining({
        action: 'CREATE',
        entityType: 'INVOICE',
        entityId: 'inv-1',
      }));
    });

    it('should emit audit.critical for critical actions', async () => {
      await service.log('DELETE', 'INVOICE', 'inv-1', 'user-1', 'John');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.critical', expect.objectContaining({
        message: expect.stringContaining('DELETE'),
        messageRo: expect.stringContaining('Ștergere'),
      }));
    });

    it('should emit audit.anonymized event', async () => {
      await service.log('CREATE', 'INVOICE', 'inv-1', 'anonymize-user', 'John');
      jest.clearAllMocks();
      await service.anonymizeUser('anonymize-user');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.anonymized', expect.any(Object));
    });
  });
});
