import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Feature Flags Service
 * Control feature availability across the platform
 *
 * Features:
 * - Global feature toggles
 * - Tenant-specific feature flags
 * - User-specific feature flags
 * - Percentage rollouts
 * - A/B testing support
 * - Time-based activation
 */

// =================== TYPES ===================

export type FeatureFlagType = 'boolean' | 'percentage' | 'variant' | 'schedule';
export type FeatureEnvironment = 'development' | 'staging' | 'production';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: FeatureFlagType;
  enabled: boolean;
  defaultValue: any;
  environments: FeatureEnvironment[];

  // Percentage rollout (0-100)
  rolloutPercentage?: number;

  // A/B variants
  variants?: Array<{
    key: string;
    name: string;
    weight: number;
    value: any;
  }>;

  // Schedule
  schedule?: {
    startDate?: Date;
    endDate?: Date;
    timezone?: string;
  };

  // Targeting
  targeting?: {
    tenantIds?: string[];
    userIds?: string[];
    userRoles?: string[];
    countries?: string[];
    subscriptionPlans?: string[];
  };

  // Metadata
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface FeatureFlagOverride {
  id: string;
  flagId: string;
  type: 'tenant' | 'user';
  targetId: string;
  value: any;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
  reason?: string;
}

export interface FeatureFlagAudit {
  id: string;
  flagId: string;
  action: 'created' | 'updated' | 'deleted' | 'override_added' | 'override_removed';
  previousValue?: any;
  newValue?: any;
  performedBy: string;
  performedAt: Date;
  reason?: string;
}

