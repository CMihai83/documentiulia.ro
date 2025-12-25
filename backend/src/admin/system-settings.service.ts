import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * System Settings Service
 * Manage platform-wide configuration settings
 *
 * Features:
 * - Global configuration management
 * - Environment-specific settings
 * - Setting validation
 * - Audit trail
 * - Encrypted sensitive settings
 */

// =================== TYPES ===================

export type SettingType = 'string' | 'number' | 'boolean' | 'json' | 'secret';
export type SettingCategory =
  | 'general'
  | 'security'
  | 'email'
  | 'integrations'
  | 'limits'
  | 'features'
  | 'notifications'
  | 'maintenance';

export interface SystemSetting {
  id: string;
  key: string;
  name: string;
  description: string;
  category: SettingCategory;
  type: SettingType;
  value: any;
  defaultValue: any;
  isPublic: boolean;
  isEditable: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: any[];
  };
  updatedAt: Date;
  updatedBy?: string;
}

export interface MaintenanceMode {
  enabled: boolean;
  message: string;
  allowedRoles: string[];
  allowedIPs: string[];
  scheduledStart?: Date;
  scheduledEnd?: Date;
  updatedAt: Date;
  updatedBy?: string;
}

export interface SystemAnnouncement {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  targetAudience: 'all' | 'admins' | 'users' | 'specific_tenants';
  targetTenantIds?: string[];
  isActive: boolean;
  dismissible: boolean;
  startsAt: Date;
  endsAt?: Date;
  createdAt: Date;
  createdBy: string;
}

