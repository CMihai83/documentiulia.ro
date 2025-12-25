import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  MobileDashboardService,
  MobileDashboardLayout,
  MobileWidget,
  MobileDashboardPreset,
  MobileTheme,
  MobileNavigationConfig,
  NavigationItem,
  DeviceType,
  ScreenOrientation,
  DeviceInfo,
  CachedData,
  SyncStatus,
  MobileAnalytics,
  RefreshStrategy,
} from './mobile-dashboard.service';

// ============================================================================
// DTOs
// ============================================================================

class CreateLayoutDto {
  name: string;
  userId: string;
  tenantId: string;
  deviceType: DeviceType;
  orientation?: ScreenOrientation;
  presetId?: string;
}

class UpdateLayoutDto {
  name?: string;
  orientation?: ScreenOrientation;
  isDefault?: boolean;
}

class AddWidgetDto {
  type: MobileWidget['type'];
  title: string;
  subtitle?: string;
  icon?: string;
  size: MobileWidget['size'];
  order: number;
  isVisible: boolean;
  isCollapsible: boolean;
  isCollapsed: boolean;
  refreshStrategy: RefreshStrategy;
  refreshIntervalSeconds?: number;
  config: Record<string, any>;
  gestures: MobileWidget['gestures'];
  quickActions?: MobileWidget['quickActions'];
  badge?: MobileWidget['badge'];
}

class UpdateWidgetDto {
  title?: string;
  subtitle?: string;
  icon?: string;
  size?: MobileWidget['size'];
  order?: number;
  isVisible?: boolean;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  refreshStrategy?: RefreshStrategy;
  refreshIntervalSeconds?: number;
  config?: Record<string, any>;
  gestures?: MobileWidget['gestures'];
  quickActions?: MobileWidget['quickActions'];
  badge?: MobileWidget['badge'];
}

class ReorderWidgetsDto {
  widgetIds: string[];
}

class UpdateThemeDto {
  mode?: MobileTheme['mode'];
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  textColor?: string;
  secondaryTextColor?: string;
  borderRadius?: number;
  useShadows?: boolean;
  fontScale?: number;
}

class UpdateNavigationDto {
  type?: MobileNavigationConfig['type'];
  showLabels?: boolean;
  hapticOnSelect?: boolean;
  badgeConfig?: MobileNavigationConfig['badgeConfig'];
}

class UpdateNavigationItemDto {
  label?: string;
  icon?: string;
  activeIcon?: string;
  route?: string;
  badge?: number;
  isVisible?: boolean;
}

class ReorderNavigationDto {
  itemIds: string[];
}

class CacheDataDto {
  key: string;
  data: any;
  ttlSeconds?: number;
}

class DeviceInfoDto {
  type: DeviceType;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  orientation: ScreenOrientation;
  platform: 'ios' | 'android' | 'web';
  osVersion?: string;
  appVersion?: string;
  hasNotch: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  supportsHaptics: boolean;
  connectionType: DeviceInfo['connectionType'];
}

class StartSessionDto {
  userId: string;
  deviceInfo: DeviceInfoDto;
}

class TrackScreenViewDto {
  screen: string;
}

class TrackInteractionDto {
  type: 'tap' | 'gesture' | 'input' | 'scroll';
  target: string;
  metadata?: Record<string, any>;
}

class UpdatePerformanceDto {
  timeToInteractive?: number;
  frameRate?: number;
  memoryUsage?: number;
  networkLatency?: number;
}

class GetLayoutForDeviceDto {
  userId: string;
  deviceType: DeviceType;
  orientation: ScreenOrientation;
}

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller('mobile-dashboard')
export class MobileDashboardController {
  constructor(private readonly mobileDashboardService: MobileDashboardService) {}

  // ==========================================================================
  // LAYOUT MANAGEMENT
  // ==========================================================================

  @Post('layouts')
  createLayout(@Body() dto: CreateLayoutDto): MobileDashboardLayout {
    return this.mobileDashboardService.createLayout(dto);
  }

  @Get('layouts/:layoutId')
  getLayout(@Param('layoutId') layoutId: string): MobileDashboardLayout | null {
    return this.mobileDashboardService.getLayout(layoutId);
  }

  @Get('layouts/user/:userId')
  getUserLayouts(@Param('userId') userId: string): MobileDashboardLayout[] {
    return this.mobileDashboardService.getUserLayouts(userId);
  }

  @Post('layouts/for-device')
  getLayoutForDevice(@Body() dto: GetLayoutForDeviceDto): MobileDashboardLayout | null {
    return this.mobileDashboardService.getLayoutForDevice(dto.userId, dto.deviceType, dto.orientation);
  }

  @Put('layouts/:layoutId')
  updateLayout(
    @Param('layoutId') layoutId: string,
    @Body() dto: UpdateLayoutDto,
  ): MobileDashboardLayout | null {
    return this.mobileDashboardService.updateLayout(layoutId, dto);
  }

