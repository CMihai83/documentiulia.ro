import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type PushProvider = 'fcm' | 'apns' | 'web_push';
export type DevicePlatform = 'ios' | 'android' | 'web';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';
export type NotificationCategory =
  | 'invoice'
  | 'payment'
  | 'hr'
  | 'hse'
  | 'logistics'
  | 'chat'
  | 'system'
  | 'reminder'
  | 'alert'
  | 'marketing';

export interface DeviceToken {
  id: string;
  userId: string;
  tenantId: string;
  token: string;
  platform: DevicePlatform;
  provider: PushProvider;
  deviceId: string;
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  locale?: string;
  timezone?: string;
  isActive: boolean;
  lastUsedAt: Date;
  registeredAt: Date;
  metadata: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;   // HH:mm format
  categories: {
    [key in NotificationCategory]?: {
      enabled: boolean;
      pushEnabled: boolean;
      emailEnabled: boolean;
      smsEnabled: boolean;
      priority: NotificationPriority;
    };
  };
  frequency: 'instant' | 'batched' | 'digest';
  batchIntervalMinutes?: number;
  digestTime?: string; // HH:mm format
  updatedAt: Date;
}

export interface PushNotificationPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: number;
  sound?: string;
  tag?: string;
  clickAction?: string;
  data?: Record<string, any>;
  category: NotificationCategory;
  priority: NotificationPriority;
  ttl?: number; // Time to live in seconds
  collapseKey?: string;
  mutableContent?: boolean;
  contentAvailable?: boolean;
  threadId?: string;
  targetUrl?: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
  url?: string;
  destructive?: boolean;
  authRequired?: boolean;
}

export interface ScheduledNotification {
  id: string;
  payload: PushNotificationPayload;
  targetUserIds: string[];
  tenantId: string;
  scheduledAt: Date;
  timezone?: string;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  error?: string;
  recurrence?: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    dayOfMonth?: number;
    endDate?: Date;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  titleTemplate: string;
  bodyTemplate: string;
  defaultIcon?: string;
  defaultSound?: string;
  defaultPriority: NotificationPriority;
  variables: string[];
  locale: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  deviceToken: string;
  platform: DevicePlatform;
  error?: string;
  errorCode?: string;
}

export interface BatchSendResult {
  total: number;
  successful: number;
  failed: number;
  results: SendResult[];
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalFailed: number;
  byPlatform: {
    [key in DevicePlatform]?: {
      sent: number;
      delivered: number;
      opened: number;
      failed: number;
    };
  };
  byCategory: {
    [key in NotificationCategory]?: {
      sent: number;
      opened: number;
      clickRate: number;
    };
  };
  period: {
    start: Date;
    end: Date;
  };
}

export interface FCMConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  enabled: boolean;
}

export interface APNsConfig {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string;
  production: boolean;
  enabled: boolean;
}

