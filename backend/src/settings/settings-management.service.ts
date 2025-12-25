import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type SettingScope = 'SYSTEM' | 'ORGANIZATION' | 'USER';

export type SettingType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'ARRAY' | 'DATE' | 'ENUM';

export type SettingCategory =
  | 'GENERAL'
  | 'APPEARANCE'
  | 'NOTIFICATIONS'
  | 'SECURITY'
  | 'BILLING'
  | 'INTEGRATIONS'
  | 'LOCALIZATION'
  | 'TAX'
  | 'INVOICING'
  | 'ANAF'
  | 'SAGA'
  | 'REPORTS'
  | 'ADVANCED';

export interface SettingDefinition {
  id: string;
  key: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: SettingCategory;
  type: SettingType;
  defaultValue: any;
  scope: SettingScope;
  allowedValues?: any[];
  validation?: SettingValidation;
  isSecret: boolean;
  isEditable: boolean;
  isVisible: boolean;
  dependencies?: string[];
  order: number;
  tags: string[];
  metadata: Record<string, any>;
}

export interface SettingValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: string;
}

export interface SettingValue {
  id: string;
  definitionId: string;
  key: string;
  value: any;
  scope: SettingScope;
  scopeId?: string;
  isOverridden: boolean;
  version: number;
  updatedBy?: string;
  updatedAt: Date;
  history: SettingHistory[];
}

export interface SettingHistory {
  version: number;
  value: any;
  updatedBy: string;
  updatedAt: Date;
  reason?: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  enabled: boolean;
  scope: SettingScope;
  scopeId?: string;
  percentage?: number;
  allowedUsers?: string[];
  allowedOrganizations?: string[];
  startDate?: Date;
  endDate?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  userId: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  notifications: NotificationPreferences;
  display: DisplayPreferences;
  accessibility: AccessibilityPreferences;
  customSettings: Record<string, any>;
  updatedAt: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  digest: 'NONE' | 'DAILY' | 'WEEKLY';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  categories: Record<string, boolean>;
}

export interface DisplayPreferences {
  compactMode: boolean;
  showSidebar: boolean;
  sidebarCollapsed: boolean;
  defaultView: string;
  itemsPerPage: number;
  showTips: boolean;
}

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';
  screenReaderOptimized: boolean;
}

export interface OrganizationConfig {
  organizationId: string;
  name: string;
  nameRo?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  taxSettings: TaxSettings;
  invoiceSettings: InvoiceSettings;
  anafSettings: AnafSettings;
  sagaSettings: SagaSettings;
  billingSettings: BillingSettings;
  integrationSettings: IntegrationSettings;
  customFields: CustomField[];
  metadata: Record<string, any>;
  updatedAt: Date;
}

export interface TaxSettings {
  vatRate: number;
  reducedVatRate: number;
  specialVatRate: number;
  vatEnabled: boolean;
  reverseChargeEnabled: boolean;
  defaultTaxCode: string;
  fiscalYearStart: number;
  vatReportingPeriod: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

export interface InvoiceSettings {
  prefix: string;
  startNumber: number;
  currentNumber: number;
  dateFormat: string;
  dueDays: number;
  currency: string;
  defaultPaymentTerms: string;
  defaultNotes: string;
  defaultNotesRo: string;
  showLogo: boolean;
  showSignature: boolean;
  autoSendEmail: boolean;
  reminderDays: number[];
}

export interface AnafSettings {
  cui: string;
  spvUsername?: string;
  spvPassword?: string;
  autoSubmit: boolean;
  submissionDeadlineDays: number;
  validationLevel: 'STRICT' | 'STANDARD' | 'LENIENT';
  retryAttempts: number;
  notifyOnSuccess: boolean;
  notifyOnError: boolean;
}

export interface SagaSettings {
  enabled: boolean;
  apiKey?: string;
  syncInterval: number;
  autoSync: boolean;
  syncEntities: string[];
}

export interface BillingSettings {
  planId: string;
  subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';
  trialEndsAt?: Date;
  billingCycle: 'MONTHLY' | 'YEARLY';
  paymentMethod?: string;
  billingEmail?: string;
  invoiceAddress?: Record<string, string>;
}

export interface IntegrationSettings {
  enabledIntegrations: string[];
  apiRateLimits: Record<string, number>;
  webhookEndpoints: string[];
  oauthProviders: string[];
}

export interface CustomField {
  id: string;
  key: string;
  name: string;
  nameRo: string;
  type: SettingType;
  required: boolean;
  defaultValue?: any;
  options?: any[];
  entity: string;
}

@Injectable()
export class SettingsManagementService {
  private readonly logger = new Logger(SettingsManagementService.name);
  private definitions: Map<string, SettingDefinition> = new Map();
  private values: Map<string, SettingValue> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private userPreferences: Map<string, UserPreferences> = new Map();
  private organizationConfigs: Map<string, OrganizationConfig> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultDefinitions();
    this.initializeDefaultFeatureFlags();
  }