  @Delete('layouts/:layoutId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLayout(@Param('layoutId') layoutId: string): void {
    this.mobileDashboardService.deleteLayout(layoutId);
  }

  @Put('layouts/:layoutId/set-default/:userId')
  setDefaultLayout(
    @Param('layoutId') layoutId: string,
    @Param('userId') userId: string,
  ): { success: boolean } {
    const result = this.mobileDashboardService.setDefaultLayout(userId, layoutId);
    return { success: result };
  }

  // ==========================================================================
  // WIDGET MANAGEMENT
  // ==========================================================================

  @Post('layouts/:layoutId/widgets')
  addWidget(
    @Param('layoutId') layoutId: string,
    @Body() dto: AddWidgetDto,
  ): MobileWidget | null {
    return this.mobileDashboardService.addWidget(layoutId, dto);
  }

  @Put('layouts/:layoutId/widgets/:widgetId')
  updateWidget(
    @Param('layoutId') layoutId: string,
    @Param('widgetId') widgetId: string,
    @Body() dto: UpdateWidgetDto,
  ): MobileWidget | null {
    return this.mobileDashboardService.updateWidget(layoutId, widgetId, dto);
  }

  @Delete('layouts/:layoutId/widgets/:widgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeWidget(
    @Param('layoutId') layoutId: string,
    @Param('widgetId') widgetId: string,
  ): void {
    this.mobileDashboardService.removeWidget(layoutId, widgetId);
  }

  @Put('layouts/:layoutId/widgets/reorder')
  reorderWidgets(
    @Param('layoutId') layoutId: string,
    @Body() dto: ReorderWidgetsDto,
  ): MobileDashboardLayout | null {
    return this.mobileDashboardService.reorderWidgets(layoutId, dto.widgetIds);
  }

  @Put('layouts/:layoutId/widgets/:widgetId/toggle-collapse')
  toggleWidgetCollapse(
    @Param('layoutId') layoutId: string,
    @Param('widgetId') widgetId: string,
  ): { success: boolean } {
    const result = this.mobileDashboardService.toggleWidgetCollapse(layoutId, widgetId);
    return { success: result };
  }

  @Post('layouts/:layoutId/widgets/:widgetId/refresh')
  async refreshWidgetData(
    @Param('layoutId') layoutId: string,
    @Param('widgetId') widgetId: string,
  ): Promise<MobileWidget | null> {
    return this.mobileDashboardService.refreshWidgetData(layoutId, widgetId);
  }

  @Post('layouts/:layoutId/refresh-all')
  async refreshAllWidgets(
    @Param('layoutId') layoutId: string,
  ): Promise<MobileDashboardLayout | null> {
    return this.mobileDashboardService.refreshAllWidgets(layoutId);
  }

  @Post('layouts/:layoutId/widgets/:widgetId/quick-action/:actionId')
  executeQuickAction(
    @Param('layoutId') layoutId: string,
    @Param('widgetId') widgetId: string,
    @Param('actionId') actionId: string,
  ): { success: boolean; result?: any; error?: string } {
    return this.mobileDashboardService.executeQuickAction(layoutId, widgetId, actionId);
  }

  // ==========================================================================
  // PRESETS
  // ==========================================================================

  @Get('presets')
  listPresets(@Query('category') category?: MobileDashboardPreset['category']): MobileDashboardPreset[] {
    return this.mobileDashboardService.listPresets(category);
  }

  @Get('presets/:presetId')
  getPreset(@Param('presetId') presetId: string): MobileDashboardPreset | null {
    return this.mobileDashboardService.getPreset(presetId);
  }

  @Post('layouts/:layoutId/apply-preset/:presetId')
  applyPreset(
    @Param('layoutId') layoutId: string,
    @Param('presetId') presetId: string,
  ): MobileDashboardLayout | null {
    return this.mobileDashboardService.applyPreset(layoutId, presetId);
  }

  // ==========================================================================
  // THEME MANAGEMENT
  // ==========================================================================

  @Put('layouts/:layoutId/theme')
  updateTheme(
    @Param('layoutId') layoutId: string,
    @Body() dto: UpdateThemeDto,
  ): MobileDashboardLayout | null {
    return this.mobileDashboardService.updateTheme(layoutId, dto);
  }

  @Post('theme/for-device')
  getThemeForDevice(@Body() deviceInfo: DeviceInfoDto): MobileTheme {
    return this.mobileDashboardService.getThemeForDevice(deviceInfo);
  }

  // ==========================================================================
  // NAVIGATION CONFIGURATION
  // ==========================================================================

  @Put('layouts/:layoutId/navigation')
  updateNavigation(
    @Param('layoutId') layoutId: string,
    @Body() dto: UpdateNavigationDto,
  ): MobileDashboardLayout | null {
    return this.mobileDashboardService.updateNavigation(layoutId, dto);
  }