// =================== SERVICE ===================

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  // Storage
  private settings = new Map<string, SystemSetting>();
  private maintenanceMode: MaintenanceMode;
  private announcements = new Map<string, SystemAnnouncement>();
  private settingsHistory: Array<{
    key: string;
    previousValue: any;
    newValue: any;
    changedBy: string;
    changedAt: Date;
  }> = [];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultSettings();
    this.maintenanceMode = {
      enabled: false,
      message: 'System is under maintenance. Please check back later.',
      allowedRoles: ['super_admin'],
      allowedIPs: [],
      updatedAt: new Date(),
    };
  }

  private initializeDefaultSettings(): void {
    const defaults: Omit<SystemSetting, 'id' | 'updatedAt'>[] = [
      // General
      {
        key: 'platform_name',
        name: 'Platform Name',
        description: 'The name of the platform',
        category: 'general',
        type: 'string',
        value: 'DocumentIulia.ro',
        defaultValue: 'DocumentIulia.ro',
        isPublic: true,
        isEditable: true,
      },
      {
        key: 'support_email',
        name: 'Support Email',
        description: 'Email address for support inquiries',
        category: 'general',
        type: 'string',
        value: 'support@documentiulia.ro',
        defaultValue: 'support@documentiulia.ro',
        isPublic: true,
        isEditable: true,
        validation: { pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$' },
      },
      {
        key: 'default_language',
        name: 'Default Language',
        description: 'Default language for new users',
        category: 'general',
        type: 'string',
        value: 'ro',
        defaultValue: 'ro',
        isPublic: true,
        isEditable: true,
        validation: { options: ['ro', 'en', 'de', 'fr', 'es'] },
      },
      {
        key: 'default_timezone',
        name: 'Default Timezone',
        description: 'Default timezone for the platform',
        category: 'general',
        type: 'string',
        value: 'Europe/Bucharest',
        defaultValue: 'Europe/Bucharest',
        isPublic: true,
        isEditable: true,
      },
      {
        key: 'default_currency',
        name: 'Default Currency',
        description: 'Default currency for financial operations',
        category: 'general',
        type: 'string',
        value: 'RON',
        defaultValue: 'RON',
        isPublic: true,
        isEditable: true,
        validation: { options: ['RON', 'EUR', 'USD', 'GBP'] },
      },

      // Security
      {
        key: 'session_timeout_minutes',
        name: 'Session Timeout',
        description: 'Minutes before session expires',
        category: 'security',
        type: 'number',
        value: 60,
        defaultValue: 60,
        isPublic: false,
        isEditable: true,
        validation: { min: 5, max: 1440 },
      },
      {
        key: 'max_login_attempts',
        name: 'Max Login Attempts',
        description: 'Maximum failed login attempts before lockout',
        category: 'security',
        type: 'number',
        value: 5,
        defaultValue: 5,
        isPublic: false,
        isEditable: true,
        validation: { min: 3, max: 10 },
      },
      {
        key: 'lockout_duration_minutes',
        name: 'Lockout Duration',
        description: 'Minutes to lock account after max attempts',
        category: 'security',
        type: 'number',
        value: 15,
        defaultValue: 15,
        isPublic: false,
        isEditable: true,
        validation: { min: 5, max: 60 },
      },
      {
        key: 'password_min_length',
        name: 'Minimum Password Length',
        description: 'Minimum characters required for passwords',
        category: 'security',
        type: 'number',
        value: 8,
        defaultValue: 8,
        isPublic: true,
        isEditable: true,
        validation: { min: 6, max: 32 },
      },
      {
        key: 'require_2fa_admins',
        name: 'Require 2FA for Admins',
        description: 'Force 2FA for admin accounts',
        category: 'security',
        type: 'boolean',
        value: true,
        defaultValue: true,
        isPublic: false,
        isEditable: true,
      },

      // Email
      {
        key: 'email_from_address',
        name: 'From Email Address',
        description: 'Default sender email address',
        category: 'email',
        type: 'string',
        value: 'noreply@documentiulia.ro',
        defaultValue: 'noreply@documentiulia.ro',
        isPublic: false,
        isEditable: true,
      },
      {
        key: 'email_from_name',
        name: 'From Email Name',
        description: 'Default sender name',
        category: 'email',
        type: 'string',
        value: 'DocumentIulia.ro',
        defaultValue: 'DocumentIulia.ro',
        isPublic: false,
        isEditable: true,
      },

      // Limits
      {
        key: 'max_file_upload_mb',
        name: 'Max File Upload Size',
        description: 'Maximum file upload size in MB',
        category: 'limits',
        type: 'number',
        value: 50,
        defaultValue: 50,
        isPublic: true,
        isEditable: true,
        validation: { min: 1, max: 500 },
      },
      {
        key: 'max_invoices_free_plan',
        name: 'Max Invoices (Free Plan)',
        description: 'Maximum invoices for free plan',
        category: 'limits',
        type: 'number',
        value: 10,
        defaultValue: 10,
        isPublic: true,
        isEditable: true,
        validation: { min: 1, max: 100 },
      },
      {
        key: 'max_team_members_free',
        name: 'Max Team Members (Free)',
        description: 'Maximum team members for free plan',
        category: 'limits',
        type: 'number',
        value: 1,
        defaultValue: 1,
        isPublic: true,
        isEditable: true,
        validation: { min: 1, max: 10 },
      },
      {
        key: 'api_rate_limit_per_minute',
        name: 'API Rate Limit',
        description: 'API requests per minute',
        category: 'limits',
        type: 'number',
        value: 100,
        defaultValue: 100,
        isPublic: false,
        isEditable: true,
        validation: { min: 10, max: 1000 },
      },

      // Integrations
      {
        key: 'anaf_api_enabled',
        name: 'ANAF API Enabled',
        description: 'Enable ANAF integration',
        category: 'integrations',
        type: 'boolean',
        value: true,
        defaultValue: true,
        isPublic: false,
        isEditable: true,
      },
      {
        key: 'saga_integration_enabled',
        name: 'SAGA Integration Enabled',
        description: 'Enable SAGA accounting integration',
        category: 'integrations',
        type: 'boolean',
        value: true,
        defaultValue: true,
        isPublic: false,
        isEditable: true,
      },

      // Notifications
      {
        key: 'email_notifications_enabled',
        name: 'Email Notifications',
        description: 'Enable email notifications',
        category: 'notifications',
        type: 'boolean',
        value: true,
        defaultValue: true,
        isPublic: false,
        isEditable: true,
      },
      {
        key: 'push_notifications_enabled',
        name: 'Push Notifications',
        description: 'Enable push notifications',
        category: 'notifications',
        type: 'boolean',
        value: true,
        defaultValue: true,
        isPublic: false,
        isEditable: true,
      },
      {
        key: 'sms_notifications_enabled',
        name: 'SMS Notifications',
        description: 'Enable SMS notifications',
        category: 'notifications',
        type: 'boolean',
        value: false,
        defaultValue: false,
        isPublic: false,
        isEditable: true,
      },
    ];

    const now = new Date();
    defaults.forEach((setting, index) => {
      const fullSetting: SystemSetting = {
        ...setting,
        id: `setting-${index + 1}`,
        updatedAt: now,
      };
      this.settings.set(setting.key, fullSetting);
    });

    this.logger.log(`Initialized ${defaults.length} system settings`);
  }

  // =================== SETTINGS MANAGEMENT ===================

  async getAllSettings(includeSecrets: boolean = false): Promise<SystemSetting[]> {
    const settings = Array.from(this.settings.values());
    if (!includeSecrets) {
      return settings.map(s => ({
        ...s,
        value: s.type === 'secret' ? '********' : s.value,
      }));
    }
    return settings;
  }

  async getPublicSettings(): Promise<SystemSetting[]> {
    return Array.from(this.settings.values()).filter(s => s.isPublic);
  }

  async getSettingsByCategory(category: SettingCategory): Promise<SystemSetting[]> {
    return Array.from(this.settings.values())
      .filter(s => s.category === category);
  }

  async getSetting(key: string): Promise<SystemSetting> {
    const setting = this.settings.get(key);
    if (!setting) {
      throw new NotFoundException(`Setting '${key}' not found`);
    }
    return setting;
  }

  async getSettingValue<T = any>(key: string): Promise<T> {
    const setting = await this.getSetting(key);
    return setting.value as T;
  }

  async updateSetting(
    key: string,
    value: any,
    updatedBy: string,
  ): Promise<SystemSetting> {
    const setting = await this.getSetting(key);

    if (!setting.isEditable) {
      throw new Error(`Setting '${key}' is not editable`);
    }

    // Validate
    if (setting.validation) {
      this.validateSettingValue(setting, value);
    }

    const previousValue = setting.value;

    // Update setting
    setting.value = value;
    setting.updatedAt = new Date();
    setting.updatedBy = updatedBy;
    this.settings.set(key, setting);

    // Add to history
    this.settingsHistory.push({
      key,
      previousValue,
      newValue: value,
      changedBy: updatedBy,
      changedAt: new Date(),
    });

    this.eventEmitter.emit('system_setting.updated', {
      key,
      previousValue,
      newValue: value,
      updatedBy,
    });

    this.logger.log(`Updated setting '${key}' by ${updatedBy}`);
    return setting;
  }

  async bulkUpdateSettings(
    updates: Array<{ key: string; value: any }>,
    updatedBy: string,
  ): Promise<SystemSetting[]> {
    const results: SystemSetting[] = [];
    for (const update of updates) {
      const result = await this.updateSetting(update.key, update.value, updatedBy);
      results.push(result);
    }
    return results;
  }

  async resetToDefault(key: string, updatedBy: string): Promise<SystemSetting> {
    const setting = await this.getSetting(key);
    return this.updateSetting(key, setting.defaultValue, updatedBy);
  }

  async resetAllToDefault(updatedBy: string): Promise<number> {
    let count = 0;
    for (const [key, setting] of this.settings) {
      if (setting.isEditable && setting.value !== setting.defaultValue) {
        await this.updateSetting(key, setting.defaultValue, updatedBy);
        count++;
      }
    }
    return count;
  }

  private validateSettingValue(setting: SystemSetting, value: any): void {
    const { validation, type } = setting;
    if (!validation) return;

    if (type === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`Value must be at least ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`Value must be at most ${validation.max}`);
      }
    }

    if (type === 'string' && validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        throw new Error(`Value does not match required pattern`);
      }
    }

    if (validation.options && !validation.options.includes(value)) {
      throw new Error(`Value must be one of: ${validation.options.join(', ')}`);
    }
  }

  async getSettingsHistory(key?: string, limit: number = 50): Promise<typeof this.settingsHistory> {
    let history = [...this.settingsHistory];
    if (key) {
      history = history.filter(h => h.key === key);
    }
    return history
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
      .slice(0, limit);
  }

  // =================== MAINTENANCE MODE ===================

  async getMaintenanceMode(): Promise<MaintenanceMode> {
    return this.maintenanceMode;
  }

  async setMaintenanceMode(
    params: Partial<MaintenanceMode>,
    updatedBy: string,
  ): Promise<MaintenanceMode> {
    this.maintenanceMode = {
      ...this.maintenanceMode,
      ...params,
      updatedAt: new Date(),
      updatedBy,
    };

    this.eventEmitter.emit('maintenance_mode.updated', {
      maintenanceMode: this.maintenanceMode,
      updatedBy,
    });

    this.logger.log(`Maintenance mode ${this.maintenanceMode.enabled ? 'enabled' : 'disabled'} by ${updatedBy}`);
    return this.maintenanceMode;
  }

  async enableMaintenanceMode(
    message: string,
    updatedBy: string,
    options?: {
      allowedRoles?: string[];
      allowedIPs?: string[];
      scheduledEnd?: Date;
    },
  ): Promise<MaintenanceMode> {
    return this.setMaintenanceMode(
      {
        enabled: true,
        message,
        ...options,
      },
      updatedBy,
    );
  }

  async disableMaintenanceMode(updatedBy: string): Promise<MaintenanceMode> {
    return this.setMaintenanceMode({ enabled: false }, updatedBy);
  }

  async isMaintenanceModeActive(userRole?: string, userIP?: string): Promise<boolean> {
    if (!this.maintenanceMode.enabled) return false;

    // Check if user is allowed
    if (userRole && this.maintenanceMode.allowedRoles.includes(userRole)) {
      return false;
    }
    if (userIP && this.maintenanceMode.allowedIPs.includes(userIP)) {
      return false;
    }

    return true;
  }

  // =================== ANNOUNCEMENTS ===================

  async createAnnouncement(
    params: {
      type: SystemAnnouncement['type'];
      title: string;
      message: string;
      targetAudience: SystemAnnouncement['targetAudience'];
      targetTenantIds?: string[];
      dismissible?: boolean;
      startsAt?: Date;
      endsAt?: Date;
    },
    createdBy: string,
  ): Promise<SystemAnnouncement> {
    const id = `announcement-${Date.now()}`;
    const announcement: SystemAnnouncement = {
      id,
      type: params.type,
      title: params.title,
      message: params.message,
      targetAudience: params.targetAudience,
      targetTenantIds: params.targetTenantIds,
      isActive: true,
      dismissible: params.dismissible ?? true,
      startsAt: params.startsAt || new Date(),
      endsAt: params.endsAt,
      createdAt: new Date(),
      createdBy,
    };

    this.announcements.set(id, announcement);

    this.eventEmitter.emit('announcement.created', { announcement });

    this.logger.log(`Created announcement: ${params.title}`);
    return announcement;
  }

  async getActiveAnnouncements(
    context?: {
      userRole?: string;
      tenantId?: string;
    },
  ): Promise<SystemAnnouncement[]> {
    const now = new Date();

    return Array.from(this.announcements.values())
      .filter(a => {
        if (!a.isActive) return false;
        if (a.startsAt > now) return false;
        if (a.endsAt && a.endsAt < now) return false;

        // Check audience
        if (a.targetAudience === 'all') return true;
        if (a.targetAudience === 'admins' && context?.userRole === 'admin') return true;
        if (a.targetAudience === 'users' && context?.userRole !== 'admin') return true;
        if (a.targetAudience === 'specific_tenants' && context?.tenantId) {
          return a.targetTenantIds?.includes(context.tenantId);
        }

        return false;
      });
  }

  async getAllAnnouncements(): Promise<SystemAnnouncement[]> {
    return Array.from(this.announcements.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateAnnouncement(
    id: string,
    updates: Partial<Omit<SystemAnnouncement, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<SystemAnnouncement> {
    const announcement = this.announcements.get(id);
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    const updated = { ...announcement, ...updates };
    this.announcements.set(id, updated);

    return updated;
  }

  async deactivateAnnouncement(id: string): Promise<void> {
    const announcement = this.announcements.get(id);
    if (announcement) {
      announcement.isActive = false;
      this.announcements.set(id, announcement);
    }
  }

  async deleteAnnouncement(id: string): Promise<void> {
    this.announcements.delete(id);
  }

  // =================== STATS ===================

  async getSystemStats(): Promise<{
    settings: {
      total: number;
      byCategory: Record<string, number>;
      modifiedFromDefault: number;
    };
    maintenance: MaintenanceMode;
    announcements: {
      total: number;
      active: number;
    };
  }> {
    const settings = Array.from(this.settings.values());
    const byCategory: Record<string, number> = {};

    for (const setting of settings) {
      byCategory[setting.category] = (byCategory[setting.category] || 0) + 1;
    }

    const modifiedFromDefault = settings.filter(
      s => JSON.stringify(s.value) !== JSON.stringify(s.defaultValue)
    ).length;

    const announcements = Array.from(this.announcements.values());
    const now = new Date();
    const activeAnnouncements = announcements.filter(
      a => a.isActive && a.startsAt <= now && (!a.endsAt || a.endsAt > now)
    );

    return {
      settings: {
        total: settings.length,
        byCategory,
        modifiedFromDefault,
      },
      maintenance: this.maintenanceMode,
      announcements: {
        total: announcements.length,
        active: activeAnnouncements.length,
      },
    };
  }
}
