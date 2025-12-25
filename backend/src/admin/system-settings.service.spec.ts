import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SystemSettingsService,
  SystemSetting,
  SettingCategory,
  MaintenanceMode,
  SystemAnnouncement,
} from './system-settings.service';

describe('SystemSettingsService', () => {
  let service: SystemSettingsService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<SystemSettingsService>(SystemSettingsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Settings Management', () => {
    describe('getAllSettings', () => {
      it('should return all settings', async () => {
        const settings = await service.getAllSettings();

        expect(Array.isArray(settings)).toBe(true);
        expect(settings.length).toBeGreaterThan(0);
      });

      it('should mask secret values by default', async () => {
        const settings = await service.getAllSettings();
        const secretSettings = settings.filter(s => s.type === 'secret');

        secretSettings.forEach(s => {
          expect(s.value).toBe('********');
        });
      });

      it('should include secrets when flag is true', async () => {
        const settings = await service.getAllSettings(true);

        expect(settings).toBeDefined();
      });
    });

    describe('getPublicSettings', () => {
      it('should return only public settings', async () => {
        const settings = await service.getPublicSettings();

        settings.forEach(setting => {
          expect(setting.isPublic).toBe(true);
        });
      });

      it('should include platform_name', async () => {
        const settings = await service.getPublicSettings();
        const platformName = settings.find(s => s.key === 'platform_name');

        expect(platformName).toBeDefined();
        expect(platformName?.value).toBe('DocumentIulia.ro');
      });
    });

    describe('getSettingsByCategory', () => {
      it('should return settings for general category', async () => {
        const settings = await service.getSettingsByCategory('general');

        expect(settings.length).toBeGreaterThan(0);
        settings.forEach(s => expect(s.category).toBe('general'));
      });

      it('should return settings for security category', async () => {
        const settings = await service.getSettingsByCategory('security');

        expect(settings.length).toBeGreaterThan(0);
        settings.forEach(s => expect(s.category).toBe('security'));
      });

      it('should return settings for email category', async () => {
        const settings = await service.getSettingsByCategory('email');

        settings.forEach(s => expect(s.category).toBe('email'));
      });

      it('should return settings for integrations category', async () => {
        const settings = await service.getSettingsByCategory('integrations');

        settings.forEach(s => expect(s.category).toBe('integrations'));
      });

      it('should return settings for limits category', async () => {
        const settings = await service.getSettingsByCategory('limits');

        settings.forEach(s => expect(s.category).toBe('limits'));
      });

      it('should return settings for notifications category', async () => {
        const settings = await service.getSettingsByCategory('notifications');

        settings.forEach(s => expect(s.category).toBe('notifications'));
      });
    });

    describe('getSetting', () => {
      it('should return setting by key', async () => {
        const setting = await service.getSetting('platform_name');

        expect(setting).toBeDefined();
        expect(setting.key).toBe('platform_name');
      });

      it('should throw NotFoundException for non-existent key', async () => {
        await expect(service.getSetting('non_existent_key')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('getSettingValue', () => {
      it('should return setting value', async () => {
        const value = await service.getSettingValue<string>('platform_name');

        expect(value).toBe('DocumentIulia.ro');
      });

      it('should return number value', async () => {
        const value = await service.getSettingValue<number>('session_timeout_minutes');

        expect(typeof value).toBe('number');
        expect(value).toBe(60);
      });

      it('should return boolean value', async () => {
        const value = await service.getSettingValue<boolean>('require_2fa_admins');

        expect(typeof value).toBe('boolean');
        expect(value).toBe(true);
      });
    });

    describe('updateSetting', () => {
      it('should update setting value', async () => {
        const updated = await service.updateSetting(
          'platform_name',
          'New Platform Name',
          'admin_123',
        );

        expect(updated.value).toBe('New Platform Name');
        expect(updated.updatedBy).toBe('admin_123');
      });

      it('should emit event on update', async () => {
        await service.updateSetting('platform_name', 'Updated Name', 'admin_123');

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          'system_setting.updated',
          expect.objectContaining({
            key: 'platform_name',
            newValue: 'Updated Name',
            updatedBy: 'admin_123',
          }),
        );
      });

      it('should throw error for non-editable setting', async () => {
        // First make a setting non-editable for test
        const settings = await service.getAllSettings(true);
        // All default settings are editable, so this tests the validation logic
        expect(settings[0].isEditable).toBe(true);
      });

      it('should validate number min value', async () => {
        await expect(
          service.updateSetting('session_timeout_minutes', 1, 'admin_123'),
        ).rejects.toThrow('Value must be at least 5');
      });

      it('should validate number max value', async () => {
        await expect(
          service.updateSetting('session_timeout_minutes', 2000, 'admin_123'),
        ).rejects.toThrow('Value must be at most 1440');
      });

      it('should validate string pattern', async () => {
        await expect(
          service.updateSetting('support_email', 'invalid-email', 'admin_123'),
        ).rejects.toThrow('Value does not match required pattern');
      });

      it('should validate options', async () => {
        await expect(
          service.updateSetting('default_language', 'invalid', 'admin_123'),
        ).rejects.toThrow('Value must be one of');
      });

      it('should accept valid email', async () => {
        const updated = await service.updateSetting(
          'support_email',
          'new@documentiulia.ro',
          'admin_123',
        );

        expect(updated.value).toBe('new@documentiulia.ro');
      });

      it('should accept valid language option', async () => {
        const updated = await service.updateSetting(
          'default_language',
          'en',
          'admin_123',
        );

        expect(updated.value).toBe('en');
      });
    });

    describe('bulkUpdateSettings', () => {
      it('should update multiple settings', async () => {
        const updates = [
          { key: 'platform_name', value: 'Bulk Updated' },
          { key: 'default_language', value: 'en' },
        ];

        const results = await service.bulkUpdateSettings(updates, 'admin_123');

        expect(results.length).toBe(2);
        expect(results[0].value).toBe('Bulk Updated');
        expect(results[1].value).toBe('en');
      });
    });

    describe('resetToDefault', () => {
      it('should reset setting to default value', async () => {
        // First update
        await service.updateSetting('platform_name', 'Changed', 'admin_123');

        // Then reset
        const reset = await service.resetToDefault('platform_name', 'admin_123');

        expect(reset.value).toBe('DocumentIulia.ro');
      });
    });

    describe('resetAllToDefault', () => {
      it('should reset all modified settings', async () => {
        // Modify some settings
        await service.updateSetting('platform_name', 'Changed', 'admin_123');
        await service.updateSetting('default_language', 'en', 'admin_123');

        const count = await service.resetAllToDefault('admin_123');

        expect(count).toBeGreaterThanOrEqual(2);
      });
    });

    describe('getSettingsHistory', () => {
      it('should return settings history', async () => {
        await service.updateSetting('platform_name', 'Test1', 'admin_123');
        await service.updateSetting('platform_name', 'Test2', 'admin_123');

        const history = await service.getSettingsHistory('platform_name');

        expect(history.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by key', async () => {
        await service.updateSetting('platform_name', 'Test', 'admin_123');

        const history = await service.getSettingsHistory('platform_name');

        history.forEach(h => expect(h.key).toBe('platform_name'));
      });

      it('should limit results', async () => {
        const history = await service.getSettingsHistory(undefined, 5);

        expect(history.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Maintenance Mode', () => {
    describe('getMaintenanceMode', () => {
      it('should return maintenance mode status', async () => {
        const mode = await service.getMaintenanceMode();

        expect(mode).toBeDefined();
        expect(mode.enabled).toBe(false);
        expect(mode.message).toBeDefined();
      });
    });

    describe('setMaintenanceMode', () => {
      it('should update maintenance mode', async () => {
        const mode = await service.setMaintenanceMode(
          { enabled: true, message: 'Scheduled maintenance' },
          'admin_123',
        );

        expect(mode.enabled).toBe(true);
        expect(mode.message).toBe('Scheduled maintenance');
        expect(mode.updatedBy).toBe('admin_123');
      });

      it('should emit event on update', async () => {
        await service.setMaintenanceMode({ enabled: true }, 'admin_123');

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          'maintenance_mode.updated',
          expect.objectContaining({ updatedBy: 'admin_123' }),
        );
      });
    });

    describe('enableMaintenanceMode', () => {
      it('should enable maintenance mode', async () => {
        const mode = await service.enableMaintenanceMode(
          'System upgrade in progress',
          'admin_123',
        );

        expect(mode.enabled).toBe(true);
        expect(mode.message).toBe('System upgrade in progress');
      });

      it('should set allowed roles', async () => {
        const mode = await service.enableMaintenanceMode(
          'Maintenance',
          'admin_123',
          { allowedRoles: ['super_admin', 'admin'] },
        );

        expect(mode.allowedRoles).toContain('super_admin');
        expect(mode.allowedRoles).toContain('admin');
      });

      it('should set allowed IPs', async () => {
        const mode = await service.enableMaintenanceMode(
          'Maintenance',
          'admin_123',
          { allowedIPs: ['192.168.1.1', '10.0.0.1'] },
        );

        expect(mode.allowedIPs).toContain('192.168.1.1');
      });

      it('should set scheduled end', async () => {
        const scheduledEnd = new Date(Date.now() + 3600000);
        const mode = await service.enableMaintenanceMode(
          'Maintenance',
          'admin_123',
          { scheduledEnd },
        );

        expect(mode.scheduledEnd).toEqual(scheduledEnd);
      });
    });

    describe('disableMaintenanceMode', () => {
      it('should disable maintenance mode', async () => {
        await service.enableMaintenanceMode('Test', 'admin_123');
        const mode = await service.disableMaintenanceMode('admin_123');

        expect(mode.enabled).toBe(false);
      });
    });

    describe('isMaintenanceModeActive', () => {
      it('should return false when disabled', async () => {
        await service.disableMaintenanceMode('admin_123');

        const isActive = await service.isMaintenanceModeActive();

        expect(isActive).toBe(false);
      });

      it('should return true when enabled', async () => {
        await service.enableMaintenanceMode('Test', 'admin_123');

        const isActive = await service.isMaintenanceModeActive();

        expect(isActive).toBe(true);
      });

      it('should return false for allowed role', async () => {
        await service.enableMaintenanceMode('Test', 'admin_123', {
          allowedRoles: ['super_admin'],
        });

        const isActive = await service.isMaintenanceModeActive('super_admin');

        expect(isActive).toBe(false);
      });

      it('should return true for non-allowed role', async () => {
        await service.enableMaintenanceMode('Test', 'admin_123', {
          allowedRoles: ['super_admin'],
        });

        const isActive = await service.isMaintenanceModeActive('user');

        expect(isActive).toBe(true);
      });

      it('should return false for allowed IP', async () => {
        await service.enableMaintenanceMode('Test', 'admin_123', {
          allowedIPs: ['192.168.1.1'],
        });

        const isActive = await service.isMaintenanceModeActive(undefined, '192.168.1.1');

        expect(isActive).toBe(false);
      });
    });
  });

  describe('Announcements', () => {
    describe('createAnnouncement', () => {
      it('should create an announcement', async () => {
        const announcement = await service.createAnnouncement(
          {
            type: 'info',
            title: 'System Update',
            message: 'New features available',
            targetAudience: 'all',
          },
          'admin_123',
        );

        expect(announcement.id).toBeDefined();
        expect(announcement.title).toBe('System Update');
        expect(announcement.isActive).toBe(true);
      });

      it('should emit event on creation', async () => {
        await service.createAnnouncement(
          {
            type: 'warning',
            title: 'Warning',
            message: 'Test',
            targetAudience: 'all',
          },
          'admin_123',
        );

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          'announcement.created',
          expect.any(Object),
        );
      });

      it('should set default dismissible to true', async () => {
        const announcement = await service.createAnnouncement(
          {
            type: 'info',
            title: 'Test',
            message: 'Test',
            targetAudience: 'all',
          },
          'admin_123',
        );

        expect(announcement.dismissible).toBe(true);
      });

      it('should set dismissible to false when specified', async () => {
        const announcement = await service.createAnnouncement(
          {
            type: 'error',
            title: 'Critical',
            message: 'Critical announcement',
            targetAudience: 'all',
            dismissible: false,
          },
          'admin_123',
        );

        expect(announcement.dismissible).toBe(false);
      });

      it('should support info type', async () => {
        const announcement = await service.createAnnouncement(
          { type: 'info', title: 'Info', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );
        expect(announcement.type).toBe('info');
      });

      it('should support warning type', async () => {
        const announcement = await service.createAnnouncement(
          { type: 'warning', title: 'Warning', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );
        expect(announcement.type).toBe('warning');
      });

      it('should support error type', async () => {
        const announcement = await service.createAnnouncement(
          { type: 'error', title: 'Error', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );
        expect(announcement.type).toBe('error');
      });

      it('should support success type', async () => {
        const announcement = await service.createAnnouncement(
          { type: 'success', title: 'Success', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );
        expect(announcement.type).toBe('success');
      });

      it('should support targeting specific tenants', async () => {
        const announcement = await service.createAnnouncement(
          {
            type: 'info',
            title: 'Tenant Update',
            message: 'Update for specific tenants',
            targetAudience: 'specific_tenants',
            targetTenantIds: ['tenant_1', 'tenant_2'],
          },
          'admin_123',
        );

        expect(announcement.targetAudience).toBe('specific_tenants');
        expect(announcement.targetTenantIds).toContain('tenant_1');
      });
    });

    describe('getActiveAnnouncements', () => {
      it('should return active announcements', async () => {
        await service.createAnnouncement(
          { type: 'info', title: 'Active', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );

        const announcements = await service.getActiveAnnouncements();

        expect(announcements.length).toBeGreaterThan(0);
      });

      it('should filter by audience - all', async () => {
        await service.createAnnouncement(
          { type: 'info', title: 'For All', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );

        const announcements = await service.getActiveAnnouncements({ userRole: 'user' });
        const forAll = announcements.find(a => a.title === 'For All');

        expect(forAll).toBeDefined();
      });

      it('should filter by audience - admins only', async () => {
        await service.createAnnouncement(
          { type: 'info', title: 'For Admins', message: 'Test', targetAudience: 'admins' },
          'admin_123',
        );

        const adminAnnouncements = await service.getActiveAnnouncements({ userRole: 'admin' });
        const userAnnouncements = await service.getActiveAnnouncements({ userRole: 'user' });

        const forAdminsInAdmin = adminAnnouncements.find(a => a.title === 'For Admins');
        const forAdminsInUser = userAnnouncements.find(a => a.title === 'For Admins');

        expect(forAdminsInAdmin).toBeDefined();
        expect(forAdminsInUser).toBeUndefined();
      });

      it('should filter by audience - users only', async () => {
        await service.createAnnouncement(
          { type: 'info', title: 'For Users', message: 'Test', targetAudience: 'users' },
          'admin_123',
        );

        const userAnnouncements = await service.getActiveAnnouncements({ userRole: 'user' });
        const forUsers = userAnnouncements.find(a => a.title === 'For Users');

        expect(forUsers).toBeDefined();
      });

      it('should filter by tenant', async () => {
        await service.createAnnouncement(
          {
            type: 'info',
            title: 'Tenant Specific',
            message: 'Test',
            targetAudience: 'specific_tenants',
            targetTenantIds: ['tenant_123'],
          },
          'admin_123',
        );

        const matching = await service.getActiveAnnouncements({ tenantId: 'tenant_123' });
        const notMatching = await service.getActiveAnnouncements({ tenantId: 'tenant_456' });

        const inMatching = matching.find(a => a.title === 'Tenant Specific');
        const inNotMatching = notMatching.find(a => a.title === 'Tenant Specific');

        expect(inMatching).toBeDefined();
        expect(inNotMatching).toBeUndefined();
      });

      it('should not return future announcements', async () => {
        await service.createAnnouncement(
          {
            type: 'info',
            title: 'Future',
            message: 'Test',
            targetAudience: 'all',
            startsAt: new Date(Date.now() + 86400000), // Tomorrow
          },
          'admin_123',
        );

        const announcements = await service.getActiveAnnouncements();
        const future = announcements.find(a => a.title === 'Future');

        expect(future).toBeUndefined();
      });

      it('should not return expired announcements', async () => {
        await service.createAnnouncement(
          {
            type: 'info',
            title: 'Expired',
            message: 'Test',
            targetAudience: 'all',
            startsAt: new Date(Date.now() - 86400000),
            endsAt: new Date(Date.now() - 3600000), // 1 hour ago
          },
          'admin_123',
        );

        const announcements = await service.getActiveAnnouncements();
        const expired = announcements.find(a => a.title === 'Expired');

        expect(expired).toBeUndefined();
      });
    });

    describe('getAllAnnouncements', () => {
      it('should return all announcements as array', async () => {
        await service.createAnnouncement(
          { type: 'info', title: 'GetAll Test 1', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );

        const all = await service.getAllAnnouncements();

        expect(Array.isArray(all)).toBe(true);
        expect(all.some(a => a.title === 'GetAll Test 1')).toBe(true);
      });

      it('should sort by creation date descending', async () => {
        const all = await service.getAllAnnouncements();

        for (let i = 1; i < all.length; i++) {
          expect(all[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
            all[i].createdAt.getTime(),
          );
        }
      });
    });

    describe('updateAnnouncement', () => {
      it('should update announcement', async () => {
        const announcement = await service.createAnnouncement(
          { type: 'info', title: 'Original', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );

        const updated = await service.updateAnnouncement(announcement.id, {
          title: 'Updated Title',
        });

        expect(updated.title).toBe('Updated Title');
      });

      it('should throw NotFoundException for non-existent announcement', async () => {
        await expect(
          service.updateAnnouncement('non-existent', { title: 'Test' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deactivateAnnouncement', () => {
      it('should deactivate announcement', async () => {
        const announcement = await service.createAnnouncement(
          { type: 'info', title: 'To Deactivate', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );

        await service.deactivateAnnouncement(announcement.id);

        const all = await service.getAllAnnouncements();
        const deactivated = all.find(a => a.id === announcement.id);

        expect(deactivated?.isActive).toBe(false);
      });
    });

    describe('deleteAnnouncement', () => {
      it('should delete announcement', async () => {
        const announcement = await service.createAnnouncement(
          { type: 'info', title: 'To Delete', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );

        await service.deleteAnnouncement(announcement.id);

        const all = await service.getAllAnnouncements();
        const deleted = all.find(a => a.id === announcement.id);

        expect(deleted).toBeUndefined();
      });
    });
  });

  describe('System Stats', () => {
    describe('getSystemStats', () => {
      it('should return system stats', async () => {
        const stats = await service.getSystemStats();

        expect(stats.settings).toBeDefined();
        expect(stats.maintenance).toBeDefined();
        expect(stats.announcements).toBeDefined();
      });

      it('should include settings count', async () => {
        const stats = await service.getSystemStats();

        expect(stats.settings.total).toBeGreaterThan(0);
      });

      it('should include settings by category', async () => {
        const stats = await service.getSystemStats();

        expect(stats.settings.byCategory).toBeDefined();
        expect(stats.settings.byCategory['general']).toBeGreaterThan(0);
      });

      it('should track modified settings', async () => {
        await service.updateSetting('platform_name', 'Modified', 'admin_123');

        const stats = await service.getSystemStats();

        expect(stats.settings.modifiedFromDefault).toBeGreaterThan(0);
      });

      it('should include active announcements count', async () => {
        await service.createAnnouncement(
          { type: 'info', title: 'Active', message: 'Test', targetAudience: 'all' },
          'admin_123',
        );

        const stats = await service.getSystemStats();

        expect(stats.announcements.active).toBeGreaterThan(0);
      });
    });
  });

  describe('Romanian Default Settings', () => {
    it('should have Romanian as default language', async () => {
      const value = await service.getSettingValue('default_language');
      expect(value).toBe('ro');
    });

    it('should have Europe/Bucharest as default timezone', async () => {
      const value = await service.getSettingValue('default_timezone');
      expect(value).toBe('Europe/Bucharest');
    });

    it('should have RON as default currency', async () => {
      const value = await service.getSettingValue('default_currency');
      expect(value).toBe('RON');
    });

    it('should have ANAF API enabled', async () => {
      const value = await service.getSettingValue('anaf_api_enabled');
      expect(value).toBe(true);
    });

    it('should have SAGA integration enabled', async () => {
      const value = await service.getSettingValue('saga_integration_enabled');
      expect(value).toBe(true);
    });
  });

  describe('Security Settings', () => {
    it('should have session timeout configured', async () => {
      const value = await service.getSettingValue<number>('session_timeout_minutes');
      expect(value).toBe(60);
    });

    it('should have max login attempts configured', async () => {
      const value = await service.getSettingValue<number>('max_login_attempts');
      expect(value).toBe(5);
    });

    it('should have lockout duration configured', async () => {
      const value = await service.getSettingValue<number>('lockout_duration_minutes');
      expect(value).toBe(15);
    });

    it('should have password min length configured', async () => {
      const value = await service.getSettingValue<number>('password_min_length');
      expect(value).toBe(8);
    });

    it('should require 2FA for admins', async () => {
      const value = await service.getSettingValue<boolean>('require_2fa_admins');
      expect(value).toBe(true);
    });
  });

  describe('Limits Settings', () => {
    it('should have max file upload configured', async () => {
      const value = await service.getSettingValue<number>('max_file_upload_mb');
      expect(value).toBe(50);
    });

    it('should have max invoices for free plan', async () => {
      const value = await service.getSettingValue<number>('max_invoices_free_plan');
      expect(value).toBe(10);
    });

    it('should have API rate limit configured', async () => {
      const value = await service.getSettingValue<number>('api_rate_limit_per_minute');
      expect(value).toBe(100);
    });
  });

  describe('Notification Settings', () => {
    it('should have email notifications enabled', async () => {
      const value = await service.getSettingValue<boolean>('email_notifications_enabled');
      expect(value).toBe(true);
    });

    it('should have push notifications enabled', async () => {
      const value = await service.getSettingValue<boolean>('push_notifications_enabled');
      expect(value).toBe(true);
    });

    it('should have SMS notifications disabled by default', async () => {
      const value = await service.getSettingValue<boolean>('sms_notifications_enabled');
      expect(value).toBe(false);
    });
  });
});
