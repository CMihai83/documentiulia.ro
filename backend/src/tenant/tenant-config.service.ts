import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
export type ConfigScope = 'system' | 'tenant' | 'user' | 'feature';

export type ConfigValueType = 'string' | 'number' | 'boolean' | 'json' | 'array';

export type FeatureFlag =
  | 'ocr_processing' | 'ai_assistant' | 'advanced_reporting' | 'multi_currency'
  | 'saft_submission' | 'efactura_b2b' | 'fleet_management' | 'hr_module'
  | 'webhooks' | 'api_access' | 'bulk_operations' | 'custom_branding';

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

// Interfaces
export interface TenantConfig {
  id: string;
  tenantId: string;
  key: string;
  value: any;
  valueType: ConfigValueType;
  scope: ConfigScope;
  category: string;
  description?: string;
  isSecret: boolean;
  isOverridable: boolean;
  defaultValue?: any;
  validationRules?: ValidationRule[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value: any;
  message: string;
}

export interface TenantProfile {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  timezone: string;
  locale: string;
  currency: string;
  dateFormat: string;
  subscriptionTier: SubscriptionTier;
  features: FeatureFlag[];
  limits: TenantLimits;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantLimits {
  maxUsers: number;
  maxDocumentsPerMonth: number;
  maxStorageGB: number;
  maxApiRequestsPerDay: number;
  maxWebhooks: number;
  maxIntegrations: number;
  maxCustomFields: number;
  maxReportTemplates: number;
}

export interface TenantSettings {
  emailNotifications: boolean;
  twoFactorRequired: boolean;
  sessionTimeoutMinutes: number;
  passwordPolicyStrength: 'low' | 'medium' | 'high';
  dataRetentionDays: number;
  auditLogRetentionDays: number;
  allowPublicApiAccess: boolean;
  ipWhitelist?: string[];
  customDomain?: string;
}

export interface ConfigHistory {
  id: string;
  configId: string;
  tenantId: string;
  key: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  configs: Array<{
    key: string;
    value: any;
    valueType: ConfigValueType;
    category: string;
  }>;
  features: FeatureFlag[];
  limits: TenantLimits;
  createdAt: Date;
}

@Injectable()
export class TenantConfigService {
  private readonly logger = new Logger(TenantConfigService.name);

  // Storage
  private configs: Map<string, TenantConfig> = new Map();
  private profiles: Map<string, TenantProfile> = new Map();
  private history: Map<string, ConfigHistory> = new Map();
  private templates: Map<string, ConfigTemplate> = new Map();

  // Counters
  private configIdCounter = 0;
  private profileIdCounter = 0;
  private historyIdCounter = 0;
  private templateIdCounter = 0;

  // Default limits by tier
  private readonly tierLimits: Record<SubscriptionTier, TenantLimits> = {
    free: {
      maxUsers: 1,
      maxDocumentsPerMonth: 50,
      maxStorageGB: 1,
      maxApiRequestsPerDay: 100,
      maxWebhooks: 0,
      maxIntegrations: 1,
      maxCustomFields: 5,
      maxReportTemplates: 2,
    },
    starter: {
      maxUsers: 3,
      maxDocumentsPerMonth: 200,
      maxStorageGB: 5,
      maxApiRequestsPerDay: 1000,
      maxWebhooks: 2,
      maxIntegrations: 3,
      maxCustomFields: 10,
      maxReportTemplates: 5,
    },
    pro: {
      maxUsers: 10,
      maxDocumentsPerMonth: 1000,
      maxStorageGB: 25,
      maxApiRequestsPerDay: 10000,
      maxWebhooks: 10,
      maxIntegrations: 10,
      maxCustomFields: 50,
      maxReportTemplates: 20,
    },
    business: {
      maxUsers: 50,
      maxDocumentsPerMonth: 5000,
      maxStorageGB: 100,
      maxApiRequestsPerDay: 50000,
      maxWebhooks: 50,
      maxIntegrations: 25,
      maxCustomFields: 100,
      maxReportTemplates: 50,
    },
    enterprise: {
      maxUsers: -1, // Unlimited
      maxDocumentsPerMonth: -1,
      maxStorageGB: -1,
      maxApiRequestsPerDay: -1,
      maxWebhooks: -1,
      maxIntegrations: -1,
      maxCustomFields: -1,
      maxReportTemplates: -1,
    },
  };

