import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { AuditTrailService, AuditAction, AuditEntity, AuditSeverity } from './audit-trail.service';

describe('AuditTrailService', () => {
  let service: AuditTrailService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditTrailService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditTrailService>(AuditTrailService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Default Policies', () => {
    it('should initialize with default policies', () => {
      const policies = service.getPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(5);
    });

    it('should have financial records policy', () => {
      const policies = service.getPolicies({ entity: 'INVOICE' });
      expect(policies.some((p) => p.name === 'Financial Records')).toBe(true);
    });

    it('should have user authentication policy', () => {
      const policies = service.getPolicies({ entity: 'USER' });
      expect(policies.some((p) => p.actions.includes('LOGIN'))).toBe(true);
    });

    it('should have ANAF submissions policy', () => {
      const policies = service.getPolicies({ entity: 'ANAF_SUBMISSION' });
      expect(policies.length).toBeGreaterThan(0);
    });

    it('should have 10-year retention for financial records', () => {
      const policies = service.getPolicies({ entity: 'INVOICE' });
      const financialPolicy = policies.find((p) => p.name === 'Financial Records');
      expect(financialPolicy?.retentionDays).toBe(3650);
    });

    it('should have bilingual policy names', () => {
      const policies = service.getPolicies();
      policies.forEach((p) => {
        expect(p.name).toBeDefined();
        expect(p.nameRo).toBeDefined();
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log audit entry', () => {
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userRole: 'admin',
        action: 'CREATE',
        entity: 'INVOICE',
        entityId: 'inv-001',
        entityName: 'INV-2025-001',
        description: 'Created invoice INV-2025-001',
        descriptionRo: 'S-a creat factura INV-2025-001',
      });

      expect(entry.id).toBeDefined();
      expect(entry.action).toBe('CREATE');
      expect(entry.entity).toBe('INVOICE');
      expect(entry.timestamp).toBeDefined();
    });

    it('should set retention date', () => {
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userRole: 'admin',
        action: 'CREATE',
        entity: 'INVOICE',
        entityId: 'inv-001',
        description: 'Test',
        descriptionRo: 'Test',
      });

      expect(entry.retentionUntil).toBeDefined();
      expect(entry.retentionUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('should log with severity', () => {
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userRole: 'admin',
        action: 'DELETE',
        entity: 'CLIENT',
        entityId: 'client-001',
        severity: 'CRITICAL',
        description: 'Deleted client',
        descriptionRo: 'S-a șters clientul',
      });

      expect(entry.severity).toBe('CRITICAL');
    });

    it('should log with status', () => {
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userRole: 'admin',
        action: 'SUBMIT',
        entity: 'ANAF_SUBMISSION',
        entityId: 'sub-001',
        status: 'FAILURE',
        description: 'Submission failed',
        descriptionRo: 'Depunerea a eșuat',
      });

      expect(entry.status).toBe('FAILURE');
    });

    it('should log with data changes', () => {
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userRole: 'admin',
        action: 'UPDATE',
        entity: 'CLIENT',
        entityId: 'client-001',
        description: 'Updated client',
        descriptionRo: 'S-a actualizat clientul',
        changes: [
          { field: 'name', fieldLabel: 'Name', fieldLabelRo: 'Nume', oldValue: 'Old Name', newValue: 'New Name', changeType: 'MODIFIED' },
        ],
      });

      expect(entry.changes?.length).toBe(1);
      expect(entry.changes?.[0].changeType).toBe('MODIFIED');
    });

    it('should log with metadata', () => {
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userRole: 'admin',
        action: 'CREATE',
        entity: 'PRODUCT',
        entityId: 'prod-001',
        description: 'Test',
        descriptionRo: 'Test',
        metadata: { source: 'UI', module: 'products', duration: 150 },
      });

      expect(entry.metadata.source).toBe('UI');
      expect(entry.metadata.module).toBe('products');
      expect(entry.metadata.duration).toBe(150);
    });

    it('should log with IP address and user agent', () => {
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userRole: 'admin',
        action: 'LOGIN',
        entity: 'USER',
        entityId: 'user-1',
        description: 'Login',
        descriptionRo: 'Autentificare',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(entry.ipAddress).toBe('192.168.1.1');
      expect(entry.userAgent).toBe('Mozilla/5.0');
    });

    it('should emit entry created event', () => {
      service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userRole: 'admin',
        action: 'CREATE',
        entity: 'INVOICE',
        entityId: 'inv-001',
        description: 'Test',
        descriptionRo: 'Test',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('audit.entry.created', expect.any(Object));
    });
  });

  describe('Convenience Logging Methods', () => {
    it('should log create action', () => {
      const entry = service.logCreate(
        'tenant-1', 'user-1', 'John Doe', 'john@example.com', 'admin',
        'CLIENT', 'client-001', 'Test Client'
      );

      expect(entry.action).toBe('CREATE');
      expect(entry.entity).toBe('CLIENT');
    });

    it('should log update action with changes', () => {
      const changes = [
        { field: 'email', fieldLabel: 'Email', fieldLabelRo: 'Email', oldValue: 'old@test.com', newValue: 'new@test.com', changeType: 'MODIFIED' as const },
      ];

      const entry = service.logUpdate(
        'tenant-1', 'user-1', 'John Doe', 'john@example.com', 'admin',
        'CLIENT', 'client-001', 'Test Client', changes
      );

      expect(entry.action).toBe('UPDATE');
      expect(entry.changes?.length).toBe(1);
    });

    it('should log delete action', () => {
      const entry = service.logDelete(
        'tenant-1', 'user-1', 'John Doe', 'john@example.com', 'admin',
        'PRODUCT', 'prod-001', 'Test Product'
      );

      expect(entry.action).toBe('DELETE');
      expect(entry.severity).toBe('WARNING');
    });

    it('should log successful login', () => {
      const entry = service.logLogin(
        'tenant-1', 'user-1', 'John Doe', 'john@example.com', 'admin',
        true, '192.168.1.1', 'Mozilla/5.0'
      );

      expect(entry.action).toBe('LOGIN');
      expect(entry.status).toBe('SUCCESS');
    });

    it('should log failed login', () => {
      const entry = service.logLogin(
        'tenant-1', 'user-1', 'John Doe', 'john@example.com', 'admin',
        false, '192.168.1.1'
      );

      expect(entry.status).toBe('FAILURE');
      expect(entry.severity).toBe('SECURITY');
    });

    it('should log export action', () => {
      const entry = service.logExport(
        'tenant-1', 'user-1', 'John Doe', 'john@example.com', 'admin',
        'REPORT', 'report-001', 'PDF'
      );

      expect(entry.action).toBe('EXPORT');
      expect(entry.severity).toBe('WARNING');
    });

    it('should log ANAF submission', () => {
      const entry = service.logANAFSubmission(
        'tenant-1', 'user-1', 'John Doe', 'john@example.com', 'admin',
        'sub-001', 'D406', true
      );

      expect(entry.action).toBe('SUBMIT');
      expect(entry.entity).toBe('ANAF_SUBMISSION');
      expect(entry.severity).toBe('CRITICAL');
    });

    it('should log failed ANAF submission', () => {
      const entry = service.logANAFSubmission(
        'tenant-1', 'user-1', 'John Doe', 'john@example.com', 'admin',
        'sub-001', 'D406', false, 'Validation error'
      );

      expect(entry.status).toBe('FAILURE');
      expect(entry.metadata.errorMessage).toBe('Validation error');
    });
  });

  describe('Entry Retrieval', () => {
    let entryId: string;

    beforeEach(() => {
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userRole: 'admin',
        action: 'CREATE',
        entity: 'INVOICE',
        entityId: 'inv-001',
        description: 'Test',
        descriptionRo: 'Test',
      });
      entryId = entry.id;
    });

    it('should get entry by id', () => {
      const entry = service.getEntry(entryId);
      expect(entry.action).toBe('CREATE');
    });

    it('should throw for invalid entry id', () => {
      expect(() => service.getEntry('invalid-id')).toThrow(NotFoundException);
    });
  });

  describe('Querying', () => {
    beforeEach(() => {
      // Create various entries
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'CREATE', entity: 'INVOICE', entityId: 'inv-001', description: 'Created invoice', descriptionRo: 'Creat factură' });
      service.log({ tenantId: 'tenant-1', userId: 'user-2', userName: 'Jane', userEmail: 'jane@test.com', userRole: 'user', action: 'UPDATE', entity: 'CLIENT', entityId: 'client-001', severity: 'WARNING', description: 'Updated client', descriptionRo: 'Actualizat client' });
      service.log({ tenantId: 'tenant-2', userId: 'user-3', userName: 'Bob', userEmail: 'bob@test.com', userRole: 'admin', action: 'DELETE', entity: 'PRODUCT', entityId: 'prod-001', status: 'FAILURE', description: 'Deleted product', descriptionRo: 'Șters produs' });
    });

    it('should query all entries', () => {
      const result = service.query({});
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should filter by tenant', () => {
      const result = service.query({ tenantId: 'tenant-1' });
      expect(result.entries.every((e) => e.tenantId === 'tenant-1')).toBe(true);
    });

    it('should filter by user', () => {
      const result = service.query({ userId: 'user-1' });
      expect(result.entries.every((e) => e.userId === 'user-1')).toBe(true);
    });

    it('should filter by action', () => {
      const result = service.query({ action: 'CREATE' });
      expect(result.entries.every((e) => e.action === 'CREATE')).toBe(true);
    });

    it('should filter by entity', () => {
      const result = service.query({ entity: 'INVOICE' });
      expect(result.entries.every((e) => e.entity === 'INVOICE')).toBe(true);
    });

    it('should filter by severity', () => {
      const result = service.query({ severity: 'WARNING' });
      expect(result.entries.every((e) => e.severity === 'WARNING')).toBe(true);
    });

    it('should filter by status', () => {
      const result = service.query({ status: 'FAILURE' });
      expect(result.entries.every((e) => e.status === 'FAILURE')).toBe(true);
    });

    it('should search by term', () => {
      const result = service.query({ searchTerm: 'invoice' });
      expect(result.entries.some((e) => e.description.toLowerCase().includes('invoice'))).toBe(true);
    });

    it('should paginate results', () => {
      const result = service.query({ page: 1, pageSize: 2 });
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.entries.length).toBeLessThanOrEqual(2);
    });

    it('should calculate total pages', () => {
      const result = service.query({ pageSize: 1 });
      expect(result.totalPages).toBe(result.total);
    });

    it('should sort by field', () => {
      const result = service.query({ sortField: 'action', sortOrder: 'ASC' });
      for (let i = 0; i < result.entries.length - 1; i++) {
        expect(result.entries[i].action <= result.entries[i + 1].action).toBe(true);
      }
    });
  });

  describe('Entity History', () => {
    beforeEach(() => {
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'CREATE', entity: 'INVOICE', entityId: 'inv-001', description: 'Created', descriptionRo: 'Creat' });
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'UPDATE', entity: 'INVOICE', entityId: 'inv-001', description: 'Updated', descriptionRo: 'Actualizat' });
      service.log({ tenantId: 'tenant-1', userId: 'user-2', userName: 'Jane', userEmail: 'jane@test.com', userRole: 'user', action: 'SEND', entity: 'INVOICE', entityId: 'inv-001', description: 'Sent', descriptionRo: 'Trimis' });
    });

    it('should get entity history', () => {
      const history = service.getEntityHistory('INVOICE', 'inv-001');
      expect(history.length).toBe(3);
    });

    it('should sort by timestamp descending', () => {
      const history = service.getEntityHistory('INVOICE', 'inv-001');
      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(history[i + 1].timestamp.getTime());
      }
    });

    it('should limit results', () => {
      const history = service.getEntityHistory('INVOICE', 'inv-001', 2);
      expect(history.length).toBe(2);
    });
  });

  describe('User Activity', () => {
    beforeEach(() => {
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'CREATE', entity: 'INVOICE', entityId: 'inv-001', description: 'Created', descriptionRo: 'Creat' });
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'LOGIN', entity: 'USER', entityId: 'user-1', description: 'Login', descriptionRo: 'Autentificare' });
    });

    it('should get user activity', () => {
      const activity = service.getUserActivity('user-1');
      expect(activity.length).toBe(2);
      expect(activity.every((e) => e.userId === 'user-1')).toBe(true);
    });

    it('should filter by days', () => {
      const activity = service.getUserActivity('user-1', 1);
      expect(activity.length).toBe(2);
    });
  });

  describe('Security Events', () => {
    beforeEach(() => {
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'LOGIN', entity: 'USER', entityId: 'user-1', severity: 'SECURITY', status: 'FAILURE', description: 'Failed login', descriptionRo: 'Autentificare eșuată' });
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'PASSWORD_RESET', entity: 'USER', entityId: 'user-1', severity: 'SECURITY', description: 'Password reset', descriptionRo: 'Resetare parolă' });
    });

    it('should get security events', () => {
      const events = service.getSecurityEvents('tenant-1');
      expect(events.length).toBe(2);
      expect(events.every((e) => e.severity === 'SECURITY')).toBe(true);
    });
  });

  describe('Policies', () => {
    it('should get policy by id', () => {
      const policies = service.getPolicies();
      const policy = service.getPolicy(policies[0].id);
      expect(policy.name).toBeDefined();
    });

    it('should throw for invalid policy id', () => {
      expect(() => service.getPolicy('invalid-id')).toThrow(NotFoundException);
    });

    it('should filter policies by entity', () => {
      const policies = service.getPolicies({ entity: 'INVOICE' });
      expect(policies.every((p) => p.entity === 'INVOICE')).toBe(true);
    });

    it('should filter active policies', () => {
      const policies = service.getPolicies({ active: true });
      expect(policies.every((p) => p.isActive)).toBe(true);
    });

    it('should create policy', () => {
      const policy = service.createPolicy({
        name: 'Custom Policy',
        nameRo: 'Politică Personalizată',
        entity: 'PRODUCT',
        actions: ['CREATE', 'DELETE'],
        retentionDays: 1825,
        severity: 'WARNING',
        alertEnabled: true,
        alertRecipients: ['test@example.com'],
        isActive: true,
      });

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('Custom Policy');
    });

    it('should update policy', () => {
      const policies = service.getPolicies();
      const policy = policies.find((p) => !p.name.includes('Financial'));

      if (policy) {
        const updated = service.updatePolicy(policy.id, { alertEnabled: false });
        expect(updated.alertEnabled).toBe(false);
      }
    });

    it('should delete policy', () => {
      const policy = service.createPolicy({
        name: 'Delete Me',
        nameRo: 'Șterge-mă',
        entity: 'DOCUMENT',
        actions: ['CREATE'],
        retentionDays: 365,
        severity: 'INFO',
        alertEnabled: false,
        alertRecipients: [],
        isActive: true,
      });

      service.deletePolicy(policy.id);
      expect(() => service.getPolicy(policy.id)).toThrow(NotFoundException);
    });

    it('should emit policy created event', () => {
      service.createPolicy({
        name: 'Event Test',
        nameRo: 'Test Eveniment',
        entity: 'SETTING',
        actions: ['UPDATE'],
        retentionDays: 365,
        severity: 'INFO',
        alertEnabled: false,
        alertRecipients: [],
        isActive: true,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('audit.policy.created', expect.any(Object));
    });
  });

  describe('Reports', () => {
    beforeEach(() => {
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'CREATE', entity: 'INVOICE', entityId: 'inv-001', description: 'Created', descriptionRo: 'Creat' });
      service.log({ tenantId: 'tenant-1', userId: 'user-2', userName: 'Jane', userEmail: 'jane@test.com', userRole: 'user', action: 'UPDATE', entity: 'CLIENT', entityId: 'client-001', description: 'Updated', descriptionRo: 'Actualizat' });
    });

    it('should generate report', () => {
      const report = service.generateReport(
        'tenant-1',
        'Activity Report',
        'Raport Activitate',
        'ACTIVITY',
        { start: new Date(Date.now() - 86400000), end: new Date() },
        {},
        'admin'
      );

      expect(report.id).toBeDefined();
      expect(report.entries.length).toBeGreaterThan(0);
    });

    it('should include summary', () => {
      const report = service.generateReport(
        'tenant-1',
        'Summary Report',
        'Raport Sumar',
        'ACTIVITY',
        { start: new Date(Date.now() - 86400000), end: new Date() },
        {},
        'admin'
      );

      expect(report.summary.totalEntries).toBeGreaterThan(0);
      expect(report.summary.byAction).toBeDefined();
      expect(report.summary.byEntity).toBeDefined();
    });

    it('should get report by id', () => {
      const report = service.generateReport(
        'tenant-1',
        'Get Test',
        'Test Obținere',
        'COMPLIANCE',
        { start: new Date(Date.now() - 86400000), end: new Date() },
        {},
        'admin'
      );

      const retrieved = service.getReport(report.id);
      expect(retrieved.name).toBe('Get Test');
    });

    it('should throw for invalid report id', () => {
      expect(() => service.getReport('invalid-id')).toThrow(NotFoundException);
    });

    it('should get reports for tenant', () => {
      service.generateReport('tenant-1', 'R1', 'R1', 'ACTIVITY', { start: new Date(), end: new Date() }, {}, 'admin');
      service.generateReport('tenant-1', 'R2', 'R2', 'SECURITY', { start: new Date(), end: new Date() }, {}, 'admin');

      const reports = service.getReports('tenant-1');
      expect(reports.length).toBe(2);
    });

    it('should emit report generated event', () => {
      service.generateReport(
        'tenant-1',
        'Event Test',
        'Test Eveniment',
        'ACTIVITY',
        { start: new Date(), end: new Date() },
        {},
        'admin'
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith('audit.report.generated', expect.any(Object));
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'CREATE', entity: 'INVOICE', entityId: 'inv-001', severity: 'INFO', description: 'Created', descriptionRo: 'Creat' });
      service.log({ tenantId: 'tenant-1', userId: 'user-1', userName: 'John', userEmail: 'john@test.com', userRole: 'admin', action: 'LOGIN', entity: 'USER', entityId: 'user-1', severity: 'SECURITY', status: 'FAILURE', description: 'Failed', descriptionRo: 'Eșuat' });
    });

    it('should get stats', () => {
      const stats = service.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it('should count by action', () => {
      const stats = service.getStats();
      expect(stats.byAction.CREATE).toBeGreaterThanOrEqual(1);
    });

    it('should count by entity', () => {
      const stats = service.getStats();
      expect(stats.byEntity.INVOICE).toBeGreaterThanOrEqual(1);
    });

    it('should count by severity', () => {
      const stats = service.getStats();
      expect(stats.bySeverity.INFO).toBeGreaterThanOrEqual(0);
      expect(stats.bySeverity.SECURITY).toBeGreaterThanOrEqual(1);
    });

    it('should count security events', () => {
      const stats = service.getStats();
      expect(stats.securityEvents).toBeGreaterThanOrEqual(1);
    });

    it('should count failed actions', () => {
      const stats = service.getStats();
      expect(stats.failedActions).toBeGreaterThanOrEqual(1);
    });

    it('should filter by tenant', () => {
      const stats = service.getStats('tenant-1');
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries', () => {
      // Create an entry with past retention date
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John',
        userEmail: 'john@test.com',
        userRole: 'admin',
        action: 'READ',
        entity: 'DOCUMENT',
        entityId: 'doc-001',
        description: 'Read',
        descriptionRo: 'Citit',
      });

      // Manually set retention to past
      const stored = service.getEntry(entry.id);
      (stored as any).retentionUntil = new Date(Date.now() - 1000);

      const cleaned = service.cleanupExpiredEntries();
      expect(cleaned).toBe(1);
    });

    it('should emit cleanup event', () => {
      const entry = service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userName: 'John',
        userEmail: 'john@test.com',
        userRole: 'admin',
        action: 'READ',
        entity: 'DOCUMENT',
        entityId: 'doc-002',
        description: 'Read',
        descriptionRo: 'Citit',
      });

      const stored = service.getEntry(entry.id);
      (stored as any).retentionUntil = new Date(Date.now() - 1000);

      service.cleanupExpiredEntries();
      expect(eventEmitter.emit).toHaveBeenCalledWith('audit.cleanup.completed', expect.any(Object));
    });
  });

  describe('Compliance', () => {
    it('should check compliance status', () => {
      const status = service.getComplianceStatus('tenant-1');
      expect(status.compliant).toBeDefined();
      expect(status.retentionCompliance).toBeDefined();
      expect(status.criticalEventsCovered).toBeDefined();
    });

    it('should report compliance issues', () => {
      const status = service.getComplianceStatus('tenant-1');
      expect(Array.isArray(status.issues)).toBe(true);
    });

    it('should have bilingual issue messages', () => {
      const status = service.getComplianceStatus('tenant-1');
      status.issues.forEach((issue) => {
        expect(issue.message).toBeDefined();
        expect(issue.messageRo).toBeDefined();
      });
    });
  });

  describe('Available Actions', () => {
    it('should get available actions', () => {
      const actions = service.getAvailableActions();
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should have bilingual labels', () => {
      const actions = service.getAvailableActions();
      actions.forEach((a) => {
        expect(a.label).toBeDefined();
        expect(a.labelRo).toBeDefined();
      });
    });

    it('should include CRUD actions', () => {
      const actions = service.getAvailableActions();
      expect(actions.some((a) => a.action === 'CREATE')).toBe(true);
      expect(actions.some((a) => a.action === 'READ')).toBe(true);
      expect(actions.some((a) => a.action === 'UPDATE')).toBe(true);
      expect(actions.some((a) => a.action === 'DELETE')).toBe(true);
    });

    it('should include auth actions', () => {
      const actions = service.getAvailableActions();
      expect(actions.some((a) => a.action === 'LOGIN')).toBe(true);
      expect(actions.some((a) => a.action === 'LOGOUT')).toBe(true);
    });
  });

  describe('Available Entities', () => {
    it('should get available entities', () => {
      const entities = service.getAvailableEntities();
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should have bilingual labels', () => {
      const entities = service.getAvailableEntities();
      entities.forEach((e) => {
        expect(e.label).toBeDefined();
        expect(e.labelRo).toBeDefined();
      });
    });

    it('should include core entities', () => {
      const entities = service.getAvailableEntities();
      expect(entities.some((e) => e.entity === 'USER')).toBe(true);
      expect(entities.some((e) => e.entity === 'INVOICE')).toBe(true);
      expect(entities.some((e) => e.entity === 'CLIENT')).toBe(true);
    });

    it('should include ANAF entity', () => {
      const entities = service.getAvailableEntities();
      expect(entities.some((e) => e.entity === 'ANAF_SUBMISSION')).toBe(true);
    });
  });

  describe('Audit Actions', () => {
    const actions: AuditAction[] = [
      'CREATE', 'READ', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE',
      'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'EXPORT', 'IMPORT', 'PRINT', 'DOWNLOAD',
      'APPROVE', 'REJECT', 'SUBMIT', 'SIGN', 'SEND', 'CANCEL', 'VOID'
    ];

    actions.forEach((action) => {
      it(`should log ${action} action`, () => {
        const entry = service.log({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userName: 'John',
          userEmail: 'john@test.com',
          userRole: 'admin',
          action,
          entity: 'DOCUMENT',
          entityId: 'doc-001',
          description: `${action} action`,
          descriptionRo: `Acțiune ${action}`,
        });

        expect(entry.action).toBe(action);
      });
    });
  });

  describe('Audit Entities', () => {
    const entities: AuditEntity[] = [
      'USER', 'CLIENT', 'INVOICE', 'PRODUCT', 'EMPLOYEE', 'DOCUMENT',
      'TRANSACTION', 'PAYMENT', 'REPORT', 'SETTING', 'WEBHOOK', 'TEMPLATE',
      'ANAF_SUBMISSION', 'SAGA_SYNC', 'MIGRATION', 'NOTIFICATION'
    ];

    entities.forEach((entity) => {
      it(`should log ${entity} entity`, () => {
        const entry = service.log({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userName: 'John',
          userEmail: 'john@test.com',
          userRole: 'admin',
          action: 'CREATE',
          entity,
          entityId: `${entity.toLowerCase()}-001`,
          description: `Created ${entity}`,
          descriptionRo: `Creat ${entity}`,
        });

        expect(entry.entity).toBe(entity);
      });
    });
  });
});
