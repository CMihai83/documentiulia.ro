import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Dashboard Analytics Widgets Service
 * Provides real-time analytics widgets for fleet management dashboard
 *
 * Features:
 * - KPI summary cards (deliveries, revenue, on-time rate, etc.)
 * - Trend charts data (daily, weekly, monthly)
 * - Comparison metrics (day-over-day, week-over-week)
 * - Real-time fleet status widgets
 * - Driver performance rankings
 * - Vehicle utilization metrics
 * - Cost efficiency analytics
 * - German/English localization
 */

// Widget types
export type WidgetType =
  | 'KPI_CARD'
  | 'TREND_CHART'
  | 'COMPARISON'
  | 'RANKING'
  | 'GAUGE'
  | 'STATUS_GRID'
  | 'HEATMAP'
  | 'PIE_CHART';

// Time range for analytics
export type TimeRange = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

// Trend direction
export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

// KPI card data
export interface KpiCardWidget {
  id: string;
  type: 'KPI_CARD';
  title: string;
  titleDe: string;
  value: number;
  unit?: string;
  format: 'number' | 'currency' | 'percentage' | 'time';
  trend: TrendDirection;
  trendValue: number;
  trendPeriod: string;
  icon: string;
  color: string;
}

// Trend chart data point
export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Trend chart widget
export interface TrendChartWidget {
  id: string;
  type: 'TREND_CHART';
  title: string;
  titleDe: string;
  data: TrendDataPoint[];
  chartType: 'line' | 'bar' | 'area';
  color: string;
  unit?: string;
  format: 'number' | 'currency' | 'percentage';
}

// Comparison widget
export interface ComparisonWidget {
  id: string;
  type: 'COMPARISON';
  title: string;
  titleDe: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: TrendDirection;
  format: 'number' | 'currency' | 'percentage';
  period: string;
}

// Ranking item
export interface RankingItem {
  rank: number;
  id: string;
  name: string;
  value: number;
  change?: number;
  avatar?: string;
}

// Ranking widget
export interface RankingWidget {
  id: string;
  type: 'RANKING';
  title: string;
  titleDe: string;
  items: RankingItem[];
  metric: string;
  metricDe: string;
  format: 'number' | 'currency' | 'percentage';
}

// Gauge widget
export interface GaugeWidget {
  id: string;
  type: 'GAUGE';
  title: string;
  titleDe: string;
  value: number;
  min: number;
  max: number;
  target?: number;
  zones: Array<{
    min: number;
    max: number;
    color: string;
    label: string;
  }>;
  unit?: string;
}

// Status item
export interface StatusItem {
  id: string;
  name: string;
  status: 'ACTIVE' | 'IDLE' | 'OFFLINE' | 'MAINTENANCE' | 'ALERT';
  statusLabel: string;
  statusLabelDe: string;
  lastUpdate: Date;
  details?: Record<string, any>;
}

// Status grid widget
export interface StatusGridWidget {
  id: string;
  type: 'STATUS_GRID';
  title: string;
  titleDe: string;
  items: StatusItem[];
  summary: {
    active: number;
    idle: number;
    offline: number;
    maintenance: number;
    alert: number;
  };
}

// Heatmap data point
export interface HeatmapDataPoint {
  x: string; // e.g., day of week
  y: string; // e.g., hour
  value: number;
}

// Heatmap widget
export interface HeatmapWidget {
  id: string;
  type: 'HEATMAP';
  title: string;
  titleDe: string;
  data: HeatmapDataPoint[];
  xLabels: string[];
  yLabels: string[];
  colorScale: string[];
  minValue: number;
  maxValue: number;
}

// Pie chart segment
export interface PieChartSegment {
  label: string;
  labelDe: string;
  value: number;
  color: string;
  percentage: number;
}

// Pie chart widget
export interface PieChartWidget {
  id: string;
  type: 'PIE_CHART';
  title: string;
  titleDe: string;
  segments: PieChartSegment[];
  total: number;
}

// Dashboard configuration
export interface DashboardConfig {
  userId: string;
  widgets: Array<{
    widgetId: string;
    position: { x: number; y: number; w: number; h: number };
    visible: boolean;
  }>;
}

