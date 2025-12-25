import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

export type KPICategory = 'FINANCIAL' | 'OPERATIONAL' | 'HR' | 'SALES' | 'COMPLIANCE' | 'CUSTOMER' | 'INVENTORY' | 'LOGISTICS';
export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type DashboardPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';
export type ChartType = 'LINE' | 'BAR' | 'PIE' | 'DONUT' | 'AREA' | 'GAUGE' | 'SPARKLINE' | 'HEATMAP';

export interface KPIDefinition {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: KPICategory;
  unit: string;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  higherIsBetter: boolean;
  formula?: string;
  dataSource: string;
  refreshIntervalMs: number;
}

export interface KPIValue {
  kpiId: string;
  value: number;
  previousValue?: number;
  targetValue?: number;
  trend: TrendDirection;
  trendPercentage: number;
  timestamp: Date;
  status: 'ON_TARGET' | 'WARNING' | 'CRITICAL' | 'NO_TARGET';
}

export interface KPIHistory {
  kpiId: string;
  values: { timestamp: Date; value: number }[];
  period: DashboardPeriod;
  startDate: Date;
  endDate: Date;
}

export interface DashboardWidget {
  id: string;
  name: string;
  nameRo: string;
  type: ChartType | 'KPI_CARD' | 'TABLE' | 'ALERT_LIST' | 'TIMELINE';
  kpiIds?: string[];
  config: Record<string, any>;
  position: { row: number; col: number };
  size: { width: number; height: number };
}

export interface Dashboard {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  ownerId: string;
  tenantId?: string;
  isDefault: boolean;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  refreshIntervalMs: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'DATE_RANGE' | 'SELECT' | 'MULTI_SELECT' | 'SEARCH';
  field: string;
  defaultValue?: any;
  options?: { label: string; value: any }[];
}

export interface ExecutiveAlert {
  id: string;
  kpiId: string;
  kpiName: string;
  severity: AlertSeverity;
  message: string;
  messageRo: string;
  value: number;
  threshold: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface FinancialSnapshot {
  revenue: number;
  revenueChange: number;
  expenses: number;
  expensesChange: number;
  profit: number;
  profitMargin: number;
  cashFlow: number;
  accountsReceivable: number;
  accountsPayable: number;
  vatCollected: number;
  vatPaid: number;
  vatBalance: number;
}

export interface OperationalSnapshot {
  ordersToday: number;
  ordersCompleted: number;
  ordersPending: number;
  averageOrderValue: number;
  inventoryTurnover: number;
  stockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  deliveriesOnTime: number;
  deliveriesDelayed: number;
}

export interface HRSnapshot {
  totalEmployees: number;
  newHires: number;
  terminations: number;
  turnoverRate: number;
  averageTenure: number;
  openPositions: number;
  trainingHours: number;
  employeeSatisfaction: number;
  payrollTotal: number;
  overtimeHours: number;
}

export interface ComplianceSnapshot {
  anafSubmissionsDue: number;
  anafSubmissionsCompleted: number;
  anafSubmissionsPending: number;
  lastEfacturaSubmission?: Date;
  lastSaftSubmission?: Date;
  auditAlerts: number;
  gdprRequests: number;
  complianceScore: number;
}

export interface ExecutiveReport {
  id: string;
  name: string;
  nameRo: string;
  period: DashboardPeriod;
  startDate: Date;
  endDate: Date;
  financial: FinancialSnapshot;
  operational: OperationalSnapshot;
  hr: HRSnapshot;
  compliance: ComplianceSnapshot;
  kpis: KPIValue[];
  alerts: ExecutiveAlert[];
  insights: string[];
  insightsRo: string[];
  generatedAt: Date;
}

@Injectable()
export class ExecutiveDashboardService {
  private kpis: Map<string, KPIDefinition> = new Map();
  private kpiValues: Map<string, KPIValue> = new Map();
  private kpiHistory: Map<string, KPIHistory> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private alerts: Map<string, ExecutiveAlert> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultKPIs();
  }

