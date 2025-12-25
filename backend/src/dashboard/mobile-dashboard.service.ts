import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type DeviceType = 'phone' | 'tablet' | 'desktop';
export type ScreenOrientation = 'portrait' | 'landscape';
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';
export type RefreshStrategy = 'realtime' | 'pull_to_refresh' | 'manual' | 'interval';
export type GestureType = 'tap' | 'double_tap' | 'long_press' | 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'pinch' | 'spread';

export interface DeviceInfo {
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
  connectionType: 'wifi' | 'cellular' | '4g' | '5g' | 'offline';
}

export interface MobileWidget {
  id: string;
  type: MobileWidgetType;
  title: string;
  subtitle?: string;
  icon?: string;
  size: WidgetSize;
  order: number;
  isVisible: boolean;
  isCollapsible: boolean;
  isCollapsed: boolean;
  refreshStrategy: RefreshStrategy;
  refreshIntervalSeconds?: number;
  lastRefreshed?: Date;
  config: Record<string, any>;
  data?: any;
  gestures: GestureAction[];
  badge?: {
    value: number | string;
    type: 'count' | 'alert' | 'new';
    color?: string;
  };
  quickActions?: QuickAction[];
}

export type MobileWidgetType =
  | 'kpi_card'
  | 'mini_chart'
  | 'progress_ring'
  | 'stat_row'
  | 'list_preview'
  | 'action_buttons'
  | 'calendar_summary'
  | 'notification_feed'
  | 'quick_entry'
  | 'status_indicator'
  | 'chart_sparkline'
  | 'comparison_card'
  | 'timeline'
  | 'map_preview'
  | 'weather_widget'
  | 'task_checklist';

export interface GestureAction {
  gesture: GestureType;
  action: string;
  params?: Record<string, any>;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  params?: Record<string, any>;
  destructive?: boolean;
  requiresConfirmation?: boolean;
}

export interface MobileDashboardLayout {
  id: string;
  name: string;
  userId: string;
  tenantId: string;
  deviceType: DeviceType;
  orientation: ScreenOrientation;
  widgets: MobileWidget[];
  headerConfig: MobileHeaderConfig;
  navigationConfig: MobileNavigationConfig;
  theme: MobileTheme;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MobileHeaderConfig {
  showLogo: boolean;
  showSearch: boolean;
  showNotifications: boolean;
  showProfile: boolean;
  backgroundColor?: string;
  titleAlignment: 'left' | 'center';
  isTransparent: boolean;
  collapseOnScroll: boolean;
}

export interface MobileNavigationConfig {
  type: 'bottom_tabs' | 'drawer' | 'floating_menu';
  items: NavigationItem[];
  showLabels: boolean;
  hapticOnSelect: boolean;
  badgeConfig?: {
    showOnItems: string[];
    animate: boolean;
  };
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  activeIcon?: string;
  route: string;
  badge?: number;
  isVisible: boolean;
}

export interface MobileTheme {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  secondaryTextColor: string;
  borderRadius: number;
  useShadows: boolean;
  fontScale: number;
}

export interface OfflineCacheConfig {
  enabled: boolean;
  maxAge: number; // seconds
  maxSize: number; // bytes
  priority: 'storage' | 'freshness';
  syncOnReconnect: boolean;
  cacheWidgets: string[];
}

export interface CachedData {
  key: string;
  data: any;
  cachedAt: Date;
  expiresAt: Date;
  size: number;
  version: number;
}

export interface SyncStatus {
  lastSyncAt: Date;
  pendingChanges: number;
  syncInProgress: boolean;
  errors: SyncError[];
}

export interface SyncError {
  key: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}

export interface MobileAnalytics {
  sessionId: string;
  userId: string;
  deviceInfo: DeviceInfo;
  screenViews: ScreenView[];
  interactions: Interaction[];
  performance: PerformanceMetrics;
}

export interface ScreenView {
  screen: string;
  timestamp: Date;
  duration?: number;
  scrollDepth?: number;
}

export interface Interaction {
  type: 'tap' | 'gesture' | 'input' | 'scroll';
  target: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  appStartTime: number;
  timeToInteractive: number;
  frameRate: number;
  memoryUsage: number;
  networkLatency: number;
}

export interface MobileDashboardPreset {
  id: string;
  name: string;
  description: string;
  category: 'finance' | 'hr' | 'logistics' | 'sales' | 'executive' | 'custom';
  thumbnail?: string;
  widgets: Omit<MobileWidget, 'id' | 'data'>[];
  supportedDevices: DeviceType[];
  isDefault: boolean;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

@Injectable()
export class MobileDashboardService {
  private readonly logger = new Logger(MobileDashboardService.name);