// Widget union type
export type Widget =
  | KpiCardWidget
  | TrendChartWidget
  | ComparisonWidget
  | RankingWidget
  | GaugeWidget
  | StatusGridWidget
  | HeatmapWidget
  | PieChartWidget;

@Injectable()
export class DashboardAnalyticsWidgetsService {
  private readonly logger = new Logger(DashboardAnalyticsWidgetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =================== KPI CARDS ===================

  async getKpiCards(userId: string, timeRange: TimeRange = 'TODAY'): Promise<KpiCardWidget[]> {
    const { startDate, endDate, previousStartDate, previousEndDate } =
      this.getDateRange(timeRange);

    // Fetch current period data
    const [currentDeliveries, currentRevenue, vehicles, routes] = await Promise.all([
      this.getDeliveriesInPeriod(userId, startDate, endDate),
      this.getRevenueInPeriod(userId, startDate, endDate),
      this.prisma.vehicle.findMany({ where: { userId } }),
      this.prisma.deliveryRoute.findMany({
        where: {
          userId,
          routeDate: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Fetch previous period data for comparison
    const [prevDeliveries, prevRevenue] = await Promise.all([
      this.getDeliveriesInPeriod(userId, previousStartDate, previousEndDate),
      this.getRevenueInPeriod(userId, previousStartDate, previousEndDate),
    ]);

    // Calculate metrics
    const totalDeliveries = currentDeliveries.length;
    const completedDeliveries = currentDeliveries.filter(
      (d) => d.status === 'DELIVERED',
    ).length;
    const onTimeDeliveries = currentDeliveries.filter(
      (d) => d.status === 'DELIVERED' && d.actualArrival && d.estimatedArrival,
    ).length;
    const onTimeRate =
      completedDeliveries > 0
        ? Math.round((onTimeDeliveries / completedDeliveries) * 100)
        : 0;

    const totalRevenueNum = currentRevenue;
    const avgPerDelivery =
      completedDeliveries > 0
        ? Math.round((totalRevenueNum / completedDeliveries) * 100) / 100
        : 0;

    // Calculate trends
    const prevTotalDeliveries = prevDeliveries.length;
    const deliveryTrend = this.calculateTrend(totalDeliveries, prevTotalDeliveries);

    const revenueTrend = this.calculateTrend(totalRevenueNum, prevRevenue);

    const prevCompletedDeliveries = prevDeliveries.filter(
      (d) => d.status === 'DELIVERED',
    ).length;
    const prevOnTimeDeliveries = prevDeliveries.filter(
      (d) => d.status === 'DELIVERED' && d.actualArrival && d.estimatedArrival,
    ).length;
    const prevOnTimeRate =
      prevCompletedDeliveries > 0
        ? Math.round((prevOnTimeDeliveries / prevCompletedDeliveries) * 100)
        : 0;
    const onTimeTrend = this.calculateTrend(onTimeRate, prevOnTimeRate);

    // Active vehicles (AVAILABLE or IN_USE)
    const activeVehicles = vehicles.filter((v) => v.status === 'AVAILABLE' || v.status === 'IN_USE').length;

    return [
      {
        id: 'kpi-total-deliveries',
        type: 'KPI_CARD',
        title: 'Total Deliveries',
        titleDe: 'Gesamtlieferungen',
        value: totalDeliveries,
        format: 'number',
        trend: deliveryTrend.direction,
        trendValue: deliveryTrend.percentage,
        trendPeriod: this.getTrendPeriodLabel(timeRange),
        icon: 'package',
        color: '#3B82F6',
      },
      {
        id: 'kpi-revenue',
        type: 'KPI_CARD',
        title: 'Revenue',
        titleDe: 'Umsatz',
        value: totalRevenueNum,
        unit: 'EUR',
        format: 'currency',
        trend: revenueTrend.direction,
        trendValue: revenueTrend.percentage,
        trendPeriod: this.getTrendPeriodLabel(timeRange),
        icon: 'euro',
        color: '#10B981',
      },
      {
        id: 'kpi-on-time-rate',
        type: 'KPI_CARD',
        title: 'On-Time Rate',
        titleDe: 'Pünktlichkeitsrate',
        value: onTimeRate,
        unit: '%',
        format: 'percentage',
        trend: onTimeTrend.direction,
        trendValue: onTimeTrend.percentage,
        trendPeriod: this.getTrendPeriodLabel(timeRange),
        icon: 'clock',
        color: '#8B5CF6',
      },
      {
        id: 'kpi-active-vehicles',
        type: 'KPI_CARD',
        title: 'Active Vehicles',
        titleDe: 'Aktive Fahrzeuge',
        value: activeVehicles,
        format: 'number',
        trend: 'STABLE',
        trendValue: 0,
        trendPeriod: this.getTrendPeriodLabel(timeRange),
        icon: 'truck',
        color: '#F59E0B',
      },
      {
        id: 'kpi-avg-revenue',
        type: 'KPI_CARD',
        title: 'Avg Revenue/Delivery',
        titleDe: 'Durchschn. Umsatz/Lieferung',
        value: avgPerDelivery,
        unit: 'EUR',
        format: 'currency',
        trend: 'STABLE',
        trendValue: 0,
        trendPeriod: this.getTrendPeriodLabel(timeRange),
        icon: 'trending-up',
        color: '#EC4899',
      },
      {
        id: 'kpi-completed',
        type: 'KPI_CARD',
        title: 'Completed Deliveries',
        titleDe: 'Abgeschlossene Lieferungen',
        value: completedDeliveries,
        format: 'number',
        trend: 'STABLE',
        trendValue: 0,
        trendPeriod: this.getTrendPeriodLabel(timeRange),
        icon: 'check-circle',
        color: '#06B6D4',
      },
    ];
  }

  // =================== TREND CHARTS ===================

  async getDeliveryTrendChart(
    userId: string,
    timeRange: TimeRange = 'WEEK',
  ): Promise<TrendChartWidget> {
    const { startDate, endDate } = this.getDateRange(timeRange);

    const deliveries = await this.prisma.deliveryStop.findMany({
      where: {
        route: { userId },
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const groupedData = this.groupByDate(deliveries, timeRange);

    return {
      id: 'trend-deliveries',
      type: 'TREND_CHART',
      title: 'Delivery Trend',
      titleDe: 'Lieferungstrend',
      data: groupedData,
      chartType: 'area',
      color: '#3B82F6',
      format: 'number',
    };
  }

  async getRevenueTrendChart(
    userId: string,
    timeRange: TimeRange = 'WEEK',
  ): Promise<TrendChartWidget> {
    const { startDate, endDate } = this.getDateRange(timeRange);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: ['SUBMITTED', 'PAID'] },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // Group by date
    const groupedData: TrendDataPoint[] = [];
    const dateMap = new Map<string, number>();

    for (const invoice of invoices) {
      const dateKey = invoice.invoiceDate.toISOString().split('T')[0];
      const amount = invoice.grossAmount instanceof Decimal
        ? invoice.grossAmount.toNumber()
        : Number(invoice.grossAmount);
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + amount);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    for (const date of sortedDates) {
      groupedData.push({
        date,
        value: Math.round((dateMap.get(date) || 0) * 100) / 100,
      });
    }

    return {
      id: 'trend-revenue',
      type: 'TREND_CHART',
      title: 'Revenue Trend',
      titleDe: 'Umsatztrend',
      data: groupedData,
      chartType: 'bar',
      color: '#10B981',
      unit: 'EUR',
      format: 'currency',
    };
  }

  async getFuelConsumptionTrend(
    userId: string,
    timeRange: TimeRange = 'MONTH',
  ): Promise<TrendChartWidget> {
    const { startDate, endDate } = this.getDateRange(timeRange);

    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: {
        vehicle: { userId },
        fueledAt: { gte: startDate, lte: endDate },
      },
      orderBy: { fueledAt: 'asc' },
    });

    // Group by date
    const dateMap = new Map<string, number>();
    for (const log of fuelLogs) {
      const dateKey = log.fueledAt.toISOString().split('T')[0];
      const liters = log.liters instanceof Decimal ? log.liters.toNumber() : Number(log.liters);
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + liters);
    }

    const data: TrendDataPoint[] = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        value: Math.round(value * 10) / 10,
      }));

    return {
      id: 'trend-fuel',
      type: 'TREND_CHART',
      title: 'Fuel Consumption',
      titleDe: 'Kraftstoffverbrauch',
      data,
      chartType: 'line',
      color: '#F59E0B',
      unit: 'L',
      format: 'number',
    };
  }

  // =================== COMPARISON WIDGETS ===================

  async getComparisonWidgets(userId: string): Promise<ComparisonWidget[]> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

    // Get today's and yesterday's deliveries
    const [todayDeliveries, yesterdayDeliveries] = await Promise.all([
      this.getDeliveriesInPeriod(userId, startOfToday, endOfToday),
      this.getDeliveriesInPeriod(userId, startOfYesterday, endOfYesterday),
    ]);

    // Get today's and yesterday's revenue
    const [todayRevenue, yesterdayRevenue] = await Promise.all([
      this.getRevenueInPeriod(userId, startOfToday, endOfToday),
      this.getRevenueInPeriod(userId, startOfYesterday, endOfYesterday),
    ]);

    const deliveryComparison = this.createComparison(
      todayDeliveries.length,
      yesterdayDeliveries.length,
    );
    const revenueComparison = this.createComparison(todayRevenue, yesterdayRevenue);

    return [
      {
        id: 'comparison-deliveries',
        type: 'COMPARISON',
        title: 'Deliveries vs Yesterday',
        titleDe: 'Lieferungen vs Gestern',
        currentValue: todayDeliveries.length,
        previousValue: yesterdayDeliveries.length,
        change: deliveryComparison.change,
        changePercent: deliveryComparison.percentage,
        trend: deliveryComparison.direction,
        format: 'number',
        period: 'day-over-day',
      },
      {
        id: 'comparison-revenue',
        type: 'COMPARISON',
        title: 'Revenue vs Yesterday',
        titleDe: 'Umsatz vs Gestern',
        currentValue: todayRevenue,
        previousValue: yesterdayRevenue,
        change: revenueComparison.change,
        changePercent: revenueComparison.percentage,
        trend: revenueComparison.direction,
        format: 'currency',
        period: 'day-over-day',
      },
    ];
  }

  // =================== RANKING WIDGETS ===================

  async getDriverPerformanceRanking(userId: string, limit = 10): Promise<RankingWidget> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const employees = await this.prisma.employee.findMany({
      where: { userId },
      include: {
        driverRoutes: {
          where: {
            routeDate: { gte: thirtyDaysAgo },
            status: 'COMPLETED',
          },
          include: { stops: true },
        },
      },
    });

    const rankings: RankingItem[] = employees
      .map((emp: any) => {
        const totalStops = emp.driverRoutes.reduce((sum: number, r: any) => sum + r.stops.length, 0);
        const deliveredStops = emp.driverRoutes.reduce(
          (sum: number, r: any) =>
            sum + r.stops.filter((s: any) => s.status === 'DELIVERED').length,
          0,
        );
        const successRate = totalStops > 0 ? (deliveredStops / totalStops) * 100 : 0;

        return {
          rank: 0,
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          value: Math.round(successRate * 10) / 10,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return {
      id: 'ranking-drivers',
      type: 'RANKING',
      title: 'Top Drivers by Success Rate',
      titleDe: 'Top-Fahrer nach Erfolgsquote',
      items: rankings,
      metric: 'Success Rate',
      metricDe: 'Erfolgsquote',
      format: 'percentage',
    };
  }

  async getVehicleUtilizationRanking(userId: string, limit = 10): Promise<RankingWidget> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        deliveryRoutes: {
          where: {
            routeDate: { gte: thirtyDaysAgo },
          },
        },
      },
    });