  private initializeDefaultKPIs(): void {
    const defaultKPIs: KPIDefinition[] = [
      // Financial KPIs
      {
        id: 'kpi-revenue',
        name: 'Total Revenue',
        nameRo: 'Venituri Totale',
        description: 'Total revenue for the period',
        descriptionRo: 'Venitul total pentru perioadă',
        category: 'FINANCIAL',
        unit: 'RON',
        higherIsBetter: true,
        dataSource: 'invoices',
        refreshIntervalMs: 300000,
      },
      {
        id: 'kpi-profit-margin',
        name: 'Profit Margin',
        nameRo: 'Marjă de Profit',
        description: 'Net profit as percentage of revenue',
        descriptionRo: 'Profitul net ca procent din venituri',
        category: 'FINANCIAL',
        unit: '%',
        targetValue: 15,
        warningThreshold: 10,
        criticalThreshold: 5,
        higherIsBetter: true,
        formula: '(revenue - expenses) / revenue * 100',
        dataSource: 'financial',
        refreshIntervalMs: 300000,
      },
      {
        id: 'kpi-cash-flow',
        name: 'Cash Flow',
        nameRo: 'Flux de Numerar',
        description: 'Net cash flow for the period',
        descriptionRo: 'Fluxul net de numerar pentru perioadă',
        category: 'FINANCIAL',
        unit: 'RON',
        higherIsBetter: true,
        dataSource: 'treasury',
        refreshIntervalMs: 300000,
      },
      {
        id: 'kpi-dso',
        name: 'Days Sales Outstanding',
        nameRo: 'Zile Creanțe',
        description: 'Average days to collect receivables',
        descriptionRo: 'Media zilelor pentru încasarea creanțelor',
        category: 'FINANCIAL',
        unit: 'days',
        targetValue: 30,
        warningThreshold: 45,
        criticalThreshold: 60,
        higherIsBetter: false,
        dataSource: 'receivables',
        refreshIntervalMs: 3600000,
      },
      // Operational KPIs
      {
        id: 'kpi-orders-today',
        name: 'Orders Today',
        nameRo: 'Comenzi Astăzi',
        description: 'Number of orders placed today',
        descriptionRo: 'Numărul de comenzi plasate astăzi',
        category: 'OPERATIONAL',
        unit: 'orders',
        higherIsBetter: true,
        dataSource: 'orders',
        refreshIntervalMs: 60000,
      },
      {
        id: 'kpi-order-fulfillment',
        name: 'Order Fulfillment Rate',
        nameRo: 'Rata de Onorare Comenzi',
        description: 'Percentage of orders fulfilled on time',
        descriptionRo: 'Procentul de comenzi onorate la timp',
        category: 'OPERATIONAL',
        unit: '%',
        targetValue: 95,
        warningThreshold: 90,
        criticalThreshold: 85,
        higherIsBetter: true,
        dataSource: 'orders',
        refreshIntervalMs: 300000,
      },
      {
        id: 'kpi-inventory-turnover',
        name: 'Inventory Turnover',
        nameRo: 'Rotație Stoc',
        description: 'How many times inventory is sold per period',
        descriptionRo: 'De câte ori este vândut stocul într-o perioadă',
        category: 'INVENTORY',
        unit: 'times',
        targetValue: 12,
        warningThreshold: 8,
        criticalThreshold: 4,
        higherIsBetter: true,
        dataSource: 'inventory',
        refreshIntervalMs: 3600000,
      },
      // HR KPIs
      {
        id: 'kpi-employee-count',
        name: 'Total Employees',
        nameRo: 'Total Angajați',
        description: 'Current number of employees',
        descriptionRo: 'Numărul curent de angajați',
        category: 'HR',
        unit: 'employees',
        higherIsBetter: true,
        dataSource: 'hr',
        refreshIntervalMs: 3600000,
      },
      {
        id: 'kpi-turnover-rate',
        name: 'Employee Turnover Rate',
        nameRo: 'Rata Fluctuație Personal',
        description: 'Annual employee turnover percentage',
        descriptionRo: 'Procentul anual de fluctuație a personalului',
        category: 'HR',
        unit: '%',
        targetValue: 10,
        warningThreshold: 15,
        criticalThreshold: 25,
        higherIsBetter: false,
        dataSource: 'hr',
        refreshIntervalMs: 86400000,
      },
      {
        id: 'kpi-employee-satisfaction',
        name: 'Employee Satisfaction',
        nameRo: 'Satisfacție Angajați',
        description: 'Average employee satisfaction score',
        descriptionRo: 'Scorul mediu de satisfacție a angajaților',
        category: 'HR',
        unit: '/10',
        targetValue: 8,
        warningThreshold: 6,
        criticalThreshold: 5,
        higherIsBetter: true,
        dataSource: 'surveys',
        refreshIntervalMs: 86400000,
      },
      // Compliance KPIs
      {
        id: 'kpi-compliance-score',
        name: 'Compliance Score',
        nameRo: 'Scor Conformitate',
        description: 'Overall compliance health score',
        descriptionRo: 'Scorul general de sănătate a conformității',
        category: 'COMPLIANCE',
        unit: '%',
        targetValue: 100,
        warningThreshold: 90,
        criticalThreshold: 80,
        higherIsBetter: true,
        dataSource: 'compliance',
        refreshIntervalMs: 3600000,
      },
      {
        id: 'kpi-anaf-pending',
        name: 'ANAF Submissions Pending',
        nameRo: 'Depuneri ANAF În Așteptare',
        description: 'Number of pending ANAF submissions',
        descriptionRo: 'Numărul de depuneri ANAF în așteptare',
        category: 'COMPLIANCE',
        unit: 'submissions',
        targetValue: 0,
        warningThreshold: 3,
        criticalThreshold: 5,
        higherIsBetter: false,
        dataSource: 'anaf',
        refreshIntervalMs: 300000,
      },
      // Customer KPIs
      {
        id: 'kpi-customer-satisfaction',
        name: 'Customer Satisfaction',
        nameRo: 'Satisfacție Clienți',
        description: 'Average customer satisfaction score',
        descriptionRo: 'Scorul mediu de satisfacție a clienților',
        category: 'CUSTOMER',
        unit: '/5',
        targetValue: 4.5,
        warningThreshold: 4,
        criticalThreshold: 3.5,
        higherIsBetter: true,
        dataSource: 'feedback',
        refreshIntervalMs: 3600000,
      },
      {
        id: 'kpi-nps',
        name: 'Net Promoter Score',
        nameRo: 'Scor NPS',
        description: 'Net Promoter Score',
        descriptionRo: 'Scorul Net Promoter',
        category: 'CUSTOMER',
        unit: 'score',
        targetValue: 50,
        warningThreshold: 30,
        criticalThreshold: 0,
        higherIsBetter: true,
        dataSource: 'surveys',
        refreshIntervalMs: 86400000,
      },
      // Logistics KPIs
      {
        id: 'kpi-delivery-on-time',
        name: 'On-Time Delivery Rate',
        nameRo: 'Rata Livrări La Timp',
        description: 'Percentage of deliveries completed on time',
        descriptionRo: 'Procentul de livrări finalizate la timp',
        category: 'LOGISTICS',
        unit: '%',
        targetValue: 95,
        warningThreshold: 90,
        criticalThreshold: 85,
        higherIsBetter: true,
        dataSource: 'deliveries',
        refreshIntervalMs: 300000,
      },
    ];

    defaultKPIs.forEach(kpi => this.kpis.set(kpi.id, kpi));

    // Initialize with sample values
    this.refreshAllKPIs();
  }

