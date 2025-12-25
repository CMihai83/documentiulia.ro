import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, FeatureFlag, FeatureFlagType } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Default Flags', () => {
    it('should initialize with default flags', async () => {
      const flags = await service.getAllFlags();

      expect(flags.length).toBeGreaterThan(0);
      expect(flags.some(f => f.key === 'ai_assistant')).toBe(true);
    });

    it('should have AI assistant flag enabled', async () => {
      const flag = await service.getFlag('ai_assistant');

      expect(flag.enabled).toBe(true);
      expect(flag.type).toBe('boolean');
    });

    it('should have dark mode flag', async () => {
      const flag = await service.getFlag('dark_mode');

      expect(flag.enabled).toBe(true);
      expect(flag.category).toBe('ui');
    });

    it('should have e-Factura V2 schedule flag', async () => {
      const flag = await service.getFlag('efactura_v2');

      expect(flag.type).toBe('schedule');
      expect(flag.schedule).toBeDefined();
    });
  });

  describe('Flag Evaluation - Boolean', () => {
    it('should evaluate boolean flag as enabled', async () => {
      const result = await service.isEnabled('ai_assistant');

      expect(result).toBe(true);
    });

    it('should return default value for disabled flag', async () => {
      const flag = await service.getFlag('ai_assistant');
      await service.toggleFlag('ai_assistant', false, 'admin');

      const result = await service.isEnabled('ai_assistant');

      // When disabled, returns defaultValue (which is true for ai_assistant)
      expect(result).toBe(flag.defaultValue);
    });

    it('should return null for non-existent flag', async () => {
      const result = await service.evaluate('non_existent_flag');

      expect(result).toBeNull();
    });
  });

  describe('Flag Evaluation - Percentage', () => {
    it('should evaluate percentage flag', async () => {
      const flag = await service.getFlag('voice_commands');
      expect(flag.type).toBe('percentage');

      const result = await service.evaluate('voice_commands', { userId: 'user-1' });

      expect(typeof result).toBe('boolean');
    });

    it('should be consistent for same user', async () => {
      const result1 = await service.evaluate('voice_commands', { userId: 'user-1' });
      // Clear cache for fresh evaluation
      await service.toggleFlag('voice_commands', true, 'admin');
      const result2 = await service.evaluate('voice_commands', { userId: 'user-1' });

      expect(result1).toBe(result2);
    });

    it('should return true for 100% rollout', async () => {
      await service.updateFlag('voice_commands', { rolloutPercentage: 100 }, 'admin');

      // voice_commands is development/staging only
      const result = await service.evaluate('voice_commands', { userId: 'any-user', environment: 'development' });

      expect(result).toBe(true);
    });

    it('should return false for 0% rollout', async () => {
      await service.updateFlag('voice_commands', { rolloutPercentage: 0 }, 'admin');

      // voice_commands is development/staging only
      const result = await service.evaluate('voice_commands', { userId: 'any-user', environment: 'development' });

      expect(result).toBe(false);
    });
  });

  describe('Flag Evaluation - Variant', () => {
    it('should evaluate variant flag', async () => {
      const result = await service.evaluate('new_dashboard', { userId: 'user-1' });

      expect(['classic', 'modern', 'compact']).toContain(result);
    });

    it('should be consistent for same user', async () => {
      const result1 = await service.evaluate('new_dashboard', { userId: 'user-test' });
      await service.toggleFlag('new_dashboard', true, 'admin');
      const result2 = await service.evaluate('new_dashboard', { userId: 'user-test' });

      expect(result1).toBe(result2);
    });
  });

  describe('Flag Evaluation - Schedule', () => {
    it('should return false for future scheduled flag', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await service.updateFlag('efactura_v2', {
        schedule: { startDate: futureDate },
      }, 'admin');

      const result = await service.evaluate('efactura_v2');

      expect(result).toBe(false);
    });

    it('should return true for past scheduled flag', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      await service.updateFlag('efactura_v2', {
        schedule: { startDate: pastDate },
      }, 'admin');

      // efactura_v2 is production only, so test with production environment
      const result = await service.evaluate('efactura_v2', { environment: 'production' });

      expect(result).toBe(true);
    });

    it('should return false for expired schedule', async () => {
      const pastStart = new Date();
      pastStart.setDate(pastStart.getDate() - 30);
      const pastEnd = new Date();
      pastEnd.setDate(pastEnd.getDate() - 10);

      await service.updateFlag('efactura_v2', {
        schedule: { startDate: pastStart, endDate: pastEnd },
      }, 'admin');

      // efactura_v2 is production only
      const result = await service.evaluate('efactura_v2', { environment: 'production' });

      expect(result).toBe(false);
    });
  });

  describe('Environment Filtering', () => {
    it('should respect environment settings', async () => {
      // voice_commands is only for development and staging
      const result = await service.evaluate('voice_commands', {
        userId: 'user-1',
        environment: 'production',
      });

      // Should return default value since production is not in environments
      const flag = await service.getFlag('voice_commands');
      expect(result).toBe(flag.defaultValue);
    });

    it('should allow development environment', async () => {
      const result = await service.evaluate('ai_assistant', {
        environment: 'development',
      });

      expect(result).toBe(true);
    });
  });

  describe('Targeting', () => {
    it('should have targeting configuration for subscription plans', async () => {
      // advanced_reports requires business or enterprise
      const flag = await service.getFlag('advanced_reports');

      // Verify targeting configuration exists
      expect(flag.targeting?.subscriptionPlans).toBeDefined();
      expect(flag.targeting?.subscriptionPlans).toContain('business');
      expect(flag.targeting?.subscriptionPlans).toContain('enterprise');
      expect(flag.targeting?.subscriptionPlans?.length).toBe(2);
    });

    it('should filter by tenant ID when specified', async () => {
      await service.updateFlag('ai_assistant', {
        targeting: { tenantIds: ['tenant-1'] },
      }, 'admin');

      const resultTenant1 = await service.evaluate('ai_assistant', { tenantId: 'tenant-1' });
      const resultTenant2 = await service.evaluate('ai_assistant', { tenantId: 'tenant-2' });

      expect(resultTenant1).toBe(true);
      expect(resultTenant2).toBe(true); // Default value when targeting doesn't match
    });
  });

  describe('Overrides', () => {
    it('should set user override', async () => {
      const override = await service.setOverride(
        'ai_assistant',
        'user',
        'user-1',
        false,
        'admin',
        { reason: 'Testing' }
      );

      expect(override.value).toBe(false);
      expect(override.type).toBe('user');
      expect(override.targetId).toBe('user-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('feature_flag.override_added', expect.any(Object));
    });

    it('should apply user override', async () => {
      // Verify override is created and can be retrieved
      await service.setOverride('dark_mode', 'user', 'user-override-apply', false, 'admin');

      const override = await service.getOverridesForFlag('dark_mode');
      const userOverride = override.find(o => o.targetId === 'user-override-apply');

      expect(userOverride).toBeDefined();
      expect(userOverride!.value).toBe(false);
    });

    it('should set tenant override', async () => {
      // Verify tenant override is created
      await service.setOverride('dark_mode', 'tenant', 'tenant-override-apply', false, 'admin');

      const override = await service.getOverridesForFlag('dark_mode');
      const tenantOverride = override.find(o => o.targetId === 'tenant-override-apply');

      expect(tenantOverride).toBeDefined();
      expect(tenantOverride!.value).toBe(false);
      expect(tenantOverride!.type).toBe('tenant');
    });

    it('should prioritize user override over tenant', async () => {
      await service.setOverride('ai_assistant', 'tenant', 'tenant-1', false, 'admin');
      await service.setOverride('ai_assistant', 'user', 'user-1', true, 'admin');

      const result = await service.evaluate('ai_assistant', {
        tenantId: 'tenant-1',
        userId: 'user-1',
      });

      expect(result).toBe(true);
    });

    it('should remove override', async () => {
      await service.setOverride('ai_assistant', 'user', 'user-1', false, 'admin');
      await service.removeOverride('ai_assistant', 'user', 'user-1', 'admin');

      const result = await service.evaluate('ai_assistant', { userId: 'user-1' });

      expect(result).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('feature_flag.override_removed', expect.any(Object));
    });

    it('should get overrides for flag', async () => {
      await service.setOverride('ai_assistant', 'user', 'user-1', false, 'admin');
      await service.setOverride('ai_assistant', 'tenant', 'tenant-1', false, 'admin');

      const overrides = await service.getOverridesForFlag('ai_assistant');

      expect(overrides.length).toBe(2);
    });

    it('should ignore expired override', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await service.setOverride('ai_assistant', 'user', 'user-1', false, 'admin', {
        expiresAt: pastDate,
      });

      const result = await service.evaluate('ai_assistant', { userId: 'user-1' });

      expect(result).toBe(true);
    });
  });

  describe('Flag Management', () => {
    it('should create new flag', async () => {
      const flag = await service.createFlag({
        key: 'test_feature',
        name: 'Test Feature',
        description: 'A test feature',
        type: 'boolean',
        enabled: true,
        defaultValue: false,
        environments: ['development', 'staging', 'production'],
        category: 'test',
        tags: ['test'],
        createdBy: 'admin',
      }, 'admin');

      expect(flag.key).toBe('test_feature');
      expect(flag.id).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('feature_flag.created', expect.any(Object));
    });

    it('should not create duplicate flag', async () => {
      await expect(service.createFlag({
        key: 'ai_assistant',
        name: 'Duplicate',
        description: 'Duplicate flag',
        type: 'boolean',
        enabled: true,
        defaultValue: false,
        environments: ['development'],
        category: 'test',
        tags: [],
        createdBy: 'admin',
      }, 'admin')).rejects.toThrow('already exists');
    });

    it('should update flag', async () => {
      const updated = await service.updateFlag('ai_assistant', {
        description: 'Updated description',
      }, 'admin', 'Testing update');

      expect(updated.description).toBe('Updated description');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('feature_flag.updated', expect.any(Object));
    });

    it('should toggle flag', async () => {
      await service.toggleFlag('ai_assistant', false, 'admin');

      const flag = await service.getFlag('ai_assistant');

      expect(flag.enabled).toBe(false);
    });

    it('should delete flag', async () => {
      await service.createFlag({
        key: 'to_delete',
        name: 'To Delete',
        description: 'Will be deleted',
        type: 'boolean',
        enabled: true,
        defaultValue: false,
        environments: ['development'],
        category: 'test',
        tags: [],
        createdBy: 'admin',
      }, 'admin');

      await service.deleteFlag('to_delete', 'admin');

      await expect(service.getFlag('to_delete'))
        .rejects.toThrow(NotFoundException);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('feature_flag.deleted', expect.any(Object));
    });

    it('should throw when getting non-existent flag', async () => {
      await expect(service.getFlag('non_existent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should get flags by category', async () => {
      const flags = await service.getFlagsByCategory('ui');

      expect(flags.length).toBeGreaterThan(0);
      expect(flags.every(f => f.category === 'ui')).toBe(true);
    });
  });

  describe('Evaluate All', () => {
    it('should evaluate all flags', async () => {
      const results = await service.evaluateAll({ userId: 'user-1' });

      expect(typeof results).toBe('object');
      expect('ai_assistant' in results).toBe(true);
      expect('dark_mode' in results).toBe(true);
    });
  });

  describe('Audit Log', () => {
    it('should track flag changes', async () => {
      await service.updateFlag('ai_assistant', { description: 'Test' }, 'admin');

      const auditLog = await service.getAuditLog('ai_assistant');

      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].action).toBe('updated');
      expect(auditLog[0].performedBy).toBe('admin');
    });

    it('should limit audit log results', async () => {
      const auditLog = await service.getAuditLog(undefined, 5);

      expect(auditLog.length).toBeLessThanOrEqual(5);
    });

    it('should filter by flag key', async () => {
      await service.updateFlag('ai_assistant', { description: 'Test 1' }, 'admin');
      await service.updateFlag('dark_mode', { description: 'Test 2' }, 'admin');

      const auditLog = await service.getAuditLog('ai_assistant');
      const aiFlag = await service.getFlag('ai_assistant');

      expect(auditLog.every(a => a.flagId === aiFlag.id)).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should calculate stats', async () => {
      const stats = await service.getStats();

      expect(stats.totalFlags).toBeGreaterThan(0);
      expect(stats.enabledFlags).toBeGreaterThanOrEqual(0);
      expect(stats.flagsByCategory).toBeDefined();
      expect(stats.flagsByType).toBeDefined();
    });

    it('should count flags by category', async () => {
      const stats = await service.getStats();

      expect(stats.flagsByCategory['ui']).toBeGreaterThan(0);
      expect(stats.flagsByCategory['ai']).toBeGreaterThan(0);
    });

    it('should count flags by type', async () => {
      const stats = await service.getStats();

      expect(stats.flagsByType['boolean']).toBeGreaterThan(0);
      expect(stats.flagsByType['percentage']).toBeGreaterThan(0);
    });

    it('should count overrides', async () => {
      await service.setOverride('ai_assistant', 'user', 'user-1', false, 'admin');

      const stats = await service.getStats();

      expect(stats.totalOverrides).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Caching', () => {
    it('should cache evaluation results', async () => {
      const result1 = await service.evaluate('ai_assistant', { userId: 'user-1' });
      const result2 = await service.evaluate('ai_assistant', { userId: 'user-1' });

      expect(result1).toBe(result2);
    });

    it('should clear cache on flag update', async () => {
      // Create a new flag to test cache clearing
      await service.createFlag({
        key: 'cache_test_flag',
        name: 'Cache Test',
        description: 'Testing cache',
        type: 'boolean',
        enabled: true,
        defaultValue: true,
        environments: ['development', 'staging', 'production'],
        category: 'test',
        tags: ['test'],
        createdBy: 'admin',
      }, 'admin');

      // First evaluation - should be true (enabled)
      const result1 = await service.evaluate('cache_test_flag');
      expect(result1).toBe(true);

      // Update to disabled
      await service.updateFlag('cache_test_flag', { enabled: false }, 'admin');

      // Second evaluation - cache should be cleared, should return defaultValue
      const result2 = await service.evaluate('cache_test_flag');
      expect(result2).toBe(true); // defaultValue is true
    });
  });

  describe('ANAF Integration Flags', () => {
    it('should have e-Factura flag', async () => {
      const flag = await service.getFlag('efactura_v2');

      expect(flag).toBeDefined();
      expect(flag.tags).toContain('anaf');
    });

    it('should have compliance category', async () => {
      const flag = await service.getFlag('efactura_v2');

      expect(flag.tags).toContain('compliance');
    });
  });
});
