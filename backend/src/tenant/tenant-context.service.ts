import { Injectable, Logger, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * TenantContext Service - Request-scoped tenant isolation
 * Uses AsyncLocalStorage for proper context propagation in async flows
 */

export interface TenantContextData {
  tenantId: string;
  organizationId: string;
  organizationName: string;
  tier: string;
  userId: string;
  userRole: string;
  orgRole: string;
  permissions: string[];
  stripeConnectAccountId?: string;
  settings: TenantSettings;
  metadata: Record<string, any>;
}

export interface TenantSettings {
  // Localization
  defaultLanguage: string;
  timezone: string;
  dateFormat: string;
  currency: string;

  // Tax/Compliance
  vatRate: number;
  vatRegistered: boolean;
  anafIntegrationEnabled: boolean;
  sagaIntegrationEnabled: boolean;
  eFacturaEnabled: boolean;

  // Features
  enabledModules: string[];
  maxUsers: number;
  maxInvoicesPerMonth: number;
  ocrPagesPerMonth: number;
  apiAccessEnabled: boolean;

  // Branding
  customLogo?: string;
  primaryColor?: string;
  customDomain?: string;
}

const DEFAULT_SETTINGS: TenantSettings = {
  defaultLanguage: 'ro',
  timezone: 'Europe/Bucharest',
  dateFormat: 'DD.MM.YYYY',
  currency: 'RON',
  vatRate: 19,
  vatRegistered: false,
  anafIntegrationEnabled: false,
  sagaIntegrationEnabled: false,
  eFacturaEnabled: false,
  enabledModules: ['invoices', 'vat', 'dashboard'],
  maxUsers: 1,
  maxInvoicesPerMonth: 5,
  ocrPagesPerMonth: 10,
  apiAccessEnabled: false,
};

const TIER_SETTINGS: Record<string, Partial<TenantSettings>> = {
  gratuit: {
    maxUsers: 1,
    maxInvoicesPerMonth: 5,
    ocrPagesPerMonth: 10,
    enabledModules: ['invoices', 'vat', 'dashboard'],
    apiAccessEnabled: false,
  },
  pro: {
    maxUsers: 5,
    maxInvoicesPerMonth: -1, // unlimited
    ocrPagesPerMonth: 100,
    enabledModules: ['invoices', 'vat', 'dashboard', 'hr', 'reports', 'ocr'],
    apiAccessEnabled: false,
    anafIntegrationEnabled: true,
  },
  business: {
    maxUsers: 25,
    maxInvoicesPerMonth: -1,
    ocrPagesPerMonth: 500,
    enabledModules: [
      'invoices', 'vat', 'dashboard', 'hr', 'reports', 'ocr',
      'saga', 'efactura', 'api', 'analytics', 'fleet', 'inventory',
    ],
    apiAccessEnabled: true,
    anafIntegrationEnabled: true,
    sagaIntegrationEnabled: true,
    eFacturaEnabled: true,
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxInvoicesPerMonth: -1,
    ocrPagesPerMonth: -1,
    enabledModules: ['*'], // all modules
    apiAccessEnabled: true,
    anafIntegrationEnabled: true,
    sagaIntegrationEnabled: true,
    eFacturaEnabled: true,
  },
};

@Injectable({ scope: Scope.DEFAULT })
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  private readonly storage = new AsyncLocalStorage<TenantContextData>();

  /**
   * Run a function within a tenant context
   */
  run<T>(context: TenantContextData, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * Run async function within tenant context
   */
  async runAsync<T>(context: TenantContextData, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(context, fn);
  }

  /**
   * Get current tenant context
   */
  getContext(): TenantContextData | undefined {
    return this.storage.getStore();
  }

  /**
   * Get current tenant context or throw
   */
  getContextOrFail(): TenantContextData {
    const context = this.storage.getStore();
    if (!context) {
      throw new Error('No tenant context available');
    }
    return context;
  }

  /**
   * Get current tenant ID
   */
  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  /**
   * Get current organization ID
   */
  getOrganizationId(): string | undefined {
    return this.storage.getStore()?.organizationId;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    const context = this.storage.getStore();
    if (!context) return false;
    return context.permissions.includes(permission) || context.permissions.includes('*');
  }

  /**
   * Check if module is enabled for tenant
   */
  isModuleEnabled(module: string): boolean {
    const context = this.storage.getStore();
    if (!context) return false;
    const modules = context.settings.enabledModules;
    return modules.includes('*') || modules.includes(module);
  }

  /**
   * Get tenant settings
   */
  getSettings(): TenantSettings | undefined {
    return this.storage.getStore()?.settings;
  }

  /**
   * Build tenant context from organization and user data
   */
  buildContext(
    organization: {
      id: string;
      name: string;
      tier: string;
      settings?: Partial<TenantSettings>;
      stripeConnectAccountId?: string;
    },
    user: {
      id: string;
      role: string;
    },
    membership: {
      role: string;
      permissions?: string[];
    },
  ): TenantContextData {
    // Merge tier settings with custom settings
    const tierDefaults = TIER_SETTINGS[organization.tier] || {};
    const settings: TenantSettings = {
      ...DEFAULT_SETTINGS,
      ...tierDefaults,
      ...organization.settings,
    };

    // Build permissions from role and custom permissions
    const permissions = this.buildPermissions(membership.role, membership.permissions || []);

    return {
      tenantId: organization.id,
      organizationId: organization.id,
      organizationName: organization.name,
      tier: organization.tier,
      userId: user.id,
      userRole: user.role,
      orgRole: membership.role,
      permissions,
      stripeConnectAccountId: organization.stripeConnectAccountId,
      settings,
      metadata: {},
    };
  }

  /**
   * Build permissions based on org role
   */
  private buildPermissions(orgRole: string, customPermissions: string[]): string[] {
    const rolePermissions: Record<string, string[]> = {
      OWNER: ['*'],
      ADMIN: [
        'users:read', 'users:write', 'users:invite',
        'invoices:*', 'reports:*', 'settings:read', 'settings:write',
        'hr:*', 'finance:*', 'billing:read',
      ],
      MANAGER: [
        'users:read', 'invoices:read', 'invoices:write',
        'reports:read', 'hr:read', 'finance:read',
      ],
      ACCOUNTANT: [
        'invoices:*', 'reports:*', 'finance:*',
        'vat:*', 'anaf:*', 'saga:*',
      ],
      EMPLOYEE: [
        'invoices:read', 'reports:read:own',
        'hr:read:own', 'timesheets:write:own',
      ],
      VIEWER: [
        'invoices:read', 'reports:read', 'dashboard:read',
      ],
    };

    const basePermissions = rolePermissions[orgRole] || rolePermissions.VIEWER;
    return [...new Set([...basePermissions, ...customPermissions])];
  }

  /**
   * Create a system context for background jobs
   */
  createSystemContext(organizationId: string, organizationName: string, tier: string): TenantContextData {
    return {
      tenantId: organizationId,
      organizationId,
      organizationName,
      tier,
      userId: 'system',
      userRole: 'system',
      orgRole: 'SYSTEM',
      permissions: ['*'],
      settings: {
        ...DEFAULT_SETTINGS,
        ...TIER_SETTINGS[tier],
      },
      metadata: { isSystemContext: true },
    };
  }

  /**
   * Get tier limits for a tenant
   */
  getTierLimits(tier: string): {
    maxUsers: number;
    maxInvoices: number;
    ocrPages: number;
    modules: string[];
  } {
    const tierSettings = TIER_SETTINGS[tier] || TIER_SETTINGS.gratuit;
    return {
      maxUsers: tierSettings.maxUsers || 1,
      maxInvoices: tierSettings.maxInvoicesPerMonth || 5,
      ocrPages: tierSettings.ocrPagesPerMonth || 10,
      modules: tierSettings.enabledModules || [],
    };
  }
}