  private refreshAllKPIs(): void {
    for (const kpi of this.kpis.values()) {
      this.refreshKPI(kpi.id);
    }
  }

  private refreshKPI(kpiId: string): void {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return;

    // Simulate fetching data from data sources
    const value = this.generateKPIValue(kpi);
    this.kpiValues.set(kpiId, value);

    // Check thresholds and generate alerts
    this.checkThresholds(kpi, value);
  }

  private generateKPIValue(kpi: KPIDefinition): KPIValue {
    const previousValue = this.kpiValues.get(kpi.id)?.value;
    let value: number;

    // Generate realistic sample values based on KPI type
    switch (kpi.id) {
      case 'kpi-revenue':
        value = 1500000 + Math.random() * 500000;
        break;
      case 'kpi-profit-margin':
        value = 12 + Math.random() * 8;
        break;
      case 'kpi-cash-flow':
        value = 200000 + Math.random() * 100000;
        break;
      case 'kpi-dso':
        value = 25 + Math.random() * 20;
        break;
      case 'kpi-orders-today':
        value = Math.floor(50 + Math.random() * 100);
        break;
      case 'kpi-order-fulfillment':
        value = 90 + Math.random() * 10;
        break;
      case 'kpi-inventory-turnover':
        value = 8 + Math.random() * 8;
        break;
      case 'kpi-employee-count':
        value = Math.floor(100 + Math.random() * 50);
        break;
      case 'kpi-turnover-rate':
        value = 5 + Math.random() * 15;
        break;
      case 'kpi-employee-satisfaction':
        value = 6 + Math.random() * 4;
        break;
      case 'kpi-compliance-score':
        value = 85 + Math.random() * 15;
        break;
      case 'kpi-anaf-pending':
        value = Math.floor(Math.random() * 5);
        break;
      case 'kpi-customer-satisfaction':
        value = 3.5 + Math.random() * 1.5;
        break;
      case 'kpi-nps':
        value = 30 + Math.random() * 40;
        break;
      case 'kpi-delivery-on-time':
        value = 88 + Math.random() * 12;
        break;
      default:
        value = Math.random() * 100;
    }

    const trendPercentage = previousValue
      ? ((value - previousValue) / previousValue) * 100
      : 0;

    let trend: TrendDirection = 'STABLE';
    if (Math.abs(trendPercentage) > 1) {
      trend = trendPercentage > 0 ? 'UP' : 'DOWN';
    }

    let status: KPIValue['status'] = 'NO_TARGET';
    if (kpi.targetValue !== undefined) {
      if (kpi.higherIsBetter) {
        if (kpi.criticalThreshold && value < kpi.criticalThreshold) {
          status = 'CRITICAL';
        } else if (kpi.warningThreshold && value < kpi.warningThreshold) {
          status = 'WARNING';
        } else if (value >= kpi.targetValue) {
          status = 'ON_TARGET';
        } else {
          status = 'WARNING';
        }
      } else {
        if (kpi.criticalThreshold && value > kpi.criticalThreshold) {
          status = 'CRITICAL';
        } else if (kpi.warningThreshold && value > kpi.warningThreshold) {
          status = 'WARNING';
        } else if (value <= kpi.targetValue) {
          status = 'ON_TARGET';
        } else {
          status = 'WARNING';
        }
      }
    }

    return {
      kpiId: kpi.id,
      value,
      previousValue,
      targetValue: kpi.targetValue,
      trend,
      trendPercentage,
      timestamp: new Date(),
      status,
    };
  }

