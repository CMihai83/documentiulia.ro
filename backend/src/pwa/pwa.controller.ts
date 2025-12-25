import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { PwaService, ManifestShortcut, CacheRule, PushNotification } from './pwa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('PWA - Progressive Web App')
@Controller('pwa')
export class PwaController {
  constructor(private readonly pwaService: PwaService) {}

  // =================== MANIFEST ===================

  @Get('manifest.json')
  @Header('Content-Type', 'application/manifest+json')
  @ApiOperation({ summary: 'Get PWA manifest' })
  @ApiQuery({ name: 'locale', required: false })
  @ApiResponse({ status: 200, description: 'PWA manifest' })
  getManifest(@Query('locale') locale?: string) {
    if (locale) {
      return this.pwaService.getManifestForLocale(locale);
    }
    return this.pwaService.getManifest();
  }

  @Put('manifest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update PWA manifest' })
  @ApiResponse({ status: 200, description: 'Manifest updated' })
  updateManifest(@Body() updates: Record<string, any>) {
    return this.pwaService.updateManifest(updates);
  }

  @Post('manifest/shortcuts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add app shortcut' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        short_name: { type: 'string' },
        url: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['name', 'url'],
    },
  })
  @ApiResponse({ status: 201, description: 'Shortcut added' })
  addShortcut(@Body() shortcut: ManifestShortcut) {
    this.pwaService.addShortcut(shortcut);
    return { success: true, shortcut };
  }

  @Delete('manifest/shortcuts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove app shortcut' })
  @ApiQuery({ name: 'url', required: true })
  @ApiResponse({ status: 200, description: 'Shortcut removed' })
  removeShortcut(@Query('url') url: string) {
    const success = this.pwaService.removeShortcut(url);
    return { success, url };
  }

  // =================== SERVICE WORKER ===================

  @Get('service-worker.js')
  @Header('Content-Type', 'application/javascript')
  @ApiOperation({ summary: 'Get service worker script' })
  @ApiResponse({ status: 200, description: 'Service worker JavaScript' })
  getServiceWorker() {
    return this.pwaService.generateServiceWorker();
  }

  @Get('sw-config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get service worker configuration' })
  @ApiResponse({ status: 200, description: 'Service worker config' })
  getSwConfig() {
    return this.pwaService.getServiceWorkerConfig();
  }

  @Put('sw-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service worker configuration' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  updateSwConfig(@Body() updates: Record<string, any>) {
    return this.pwaService.updateServiceWorkerConfig(updates);
  }

  @Post('sw-config/cache-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add cache rule' })
  @ApiResponse({ status: 201, description: 'Cache rule added' })
  addCacheRule(@Body() rule: CacheRule) {
    this.pwaService.addCacheRule(rule);
    return { success: true, rule };
  }

  @Delete('sw-config/cache-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove cache rule' })
  @ApiQuery({ name: 'urlPattern', required: true })
  @ApiResponse({ status: 200, description: 'Cache rule removed' })
  removeCacheRule(@Query('urlPattern') urlPattern: string) {
    const success = this.pwaService.removeCacheRule(urlPattern);
    return { success, urlPattern };
  }

  @Post('sw-config/precache')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add precache URL' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
  })
  @ApiResponse({ status: 201, description: 'URL added to precache' })
  addPrecacheUrl(@Body('url') url: string) {
    this.pwaService.addPrecacheUrl(url);
    return { success: true, url };
  }

  // =================== PUSH NOTIFICATIONS ===================

  @Get('push/vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for push subscriptions' })
  @ApiResponse({ status: 200, description: 'VAPID public key' })
  getVapidPublicKey() {
    return { publicKey: this.pwaService.getVapidPublicKey() };
  }

  @Post('push/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        endpoint: { type: 'string' },
        keys: {
          type: 'object',
          properties: {
            p256dh: { type: 'string' },
            auth: { type: 'string' },
          },
        },
        userAgent: { type: 'string' },
      },
      required: ['userId', 'endpoint', 'keys'],
    },
  })
  @ApiResponse({ status: 201, description: 'Subscribed to push' })
  async subscribeToPush(
    @Body()
    body: {
      userId: string;
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    },
  ) {
    return this.pwaService.subscribeToPush(
      body.userId,
      { endpoint: body.endpoint, keys: body.keys },
      body.userAgent,
    );
  }

  @Post('push/unsubscribe/:subscriptionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({ status: 200, description: 'Unsubscribed' })
  async unsubscribeFromPush(@Param('subscriptionId') subscriptionId: string) {
    const success = await this.pwaService.unsubscribeFromPush(subscriptionId);
    return { success, subscriptionId };
  }

  @Get('push/subscriptions/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user push subscriptions' })
  @ApiResponse({ status: 200, description: 'User subscriptions' })
  async getUserSubscriptions(@Param('userId') userId: string) {
    return { subscriptions: await this.pwaService.getUserSubscriptions(userId) };
  }

  @Post('push/send/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send push notification to user' })
  @ApiResponse({ status: 200, description: 'Notification sent' })
  async sendPushNotification(
    @Param('userId') userId: string,
    @Body() notification: Omit<PushNotification, 'id'>,
  ) {
    return this.pwaService.sendPushNotification(userId, notification);
  }

  @Post('push/broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Broadcast push notification to all users' })
  @ApiResponse({ status: 200, description: 'Broadcast sent' })
  async sendBroadcastNotification(@Body() notification: Omit<PushNotification, 'id'>) {
    return this.pwaService.sendBroadcastNotification(notification);
  }

  // =================== OFFLINE SYNC ===================

  @Post('offline/store')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Store offline data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['form', 'sync', 'request'] },
        data: { type: 'object' },
      },
      required: ['type', 'data'],
    },
  })
  @ApiResponse({ status: 201, description: 'Data stored' })
  async storeOfflineData(
    @Body('type') type: 'form' | 'sync' | 'request',
    @Body('data') data: Record<string, any>,
  ) {
    return this.pwaService.storeOfflineData(type, data);
  }

  @Post('offline/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync offline data' })
  @ApiResponse({ status: 200, description: 'Sync result' })
  async syncOfflineData() {
    return this.pwaService.syncOfflineData();
  }

  @Get('offline/pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending offline data' })
  @ApiResponse({ status: 200, description: 'Pending data' })
  async getPendingOfflineData() {
    return { data: await this.pwaService.getPendingOfflineData() };
  }

  @Delete('offline/synced')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear synced offline data' })
  @ApiResponse({ status: 200, description: 'Synced data cleared' })
  async clearSyncedData() {
    const cleared = await this.pwaService.clearSyncedData();
    return { cleared };
  }

  // =================== INSTALL TRACKING ===================

  @Post('install/prompt')
  @ApiOperation({ summary: 'Track install prompt' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        platform: { type: 'string' },
        userAgent: { type: 'string' },
        userId: { type: 'string' },
      },
      required: ['platform', 'userAgent'],
    },
  })
  @ApiResponse({ status: 201, description: 'Install prompt tracked' })
  async trackInstallPrompt(
    @Body('platform') platform: string,
    @Body('userAgent') userAgent: string,
    @Body('userId') userId?: string,
  ) {
    return this.pwaService.trackInstallPrompt(platform, userAgent, userId);
  }

  @Post('install/complete/:eventId')
  @ApiOperation({ summary: 'Track install complete' })
  @ApiResponse({ status: 200, description: 'Install complete tracked' })
  async trackInstallComplete(@Param('eventId') eventId: string) {
    return this.pwaService.trackInstallComplete(eventId);
  }

  @Post('install/dismissed/:eventId')
  @ApiOperation({ summary: 'Track install dismissed' })
  @ApiResponse({ status: 200, description: 'Install dismissed tracked' })
  async trackInstallDismissed(@Param('eventId') eventId: string) {
    return this.pwaService.trackInstallDismissed(eventId);
  }

  @Get('install/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get install statistics' })
  @ApiResponse({ status: 200, description: 'Install stats' })
  async getInstallStats() {
    return this.pwaService.getInstallStats();
  }

  // =================== PERFORMANCE & FEATURES ===================

  @Get('performance/hints')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get PWA performance hints' })
  @ApiResponse({ status: 200, description: 'Performance hints' })
  async getPerformanceHints() {
    return { hints: await this.pwaService.getPerformanceHints() };
  }

  @Get('features')
  @ApiOperation({ summary: 'Get PWA feature support' })
  @ApiResponse({ status: 200, description: 'Feature support' })
  getFeatureSupport() {
    return { features: this.pwaService.getFeatureSupport() };
  }
}