  // In-memory storage
  private layouts: Map<string, MobileDashboardLayout> = new Map();
  private userLayouts: Map<string, Set<string>> = new Map(); // userId -> layoutIds
  private cache: Map<string, CachedData> = new Map();
  private syncStatus: Map<string, SyncStatus> = new Map();
  private presets: Map<string, MobileDashboardPreset> = new Map();
  private analytics: Map<string, MobileAnalytics> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeDefaultPresets();
  }

  // ============================================================================
  // PRESET INITIALIZATION
  // ============================================================================

  private initializeDefaultPresets(): void {
    const presets: MobileDashboardPreset[] = [
      {
        id: 'preset-finance',
        name: 'Finance Overview',
        description: 'Quick access to invoices, payments, and cash flow',
        category: 'finance',
        supportedDevices: ['phone', 'tablet'],
        isDefault: true,
        widgets: [
          {
            type: 'kpi_card',
            title: 'Sold curent',
            icon: 'wallet',
            size: 'medium',
            order: 1,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { metric: 'current_balance', currency: 'RON' },
            gestures: [{ gesture: 'tap', action: 'navigate', params: { route: '/finance/accounts' }, hapticFeedback: 'light' }],
            quickActions: [
              { id: 'transfer', label: 'Transfer', icon: 'arrow-right-left', action: 'openTransfer' },
            ],
          },
          {
            type: 'chart_sparkline',
            title: 'Venituri săptămâna',
            icon: 'trending-up',
            size: 'medium',
            order: 2,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'interval',
            refreshIntervalSeconds: 300,
            config: { metric: 'weekly_revenue', chartType: 'line' },
            gestures: [{ gesture: 'tap', action: 'navigate', params: { route: '/finance/revenue' }, hapticFeedback: 'light' }],
          },
          {
            type: 'list_preview',
            title: 'Facturi recente',
            icon: 'file-text',
            size: 'large',
            order: 3,
            isVisible: true,
            isCollapsible: true,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { listType: 'invoices', limit: 5 },
            gestures: [
              { gesture: 'swipe_left', action: 'quickAction', params: { action: 'send' }, hapticFeedback: 'medium' },
              { gesture: 'swipe_right', action: 'quickAction', params: { action: 'mark_paid' }, hapticFeedback: 'medium' },
            ],
            quickActions: [
              { id: 'new', label: 'Factură nouă', icon: 'plus', action: 'createInvoice' },
            ],
          },
          {
            type: 'progress_ring',
            title: 'TVA trimestru',
            icon: 'percent',
            size: 'small',
            order: 4,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'manual',
            config: { metric: 'quarterly_vat', target: 100 },
            gestures: [{ gesture: 'tap', action: 'navigate', params: { route: '/finance/vat' }, hapticFeedback: 'light' }],
          },
          {
            type: 'action_buttons',
            title: 'Acțiuni rapide',
            size: 'full',
            order: 5,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'manual',
            config: {},
            gestures: [],
            quickActions: [
              { id: 'scan', label: 'Scanează', icon: 'camera', action: 'scanDocument' },
              { id: 'payment', label: 'Plată', icon: 'credit-card', action: 'newPayment' },
              { id: 'report', label: 'Raport', icon: 'bar-chart', action: 'generateReport' },
            ],
          },
        ],
      },
      {
        id: 'preset-hr',
        name: 'HR Dashboard',
        description: 'Employee overview, leave requests, and team status',
        category: 'hr',
        supportedDevices: ['phone', 'tablet'],
        isDefault: false,
        widgets: [
          {
            type: 'stat_row',
            title: 'Echipa',
            icon: 'users',
            size: 'full',
            order: 1,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { stats: ['total_employees', 'on_leave', 'remote', 'in_office'] },
            gestures: [{ gesture: 'tap', action: 'navigate', params: { route: '/hr/employees' }, hapticFeedback: 'light' }],
          },
          {
            type: 'list_preview',
            title: 'Cereri concediu',
            icon: 'calendar',
            size: 'large',
            order: 2,
            isVisible: true,
            isCollapsible: true,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { listType: 'leave_requests', limit: 5, filter: 'pending' },
            gestures: [
              { gesture: 'swipe_left', action: 'quickAction', params: { action: 'reject' }, hapticFeedback: 'heavy' },
              { gesture: 'swipe_right', action: 'quickAction', params: { action: 'approve' }, hapticFeedback: 'medium' },
            ],
            badge: { value: 0, type: 'count' },
          },
          {
            type: 'calendar_summary',
            title: 'Astăzi',
            icon: 'calendar-days',
            size: 'medium',
            order: 3,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'realtime',
            config: { view: 'today', showBirthdays: true, showAnniversaries: true },
            gestures: [{ gesture: 'tap', action: 'navigate', params: { route: '/hr/calendar' }, hapticFeedback: 'light' }],
          },
          {
            type: 'notification_feed',
            title: 'Activitate HR',
            icon: 'bell',
            size: 'large',
            order: 4,
            isVisible: true,
            isCollapsible: true,
            isCollapsed: false,
            refreshStrategy: 'realtime',
            config: { category: 'hr', limit: 10 },
            gestures: [{ gesture: 'swipe_left', action: 'dismiss', hapticFeedback: 'light' }],
          },
        ],
      },
      {
        id: 'preset-logistics',
        name: 'Logistics Tracker',
        description: 'Fleet status, deliveries, and route overview',
        category: 'logistics',
        supportedDevices: ['phone', 'tablet'],
        isDefault: false,
        widgets: [
          {
            type: 'map_preview',
            title: 'Flotă în timp real',
            icon: 'map',
            size: 'large',
            order: 1,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'realtime',
            config: { showVehicles: true, showRoutes: true, clustering: true },
            gestures: [
              { gesture: 'tap', action: 'navigate', params: { route: '/logistics/map' }, hapticFeedback: 'light' },
              { gesture: 'pinch', action: 'zoom', hapticFeedback: 'none' },
            ],
          },
          {
            type: 'stat_row',
            title: 'Status vehicule',
            icon: 'truck',
            size: 'full',
            order: 2,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'interval',
            refreshIntervalSeconds: 60,
            config: { stats: ['active', 'idle', 'maintenance', 'offline'] },
            gestures: [],
          },
          {
            type: 'list_preview',
            title: 'Livrări active',
            icon: 'package',
            size: 'large',
            order: 3,
            isVisible: true,
            isCollapsible: true,
            isCollapsed: false,
            refreshStrategy: 'realtime',
            config: { listType: 'deliveries', filter: 'in_progress', limit: 5 },
            gestures: [
              { gesture: 'swipe_left', action: 'quickAction', params: { action: 'call_driver' }, hapticFeedback: 'medium' },
              { gesture: 'tap', action: 'viewDetails', hapticFeedback: 'light' },
            ],
          },
          {
            type: 'progress_ring',
            title: 'Livrări azi',
            icon: 'check-circle',
            size: 'medium',
            order: 4,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { metric: 'daily_deliveries', showPercentage: true },
            gestures: [{ gesture: 'tap', action: 'navigate', params: { route: '/logistics/deliveries' }, hapticFeedback: 'light' }],
          },
        ],
      },
      {
        id: 'preset-executive',
        name: 'Executive Summary',
        description: 'High-level KPIs and business overview',
        category: 'executive',
        supportedDevices: ['phone', 'tablet'],
        isDefault: false,
        widgets: [
          {
            type: 'comparison_card',
            title: 'Performanță lunară',
            icon: 'trending-up',
            size: 'full',
            order: 1,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: {
              metrics: ['revenue', 'expenses', 'profit'],
              comparison: 'previous_month',
              showTrend: true,
            },
            gestures: [{ gesture: 'tap', action: 'navigate', params: { route: '/reports/monthly' }, hapticFeedback: 'light' }],
          },
          {
            type: 'kpi_card',
            title: 'Venituri MTD',
            icon: 'dollar-sign',
            size: 'medium',
            order: 2,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { metric: 'mtd_revenue', format: 'currency', currency: 'RON' },
            gestures: [{ gesture: 'tap', action: 'drillDown', params: { metric: 'revenue' }, hapticFeedback: 'light' }],
          },
          {
            type: 'kpi_card',
            title: 'Marjă profit',
            icon: 'percent',
            size: 'medium',
            order: 3,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { metric: 'profit_margin', format: 'percentage' },
            gestures: [{ gesture: 'tap', action: 'drillDown', params: { metric: 'margin' }, hapticFeedback: 'light' }],
          },
          {
            type: 'mini_chart',
            title: 'Trend 12 luni',
            icon: 'line-chart',
            size: 'large',
            order: 4,
            isVisible: true,
            isCollapsible: true,
            isCollapsed: false,
            refreshStrategy: 'manual',
            config: { metric: 'revenue', period: '12_months', chartType: 'area' },
            gestures: [
              { gesture: 'tap', action: 'navigate', params: { route: '/reports/trends' }, hapticFeedback: 'light' },
              { gesture: 'long_press', action: 'showDetails', hapticFeedback: 'medium' },
            ],
          },
          {
            type: 'task_checklist',
            title: 'Priorități azi',
            icon: 'check-square',
            size: 'large',
            order: 5,
            isVisible: true,
            isCollapsible: true,
            isCollapsed: false,
            refreshStrategy: 'realtime',
            config: { filter: 'today', showCompleted: false },
            gestures: [
              { gesture: 'swipe_right', action: 'complete', hapticFeedback: 'medium' },
              { gesture: 'swipe_left', action: 'postpone', hapticFeedback: 'light' },
            ],
          },
        ],
      },
      {
        id: 'preset-sales',
        name: 'Sales Dashboard',
        description: 'Pipeline, deals, and sales performance',
        category: 'sales',
        supportedDevices: ['phone', 'tablet'],
        isDefault: false,
        widgets: [
          {
            type: 'kpi_card',
            title: 'Pipeline valoare',
            icon: 'funnel',
            size: 'medium',
            order: 1,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { metric: 'pipeline_value', format: 'currency', currency: 'RON' },
            gestures: [{ gesture: 'tap', action: 'navigate', params: { route: '/sales/pipeline' }, hapticFeedback: 'light' }],
          },
          {
            type: 'progress_ring',
            title: 'Target lunar',
            icon: 'target',
            size: 'medium',
            order: 2,
            isVisible: true,
            isCollapsible: false,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { metric: 'monthly_target', showPercentage: true },
            gestures: [{ gesture: 'tap', action: 'navigate', params: { route: '/sales/targets' }, hapticFeedback: 'light' }],
          },
          {
            type: 'list_preview',
            title: 'Oportunități fierbinți',
            icon: 'flame',
            size: 'large',
            order: 3,
            isVisible: true,
            isCollapsible: true,
            isCollapsed: false,
            refreshStrategy: 'pull_to_refresh',
            config: { listType: 'opportunities', filter: 'hot', limit: 5, sortBy: 'value' },
            gestures: [
              { gesture: 'tap', action: 'viewDetails', hapticFeedback: 'light' },
              { gesture: 'swipe_left', action: 'quickAction', params: { action: 'call' }, hapticFeedback: 'medium' },
            ],
          },
          {
            type: 'timeline',
            title: 'Activitate recentă',
            icon: 'activity',
            size: 'large',
            order: 4,
            isVisible: true,
            isCollapsible: true,
            isCollapsed: false,
            refreshStrategy: 'realtime',
            config: { filter: 'sales', limit: 10 },
            gestures: [{ gesture: 'tap', action: 'viewDetails', hapticFeedback: 'light' }],
          },
        ],
      },
    ];

    presets.forEach((preset) => {
      this.presets.set(preset.id, preset);
    });

    this.logger.log(`Initialized ${presets.length} mobile dashboard presets`);
  }