  private checkThresholds(kpi: KPIDefinition, value: KPIValue): void {
    if (value.status === 'CRITICAL' || value.status === 'WARNING') {
      const severity: AlertSeverity = value.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
      const threshold = value.status === 'CRITICAL' ? kpi.criticalThreshold! : kpi.warningThreshold!;

      const alert: ExecutiveAlert = {
        id: `alert-${randomUUID()}`,
        kpiId: kpi.id,
        kpiName: kpi.name,
        severity,
        message: `${kpi.name} is ${value.value.toFixed(2)} ${kpi.unit}, ${kpi.higherIsBetter ? 'below' : 'above'} threshold of ${threshold} ${kpi.unit}`,
        messageRo: `${kpi.nameRo} este ${value.value.toFixed(2)} ${kpi.unit}, ${kpi.higherIsBetter ? 'sub' : 'peste'} pragul de ${threshold} ${kpi.unit}`,
        value: value.value,
        threshold,
        triggeredAt: new Date(),
        resolved: false,
      };

      this.alerts.set(alert.id, alert);

      this.eventEmitter.emit('dashboard.alert.triggered', {
        alertId: alert.id,
        kpiId: kpi.id,
        severity,
      });
    }
  }

  // KPI Management
  getKPIs(category?: KPICategory): KPIDefinition[] {
    let kpis = Array.from(this.kpis.values());

    if (category) {
      kpis = kpis.filter(k => k.category === category);
    }

    return kpis;
  }