    const rankings: RankingItem[] = vehicles
      .map((v: any) => {
        // Calculate total distance
        const totalDistance = v.deliveryRoutes.reduce((sum: number, r: any) => {
          const dist = r.actualDistanceKm instanceof Decimal
            ? r.actualDistanceKm.toNumber()
            : Number(r.actualDistanceKm || 0);
          return sum + dist;
        }, 0);

        return {
          rank: 0,
          id: v.id,
          name: `${v.make} ${v.model} (${v.licensePlate})`,
          value: Math.round(totalDistance),
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return {
      id: 'ranking-vehicles',
      type: 'RANKING',
      title: 'Vehicle Utilization (km)',
      titleDe: 'Fahrzeugnutzung (km)',
      items: rankings,
      metric: 'Distance (km)',
      metricDe: 'Strecke (km)',
      format: 'number',
    };
  }

  // =================== GAUGE WIDGETS ===================

  async getFleetHealthGauge(userId: string): Promise<GaugeWidget> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: { maintenanceLogs: { orderBy: { serviceDate: 'desc' }, take: 1 } },
    });

    // Calculate fleet health score (0-100)
    let healthScore = 100;
    const today = new Date();

    for (const vehicle of vehicles) {
      // Deduct for overdue maintenance
      if (vehicle.nextServiceDate && vehicle.nextServiceDate < today) {
        const daysOverdue = Math.floor(
          (today.getTime() - vehicle.nextServiceDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        healthScore -= Math.min(daysOverdue * 2, 20);
      }

      // Deduct for inactive vehicles (not AVAILABLE or IN_USE)
      if (vehicle.status !== 'AVAILABLE' && vehicle.status !== 'IN_USE') {
        healthScore -= 5;
      }
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      id: 'gauge-fleet-health',
      type: 'GAUGE',
      title: 'Fleet Health Score',
      titleDe: 'Flottengesundheit',
      value: healthScore,
      min: 0,
      max: 100,
      target: 85,
      zones: [
        { min: 0, max: 50, color: '#EF4444', label: 'Critical' },
        { min: 50, max: 70, color: '#F59E0B', label: 'Warning' },
        { min: 70, max: 85, color: '#3B82F6', label: 'Good' },
        { min: 85, max: 100, color: '#10B981', label: 'Excellent' },
      ],
      unit: '%',
    };
  }

  async getOnTimeDeliveryGauge(userId: string): Promise<GaugeWidget> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deliveries = await this.prisma.deliveryStop.findMany({
      where: {
        route: { userId },
        status: 'DELIVERED',
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const onTimeCount = deliveries.filter(
      (d) => d.actualArrival && d.estimatedArrival && d.actualArrival <= d.estimatedArrival,
    ).length;

    const onTimeRate = deliveries.length > 0
      ? Math.round((onTimeCount / deliveries.length) * 100)
      : 0;

    return {
      id: 'gauge-on-time',
      type: 'GAUGE',
      title: 'On-Time Delivery Rate',
      titleDe: 'Pünktlichkeitsrate',
      value: onTimeRate,
      min: 0,
      max: 100,
      target: 95,
      zones: [
        { min: 0, max: 70, color: '#EF4444', label: 'Poor' },
        { min: 70, max: 85, color: '#F59E0B', label: 'Needs Improvement' },
        { min: 85, max: 95, color: '#3B82F6', label: 'Good' },
        { min: 95, max: 100, color: '#10B981', label: 'Excellent' },
      ],
      unit: '%',
    };
  }

  // =================== STATUS GRID ===================

  async getVehicleStatusGrid(userId: string): Promise<StatusGridWidget> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        deliveryRoutes: {
          where: { status: 'IN_PROGRESS' },
          take: 1,
        },
      },
    });