export interface WebPushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  subject: string;
  enabled: boolean;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  // In-memory storage (would be database in production)
  private deviceTokens: Map<string, DeviceToken> = new Map();
  private userDevices: Map<string, Set<string>> = new Map(); // userId -> tokenIds
  private preferences: Map<string, NotificationPreferences> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private notificationHistory: Map<string, PushNotificationPayload[]> = new Map();
  private deliveryReceipts: Map<string, { delivered: boolean; opened: boolean; openedAt?: Date }> = new Map();

  // Provider configurations
  private fcmConfig: FCMConfig | null = null;
  private apnsConfig: APNsConfig | null = null;
  private webPushConfig: WebPushConfig | null = null;

  // Stats tracking
  private stats = {
    sent: { ios: 0, android: 0, web: 0 },
    delivered: { ios: 0, android: 0, web: 0 },
    opened: { ios: 0, android: 0, web: 0 },
    failed: { ios: 0, android: 0, web: 0 },
    byCategory: new Map<NotificationCategory, { sent: number; opened: number }>(),
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeProviders();
    this.initializeDefaultTemplates();
  }

  // ============================================================================
  // PROVIDER CONFIGURATION
  // ============================================================================

  private initializeProviders(): void {
    // Initialize FCM (Firebase Cloud Messaging)
    this.fcmConfig = {
      projectId: this.configService.get('FCM_PROJECT_ID') || 'documentiulia-prod',
      privateKey: this.configService.get('FCM_PRIVATE_KEY') || '',
      clientEmail: this.configService.get('FCM_CLIENT_EMAIL') || '',
      enabled: true,
    };

    // Initialize APNs (Apple Push Notification service)
    this.apnsConfig = {
      keyId: this.configService.get('APNS_KEY_ID') || '',
      teamId: this.configService.get('APNS_TEAM_ID') || '',
      bundleId: this.configService.get('APNS_BUNDLE_ID') || 'ro.documentiulia.app',
      privateKey: this.configService.get('APNS_PRIVATE_KEY') || '',
      production: this.configService.get('NODE_ENV') === 'production',
      enabled: true,
    };

    // Initialize Web Push
    this.webPushConfig = {
      vapidPublicKey: this.configService.get('VAPID_PUBLIC_KEY') || '',
      vapidPrivateKey: this.configService.get('VAPID_PRIVATE_KEY') || '',
      subject: this.configService.get('VAPID_SUBJECT') || 'mailto:support@documentiulia.ro',
      enabled: true,
    };

    this.logger.log('Push notification providers initialized');
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'invoice_created',
        category: 'invoice',
        titleTemplate: 'Factură nouă: {{invoiceNumber}}',
        bodyTemplate: 'A fost creată o factură nouă pentru {{clientName}} în valoare de {{amount}} {{currency}}',
        defaultPriority: 'normal',
        variables: ['invoiceNumber', 'clientName', 'amount', 'currency'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'invoice_due',
        category: 'invoice',
        titleTemplate: 'Factură scadentă',
        bodyTemplate: 'Factura {{invoiceNumber}} în valoare de {{amount}} {{currency}} este scadentă astăzi',
        defaultPriority: 'high',
        variables: ['invoiceNumber', 'amount', 'currency'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'payment_received',
        category: 'payment',
        titleTemplate: 'Plată primită',
        bodyTemplate: 'Ați primit o plată de {{amount}} {{currency}} de la {{payerName}}',
        defaultPriority: 'normal',
        variables: ['amount', 'currency', 'payerName'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'hr_leave_approved',
        category: 'hr',
        titleTemplate: 'Cerere de concediu aprobată',
        bodyTemplate: 'Cererea dvs. de concediu pentru perioada {{startDate}} - {{endDate}} a fost aprobată',
        defaultPriority: 'normal',
        variables: ['startDate', 'endDate'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'hr_contract_expiring',
        category: 'hr',
        titleTemplate: 'Contract în curs de expirare',
        bodyTemplate: 'Contractul angajatului {{employeeName}} expiră în {{daysRemaining}} zile',
        defaultPriority: 'high',
        variables: ['employeeName', 'daysRemaining'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'hse_incident_reported',
        category: 'hse',
        titleTemplate: 'Incident HSE raportat',
        bodyTemplate: 'Un incident de tip {{incidentType}} a fost raportat la {{location}}',
        defaultIcon: 'warning',
        defaultPriority: 'critical',
        variables: ['incidentType', 'location'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'hse_training_due',
        category: 'hse',
        titleTemplate: 'Instruire SSM necesară',
        bodyTemplate: 'Instruirea {{trainingName}} expiră în {{daysRemaining}} zile pentru {{employeeCount}} angajați',
        defaultPriority: 'high',
        variables: ['trainingName', 'daysRemaining', 'employeeCount'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'logistics_shipment_update',
        category: 'logistics',
        titleTemplate: 'Actualizare transport',
        bodyTemplate: 'Transportul {{shipmentId}} este acum {{status}}',
        defaultPriority: 'normal',
        variables: ['shipmentId', 'status'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'logistics_delivery_eta',
        category: 'logistics',
        titleTemplate: 'ETA livrare actualizat',
        bodyTemplate: 'Livrarea {{deliveryId}} va ajunge aproximativ la {{eta}}',
        defaultPriority: 'normal',
        variables: ['deliveryId', 'eta'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'chat_new_message',
        category: 'chat',
        titleTemplate: 'Mesaj nou de la {{senderName}}',
        bodyTemplate: '{{messagePreview}}',
        defaultPriority: 'normal',
        variables: ['senderName', 'messagePreview'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'system_maintenance',
        category: 'system',
        titleTemplate: 'Mentenanță programată',
        bodyTemplate: 'Sistemul va fi indisponibil pe {{date}} între {{startTime}} și {{endTime}}',
        defaultPriority: 'high',
        variables: ['date', 'startTime', 'endTime'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'reminder_task',
        category: 'reminder',
        titleTemplate: 'Reminder: {{taskName}}',
        bodyTemplate: '{{taskDescription}}',
        defaultPriority: 'normal',
        variables: ['taskName', 'taskDescription'],
        locale: 'ro',
        isActive: true,
      },
      {
        name: 'alert_threshold',
        category: 'alert',
        titleTemplate: 'Alertă: {{alertType}}',
        bodyTemplate: '{{alertMessage}}',
        defaultIcon: 'alert',
        defaultPriority: 'high',
        variables: ['alertType', 'alertMessage'],
        locale: 'ro',
        isActive: true,
      },
    ];

    defaultTemplates.forEach((template, index) => {
      const id = `template-${index + 1}`;
      this.templates.set(id, {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    this.logger.log(`Initialized ${defaultTemplates.length} default notification templates`);
  }

  getProviderStatus(): { fcm: boolean; apns: boolean; webPush: boolean } {
    return {
      fcm: this.fcmConfig?.enabled || false,
      apns: this.apnsConfig?.enabled || false,
      webPush: this.webPushConfig?.enabled || false,
    };
  }

  configureProvider(
    provider: PushProvider,
    config: Partial<FCMConfig | APNsConfig | WebPushConfig>,
  ): { success: boolean; provider: PushProvider } {
    switch (provider) {
      case 'fcm':
        this.fcmConfig = { ...this.fcmConfig, ...config } as FCMConfig;
        break;
      case 'apns':
        this.apnsConfig = { ...this.apnsConfig, ...config } as APNsConfig;
        break;
      case 'web_push':
        this.webPushConfig = { ...this.webPushConfig, ...config } as WebPushConfig;
        break;
    }
    this.logger.log(`Provider ${provider} configured`);
    return { success: true, provider };
  }

  // ============================================================================
  // DEVICE TOKEN MANAGEMENT
  // ============================================================================

  registerDevice(params: {
    userId: string;
    tenantId: string;
    token: string;
    platform: DevicePlatform;
    deviceId: string;
    deviceName?: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    locale?: string;
    timezone?: string;
    metadata?: Record<string, any>;
  }): DeviceToken {
    const provider = this.getPlatformProvider(params.platform);
    const id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const deviceToken: DeviceToken = {
      id,
      userId: params.userId,
      tenantId: params.tenantId,
      token: params.token,
      platform: params.platform,
      provider,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      deviceModel: params.deviceModel,
      osVersion: params.osVersion,
      appVersion: params.appVersion,
      locale: params.locale || 'ro',
      timezone: params.timezone || 'Europe/Bucharest',
      isActive: true,
      lastUsedAt: new Date(),
      registeredAt: new Date(),
      metadata: params.metadata || {},
    };

    this.deviceTokens.set(id, deviceToken);

    // Track user devices
    if (!this.userDevices.has(params.userId)) {
      this.userDevices.set(params.userId, new Set());
    }
    this.userDevices.get(params.userId)!.add(id);

    this.logger.log(`Device registered: ${id} for user ${params.userId} (${params.platform})`);
    return deviceToken;
  }

  private getPlatformProvider(platform: DevicePlatform): PushProvider {
    switch (platform) {
      case 'ios':
        return 'apns';
      case 'android':
        return 'fcm';
      case 'web':
        return 'web_push';
    }
  }

  unregisterDevice(tokenId: string): boolean {
    const token = this.deviceTokens.get(tokenId);
    if (!token) return false;

    this.deviceTokens.delete(tokenId);
    this.userDevices.get(token.userId)?.delete(tokenId);

    this.logger.log(`Device unregistered: ${tokenId}`);
    return true;
  }

  updateDeviceToken(tokenId: string, newToken: string): DeviceToken | null {
    const device = this.deviceTokens.get(tokenId);
    if (!device) return null;

    device.token = newToken;
    device.lastUsedAt = new Date();
    this.deviceTokens.set(tokenId, device);

    return device;
  }

  getDevicesByUser(userId: string): DeviceToken[] {
    const tokenIds = this.userDevices.get(userId);
    if (!tokenIds) return [];

    return Array.from(tokenIds)
      .map((id) => this.deviceTokens.get(id))
      .filter((token): token is DeviceToken => token !== undefined && token.isActive);
  }

  getDevicesByTenant(tenantId: string): DeviceToken[] {
    return Array.from(this.deviceTokens.values()).filter(
      (token) => token.tenantId === tenantId && token.isActive,
    );
  }

  deactivateDevice(tokenId: string): boolean {
    const device = this.deviceTokens.get(tokenId);
    if (!device) return false;

    device.isActive = false;
    this.deviceTokens.set(tokenId, device);
    return true;
  }

  cleanupStaleDevices(maxAgeDays: number = 90): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);

    let cleaned = 0;
    this.deviceTokens.forEach((token, id) => {
      if (token.lastUsedAt < cutoff) {
        this.unregisterDevice(id);
        cleaned++;
      }
    });

    this.logger.log(`Cleaned up ${cleaned} stale device tokens`);
    return cleaned;
  }

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  setPreferences(userId: string, tenantId: string, prefs: Partial<NotificationPreferences>): NotificationPreferences {
    const existing = this.preferences.get(userId);
    const preferences: NotificationPreferences = {
      userId,
      tenantId,
      enabled: prefs.enabled ?? existing?.enabled ?? true,
      quietHoursEnabled: prefs.quietHoursEnabled ?? existing?.quietHoursEnabled ?? false,
      quietHoursStart: prefs.quietHoursStart ?? existing?.quietHoursStart ?? '22:00',
      quietHoursEnd: prefs.quietHoursEnd ?? existing?.quietHoursEnd ?? '07:00',
      categories: {
        ...existing?.categories,
        ...prefs.categories,
      },
      frequency: prefs.frequency ?? existing?.frequency ?? 'instant',
      batchIntervalMinutes: prefs.batchIntervalMinutes ?? existing?.batchIntervalMinutes ?? 15,
      digestTime: prefs.digestTime ?? existing?.digestTime ?? '09:00',
      updatedAt: new Date(),
    };

    // Set default category preferences if not set
    const allCategories: NotificationCategory[] = [
      'invoice', 'payment', 'hr', 'hse', 'logistics', 'chat', 'system', 'reminder', 'alert', 'marketing'
    ];
    allCategories.forEach((cat) => {
      if (!preferences.categories[cat]) {
        preferences.categories[cat] = {
          enabled: cat !== 'marketing', // Marketing off by default
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: false,
          priority: 'normal',
        };
      }
    });

    this.preferences.set(userId, preferences);
    return preferences;
  }

  getPreferences(userId: string): NotificationPreferences | null {
    return this.preferences.get(userId) || null;
  }

  setCategoryPreference(
    userId: string,
    category: NotificationCategory,
    prefs: Partial<NotificationPreferences['categories'][NotificationCategory]>,
  ): NotificationPreferences | null {
    const userPrefs = this.preferences.get(userId);
    if (!userPrefs) return null;

    userPrefs.categories[category] = {
      ...userPrefs.categories[category],
      ...prefs,
    } as NotificationPreferences['categories'][NotificationCategory];
    userPrefs.updatedAt = new Date();

    this.preferences.set(userId, userPrefs);
    return userPrefs;
  }

  isNotificationAllowed(userId: string, category: NotificationCategory): boolean {
    const prefs = this.preferences.get(userId);
    if (!prefs || !prefs.enabled) return false;

    const categoryPref = prefs.categories[category];
    if (!categoryPref?.enabled || !categoryPref?.pushEnabled) return false;

    // Check quiet hours
    if (prefs.quietHoursEnabled && prefs.quietHoursStart && prefs.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (prefs.quietHoursStart <= prefs.quietHoursEnd) {
        // Simple case: quiet hours within same day
        if (currentTime >= prefs.quietHoursStart && currentTime <= prefs.quietHoursEnd) {
          return category === 'alert' || category === 'hse'; // Allow critical notifications
        }
      } else {
        // Overnight quiet hours
        if (currentTime >= prefs.quietHoursStart || currentTime <= prefs.quietHoursEnd) {
          return category === 'alert' || category === 'hse';
        }
      }
    }

    return true;
  }

  // ============================================================================
  // NOTIFICATION TEMPLATES
  // ============================================================================

  createTemplate(params: {
    name: string;
    category: NotificationCategory;
    titleTemplate: string;
    bodyTemplate: string;
    defaultIcon?: string;
    defaultSound?: string;
    defaultPriority: NotificationPriority;
    variables: string[];
    locale?: string;
  }): NotificationTemplate {
    const id = `template-${Date.now()}`;
    const template: NotificationTemplate = {
      id,
      name: params.name,
      category: params.category,
      titleTemplate: params.titleTemplate,
      bodyTemplate: params.bodyTemplate,
      defaultIcon: params.defaultIcon,
      defaultSound: params.defaultSound,
      defaultPriority: params.defaultPriority,
      variables: params.variables,
      locale: params.locale || 'ro',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);
    return template;
  }

  getTemplate(templateId: string): NotificationTemplate | null {
    return this.templates.get(templateId) || null;
  }

  getTemplateByName(name: string, locale: string = 'ro'): NotificationTemplate | null {
    return Array.from(this.templates.values()).find(
      (t) => t.name === name && t.locale === locale && t.isActive,
    ) || null;
  }

  listTemplates(category?: NotificationCategory): NotificationTemplate[] {
    const templates = Array.from(this.templates.values()).filter((t) => t.isActive);
    return category ? templates.filter((t) => t.category === category) : templates;
  }

  updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): NotificationTemplate | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const updated = {
      ...template,
      ...updates,
      id: template.id, // Cannot change ID
      createdAt: template.createdAt,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);
    return updated;
  }

  deleteTemplate(templateId: string): boolean {
    return this.templates.delete(templateId);
  }

  renderTemplate(
    templateId: string,
    variables: Record<string, string>,
  ): { title: string; body: string } | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    let title = template.titleTemplate;
    let body = template.bodyTemplate;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      title = title.replace(regex, value);
      body = body.replace(regex, value);
    });

    return { title, body };
  }

  // ============================================================================
  // SEND NOTIFICATIONS
  // ============================================================================

  async sendToUser(
    userId: string,
    payload: Omit<PushNotificationPayload, 'id'>,
  ): Promise<BatchSendResult> {
    const devices = this.getDevicesByUser(userId);

    if (devices.length === 0) {
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    // Check preferences
    if (!this.isNotificationAllowed(userId, payload.category)) {
      this.logger.debug(`Notification blocked by preferences for user ${userId}`);
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    const results: SendResult[] = [];
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullPayload: PushNotificationPayload = { ...payload, id: notificationId };

    for (const device of devices) {
      const result = await this.sendToDevice(device, fullPayload);
      results.push(result);
    }

    // Track in history
    if (!this.notificationHistory.has(userId)) {
      this.notificationHistory.set(userId, []);
    }
    this.notificationHistory.get(userId)!.push(fullPayload);

    const successful = results.filter((r) => r.success).length;
    return {
      total: results.length,
      successful,
      failed: results.length - successful,
      results,
    };
  }

  async sendToUsers(
    userIds: string[],
    payload: Omit<PushNotificationPayload, 'id'>,
  ): Promise<BatchSendResult> {
    const allResults: SendResult[] = [];
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullPayload: PushNotificationPayload = { ...payload, id: notificationId };

    for (const userId of userIds) {
      const result = await this.sendToUser(userId, fullPayload);
      allResults.push(...result.results);
    }

    const successful = allResults.filter((r) => r.success).length;
    return {
      total: allResults.length,
      successful,
      failed: allResults.length - successful,
      results: allResults,
    };
  }

  async sendToTenant(
    tenantId: string,
    payload: Omit<PushNotificationPayload, 'id'>,
  ): Promise<BatchSendResult> {
    const devices = this.getDevicesByTenant(tenantId);
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullPayload: PushNotificationPayload = { ...payload, id: notificationId };

    const results: SendResult[] = [];
    const processedUsers = new Set<string>();

    for (const device of devices) {
      // Check preferences per user (only once per user)
      if (!processedUsers.has(device.userId)) {
        if (!this.isNotificationAllowed(device.userId, payload.category)) {
          continue;
        }
        processedUsers.add(device.userId);
      }

      const result = await this.sendToDevice(device, fullPayload);
      results.push(result);
    }

    const successful = results.filter((r) => r.success).length;
    return {
      total: results.length,
      successful,
      failed: results.length - successful,
      results,
    };
  }

  async sendWithTemplate(
    templateName: string,
    userIds: string[],
    variables: Record<string, string>,
    options?: {
      locale?: string;
      data?: Record<string, any>;
      actions?: NotificationAction[];
    },
  ): Promise<BatchSendResult> {
    const template = this.getTemplateByName(templateName, options?.locale);
    if (!template) {
      this.logger.error(`Template not found: ${templateName}`);
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    const rendered = this.renderTemplate(template.id, variables);
    if (!rendered) {
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    return this.sendToUsers(userIds, {
      title: rendered.title,
      body: rendered.body,
      icon: template.defaultIcon,
      sound: template.defaultSound,
      category: template.category,
      priority: template.defaultPriority,
      data: options?.data,
      actions: options?.actions,
    });
  }

  private async sendToDevice(
    device: DeviceToken,
    payload: PushNotificationPayload,
  ): Promise<SendResult> {
    try {
      // Simulate sending based on provider
      let success = true;
      let messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      switch (device.provider) {
        case 'fcm':
          // Would call Firebase Admin SDK
          success = this.simulateFCMSend(device, payload);
          break;
        case 'apns':
          // Would call APNs HTTP/2 API
          success = this.simulateAPNsSend(device, payload);
          break;
        case 'web_push':
          // Would use web-push library
          success = this.simulateWebPushSend(device, payload);
          break;
      }

      // Update stats
      if (success) {
        this.stats.sent[device.platform]++;
        const catStats = this.stats.byCategory.get(payload.category) || { sent: 0, opened: 0 };
        catStats.sent++;
        this.stats.byCategory.set(payload.category, catStats);

        // Update device last used
        device.lastUsedAt = new Date();
        this.deviceTokens.set(device.id, device);

        // Track delivery receipt
        this.deliveryReceipts.set(payload.id, { delivered: true, opened: false });
      } else {
        this.stats.failed[device.platform]++;
      }

      return {
        success,
        messageId: success ? messageId : undefined,
        deviceToken: device.token,
        platform: device.platform,
      };
    } catch (error) {
      this.stats.failed[device.platform]++;
      return {
        success: false,
        deviceToken: device.token,
        platform: device.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SEND_FAILED',
      };
    }
  }

  private simulateFCMSend(device: DeviceToken, payload: PushNotificationPayload): boolean {
    // Simulate 98% success rate
    return Math.random() < 0.98;
  }

  private simulateAPNsSend(device: DeviceToken, payload: PushNotificationPayload): boolean {
    // Simulate 97% success rate
    return Math.random() < 0.97;
  }

  private simulateWebPushSend(device: DeviceToken, payload: PushNotificationPayload): boolean {
    // Simulate 95% success rate
    return Math.random() < 0.95;
  }

  // ============================================================================
  // SCHEDULED NOTIFICATIONS
  // ============================================================================

  scheduleNotification(params: {
    payload: Omit<PushNotificationPayload, 'id'>;
    targetUserIds: string[];
    tenantId: string;
    scheduledAt: Date;
    timezone?: string;
    recurrence?: ScheduledNotification['recurrence'];
  }): ScheduledNotification {
    const id = `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notificationId = `notif-${Date.now()}`;

    const scheduled: ScheduledNotification = {
      id,
      payload: { ...params.payload, id: notificationId },
      targetUserIds: params.targetUserIds,
      tenantId: params.tenantId,
      scheduledAt: params.scheduledAt,
      timezone: params.timezone || 'Europe/Bucharest',
      status: 'pending',
      createdAt: new Date(),
      recurrence: params.recurrence,
    };

    this.scheduledNotifications.set(id, scheduled);
    this.logger.log(`Scheduled notification ${id} for ${params.scheduledAt.toISOString()}`);
    return scheduled;
  }

  cancelScheduledNotification(scheduledId: string): boolean {
    const scheduled = this.scheduledNotifications.get(scheduledId);
    if (!scheduled || scheduled.status !== 'pending') return false;

    scheduled.status = 'cancelled';
    this.scheduledNotifications.set(scheduledId, scheduled);
    return true;
  }

  getScheduledNotification(scheduledId: string): ScheduledNotification | null {
    return this.scheduledNotifications.get(scheduledId) || null;
  }

  listScheduledNotifications(tenantId: string, status?: ScheduledNotification['status']): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values())
      .filter((n) => n.tenantId === tenantId && (!status || n.status === status))
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async processScheduledNotifications(): Promise<{ processed: number; sent: number; failed: number }> {
    const now = new Date();
    const pending = Array.from(this.scheduledNotifications.values())
      .filter((n) => n.status === 'pending' && n.scheduledAt <= now);

    let sent = 0;
    let failed = 0;

    for (const scheduled of pending) {
      try {
        const result = await this.sendToUsers(scheduled.targetUserIds, scheduled.payload);
        scheduled.status = 'sent';
        scheduled.sentAt = new Date();
        sent += result.successful;
        failed += result.failed;

        // Handle recurrence
        if (scheduled.recurrence && scheduled.recurrence.type !== 'once') {
          const nextDate = this.calculateNextRecurrence(scheduled);
          if (nextDate) {
            this.scheduleNotification({
              payload: scheduled.payload,
              targetUserIds: scheduled.targetUserIds,
              tenantId: scheduled.tenantId,
              scheduledAt: nextDate,
              timezone: scheduled.timezone,
              recurrence: scheduled.recurrence,
            });
          }
        }
      } catch (error) {
        scheduled.status = 'failed';
        scheduled.error = error instanceof Error ? error.message : 'Unknown error';
      }

      this.scheduledNotifications.set(scheduled.id, scheduled);
    }

    return { processed: pending.length, sent, failed };
  }

  private calculateNextRecurrence(scheduled: ScheduledNotification): Date | null {
    if (!scheduled.recurrence) return null;

    const next = new Date(scheduled.scheduledAt);

    switch (scheduled.recurrence.type) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        return null;
    }

    // Check end date
    if (scheduled.recurrence.endDate && next > scheduled.recurrence.endDate) {
      return null;
    }

    return next;
  }

  // ============================================================================
  // DELIVERY TRACKING & ANALYTICS
  // ============================================================================

  trackDelivered(notificationId: string): void {
    const receipt = this.deliveryReceipts.get(notificationId);
    if (receipt) {
      receipt.delivered = true;
    }
  }

  trackOpened(notificationId: string, platform?: DevicePlatform): void {
    const receipt = this.deliveryReceipts.get(notificationId);
    if (receipt) {
      receipt.opened = true;
      receipt.openedAt = new Date();

      // Update stats
      if (platform) {
        this.stats.opened[platform]++;
      }
    }
  }

  getNotificationHistory(userId: string, limit: number = 50): PushNotificationPayload[] {
    const history = this.notificationHistory.get(userId) || [];
    return history.slice(-limit);
  }

  getStats(startDate?: Date, endDate?: Date): NotificationStats {
    const byPlatform: NotificationStats['byPlatform'] = {
      ios: {
        sent: this.stats.sent.ios,
        delivered: this.stats.delivered.ios,
        opened: this.stats.opened.ios,
        failed: this.stats.failed.ios,
      },
      android: {
        sent: this.stats.sent.android,
        delivered: this.stats.delivered.android,
        opened: this.stats.opened.android,
        failed: this.stats.failed.android,
      },
      web: {
        sent: this.stats.sent.web,
        delivered: this.stats.delivered.web,
        opened: this.stats.opened.web,
        failed: this.stats.failed.web,
      },
    };

    const byCategory: NotificationStats['byCategory'] = {};
    this.stats.byCategory.forEach((stats, category) => {
      byCategory[category] = {
        sent: stats.sent,
        opened: stats.opened,
        clickRate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
      };
    });

    return {
      totalSent: this.stats.sent.ios + this.stats.sent.android + this.stats.sent.web,
      totalDelivered: this.stats.delivered.ios + this.stats.delivered.android + this.stats.delivered.web,
      totalOpened: this.stats.opened.ios + this.stats.opened.android + this.stats.opened.web,
      totalFailed: this.stats.failed.ios + this.stats.failed.android + this.stats.failed.web,
      byPlatform,
      byCategory,
      period: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
    };
  }

  // ============================================================================
  // TOPIC-BASED NOTIFICATIONS
  // ============================================================================

  private topicSubscriptions: Map<string, Set<string>> = new Map(); // topic -> userIds

  subscribeToTopic(userId: string, topic: string): boolean {
    if (!this.topicSubscriptions.has(topic)) {
      this.topicSubscriptions.set(topic, new Set());
    }
    this.topicSubscriptions.get(topic)!.add(userId);
    return true;
  }

  unsubscribeFromTopic(userId: string, topic: string): boolean {
    const subscribers = this.topicSubscriptions.get(topic);
    if (!subscribers) return false;
    return subscribers.delete(userId);
  }

  async sendToTopic(
    topic: string,
    payload: Omit<PushNotificationPayload, 'id'>,
  ): Promise<BatchSendResult> {
    const subscribers = this.topicSubscriptions.get(topic);
    if (!subscribers || subscribers.size === 0) {
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    return this.sendToUsers(Array.from(subscribers), payload);
  }

  getTopicSubscribers(topic: string): string[] {
    const subscribers = this.topicSubscriptions.get(topic);
    return subscribers ? Array.from(subscribers) : [];
  }

  getUserTopics(userId: string): string[] {
    const topics: string[] = [];
    this.topicSubscriptions.forEach((subscribers, topic) => {
      if (subscribers.has(userId)) {
        topics.push(topic);
      }
    });
    return topics;
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async sendBatch(
    notifications: Array<{
      userId: string;
      payload: Omit<PushNotificationPayload, 'id'>;
    }>,
  ): Promise<BatchSendResult> {
    const allResults: SendResult[] = [];

    for (const { userId, payload } of notifications) {
      const result = await this.sendToUser(userId, payload);
      allResults.push(...result.results);
    }

    const successful = allResults.filter((r) => r.success).length;
    return {
      total: allResults.length,
      successful,
      failed: allResults.length - successful,
      results: allResults,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getActiveDeviceCount(): { total: number; byPlatform: Record<DevicePlatform, number> } {
    const devices = Array.from(this.deviceTokens.values()).filter((d) => d.isActive);
    return {
      total: devices.length,
      byPlatform: {
        ios: devices.filter((d) => d.platform === 'ios').length,
        android: devices.filter((d) => d.platform === 'android').length,
        web: devices.filter((d) => d.platform === 'web').length,
      },
    };
  }

  getRegisteredUserCount(): number {
    return this.userDevices.size;
  }

  testNotification(deviceToken: string, platform: DevicePlatform): Promise<SendResult> {
    const testDevice: DeviceToken = {
      id: 'test-device',
      userId: 'test-user',
      tenantId: 'test-tenant',
      token: deviceToken,
      platform,
      provider: this.getPlatformProvider(platform),
      deviceId: 'test-device-id',
      isActive: true,
      lastUsedAt: new Date(),
      registeredAt: new Date(),
      metadata: {},
    };

    return this.sendToDevice(testDevice, {
      id: 'test-notification',
      title: 'Test Notification',
      body: 'Aceasta este o notificare de test de la DocumentIulia',
      category: 'system',
      priority: 'normal',
    });
  }
}
