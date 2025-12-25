import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  TenantConfigService,
  SubscriptionTier,
  FeatureFlag,
} from './tenant-config.service';

describe('TenantConfigService', () => {
  let service: TenantConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<TenantConfigService>(TenantConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize default templates', async () => {
      const templates = await service.getAllTemplates();
      expect(templates.length).toBe(5);
      expect(templates.map(t => t.tier)).toContain('free');
      expect(templates.map(t => t.tier)).toContain('enterprise');
    });
  });

  // =================== PROFILE MANAGEMENT TESTS ===================

  describe('Profile Management', () => {
    it('should create tenant profile', async () => {
      const profile = await service.createProfile('tenant-1', 'Acme Corp', 'pro');

      expect(profile).toBeDefined();
      expect(profile.id).toMatch(/^prf-/);
      expect(profile.tenantId).toBe('tenant-1');
      expect(profile.name).toBe('Acme Corp');
      expect(profile.subscriptionTier).toBe('pro');
      expect(profile.features).toContain('ocr_processing');
      expect(profile.features).toContain('api_access');
    });

    it('should create profile with custom options', async () => {
      const profile = await service.createProfile('tenant-1', 'Test Corp', 'starter', {
        displayName: 'Test Corporation',
        domain: 'test.example.com',
        timezone: 'Europe/London',
        locale: 'en-GB',
        currency: 'GBP',
      });

      expect(profile.displayName).toBe('Test Corporation');
      expect(profile.domain).toBe('test.example.com');
      expect(profile.timezone).toBe('Europe/London');
      expect(profile.locale).toBe('en-GB');
      expect(profile.currency).toBe('GBP');
    });

    it('should set default values for profile', async () => {
      const profile = await service.createProfile('tenant-1', 'Test', 'free');

      expect(profile.timezone).toBe('Europe/Bucharest');
      expect(profile.locale).toBe('ro-RO');
      expect(profile.currency).toBe('RON');
      expect(profile.dateFormat).toBe('DD.MM.YYYY');
    });

    it('should get tenant profile', async () => {
      await service.createProfile('tenant-1', 'Test', 'pro');
      const profile = await service.getProfile('tenant-1');

      expect(profile).toBeDefined();
      expect(profile!.name).toBe('Test');
    });

    it('should return null for non-existent profile', async () => {
      const profile = await service.getProfile('non-existent');
      expect(profile).toBeNull();
    });

    it('should update tenant profile', async () => {
      await service.createProfile('tenant-1', 'Test', 'pro');
      const updated = await service.updateProfile('tenant-1', {
        displayName: 'Updated Name',
        logo: 'https://example.com/logo.png',
      });

      expect(updated!.displayName).toBe('Updated Name');
      expect(updated!.logo).toBe('https://example.com/logo.png');
    });

    it('should upgrade subscription tier', async () => {
      await service.createProfile('tenant-1', 'Test', 'starter');

      const upgraded = await service.upgradeSubscription('tenant-1', 'business');

      expect(upgraded!.subscriptionTier).toBe('business');
      expect(upgraded!.features).toContain('fleet_management');
      expect(upgraded!.features).toContain('hr_module');
      expect(upgraded!.limits.maxUsers).toBe(50);
    });

    it('should get all profiles', async () => {
      await service.createProfile('tenant-1', 'Corp A', 'pro');
      await service.createProfile('tenant-2', 'Corp B', 'starter');

      const profiles = await service.getAllProfiles();
      expect(profiles.length).toBe(2);
    });
  });

  // =================== CONFIG MANAGEMENT TESTS ===================

  describe('Config Management', () => {
    it('should set configuration', async () => {
      const config = await service.setConfig('tenant-1', 'app.theme', 'dark', {
        category: 'appearance',
        description: 'Application theme',
      });

      expect(config).toBeDefined();
      expect(config.id).toMatch(/^cfg-/);
      expect(config.tenantId).toBe('tenant-1');
      expect(config.key).toBe('app.theme');
      expect(config.value).toBe('dark');
      expect(config.valueType).toBe('string');
    });

    it('should detect value type automatically', async () => {
      const stringConfig = await service.setConfig('tenant-1', 'key1', 'value');
      const numberConfig = await service.setConfig('tenant-1', 'key2', 42);
      const boolConfig = await service.setConfig('tenant-1', 'key3', true);
      const arrayConfig = await service.setConfig('tenant-1', 'key4', ['a', 'b']);
      const jsonConfig = await service.setConfig('tenant-1', 'key5', { nested: 'object' });

      expect(stringConfig.valueType).toBe('string');
      expect(numberConfig.valueType).toBe('number');
      expect(boolConfig.valueType).toBe('boolean');
      expect(arrayConfig.valueType).toBe('array');
      expect(jsonConfig.valueType).toBe('json');
    });

    it('should mark secret configs', async () => {
      const secretConfig = await service.setConfig('tenant-1', 'api.secret_key', 'abc123');
      const passwordConfig = await service.setConfig('tenant-1', 'db.password', 'pass123');
      const normalConfig = await service.setConfig('tenant-1', 'app.name', 'MyApp');

      expect(secretConfig.isSecret).toBe(true);
      expect(passwordConfig.isSecret).toBe(true);
      expect(normalConfig.isSecret).toBe(false);
    });

    it('should validate config values', async () => {
      await expect(
        service.setConfig('tenant-1', 'rate.limit', 5, {
          validationRules: [
            { type: 'min', value: 10, message: 'Minimum value is 10' },
          ],
        }),
      ).rejects.toThrow('Validation failed: Minimum value is 10');
    });

    it('should validate max value', async () => {
      await expect(
        service.setConfig('tenant-1', 'rate.limit', 1000, {
          validationRules: [
            { type: 'max', value: 100, message: 'Maximum value is 100' },
          ],
        }),
      ).rejects.toThrow('Maximum value is 100');
    });

    it('should validate pattern', async () => {
      await expect(
        service.setConfig('tenant-1', 'email', 'not-an-email', {
          validationRules: [
            { type: 'pattern', value: '^[\\w-]+@[\\w-]+\\.[\\w-]+$', message: 'Invalid email format' },
          ],
        }),
      ).rejects.toThrow('Invalid email format');
    });

    it('should validate enum values', async () => {
      await expect(
        service.setConfig('tenant-1', 'theme', 'rainbow', {
          validationRules: [
            { type: 'enum', value: ['light', 'dark'], message: 'Must be light or dark' },
          ],
        }),
      ).rejects.toThrow('Must be light or dark');
    });

    it('should get configuration by key', async () => {
      await service.setConfig('tenant-1', 'app.name', 'MyApp');
      const config = await service.getConfig('tenant-1', 'app.name');

      expect(config).toBeDefined();
      expect(config!.value).toBe('MyApp');
    });

    it('should get config value with default', async () => {
      const value = await service.getConfigValue('tenant-1', 'non.existent', 'default');
      expect(value).toBe('default');
    });

    it('should get all configs for tenant', async () => {
      await service.setConfig('tenant-1', 'key1', 'value1', { category: 'general' });
      await service.setConfig('tenant-1', 'key2', 'value2', { category: 'security' });
      await service.setConfig('tenant-2', 'key3', 'value3');

      const configs = await service.getAllConfigs('tenant-1');
      expect(configs.length).toBe(2);
    });

    it('should filter configs by category', async () => {
      await service.setConfig('tenant-1', 'key1', 'value1', { category: 'general' });
      await service.setConfig('tenant-1', 'key2', 'value2', { category: 'security' });

      const configs = await service.getAllConfigs('tenant-1', { category: 'security' });
      expect(configs.length).toBe(1);
      expect(configs[0].category).toBe('security');
    });

    it('should mask secret values by default', async () => {
      await service.setConfig('tenant-1', 'api.secret', 'sensitive-data', { isSecret: true });

      const configs = await service.getAllConfigs('tenant-1');
      const secretConfig = configs.find(c => c.key === 'api.secret');
      expect(secretConfig!.value).toBe('[SECRET]');
    });

    it('should delete configuration', async () => {
      await service.setConfig('tenant-1', 'to.delete', 'value');
      const deleted = await service.deleteConfig('tenant-1', 'to.delete');

      expect(deleted).toBe(true);
      const config = await service.getConfig('tenant-1', 'to.delete');
      expect(config).toBeNull();
    });

    it('should bulk set configurations', async () => {
      const configs = await service.bulkSetConfigs('tenant-1', [
        { key: 'bulk1', value: 'value1', category: 'test' },
        { key: 'bulk2', value: 'value2', category: 'test' },
        { key: 'bulk3', value: 'value3', category: 'test' },
      ]);

      expect(configs.length).toBe(3);
    });
  });

  // =================== CONFIG HISTORY TESTS ===================

  describe('Config History', () => {
    it('should record config history on update', async () => {
      await service.setConfig('tenant-1', 'app.name', 'Original', { updatedBy: 'admin' });
      await service.setConfig('tenant-1', 'app.name', 'Updated', { updatedBy: 'admin' });

      const history = await service.getConfigHistory('tenant-1', 'app.name');
      expect(history.length).toBe(1);
      expect(history[0].oldValue).toBe('Original');
      expect(history[0].newValue).toBe('Updated');
    });

    it('should mask secret values in history', async () => {
      await service.setConfig('tenant-1', 'api.password', 'old-pass');
      await service.setConfig('tenant-1', 'api.password', 'new-pass');

      const history = await service.getConfigHistory('tenant-1', 'api.password');
      expect(history[0].oldValue).toBe('[SECRET]');
      expect(history[0].newValue).toBe('[SECRET]');
    });

    it('should get all config history for tenant', async () => {
      await service.setConfig('tenant-1', 'key1', 'v1');
      await service.setConfig('tenant-1', 'key1', 'v2');
      await service.setConfig('tenant-1', 'key2', 'v1');
      await service.setConfig('tenant-1', 'key2', 'v2');

      const history = await service.getConfigHistory('tenant-1');
      expect(history.length).toBe(2);
    });

    it('should limit history results', async () => {
      await service.setConfig('tenant-1', 'key', 'v1');
      await service.setConfig('tenant-1', 'key', 'v2');
      await service.setConfig('tenant-1', 'key', 'v3');
      await service.setConfig('tenant-1', 'key', 'v4');

      const history = await service.getConfigHistory('tenant-1', 'key', { limit: 2 });
      expect(history.length).toBe(2);
    });
  });

  // =================== FEATURE FLAGS TESTS ===================

  describe('Feature Flags', () => {
    beforeEach(async () => {
      await service.createProfile('tenant-1', 'Test', 'starter');
    });

    it('should check if feature is enabled', async () => {
      const hasOcr = await service.hasFeature('tenant-1', 'ocr_processing');
      const hasFleet = await service.hasFeature('tenant-1', 'fleet_management');

      expect(hasOcr).toBe(true);
      expect(hasFleet).toBe(false);
    });

    it('should return false for non-existent tenant', async () => {
      const result = await service.hasFeature('non-existent', 'ocr_processing');
      expect(result).toBe(false);
    });

    it('should enable feature', async () => {
      const profile = await service.enableFeature('tenant-1', 'fleet_management');

      expect(profile!.features).toContain('fleet_management');
    });

    it('should not duplicate enabled features', async () => {
      await service.enableFeature('tenant-1', 'ocr_processing');
      const profile = await service.enableFeature('tenant-1', 'ocr_processing');

      const ocrCount = profile!.features.filter(f => f === 'ocr_processing').length;
      expect(ocrCount).toBe(1);
    });

    it('should disable feature', async () => {
      const profile = await service.disableFeature('tenant-1', 'ocr_processing');

      expect(profile!.features).not.toContain('ocr_processing');
    });

    it('should get all enabled features', async () => {
      const features = await service.getEnabledFeatures('tenant-1');

      expect(features).toContain('ocr_processing');
      expect(features).toContain('ai_assistant');
      expect(features).toContain('saft_submission');
    });
  });

  // =================== LIMITS MANAGEMENT TESTS ===================

  describe('Limits Management', () => {
    beforeEach(async () => {
      await service.createProfile('tenant-1', 'Test', 'pro');
    });

    it('should check limit - within limit', async () => {
      const result = await service.checkLimit('tenant-1', 'maxUsers', 5);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.usage).toBe(5);
      expect(result.remaining).toBe(5);
    });

    it('should check limit - at limit', async () => {
      const result = await service.checkLimit('tenant-1', 'maxUsers', 10);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should check limit - over limit', async () => {
      const result = await service.checkLimit('tenant-1', 'maxUsers', 15);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle unlimited limits', async () => {
      await service.createProfile('tenant-2', 'Enterprise', 'enterprise');

      const result = await service.checkLimit('tenant-2', 'maxUsers', 1000);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.remaining).toBe(-1);
    });

    it('should get tenant limits', async () => {
      const limits = await service.getLimits('tenant-1');

      expect(limits!.maxUsers).toBe(10);
      expect(limits!.maxDocumentsPerMonth).toBe(1000);
    });

    it('should update limits', async () => {
      const profile = await service.updateLimits('tenant-1', {
        maxUsers: 20,
        maxStorageGB: 50,
      });

      expect(profile!.limits.maxUsers).toBe(20);
      expect(profile!.limits.maxStorageGB).toBe(50);
    });
  });

  // =================== SETTINGS MANAGEMENT TESTS ===================

  describe('Settings Management', () => {
    beforeEach(async () => {
      await service.createProfile('tenant-1', 'Test', 'pro');
    });

    it('should get specific setting', async () => {
      const value = await service.getSetting('tenant-1', 'emailNotifications');
      expect(value).toBe(true);
    });

    it('should return null for non-existent tenant', async () => {
      const value = await service.getSetting('non-existent', 'emailNotifications');
      expect(value).toBeNull();
    });

    it('should update settings', async () => {
      const profile = await service.updateSettings('tenant-1', {
        emailNotifications: false,
        sessionTimeoutMinutes: 60,
      });

      expect(profile!.settings.emailNotifications).toBe(false);
      expect(profile!.settings.sessionTimeoutMinutes).toBe(60);
    });

    it('should preserve other settings on update', async () => {
      await service.updateSettings('tenant-1', { emailNotifications: false });
      const profile = await service.getProfile('tenant-1');

      expect(profile!.settings.twoFactorRequired).toBeDefined();
      expect(profile!.settings.passwordPolicyStrength).toBeDefined();
    });
  });

  // =================== TEMPLATES TESTS ===================

  describe('Templates', () => {
    it('should get template by ID', async () => {
      const templates = await service.getAllTemplates();
      const template = await service.getTemplate(templates[0].id);

      expect(template).toBeDefined();
      expect(template!.name).toBeDefined();
    });

    it('should get template by tier', async () => {
      const template = await service.getTemplateByTier('pro');

      expect(template).toBeDefined();
      expect(template!.tier).toBe('pro');
      expect(template!.features).toContain('api_access');
    });

    it('should return null for non-existent template', async () => {
      const template = await service.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    it('should apply template to tenant', async () => {
      await service.createProfile('tenant-1', 'Test', 'free');
      const template = await service.getTemplateByTier('pro');

      const configs = await service.applyTemplate('tenant-1', template!.id);

      expect(configs.length).toBeGreaterThan(0);

      const profile = await service.getProfile('tenant-1');
      expect(profile!.features).toContain('api_access');
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        service.applyTemplate('tenant-1', 'non-existent'),
      ).rejects.toThrow('Template not found');
    });
  });

  // =================== TIER FEATURES AND LIMITS TESTS ===================

  describe('Tier Features and Limits', () => {
    it('should have correct features for free tier', async () => {
      await service.createProfile('tenant-1', 'Free', 'free');
      const features = await service.getEnabledFeatures('tenant-1');

      expect(features).toContain('ocr_processing');
      expect(features).not.toContain('api_access');
      expect(features).not.toContain('fleet_management');
    });

    it('should have correct features for enterprise tier', async () => {
      await service.createProfile('tenant-1', 'Enterprise', 'enterprise');
      const features = await service.getEnabledFeatures('tenant-1');

      expect(features).toContain('custom_branding');
      expect(features).toContain('bulk_operations');
      expect(features).toContain('fleet_management');
    });

    it('should have correct limits for free tier', async () => {
      await service.createProfile('tenant-1', 'Free', 'free');
      const limits = await service.getLimits('tenant-1');

      expect(limits!.maxUsers).toBe(1);
      expect(limits!.maxDocumentsPerMonth).toBe(50);
      expect(limits!.maxWebhooks).toBe(0);
    });

    it('should have unlimited resources for enterprise tier', async () => {
      await service.createProfile('tenant-1', 'Enterprise', 'enterprise');
      const limits = await service.getLimits('tenant-1');

      expect(limits!.maxUsers).toBe(-1);
      expect(limits!.maxDocumentsPerMonth).toBe(-1);
      expect(limits!.maxStorageGB).toBe(-1);
    });

    it('should set stricter security for enterprise', async () => {
      await service.createProfile('tenant-1', 'Enterprise', 'enterprise');
      const profile = await service.getProfile('tenant-1');

      expect(profile!.settings.twoFactorRequired).toBe(true);
      expect(profile!.settings.passwordPolicyStrength).toBe('high');
      expect(profile!.settings.sessionTimeoutMinutes).toBe(15);
    });
  });

  // =================== METADATA TESTS ===================

  describe('Metadata', () => {
    it('should return all subscription tiers', () => {
      const tiers = service.getSubscriptionTiers();
      expect(tiers).toContain('free');
      expect(tiers).toContain('starter');
      expect(tiers).toContain('pro');
      expect(tiers).toContain('business');
      expect(tiers).toContain('enterprise');
      expect(tiers.length).toBe(5);
    });

    it('should return all feature flags', () => {
      const features = service.getFeatureFlags();
      expect(features).toContain('ocr_processing');
      expect(features).toContain('custom_branding');
      expect(features.length).toBe(12);
    });

    it('should return default limits for tier', () => {
      const limits = service.getDefaultLimitsForTier('pro');
      expect(limits.maxUsers).toBe(10);
      expect(limits.maxDocumentsPerMonth).toBe(1000);
    });

    it('should return default features for tier', () => {
      const features = service.getDefaultFeaturesForTier('starter');
      expect(features).toContain('ocr_processing');
      expect(features).toContain('ai_assistant');
      expect(features).not.toContain('fleet_management');
    });

    it('should return config categories', () => {
      const categories = service.getConfigCategories();
      expect(categories).toContain('general');
      expect(categories).toContain('security');
      expect(categories).toContain('integrations');
      expect(categories.length).toBe(10);
    });
  });

  // =================== CUSTOM LIMITS AND FEATURES TESTS ===================

  describe('Custom Limits and Features', () => {
    it('should create profile with custom limits', async () => {
      const profile = await service.createProfile('tenant-1', 'Custom', 'pro', {
        customLimits: {
          maxUsers: 25,
          maxStorageGB: 100,
        },
      });

      expect(profile.limits.maxUsers).toBe(25);
      expect(profile.limits.maxStorageGB).toBe(100);
      expect(profile.limits.maxDocumentsPerMonth).toBe(1000); // Default pro limit
    });

    it('should create profile with custom features', async () => {
      const profile = await service.createProfile('tenant-1', 'Custom', 'starter', {
        customFeatures: ['ocr_processing', 'fleet_management', 'custom_branding'],
      });

      expect(profile.features).toContain('fleet_management');
      expect(profile.features).toContain('custom_branding');
      expect(profile.features).not.toContain('ai_assistant'); // Not in custom list
    });
  });
});
