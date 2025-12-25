import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchemaIsolationService, TenantSchemaSettings } from './schema-isolation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SchemaIsolationService', () => {
  let service: SchemaIsolationService;

  const mockPrismaService = {
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        DATABASE_URL: 'postgresql://localhost/test',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchemaIsolationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SchemaIsolationService>(SchemaIsolationService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTenantSchema', () => {
    it('should create a new tenant schema', async () => {
      const result = await service.createTenantSchema(
        'tenant-123',
        'Test Company',
        'EU',
      );

      expect(result.success).toBe(true);
      expect(result.schemaName).toContain('tenant_');
      expect(result.tablesCreated).toBeGreaterThan(0);
    });

    it('should reject duplicate tenant schema', async () => {
      await service.createTenantSchema('tenant-dup', 'Company 1', 'EU');
      const result = await service.createTenantSchema('tenant-dup', 'Company 2', 'EU');

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should apply custom settings', async () => {
      const settings: Partial<TenantSchemaSettings> = {
        maxUsers: 50,
        maxStorage: 512,
        dataRetentionDays: 180,
      };

      const result = await service.createTenantSchema(
        'tenant-custom',
        'Custom Company',
        'EU',
        settings,
      );

      expect(result.success).toBe(true);

      const schema = await service.getTenantSchema('tenant-custom');
      expect(schema?.settings.maxUsers).toBe(50);
      expect(schema?.settings.maxStorage).toBe(512);
      expect(schema?.settings.dataRetentionDays).toBe(180);
    });
  });

  describe('getTenantSchema', () => {
    it('should return schema for existing tenant', async () => {
      await service.createTenantSchema('tenant-get', 'Get Company', 'EU');
      const schema = await service.getTenantSchema('tenant-get');

      expect(schema).not.toBeNull();
      expect(schema?.displayName).toBe('Get Company');
      expect(schema?.region).toBe('EU');
    });

    it('should return null for non-existent tenant', async () => {
      const schema = await service.getTenantSchema('non-existent');
      expect(schema).toBeNull();
    });
  });

  describe('getSchemaName', () => {
    it('should return correct schema name for tenant', async () => {
      await service.createTenantSchema('my-tenant', 'My Company', 'EU');
      const schemaName = service.getSchemaName('my-tenant');

      expect(schemaName).toBe('tenant_my_tenant');
    });

    it('should return public for unknown tenant', () => {
      const schemaName = service.getSchemaName('unknown');
      expect(schemaName).toBe('public');
    });
  });

  describe('listTenantSchemas', () => {
    it('should list all tenant schemas', async () => {
      await service.createTenantSchema('list-1', 'Company 1', 'EU');
      await service.createTenantSchema('list-2', 'Company 2', 'US');

      const schemas = await service.listTenantSchemas();
      expect(schemas.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by region', async () => {
      await service.createTenantSchema('region-eu', 'EU Company', 'EU');
      await service.createTenantSchema('region-us', 'US Company', 'US');

      const euSchemas = await service.listTenantSchemas({ region: 'EU' });
      expect(euSchemas.every(s => s.region === 'EU')).toBe(true);
    });

    it('should filter by status', async () => {
      await service.createTenantSchema('status-active', 'Active Co', 'EU');
      await service.updateSchemaStatus('status-active', 'suspended');

      const activeSchemas = await service.listTenantSchemas({ status: 'active' });
      const found = activeSchemas.find(s => s.tenantId === 'status-active');
      expect(found).toBeUndefined();
    });
  });

  describe('updateSchemaSettings', () => {
    it('should update schema settings', async () => {
      await service.createTenantSchema('update-settings', 'Settings Co', 'EU');

      const updated = await service.updateSchemaSettings('update-settings', {
        maxUsers: 200,
        backupEnabled: false,
      });

      expect(updated?.settings.maxUsers).toBe(200);
      expect(updated?.settings.backupEnabled).toBe(false);
    });

    it('should return null for non-existent tenant', async () => {
      const result = await service.updateSchemaSettings('no-tenant', {});
      expect(result).toBeNull();
    });
  });

  describe('updateSchemaStatus', () => {
    it('should update schema status', async () => {
      await service.createTenantSchema('status-test', 'Status Co', 'EU');

      const updated = await service.updateSchemaStatus('status-test', 'suspended');
      expect(updated?.status).toBe('suspended');
    });
  });

  describe('archiveTenantSchema', () => {
    it('should archive tenant schema', async () => {
      await service.createTenantSchema('archive-test', 'Archive Co', 'EU');

      const result = await service.archiveTenantSchema('archive-test');
      expect(result).toBe(true);

      const schema = await service.getTenantSchema('archive-test');
      expect(schema?.status).toBe('archived');
    });

    it('should return false for non-existent tenant', async () => {
      const result = await service.archiveTenantSchema('no-tenant');
      expect(result).toBe(false);
    });
  });

  describe('deleteTenantSchema', () => {
    it('should delete tenant schema', async () => {
      await service.createTenantSchema('delete-test', 'Delete Co', 'EU');

      const result = await service.deleteTenantSchema('delete-test');
      expect(result).toBe(true);

      const schema = await service.getTenantSchema('delete-test');
      expect(schema).toBeNull();
    });

    it('should not delete public schema', async () => {
      const result = await service.deleteTenantSchema('public');
      expect(result).toBe(false);
    });
  });

  describe('migrateSchema', () => {
    it('should migrate schema to new version', async () => {
      await service.createTenantSchema('migrate-test', 'Migrate Co', 'EU');

      const status = await service.migrateSchema('migrate-test', '2.0.0');

      expect(status.targetVersion).toBe('2.0.0');
      expect(status.status).toBe('completed');
      expect(status.progress).toBe(100);
    });

    it('should throw for non-existent tenant', async () => {
      await expect(service.migrateSchema('no-tenant', '2.0.0')).rejects.toThrow();
    });
  });

  describe('getMigrationStatus', () => {
    it('should return migration status', async () => {
      await service.createTenantSchema('migration-status', 'Status Co', 'EU');
      await service.migrateSchema('migration-status', '2.0.0');

      const status = service.getMigrationStatus('migration-status');
      expect(status).not.toBeNull();
      expect(status?.status).toBe('completed');
    });
  });

  describe('getSchemaStats', () => {
    it('should return schema statistics', async () => {
      await service.createTenantSchema('stats-test', 'Stats Co', 'EU');

      const stats = await service.getSchemaStats('stats-test');
      expect(stats.tableCount).toBeGreaterThan(0);
    });
  });

  describe('validateCapacity', () => {
    it('should validate user capacity', async () => {
      await service.createTenantSchema('capacity-test', 'Capacity Co', 'EU', {
        maxUsers: 10,
      });

      const result = await service.validateCapacity('capacity-test', 'users', 5);
      expect(result.allowed).toBe(true);
    });

    it('should reject exceeding capacity', async () => {
      await service.createTenantSchema('over-capacity', 'Over Co', 'EU', {
        maxUsers: 5,
      });

      const result = await service.validateCapacity('over-capacity', 'users', 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit exceeded');
    });
  });

  describe('cloneSchema', () => {
    it('should clone schema to new tenant', async () => {
      await service.createTenantSchema('source-clone', 'Source Co', 'EU', {
        maxUsers: 50,
      });

      const result = await service.cloneSchema('source-clone', 'target-clone', false);

      expect(result.success).toBe(true);

      const cloned = await service.getTenantSchema('target-clone');
      expect(cloned?.settings.maxUsers).toBe(50);
    });
  });
});