  @Put('layouts/:layoutId/navigation/items/:itemId')
  updateNavigationItem(
    @Param('layoutId') layoutId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateNavigationItemDto,
  ): NavigationItem | null {
    return this.mobileDashboardService.updateNavigationItem(layoutId, itemId, dto);
  }

  @Put('layouts/:layoutId/navigation/reorder')
  reorderNavigation(
    @Param('layoutId') layoutId: string,
    @Body() dto: ReorderNavigationDto,
  ): MobileDashboardLayout | null {
    return this.mobileDashboardService.reorderNavigation(layoutId, dto.itemIds);
  }

  // ==========================================================================
  // OFFLINE CACHING
  // ==========================================================================

  @Post('cache')
  cacheData(@Body() dto: CacheDataDto): CachedData {
    return this.mobileDashboardService.cacheData(dto.key, dto.data, dto.ttlSeconds);
  }

  @Get('cache/:key')
  getCachedData(@Param('key') key: string): { data: any; isStale: boolean } | null {
    return this.mobileDashboardService.getCachedData(key);
  }

  @Delete('cache/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  invalidateCache(@Param('key') key: string): void {
    this.mobileDashboardService.invalidateCache(key);
  }

  @Delete('cache/pattern/:pattern')
  invalidateCacheByPattern(@Param('pattern') pattern: string): { invalidated: number } {
    const count = this.mobileDashboardService.invalidateCacheByPattern(pattern);
    return { invalidated: count };
  }

  @Get('cache/stats')
  getCacheStats(): { totalItems: number; totalSize: number; staleItems: number } {
    return this.mobileDashboardService.getCacheStats();
  }

  @Post('cache/cleanup')
  cleanupExpiredCache(): { cleaned: number } {
    const count = this.mobileDashboardService.cleanupExpiredCache();
    return { cleaned: count };
  }

  // ==========================================================================
  // SYNC STATUS
  // ==========================================================================

  @Get('sync/:userId')
  getSyncStatus(@Param('userId') userId: string): SyncStatus {
    return this.mobileDashboardService.getSyncStatus(userId);
  }

  @Post('sync/:userId/pending')
  addPendingChange(@Param('userId') userId: string): { pendingChanges: number } {
    const count = this.mobileDashboardService.addPendingChange(userId);
    return { pendingChanges: count };
  }

  @Post('sync/:userId/complete')
  markSyncComplete(@Param('userId') userId: string): SyncStatus {
    return this.mobileDashboardService.markSyncComplete(userId);
  }

  @Post('sync/:userId/error')
  addSyncError(
    @Param('userId') userId: string,
    @Body() body: { key: string; error: string },
  ): { success: boolean } {
    this.mobileDashboardService.addSyncError(userId, body.key, body.error);
    return { success: true };
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  @Post('analytics/session/start')
  startSession(@Body() dto: StartSessionDto): { sessionId: string } {
    const sessionId = this.mobileDashboardService.startSession(dto.userId, dto.deviceInfo);
    return { sessionId };
  }

  @Post('analytics/session/:sessionId/screen-view')
  trackScreenView(
    @Param('sessionId') sessionId: string,
    @Body() dto: TrackScreenViewDto,
  ): { success: boolean } {
    this.mobileDashboardService.trackScreenView(sessionId, dto.screen);
    return { success: true };
  }

  @Post('analytics/session/:sessionId/interaction')
  trackInteraction(
    @Param('sessionId') sessionId: string,
    @Body() dto: TrackInteractionDto,
  ): { success: boolean } {
    this.mobileDashboardService.trackInteraction(sessionId, dto);
    return { success: true };
  }

  @Put('analytics/session/:sessionId/performance')
  updatePerformanceMetrics(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdatePerformanceDto,
  ): { success: boolean } {
    this.mobileDashboardService.updatePerformanceMetrics(sessionId, dto);
    return { success: true };
  }

  @Get('analytics/session/:sessionId')
  getSessionAnalytics(@Param('sessionId') sessionId: string): MobileAnalytics | null {
    return this.mobileDashboardService.getSessionAnalytics(sessionId);
  }

  @Post('analytics/session/:sessionId/end')
  endSession(@Param('sessionId') sessionId: string): MobileAnalytics | null {
    return this.mobileDashboardService.endSession(sessionId);
  }

  // ==========================================================================
  // RESPONSIVE HELPERS
  // ==========================================================================

  @Post('responsive/optimal-layout')
  getOptimalWidgetLayout(
    @Body() body: { deviceInfo: DeviceInfoDto; widgets: MobileWidget[] },
  ): MobileWidget[] {
    return this.mobileDashboardService.getOptimalWidgetLayout(body.deviceInfo, body.widgets);
  }

  @Post('responsive/refresh-strategy')
  getRecommendedRefreshStrategy(
    @Body() body: { connectionType: DeviceInfo['connectionType'] },
  ): { strategy: RefreshStrategy } {
    const strategy = this.mobileDashboardService.getRecommendedRefreshStrategy(body.connectionType);
    return { strategy };
  }
}
