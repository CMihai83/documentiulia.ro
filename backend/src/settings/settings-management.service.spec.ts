import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SettingsManagementService,
  SettingDefinition,
  FeatureFlag,
  UserPreferences,
  OrganizationConfig,
} from './settings-management.service';

describe('SettingsManagementService', () => {
  let service: SettingsManagementService;
  let eventEmitter: EventEmitter2;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsManagementService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SettingsManagementService>(SettingsManagementService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default setting definitions', async () => {
      const definitions = await service.getAllSettingDefinitions();
      expect(definitions.length).toBeGreaterThan(0);
    });

    it('should have VAT rate setting', async () => {
      const vatSetting = await service.getSettingDefinition('tax.vatRate');
      expect(vatSetting).toBeDefined();
      expect(vatSetting!.defaultValue).toBe(19);
    });

    it('should have default feature flags', async () => {
      const flags = await service.getAllFeatureFlags();
      expect(flags.length).toBeGreaterThan(0);
    });
  });

  describe('Setting Definitions', () => {
    it('should get setting definition by key', async () => {
      const def = await service.getSettingDefinition('app.name');

      expect(def).toBeDefined();
      expect(def!.name).toBe('Application Name');
      expect(def!.nameRo).toBe('Nume Aplicație');
    });

    it('should get all setting definitions', async () => {
      const definitions = await service.getAllSettingDefinitions();

      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions[0].order).toBeDefined();
    });

    it('should filter definitions by category', async () => {
      const definitions = await service.getAllSettingDefinitions('TAX');

      expect(definitions.every((d) => d.category === 'TAX')).toBe(true);
    });

    it('should get settings grouped by category', async () => {
      const grouped = await service.getSettingsByCategory();

      expect(grouped.GENERAL).toBeDefined();
      expect(grouped.TAX).toBeDefined();
    });

    it('should return undefined for non-existent setting', async () => {
      const def = await service.getSettingDefinition('non.existent');

      expect(def).toBeUndefined();
    });
  });

  describe('Setting Values', () => {
    it('should get default value when not set', async () => {
      const value = await service.getSetting('tax.vatRate');

      expect(value).toBe(19);
    });

    it('should set and get setting value', async () => {
      await service.setSetting('tax.vatRate', 21, mockUserId);
      const value = await service.getSetting('tax.vatRate');

      expect(value).toBe(21);
    });

    it('should emit setting.changed event', async () => {
      await service.setSetting('tax.vatRate', 21, mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'setting.changed',
        expect.objectContaining({
          key: 'tax.vatRate',
          value: 21,
        }),
      );
    });

    it('should store setting with scope', async () => {
      await service.setSetting('app.language', 'en', mockUserId, mockOrgId);
      const value = await service.getSetting('app.language', mockOrgId);

      expect(value).toBe('en');
    });

    it('should return default for different scope', async () => {
      await service.setSetting('app.language', 'en', mockUserId, mockOrgId);
      const value = await service.getSetting('app.language', 'other-org');

      expect(value).toBe('ro'); // Default value
    });

    it('should throw error for non-existent setting', async () => {
      await expect(
        service.getSetting('non.existent'),
      ).rejects.toThrow('Setting not found');
    });

    it('should throw error when setting non-editable setting', async () => {
      // Get a setting and mock it as non-editable
      const def = await service.getSettingDefinition('app.name');
      def!.isEditable = false;

      await expect(
        service.setSetting('app.name', 'New Name', mockUserId),
      ).rejects.toThrow('Setting is not editable');

      // Restore
      def!.isEditable = true;
    });

    it('should track setting version', async () => {
      await service.setSetting('tax.vatRate', 20, mockUserId);
      await service.setSetting('tax.vatRate', 21, mockUserId);

      const history = await service.getSettingHistory('tax.vatRate');

      expect(history.length).toBe(1);
      expect(history[0].value).toBe(20);
    });

    it('should reset setting to default', async () => {
      await service.setSetting('tax.vatRate', 21, mockUserId);
      await service.resetSetting('tax.vatRate', mockUserId);

      const value = await service.getSetting('tax.vatRate');

      expect(value).toBe(19);
    });

    it('should emit setting.reset event', async () => {
      await service.setSetting('tax.vatRate', 21, mockUserId);
      await service.resetSetting('tax.vatRate', mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'setting.reset',
        expect.objectContaining({ key: 'tax.vatRate' }),
      );
    });
  });

  describe('Setting Validation', () => {
    it('should validate number min value', async () => {
      await expect(
        service.setSetting('tax.vatRate', -5, mockUserId),
      ).rejects.toThrow('at least');
    });

    it('should validate number max value', async () => {
      await expect(
        service.setSetting('tax.vatRate', 150, mockUserId),
      ).rejects.toThrow('at most');
    });

    it('should validate enum values', async () => {
      await expect(
        service.setSetting('app.language', 'invalid', mockUserId, mockOrgId),
      ).rejects.toThrow('Invalid value');
    });

    it('should accept valid enum value', async () => {
      await service.setSetting('app.language', 'en', mockUserId, mockOrgId);
      const value = await service.getSetting('app.language', mockOrgId);

      expect(value).toBe('en');
    });

    it('should validate string max length', async () => {
      await expect(
        service.setSetting('invoice.prefix', 'VERY-LONG-PREFIX-HERE', mockUserId, mockOrgId),
      ).rejects.toThrow('at most');
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk get settings', async () => {
      const settings = await service.bulkGetSettings([
        'tax.vatRate',
        'tax.reducedVatRate',
        'app.name',
      ]);

      expect(settings['tax.vatRate']).toBe(19);
      expect(settings['tax.reducedVatRate']).toBe(9);
      expect(settings['app.name']).toBe('DocumentIulia');
    });

    it('should skip missing settings in bulk get', async () => {
      const settings = await service.bulkGetSettings([
        'tax.vatRate',
        'non.existent',
      ]);

      expect(settings['tax.vatRate']).toBe(19);
      expect(settings['non.existent']).toBeUndefined();
    });

    it('should bulk set settings', async () => {
      await service.bulkSetSettings(
        {
          'tax.vatRate': 21,
          'tax.reducedVatRate': 11,
        },
        mockUserId,
      );

      expect(await service.getSetting('tax.vatRate')).toBe(21);
      expect(await service.getSetting('tax.reducedVatRate')).toBe(11);
    });
  });

  describe('Feature Flags', () => {
    it('should get feature flag by key', async () => {
      const flag = await service.getFeatureFlag('feature.aiAssistant');

      expect(flag).toBeDefined();
      expect(flag!.enabled).toBe(true);
    });

    it('should get all feature flags', async () => {
      const flags = await service.getAllFeatureFlags();

      expect(flags.length).toBeGreaterThan(0);
    });

    it('should check if feature is enabled', async () => {
      const enabled = await service.isFeatureEnabled('feature.aiAssistant');

      expect(enabled).toBe(true);
    });

    it('should return false for disabled feature', async () => {
      const enabled = await service.isFeatureEnabled('feature.newDashboard');

      expect(enabled).toBe(false);
    });

    it('should return false for non-existent feature', async () => {
      const enabled = await service.isFeatureEnabled('feature.nonExistent');

      expect(enabled).toBe(false);
    });

    it('should enable feature flag', async () => {
      await service.setFeatureFlag('feature.newDashboard', true);
      const enabled = await service.isFeatureEnabled('feature.newDashboard');

      expect(enabled).toBe(true);
    });

    it('should disable feature flag', async () => {
      await service.setFeatureFlag('feature.aiAssistant', false);
      const enabled = await service.isFeatureEnabled('feature.aiAssistant');

      expect(enabled).toBe(false);
    });

    it('should emit feature.toggled event', async () => {
      await service.setFeatureFlag('feature.newDashboard', true);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'feature.toggled',
        expect.objectContaining({ key: 'feature.newDashboard', enabled: true }),
      );
    });

    it('should create new feature flag', async () => {
      const flag = await service.setFeatureFlag('feature.newFeature', true, {
        name: 'New Feature',
        nameRo: 'Funcție Nouă',
        description: 'A new feature',
        descriptionRo: 'O funcție nouă',
      });

      expect(flag.key).toBe('feature.newFeature');
      expect(flag.enabled).toBe(true);
      expect(flag.name).toBe('New Feature');
    });

    it('should delete feature flag', async () => {
      await service.setFeatureFlag('feature.toDelete', true);
      await service.deleteFeatureFlag('feature.toDelete');

      const flag = await service.getFeatureFlag('feature.toDelete');
      expect(flag).toBeUndefined();
    });

    it('should emit feature.deleted event', async () => {
      await service.setFeatureFlag('feature.toDelete', true);
      await service.deleteFeatureFlag('feature.toDelete');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'feature.deleted',
        expect.objectContaining({ key: 'feature.toDelete' }),
      );
    });

    it('should throw error when deleting non-existent flag', async () => {
      await expect(
        service.deleteFeatureFlag('feature.nonExistent'),
      ).rejects.toThrow('Feature flag not found');
    });

    it('should respect allowed users', async () => {
      await service.setFeatureFlag('feature.userOnly', true, {
        allowedUsers: ['user-1', 'user-2'],
      });

      expect(await service.isFeatureEnabled('feature.userOnly', 'user-1')).toBe(true);
      expect(await service.isFeatureEnabled('feature.userOnly', 'user-3')).toBe(false);
    });

    it('should respect allowed organizations', async () => {
      await service.setFeatureFlag('feature.orgOnly', true, {
        allowedOrganizations: ['org-1', 'org-2'],
      });

      expect(await service.isFeatureEnabled('feature.orgOnly', undefined, 'org-1')).toBe(true);
      expect(await service.isFeatureEnabled('feature.orgOnly', undefined, 'org-3')).toBe(false);
    });

    it('should respect date range', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      await service.setFeatureFlag('feature.future', true, {
        startDate: futureDate,
      });

      expect(await service.isFeatureEnabled('feature.future')).toBe(false);
    });
  });

  describe('User Preferences', () => {
    it('should get default user preferences', async () => {
      const prefs = await service.getUserPreferences(mockUserId);

      expect(prefs.userId).toBe(mockUserId);
      expect(prefs.language).toBe('ro');
      expect(prefs.timezone).toBe('Europe/Bucharest');
    });

    it('should update user preferences', async () => {
      const updated = await service.updateUserPreferences(mockUserId, {
        language: 'en',
        theme: 'DARK',
      });

      expect(updated.language).toBe('en');
      expect(updated.theme).toBe('DARK');
    });

    it('should emit preferences.updated event', async () => {
      await service.updateUserPreferences(mockUserId, { language: 'en' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'preferences.updated',
        expect.objectContaining({ userId: mockUserId }),
      );
    });

    it('should merge notification preferences', async () => {
      await service.updateUserPreferences(mockUserId, {
        notifications: { email: false },
      });

      const prefs = await service.getUserPreferences(mockUserId);

      expect(prefs.notifications.email).toBe(false);
      expect(prefs.notifications.push).toBe(true); // Unchanged
    });

    it('should merge display preferences', async () => {
      await service.updateUserPreferences(mockUserId, {
        display: { compactMode: true },
      });

      const prefs = await service.getUserPreferences(mockUserId);

      expect(prefs.display.compactMode).toBe(true);
      expect(prefs.display.showSidebar).toBe(true); // Unchanged
    });

    it('should merge accessibility preferences', async () => {
      await service.updateUserPreferences(mockUserId, {
        accessibility: { highContrast: true },
      });

      const prefs = await service.getUserPreferences(mockUserId);

      expect(prefs.accessibility.highContrast).toBe(true);
      expect(prefs.accessibility.reducedMotion).toBe(false); // Unchanged
    });

    it('should reset user preferences', async () => {
      await service.updateUserPreferences(mockUserId, { language: 'en' });
      const reset = await service.resetUserPreferences(mockUserId);

      expect(reset.language).toBe('ro');
    });

    it('should emit preferences.reset event', async () => {
      await service.resetUserPreferences(mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'preferences.reset',
        expect.objectContaining({ userId: mockUserId }),
      );
    });
  });

  describe('Organization Config', () => {
    it('should get default organization config', async () => {
      const config = await service.getOrganizationConfig(mockOrgId);

      expect(config.organizationId).toBe(mockOrgId);
      expect(config.taxSettings.vatRate).toBe(19);
      expect(config.invoiceSettings.prefix).toBe('INV-');
    });

    it('should update organization config', async () => {
      const updated = await service.updateOrganizationConfig(mockOrgId, {
        name: 'Test Organization',
        nameRo: 'Organizație de Test',
      });

      expect(updated.name).toBe('Test Organization');
      expect(updated.nameRo).toBe('Organizație de Test');
    });

    it('should emit orgconfig.updated event', async () => {
      await service.updateOrganizationConfig(mockOrgId, { name: 'Updated' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'orgconfig.updated',
        expect.objectContaining({ organizationId: mockOrgId }),
      );
    });

    it('should merge tax settings', async () => {
      await service.updateOrganizationConfig(mockOrgId, {
        taxSettings: { vatRate: 21 },
      });

      const config = await service.getOrganizationConfig(mockOrgId);

      expect(config.taxSettings.vatRate).toBe(21);
      expect(config.taxSettings.reducedVatRate).toBe(9); // Unchanged
    });

    it('should merge invoice settings', async () => {
      await service.updateOrganizationConfig(mockOrgId, {
        invoiceSettings: { prefix: 'FACT-' },
      });

      const config = await service.getOrganizationConfig(mockOrgId);

      expect(config.invoiceSettings.prefix).toBe('FACT-');
      expect(config.invoiceSettings.dueDays).toBe(30); // Unchanged
    });

    it('should merge ANAF settings', async () => {
      await service.updateOrganizationConfig(mockOrgId, {
        anafSettings: { cui: 'RO12345678', autoSubmit: true },
      });

      const config = await service.getOrganizationConfig(mockOrgId);

      expect(config.anafSettings.cui).toBe('RO12345678');
      expect(config.anafSettings.autoSubmit).toBe(true);
    });

    it('should merge SAGA settings', async () => {
      await service.updateOrganizationConfig(mockOrgId, {
        sagaSettings: { enabled: true },
      });

      const config = await service.getOrganizationConfig(mockOrgId);

      expect(config.sagaSettings.enabled).toBe(true);
    });
  });

  describe('Custom Fields', () => {
    it('should add custom field', async () => {
      const field = await service.addCustomField(mockOrgId, {
        key: 'project_code',
        name: 'Project Code',
        nameRo: 'Cod Proiect',
        type: 'STRING',
        required: false,
        entity: 'invoice',
      });

      expect(field.id).toBeDefined();
      expect(field.key).toBe('project_code');
    });

    it('should emit customfield.added event', async () => {
      await service.addCustomField(mockOrgId, {
        key: 'test_field',
        name: 'Test Field',
        nameRo: 'Câmp Test',
        type: 'STRING',
        required: false,
        entity: 'invoice',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'customfield.added',
        expect.objectContaining({ organizationId: mockOrgId }),
      );
    });

    it('should store custom field in config', async () => {
      await service.addCustomField(mockOrgId, {
        key: 'department',
        name: 'Department',
        nameRo: 'Departament',
        type: 'STRING',
        required: true,
        entity: 'expense',
      });

      const config = await service.getOrganizationConfig(mockOrgId);

      expect(config.customFields.length).toBe(1);
      expect(config.customFields[0].key).toBe('department');
    });

    it('should remove custom field', async () => {
      const field = await service.addCustomField(mockOrgId, {
        key: 'to_remove',
        name: 'To Remove',
        nameRo: 'De Șters',
        type: 'STRING',
        required: false,
        entity: 'invoice',
      });

      await service.removeCustomField(mockOrgId, field.id);

      const config = await service.getOrganizationConfig(mockOrgId);
      expect(config.customFields.find((f) => f.id === field.id)).toBeUndefined();
    });

    it('should emit customfield.removed event', async () => {
      const field = await service.addCustomField(mockOrgId, {
        key: 'remove_event',
        name: 'Remove Event',
        nameRo: 'Eveniment Ștergere',
        type: 'STRING',
        required: false,
        entity: 'invoice',
      });

      await service.removeCustomField(mockOrgId, field.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'customfield.removed',
        expect.objectContaining({ organizationId: mockOrgId, fieldId: field.id }),
      );
    });

    it('should throw error when removing non-existent field', async () => {
      await expect(
        service.removeCustomField(mockOrgId, 'non-existent'),
      ).rejects.toThrow('Custom field not found');
    });
  });

  describe('Export and Import', () => {
    it('should export settings', async () => {
      const exported = await service.exportSettings();

      expect(exported['tax.vatRate']).toBe(19);
      expect(exported['app.name']).toBe('DocumentIulia');
    });

    it('should not export secret settings', async () => {
      const exported = await service.exportSettings();

      // anaf.spvApiKey is marked as secret
      expect(exported['anaf.spvApiKey']).toBeUndefined();
    });

    it('should export scoped settings', async () => {
      await service.setSetting('app.language', 'en', mockUserId, mockOrgId);

      const exported = await service.exportSettings(mockOrgId);

      expect(exported['app.language']).toBe('en');
    });

    it('should import settings', async () => {
      const result = await service.importSettings(
        {
          'tax.vatRate': 21,
          'tax.reducedVatRate': 11,
        },
        mockUserId,
      );

      expect(result.imported).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it('should report import errors', async () => {
      const result = await service.importSettings(
        {
          'tax.vatRate': 150, // Invalid
          'non.existent': 'value', // Non-existent
        },
        mockUserId,
      );

      expect(result.imported).toBe(0);
      expect(result.errors.length).toBe(2);
    });

    it('should emit settings.imported event', async () => {
      await service.importSettings({ 'tax.vatRate': 21 }, mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'settings.imported',
        expect.objectContaining({ imported: 1 }),
      );
    });
  });

  describe('Romanian Compliance Settings', () => {
    it('should have VAT rates with Legea 141/2025 metadata', async () => {
      const vatDef = await service.getSettingDefinition('tax.vatRate');
      const reducedDef = await service.getSettingDefinition('tax.reducedVatRate');

      expect(vatDef!.metadata.newRate).toBe(21);
      expect(vatDef!.metadata.effectiveDate).toBe('2025-08-01');
      expect(reducedDef!.metadata.newRate).toBe(11);
    });

    it('should have ANAF settings category', async () => {
      const anafSettings = await service.getAllSettingDefinitions('ANAF');

      expect(anafSettings.length).toBeGreaterThan(0);
      expect(anafSettings.some((s) => s.key.includes('anaf'))).toBe(true);
    });

    it('should have Romanian timezone as default', async () => {
      const config = await service.getOrganizationConfig(mockOrgId);

      expect(config.invoiceSettings.dateFormat).toBe('DD.MM.YYYY');
    });

    it('should have RON as default currency', async () => {
      const config = await service.getOrganizationConfig(mockOrgId);

      expect(config.invoiceSettings.currency).toBe('RON');
    });

    it('should have ANAF submission deadline of 5 days', async () => {
      const config = await service.getOrganizationConfig(mockOrgId);

      expect(config.anafSettings.submissionDeadlineDays).toBe(5);
    });
  });
});
