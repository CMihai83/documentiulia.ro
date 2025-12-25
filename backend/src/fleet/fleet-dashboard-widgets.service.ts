import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus, RouteStatus, DeliveryStopStatus } from '@prisma/client';

/**
 * Fleet Dashboard Widgets Service
 * Provides data for fleet management dashboard widgets.
 *
 * Widgets:
 * - Active routes overview
 * - Vehicle status summary
 * - Delivery success rate
 * - Fuel efficiency metrics
 * - Maintenance alerts
 * - Driver performance highlights
 * - Recent activity feed
 * - Daily/Weekly/Monthly trends
 *
 * Optimized for Munich delivery fleet dashboard.
 */

export interface ActiveRoutesWidget {
  totalActiveRoutes: number;
  inProgressRoutes: number;
  pendingRoutes: number;
  driversOnRoad: number;
  totalStopsToday: number;
  completedStops: number;
  remainingStops: number;
  progressPercentage: number;
  estimatedCompletion: string | null;
}

export interface VehicleStatusWidget {
  totalVehicles: number;
  available: number;
  inUse: number;
  maintenance: number;
  utilizationRate: number;
  needsAttention: { vehicleId: string; plateNumber: string; issue: string }[];
}

export interface DeliveryMetricsWidget {
  today: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    successRate: number;
  };
  thisWeek: {
    total: number;
    delivered: number;
    failed: number;
    successRate: number;
  };
  thisMonth: {
    total: number;
    delivered: number;
    failed: number;
    successRate: number;
  };
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export interface FuelEfficiencyWidget {
  avgLitersPer100km: number;
  totalFuelCostThisMonth: number;
  costPerDelivery: number;
  bestVehicle: { vehicleId: string; plateNumber: string; efficiency: number } | null;
  worstVehicle: { vehicleId: string; plateNumber: string; efficiency: number } | null;
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
}

export interface MaintenanceAlertWidget {
  urgentAlerts: number;
  upcomingMaintenance: number;
  overdueMaintenance: number;
  alerts: {
    vehicleId: string;
    plateNumber: string;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    dueDate: Date | null;
    message: string;
  }[];
}

export interface DriverPerformanceWidget {
  topPerformers: {
    driverId: string;
    driverName: string;
    deliveries: number;
    successRate: number;
    avgDeliveryTime: number;
  }[];
  needsImprovement: {
    driverId: string;
    driverName: string;
    issue: string;
    metric: number;
  }[];
  teamAvgSuccessRate: number;
  teamAvgDeliveriesPerDay: number;
}

export interface RecentActivityWidget {
  activities: {
    id: string;
    type: 'delivery' | 'route' | 'vehicle' | 'maintenance' | 'alert';
    action: string;
    description: string;
    timestamp: Date;
    icon: string;
  }[];
}

export interface DailyTrendsWidget {
  labels: string[];
  deliveries: number[];
  successRates: number[];
  distance: number[];
  fuelCosts: number[];
}

export interface DashboardSummary {
  activeRoutes: ActiveRoutesWidget;
  vehicleStatus: VehicleStatusWidget;
  deliveryMetrics: DeliveryMetricsWidget;
  maintenanceAlerts: MaintenanceAlertWidget;
  recentActivity: RecentActivityWidget;
  quickStats: {
    todayDeliveries: number;
    activeDrivers: number;
    availableVehicles: number;
    pendingAlerts: number;
  };
}

@Injectable()
export class FleetDashboardWidgetsService {
  private readonly logger = new Logger(FleetDashboardWidgetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get complete dashboard summary
   */
  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    const [activeRoutes, vehicleStatus, deliveryMetrics, maintenanceAlerts, recentActivity] =
      await Promise.all([
        this.getActiveRoutesWidget(userId),
        this.getVehicleStatusWidget(userId),
        this.getDeliveryMetricsWidget(userId),
        this.getMaintenanceAlertWidget(userId),
        this.getRecentActivityWidget(userId),
      ]);

    return {
      activeRoutes,
      vehicleStatus,
      deliveryMetrics,
      maintenanceAlerts,
      recentActivity,
      quickStats: {
        todayDeliveries: deliveryMetrics.today.delivered,
        activeDrivers: activeRoutes.driversOnRoad,
        availableVehicles: vehicleStatus.available,
        pendingAlerts: maintenanceAlerts.urgentAlerts,
      },
    };
  }

