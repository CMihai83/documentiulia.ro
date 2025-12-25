import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  DataIsolationService,
  TenantContext,
} from './data-isolation.service';

describe('DataIsolationService', () => {
  let service: DataIsolationService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataIsolationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DataIsolationService>(DataIsolationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Sample data
  const sampleTenantContext: TenantContext = {
    tenantId: 'tenant-123',
    userId: 'user-456',
    role: 'admin',
    permissions: ['read', 'write'],
    sessionId: 'session-789',
    timestamp: new Date(),
  };

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default policy', async () => {
      const policy = await service.getTenantPolicy('any-tenant');
      expect(policy).toBeDefined();
    });

    it('should return isolation levels', () => {
      const levels = service.getIsolationLevels();
      expect(levels).toContain('strict');
      expect(levels).toContain('standard');
      expect(levels).toContain('relaxed');
    });

    it('should return data classifications', () => {
      const classifications = service.getDataClassifications();
      expect(classifications).toContain('public');
      expect(classifications).toContain('confidential');
    });
  });

  describe('tenant context', () => {
    it('should set tenant context', () => {
      service.setTenantContext(sampleTenantContext);
      const retrieved = service.getTenantContext(sampleTenantContext.sessionId);
      expect(retrieved?.tenantId).toBe(sampleTenantContext.tenantId);
    });

    it('should validate tenant context', () => {
      service.setTenantContext(sampleTenantContext);
      const valid = service.validateTenantContext(
        sampleTenantContext.sessionId,
        sampleTenantContext.tenantId,
      );
      expect(valid).toBe(true);
    });

    it('should fail validation for wrong tenant', () => {
      service.setTenantContext(sampleTenantContext);
      const valid = service.validateTenantContext(
        sampleTenantContext.sessionId,
        'wrong-tenant',
      );
      expect(valid).toBe(false);
    });

    it('should clear tenant context', () => {
      service.setTenantContext(sampleTenantContext);
      service.clearTenantContext(sampleTenantContext.sessionId);
      const retrieved = service.getTenantContext(sampleTenantContext.sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('isolation policies', () => {
    it('should create policy', async () => {
      const policy = await service.createPolicy(
        'Strict Policy',
        'tenant-123',
        'strict',
      );

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('Strict Policy');
      expect(policy.level).toBe('strict');
    });

    it('should create policy with options', async () => {
      const policy = await service.createPolicy(
        'Custom Policy',
        'tenant-1',
        'standard',
        {
          dataClassifications: ['confidential', 'restricted'],
          encryptionRequired: true,
          retentionDays: 730,
        },
      );

      expect(policy.dataClassifications).toContain('confidential');
      expect(policy.retentionDays).toBe(730);
    });

    it('should get policy by ID', async () => {
      const created = await service.createPolicy('Get Test', 'tenant-1', 'standard');
      const retrieved = await service.getPolicy(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get tenant-specific policy', async () => {
      await service.createPolicy('Tenant Policy', 'tenant-specific', 'strict');
      const policy = await service.getTenantPolicy('tenant-specific');
      expect(policy?.tenantId).toBe('tenant-specific');
    });

    it('should update policy', async () => {
      const policy = await service.createPolicy('Original', 'tenant-1', 'standard');
      const updated = await service.updatePolicy(policy.id, {
        level: 'strict',
        retentionDays: 365,
      });

      expect(updated?.level).toBe('strict');
      expect(updated?.retentionDays).toBe(365);
    });

    it('should delete policy', async () => {
      const policy = await service.createPolicy('To Delete', 'tenant-1', 'standard');
      const success = await service.deletePolicy(policy.id);
      expect(success).toBe(true);
    });

    it('should not delete default policy', async () => {
      const success = await service.deletePolicy('policy-default');
      expect(success).toBe(false);
    });
  });

  describe('access rules', () => {
    it('should create access rule', async () => {
      const policy = await service.createPolicy('Rule Policy', 'tenant-1', 'standard');
      const rule = await service.createAccessRule(
        policy.id,
        '/api/invoices/*',
        'read',
        true,
      );

      expect(rule.id).toBeDefined();
      expect(rule.resource).toBe('/api/invoices/*');
    });

    it('should get access rules for policy', async () => {
      const policy = await service.createPolicy('Rules Policy', 'tenant-1', 'standard');
      await service.createAccessRule(policy.id, '/api/resource1', 'read', true);
      await service.createAccessRule(policy.id, '/api/resource2', 'write', false);

      const rules = await service.getAccessRules(policy.id);
      expect(rules.length).toBe(2);
    });

    it('should delete access rule', async () => {
      const policy = await service.createPolicy('Delete Rule', 'tenant-1', 'standard');
      const rule = await service.createAccessRule(policy.id, '/api/test', 'read', true);

      const success = await service.deleteAccessRule(rule.id);
      expect(success).toBe(true);
    });
  });

  describe('access control', () => {
    it('should allow same-tenant access', async () => {
      const result = await service.checkAccess(
        'tenant-123',
        'user-1',
        '/api/invoices',
        'read',
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny cross-tenant access by default', async () => {
      const result = await service.checkAccess(
        'tenant-123',
        'user-1',
        '/api/invoices',
        'read',
        'different-tenant',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cross-tenant');
    });

    it('should check IP whitelist', async () => {
      await service.createPolicy('IP Policy', 'tenant-ip', 'strict', {
        ipWhitelist: ['192.168.1.100'],
      });

      const result = await service.checkAccess(
        'tenant-ip',
        'user-1',
        '/api/test',
        'read',
        undefined,
        '10.0.0.1',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('IP');
    });

    it('should allow whitelisted IP', async () => {
      await service.createPolicy('Whitelist Policy', 'tenant-white', 'strict', {
        ipWhitelist: ['192.168.1.100'],
      });

      const result = await service.checkAccess(
        'tenant-white',
        'user-1',
        '/api/test',
        'read',
        undefined,
        '192.168.1.100',
      );

      expect(result.allowed).toBe(true);
    });

    it('should log access attempts', async () => {
      await service.checkAccess('tenant-log', 'user-1', '/api/test', 'read');
      await service.checkAccess('tenant-log', 'user-2', '/api/other', 'write');

      const log = await service.getAccessLog('tenant-log');
      expect(log.length).toBe(2);
    });
  });

  describe('cross-tenant requests', () => {
    it('should create cross-tenant request', async () => {
      const request = await service.requestCrossTenantAccess(
        'source-tenant',
        'target-tenant',
        '/api/shared-data',
        'read',
        'user-1',
        'Need access for reporting',
      );

      expect(request.id).toBeDefined();
      expect(request.status).toBe('pending');
    });

    it('should approve cross-tenant request', async () => {
      const request = await service.requestCrossTenantAccess(
        'source',
        'target',
        '/api/data',
        'read',
        'user-1',
        'Business need',
      );

      const approved = await service.approveCrossTenantRequest(request.id, 'admin-1');

      expect(approved?.status).toBe('approved');
      expect(approved?.approvedBy).toBe('admin-1');
    });

    it('should reject cross-tenant request', async () => {
      const request = await service.requestCrossTenantAccess(
        'source',
        'target',
        '/api/data',
        'read',
        'user-1',
        'Request reason',
      );

      const rejected = await service.rejectCrossTenantRequest(request.id, 'admin-1');

      expect(rejected?.status).toBe('rejected');
    });

    it('should allow access after approval', async () => {
      const request = await service.requestCrossTenantAccess(
        'source-t',
        'target-t',
        '/api/shared',
        'read',
        'user-1',
        'Approved access',
      );

      await service.approveCrossTenantRequest(request.id, 'admin');

      const result = await service.checkAccess(
        'source-t',
        'user-1',
        '/api/shared',
        'read',
        'target-t',
      );

      expect(result.allowed).toBe(true);
    });

    it('should get pending requests', async () => {
      await service.requestCrossTenantAccess('s1', 'target-pending', '/api/1', 'read', 'u1', 'R1');
      await service.requestCrossTenantAccess('s2', 'target-pending', '/api/2', 'read', 'u2', 'R2');

      const pending = await service.getPendingCrossTenantRequests('target-pending');
      expect(pending.length).toBe(2);
    });
  });

  describe('data encryption', () => {
    it('should create encryption key', async () => {
      const key = await service.createEncryptionKey('tenant-encrypt');

      expect(key.keyId).toBeDefined();
      expect(key.status).toBe('active');
    });

    it('should get encryption key', async () => {
      await service.createEncryptionKey('tenant-get-key');
      const key = await service.getEncryptionKey('tenant-get-key');

      expect(key).toBeDefined();
      expect(key?.status).toBe('active');
    });

    it('should rotate encryption key', async () => {
      await service.createEncryptionKey('tenant-rotate');
      const rotated = await service.rotateEncryptionKey('tenant-rotate');

      expect(rotated?.version).toBeGreaterThanOrEqual(1);
    });

    it('should encrypt and decrypt data', () => {
      const original = 'Sensitive data to encrypt';
      const encrypted = service.encryptData('tenant-1', original);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();

      const decrypted = service.decryptData('tenant-1', encrypted);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertexts for same data', () => {
      const data = 'Same data';
      const encrypted1 = service.encryptData('tenant-1', data);
      const encrypted2 = service.encryptData('tenant-1', data);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
  });

  describe('data masking', () => {
    it('should create masking rule', async () => {
      const rule = await service.createMaskingRule(
        'tenant-mask',
        'email',
        '.*@',
        '***@',
        ['export', 'display'],
      );

      expect(rule.id).toBeDefined();
      expect(rule.field).toBe('email');
    });

    it('should get masking rules', async () => {
      await service.createMaskingRule('tenant-rules', 'phone', '\\d', '*', ['export']);
      await service.createMaskingRule('tenant-rules', 'ssn', '\\d{3}', '***', ['export']);

      const rules = await service.getMaskingRules('tenant-rules');
      expect(rules.length).toBe(2);
    });

    it('should apply masking rules', async () => {
      await service.createMaskingRule(
        'tenant-apply',
        'creditCard',
        '\\d{12}',
        '************',
        ['display'],
      );

      const data = { creditCard: '1234567890123456', name: 'John' };
      const masked = service.applyMasking('tenant-apply', data, 'display');

      expect(masked.creditCard).toContain('************');
      expect(masked.name).toBe('John');
    });

    it('should delete masking rule', async () => {
      const rule = await service.createMaskingRule('tenant-del', 'field', 'pattern', 'repl', ['ctx']);
      const success = await service.deleteMaskingRule(rule.id);
      expect(success).toBe(true);
    });

    it('should mask email', () => {
      const masked = service.maskEmail('john.doe@example.com');
      expect(masked).toContain('***');
      expect(masked).toContain('@example.com');
    });

    it('should mask phone', () => {
      const masked = service.maskPhone('+40 721 123 456');
      expect(masked).toContain('***');
      expect(masked).toContain('3456');
    });

    it('should mask CUI', () => {
      const masked = service.maskCUI('RO12345678');
      expect(masked).toBe('RO***78');
    });

    it('should mask IBAN', () => {
      const masked = service.maskIBAN('RO49AAAA1B31007593840000');
      expect(masked).toBe('RO49****0000');
    });
  });

  describe('row-level security', () => {
    it('should build tenant filter', () => {
      const filter = service.buildTenantFilter('tenant-123');
      expect(filter.OR).toBeDefined();
      expect(filter.OR.length).toBe(3);
    });

    it('should validate tenant ownership', () => {
      const record = { id: '1', tenantId: 'tenant-123', name: 'Test' };
      expect(service.validateTenantOwnership(record, 'tenant-123')).toBe(true);
      expect(service.validateTenantOwnership(record, 'other-tenant')).toBe(false);
    });

    it('should enforce row-level security', () => {
      const records = [
        { id: '1', tenantId: 'tenant-a', data: 'A' },
        { id: '2', tenantId: 'tenant-b', data: 'B' },
        { id: '3', tenantId: 'tenant-a', data: 'A2' },
      ];

      const filtered = service.enforceRowLevelSecurity(records, 'tenant-a');
      expect(filtered.length).toBe(2);
      expect(filtered.every(r => r.tenantId === 'tenant-a')).toBe(true);
    });
  });

  describe('export validation', () => {
    it('should allow valid export', async () => {
      const result = await service.validateExportPermission(
        'tenant-export',
        'user-1',
        'csv',
        'internal',
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny restricted data export', async () => {
      const result = await service.validateExportPermission(
        'tenant-1',
        'user-1',
        'csv',
        'restricted',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('restricted');
    });

    it('should deny invalid format', async () => {
      await service.createPolicy('Format Policy', 'tenant-format', 'standard', {
        allowedExportFormats: ['csv'],
      });

      const result = await service.validateExportPermission(
        'tenant-format',
        'user-1',
        'pdf',
        'internal',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('format');
    });
  });

  describe('statistics', () => {
    it('should get isolation stats', async () => {
      await service.checkAccess('tenant-stats', 'u1', '/api/1', 'read');
      await service.checkAccess('tenant-stats', 'u2', '/api/2', 'write');

      const stats = await service.getIsolationStats('tenant-stats');

      expect(stats.totalAccessAttempts).toBe(2);
      expect(stats.allowedAttempts).toBeGreaterThanOrEqual(0);
    });
  });
});