// =================== SERVICE ===================

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  // Storage
  private flags = new Map<string, FeatureFlag>();
  private overrides = new Map<string, FeatureFlagOverride[]>();
  private audits: FeatureFlagAudit[] = [];

  // Cache for evaluated flags
  private evaluationCache = new Map<string, { value: any; expiresAt: number }>();
  private readonly cacheTTL = 60 * 1000; // 1 minute

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags(): void {
    const defaultFlags: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>[] = [
      // Core Features
      {
        id: 'flag-ai-assistant',
        key: 'ai_assistant',
        name: 'AI Assistant',
        description: 'Enable AI-powered chat assistant',
        type: 'boolean',
        enabled: true,
        defaultValue: true,
        environments: ['development', 'staging', 'production'],
        category: 'ai',
        tags: ['core', 'ai'],
        createdBy: 'system',
      },
      {
        id: 'flag-voice-commands',
        key: 'voice_commands',
        name: 'Voice Commands',
        description: 'Enable voice command recognition',
        type: 'percentage',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 50,
        environments: ['development', 'staging'],
        category: 'ai',
        tags: ['beta', 'ai', 'mobile'],
        createdBy: 'system',
      },
      {
        id: 'flag-biometric-auth',
        key: 'biometric_auth',
        name: 'Biometric Authentication',
        description: 'Enable Face ID / Touch ID authentication',
        type: 'boolean',
        enabled: true,
        defaultValue: true,
        environments: ['development', 'staging', 'production'],
        category: 'security',
        tags: ['security', 'mobile'],
        createdBy: 'system',
      },
      {
        id: 'flag-dark-mode',
        key: 'dark_mode',
        name: 'Dark Mode',
        description: 'Enable dark theme option',
        type: 'boolean',
        enabled: true,
        defaultValue: true,
        environments: ['development', 'staging', 'production'],
        category: 'ui',
        tags: ['ui', 'theme'],
        createdBy: 'system',
      },
      {
        id: 'flag-new-dashboard',
        key: 'new_dashboard',
        name: 'New Dashboard Layout',
        description: 'Enable redesigned dashboard',
        type: 'variant',
        enabled: true,
        defaultValue: 'classic',
        variants: [
          { key: 'classic', name: 'Classic Layout', weight: 50, value: 'classic' },
          { key: 'modern', name: 'Modern Layout', weight: 30, value: 'modern' },
          { key: 'compact', name: 'Compact Layout', weight: 20, value: 'compact' },
        ],
        environments: ['development', 'staging'],
        category: 'ui',
        tags: ['ui', 'ab-test'],
        createdBy: 'system',
      },
      {
        id: 'flag-e-factura-v2',
        key: 'efactura_v2',
        name: 'e-Factura V2 Integration',
        description: 'Enable new e-Factura API integration',
        type: 'schedule',
        enabled: true,
        defaultValue: false,
        schedule: {
          startDate: new Date('2025-01-15'),
          timezone: 'Europe/Bucharest',
        },
        environments: ['production'],
        category: 'integrations',
        tags: ['anaf', 'compliance'],
        createdBy: 'system',
      },
      {
        id: 'flag-bulk-operations',
        key: 'bulk_operations',
        name: 'Bulk Operations',
        description: 'Enable bulk edit/delete operations',
        type: 'boolean',
        enabled: true,
        defaultValue: true,
        environments: ['development', 'staging', 'production'],
        targeting: {
          subscriptionPlans: ['pro', 'business', 'enterprise'],
        },
        category: 'features',
        tags: ['productivity'],
        createdBy: 'system',
      },
      {
        id: 'flag-advanced-reports',
        key: 'advanced_reports',
        name: 'Advanced Reports',
        description: 'Enable advanced reporting features',
        type: 'boolean',
        enabled: true,
        defaultValue: false,
        environments: ['development', 'staging', 'production'],
        targeting: {
          subscriptionPlans: ['business', 'enterprise'],
        },
        category: 'features',
        tags: ['reports', 'premium'],
        createdBy: 'system',
      },
      {
        id: 'flag-api-v2',
        key: 'api_v2',
        name: 'API V2 Endpoints',
        description: 'Enable new API v2 endpoints',
        type: 'percentage',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 25,
        environments: ['development', 'staging'],
        category: 'api',
        tags: ['api', 'beta'],
        createdBy: 'system',
      },
      {
        id: 'flag-real-time-collab',
        key: 'realtime_collaboration',
        name: 'Real-time Collaboration',
        description: 'Enable real-time document collaboration',
        type: 'boolean',
        enabled: true,
        defaultValue: false,
        environments: ['development', 'staging'],
        targeting: {
          subscriptionPlans: ['enterprise'],
        },
        category: 'features',
        tags: ['collaboration', 'premium'],
        createdBy: 'system',
      },
    ];

    const now = new Date();
    defaultFlags.forEach(flag => {
      const fullFlag: FeatureFlag = {
        ...flag,
        createdAt: now,
        updatedAt: now,
      };
      this.flags.set(flag.key, fullFlag);
    });

    this.logger.log(`Initialized ${defaultFlags.length} feature flags`);
  }

  // =================== FLAG EVALUATION ===================

  async isEnabled(
    key: string,
    context?: {
      userId?: string;
      tenantId?: string;
      userRole?: string;
      country?: string;
      subscriptionPlan?: string;
      environment?: FeatureEnvironment;
    },
  ): Promise<boolean> {
    const value = await this.evaluate(key, context);
    return Boolean(value);
  }

  async evaluate(
    key: string,
    context?: {
      userId?: string;
      tenantId?: string;
      userRole?: string;
      country?: string;
      subscriptionPlan?: string;
      environment?: FeatureEnvironment;
    },
  ): Promise<any> {
    const cacheKey = this.getCacheKey(key, context);
    const cached = this.evaluationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const flag = this.flags.get(key);
    if (!flag) {
      return null;
    }

    // Check if flag is enabled
    if (!flag.enabled) {
      return flag.defaultValue;
    }

    // Check environment
    const env = context?.environment || (process.env.NODE_ENV as FeatureEnvironment) || 'development';
    if (!flag.environments.includes(env)) {
      return flag.defaultValue;
    }

    // Check overrides first
    if (context?.userId) {
      const userOverride = await this.getOverride(flag.id, 'user', context.userId);
      if (userOverride) {
        return userOverride.value;
      }
    }
    if (context?.tenantId) {
      const tenantOverride = await this.getOverride(flag.id, 'tenant', context.tenantId);
      if (tenantOverride) {
        return tenantOverride.value;
      }
    }

    // Check targeting
    if (flag.targeting) {
      const matchesTargeting = this.checkTargeting(flag.targeting, context);
      if (!matchesTargeting) {
        return flag.defaultValue;
      }
    }

    // Evaluate based on type
    let value: any;
    switch (flag.type) {
      case 'boolean':
        value = flag.enabled;
        break;
      case 'percentage':
        value = this.evaluatePercentage(flag, context?.userId || context?.tenantId);
        break;
      case 'variant':
        value = this.evaluateVariant(flag, context?.userId || context?.tenantId);
        break;
      case 'schedule':
        value = this.evaluateSchedule(flag);
        break;
      default:
        value = flag.defaultValue;
    }

    // Cache result
    this.evaluationCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.cacheTTL,
    });

    return value;
  }

  async evaluateAll(context?: {
    userId?: string;
    tenantId?: string;
    userRole?: string;
    country?: string;
    subscriptionPlan?: string;
    environment?: FeatureEnvironment;
  }): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const [key] of this.flags) {
      results[key] = await this.evaluate(key, context);
    }

    return results;
  }

  private checkTargeting(
    targeting: FeatureFlag['targeting'],
    context?: {
      userId?: string;
      tenantId?: string;
      userRole?: string;
      country?: string;
      subscriptionPlan?: string;
    },
  ): boolean {
    if (!context) return true;

    if (targeting?.tenantIds?.length && context.tenantId) {
      if (!targeting.tenantIds.includes(context.tenantId)) return false;
    }
    if (targeting?.userIds?.length && context.userId) {
      if (!targeting.userIds.includes(context.userId)) return false;
    }
    if (targeting?.userRoles?.length && context.userRole) {
      if (!targeting.userRoles.includes(context.userRole)) return false;
    }
    if (targeting?.countries?.length && context.country) {
      if (!targeting.countries.includes(context.country)) return false;
    }
    if (targeting?.subscriptionPlans?.length && context.subscriptionPlan) {
      if (!targeting.subscriptionPlans.includes(context.subscriptionPlan)) return false;
    }

    return true;
  }

  private evaluatePercentage(flag: FeatureFlag, identifier?: string): boolean {
    const percentage = flag.rolloutPercentage || 0;
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    // Use consistent hashing for stable assignment
    const hash = this.hashString(`${flag.key}:${identifier || 'anonymous'}`);
    const bucket = hash % 100;
    return bucket < percentage;
  }

  private evaluateVariant(flag: FeatureFlag, identifier?: string): any {
    if (!flag.variants?.length) return flag.defaultValue;

    const totalWeight = flag.variants.reduce((sum, v) => sum + v.weight, 0);
    const hash = this.hashString(`${flag.key}:${identifier || 'anonymous'}`);
    let bucket = hash % totalWeight;

    for (const variant of flag.variants) {
      bucket -= variant.weight;
      if (bucket < 0) {
        return variant.value;
      }
    }

    return flag.defaultValue;
  }

  private evaluateSchedule(flag: FeatureFlag): boolean {
    if (!flag.schedule) return Boolean(flag.defaultValue);

    const now = new Date();
    if (flag.schedule.startDate && now < flag.schedule.startDate) {
      return false;
    }
    if (flag.schedule.endDate && now > flag.schedule.endDate) {
      return false;
    }

    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private getCacheKey(key: string, context?: Record<string, any>): string {
    return `${key}:${JSON.stringify(context || {})}`;
  }

  // =================== FLAG MANAGEMENT ===================

  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  async getFlag(key: string): Promise<FeatureFlag> {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new NotFoundException(`Feature flag '${key}' not found`);
    }
    return flag;
  }

  async getFlagsByCategory(category: string): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values()).filter(f => f.category === category);
  }

  async createFlag(
    params: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string,
  ): Promise<FeatureFlag> {
    if (this.flags.has(params.key)) {
      throw new Error(`Feature flag '${params.key}' already exists`);
    }

    const flag: FeatureFlag = {
      ...params,
      id: `flag-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.flags.set(params.key, flag);
    this.clearCache(params.key);

    await this.addAudit(flag.id, 'created', undefined, flag, createdBy);
    this.eventEmitter.emit('feature_flag.created', { flag });

    this.logger.log(`Created feature flag: ${params.key}`);
    return flag;
  }

  async updateFlag(
    key: string,
    updates: Partial<Omit<FeatureFlag, 'id' | 'key' | 'createdAt' | 'createdBy'>>,
    updatedBy: string,
    reason?: string,
  ): Promise<FeatureFlag> {
    const flag = await this.getFlag(key);
    const previousValue = { ...flag };

    const updated: FeatureFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date(),
    };

    this.flags.set(key, updated);
    this.clearCache(key);

    await this.addAudit(flag.id, 'updated', previousValue, updated, updatedBy, reason);
    this.eventEmitter.emit('feature_flag.updated', { flag: updated, previousValue });

    this.logger.log(`Updated feature flag: ${key}`);
    return updated;
  }

  async toggleFlag(key: string, enabled: boolean, updatedBy: string): Promise<FeatureFlag> {
    return this.updateFlag(key, { enabled }, updatedBy, `Toggled ${enabled ? 'on' : 'off'}`);
  }

  async deleteFlag(key: string, deletedBy: string): Promise<void> {
    const flag = await this.getFlag(key);
    this.flags.delete(key);
    this.clearCache(key);

    // Remove overrides
    this.overrides.delete(flag.id);

    await this.addAudit(flag.id, 'deleted', flag, undefined, deletedBy);
    this.eventEmitter.emit('feature_flag.deleted', { flag });

    this.logger.log(`Deleted feature flag: ${key}`);
  }

  // =================== OVERRIDES ===================

  async getOverride(
    flagId: string,
    type: 'tenant' | 'user',
    targetId: string,
  ): Promise<FeatureFlagOverride | null> {
    const flagOverrides = this.overrides.get(flagId) || [];
    const override = flagOverrides.find(
      o => o.type === type && o.targetId === targetId,
    );

    if (override?.expiresAt && override.expiresAt < new Date()) {
      return null;
    }

    return override || null;
  }

  async setOverride(
    key: string,
    type: 'tenant' | 'user',
    targetId: string,
    value: any,
    createdBy: string,
    options?: { expiresAt?: Date; reason?: string },
  ): Promise<FeatureFlagOverride> {
    const flag = await this.getFlag(key);

    const override: FeatureFlagOverride = {
      id: `override-${Date.now()}`,
      flagId: flag.id,
      type,
      targetId,
      value,
      expiresAt: options?.expiresAt,
      createdAt: new Date(),
      createdBy,
      reason: options?.reason,
    };

    const flagOverrides = this.overrides.get(flag.id) || [];
    // Remove existing override for same target
    const filtered = flagOverrides.filter(
      o => !(o.type === type && o.targetId === targetId),
    );
    filtered.push(override);
    this.overrides.set(flag.id, filtered);

    this.clearCache(key);

    await this.addAudit(flag.id, 'override_added', undefined, override, createdBy, options?.reason);
    this.eventEmitter.emit('feature_flag.override_added', { flag, override });

    this.logger.log(`Added override for ${key}: ${type}=${targetId}`);
    return override;
  }

  async removeOverride(
    key: string,
    type: 'tenant' | 'user',
    targetId: string,
    removedBy: string,
  ): Promise<void> {
    const flag = await this.getFlag(key);
    const flagOverrides = this.overrides.get(flag.id) || [];

    const override = flagOverrides.find(
      o => o.type === type && o.targetId === targetId,
    );

    if (override) {
      const filtered = flagOverrides.filter(
        o => !(o.type === type && o.targetId === targetId),
      );
      this.overrides.set(flag.id, filtered);
      this.clearCache(key);

      await this.addAudit(flag.id, 'override_removed', override, undefined, removedBy);
      this.eventEmitter.emit('feature_flag.override_removed', { flag, override });

      this.logger.log(`Removed override for ${key}: ${type}=${targetId}`);
    }
  }

  async getOverridesForFlag(key: string): Promise<FeatureFlagOverride[]> {
    const flag = await this.getFlag(key);
    return this.overrides.get(flag.id) || [];
  }

  // =================== AUDIT ===================

  private async addAudit(
    flagId: string,
    action: FeatureFlagAudit['action'],
    previousValue: any,
    newValue: any,
    performedBy: string,
    reason?: string,
  ): Promise<void> {
    const audit: FeatureFlagAudit = {
      id: `audit-${Date.now()}`,
      flagId,
      action,
      previousValue,
      newValue,
      performedBy,
      performedAt: new Date(),
      reason,
    };
    this.audits.push(audit);
  }

  async getAuditLog(flagKey?: string, limit: number = 50): Promise<FeatureFlagAudit[]> {
    let audits = [...this.audits];

    if (flagKey) {
      const flag = this.flags.get(flagKey);
      if (flag) {
        audits = audits.filter(a => a.flagId === flag.id);
      }
    }

    return audits
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
      .slice(0, limit);
  }

  // =================== CACHE ===================

  private clearCache(key?: string): void {
    if (key) {
      // Clear all cache entries for this key
      for (const cacheKey of this.evaluationCache.keys()) {
        if (cacheKey.startsWith(`${key}:`)) {
          this.evaluationCache.delete(cacheKey);
        }
      }
    } else {
      this.evaluationCache.clear();
    }
  }

  // =================== STATS ===================

  async getStats(): Promise<{
    totalFlags: number;
    enabledFlags: number;
    flagsByCategory: Record<string, number>;
    flagsByType: Record<string, number>;
    totalOverrides: number;
  }> {
    const flags = Array.from(this.flags.values());

    const flagsByCategory: Record<string, number> = {};
    const flagsByType: Record<string, number> = {};

    for (const flag of flags) {
      flagsByCategory[flag.category] = (flagsByCategory[flag.category] || 0) + 1;
      flagsByType[flag.type] = (flagsByType[flag.type] || 0) + 1;
    }

    let totalOverrides = 0;
    for (const overrideList of this.overrides.values()) {
      totalOverrides += overrideList.length;
    }

    return {
      totalFlags: flags.length,
      enabledFlags: flags.filter(f => f.enabled).length,
      flagsByCategory,
      flagsByType,
      totalOverrides,
    };
  }
}