  /**
   * Active Routes Widget
   */
  async getActiveRoutesWidget(userId: string): Promise<ActiveRoutesWidget> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: today, lt: tomorrow },
      },
      include: {
        stops: true,
        vehicle: true,
      },
    });

    const totalActiveRoutes = routes.length;
    const inProgressRoutes = routes.filter(r => r.status === RouteStatus.IN_PROGRESS).length;
    const pendingRoutes = routes.filter(r => r.status === RouteStatus.PLANNED).length;

    const driversOnRoad = routes.filter(r => r.status === RouteStatus.IN_PROGRESS && r.driverId).length;

    let totalStops = 0;
    let completedStops = 0;

    for (const route of routes) {
      totalStops += route.stops.length;
      completedStops += route.stops.filter(
        s => s.status === DeliveryStopStatus.DELIVERED || s.status === DeliveryStopStatus.FAILED,
      ).length;
    }

    const remainingStops = totalStops - completedStops;
    const progressPercentage = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

    // Estimate completion time
    let estimatedCompletion: string | null = null;
    if (inProgressRoutes > 0 && remainingStops > 0) {
      const avgMinutesPerStop = 8;
      const minutesRemaining = remainingStops * avgMinutesPerStop;
      const completionTime = new Date();
      completionTime.setMinutes(completionTime.getMinutes() + minutesRemaining);
      estimatedCompletion = completionTime.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return {
      totalActiveRoutes,
      inProgressRoutes,
      pendingRoutes,
      driversOnRoad,
      totalStopsToday: totalStops,
      completedStops,
      remainingStops,
      progressPercentage,
      estimatedCompletion,
    };
  }

  /**
   * Vehicle Status Widget
   */
  async getVehicleStatusWidget(userId: string): Promise<VehicleStatusWidget> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
          take: 1,
        },
      },
    });

    const totalVehicles = vehicles.length;
    const available = vehicles.filter(v => v.status === VehicleStatus.AVAILABLE).length;
    const inUse = vehicles.filter(v => v.status === VehicleStatus.IN_USE).length;
    const maintenance = vehicles.filter(v => v.status === VehicleStatus.MAINTENANCE).length;

    const utilizationRate = totalVehicles > 0 ? Math.round((inUse / totalVehicles) * 100) : 0;

    // Check for vehicles that need attention
    const needsAttention: { vehicleId: string; plateNumber: string; issue: string }[] = [];

    for (const vehicle of vehicles) {
      // Check odometer for service
      if (vehicle.mileage && vehicle.mileage > 50000) {
        const lastMaintenance = vehicle.maintenanceLogs[0];
        if (
          !lastMaintenance ||
          vehicle.mileage - (lastMaintenance.odometerReading || 0) > 15000
        ) {
          needsAttention.push({
            vehicleId: vehicle.id,
            plateNumber: vehicle.licensePlate,
            issue: 'Service überfällig',
          });
        }
      }

      // Check insurance expiry
      if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < new Date()) {
        needsAttention.push({
          vehicleId: vehicle.id,
          plateNumber: vehicle.licensePlate,
          issue: 'Versicherung abgelaufen',
        });
      }

      // Check inspection (TÜV)
      if (vehicle.tuvExpiry && vehicle.tuvExpiry < new Date()) {
        needsAttention.push({
          vehicleId: vehicle.id,
          plateNumber: vehicle.licensePlate,
          issue: 'TÜV überfällig',
        });
      }
    }

    return {
      totalVehicles,
      available,
      inUse,
      maintenance,
      utilizationRate,
      needsAttention: needsAttention.slice(0, 5),
    };
  }

  /**
   * Delivery Metrics Widget
   */
  async getDeliveryMetricsWidget(userId: string): Promise<DeliveryMetricsWidget> {
    const now = new Date();

    // Today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // This week
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last month (for trend comparison)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [todayStops, weekStops, monthStops, lastMonthStops] = await Promise.all([
      this.prisma.deliveryStop.findMany({
        where: {
          route: { userId },
          updatedAt: { gte: todayStart },
        },
      }),
      this.prisma.deliveryStop.findMany({
        where: {
          route: { userId },
          updatedAt: { gte: weekStart },
        },
      }),
      this.prisma.deliveryStop.findMany({
        where: {
          route: { userId },
          updatedAt: { gte: monthStart },
        },
      }),
      this.prisma.deliveryStop.findMany({
        where: {
          route: { userId },
          updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
    ]);

    const calculateMetrics = (stops: any[]) => {
      const total = stops.length;
      const delivered = stops.filter(s => s.status === DeliveryStopStatus.DELIVERED).length;
      const failed = stops.filter(s => s.status === DeliveryStopStatus.FAILED).length;
      const pending = stops.filter(s => s.status === DeliveryStopStatus.PENDING).length;
      const completed = delivered + failed;
      const successRate = completed > 0 ? Math.round((delivered / completed) * 100) : 0;
      return { total, delivered, failed, pending, successRate };
    };

    const todayMetrics = calculateMetrics(todayStops);
    const weekMetrics = calculateMetrics(weekStops);
    const monthMetrics = calculateMetrics(monthStops);
    const lastMonthMetrics = calculateMetrics(lastMonthStops);

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendValue = 0;

    if (lastMonthMetrics.successRate > 0) {
      const diff = monthMetrics.successRate - lastMonthMetrics.successRate;
      trendValue = Math.abs(diff);
      if (diff > 2) trend = 'up';
      else if (diff < -2) trend = 'down';
    }

    return {
      today: todayMetrics,
      thisWeek: weekMetrics,
      thisMonth: monthMetrics,
      trend,
      trendValue,
    };
  }

  /**
   * Fuel Efficiency Widget
   */
  async getFuelEfficiencyWidget(userId: string): Promise<FuelEfficiencyWidget> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [fuelLogs, lastMonthLogs, routes, vehicles] = await Promise.all([
      this.prisma.fuelLog.findMany({
        where: { vehicle: { userId }, fueledAt: { gte: monthStart } },
        include: { vehicle: true },
      }),
      this.prisma.fuelLog.findMany({
        where: { vehicle: { userId }, fueledAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      this.prisma.deliveryRoute.findMany({
        where: { userId, routeDate: { gte: monthStart }, status: RouteStatus.COMPLETED },
        include: { stops: { where: { status: DeliveryStopStatus.DELIVERED } } },
      }),
      this.prisma.vehicle.findMany({ where: { userId } }),
    ]);

    const totalLiters = fuelLogs.reduce((sum, log) => sum + log.liters.toNumber(), 0);
    const totalCost = fuelLogs.reduce((sum, log) => sum + log.totalCost.toNumber(), 0);
    const totalDeliveries = routes.reduce((sum, r) => sum + r.stops.length, 0);
    const totalDistance = routes.reduce((sum, r) => sum + (r.actualDistanceKm?.toNumber() || 0), 0);

    const avgLitersPer100km = totalDistance > 0 ? (totalLiters / totalDistance) * 100 : 0;
    const costPerDelivery = totalDeliveries > 0 ? totalCost / totalDeliveries : 0;

    // Calculate per-vehicle efficiency
    const vehicleEfficiency = new Map<string, { liters: number; distance: number; plate: string }>();

    for (const log of fuelLogs) {
      const current = vehicleEfficiency.get(log.vehicleId) || {
        liters: 0,
        distance: 0,
        plate: log.vehicle.licensePlate,
      };
      current.liters += log.liters.toNumber();
      vehicleEfficiency.set(log.vehicleId, current);
    }

    for (const route of routes) {
      if (route.vehicleId) {
        const current = vehicleEfficiency.get(route.vehicleId);
        if (current) {
          current.distance += route.actualDistanceKm?.toNumber() || 0;
        }
      }
    }

    let bestVehicle: FuelEfficiencyWidget['bestVehicle'] = null;
    let worstVehicle: FuelEfficiencyWidget['worstVehicle'] = null;
    let bestEfficiency = Infinity;
    let worstEfficiency = 0;

    vehicleEfficiency.forEach((data, vehicleId) => {
      if (data.distance > 100) {
        const efficiency = (data.liters / data.distance) * 100;
        if (efficiency < bestEfficiency) {
          bestEfficiency = efficiency;
          bestVehicle = {
            vehicleId,
            plateNumber: data.plate,
            efficiency: Math.round(efficiency * 10) / 10,
          };
        }
        if (efficiency > worstEfficiency) {
          worstEfficiency = efficiency;
          worstVehicle = {
            vehicleId,
            plateNumber: data.plate,
            efficiency: Math.round(efficiency * 10) / 10,
          };
        }
      }
    });

    // Calculate trend
    const lastMonthLiters = lastMonthLogs.reduce((sum, log) => sum + log.liters.toNumber(), 0);
    const lastMonthCost = lastMonthLogs.reduce((sum, log) => sum + log.totalCost.toNumber(), 0);

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    let trendPercentage = 0;

    if (lastMonthCost > 0 && totalCost > 0) {
      const costChange = ((totalCost - lastMonthCost) / lastMonthCost) * 100;
      trendPercentage = Math.abs(Math.round(costChange));
      if (costChange < -5) trend = 'improving';
      else if (costChange > 5) trend = 'declining';
    }

    return {
      avgLitersPer100km: Math.round(avgLitersPer100km * 10) / 10,
      totalFuelCostThisMonth: Math.round(totalCost * 100) / 100,
      costPerDelivery: Math.round(costPerDelivery * 100) / 100,
      bestVehicle,
      worstVehicle,
      trend,
      trendPercentage,
    };
  }

  /**
   * Maintenance Alert Widget
   */
  async getMaintenanceAlertWidget(userId: string): Promise<MaintenanceAlertWidget> {
    const now = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
          take: 1,
        },
      },
    });

    const alerts: MaintenanceAlertWidget['alerts'] = [];

    for (const vehicle of vehicles) {
      // Check TÜV/inspection
      if (vehicle.tuvExpiry) {
        if (vehicle.tuvExpiry < now) {
          alerts.push({
            vehicleId: vehicle.id,
            plateNumber: vehicle.licensePlate,
            type: 'TÜV',
            severity: 'critical',
            dueDate: vehicle.tuvExpiry,
            message: `TÜV überfällig seit ${this.formatDateDE(vehicle.tuvExpiry)}`,
          });
        } else if (vehicle.tuvExpiry < twoWeeksFromNow) {
          alerts.push({
            vehicleId: vehicle.id,
            plateNumber: vehicle.licensePlate,
            type: 'TÜV',
            severity: 'warning',
            dueDate: vehicle.tuvExpiry,
            message: `TÜV fällig am ${this.formatDateDE(vehicle.tuvExpiry)}`,
          });
        }
      }

      // Check insurance
      if (vehicle.insuranceExpiry) {
        if (vehicle.insuranceExpiry < now) {
          alerts.push({
            vehicleId: vehicle.id,
            plateNumber: vehicle.licensePlate,
            type: 'Versicherung',
            severity: 'critical',
            dueDate: vehicle.insuranceExpiry,
            message: `Versicherung abgelaufen am ${this.formatDateDE(vehicle.insuranceExpiry)}`,
          });
        } else if (vehicle.insuranceExpiry < twoWeeksFromNow) {
          alerts.push({
            vehicleId: vehicle.id,
            plateNumber: vehicle.licensePlate,
            type: 'Versicherung',
            severity: 'warning',
            dueDate: vehicle.insuranceExpiry,
            message: `Versicherung läuft ab am ${this.formatDateDE(vehicle.insuranceExpiry)}`,
          });
        }
      }

      // Check service interval
      if (vehicle.mileage) {
        const lastMaintenance = vehicle.maintenanceLogs[0];
        const kmSinceService = lastMaintenance
          ? vehicle.mileage - (lastMaintenance.odometerReading || 0)
          : vehicle.mileage;

        if (kmSinceService > 20000) {
          alerts.push({
            vehicleId: vehicle.id,
            plateNumber: vehicle.licensePlate,
            type: 'Service',
            severity: 'critical',
            dueDate: null,
            message: `Service überfällig (${kmSinceService.toLocaleString('de-DE')} km seit letztem Service)`,
          });
        } else if (kmSinceService > 15000) {
          alerts.push({
            vehicleId: vehicle.id,
            plateNumber: vehicle.licensePlate,
            type: 'Service',
            severity: 'warning',
            dueDate: null,
            message: `Service bald fällig (${kmSinceService.toLocaleString('de-DE')} km seit letztem Service)`,
          });
        }
      }
    }

    // Sort by severity
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return {
      urgentAlerts: alerts.filter(a => a.severity === 'critical').length,
      upcomingMaintenance: alerts.filter(a => a.severity === 'warning').length,
      overdueMaintenance: alerts.filter(a => a.severity === 'critical').length,
      alerts: alerts.slice(0, 10),
    };
  }

  /**
   * Driver Performance Widget
   */
  async getDriverPerformanceWidget(userId: string): Promise<DriverPerformanceWidget> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: monthStart },
        status: RouteStatus.COMPLETED,
        driverId: { not: null },
      },
      include: {
        stops: true,
        driver: true,
      },
    });

    // Aggregate by driver
    const driverStats = new Map<
      string,
      {
        name: string;
        routes: number;
        deliveries: number;
        failed: number;
        totalTime: number;
      }
    >();

    for (const route of routes) {
      if (!route.driverId || !route.driver) continue;

      const current = driverStats.get(route.driverId) || {
        name: `${route.driver.firstName} ${route.driver.lastName}`,
        routes: 0,
        deliveries: 0,
        failed: 0,
        totalTime: 0,
      };

      current.routes++;
      current.deliveries += route.stops.filter(
        s => s.status === DeliveryStopStatus.DELIVERED,
      ).length;
      current.failed += route.stops.filter(s => s.status === DeliveryStopStatus.FAILED).length;

      if (route.actualStartTime && route.actualEndTime) {
        current.totalTime +=
          (route.actualEndTime.getTime() - route.actualStartTime.getTime()) / (1000 * 60);
      }

      driverStats.set(route.driverId, current);
    }

    const drivers = Array.from(driverStats.entries()).map(([driverId, stats]) => ({
      driverId,
      driverName: stats.name,
      deliveries: stats.deliveries,
      successRate:
        stats.deliveries + stats.failed > 0
          ? Math.round((stats.deliveries / (stats.deliveries + stats.failed)) * 100)
          : 0,
      avgDeliveryTime:
        stats.deliveries > 0 ? Math.round(stats.totalTime / stats.deliveries) : 0,
      routes: stats.routes,
      failed: stats.failed,
    }));

    // Top performers (by success rate, min 10 deliveries)
    const topPerformers = drivers
      .filter(d => d.deliveries >= 10)
      .sort((a, b) => b.successRate - a.successRate || b.deliveries - a.deliveries)
      .slice(0, 5);

    // Needs improvement
    const needsImprovement = drivers
      .filter(d => d.deliveries >= 5 && (d.successRate < 90 || d.failed > 5))
      .map(d => ({
        driverId: d.driverId,
        driverName: d.driverName,
        issue: d.successRate < 90 ? 'Niedrige Erfolgsquote' : 'Viele fehlgeschlagene Zustellungen',
        metric: d.successRate < 90 ? d.successRate : d.failed,
      }))
      .slice(0, 3);

    // Team averages
    const totalDeliveries = drivers.reduce((sum, d) => sum + d.deliveries, 0);
    const totalFailed = drivers.reduce((sum, d) => sum + d.failed, 0);
    const totalRoutes = drivers.reduce((sum, d) => sum + d.routes, 0);

    const teamAvgSuccessRate =
      totalDeliveries + totalFailed > 0
        ? Math.round((totalDeliveries / (totalDeliveries + totalFailed)) * 100)
        : 0;

    const daysInMonth = (now.getDate() || 1);
    const teamAvgDeliveriesPerDay = Math.round(totalDeliveries / daysInMonth);

    return {
      topPerformers,
      needsImprovement,
      teamAvgSuccessRate,
      teamAvgDeliveriesPerDay,
    };
  }

  /**
   * Recent Activity Widget
   */
  async getRecentActivityWidget(userId: string, limit: number = 10): Promise<RecentActivityWidget> {
    const activities: RecentActivityWidget['activities'] = [];

    // Get recent routes
    const recentRoutes = await this.prisma.deliveryRoute.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { vehicle: true },
    });

    for (const route of recentRoutes) {
      let action = 'erstellt';
      if (route.status === RouteStatus.COMPLETED) action = 'abgeschlossen';
      else if (route.status === RouteStatus.IN_PROGRESS) action = 'gestartet';

      activities.push({
        id: `route-${route.id}`,
        type: 'route',
        action,
        description: `Route ${route.routeName || route.id.slice(-6)} ${action}`,
        timestamp: route.updatedAt,
        icon: 'route',
      });
    }

    // Get recent deliveries
    const recentDeliveries = await this.prisma.deliveryStop.findMany({
      where: { route: { userId }, status: { not: DeliveryStopStatus.PENDING } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    for (const stop of recentDeliveries) {
      const action = stop.status === DeliveryStopStatus.DELIVERED ? 'zugestellt' : 'fehlgeschlagen';
      const address = `${stop.streetAddress}, ${stop.city}`;
      activities.push({
        id: `delivery-${stop.id}`,
        type: 'delivery',
        action,
        description: `Lieferung an ${address.slice(0, 30)}... ${action}`,
        timestamp: stop.updatedAt,
        icon: stop.status === DeliveryStopStatus.DELIVERED ? 'check' : 'error',
      });
    }

    // Get recent maintenance
    const recentMaintenance = await this.prisma.maintenanceLog.findMany({
      where: { vehicle: { userId } },
      orderBy: { serviceDate: 'desc' },
      take: 3,
      include: { vehicle: true },
    });

    for (const log of recentMaintenance) {
      activities.push({
        id: `maintenance-${log.id}`,
        type: 'maintenance',
        action: 'durchgeführt',
        description: `Wartung ${log.vehicle.licensePlate}: ${log.description}`,
        timestamp: log.serviceDate,
        icon: 'tool',
      });
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      activities: activities.slice(0, limit),
    };
  }

  /**
   * Daily Trends Widget (last 7 days)
   */
  async getDailyTrendsWidget(userId: string, days: number = 7): Promise<DailyTrendsWidget> {
    const labels: string[] = [];
    const deliveries: number[] = [];
    const successRates: number[] = [];
    const distance: number[] = [];
    const fuelCosts: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      labels.push(date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' }));

      const [dayRoutes, dayFuel] = await Promise.all([
        this.prisma.deliveryRoute.findMany({
          where: { userId, routeDate: { gte: date, lt: nextDate } },
          include: { stops: true },
        }),
        this.prisma.fuelLog.findMany({
          where: { vehicle: { userId }, fueledAt: { gte: date, lt: nextDate } },
        }),
      ]);

      let dayDeliveries = 0;
      let dayFailed = 0;
      let dayDistance = 0;

      for (const route of dayRoutes) {
        dayDeliveries += route.stops.filter(s => s.status === DeliveryStopStatus.DELIVERED).length;
        dayFailed += route.stops.filter(s => s.status === DeliveryStopStatus.FAILED).length;
        dayDistance += route.actualDistanceKm?.toNumber() || 0;
      }

      const dayFuelCost = dayFuel.reduce((sum, log) => sum + log.totalCost.toNumber(), 0);

      deliveries.push(dayDeliveries);
      successRates.push(
        dayDeliveries + dayFailed > 0
          ? Math.round((dayDeliveries / (dayDeliveries + dayFailed)) * 100)
          : 0,
      );
      distance.push(Math.round(dayDistance));
      fuelCosts.push(Math.round(dayFuelCost * 100) / 100);
    }

    return { labels, deliveries, successRates, distance, fuelCosts };
  }

  /**
   * Get zone performance (for map widget)
   */
  async getZonePerformanceWidget(userId: string): Promise<{
    zones: {
      name: string;
      deliveries: number;
      successRate: number;
      avgDeliveryTime: number;
    }[];
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: monthStart },
        status: RouteStatus.COMPLETED,
      },
      include: { stops: true },
    });

    const zoneStats = new Map<string, { deliveries: number; failed: number; totalTime: number }>();

    for (const route of routes) {
      for (const stop of route.stops) {
        // Extract zone from address (simplified - use first part of address)
        const fullAddress = `${stop.streetAddress}, ${stop.city}`;
        const zone = this.extractZone(fullAddress);

        const current = zoneStats.get(zone) || { deliveries: 0, failed: 0, totalTime: 0 };

        if (stop.status === DeliveryStopStatus.DELIVERED) {
          current.deliveries++;
          if (stop.actualArrival && stop.estimatedArrival) {
            current.totalTime +=
              (stop.actualArrival.getTime() - stop.estimatedArrival.getTime()) / (1000 * 60);
          }
        } else if (stop.status === DeliveryStopStatus.FAILED) {
          current.failed++;
        }

        zoneStats.set(zone, current);
      }
    }

    const zones = Array.from(zoneStats.entries())
      .map(([name, stats]) => ({
        name,
        deliveries: stats.deliveries,
        successRate:
          stats.deliveries + stats.failed > 0
            ? Math.round((stats.deliveries / (stats.deliveries + stats.failed)) * 100)
            : 0,
        avgDeliveryTime:
          stats.deliveries > 0 ? Math.round(stats.totalTime / stats.deliveries) : 0,
      }))
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 10);

    return { zones };
  }

  /**
   * Helper to format date in German
   */
  private formatDateDE(date: Date): string {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Helper to extract zone from address
   */
  private extractZone(address: string): string {
    // Try to extract Munich district
    const munichDistricts = [
      'Schwabing',
      'Maxvorstadt',
      'Bogenhausen',
      'Haidhausen',
      'Sendling',
      'Pasing',
      'Laim',
      'Neuhausen',
      'Nymphenburg',
      'Moosach',
      'Milbertshofen',
      'Riem',
      'Trudering',
      'Giesing',
      'Au',
    ];

    for (const district of munichDistricts) {
      if (address.toLowerCase().includes(district.toLowerCase())) {
        return `München-${district}`;
      }
    }

    // Check for postal code
    const postalMatch = address.match(/\b(8\d{4})\b/);
    if (postalMatch) {
      return `PLZ ${postalMatch[1]}`;
    }

    return 'Sonstige';
  }
}