  getKPI(kpiId: string): KPIDefinition | undefined {
    return this.kpis.get(kpiId);
  }

  createKPI(data: Omit<KPIDefinition, 'id'>): KPIDefinition {
    const kpi: KPIDefinition = {
      ...data,
      id: `kpi-${randomUUID()}`,
    };

    this.kpis.set(kpi.id, kpi);
    this.refreshKPI(kpi.id);

    this.eventEmitter.emit('dashboard.kpi.created', { kpiId: kpi.id });

    return kpi;
  }

  updateKPI(kpiId: string, updates: Partial<KPIDefinition>): KPIDefinition {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      throw new NotFoundException(`KPI ${kpiId} not found`);
    }

    const updatedKPI = { ...kpi, ...updates, id: kpiId };
    this.kpis.set(kpiId, updatedKPI);

    this.eventEmitter.emit('dashboard.kpi.updated', { kpiId });

    return updatedKPI;
  }

  deleteKPI(kpiId: string): void {
    if (!this.kpis.has(kpiId)) {
      throw new NotFoundException(`KPI ${kpiId} not found`);
    }

    this.kpis.delete(kpiId);
    this.kpiValues.delete(kpiId);
    this.kpiHistory.delete(kpiId);

    this.eventEmitter.emit('dashboard.kpi.deleted', { kpiId });
  }

  // KPI Values
  getKPIValue(kpiId: string): KPIValue | undefined {
    return this.kpiValues.get(kpiId);
  }

  getAllKPIValues(category?: KPICategory): KPIValue[] {
    if (category) {
      const categoryKPIs = this.getKPIs(category);
      return categoryKPIs
        .map(k => this.kpiValues.get(k.id))
        .filter((v): v is KPIValue => v !== undefined);
    }

    return Array.from(this.kpiValues.values());
  }

  refreshKPIValue(kpiId: string): KPIValue {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      throw new NotFoundException(`KPI ${kpiId} not found`);
    }

    this.refreshKPI(kpiId);
    return this.kpiValues.get(kpiId)!;
  }

  getKPIHistory(kpiId: string, period: DashboardPeriod = 'MONTH'): KPIHistory {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      throw new NotFoundException(`KPI ${kpiId} not found`);
    }

    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'DAY':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'WEEK':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'MONTH':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'QUARTER':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'YEAR':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Generate sample historical data
    const values: { timestamp: Date; value: number }[] = [];
    const points = period === 'DAY' ? 24 : period === 'WEEK' ? 7 : period === 'MONTH' ? 30 : period === 'QUARTER' ? 90 : 365;

    const currentValue = this.kpiValues.get(kpiId)?.value || 50;
    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * (now.getTime() - startDate.getTime()) / points));
      const variance = (Math.random() - 0.5) * currentValue * 0.2;
      values.push({
        timestamp,
        value: Math.max(0, currentValue + variance),
      });
    }

    return {
      kpiId,
      values,
      period,
      startDate,
      endDate: now,
    };
  }

  // Dashboard Management
  createDashboard(data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
    const dashboard: Dashboard = {
      ...data,
      id: `dash-${randomUUID()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(dashboard.id, dashboard);

    this.eventEmitter.emit('dashboard.created', { dashboardId: dashboard.id });

    return dashboard;
  }

  getDashboard(dashboardId: string): Dashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  getAllDashboards(ownerId?: string, tenantId?: string): Dashboard[] {
    let dashboards = Array.from(this.dashboards.values());

    if (ownerId) {
      dashboards = dashboards.filter(d => d.ownerId === ownerId);
    }
    if (tenantId) {
      dashboards = dashboards.filter(d => d.tenantId === tenantId);
    }

    return dashboards;
  }

  updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Dashboard {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    const updatedDashboard = {
      ...dashboard,
      ...updates,
      id: dashboardId,
      updatedAt: new Date(),
    };

    this.dashboards.set(dashboardId, updatedDashboard);

    this.eventEmitter.emit('dashboard.updated', { dashboardId });

    return updatedDashboard;
  }

  deleteDashboard(dashboardId: string): void {
    if (!this.dashboards.has(dashboardId)) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    this.dashboards.delete(dashboardId);

    this.eventEmitter.emit('dashboard.deleted', { dashboardId });
  }

  addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): Dashboard {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${randomUUID()}`,
    };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date();

    this.eventEmitter.emit('dashboard.widget.added', { dashboardId, widgetId: newWidget.id });

    return dashboard;
  }

  removeWidget(dashboardId: string, widgetId: string): Dashboard {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) {
      throw new NotFoundException(`Widget ${widgetId} not found`);
    }

    dashboard.widgets.splice(widgetIndex, 1);
    dashboard.updatedAt = new Date();

    this.eventEmitter.emit('dashboard.widget.removed', { dashboardId, widgetId });

    return dashboard;
  }

  updateWidgetPosition(dashboardId: string, widgetId: string, position: { row: number; col: number }): Dashboard {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) {
      throw new NotFoundException(`Widget ${widgetId} not found`);
    }

    widget.position = position;
    dashboard.updatedAt = new Date();

    return dashboard;
  }

  // Alerts
  getAlerts(unresolved?: boolean): ExecutiveAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (unresolved !== undefined) {
      alerts = alerts.filter(a => a.resolved !== unresolved);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.triggeredAt.getTime() - a.triggeredAt.getTime();
    });
  }

  acknowledgeAlert(alertId: string, userId: string): ExecutiveAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    this.eventEmitter.emit('dashboard.alert.acknowledged', { alertId, userId });

    return alert;
  }

  resolveAlert(alertId: string): ExecutiveAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.eventEmitter.emit('dashboard.alert.resolved', { alertId });

    return alert;
  }

  // Snapshots
  getFinancialSnapshot(): FinancialSnapshot {
    const revenue = 1500000 + Math.random() * 500000;
    const expenses = revenue * (0.7 + Math.random() * 0.15);
    const profit = revenue - expenses;

    return {
      revenue,
      revenueChange: (Math.random() - 0.5) * 20,
      expenses,
      expensesChange: (Math.random() - 0.5) * 15,
      profit,
      profitMargin: (profit / revenue) * 100,
      cashFlow: 200000 + Math.random() * 100000,
      accountsReceivable: 350000 + Math.random() * 100000,
      accountsPayable: 280000 + Math.random() * 80000,
      vatCollected: revenue * 0.21, // Legea 141/2025: 21% standard VAT from Aug 2025
      vatPaid: expenses * 0.21 * 0.7,
      vatBalance: revenue * 0.21 - expenses * 0.21 * 0.7,
    };
  }

  getOperationalSnapshot(): OperationalSnapshot {
    const ordersToday = Math.floor(50 + Math.random() * 100);
    const ordersCompleted = Math.floor(ordersToday * (0.7 + Math.random() * 0.3));

    return {
      ordersToday,
      ordersCompleted,
      ordersPending: ordersToday - ordersCompleted,
      averageOrderValue: 500 + Math.random() * 300,
      inventoryTurnover: 8 + Math.random() * 8,
      stockValue: 800000 + Math.random() * 200000,
      lowStockItems: Math.floor(Math.random() * 20),
      outOfStockItems: Math.floor(Math.random() * 5),
      deliveriesOnTime: Math.floor(ordersCompleted * (0.9 + Math.random() * 0.1)),
      deliveriesDelayed: Math.floor(ordersCompleted * Math.random() * 0.1),
    };
  }

  getHRSnapshot(): HRSnapshot {
    const totalEmployees = Math.floor(100 + Math.random() * 50);

    return {
      totalEmployees,
      newHires: Math.floor(Math.random() * 10),
      terminations: Math.floor(Math.random() * 5),
      turnoverRate: 5 + Math.random() * 15,
      averageTenure: 2 + Math.random() * 5,
      openPositions: Math.floor(Math.random() * 15),
      trainingHours: Math.floor(totalEmployees * (10 + Math.random() * 20)),
      employeeSatisfaction: 6 + Math.random() * 4,
      payrollTotal: totalEmployees * (5000 + Math.random() * 3000),
      overtimeHours: Math.floor(totalEmployees * Math.random() * 10),
    };
  }

  getComplianceSnapshot(): ComplianceSnapshot {
    return {
      anafSubmissionsDue: Math.floor(Math.random() * 10),
      anafSubmissionsCompleted: Math.floor(5 + Math.random() * 10),
      anafSubmissionsPending: Math.floor(Math.random() * 5),
      lastEfacturaSubmission: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      lastSaftSubmission: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      auditAlerts: Math.floor(Math.random() * 5),
      gdprRequests: Math.floor(Math.random() * 10),
      complianceScore: 85 + Math.random() * 15,
    };
  }

  // Executive Report
  generateExecutiveReport(period: DashboardPeriod = 'MONTH'): ExecutiveReport {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'DAY':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'WEEK':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'MONTH':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'QUARTER':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'YEAR':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const financial = this.getFinancialSnapshot();
    const operational = this.getOperationalSnapshot();
    const hr = this.getHRSnapshot();
    const compliance = this.getComplianceSnapshot();

    const insights: string[] = [];
    const insightsRo: string[] = [];

    // Generate insights based on data
    if (financial.profitMargin > 15) {
      insights.push('Profit margin is performing above target');
      insightsRo.push('Marja de profit este peste obiectiv');
    } else if (financial.profitMargin < 10) {
      insights.push('Profit margin needs attention - consider cost optimization');
      insightsRo.push('Marja de profit necesită atenție - luați în considerare optimizarea costurilor');
    }

    if (operational.outOfStockItems > 0) {
      insights.push(`${operational.outOfStockItems} items are out of stock - review inventory`);
      insightsRo.push(`${operational.outOfStockItems} articole sunt fără stoc - revizuiți inventarul`);
    }

    if (hr.turnoverRate > 15) {
      insights.push('High employee turnover detected - review retention strategies');
      insightsRo.push('S-a detectat o fluctuație mare a personalului - revizuiți strategiile de retenție');
    }

    if (compliance.anafSubmissionsPending > 3) {
      insights.push('Multiple ANAF submissions pending - prioritize compliance');
      insightsRo.push('Mai multe depuneri ANAF în așteptare - prioritizați conformitatea');
    }

    const report: ExecutiveReport = {
      id: `report-${randomUUID()}`,
      name: `Executive Report - ${period}`,
      nameRo: `Raport Executiv - ${period}`,
      period,
      startDate,
      endDate: now,
      financial,
      operational,
      hr,
      compliance,
      kpis: this.getAllKPIValues(),
      alerts: this.getAlerts(true),
      insights,
      insightsRo,
      generatedAt: new Date(),
    };

    this.eventEmitter.emit('dashboard.report.generated', { reportId: report.id, period });

    return report;
  }

  // Pre-built Executive Dashboard Template
  getExecutiveDashboardTemplate(): Dashboard {
    return {
      id: 'template-executive',
      name: 'Executive Dashboard',
      nameRo: 'Tablou de Bord Executiv',
      description: 'Comprehensive executive overview',
      descriptionRo: 'Prezentare generală executivă cuprinzătoare',
      ownerId: 'system',
      isDefault: true,
      refreshIntervalMs: 300000,
      widgets: [
        {
          id: 'widget-revenue',
          name: 'Revenue',
          nameRo: 'Venituri',
          type: 'KPI_CARD',
          kpiIds: ['kpi-revenue'],
          config: { showTrend: true, showSparkline: true },
          position: { row: 0, col: 0 },
          size: { width: 3, height: 1 },
        },
        {
          id: 'widget-profit',
          name: 'Profit Margin',
          nameRo: 'Marjă Profit',
          type: 'GAUGE',
          kpiIds: ['kpi-profit-margin'],
          config: { min: 0, max: 30, zones: [{ from: 0, to: 10, color: 'red' }, { from: 10, to: 15, color: 'yellow' }, { from: 15, to: 30, color: 'green' }] },
          position: { row: 0, col: 3 },
          size: { width: 3, height: 1 },
        },
        {
          id: 'widget-orders',
          name: 'Orders Today',
          nameRo: 'Comenzi Astăzi',
          type: 'KPI_CARD',
          kpiIds: ['kpi-orders-today'],
          config: { showTrend: true },
          position: { row: 0, col: 6 },
          size: { width: 3, height: 1 },
        },
        {
          id: 'widget-compliance',
          name: 'Compliance Score',
          nameRo: 'Scor Conformitate',
          type: 'GAUGE',
          kpiIds: ['kpi-compliance-score'],
          config: { min: 0, max: 100, zones: [{ from: 0, to: 80, color: 'red' }, { from: 80, to: 90, color: 'yellow' }, { from: 90, to: 100, color: 'green' }] },
          position: { row: 0, col: 9 },
          size: { width: 3, height: 1 },
        },
        {
          id: 'widget-revenue-trend',
          name: 'Revenue Trend',
          nameRo: 'Tendință Venituri',
          type: 'AREA',
          kpiIds: ['kpi-revenue'],
          config: { period: 'MONTH', showArea: true },
          position: { row: 1, col: 0 },
          size: { width: 6, height: 2 },
        },
        {
          id: 'widget-kpi-overview',
          name: 'KPI Overview',
          nameRo: 'Prezentare KPI',
          type: 'TABLE',
          kpiIds: ['kpi-revenue', 'kpi-profit-margin', 'kpi-order-fulfillment', 'kpi-employee-satisfaction'],
          config: { showStatus: true, showTrend: true },
          position: { row: 1, col: 6 },
          size: { width: 6, height: 2 },
        },
        {
          id: 'widget-alerts',
          name: 'Active Alerts',
          nameRo: 'Alerte Active',
          type: 'ALERT_LIST',
          config: { maxItems: 5, showSeverity: true },
          position: { row: 3, col: 0 },
          size: { width: 4, height: 1 },
        },
        {
          id: 'widget-hr',
          name: 'HR Overview',
          nameRo: 'Prezentare HR',
          type: 'BAR',
          kpiIds: ['kpi-employee-count', 'kpi-turnover-rate', 'kpi-employee-satisfaction'],
          config: { orientation: 'horizontal' },
          position: { row: 3, col: 4 },
          size: { width: 4, height: 1 },
        },
        {
          id: 'widget-delivery',
          name: 'Delivery Performance',
          nameRo: 'Performanță Livrări',
          type: 'DONUT',
          kpiIds: ['kpi-delivery-on-time'],
          config: { showPercentage: true },
          position: { row: 3, col: 8 },
          size: { width: 4, height: 1 },
        },
      ],
      filters: [
        {
          id: 'filter-date',
          name: 'Date Range',
          type: 'DATE_RANGE',
          field: 'date',
          defaultValue: { period: 'MONTH' },
        },
        {
          id: 'filter-department',
          name: 'Department',
          type: 'MULTI_SELECT',
          field: 'departmentId',
          options: [
            { label: 'Finance', value: 'finance' },
            { label: 'Sales', value: 'sales' },
            { label: 'Operations', value: 'operations' },
            { label: 'HR', value: 'hr' },
          ],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
