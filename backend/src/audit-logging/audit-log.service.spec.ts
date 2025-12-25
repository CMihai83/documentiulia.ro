import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditLogService,
  CreateAuditEntryDto,
  AuditAction,
  AuditCategory,
  EntityType,
} from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  describe('Basic Logging', () => {
    it('should create audit entry', async () => {
      const dto: CreateAuditEntryDto = {
        action: 'CREATE',
        category: 'DATA_MODIFICATION',
        entityType: 'INVOICE',
        entityId: 'inv-001',
        entityName: 'F2025-0001',
        userId: 'user-1',
        userName: 'Ion Popescu',
        organizationId: 'org-1',
        description: 'Created invoice F2025-0001',
        descriptionRo: 'Creat factură F2025-0001',
      };

      const entry = await service.log(dto);

      expect(entry.id).toMatch(/^audit-/);
      expect(entry.action).toBe('CREATE');
      expect(entry.entityType).toBe('INVOICE');
      expect(entry.success).toBe(true);
    });

    it('should emit audit.logged event', async () => {
      await service.log({
        action: 'READ',
        category: 'DATA_ACCESS',
        entityType: 'CUSTOMER',
        entityId: 'cust-001',
        userId: 'user-1',
        userName: 'Ion Popescu',
        organizationId: 'org-1',
        description: 'Read customer data',
        descriptionRo: 'Citit date client',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.logged', expect.any(Object));
    });

    it('should emit alert for high severity', async () => {
      await service.logLogin('user-1', 'Ion Popescu', 'org-1', false, '192.168.1.1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.alert', expect.any(Object));
    });

    it('should determine correct severity for failed actions', async () => {
      const entry = await service.log({
        action: 'DELETE',
        category: 'DATA_MODIFICATION',
        entityType: 'INVOICE',
        entityId: 'inv-001',
        userId: 'user-1',
        userName: 'Ion Popescu',
        organizationId: 'org-1',
        description: 'Failed to delete invoice',
        descriptionRo: 'Eșuat la ștergere factură',
        success: false,
        errorMessage: 'Permission denied',
      });

      expect(entry.success).toBe(false);
      expect(entry.severity).toBe('MEDIUM');
    });

    it('should track old and new values', async () => {
      const entry = await service.log({
        action: 'UPDATE',
        category: 'DATA_MODIFICATION',
        entityType: 'CUSTOMER',
        entityId: 'cust-001',
        userId: 'user-1',
        userName: 'Ion Popescu',
        organizationId: 'org-1',
        description: 'Updated customer',
        descriptionRo: 'Actualizat client',
        oldValue: { name: 'Old Name', email: 'old@example.com' },
        newValue: { name: 'New Name', email: 'old@example.com' },
      });

      expect(entry.oldValue).toBeDefined();
      expect(entry.newValue).toBeDefined();
      expect(entry.changedFields).toContain('name');
      expect(entry.changedFields).not.toContain('email');
    });

    it('should track metadata', async () => {
      const entry = await service.log({
        action: 'EXPORT',
        category: 'DATA_ACCESS',
        entityType: 'INVOICE',
        entityId: 'export-001',
        userId: 'user-1',
        userName: 'Ion Popescu',
        organizationId: 'org-1',
        description: 'Exported invoices',
        descriptionRo: 'Exportat facturi',
        metadata: { recordCount: 100, format: 'CSV' },
      });

      expect(entry.metadata).toEqual({ recordCount: 100, format: 'CSV' });
    });
  });

  describe('Convenience Logging Methods', () => {
    it('should log successful login', async () => {
      const entry = await service.logLogin('user-1', 'Ion Popescu', 'org-1', true, '192.168.1.1', 'Mozilla/5.0');

      expect(entry.action).toBe('LOGIN');
      expect(entry.category).toBe('AUTHENTICATION');
      expect(entry.success).toBe(true);
      expect(entry.ipAddress).toBe('192.168.1.1');
    });

    it('should log failed login', async () => {
      const entry = await service.logLogin('user-1', 'Ion Popescu', 'org-1', false, '192.168.1.1', undefined, 'Invalid password');

      expect(entry.action).toBe('FAILED_LOGIN');
      expect(entry.success).toBe(false);
      expect(entry.errorMessage).toBe('Invalid password');
    });

    it('should log logout', async () => {
      const entry = await service.logLogout('user-1', 'Ion Popescu', 'org-1', 'session-123');

      expect(entry.action).toBe('LOGOUT');
      expect(entry.sessionId).toBe('session-123');
    });

    it('should log create action', async () => {
      const entry = await service.logCreate('INVOICE', 'inv-001', 'F2025-0001', 'user-1', 'Ion Popescu', 'org-1', { amount: 1000 });

      expect(entry.action).toBe('CREATE');
      expect(entry.entityType).toBe('INVOICE');
      expect(entry.newValue).toEqual({ amount: 1000 });
      expect(entry.descriptionRo).toContain('factură');
    });

    it('should log update action', async () => {
      const entry = await service.logUpdate(
        'CUSTOMER',
        'cust-001',
        'SC Example SRL',
        'user-1',
        'Ion Popescu',
        'org-1',
        { name: 'Old Name' },
        { name: 'New Name' }
      );

      expect(entry.action).toBe('UPDATE');
      expect(entry.oldValue).toBeDefined();
      expect(entry.newValue).toBeDefined();
      expect(entry.descriptionRo).toContain('client');
    });

    it('should log delete action', async () => {
      const entry = await service.logDelete('PRODUCT', 'prod-001', 'Product A', 'user-1', 'Ion Popescu', 'org-1');

      expect(entry.action).toBe('DELETE');
      expect(entry.descriptionRo).toContain('produs');
    });

    it('should log export action', async () => {
      const entry = await service.logExport('INVOICE', 'user-1', 'Ion Popescu', 'org-1', 100, 'CSV');

      expect(entry.action).toBe('EXPORT');
      expect(entry.metadata!.recordCount).toBe(100);
      expect(entry.metadata!.format).toBe('CSV');
    });

    it('should log ANAF submission', async () => {
      const entry = await service.logANAFSubmission('e-Factura', 'efact-001', 'user-1', 'Ion Popescu', 'org-1', true, '1234567890');

      expect(entry.action).toBe('SUBMIT');
      expect(entry.category).toBe('COMPLIANCE');
      expect(entry.entityType).toBe('ANAF_SUBMISSION');
      expect(entry.metadata!.documentType).toBe('e-Factura');
    });

    it('should log permission grant', async () => {
      const entry = await service.logPermissionChange('target-user', 'Maria Ionescu', 'ADMIN', 'GRANT', 'user-1', 'Ion Popescu', 'org-1');

      expect(entry.action).toBe('GRANT');
      expect(entry.category).toBe('AUTHORIZATION');
      expect(entry.descriptionRo).toContain('Acordat');
    });

    it('should log permission revoke', async () => {
      const entry = await service.logPermissionChange('target-user', 'Maria Ionescu', 'ADMIN', 'REVOKE', 'user-1', 'Ion Popescu', 'org-1');

      expect(entry.action).toBe('REVOKE');
      expect(entry.descriptionRo).toContain('Revocat');
    });

    it('should log password change', async () => {
      const entry = await service.logPasswordChange('user-1', 'Ion Popescu', 'org-1', false);

      expect(entry.action).toBe('PASSWORD_CHANGE');
      expect(entry.category).toBe('SECURITY');
    });

    it('should log password reset', async () => {
      const entry = await service.logPasswordChange('user-1', 'Ion Popescu', 'org-1', true);

      expect(entry.action).toBe('PASSWORD_RESET');
    });
  });

  describe('Entry Retrieval', () => {
    it('should get entry by ID', async () => {
      const created = await service.log({
        action: 'CREATE',
        category: 'DATA_MODIFICATION',
        entityType: 'INVOICE',
        entityId: 'inv-001',
        userId: 'user-1',
        userName: 'Ion Popescu',
        organizationId: 'org-1',
        description: 'Created invoice',
        descriptionRo: 'Creat factură',
      });

      const retrieved = await service.getEntry(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent entry', async () => {
      const entry = await service.getEntry('non-existent');
      expect(entry).toBeNull();
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      await service.logLogin('user-1', 'Ion Popescu', 'org-1', true);
      await service.logCreate('INVOICE', 'inv-001', 'F2025-0001', 'user-1', 'Ion Popescu', 'org-1');
      await service.logUpdate('CUSTOMER', 'cust-001', 'SC Example', 'user-2', 'Maria Ionescu', 'org-1');
      await service.logDelete('PRODUCT', 'prod-001', 'Product A', 'user-1', 'Ion Popescu', 'org-1');
    });

    it('should search by organization', async () => {
      const { entries } = await service.search({ organizationId: 'org-1' });

      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every(e => e.organizationId === 'org-1')).toBe(true);
    });

    it('should filter by action', async () => {
      const { entries } = await service.search({ organizationId: 'org-1', action: 'LOGIN' });

      expect(entries.every(e => e.action === 'LOGIN')).toBe(true);
    });

    it('should filter by category', async () => {
      const { entries } = await service.search({ organizationId: 'org-1', category: 'AUTHENTICATION' });

      expect(entries.every(e => e.category === 'AUTHENTICATION')).toBe(true);
    });

    it('should filter by entityType', async () => {
      const { entries } = await service.search({ organizationId: 'org-1', entityType: 'INVOICE' });

      expect(entries.every(e => e.entityType === 'INVOICE')).toBe(true);
    });

    it('should filter by userId', async () => {
      const { entries } = await service.search({ organizationId: 'org-1', userId: 'user-1' });

      expect(entries.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should filter by success', async () => {
      const { entries } = await service.search({ organizationId: 'org-1', success: true });

      expect(entries.every(e => e.success === true)).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const from = new Date(now.getTime() - 3600000); // 1 hour ago
      const to = new Date(now.getTime() + 3600000); // 1 hour from now

      const { entries } = await service.search({ organizationId: 'org-1', from, to });

      expect(entries.length).toBeGreaterThan(0);
    });

    it('should search by term', async () => {
      const { entries } = await service.search({ organizationId: 'org-1', searchTerm: 'Ion' });

      expect(entries.every(e => e.userName.includes('Ion') || e.description.includes('Ion'))).toBe(true);
    });

    it('should paginate results', async () => {
      const page1 = await service.search({ organizationId: 'org-1', page: 1, limit: 2 });
      const page2 = await service.search({ organizationId: 'org-1', page: 2, limit: 2 });

      expect(page1.entries).toHaveLength(2);
      expect(page2.entries.length).toBeGreaterThanOrEqual(1);
    });

    it('should sort by timestamp DESC by default', async () => {
      const { entries } = await service.search({ organizationId: 'org-1' });

      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(entries[i].timestamp.getTime());
      }
    });

    it('should sort by timestamp ASC when specified', async () => {
      const { entries } = await service.search({ organizationId: 'org-1', sortOrder: 'ASC' });

      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].timestamp.getTime()).toBeLessThanOrEqual(entries[i].timestamp.getTime());
      }
    });
  });

  describe('Entity History', () => {
    it('should get history for entity', async () => {
      await service.logCreate('INVOICE', 'inv-001', 'F2025-0001', 'user-1', 'Ion Popescu', 'org-1');
      await service.logUpdate('INVOICE', 'inv-001', 'F2025-0001', 'user-1', 'Ion Popescu', 'org-1');

      const history = await service.getEntityHistory('INVOICE', 'inv-001', 'org-1');

      expect(history.length).toBe(2);
      // Both CREATE and UPDATE should be present
      const actions = history.map(h => h.action);
      expect(actions).toContain('CREATE');
      expect(actions).toContain('UPDATE');
    });
  });

  describe('User Activity', () => {
    it('should get user activity', async () => {
      await service.logLogin('user-1', 'Ion Popescu', 'org-1', true);
      await service.logCreate('INVOICE', 'inv-001', 'F2025-0001', 'user-1', 'Ion Popescu', 'org-1');

      const activity = await service.getUserActivity('user-1', 'org-1');

      expect(activity.length).toBe(2);
      expect(activity.every(e => e.userId === 'user-1')).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.logLogin('user-1', 'Ion Popescu', 'org-1', true);
      await service.logLogin('user-2', 'Maria Ionescu', 'org-1', true);
      await service.logCreate('INVOICE', 'inv-001', 'F2025-0001', 'user-1', 'Ion Popescu', 'org-1');
      await service.logUpdate('CUSTOMER', 'cust-001', 'SC Example', 'user-1', 'Ion Popescu', 'org-1');
      await service.logExport('INVOICE', 'user-1', 'Ion Popescu', 'org-1', 100, 'CSV');
    });

    it('should calculate total entries', async () => {
      const stats = await service.getStats('org-1');

      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it('should count entries by action', async () => {
      const stats = await service.getStats('org-1');

      expect(stats.entriesByAction.LOGIN).toBeGreaterThan(0);
      expect(stats.entriesByAction.CREATE).toBeGreaterThan(0);
    });

    it('should count entries by category', async () => {
      const stats = await service.getStats('org-1');

      expect(stats.entriesByCategory.AUTHENTICATION).toBeGreaterThan(0);
    });

    it('should count entries by severity', async () => {
      const stats = await service.getStats('org-1');

      expect(stats.entriesBySeverity).toBeDefined();
    });

    it('should list top users', async () => {
      const stats = await service.getStats('org-1');

      expect(stats.entriesByUser.length).toBeGreaterThan(0);
      expect(stats.entriesByUser[0].count).toBeGreaterThan(0);
    });

    it('should calculate success rate', async () => {
      const stats = await service.getStats('org-1');

      expect(stats.successRate).toBeGreaterThan(0);
    });
  });

  describe('Compliance Report', () => {
    beforeEach(async () => {
      await service.logLogin('user-1', 'Ion Popescu', 'org-1', true);
      await service.logLogin('user-1', 'Ion Popescu', 'org-1', false);
      await service.logCreate('EMPLOYEE', 'emp-001', 'New Employee', 'user-1', 'Ion Popescu', 'org-1');
      await service.logExport('INVOICE', 'user-1', 'Ion Popescu', 'org-1', 100, 'CSV');
      await service.logPermissionChange('user-2', 'Maria', 'ADMIN', 'GRANT', 'user-1', 'Ion Popescu', 'org-1');
    });

    it('should generate compliance report', async () => {
      const from = new Date(Date.now() - 3600000);
      const to = new Date();

      const report = await service.generateComplianceReport('org-1', from, to);

      expect(report.organizationId).toBe('org-1');
      expect(report.summary.totalActions).toBeGreaterThan(0);
      expect(report.userActivity.length).toBeGreaterThan(0);
    });

    it('should include failed login attempts', async () => {
      const from = new Date(Date.now() - 3600000);
      const to = new Date();

      const report = await service.generateComplianceReport('org-1', from, to);

      expect(report.failedLoginAttempts.length).toBeGreaterThan(0);
    });

    it('should include sensitive data access', async () => {
      const from = new Date(Date.now() - 3600000);
      const to = new Date();

      const report = await service.generateComplianceReport('org-1', from, to);

      expect(report.sensitiveDataAccess.length).toBeGreaterThan(0);
    });

    it('should include permission changes', async () => {
      const from = new Date(Date.now() - 3600000);
      const to = new Date();

      const report = await service.generateComplianceReport('org-1', from, to);

      expect(report.permissionChanges.length).toBeGreaterThan(0);
    });

    it('should include data exports', async () => {
      const from = new Date(Date.now() - 3600000);
      const to = new Date();

      const report = await service.generateComplianceReport('org-1', from, to);

      expect(report.dataExports.length).toBeGreaterThan(0);
    });
  });

  describe('Retention Policies', () => {
    it('should get default retention policies', async () => {
      const policies = await service.getRetentionPolicies();

      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some(p => p.category === 'AUTHENTICATION')).toBe(true);
      expect(policies.some(p => p.category === 'FINANCIAL')).toBe(true);
    });

    it('should update retention policy', async () => {
      const policies = await service.getRetentionPolicies();
      const policy = policies[0];

      const updated = await service.updateRetentionPolicy(policy.id, { retentionDays: 180 });

      expect(updated.retentionDays).toBe(180);
    });

    it('should throw when updating non-existent policy', async () => {
      await expect(service.updateRetentionPolicy('non-existent', { retentionDays: 180 }))
        .rejects.toThrow('Policy not found');
    });

    it('should apply retention policies', async () => {
      const result = await service.applyRetentionPolicies();

      expect(result).toHaveProperty('archived');
      expect(result).toHaveProperty('deleted');
    });

    it('should have Romanian names for policies', async () => {
      const policies = await service.getRetentionPolicies();

      for (const policy of policies) {
        expect(policy.nameRo).toBeDefined();
      }
    });
  });

  describe('Metadata', () => {
    it('should list all actions', async () => {
      const actions = await service.getActions();

      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContainEqual(expect.objectContaining({ action: 'CREATE' }));
      expect(actions).toContainEqual(expect.objectContaining({ action: 'LOGIN' }));
    });

    it('should have Romanian names for actions', async () => {
      const actions = await service.getActions();

      for (const action of actions) {
        expect(action.nameRo).toBeDefined();
      }
    });

    it('should list all categories', async () => {
      const categories = await service.getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContainEqual(expect.objectContaining({ category: 'AUTHENTICATION' }));
      expect(categories).toContainEqual(expect.objectContaining({ category: 'COMPLIANCE' }));
    });

    it('should have Romanian names for categories', async () => {
      const categories = await service.getCategories();

      for (const cat of categories) {
        expect(cat.nameRo).toBeDefined();
      }
    });

    it('should list all entity types', async () => {
      const types = await service.getEntityTypes();

      expect(types.length).toBeGreaterThan(0);
      expect(types).toContainEqual(expect.objectContaining({ type: 'INVOICE' }));
      expect(types).toContainEqual(expect.objectContaining({ type: 'ANAF_SUBMISSION' }));
    });

    it('should have Romanian names for entity types', async () => {
      const types = await service.getEntityTypes();

      for (const type of types) {
        expect(type.nameRo).toBeDefined();
      }
    });
  });

  describe('Romanian Localization', () => {
    it('should use Romanian descriptions in entries', async () => {
      const entry = await service.logCreate('INVOICE', 'inv-001', 'F2025-0001', 'user-1', 'Ion Popescu', 'org-1');

      expect(entry.descriptionRo).toContain('factură');
    });

    it('should translate entity types to Romanian', async () => {
      const entry = await service.logCreate('CUSTOMER', 'cust-001', 'SC Example', 'user-1', 'Ion Popescu', 'org-1');

      expect(entry.descriptionRo).toContain('client');
    });

    it('should use Romanian for ANAF submissions', async () => {
      const entry = await service.logANAFSubmission('e-Factura', 'efact-001', 'user-1', 'Ion Popescu', 'org-1', true);

      expect(entry.descriptionRo).toContain('ANAF');
    });

    it('should use Romanian diacritics correctly', async () => {
      const categories = await service.getCategories();
      const actions = await service.getActions();
      const entityTypes = await service.getEntityTypes();

      // Check for Romanian diacritics in categories (ă in Factură, Plată)
      expect(categories.some(c => c.nameRo.includes('ă'))).toBe(true);
      // Check for Romanian diacritics in actions (Ș in Ștergere, ă in Tipărire)
      expect(actions.some(a => a.nameRo.includes('Ș') || a.nameRo.includes('ă'))).toBe(true);
      // Check for Romanian diacritics in entity types (ț in Organizație)
      expect(entityTypes.some(e => e.nameRo.includes('ț'))).toBe(true);
    });
  });

  describe('Security Events', () => {
    it('should log security events with high severity', async () => {
      const entry = await service.logLogin('user-1', 'Ion Popescu', 'org-1', false);

      expect(entry.severity).toBe('HIGH');
    });

    it('should emit alert for security events', async () => {
      await service.logPasswordChange('user-1', 'Ion Popescu', 'org-1', true);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.alert', expect.any(Object));
    });
  });

  describe('ANAF Compliance', () => {
    it('should track e-Factura submissions', async () => {
      const entry = await service.logANAFSubmission('e-Factura', 'efact-001', 'user-1', 'Ion Popescu', 'org-1', true, '1234567890');

      expect(entry.category).toBe('COMPLIANCE');
      expect(entry.metadata!.documentType).toBe('e-Factura');
      expect(entry.metadata!.indexNumber).toBe('1234567890');
    });

    it('should track SAF-T submissions', async () => {
      const entry = await service.logANAFSubmission('SAF-T', 'saft-001', 'user-1', 'Ion Popescu', 'org-1', true, '9876543210');

      expect(entry.category).toBe('COMPLIANCE');
      expect(entry.metadata!.documentType).toBe('SAF-T');
    });

    it('should track failed ANAF submissions', async () => {
      const entry = await service.logANAFSubmission('e-Factura', 'efact-002', 'user-1', 'Ion Popescu', 'org-1', false, undefined, 'Invalid XML format');

      expect(entry.success).toBe(false);
      expect(entry.errorMessage).toBe('Invalid XML format');
    });
  });
});
