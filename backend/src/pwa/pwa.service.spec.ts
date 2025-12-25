import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PwaService } from './pwa.service';

describe('PwaService', () => {
  let service: PwaService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PwaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PwaService>(PwaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default manifest', () => {
      const manifest = service.getManifest();
      expect(manifest.name).toBeDefined();
      expect(manifest.short_name).toBe('DocumentIulia');
    });

    it('should have default service worker config', () => {
      const config = service.getServiceWorkerConfig();
      expect(config.version).toBeDefined();
      expect(config.cacheStrategy).toBeDefined();
    });
  });

  describe('manifest management', () => {
    it('should get manifest', () => {
      const manifest = service.getManifest();
      expect(manifest.name).toContain('DocumentIulia');
      expect(manifest.icons.length).toBeGreaterThan(0);
    });

    it('should update manifest', () => {
      const updated = service.updateManifest({
        theme_color: '#000000',
        background_color: '#FFFFFF',
      });

      expect(updated.theme_color).toBe('#000000');
      expect(updated.background_color).toBe('#FFFFFF');
    });

    it('should add shortcut', () => {
      const initialManifest = service.getManifest();
      const initialCount = initialManifest.shortcuts?.length || 0;

      service.addShortcut({
        name: 'New Feature',
        url: '/new-feature',
      });

      const manifest = service.getManifest();
      expect(manifest.shortcuts?.length).toBe(initialCount + 1);
    });

    it('should remove shortcut', () => {
      service.addShortcut({ name: 'To Remove', url: '/remove-me' });
      const result = service.removeShortcut('/remove-me');

      expect(result).toBe(true);
    });

    it('should add icon', () => {
      const initialCount = service.getManifest().icons.length;

      service.addIcon({
        src: '/icons/new-icon.png',
        sizes: '256x256',
        type: 'image/png',
      });

      expect(service.getManifest().icons.length).toBe(initialCount + 1);
    });

    it('should get manifest for different locales', () => {
      const roManifest = service.getManifestForLocale('ro');
      expect(roManifest.lang).toBe('ro');

      const enManifest = service.getManifestForLocale('en');
      expect(enManifest.lang).toBe('en');
      expect(enManifest.name).toContain('AI-Powered');

      const deManifest = service.getManifestForLocale('de');
      expect(deManifest.lang).toBe('de');
      expect(deManifest.name).toContain('KI-gestütztes');
    });
  });

  describe('service worker config', () => {
    it('should get service worker config', () => {
      const config = service.getServiceWorkerConfig();
      expect(config.version).toBeDefined();
      expect(config.precacheUrls.length).toBeGreaterThan(0);
    });

    it('should update service worker config', () => {
      const updated = service.updateServiceWorkerConfig({
        cacheStrategy: 'cache-first',
        backgroundSync: false,
      });

      expect(updated.cacheStrategy).toBe('cache-first');
      expect(updated.backgroundSync).toBe(false);
    });

    it('should auto-increment version on update', () => {
      const initial = service.getServiceWorkerConfig().version;
      service.updateServiceWorkerConfig({ pushEnabled: false });
      const updated = service.getServiceWorkerConfig().version;

      expect(updated).not.toBe(initial);
    });

    it('should add cache rule', () => {
      const initialCount = service.getServiceWorkerConfig().runtimeCacheRules.length;

      service.addCacheRule({
        urlPattern: '/custom/.*',
        handler: 'cache-first',
      });

      expect(service.getServiceWorkerConfig().runtimeCacheRules.length).toBe(initialCount + 1);
    });

    it('should remove cache rule', () => {
      service.addCacheRule({ urlPattern: '/to-remove/.*', handler: 'network-first' });
      const result = service.removeCacheRule('/to-remove/.*');

      expect(result).toBe(true);
    });

    it('should add precache URL', () => {
      const initialCount = service.getServiceWorkerConfig().precacheUrls.length;
      service.addPrecacheUrl('/new-page');

      expect(service.getServiceWorkerConfig().precacheUrls.length).toBe(initialCount + 1);
    });

    it('should not duplicate precache URLs', () => {
      service.addPrecacheUrl('/unique-page');
      const count = service.getServiceWorkerConfig().precacheUrls.length;
      service.addPrecacheUrl('/unique-page');

      expect(service.getServiceWorkerConfig().precacheUrls.length).toBe(count);
    });

    it('should remove precache URL', () => {
      service.addPrecacheUrl('/to-remove-url');
      const result = service.removePrecacheUrl('/to-remove-url');

      expect(result).toBe(true);
    });

    it('should generate service worker script', () => {
      const script = service.generateServiceWorker();

      expect(script).toContain('Service Worker');
      expect(script).toContain('CACHE_NAME');
      expect(script).toContain('install');
      expect(script).toContain('fetch');
    });
  });

  describe('push notifications', () => {
    it('should get VAPID public key', () => {
      const key = service.getVapidPublicKey();
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
    });

    it('should subscribe to push', async () => {
      const subscription = await service.subscribeToPush(
        'user-123',
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        },
        'Mozilla/5.0',
      );

      expect(subscription.id).toBeDefined();
      expect(subscription.userId).toBe('user-123');
      expect(subscription.active).toBe(true);
    });

    it('should unsubscribe from push', async () => {
      const subscription = await service.subscribeToPush('user-456', {
        endpoint: 'https://example.com/push',
        keys: { p256dh: 'key1', auth: 'key2' },
      });

      const result = await service.unsubscribeFromPush(subscription.id);
      expect(result).toBe(true);
    });

    it('should get user subscriptions', async () => {
      await service.subscribeToPush('user-789', {
        endpoint: 'https://example.com/push1',
        keys: { p256dh: 'k1', auth: 'k2' },
      });

      const subscriptions = await service.getUserSubscriptions('user-789');
      expect(subscriptions.length).toBeGreaterThan(0);
    });

    it('should send push notification', async () => {
      await service.subscribeToPush('user-notify', {
        endpoint: 'https://example.com/push',
        keys: { p256dh: 'k1', auth: 'k2' },
      });

      const result = await service.sendPushNotification('user-notify', {
        title: 'Test Notification',
        body: 'This is a test',
      });

      expect(result.sent).toBeGreaterThan(0);
    });

    it('should broadcast notification', async () => {
      await service.subscribeToPush('user-broadcast-1', {
        endpoint: 'https://example.com/push1',
        keys: { p256dh: 'k1', auth: 'k2' },
      });
      await service.subscribeToPush('user-broadcast-2', {
        endpoint: 'https://example.com/push2',
        keys: { p256dh: 'k3', auth: 'k4' },
      });

      const result = await service.sendBroadcastNotification({
        title: 'Broadcast',
        body: 'Message for all',
      });

      expect(result.sent).toBeGreaterThanOrEqual(2);
    });
  });

  describe('offline data sync', () => {
    it('should store offline data', async () => {
      const data = await service.storeOfflineData('form', {
        field1: 'value1',
        field2: 'value2',
      });

      expect(data.id).toBeDefined();
      expect(data.synced).toBe(false);
    });

    it('should sync offline data', async () => {
      await service.storeOfflineData('sync', { item: 'to sync' });
      const result = await service.syncOfflineData();

      expect(result.synced).toBeGreaterThan(0);
    });

    it('should get pending offline data', async () => {
      await service.storeOfflineData('request', { action: 'save' });
      const pending = await service.getPendingOfflineData();

      expect(pending.length).toBeGreaterThanOrEqual(0);
    });

    it('should clear synced data', async () => {
      await service.storeOfflineData('form', { data: 'test' });
      await service.syncOfflineData();

      const cleared = await service.clearSyncedData();
      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe('install tracking', () => {
    it('should track install prompt', async () => {
      const event = await service.trackInstallPrompt(
        'android',
        'Mozilla/5.0 (Android)',
        'user-123',
      );

      expect(event.id).toBeDefined();
      expect(event.prompted).toBe(true);
      expect(event.installed).toBe(false);
    });

    it('should track install complete', async () => {
      const prompt = await service.trackInstallPrompt('ios', 'Safari');
      const complete = await service.trackInstallComplete(prompt.id);

      expect(complete?.installed).toBe(true);
      expect(complete?.installedAt).toBeDefined();
    });

    it('should track install dismissed', async () => {
      const prompt = await service.trackInstallPrompt('android', 'Chrome');
      const dismissed = await service.trackInstallDismissed(prompt.id);

      expect(dismissed?.dismissedAt).toBeDefined();
    });

    it('should get install stats', async () => {
      await service.trackInstallPrompt('android', 'Chrome', 'user-1');
      const prompt = await service.trackInstallPrompt('android', 'Chrome', 'user-2');
      await service.trackInstallComplete(prompt.id);

      const stats = await service.getInstallStats();

      expect(stats.totalPrompts).toBeGreaterThan(0);
      expect(stats.installRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance and features', () => {
    it('should get performance hints', async () => {
      const hints = await service.getPerformanceHints();
      expect(Array.isArray(hints)).toBe(true);
    });

    it('should get feature support', () => {
      const features = service.getFeatureSupport();

      expect(features.serviceWorker).toBe(true);
      expect(features.pushNotifications).toBeDefined();
      expect(features.offlineStorage).toBe(true);
    });
  });
});