  private initializeDefaultDefinitions(): void {
    const defaults: Omit<SettingDefinition, 'id'>[] = [
      {
        key: 'app.name',
        name: 'Application Name',
        nameRo: 'Nume Aplicație',
        description: 'The name of the application',
        descriptionRo: 'Numele aplicației',
        category: 'GENERAL',
        type: 'STRING',
        defaultValue: 'DocumentIulia',
        scope: 'SYSTEM',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 1,
        tags: ['core'],
        metadata: {},
      },
      {
        key: 'app.language',
        name: 'Default Language',
        nameRo: 'Limba Implicită',
        description: 'Default language for the application',
        descriptionRo: 'Limba implicită pentru aplicație',
        category: 'LOCALIZATION',
        type: 'ENUM',
        defaultValue: 'ro',
        allowedValues: ['ro', 'en', 'de', 'fr', 'es'],
        scope: 'ORGANIZATION',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 2,
        tags: ['localization'],
        metadata: {},
      },
      {
        key: 'app.timezone',
        name: 'Timezone',
        nameRo: 'Fus Orar',
        description: 'Default timezone for the application',
        descriptionRo: 'Fusul orar implicit pentru aplicație',
        category: 'LOCALIZATION',
        type: 'STRING',
        defaultValue: 'Europe/Bucharest',
        scope: 'ORGANIZATION',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 3,
        tags: ['localization'],
        metadata: {},
      },
      {
        key: 'tax.vatRate',
        name: 'VAT Rate',
        nameRo: 'Cota TVA',
        description: 'Standard VAT rate (Legea 141/2025: 21% from Aug 2025)',
        descriptionRo: 'Cota standard de TVA (Legea 141/2025: 21% din Aug 2025)',
        category: 'TAX',
        type: 'NUMBER',
        defaultValue: 19,
        validation: { min: 0, max: 100 },
        scope: 'SYSTEM',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 10,
        tags: ['tax', 'anaf', 'compliance'],
        metadata: { newRate: 21, effectiveDate: '2025-08-01' },
      },
      {
        key: 'tax.reducedVatRate',
        name: 'Reduced VAT Rate',
        nameRo: 'Cota TVA Redusă',
        description: 'Reduced VAT rate for specific goods (Legea 141/2025: 11% from Aug 2025)',
        descriptionRo: 'Cota TVA redusă pentru bunuri specifice (Legea 141/2025: 11% din Aug 2025)',
        category: 'TAX',
        type: 'NUMBER',
        defaultValue: 9,
        validation: { min: 0, max: 100 },
        scope: 'SYSTEM',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 11,
        tags: ['tax', 'anaf', 'compliance'],
        metadata: { newRate: 11, effectiveDate: '2025-08-01' },
      },
      {
        key: 'anaf.autoSubmit',
        name: 'Auto Submit to ANAF',
        nameRo: 'Trimitere Automată ANAF',
        description: 'Automatically submit invoices to ANAF e-Factura',
        descriptionRo: 'Trimitere automată a facturilor către e-Factura ANAF',
        category: 'ANAF',
        type: 'BOOLEAN',
        defaultValue: false,
        scope: 'ORGANIZATION',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 20,
        tags: ['anaf', 'compliance', 'e-factura'],
        metadata: {},
      },
      {
        key: 'anaf.spvApiKey',
        name: 'ANAF SPV API Key',
        nameRo: 'Cheie API SPV ANAF',
        description: 'API key for ANAF SPV integration',
        descriptionRo: 'Cheie API pentru integrarea cu SPV ANAF',
        category: 'ANAF',
        type: 'STRING',
        defaultValue: '',
        scope: 'ORGANIZATION',
        isSecret: true,
        isEditable: true,
        isVisible: true,
        order: 21,
        tags: ['anaf', 'api', 'secret'],
        metadata: {},
      },
      {
        key: 'invoice.prefix',
        name: 'Invoice Prefix',
        nameRo: 'Prefix Factură',
        description: 'Prefix for invoice numbers',
        descriptionRo: 'Prefix pentru numerele facturilor',
        category: 'INVOICING',
        type: 'STRING',
        defaultValue: 'INV-',
        validation: { maxLength: 10 },
        scope: 'ORGANIZATION',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 30,
        tags: ['invoicing'],
        metadata: {},
      },
      {
        key: 'invoice.dueDays',
        name: 'Invoice Due Days',
        nameRo: 'Zile Scadență Factură',
        description: 'Default number of days until invoice is due',
        descriptionRo: 'Numărul implicit de zile până la scadența facturii',
        category: 'INVOICING',
        type: 'NUMBER',
        defaultValue: 30,
        validation: { min: 1, max: 365 },
        scope: 'ORGANIZATION',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 31,
        tags: ['invoicing'],
        metadata: {},
      },
      {
        key: 'security.sessionTimeout',
        name: 'Session Timeout',
        nameRo: 'Timeout Sesiune',
        description: 'Session timeout in minutes',
        descriptionRo: 'Timeout sesiune în minute',
        category: 'SECURITY',
        type: 'NUMBER',
        defaultValue: 30,
        validation: { min: 5, max: 480 },
        scope: 'ORGANIZATION',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 40,
        tags: ['security'],
        metadata: {},
      },
      {
        key: 'security.mfaRequired',
        name: 'MFA Required',
        nameRo: 'MFA Obligatoriu',
        description: 'Require multi-factor authentication for all users',
        descriptionRo: 'Autentificare multi-factor obligatorie pentru toți utilizatorii',
        category: 'SECURITY',
        type: 'BOOLEAN',
        defaultValue: false,
        scope: 'ORGANIZATION',
        isSecret: false,
        isEditable: true,
        isVisible: true,
        order: 41,
        tags: ['security', 'mfa'],
        metadata: {},
      },
    ];

    defaults.forEach((def) => {
      const id = this.generateId('def');
      this.definitions.set(id, { ...def, id });
    });
  }