    const statusLabels: Record<string, { en: string; de: string }> = {
      ACTIVE: { en: 'Active', de: 'Aktiv' },
      IDLE: { en: 'Idle', de: 'Inaktiv' },
      OFFLINE: { en: 'Offline', de: 'Offline' },
      MAINTENANCE: { en: 'In Maintenance', de: 'In Wartung' },
      ALERT: { en: 'Alert', de: 'Alarm' },
    };

    const items: StatusItem[] = vehicles.map((v: any) => {
      let status: StatusItem['status'] = 'IDLE';

      if (v.deliveryRoutes.length > 0) {
        status = 'ACTIVE';
      } else if (v.status === 'MAINTENANCE') {
        status = 'MAINTENANCE';
      } else if (v.status === 'OUT_OF_SERVICE' || v.status === 'RETIRED') {
        status = 'OFFLINE';
      }

      // Check for alerts (overdue maintenance)
      if (v.nextServiceDate && v.nextServiceDate < new Date()) {
        status = 'ALERT';
      }

      return {
        id: v.id,
        name: `${v.make} ${v.model} (${v.licensePlate})`,
        status,
        statusLabel: statusLabels[status].en,
        statusLabelDe: statusLabels[status].de,
        lastUpdate: v.updatedAt,
        details: {
          mileage: v.mileage || 0,
          nextService: v.nextServiceDate,
        },
      };
    });