  // ============================================================================
  // LAYOUT MANAGEMENT
  // ============================================================================

  createLayout(params: {
    name: string;
    userId: string;
    tenantId: string;
    deviceType: DeviceType;
    orientation?: ScreenOrientation;
    presetId?: string;
  }): MobileDashboardLayout {
    const id = `layout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let widgets: MobileWidget[] = [];

    // If preset specified, use its widgets
    if (params.presetId) {
      const preset = this.presets.get(params.presetId);
      if (preset) {
        widgets = preset.widgets.map((w, i) => ({
          ...w,
          id: `widget-${Date.now()}-${i}`,
          data: undefined,
        }));
      }
    }

    const layout: MobileDashboardLayout = {
      id,
      name: params.name,
      userId: params.userId,
      tenantId: params.tenantId,
      deviceType: params.deviceType,
      orientation: params.orientation || 'portrait',
      widgets,
      headerConfig: {
        showLogo: true,
        showSearch: true,
        showNotifications: true,
        showProfile: true,
        titleAlignment: 'left',
        isTransparent: false,
        collapseOnScroll: true,
      },
      navigationConfig: {
        type: 'bottom_tabs',
        items: [
          { id: 'home', label: 'Acasă', icon: 'home', route: '/dashboard', isVisible: true },
          { id: 'invoices', label: 'Facturi', icon: 'file-text', route: '/invoices', isVisible: true },
          { id: 'scan', label: 'Scanează', icon: 'camera', route: '/scan', isVisible: true },
          { id: 'reports', label: 'Rapoarte', icon: 'bar-chart', route: '/reports', isVisible: true },
          { id: 'more', label: 'Mai mult', icon: 'menu', route: '/menu', isVisible: true },
        ],
        showLabels: true,
        hapticOnSelect: true,
      },
      theme: this.getDefaultTheme(),
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.layouts.set(id, layout);

    // Track user layouts
    if (!this.userLayouts.has(params.userId)) {
      this.userLayouts.set(params.userId, new Set());
    }
    this.userLayouts.get(params.userId)!.add(id);

    this.logger.log(`Created mobile layout ${id} for user ${params.userId}`);
    return layout;
  }

  private getDefaultTheme(): MobileTheme {
    return {
      mode: 'system',
      primaryColor: '#2563EB',
      accentColor: '#10B981',
      backgroundColor: '#F9FAFB',
      cardBackgroundColor: '#FFFFFF',
      textColor: '#111827',
      secondaryTextColor: '#6B7280',
      borderRadius: 12,
      useShadows: true,
      fontScale: 1.0,
    };
  }

  getLayout(layoutId: string): MobileDashboardLayout | null {
    return this.layouts.get(layoutId) || null;
  }

  getUserLayouts(userId: string): MobileDashboardLayout[] {
    const layoutIds = this.userLayouts.get(userId);
    if (!layoutIds) return [];

    return Array.from(layoutIds)
      .map((id) => this.layouts.get(id))
      .filter((layout): layout is MobileDashboardLayout => layout !== undefined);
  }

  getLayoutForDevice(userId: string, deviceType: DeviceType, orientation: ScreenOrientation): MobileDashboardLayout | null {
    const layouts = this.getUserLayouts(userId);
    return layouts.find(
      (l) => l.deviceType === deviceType && l.orientation === orientation,
    ) || layouts.find((l) => l.deviceType === deviceType) || null;
  }

  updateLayout(layoutId: string, updates: Partial<MobileDashboardLayout>): MobileDashboardLayout | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const updated = {
      ...layout,
      ...updates,
      id: layout.id, // Cannot change ID
      createdAt: layout.createdAt,
      updatedAt: new Date(),
    };

    this.layouts.set(layoutId, updated);
    return updated;
  }

  deleteLayout(layoutId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    this.layouts.delete(layoutId);
    this.userLayouts.get(layout.userId)?.delete(layoutId);
    return true;
  }

  setDefaultLayout(userId: string, layoutId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout || layout.userId !== userId) return false;

    // Clear other defaults for this user/device/orientation combo
    const userLayouts = this.getUserLayouts(userId);
    userLayouts.forEach((l) => {
      if (l.deviceType === layout.deviceType && l.orientation === layout.orientation && l.id !== layoutId) {
        l.isDefault = false;
        this.layouts.set(l.id, l);
      }
    });

    layout.isDefault = true;
    this.layouts.set(layoutId, layout);
    return true;
  }

  // ============================================================================
  // WIDGET MANAGEMENT
  // ============================================================================

  addWidget(layoutId: string, widget: Omit<MobileWidget, 'id'>): MobileWidget | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const newWidget: MobileWidget = {
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    layout.widgets.push(newWidget);
    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);

    return newWidget;
  }

  updateWidget(layoutId: string, widgetId: string, updates: Partial<MobileWidget>): MobileWidget | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const widgetIndex = layout.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIndex === -1) return null;

    layout.widgets[widgetIndex] = {
      ...layout.widgets[widgetIndex],
      ...updates,
      id: widgetId, // Cannot change ID
    };
    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);

    return layout.widgets[widgetIndex];
  }

  removeWidget(layoutId: string, widgetId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const initialLength = layout.widgets.length;
    layout.widgets = layout.widgets.filter((w) => w.id !== widgetId);

    if (layout.widgets.length === initialLength) return false;

    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);
    return true;
  }

  reorderWidgets(layoutId: string, widgetIds: string[]): MobileDashboardLayout | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const widgetMap = new Map(layout.widgets.map((w) => [w.id, w]));
    layout.widgets = widgetIds
      .map((id, index) => {
        const widget = widgetMap.get(id);
        if (widget) {
          widget.order = index;
          return widget;
        }
        return null;
      })
      .filter((w): w is MobileWidget => w !== null);

    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);
    return layout;
  }

  toggleWidgetCollapse(layoutId: string, widgetId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const widget = layout.widgets.find((w) => w.id === widgetId);
    if (!widget || !widget.isCollapsible) return false;

    widget.isCollapsed = !widget.isCollapsed;
    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);
    return true;
  }

  // ============================================================================
  // PRESETS
  // ============================================================================

  listPresets(category?: MobileDashboardPreset['category']): MobileDashboardPreset[] {
    const presets = Array.from(this.presets.values());
    return category ? presets.filter((p) => p.category === category) : presets;
  }

  getPreset(presetId: string): MobileDashboardPreset | null {
    return this.presets.get(presetId) || null;
  }

  applyPreset(layoutId: string, presetId: string): MobileDashboardLayout | null {
    const layout = this.layouts.get(layoutId);
    const preset = this.presets.get(presetId);
    if (!layout || !preset) return null;

    layout.widgets = preset.widgets.map((w, i) => ({
      ...w,
      id: `widget-${Date.now()}-${i}`,
      data: undefined,
    }));
    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);

    return layout;
  }

  // ============================================================================
  // OFFLINE CACHING
  // ============================================================================

  cacheData(key: string, data: any, ttlSeconds: number = 3600): CachedData {
    const cached: CachedData = {
      key,
      data,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      size: JSON.stringify(data).length,
      version: (this.cache.get(key)?.version || 0) + 1,
    };

    this.cache.set(key, cached);
    return cached;
  }

  getCachedData(key: string): { data: any; isStale: boolean } | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    return {
      data: cached.data,
      isStale: new Date() > cached.expiresAt,
    };
  }

  invalidateCache(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateCacheByPattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let invalidated = 0;

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    });

    return invalidated;
  }

  getCacheStats(): { totalItems: number; totalSize: number; staleItems: number } {
    const now = new Date();
    let totalSize = 0;
    let staleItems = 0;

    this.cache.forEach((cached) => {
      totalSize += cached.size;
      if (now > cached.expiresAt) staleItems++;
    });

    return {
      totalItems: this.cache.size,
      totalSize,
      staleItems,
    };
  }

  cleanupExpiredCache(): number {
    const now = new Date();
    let cleaned = 0;

    this.cache.forEach((cached, key) => {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    return cleaned;
  }

  // ============================================================================
  // SYNC STATUS
  // ============================================================================

  getSyncStatus(userId: string): SyncStatus {
    return this.syncStatus.get(userId) || {
      lastSyncAt: new Date(0),
      pendingChanges: 0,
      syncInProgress: false,
      errors: [],
    };
  }

  updateSyncStatus(userId: string, updates: Partial<SyncStatus>): SyncStatus {
    const current = this.getSyncStatus(userId);
    const updated = { ...current, ...updates };
    this.syncStatus.set(userId, updated);
    return updated;
  }

  addPendingChange(userId: string): number {
    const status = this.getSyncStatus(userId);
    status.pendingChanges++;
    this.syncStatus.set(userId, status);
    return status.pendingChanges;
  }

  markSyncComplete(userId: string): SyncStatus {
    return this.updateSyncStatus(userId, {
      lastSyncAt: new Date(),
      pendingChanges: 0,
      syncInProgress: false,
      errors: [],
    });
  }

  addSyncError(userId: string, key: string, error: string): void {
    const status = this.getSyncStatus(userId);
    const existingError = status.errors.find((e) => e.key === key);

    if (existingError) {
      existingError.retryCount++;
      existingError.error = error;
      existingError.timestamp = new Date();
    } else {
      status.errors.push({
        key,
        error,
        timestamp: new Date(),
        retryCount: 1,
      });
    }

    this.syncStatus.set(userId, status);
  }

  // ============================================================================
  // THEME MANAGEMENT
  // ============================================================================

  updateTheme(layoutId: string, theme: Partial<MobileTheme>): MobileDashboardLayout | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    layout.theme = { ...layout.theme, ...theme };
    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);

    return layout;
  }

  getThemeForDevice(deviceInfo: DeviceInfo): MobileTheme {
    const baseTheme = this.getDefaultTheme();

    // Adjust for device characteristics
    if (deviceInfo.screenWidth < 375) {
      baseTheme.fontScale = 0.9;
      baseTheme.borderRadius = 8;
    } else if (deviceInfo.screenWidth > 768) {
      baseTheme.fontScale = 1.1;
      baseTheme.borderRadius = 16;
    }

    // Adjust for connection type
    if (deviceInfo.connectionType === 'cellular' || deviceInfo.connectionType === 'offline') {
      baseTheme.useShadows = false; // Save rendering power
    }

    return baseTheme;
  }

  // ============================================================================
  // NAVIGATION CONFIGURATION
  // ============================================================================

  updateNavigation(layoutId: string, config: Partial<MobileNavigationConfig>): MobileDashboardLayout | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    layout.navigationConfig = { ...layout.navigationConfig, ...config };
    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);

    return layout;
  }

  updateNavigationItem(layoutId: string, itemId: string, updates: Partial<NavigationItem>): NavigationItem | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const item = layout.navigationConfig.items.find((i) => i.id === itemId);
    if (!item) return null;

    Object.assign(item, updates);
    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);

    return item;
  }

  reorderNavigation(layoutId: string, itemIds: string[]): MobileDashboardLayout | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const itemMap = new Map(layout.navigationConfig.items.map((i) => [i.id, i]));
    layout.navigationConfig.items = itemIds
      .map((id) => itemMap.get(id))
      .filter((i): i is NavigationItem => i !== undefined);

    layout.updatedAt = new Date();
    this.layouts.set(layoutId, layout);

    return layout;
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  startSession(userId: string, deviceInfo: DeviceInfo): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const analytics: MobileAnalytics = {
      sessionId,
      userId,
      deviceInfo,
      screenViews: [],
      interactions: [],
      performance: {
        appStartTime: Date.now(),
        timeToInteractive: 0,
        frameRate: 60,
        memoryUsage: 0,
        networkLatency: 0,
      },
    };

    this.analytics.set(sessionId, analytics);
    return sessionId;
  }

  trackScreenView(sessionId: string, screen: string): void {
    const analytics = this.analytics.get(sessionId);
    if (!analytics) return;

    // End previous screen view
    if (analytics.screenViews.length > 0) {
      const lastView = analytics.screenViews[analytics.screenViews.length - 1];
      if (!lastView.duration) {
        lastView.duration = Date.now() - lastView.timestamp.getTime();
      }
    }

    analytics.screenViews.push({
      screen,
      timestamp: new Date(),
    });
  }

  trackInteraction(sessionId: string, interaction: Omit<Interaction, 'timestamp'>): void {
    const analytics = this.analytics.get(sessionId);
    if (!analytics) return;

    analytics.interactions.push({
      ...interaction,
      timestamp: new Date(),
    });
  }

  updatePerformanceMetrics(sessionId: string, metrics: Partial<PerformanceMetrics>): void {
    const analytics = this.analytics.get(sessionId);
    if (!analytics) return;

    analytics.performance = { ...analytics.performance, ...metrics };
  }

  getSessionAnalytics(sessionId: string): MobileAnalytics | null {
    return this.analytics.get(sessionId) || null;
  }

  endSession(sessionId: string): MobileAnalytics | null {
    const analytics = this.analytics.get(sessionId);
    if (!analytics) return null;

    // Finalize last screen view
    if (analytics.screenViews.length > 0) {
      const lastView = analytics.screenViews[analytics.screenViews.length - 1];
      if (!lastView.duration) {
        lastView.duration = Date.now() - lastView.timestamp.getTime();
      }
    }

    // Don't delete - keep for reporting
    return analytics;
  }

  // ============================================================================
  // RESPONSIVE HELPERS
  // ============================================================================

  getOptimalWidgetLayout(deviceInfo: DeviceInfo, widgets: MobileWidget[]): MobileWidget[] {
    const { screenWidth, orientation } = deviceInfo;
    const isSmallScreen = screenWidth < 375;
    const isLargeScreen = screenWidth >= 768;

    return widgets.map((widget) => {
      const optimized = { ...widget };

      // Adjust widget sizes based on screen
      if (isSmallScreen) {
        if (widget.size === 'medium') optimized.size = 'full';
        if (widget.size === 'small') optimized.size = 'medium';
      } else if (isLargeScreen && orientation === 'landscape') {
        if (widget.size === 'full') optimized.size = 'large';
      }

      // Collapse less important widgets on small screens
      if (isSmallScreen && widget.isCollapsible && widget.order > 3) {
        optimized.isCollapsed = true;
      }

      return optimized;
    });
  }

  getRecommendedRefreshStrategy(connectionType: DeviceInfo['connectionType']): RefreshStrategy {
    switch (connectionType) {
      case 'wifi':
      case '5g':
        return 'realtime';
      case '4g':
        return 'pull_to_refresh';
      case 'cellular':
        return 'interval';
      case 'offline':
        return 'manual';
      default:
        return 'pull_to_refresh';
    }
  }

  // ============================================================================
  // QUICK ACTIONS
  // ============================================================================

  executeQuickAction(layoutId: string, widgetId: string, actionId: string): { success: boolean; result?: any; error?: string } {
    const layout = this.layouts.get(layoutId);
    if (!layout) return { success: false, error: 'Layout not found' };

    const widget = layout.widgets.find((w) => w.id === widgetId);
    if (!widget) return { success: false, error: 'Widget not found' };

    const action = widget.quickActions?.find((a) => a.id === actionId);
    if (!action) return { success: false, error: 'Action not found' };

    // Simulate action execution
    this.logger.log(`Executing quick action: ${action.action} for widget ${widgetId}`);
    return { success: true, result: { action: action.action, params: action.params } };
  }

  // ============================================================================
  // WIDGET DATA REFRESH
  // ============================================================================

  async refreshWidgetData(layoutId: string, widgetId: string): Promise<MobileWidget | null> {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const widget = layout.widgets.find((w) => w.id === widgetId);
    if (!widget) return null;

    // Simulate data refresh based on widget type
    widget.data = await this.getWidgetData(widget);
    widget.lastRefreshed = new Date();
    this.layouts.set(layoutId, layout);

    return widget;
  }

  private async getWidgetData(widget: MobileWidget): Promise<any> {
    // Simulate fetching data based on widget type
    switch (widget.type) {
      case 'kpi_card':
        return { value: Math.floor(Math.random() * 100000), trend: Math.random() > 0.5 ? 'up' : 'down' };
      case 'mini_chart':
      case 'chart_sparkline':
        return { points: Array.from({ length: 7 }, () => Math.floor(Math.random() * 1000)) };
      case 'progress_ring':
        return { current: Math.floor(Math.random() * 100), target: 100 };
      case 'list_preview':
        return { items: Array.from({ length: 5 }, (_, i) => ({ id: i, title: `Item ${i + 1}` })) };
      default:
        return {};
    }
  }

  async refreshAllWidgets(layoutId: string): Promise<MobileDashboardLayout | null> {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    for (const widget of layout.widgets) {
      if (widget.isVisible && !widget.isCollapsed) {
        widget.data = await this.getWidgetData(widget);
        widget.lastRefreshed = new Date();
      }
    }

    this.layouts.set(layoutId, layout);
    return layout;
  }
}