  private initializeDefaultFeatureFlags(): void {
    const defaultFlags: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        key: 'feature.newDashboard',
        name: 'New Dashboard',
        nameRo: 'Panou de Control Nou',
        description: 'Enable the new dashboard design',
        descriptionRo: 'Activează noul design al panoului de control',
        enabled: false,
        scope: 'SYSTEM',
        metadata: { phase: 'beta' },
      },
      {
        key: 'feature.aiAssistant',
        name: 'AI Assistant',
        nameRo: 'Asistent AI',
        description: 'Enable the AI-powered assistant',
        descriptionRo: 'Activează asistentul bazat pe AI',
        enabled: true,
        scope: 'ORGANIZATION',
        metadata: { provider: 'grok' },
      },
      {
        key: 'feature.eFacturaV2',
        name: 'e-Factura V2',
        nameRo: 'e-Factura V2',
        description: 'Use the new e-Factura V2 integration',
        descriptionRo: 'Folosește noua integrare e-Factura V2',
        enabled: false,
        scope: 'ORGANIZATION',
        percentage: 10,
        metadata: { anaf: true },
      },
      {
        key: 'feature.advancedReports',
        name: 'Advanced Reports',
        nameRo: 'Rapoarte Avansate',
        description: 'Enable advanced reporting features',
        descriptionRo: 'Activează funcțiile avansate de raportare',
        enabled: true,
        scope: 'ORGANIZATION',
        metadata: {},
      },
    ];

    const now = new Date();
    defaultFlags.forEach((flag) => {
      const id = this.generateId('flag');
      this.featureFlags.set(id, { ...flag, id, createdAt: now, updatedAt: now });
    });
  }

  async getSettingDefinition(key: string): Promise<SettingDefinition | undefined> {
    for (const def of this.definitions.values()) {
      if (def.key === key) {
        return def;
      }
    }
    return undefined;
  }

  async getAllSettingDefinitions(category?: SettingCategory): Promise<SettingDefinition[]> {
    let definitions = Array.from(this.definitions.values());
    if (category) {
      definitions = definitions.filter((d) => d.category === category);
    }
    return definitions.sort((a, b) => a.order - b.order);
  }

  async getSettingsByCategory(): Promise<Record<SettingCategory, SettingDefinition[]>> {
    const definitions = await this.getAllSettingDefinitions();
    const result: Record<SettingCategory, SettingDefinition[]> = {} as any;

    for (const def of definitions) {
      if (!result[def.category]) {
        result[def.category] = [];
      }
      result[def.category].push(def);
    }

    return result;
  }

  async getSetting(key: string, scopeId?: string): Promise<any> {
    const definition = await this.getSettingDefinition(key);
    if (!definition) {
      throw new Error(`Setting not found: ${key}`);
    }

    // Look for scoped value first
    const valueKey = this.getValueKey(key, scopeId);
    const value = this.values.get(valueKey);

    if (value) {
      return value.value;
    }

    // Return default value
    return definition.defaultValue;
  }

  async setSetting(
    key: string,
    value: any,
    userId: string,
    scopeId?: string,
    reason?: string,
  ): Promise<SettingValue> {
    const definition = await this.getSettingDefinition(key);
    if (!definition) {
      throw new Error(`Setting not found: ${key}`);
    }

    if (!definition.isEditable) {
      throw new Error(`Setting is not editable: ${key}`);
    }

    // Validate value
    this.validateValue(value, definition);

    const valueKey = this.getValueKey(key, scopeId);
    const existing = this.values.get(valueKey);
    const now = new Date();

    const history: SettingHistory[] = existing?.history || [];
    if (existing) {
      history.push({
        version: existing.version,
        value: existing.value,
        updatedBy: existing.updatedBy || userId,
        updatedAt: existing.updatedAt,
        reason,
      });

      // Limit history
      while (history.length > 50) {
        history.shift();
      }
    }

    const settingValue: SettingValue = {
      id: existing?.id || this.generateId('val'),
      definitionId: definition.id,
      key,
      value,
      scope: definition.scope,
      scopeId,
      isOverridden: scopeId !== undefined,
      version: (existing?.version || 0) + 1,
      updatedBy: userId,
      updatedAt: now,
      history,
    };

    this.values.set(valueKey, settingValue);

    this.eventEmitter.emit('setting.changed', {
      key,
      value,
      previousValue: existing?.value,
      scopeId,
      userId,
    });

    this.logger.log(`Setting updated: ${key} = ${definition.isSecret ? '***' : value}`);

    return settingValue;
  }

  async resetSetting(key: string, userId: string, scopeId?: string): Promise<void> {
    const definition = await this.getSettingDefinition(key);
    if (!definition) {
      throw new Error(`Setting not found: ${key}`);
    }

    const valueKey = this.getValueKey(key, scopeId);
    const existing = this.values.get(valueKey);

    if (existing) {
      this.values.delete(valueKey);

      this.eventEmitter.emit('setting.reset', {
        key,
        previousValue: existing.value,
        scopeId,
        userId,
      });

      this.logger.log(`Setting reset to default: ${key}`);
    }
  }

  async getSettingHistory(key: string, scopeId?: string): Promise<SettingHistory[]> {
    const valueKey = this.getValueKey(key, scopeId);
    const value = this.values.get(valueKey);

    return value?.history || [];
  }

  async bulkGetSettings(keys: string[], scopeId?: string): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const key of keys) {
      try {
        result[key] = await this.getSetting(key, scopeId);
      } catch {
        // Skip missing settings
      }
    }

    return result;
  }

  async bulkSetSettings(
    settings: Record<string, any>,
    userId: string,
    scopeId?: string,
  ): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.setSetting(key, value, userId, scopeId);
    }
  }

  private validateValue(value: any, definition: SettingDefinition): void {
    if (definition.validation?.required && (value === null || value === undefined)) {
      throw new Error(`Value is required for setting: ${definition.key}`);
    }

    if (value === null || value === undefined) return;

    switch (definition.type) {
      case 'NUMBER':
        if (typeof value !== 'number') {
          throw new Error(`Invalid number value for setting: ${definition.key}`);
        }
        if (definition.validation?.min !== undefined && value < definition.validation.min) {
          throw new Error(`Value must be at least ${definition.validation.min}`);
        }
        if (definition.validation?.max !== undefined && value > definition.validation.max) {
          throw new Error(`Value must be at most ${definition.validation.max}`);
        }
        break;

      case 'STRING':
        if (typeof value !== 'string') {
          throw new Error(`Invalid string value for setting: ${definition.key}`);
        }
        if (definition.validation?.minLength !== undefined && value.length < definition.validation.minLength) {
          throw new Error(`Value must be at least ${definition.validation.minLength} characters`);
        }
        if (definition.validation?.maxLength !== undefined && value.length > definition.validation.maxLength) {
          throw new Error(`Value must be at most ${definition.validation.maxLength} characters`);
        }
        if (definition.validation?.pattern) {
          const regex = new RegExp(definition.validation.pattern);
          if (!regex.test(value)) {
            throw new Error(`Value does not match required pattern`);
          }
        }
        break;

      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          throw new Error(`Invalid boolean value for setting: ${definition.key}`);
        }
        break;

      case 'ENUM':
        if (!definition.allowedValues?.includes(value)) {
          throw new Error(`Invalid value. Allowed: ${definition.allowedValues?.join(', ')}`);
        }
        break;
    }
  }

  private getValueKey(key: string, scopeId?: string): string {
    return scopeId ? `${key}:${scopeId}` : key;
  }

  // Feature Flags

  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    for (const flag of this.featureFlags.values()) {
      if (flag.key === key) {
        return flag;
      }
    }
    return undefined;
  }

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.featureFlags.values());
  }

  async isFeatureEnabled(
    key: string,
    userId?: string,
    organizationId?: string,
  ): Promise<boolean> {
    const flag = await this.getFeatureFlag(key);
    if (!flag) {
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check date range
    const now = new Date();
    if (flag.startDate && now < flag.startDate) {
      return false;
    }
    if (flag.endDate && now > flag.endDate) {
      return false;
    }

    // Check allowed users
    if (flag.allowedUsers && flag.allowedUsers.length > 0) {
      if (!userId || !flag.allowedUsers.includes(userId)) {
        return false;
      }
    }

    // Check allowed organizations
    if (flag.allowedOrganizations && flag.allowedOrganizations.length > 0) {
      if (!organizationId || !flag.allowedOrganizations.includes(organizationId)) {
        return false;
      }
    }

    // Check percentage rollout
    if (flag.percentage !== undefined && flag.percentage < 100) {
      const hash = this.hashForRollout(key, userId || organizationId || 'anonymous');
      return hash < flag.percentage;
    }

    return true;
  }

  async setFeatureFlag(
    key: string,
    enabled: boolean,
    options: Partial<Omit<FeatureFlag, 'id' | 'key' | 'createdAt' | 'updatedAt'>> = {},
  ): Promise<FeatureFlag> {
    const existing = await this.getFeatureFlag(key);
    const now = new Date();

    if (existing) {
      const updated: FeatureFlag = {
        ...existing,
        enabled,
        ...options,
        updatedAt: now,
      };

      this.featureFlags.set(existing.id, updated);

      this.eventEmitter.emit('feature.toggled', { key, enabled });

      return updated;
    }

    // Create new flag
    const id = this.generateId('flag');
    const flag: FeatureFlag = {
      id,
      key,
      name: options.name || key,
      nameRo: options.nameRo || key,
      description: options.description || '',
      descriptionRo: options.descriptionRo || '',
      enabled,
      scope: options.scope || 'SYSTEM',
      scopeId: options.scopeId,
      percentage: options.percentage,
      allowedUsers: options.allowedUsers,
      allowedOrganizations: options.allowedOrganizations,
      startDate: options.startDate,
      endDate: options.endDate,
      metadata: options.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.featureFlags.set(id, flag);

    this.eventEmitter.emit('feature.created', { key, enabled });

    return flag;
  }

  async deleteFeatureFlag(key: string): Promise<void> {
    for (const [id, flag] of this.featureFlags.entries()) {
      if (flag.key === key) {
        this.featureFlags.delete(id);
        this.eventEmitter.emit('feature.deleted', { key });
        return;
      }
    }
    throw new Error('Feature flag not found');
  }

  private hashForRollout(key: string, identifier: string): number {
    const str = `${key}:${identifier}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  // User Preferences

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    let prefs = this.userPreferences.get(userId);

    if (!prefs) {
      prefs = this.getDefaultUserPreferences(userId);
      this.userPreferences.set(userId, prefs);
    }

    return prefs;
  }

  async updateUserPreferences(
    userId: string,
    updates: Partial<Omit<UserPreferences, 'userId' | 'updatedAt' | 'notifications' | 'display' | 'accessibility' | 'customSettings'>> & {
      notifications?: Partial<NotificationPreferences>;
      display?: Partial<DisplayPreferences>;
      accessibility?: Partial<AccessibilityPreferences>;
      customSettings?: Record<string, any>;
    },
  ): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);

    const updated: UserPreferences = {
      ...current,
      ...updates,
      notifications: updates.notifications
        ? { ...current.notifications, ...updates.notifications }
        : current.notifications,
      display: updates.display
        ? { ...current.display, ...updates.display }
        : current.display,
      accessibility: updates.accessibility
        ? { ...current.accessibility, ...updates.accessibility }
        : current.accessibility,
      customSettings: updates.customSettings
        ? { ...current.customSettings, ...updates.customSettings }
        : current.customSettings,
      updatedAt: new Date(),
    };

    this.userPreferences.set(userId, updated);

    this.eventEmitter.emit('preferences.updated', { userId, updates });

    return updated;
  }

  async resetUserPreferences(userId: string): Promise<UserPreferences> {
    const defaults = this.getDefaultUserPreferences(userId);
    this.userPreferences.set(userId, defaults);

    this.eventEmitter.emit('preferences.reset', { userId });

    return defaults;
  }

  private getDefaultUserPreferences(userId: string): UserPreferences {
    return {
      userId,
      language: 'ro',
      timezone: 'Europe/Bucharest',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: 'HH:mm',
      currency: 'RON',
      theme: 'SYSTEM',
      notifications: {
        email: true,
        push: true,
        sms: false,
        inApp: true,
        digest: 'DAILY',
        categories: {},
      },
      display: {
        compactMode: false,
        showSidebar: true,
        sidebarCollapsed: false,
        defaultView: 'dashboard',
        itemsPerPage: 25,
        showTips: true,
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        fontSize: 'MEDIUM',
        screenReaderOptimized: false,
      },
      customSettings: {},
      updatedAt: new Date(),
    };
  }

  // Organization Config

  async getOrganizationConfig(organizationId: string): Promise<OrganizationConfig> {
    let config = this.organizationConfigs.get(organizationId);

    if (!config) {
      config = this.getDefaultOrganizationConfig(organizationId);
      this.organizationConfigs.set(organizationId, config);
    }

    return config;
  }

  async updateOrganizationConfig(
    organizationId: string,
    updates: Partial<Omit<OrganizationConfig, 'organizationId' | 'updatedAt' | 'taxSettings' | 'invoiceSettings' | 'anafSettings' | 'sagaSettings' | 'billingSettings' | 'integrationSettings' | 'customFields'>> & {
      taxSettings?: Partial<TaxSettings>;
      invoiceSettings?: Partial<InvoiceSettings>;
      anafSettings?: Partial<AnafSettings>;
      sagaSettings?: Partial<SagaSettings>;
      billingSettings?: Partial<BillingSettings>;
      integrationSettings?: Partial<IntegrationSettings>;
    },
  ): Promise<OrganizationConfig> {
    const current = await this.getOrganizationConfig(organizationId);

    const updated: OrganizationConfig = {
      ...current,
      ...updates,
      taxSettings: updates.taxSettings
        ? { ...current.taxSettings, ...updates.taxSettings }
        : current.taxSettings,
      invoiceSettings: updates.invoiceSettings
        ? { ...current.invoiceSettings, ...updates.invoiceSettings }
        : current.invoiceSettings,
      anafSettings: updates.anafSettings
        ? { ...current.anafSettings, ...updates.anafSettings }
        : current.anafSettings,
      sagaSettings: updates.sagaSettings
        ? { ...current.sagaSettings, ...updates.sagaSettings }
        : current.sagaSettings,
      billingSettings: updates.billingSettings
        ? { ...current.billingSettings, ...updates.billingSettings }
        : current.billingSettings,
      integrationSettings: updates.integrationSettings
        ? { ...current.integrationSettings, ...updates.integrationSettings }
        : current.integrationSettings,
      updatedAt: new Date(),
    };

    this.organizationConfigs.set(organizationId, updated);

    this.eventEmitter.emit('orgconfig.updated', { organizationId, updates });

    return updated;
  }

  async addCustomField(
    organizationId: string,
    field: Omit<CustomField, 'id'>,
  ): Promise<CustomField> {
    const config = await this.getOrganizationConfig(organizationId);

    const customField: CustomField = {
      ...field,
      id: this.generateId('field'),
    };

    config.customFields.push(customField);
    config.updatedAt = new Date();

    this.organizationConfigs.set(organizationId, config);

    this.eventEmitter.emit('customfield.added', { organizationId, field: customField });

    return customField;
  }

  async removeCustomField(organizationId: string, fieldId: string): Promise<void> {
    const config = await this.getOrganizationConfig(organizationId);

    const index = config.customFields.findIndex((f) => f.id === fieldId);
    if (index === -1) {
      throw new Error('Custom field not found');
    }

    config.customFields.splice(index, 1);
    config.updatedAt = new Date();

    this.organizationConfigs.set(organizationId, config);

    this.eventEmitter.emit('customfield.removed', { organizationId, fieldId });
  }

  private getDefaultOrganizationConfig(organizationId: string): OrganizationConfig {
    return {
      organizationId,
      name: '',
      taxSettings: {
        vatRate: 19, // Will be 21% from Aug 2025 per Legea 141/2025
        reducedVatRate: 9, // Will be 11% from Aug 2025
        specialVatRate: 5,
        vatEnabled: true,
        reverseChargeEnabled: false,
        defaultTaxCode: 'S',
        fiscalYearStart: 1,
        vatReportingPeriod: 'MONTHLY',
      },
      invoiceSettings: {
        prefix: 'INV-',
        startNumber: 1,
        currentNumber: 1,
        dateFormat: 'DD.MM.YYYY',
        dueDays: 30,
        currency: 'RON',
        defaultPaymentTerms: 'Net 30',
        defaultNotes: '',
        defaultNotesRo: '',
        showLogo: true,
        showSignature: true,
        autoSendEmail: false,
        reminderDays: [7, 3, 1],
      },
      anafSettings: {
        cui: '',
        autoSubmit: false,
        submissionDeadlineDays: 5,
        validationLevel: 'STANDARD',
        retryAttempts: 3,
        notifyOnSuccess: true,
        notifyOnError: true,
      },
      sagaSettings: {
        enabled: false,
        syncInterval: 3600,
        autoSync: false,
        syncEntities: [],
      },
      billingSettings: {
        planId: 'free',
        subscriptionStatus: 'TRIAL',
        billingCycle: 'MONTHLY',
      },
      integrationSettings: {
        enabledIntegrations: [],
        apiRateLimits: {},
        webhookEndpoints: [],
        oauthProviders: [],
      },
      customFields: [],
      metadata: {},
      updatedAt: new Date(),
    };
  }

  // Export and Import

  async exportSettings(scopeId?: string): Promise<Record<string, any>> {
    const definitions = await this.getAllSettingDefinitions();
    const result: Record<string, any> = {};

    for (const def of definitions) {
      if (!def.isSecret) {
        result[def.key] = await this.getSetting(def.key, scopeId);
      }
    }

    return result;
  }

  async importSettings(
    settings: Record<string, any>,
    userId: string,
    scopeId?: string,
  ): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        await this.setSetting(key, value, userId, scopeId, 'Imported from settings file');
        imported++;
      } catch (err) {
        errors.push(`${key}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    this.eventEmitter.emit('settings.imported', { imported, errors: errors.length, scopeId });

    return { imported, errors };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