  // Features by tier
  private readonly tierFeatures: Record<SubscriptionTier, FeatureFlag[]> = {
    free: ['ocr_processing'],
    starter: ['ocr_processing', 'ai_assistant', 'saft_submission'],
    pro: ['ocr_processing', 'ai_assistant', 'advanced_reporting', 'saft_submission', 'efactura_b2b', 'webhooks', 'api_access'],
    business: ['ocr_processing', 'ai_assistant', 'advanced_reporting', 'multi_currency', 'saft_submission', 'efactura_b2b', 'fleet_management', 'hr_module', 'webhooks', 'api_access', 'bulk_operations'],
    enterprise: ['ocr_processing', 'ai_assistant', 'advanced_reporting', 'multi_currency', 'saft_submission', 'efactura_b2b', 'fleet_management', 'hr_module', 'webhooks', 'api_access', 'bulk_operations', 'custom_branding'],
  };

  constructor(private configService: ConfigService) {
    this.logger.log('Multi-tenant Configuration Service initialized');
    this.initializeDefaultTemplates();
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private initializeDefaultTemplates(): void {
    const tiers: SubscriptionTier[] = ['free', 'starter', 'pro', 'business', 'enterprise'];

    for (const tier of tiers) {
      const template: ConfigTemplate = {
        id: this.generateId('tpl', ++this.templateIdCounter),
        name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
        description: `Default configuration template for ${tier} tier`,
        tier,
        configs: this.getDefaultConfigsForTier(tier),
        features: this.tierFeatures[tier],
        limits: this.tierLimits[tier],
        createdAt: new Date(),
      };
      this.templates.set(template.id, template);
    }
  }

  private getDefaultConfigsForTier(tier: SubscriptionTier): Array<{
    key: string;
    value: any;
    valueType: ConfigValueType;
    category: string;
  }> {
    const baseConfigs: Array<{
      key: string;
      value: any;
      valueType: ConfigValueType;
      category: string;
    }> = [
      { key: 'app.theme', value: 'light', valueType: 'string' as ConfigValueType, category: 'appearance' },
      { key: 'app.language', value: 'ro', valueType: 'string' as ConfigValueType, category: 'localization' },
      { key: 'security.sessionTimeout', value: 30, valueType: 'number' as ConfigValueType, category: 'security' },
      { key: 'notifications.email', value: true, valueType: 'boolean' as ConfigValueType, category: 'notifications' },
    ];

    if (tier !== 'free') {
      baseConfigs.push(
        { key: 'integrations.anaf.enabled', value: true, valueType: 'boolean' as ConfigValueType, category: 'integrations' },
        { key: 'export.formats', value: ['pdf', 'csv', 'xml'], valueType: 'array' as ConfigValueType, category: 'export' },
      );
    }

    if (tier === 'pro' || tier === 'business' || tier === 'enterprise') {
      baseConfigs.push(
        { key: 'api.rateLimit', value: 1000, valueType: 'number' as ConfigValueType, category: 'api' },
        { key: 'reporting.scheduled', value: true, valueType: 'boolean' as ConfigValueType, category: 'reporting' },
      );
    }

    if (tier === 'enterprise') {
      baseConfigs.push(
        { key: 'branding.custom', value: true, valueType: 'boolean' as ConfigValueType, category: 'branding' },
        { key: 'sso.enabled', value: false, valueType: 'boolean' as ConfigValueType, category: 'security' },
      );
    }

    return baseConfigs;
  }

  // =================== TENANT PROFILE MANAGEMENT ===================

  async createProfile(
    tenantId: string,
    name: string,
    tier: SubscriptionTier,
    options?: {
      displayName?: string;
      domain?: string;
      timezone?: string;
      locale?: string;
      currency?: string;
      customLimits?: Partial<TenantLimits>;
      customFeatures?: FeatureFlag[];
      settings?: Partial<TenantSettings>;
    },
  ): Promise<TenantProfile> {
    const profile: TenantProfile = {
      id: this.generateId('prf', ++this.profileIdCounter),
      tenantId,
      name,
      displayName: options?.displayName || name,
      domain: options?.domain,
      timezone: options?.timezone || 'Europe/Bucharest',
      locale: options?.locale || 'ro-RO',
      currency: options?.currency || 'RON',
      dateFormat: 'DD.MM.YYYY',
      subscriptionTier: tier,
      features: options?.customFeatures || this.tierFeatures[tier],
      limits: { ...this.tierLimits[tier], ...options?.customLimits },
      settings: {
        emailNotifications: true,
        twoFactorRequired: tier === 'enterprise',
        sessionTimeoutMinutes: tier === 'enterprise' ? 15 : 30,
        passwordPolicyStrength: tier === 'enterprise' ? 'high' : 'medium',
        dataRetentionDays: 365,
        auditLogRetentionDays: tier === 'enterprise' ? 730 : 365,
        allowPublicApiAccess: tier !== 'free',
        ...options?.settings,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profiles.set(tenantId, profile);
    this.logger.log(`Created profile for tenant ${tenantId} (${tier} tier)`);
    return profile;
  }

  async getProfile(tenantId: string): Promise<TenantProfile | null> {
    return this.profiles.get(tenantId) || null;
  }

  async updateProfile(
    tenantId: string,
    updates: Partial<Omit<TenantProfile, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<TenantProfile | null> {
    const profile = this.profiles.get(tenantId);
    if (!profile) return null;

    Object.assign(profile, updates, { updatedAt: new Date() });
    this.profiles.set(tenantId, profile);
    return profile;
  }

  async upgradeSubscription(
    tenantId: string,
    newTier: SubscriptionTier,
  ): Promise<TenantProfile | null> {
    const profile = this.profiles.get(tenantId);
    if (!profile) return null;

    const oldTier = profile.subscriptionTier;
    profile.subscriptionTier = newTier;
    profile.features = this.tierFeatures[newTier];
    profile.limits = this.tierLimits[newTier];
    profile.updatedAt = new Date();

    this.profiles.set(tenantId, profile);
    this.logger.log(`Upgraded tenant ${tenantId} from ${oldTier} to ${newTier}`);
    return profile;
  }

  async getAllProfiles(): Promise<TenantProfile[]> {
    return Array.from(this.profiles.values());
  }

  // =================== CONFIG MANAGEMENT ===================

  async setConfig(
    tenantId: string,
    key: string,
    value: any,
    options?: {
      valueType?: ConfigValueType;
      scope?: ConfigScope;
      category?: string;
      description?: string;
      isSecret?: boolean;
      isOverridable?: boolean;
      defaultValue?: any;
      validationRules?: ValidationRule[];
      updatedBy?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<TenantConfig> {
    const configKey = `${tenantId}:${key}`;
    const existing = this.configs.get(configKey);

    // Validate if rules exist
    if (options?.validationRules) {
      const validation = this.validateValue(value, options.validationRules);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Record history if updating
    if (existing) {
      await this.recordHistory(existing, value, options?.updatedBy || 'system');
    }

    const config: TenantConfig = {
      id: existing?.id || this.generateId('cfg', ++this.configIdCounter),
      tenantId,
      key,
      value,
      valueType: options?.valueType || this.detectValueType(value),
      scope: options?.scope || 'tenant',
      category: options?.category || 'general',
      description: options?.description,
      isSecret: options?.isSecret || key.toLowerCase().includes('secret') || key.toLowerCase().includes('password'),
      isOverridable: options?.isOverridable ?? true,
      defaultValue: options?.defaultValue,
      validationRules: options?.validationRules,
      metadata: options?.metadata,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
      updatedBy: options?.updatedBy,
    };

    this.configs.set(configKey, config);
    return config;
  }

  private detectValueType(value: any): ConfigValueType {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    return 'json';
  }

  private validateValue(value: any, rules: ValidationRule[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      switch (rule.type) {
        case 'min':
          if (typeof value === 'number' && value < rule.value) {
            errors.push(rule.message);
          }
          break;
        case 'max':
          if (typeof value === 'number' && value > rule.value) {
            errors.push(rule.message);
          }
          break;
        case 'pattern':
          if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
            errors.push(rule.message);
          }
          break;
        case 'enum':
          if (!rule.value.includes(value)) {
            errors.push(rule.message);
          }
          break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async getConfig(tenantId: string, key: string): Promise<TenantConfig | null> {
    return this.configs.get(`${tenantId}:${key}`) || null;
  }

  async getConfigValue<T = any>(tenantId: string, key: string, defaultValue?: T): Promise<T> {
    const config = await this.getConfig(tenantId, key);
    if (!config) return defaultValue as T;
    return config.value as T;
  }

  async getAllConfigs(
    tenantId: string,
    options?: {
      category?: string;
      scope?: ConfigScope;
      includeSecrets?: boolean;
    },
  ): Promise<TenantConfig[]> {
    let configs = Array.from(this.configs.values())
      .filter(c => c.tenantId === tenantId);

    if (options?.category) {
      configs = configs.filter(c => c.category === options.category);
    }
    if (options?.scope) {
      configs = configs.filter(c => c.scope === options.scope);
    }
    if (!options?.includeSecrets) {
      configs = configs.map(c => ({
        ...c,
        value: c.isSecret ? '[SECRET]' : c.value,
      }));
    }

    return configs.sort((a, b) => a.key.localeCompare(b.key));
  }

  async deleteConfig(tenantId: string, key: string): Promise<boolean> {
    return this.configs.delete(`${tenantId}:${key}`);
  }

  async bulkSetConfigs(
    tenantId: string,
    configs: Array<{ key: string; value: any; category?: string }>,
    updatedBy?: string,
  ): Promise<TenantConfig[]> {
    const results: TenantConfig[] = [];
    for (const cfg of configs) {
      const result = await this.setConfig(tenantId, cfg.key, cfg.value, {
        category: cfg.category,
        updatedBy,
      });
      results.push(result);
    }
    return results;
  }

  // =================== CONFIG HISTORY ===================

  private async recordHistory(
    config: TenantConfig,
    newValue: any,
    changedBy: string,
    reason?: string,
  ): Promise<void> {
    const historyEntry: ConfigHistory = {
      id: this.generateId('hist', ++this.historyIdCounter),
      configId: config.id,
      tenantId: config.tenantId,
      key: config.key,
      oldValue: config.isSecret ? '[SECRET]' : config.value,
      newValue: config.isSecret ? '[SECRET]' : newValue,
      changedBy,
      changedAt: new Date(),
      reason,
    };

    this.history.set(historyEntry.id, historyEntry);
  }

  async getConfigHistory(
    tenantId: string,
    key?: string,
    options?: { limit?: number },
  ): Promise<ConfigHistory[]> {
    let entries = Array.from(this.history.values())
      .filter(h => h.tenantId === tenantId);

    if (key) {
      entries = entries.filter(h => h.key === key);
    }

    entries.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());

    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  // =================== FEATURE FLAGS ===================

  async hasFeature(tenantId: string, feature: FeatureFlag): Promise<boolean> {
    const profile = this.profiles.get(tenantId);
    if (!profile) return false;
    return profile.features.includes(feature);
  }

  async enableFeature(tenantId: string, feature: FeatureFlag): Promise<TenantProfile | null> {
    const profile = this.profiles.get(tenantId);
    if (!profile) return null;

    if (!profile.features.includes(feature)) {
      profile.features.push(feature);
      profile.updatedAt = new Date();
      this.profiles.set(tenantId, profile);
    }

    return profile;
  }

  async disableFeature(tenantId: string, feature: FeatureFlag): Promise<TenantProfile | null> {
    const profile = this.profiles.get(tenantId);
    if (!profile) return null;

    profile.features = profile.features.filter(f => f !== feature);
    profile.updatedAt = new Date();
    this.profiles.set(tenantId, profile);

    return profile;
  }

  async getEnabledFeatures(tenantId: string): Promise<FeatureFlag[]> {
    const profile = this.profiles.get(tenantId);
    return profile?.features || [];
  }

  // =================== LIMITS MANAGEMENT ===================

  async checkLimit(
    tenantId: string,
    limitKey: keyof TenantLimits,
    currentUsage: number,
  ): Promise<{ allowed: boolean; limit: number; usage: number; remaining: number }> {
    const profile = this.profiles.get(tenantId);
    if (!profile) {
      return { allowed: false, limit: 0, usage: currentUsage, remaining: 0 };
    }

    const limit = profile.limits[limitKey];
    const unlimited = limit === -1;
    const allowed = unlimited || currentUsage < limit;
    const remaining = unlimited ? -1 : Math.max(0, limit - currentUsage);

    return { allowed, limit, usage: currentUsage, remaining };
  }

  async getLimits(tenantId: string): Promise<TenantLimits | null> {
    const profile = this.profiles.get(tenantId);
    return profile?.limits || null;
  }

  async updateLimits(
    tenantId: string,
    limits: Partial<TenantLimits>,
  ): Promise<TenantProfile | null> {
    const profile = this.profiles.get(tenantId);
    if (!profile) return null;

    profile.limits = { ...profile.limits, ...limits };
    profile.updatedAt = new Date();
    this.profiles.set(tenantId, profile);

    return profile;
  }

  // =================== SETTINGS MANAGEMENT ===================

  async getSetting<K extends keyof TenantSettings>(
    tenantId: string,
    key: K,
  ): Promise<TenantSettings[K] | null> {
    const profile = this.profiles.get(tenantId);
    return profile?.settings[key] ?? null;
  }

  async updateSettings(
    tenantId: string,
    settings: Partial<TenantSettings>,
  ): Promise<TenantProfile | null> {
    const profile = this.profiles.get(tenantId);
    if (!profile) return null;

    profile.settings = { ...profile.settings, ...settings };
    profile.updatedAt = new Date();
    this.profiles.set(tenantId, profile);

    return profile;
  }

  // =================== TEMPLATES ===================

  async getTemplate(templateId: string): Promise<ConfigTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getTemplateByTier(tier: SubscriptionTier): Promise<ConfigTemplate | null> {
    const templates = Array.from(this.templates.values());
    return templates.find(t => t.tier === tier) || null;
  }

  async getAllTemplates(): Promise<ConfigTemplate[]> {
    return Array.from(this.templates.values());
  }

  async applyTemplate(tenantId: string, templateId: string): Promise<TenantConfig[]> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const results: TenantConfig[] = [];
    for (const cfg of template.configs) {
      const result = await this.setConfig(tenantId, cfg.key, cfg.value, {
        valueType: cfg.valueType,
        category: cfg.category,
        updatedBy: 'template',
      });
      results.push(result);
    }

    // Update profile with template features and limits
    const profile = this.profiles.get(tenantId);
    if (profile) {
      profile.features = template.features;
      profile.limits = template.limits;
      profile.updatedAt = new Date();
      this.profiles.set(tenantId, profile);
    }

    return results;
  }

  // =================== METADATA ===================

  getSubscriptionTiers(): SubscriptionTier[] {
    return ['free', 'starter', 'pro', 'business', 'enterprise'];
  }

  getFeatureFlags(): FeatureFlag[] {
    return [
      'ocr_processing', 'ai_assistant', 'advanced_reporting', 'multi_currency',
      'saft_submission', 'efactura_b2b', 'fleet_management', 'hr_module',
      'webhooks', 'api_access', 'bulk_operations', 'custom_branding',
    ];
  }

  getDefaultLimitsForTier(tier: SubscriptionTier): TenantLimits {
    return { ...this.tierLimits[tier] };
  }

  getDefaultFeaturesForTier(tier: SubscriptionTier): FeatureFlag[] {
    return [...this.tierFeatures[tier]];
  }

  getConfigCategories(): string[] {
    return [
      'general', 'appearance', 'localization', 'security',
      'notifications', 'integrations', 'api', 'export',
      'reporting', 'branding',
    ];
  }
}