    const summary = {
      active: items.filter((i) => i.status === 'ACTIVE').length,
      idle: items.filter((i) => i.status === 'IDLE').length,
      offline: items.filter((i) => i.status === 'OFFLINE').length,
      maintenance: items.filter((i) => i.status === 'MAINTENANCE').length,
      alert: items.filter((i) => i.status === 'ALERT').length,
    };

    return {
      id: 'status-vehicles',
      type: 'STATUS_GRID',
      title: 'Vehicle Status',
      titleDe: 'Fahrzeugstatus',
      items,
      summary,
    };
  }

  // =================== HEATMAP WIDGETS ===================

  async getDeliveryHeatmap(userId: string): Promise<HeatmapWidget> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deliveries = await this.prisma.deliveryStop.findMany({
      where: {
        route: { userId },
        status: 'DELIVERED',
        actualArrival: { gte: thirtyDaysAgo },
      },
    });

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 12 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);

    // Initialize heatmap
    const heatmap = new Map<string, number>();
    for (const day of days) {
      for (const hour of hours) {
        heatmap.set(`${day}-${hour}`, 0);
      }
    }

    // Populate heatmap
    for (const delivery of deliveries) {
      if (delivery.actualArrival) {
        const dayIndex = delivery.actualArrival.getDay();
        const day = days[dayIndex === 0 ? 6 : dayIndex - 1]; // Adjust for Sunday
        const hour = delivery.actualArrival.getHours();
        if (hour >= 6 && hour < 18) {
          const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
          const key = `${day}-${hourLabel}`;
          heatmap.set(key, (heatmap.get(key) || 0) + 1);
        }
      }
    }

    const data: HeatmapDataPoint[] = [];
    const values: number[] = [];

    for (const [key, value] of heatmap) {
      const [day, hour] = key.split('-');
      data.push({ x: day, y: hour, value });
      values.push(value);
    }

    return {
      id: 'heatmap-deliveries',
      type: 'HEATMAP',
      title: 'Delivery Activity Heatmap',
      titleDe: 'Lieferaktivitäts-Heatmap',
      data,
      xLabels: days,
      yLabels: hours,
      colorScale: ['#E0F2FE', '#38BDF8', '#0284C7', '#075985'],
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    };
  }

  // =================== PIE CHARTS ===================

  async getDeliveryStatusPieChart(userId: string): Promise<PieChartWidget> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deliveries = await this.prisma.deliveryStop.findMany({
      where: {
        route: { userId },
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const statusCounts: Record<string, number> = {
      DELIVERED: 0,
      PENDING: 0,
      IN_TRANSIT: 0,
      FAILED: 0,
      RETURNED: 0,
    };

    for (const delivery of deliveries) {
      const status = delivery.status || 'PENDING';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    const total = deliveries.length;
    const colors: Record<string, string> = {
      DELIVERED: '#10B981',
      PENDING: '#F59E0B',
      IN_TRANSIT: '#3B82F6',
      FAILED: '#EF4444',
      RETURNED: '#8B5CF6',
    };

    const labels: Record<string, { en: string; de: string }> = {
      DELIVERED: { en: 'Delivered', de: 'Zugestellt' },
      PENDING: { en: 'Pending', de: 'Ausstehend' },
      IN_TRANSIT: { en: 'In Transit', de: 'Unterwegs' },
      FAILED: { en: 'Failed', de: 'Fehlgeschlagen' },
      RETURNED: { en: 'Returned', de: 'Zurückgesendet' },
    };

    const segments: PieChartSegment[] = Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        label: labels[status]?.en || status,
        labelDe: labels[status]?.de || status,
        value: count,
        color: colors[status] || '#6B7280',
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }));

    return {
      id: 'pie-delivery-status',
      type: 'PIE_CHART',
      title: 'Delivery Status Distribution',
      titleDe: 'Verteilung Lieferstatus',
      segments,
      total,
    };
  }

  async getCostBreakdownPieChart(userId: string): Promise<PieChartWidget> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get fuel costs
    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: {
        vehicle: { userId },
        fueledAt: { gte: thirtyDaysAgo },
      },
    });

    const fuelCost = fuelLogs.reduce((sum, log) => {
      const cost = log.totalCost instanceof Decimal
        ? log.totalCost.toNumber()
        : Number(log.totalCost || 0);
      return sum + cost;
    }, 0);

    // Get maintenance costs
    const maintenanceLogs = await this.prisma.maintenanceLog.findMany({
      where: {
        vehicle: { userId },
        serviceDate: { gte: thirtyDaysAgo },
      },
    });

    const maintenanceCost = maintenanceLogs.reduce((sum, log) => {
      const cost = log.totalCost instanceof Decimal ? log.totalCost.toNumber() : Number(log.totalCost || 0);
      return sum + cost;
    }, 0);

    // Estimate labor costs (based on routes)
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: thirtyDaysAgo },
        status: 'COMPLETED',
      },
    });

    // Assume average hourly rate of 25 EUR
    const laborCost = routes.reduce((sum, route) => {
      if (route.actualStartTime && route.actualEndTime) {
        const hours =
          (route.actualEndTime.getTime() - route.actualStartTime.getTime()) / (1000 * 60 * 60);
        return sum + hours * 25;
      }
      return sum;
    }, 0);

    // Calculate other operational costs (estimate 10% of total)
    const subtotal = fuelCost + maintenanceCost + laborCost;
    const otherCosts = subtotal * 0.1;

    const total = subtotal + otherCosts;

    const segments: PieChartSegment[] = [
      {
        label: 'Fuel',
        labelDe: 'Kraftstoff',
        value: Math.round(fuelCost),
        color: '#F59E0B',
        percentage: total > 0 ? Math.round((fuelCost / total) * 1000) / 10 : 0,
      },
      {
        label: 'Maintenance',
        labelDe: 'Wartung',
        value: Math.round(maintenanceCost),
        color: '#3B82F6',
        percentage: total > 0 ? Math.round((maintenanceCost / total) * 1000) / 10 : 0,
      },
      {
        label: 'Labor',
        labelDe: 'Personalkosten',
        value: Math.round(laborCost),
        color: '#10B981',
        percentage: total > 0 ? Math.round((laborCost / total) * 1000) / 10 : 0,
      },
      {
        label: 'Other',
        labelDe: 'Sonstige',
        value: Math.round(otherCosts),
        color: '#8B5CF6',
        percentage: total > 0 ? Math.round((otherCosts / total) * 1000) / 10 : 0,
      },
    ].filter((s) => s.value > 0);

    return {
      id: 'pie-cost-breakdown',
      type: 'PIE_CHART',
      title: 'Cost Breakdown',
      titleDe: 'Kostenaufteilung',
      segments,
      total: Math.round(total),
    };
  }

  // =================== FULL DASHBOARD ===================

  async getFullDashboard(
    userId: string,
    timeRange: TimeRange = 'TODAY',
  ): Promise<{
    kpiCards: KpiCardWidget[];
    trendCharts: TrendChartWidget[];
    comparisons: ComparisonWidget[];
    rankings: RankingWidget[];
    gauges: GaugeWidget[];
    statusGrids: StatusGridWidget[];
    heatmaps: HeatmapWidget[];
    pieCharts: PieChartWidget[];
    lastUpdated: Date;
  }> {
    const [
      kpiCards,
      deliveryTrend,
      revenueTrend,
      fuelTrend,
      comparisons,
      driverRanking,
      vehicleRanking,
      fleetHealthGauge,
      onTimeGauge,
      vehicleStatus,
      deliveryHeatmap,
      deliveryStatusPie,
      costBreakdownPie,
    ] = await Promise.all([
      this.getKpiCards(userId, timeRange),
      this.getDeliveryTrendChart(userId, 'WEEK'),
      this.getRevenueTrendChart(userId, 'WEEK'),
      this.getFuelConsumptionTrend(userId, 'MONTH'),
      this.getComparisonWidgets(userId),
      this.getDriverPerformanceRanking(userId),
      this.getVehicleUtilizationRanking(userId),
      this.getFleetHealthGauge(userId),
      this.getOnTimeDeliveryGauge(userId),
      this.getVehicleStatusGrid(userId),
      this.getDeliveryHeatmap(userId),
      this.getDeliveryStatusPieChart(userId),
      this.getCostBreakdownPieChart(userId),
    ]);

    return {
      kpiCards,
      trendCharts: [deliveryTrend, revenueTrend, fuelTrend],
      comparisons,
      rankings: [driverRanking, vehicleRanking],
      gauges: [fleetHealthGauge, onTimeGauge],
      statusGrids: [vehicleStatus],
      heatmaps: [deliveryHeatmap],
      pieCharts: [deliveryStatusPie, costBreakdownPie],
      lastUpdated: new Date(),
    };
  }

  // =================== HELPER METHODS ===================

  private getDateRange(timeRange: TimeRange): {
    startDate: Date;
    endDate: Date;
    previousStartDate: Date;
    previousEndDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (timeRange) {
      case 'TODAY':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(previousStartDate);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case 'YESTERDAY':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(previousStartDate);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case 'WEEK':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        previousEndDate.setMilliseconds(-1);
        break;
      case 'MONTH':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 30);
        previousEndDate = new Date(startDate);
        previousEndDate.setMilliseconds(-1);
        break;
      case 'QUARTER':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 90);
        previousEndDate = new Date(startDate);
        previousEndDate.setMilliseconds(-1);
        break;
      case 'YEAR':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate = new Date(startDate);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        previousEndDate = new Date(startDate);
        previousEndDate.setMilliseconds(-1);
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(previousStartDate);
        previousEndDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate, previousStartDate, previousEndDate };
  }

  private async getDeliveriesInPeriod(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.prisma.deliveryStop.findMany({
      where: {
        route: { userId },
        createdAt: { gte: startDate, lte: endDate },
      },
    });
  }

  private async getRevenueInPeriod(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: ['SUBMITTED', 'PAID'] },
      },
    });

    return invoices.reduce((sum, inv) => {
      const amount = inv.grossAmount instanceof Decimal
        ? inv.grossAmount.toNumber()
        : Number(inv.grossAmount || 0);
      return sum + amount;
    }, 0);
  }

  private calculateTrend(
    current: number,
    previous: number,
  ): { direction: TrendDirection; percentage: number } {
    if (previous === 0) {
      return {
        direction: current > 0 ? 'UP' : 'STABLE',
        percentage: current > 0 ? 100 : 0,
      };
    }

    const change = ((current - previous) / previous) * 100;

    return {
      direction: change > 1 ? 'UP' : change < -1 ? 'DOWN' : 'STABLE',
      percentage: Math.round(Math.abs(change) * 10) / 10,
    };
  }

  private createComparison(
    current: number,
    previous: number,
  ): { change: number; percentage: number; direction: TrendDirection } {
    const change = current - previous;
    const trend = this.calculateTrend(current, previous);

    return {
      change: Math.round(change * 100) / 100,
      percentage: trend.percentage,
      direction: trend.direction,
    };
  }

  private getTrendPeriodLabel(timeRange: TimeRange): string {
    const labels: Record<TimeRange, string> = {
      TODAY: 'vs yesterday',
      YESTERDAY: 'vs day before',
      WEEK: 'vs last week',
      MONTH: 'vs last month',
      QUARTER: 'vs last quarter',
      YEAR: 'vs last year',
    };
    return labels[timeRange];
  }

  private groupByDate(items: any[], timeRange: TimeRange): TrendDataPoint[] {
    const dateMap = new Map<string, number>();

    for (const item of items) {
      const date = item.createdAt || item.date;
      if (date) {
        const dateKey = new Date(date).toISOString().split('T')[0];
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
      }
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }
}
