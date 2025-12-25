import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// PWA Interfaces
export interface WebAppManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any';
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
  screenshots?: ManifestScreenshot[];
  categories?: string[];
  lang: string;
  dir: 'ltr' | 'rtl' | 'auto';
  scope: string;
  shortcuts?: ManifestShortcut[];
  related_applications?: RelatedApplication[];
  prefer_related_applications?: boolean;
}

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
}

export interface ManifestScreenshot {
  src: string;
  sizes: string;
  type: string;
  label?: string;
}

export interface ManifestShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: ManifestIcon[];
}

export interface RelatedApplication {
  platform: 'play' | 'itunes' | 'windows';
  url: string;
  id?: string;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  active: boolean;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ServiceWorkerConfig {
  version: string;
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  precacheUrls: string[];
  runtimeCacheRules: CacheRule[];
  offlineFallback: string;
  backgroundSync: boolean;
  periodicSync: boolean;
  pushEnabled: boolean;
}

export interface CacheRule {
  urlPattern: string;
  handler: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
  options?: {
    cacheName?: string;
    maxEntries?: number;
    maxAgeSeconds?: number;
  };
}

export interface OfflineData {
  id: string;
  type: 'form' | 'sync' | 'request';
  data: Record<string, any>;
  timestamp: Date;
  synced: boolean;
  syncedAt?: Date;
  retryCount: number;
  error?: string;
}

export interface InstallPromptEvent {
  id: string;
  userId?: string;
  platform: string;
  userAgent: string;
  prompted: boolean;
  installed: boolean;
  dismissedAt?: Date;
  installedAt?: Date;
  timestamp: Date;
}

// Default PWA Configuration
const DEFAULT_MANIFEST: WebAppManifest = {
  name: 'DocumentIulia.ro - ERP cu Inteligență Artificială',
  short_name: 'DocumentIulia',
  description: 'Platformă ERP completă cu AI pentru contabilitate, facturare, HR și operațiuni de business',
  start_url: '/',
  display: 'standalone',
  orientation: 'any',
  theme_color: '#7C3AED',
  background_color: '#F3F4F6',
  lang: 'ro',
  dir: 'ltr',
  scope: '/',
  categories: ['business', 'finance', 'productivity'],
  icons: [
    { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
    { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
    { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
    { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
    { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    {
      name: 'Dashboard',
      short_name: 'Dashboard',
      url: '/dashboard',
      icons: [{ src: '/icons/shortcut-dashboard.png', sizes: '96x96', type: 'image/png' }],
    },
    {
      name: 'Facturi Noi',
      short_name: 'Factură',
      url: '/invoices/new',
      icons: [{ src: '/icons/shortcut-invoice.png', sizes: '96x96', type: 'image/png' }],
    },
    {
      name: 'Rapoarte',
      short_name: 'Rapoarte',
      url: '/reports',
      icons: [{ src: '/icons/shortcut-reports.png', sizes: '96x96', type: 'image/png' }],
    },
  ],
};

const DEFAULT_SW_CONFIG: ServiceWorkerConfig = {
  version: '1.0.0',
  cacheStrategy: 'network-first',
  precacheUrls: [
    '/',
    '/dashboard',
    '/offline',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
  ],
  runtimeCacheRules: [
    {
      urlPattern: '/api/.*',
      handler: 'network-first',
      options: { cacheName: 'api-cache', maxAgeSeconds: 300 },
    },
    {
      urlPattern: '/static/.*',
      handler: 'cache-first',
      options: { cacheName: 'static-cache', maxEntries: 100, maxAgeSeconds: 86400 },
    },
    {
      urlPattern: '/images/.*',
      handler: 'stale-while-revalidate',
      options: { cacheName: 'image-cache', maxEntries: 50 },
    },
  ],
  offlineFallback: '/offline',
  backgroundSync: true,
  periodicSync: true,
  pushEnabled: true,
};

@Injectable()
export class PwaService {
  private readonly logger = new Logger(PwaService.name);
  private manifest: WebAppManifest;
  private swConfig: ServiceWorkerConfig;
  private subscriptions: Map<string, PushSubscription> = new Map();
  private offlineData: Map<string, OfflineData> = new Map();
  private installEvents: Map<string, InstallPromptEvent> = new Map();
  private vapidKeys: { publicKey: string; privateKey: string };

  constructor(private configService: ConfigService) {
    this.manifest = { ...DEFAULT_MANIFEST };
    this.swConfig = { ...DEFAULT_SW_CONFIG };
    this.vapidKeys = this.generateVapidKeys();
  }

  private generateVapidKeys(): { publicKey: string; privateKey: string } {
    // In production, these would be actual VAPID keys
    return {
      publicKey: this.configService.get('VAPID_PUBLIC_KEY') ||
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
      privateKey: this.configService.get('VAPID_PRIVATE_KEY') ||
        'mockPrivateKey',
    };
  }

  // =================== MANIFEST MANAGEMENT ===================

  getManifest(): WebAppManifest {
    return { ...this.manifest };
  }

  updateManifest(updates: Partial<WebAppManifest>): WebAppManifest {
    this.manifest = { ...this.manifest, ...updates };
    this.logger.log('PWA manifest updated');
    return this.manifest;
  }

  addShortcut(shortcut: ManifestShortcut): void {
    if (!this.manifest.shortcuts) {
      this.manifest.shortcuts = [];
    }
    this.manifest.shortcuts.push(shortcut);
  }

  removeShortcut(url: string): boolean {
    if (!this.manifest.shortcuts) return false;
    const initialLength = this.manifest.shortcuts.length;
    this.manifest.shortcuts = this.manifest.shortcuts.filter((s) => s.url !== url);
    return this.manifest.shortcuts.length < initialLength;
  }

  addIcon(icon: ManifestIcon): void {
    this.manifest.icons.push(icon);
  }

  getManifestForLocale(locale: string): WebAppManifest {
    const localeNames: Record<string, { name: string; short_name: string; description: string }> = {
      ro: {
        name: 'DocumentIulia.ro - ERP cu Inteligență Artificială',
        short_name: 'DocumentIulia',
        description: 'Platformă ERP completă cu AI pentru contabilitate, facturare, HR și operațiuni de business',
      },
      en: {
        name: 'DocumentIulia.ro - AI-Powered ERP',
        short_name: 'DocumentIulia',
        description: 'Complete AI-powered ERP platform for accounting, invoicing, HR and business operations',
      },
      de: {
        name: 'DocumentIulia.ro - KI-gestütztes ERP',
        short_name: 'DocumentIulia',
        description: 'Vollständige KI-gestützte ERP-Plattform für Buchhaltung, Rechnungsstellung, HR und Geschäftsvorgänge',
      },
    };

    const localeData = localeNames[locale] || localeNames['ro'];

    return {
      ...this.manifest,
      name: localeData.name,
      short_name: localeData.short_name,
      description: localeData.description,
      lang: locale,
    };
  }

  // =================== SERVICE WORKER CONFIG ===================

  getServiceWorkerConfig(): ServiceWorkerConfig {
    return { ...this.swConfig };
  }

  updateServiceWorkerConfig(updates: Partial<ServiceWorkerConfig>): ServiceWorkerConfig {
    this.swConfig = { ...this.swConfig, ...updates };
    if (updates.version === undefined) {
      this.swConfig.version = this.incrementVersion(this.swConfig.version);
    }
    this.logger.log(`Service worker config updated to version ${this.swConfig.version}`);
    return this.swConfig;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map((p) => parseInt(p, 10));
    parts[2]++;
    return parts.join('.');
  }

  addCacheRule(rule: CacheRule): void {
    this.swConfig.runtimeCacheRules.push(rule);
  }

  removeCacheRule(urlPattern: string): boolean {
    const initialLength = this.swConfig.runtimeCacheRules.length;
    this.swConfig.runtimeCacheRules = this.swConfig.runtimeCacheRules.filter(
      (r) => r.urlPattern !== urlPattern
    );
    return this.swConfig.runtimeCacheRules.length < initialLength;
  }

  addPrecacheUrl(url: string): void {
    if (!this.swConfig.precacheUrls.includes(url)) {
      this.swConfig.precacheUrls.push(url);
    }
  }

  removePrecacheUrl(url: string): boolean {
    const initialLength = this.swConfig.precacheUrls.length;
    this.swConfig.precacheUrls = this.swConfig.precacheUrls.filter((u) => u !== url);
    return this.swConfig.precacheUrls.length < initialLength;
  }

  generateServiceWorker(): string {
    return `
// Service Worker v${this.swConfig.version}
const CACHE_NAME = 'documentiulia-v${this.swConfig.version}';
const PRECACHE_URLS = ${JSON.stringify(this.swConfig.precacheUrls, null, 2)};
const OFFLINE_FALLBACK = '${this.swConfig.offlineFallback}';

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

// Fetch event with ${this.swConfig.cacheStrategy} strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_FALLBACK)))
  );
});

${this.swConfig.pushEnabled ? `
// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'DocumentIulia', {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.data,
      actions: data.actions || [],
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
` : ''}

${this.swConfig.backgroundSync ? `
// Background sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Sync offline data when back online
  const db = await openDB();
  const offlineData = await db.getAll('offline-data');
  for (const item of offlineData) {
    try {
      await fetch(item.url, { method: item.method, body: JSON.stringify(item.data) });
      await db.delete('offline-data', item.id);
    } catch (e) { /* Will retry on next sync */ }
  }
}
` : ''}
`;
  }

  // =================== PUSH NOTIFICATIONS ===================

  getVapidPublicKey(): string {
    return this.vapidKeys.publicKey;
  }

  async subscribeToPush(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ): Promise<PushSubscription> {
    const id = `push_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const pushSub: PushSubscription = {
      id,
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
      createdAt: new Date(),
      active: true,
    };

    this.subscriptions.set(id, pushSub);
    this.logger.log(`Push subscription created: ${id} for user ${userId}`);

    return pushSub;
  }

  async unsubscribeFromPush(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    subscription.active = false;
    this.subscriptions.set(subscriptionId, subscription);
    this.logger.log(`Push subscription deactivated: ${subscriptionId}`);

    return true;
  }

  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return Array.from(this.subscriptions.values())
      .filter((s) => s.userId === userId && s.active);
  }

  async sendPushNotification(
    userId: string,
    notification: Omit<PushNotification, 'id'>,
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await this.getUserSubscriptions(userId);
    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        // In production, this would use web-push library
        this.logger.log(`Push notification sent to ${subscription.endpoint}`);
        subscription.lastUsedAt = new Date();
        this.subscriptions.set(subscription.id, subscription);
        sent++;
      } catch (error) {
        failed++;
        this.logger.error(`Push notification failed: ${error}`);
      }
    }

    return { sent, failed };
  }

  async sendBroadcastNotification(
    notification: Omit<PushNotification, 'id'>,
  ): Promise<{ sent: number; failed: number }> {
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter((s) => s.active);
    let sent = 0;
    let failed = 0;

    for (const subscription of activeSubscriptions) {
      try {
        this.logger.log(`Broadcast notification sent to ${subscription.endpoint}`);
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  }

  // =================== OFFLINE DATA SYNC ===================

  async storeOfflineData(
    type: 'form' | 'sync' | 'request',
    data: Record<string, any>,
  ): Promise<OfflineData> {
    const id = `offline_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const offlineRecord: OfflineData = {
      id,
      type,
      data,
      timestamp: new Date(),
      synced: false,
      retryCount: 0,
    };

    this.offlineData.set(id, offlineRecord);
    return offlineRecord;
  }

  async syncOfflineData(): Promise<{ synced: number; failed: number }> {
    const pendingData = Array.from(this.offlineData.values()).filter((d) => !d.synced);
    let synced = 0;
    let failed = 0;

    for (const item of pendingData) {
      try {
        // Simulate sync
        item.synced = true;
        item.syncedAt = new Date();
        this.offlineData.set(item.id, item);
        synced++;
      } catch (error) {
        item.retryCount++;
        item.error = String(error);
        this.offlineData.set(item.id, item);
        failed++;
      }
    }

    return { synced, failed };
  }

  async getPendingOfflineData(): Promise<OfflineData[]> {
    return Array.from(this.offlineData.values()).filter((d) => !d.synced);
  }

  async clearSyncedData(): Promise<number> {
    const synced = Array.from(this.offlineData.values()).filter((d) => d.synced);
    for (const item of synced) {
      this.offlineData.delete(item.id);
    }
    return synced.length;
  }

  // =================== INSTALL TRACKING ===================

  async trackInstallPrompt(
    platform: string,
    userAgent: string,
    userId?: string,
  ): Promise<InstallPromptEvent> {
    const id = `install_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const event: InstallPromptEvent = {
      id,
      userId,
      platform,
      userAgent,
      prompted: true,
      installed: false,
      timestamp: new Date(),
    };

    this.installEvents.set(id, event);
    return event;
  }

  async trackInstallComplete(eventId: string): Promise<InstallPromptEvent | null> {
    const event = this.installEvents.get(eventId);
    if (!event) return null;

    event.installed = true;
    event.installedAt = new Date();
    this.installEvents.set(eventId, event);

    this.logger.log(`PWA installed: ${eventId}`);
    return event;
  }

  async trackInstallDismissed(eventId: string): Promise<InstallPromptEvent | null> {
    const event = this.installEvents.get(eventId);
    if (!event) return null;

    event.dismissedAt = new Date();
    this.installEvents.set(eventId, event);

    return event;
  }

  async getInstallStats(): Promise<{
    totalPrompts: number;
    totalInstalls: number;
    totalDismissed: number;
    installRate: number;
  }> {
    const events = Array.from(this.installEvents.values());
    const totalPrompts = events.length;
    const totalInstalls = events.filter((e) => e.installed).length;
    const totalDismissed = events.filter((e) => e.dismissedAt && !e.installed).length;

    return {
      totalPrompts,
      totalInstalls,
      totalDismissed,
      installRate: totalPrompts > 0 ? (totalInstalls / totalPrompts) * 100 : 0,
    };
  }

  // =================== PERFORMANCE METRICS ===================

  async getPerformanceHints(): Promise<Array<{ category: string; hint: string; priority: 'high' | 'medium' | 'low' }>> {
    const hints: Array<{ category: string; hint: string; priority: 'high' | 'medium' | 'low' }> = [];

    // Check icon configuration
    if (this.manifest.icons.length < 5) {
      hints.push({
        category: 'Icons',
        hint: 'Add more icon sizes for better device compatibility',
        priority: 'medium',
      });
    }

    // Check if maskable icon exists
    if (!this.manifest.icons.some((i) => i.purpose === 'maskable')) {
      hints.push({
        category: 'Icons',
        hint: 'Add a maskable icon for Android adaptive icons',
        priority: 'high',
      });
    }

    // Check precache size
    if (this.swConfig.precacheUrls.length > 50) {
      hints.push({
        category: 'Caching',
        hint: 'Consider reducing precache URLs to improve initial load time',
        priority: 'medium',
      });
    }

    // Check shortcuts
    if (!this.manifest.shortcuts || this.manifest.shortcuts.length === 0) {
      hints.push({
        category: 'UX',
        hint: 'Add app shortcuts for quick actions',
        priority: 'low',
      });
    }

    return hints;
  }

  // =================== FEATURE DETECTION ===================

  getFeatureSupport(): Record<string, boolean> {
    return {
      serviceWorker: true,
      pushNotifications: this.swConfig.pushEnabled,
      backgroundSync: this.swConfig.backgroundSync,
      periodicSync: this.swConfig.periodicSync,
      offlineStorage: true,
      installPrompt: true,
      webShare: true,
      badgeApi: true,
    };
  }
}
