import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Driver Performance Analytics Service
 * Tracks and analyzes driver performance metrics for the Munich delivery fleet.
 *
 * Metrics tracked:
 * - Delivery completion rate
 * - On-time delivery rate
 * - Average deliveries per hour
 * - Fuel efficiency (km/L)
 * - POD completion rate
 * - Failed delivery rate
 * - Route adherence
 */

export interface DriverMetrics {
  driverId: string;
  driverName: string;
  employeeNumber?: string;
  period: {
    from: Date;
    to: Date;
  };
  deliveries: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    completionRate: number;
    failedRate: number;
  };
  timing: {
    onTimeDeliveries: number;
    lateDeliveries: number;
    onTimeRate: number;
    averageMinutesPerDelivery: number;
    averageDeliveriesPerHour: number;
  };
  proof: {
    withSignature: number;
    withPhoto: number;
    withBoth: number;
    podCompletionRate: number;
  };
  routes: {
    totalRoutes: number;
    completedRoutes: number;
    averageStopsPerRoute: number;
    totalDistanceKm: number;
  };
  efficiency?: {
    fuelConsumptionL: number;
    kmPerLiter: number;
    costPerDeliveryEur: number;
  };
}

export interface DriverRanking {
  rank: number;
  driverId: string;
  driverName: string;
  score: number;
  metrics: {
    completionRate: number;
    onTimeRate: number;
    podRate: number;
  };
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface PerformanceAlert {
  driverId: string;
  driverName: string;
  alertType: 'LOW_COMPLETION' | 'HIGH_FAILURE' | 'LOW_POD' | 'SLOW_DELIVERIES' | 'FUEL_INEFFICIENT';
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  currentValue: number;
  threshold: number;
  period: string;
}

export interface PerformanceTrend {
  date: string;
  deliveries: number;
  completionRate: number;
  onTimeRate: number;
  avgDeliveriesPerHour: number;
}

// Performance thresholds for Munich delivery operations
const PERFORMANCE_THRESHOLDS = {
  minCompletionRate: 90, // Minimum 90% completion rate
  maxFailureRate: 10, // Maximum 10% failure rate
  minPodRate: 85, // Minimum 85% POD completion
  minOnTimeRate: 80, // Minimum 80% on-time deliveries
  maxMinutesPerDelivery: 20, // Maximum 20 minutes per delivery
  minKmPerLiter: 8, // Minimum 8 km/L fuel efficiency
};

@Injectable()
export class DriverPerformanceService {
  private readonly logger = new Logger(DriverPerformanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =================== DRIVER METRICS ===================

  /**
   * Get comprehensive performance metrics for a driver
   */
  async getDriverMetrics(
    userId: string,
    driverId: string,
    from: Date,
    to: Date,
  ): Promise<DriverMetrics> {
    this.logger.log(`Calculating metrics for driver ${driverId}`);

    // Get driver info
    const driver = await this.prisma.employee.findFirst({
      where: {
        id: driverId,
        userId,
      },
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    // Get all routes for this driver in the date range
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        driverId,
        userId,
        routeDate: {
          gte: from,
          lte: to,
        },
      },
      include: {
        stops: true,
        vehicle: true,
      },
    });

    // Calculate delivery stats
    const allStops = routes.flatMap(r => r.stops);
    const deliveredStops = allStops.filter(s => s.status === 'DELIVERED');
    const failedStops = allStops.filter(s => s.status === 'FAILED');
    const pendingStops = allStops.filter(s => s.status === 'PENDING');

    const totalDeliveries = allStops.length;
    const completedCount = deliveredStops.length;
    const failedCount = failedStops.length;

    // Calculate timing stats
    const stopsWithTiming = deliveredStops.filter(s => s.actualArrival && s.estimatedArrival);
    const onTimeDeliveries = stopsWithTiming.filter(s => {
      const actual = new Date(s.actualArrival!).getTime();
      const estimated = new Date(s.estimatedArrival!).getTime();
      return actual <= estimated + 15 * 60 * 1000; // 15 min grace period
    }).length;

    // Calculate average time per delivery
    const completedRoutes = routes.filter(r => r.status === 'COMPLETED');
    let totalDeliveryMinutes = 0;
    let deliveryCount = 0;

    for (const route of completedRoutes) {
      if (route.actualStartTime && route.actualEndTime) {
        const routeMinutes = (new Date(route.actualEndTime).getTime() - new Date(route.actualStartTime).getTime()) / 60000;
        const routeDeliveries = route.stops.filter(s => s.status === 'DELIVERED').length;
        if (routeDeliveries > 0) {
          totalDeliveryMinutes += routeMinutes;
          deliveryCount += routeDeliveries;
        }
      }
    }

    const avgMinutesPerDelivery = deliveryCount > 0 ? totalDeliveryMinutes / deliveryCount : 0;

    // Calculate POD stats
    const withSignature = deliveredStops.filter(s => s.signature).length;
    const withPhoto = deliveredStops.filter(s => s.photoUrl).length;
    const withBoth = deliveredStops.filter(s => s.signature && s.photoUrl).length;

    // Calculate route stats
    const totalDistanceKm = routes.reduce((sum, r) => sum + (r.actualDistanceKm?.toNumber() || 0), 0);
    const avgStopsPerRoute = routes.length > 0 ? allStops.length / routes.length : 0;

    // Calculate fuel efficiency if fuel data available
    let efficiency: DriverMetrics['efficiency'] = undefined;
    // Get vehicle IDs from the routes and query fuel logs directly
    const vehicleIds = [...new Set(routes.map(r => r.vehicleId))];
    const fuelLogs = vehicleIds.length > 0
      ? await this.prisma.fuelLog.findMany({
          where: {
            vehicleId: { in: vehicleIds },
            fueledAt: { gte: from, lte: to },
          },
        })
      : [];

    if (fuelLogs.length > 0) {
      const totalFuel = fuelLogs.reduce((sum, f) => sum + f.liters.toNumber(), 0);
      const totalCost = fuelLogs.reduce((sum, f) => sum + f.totalCost.toNumber(), 0);
      const kmPerLiter = totalFuel > 0 ? totalDistanceKm / totalFuel : 0;
      const costPerDelivery = completedCount > 0 ? totalCost / completedCount : 0;

      efficiency = {
        fuelConsumptionL: Math.round(totalFuel * 10) / 10,
        kmPerLiter: Math.round(kmPerLiter * 10) / 10,
        costPerDeliveryEur: Math.round(costPerDelivery * 100) / 100,
      };
    }

    return {
      driverId,
      driverName: `${driver.firstName} ${driver.lastName}`,
      employeeNumber: driver.id.slice(-6).toUpperCase(), // Generate from ID
      period: { from, to },
      deliveries: {
        total: totalDeliveries,
        completed: completedCount,
        failed: failedCount,
        pending: pendingStops.length,
        completionRate: totalDeliveries > 0 ? Math.round((completedCount / totalDeliveries) * 1000) / 10 : 0,
        failedRate: totalDeliveries > 0 ? Math.round((failedCount / totalDeliveries) * 1000) / 10 : 0,
      },
      timing: {
        onTimeDeliveries,
        lateDeliveries: stopsWithTiming.length - onTimeDeliveries,
        onTimeRate: stopsWithTiming.length > 0
          ? Math.round((onTimeDeliveries / stopsWithTiming.length) * 1000) / 10
          : 0,
        averageMinutesPerDelivery: Math.round(avgMinutesPerDelivery * 10) / 10,
        averageDeliveriesPerHour: avgMinutesPerDelivery > 0 ? Math.round((60 / avgMinutesPerDelivery) * 10) / 10 : 0,
      },
      proof: {
        withSignature,
        withPhoto,
        withBoth,
        podCompletionRate: completedCount > 0
          ? Math.round(((withSignature + withPhoto - withBoth) / completedCount) * 1000) / 10
          : 0,
      },
      routes: {
        totalRoutes: routes.length,
        completedRoutes: completedRoutes.length,
        averageStopsPerRoute: Math.round(avgStopsPerRoute * 10) / 10,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      },
      efficiency,
    };
  }

  // =================== DRIVER LEADERBOARD ===================

  /**
   * Get driver rankings for a period
   */
  async getDriverRankings(
    userId: string,
    from: Date,
    to: Date,
    limit: number = 10,
  ): Promise<DriverRanking[]> {
    this.logger.log(`Generating driver rankings for period ${from.toISOString()} to ${to.toISOString()}`);

    // Get all drivers who had routes in this period
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
        driverId: { not: null },
      },
      include: {
        driver: true,
        stops: true,
      },
    });

    // Group by driver
    const driverStats: Map<string, {
      name: string;
      totalDeliveries: number;
      completed: number;
      onTime: number;
      withPOD: number;
    }> = new Map();

    for (const route of routes) {
      if (!route.driver) continue;

      const driverId = route.driver.id;
      const driverName = `${route.driver.firstName} ${route.driver.lastName}`;

      if (!driverStats.has(driverId)) {
        driverStats.set(driverId, {
          name: driverName,
          totalDeliveries: 0,
          completed: 0,
          onTime: 0,
          withPOD: 0,
        });
      }

      const stats = driverStats.get(driverId)!;
      const deliveredStops = route.stops.filter(s => s.status === 'DELIVERED');

      stats.totalDeliveries += route.stops.length;
      stats.completed += deliveredStops.length;
      stats.withPOD += deliveredStops.filter(s => s.signature || s.photoUrl).length;

      // Count on-time deliveries
      for (const stop of deliveredStops) {
        if (stop.actualArrival && stop.estimatedArrival) {
          const actual = new Date(stop.actualArrival).getTime();
          const estimated = new Date(stop.estimatedArrival).getTime();
          if (actual <= estimated + 15 * 60 * 1000) {
            stats.onTime++;
          }
        }
      }
    }

    // Calculate scores and rankings
    const rankings: DriverRanking[] = [];

    for (const [driverId, stats] of driverStats.entries()) {
      const completionRate = stats.totalDeliveries > 0
        ? (stats.completed / stats.totalDeliveries) * 100
        : 0;
      const onTimeRate = stats.completed > 0
        ? (stats.onTime / stats.completed) * 100
        : 0;
      const podRate = stats.completed > 0
        ? (stats.withPOD / stats.completed) * 100
        : 0;

      // Weighted score: 40% completion, 30% on-time, 30% POD
      const score = (completionRate * 0.4) + (onTimeRate * 0.3) + (podRate * 0.3);

      rankings.push({
        rank: 0, // Will be set after sorting
        driverId,
        driverName: stats.name,
        score: Math.round(score * 10) / 10,
        metrics: {
          completionRate: Math.round(completionRate * 10) / 10,
          onTimeRate: Math.round(onTimeRate * 10) / 10,
          podRate: Math.round(podRate * 10) / 10,
        },
        trend: 'STABLE', // TODO: Compare with previous period
      });
    }

    // Sort by score descending and assign ranks
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((r, index) => {
      r.rank = index + 1;
    });

    return rankings.slice(0, limit);
  }

  // =================== PERFORMANCE ALERTS ===================

  /**
   * Get performance alerts for underperforming drivers
   */
  async getPerformanceAlerts(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<PerformanceAlert[]> {
    this.logger.log(`Checking performance alerts for user ${userId}`);

    const alerts: PerformanceAlert[] = [];

    // Get all drivers with their metrics
    const drivers = await this.prisma.employee.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    for (const driver of drivers) {
      try {
        const metrics = await this.getDriverMetrics(userId, driver.id, from, to);

        // Skip if no deliveries
        if (metrics.deliveries.total === 0) continue;

        const periodStr = `${from.toLocaleDateString('de-DE')} - ${to.toLocaleDateString('de-DE')}`;

        // Check completion rate
        if (metrics.deliveries.completionRate < PERFORMANCE_THRESHOLDS.minCompletionRate) {
          alerts.push({
            driverId: driver.id,
            driverName: metrics.driverName,
            alertType: 'LOW_COMPLETION',
            severity: metrics.deliveries.completionRate < 80 ? 'CRITICAL' : 'WARNING',
            message: `Niedrige Abschlussrate: ${metrics.deliveries.completionRate}% (Minimum: ${PERFORMANCE_THRESHOLDS.minCompletionRate}%)`,
            currentValue: metrics.deliveries.completionRate,
            threshold: PERFORMANCE_THRESHOLDS.minCompletionRate,
            period: periodStr,
          });
        }

        // Check failure rate
        if (metrics.deliveries.failedRate > PERFORMANCE_THRESHOLDS.maxFailureRate) {
          alerts.push({
            driverId: driver.id,
            driverName: metrics.driverName,
            alertType: 'HIGH_FAILURE',
            severity: metrics.deliveries.failedRate > 15 ? 'CRITICAL' : 'WARNING',
            message: `Hohe Fehlerrate: ${metrics.deliveries.failedRate}% (Maximum: ${PERFORMANCE_THRESHOLDS.maxFailureRate}%)`,
            currentValue: metrics.deliveries.failedRate,
            threshold: PERFORMANCE_THRESHOLDS.maxFailureRate,
            period: periodStr,
          });
        }

        // Check POD rate
        if (metrics.proof.podCompletionRate < PERFORMANCE_THRESHOLDS.minPodRate) {
          alerts.push({
            driverId: driver.id,
            driverName: metrics.driverName,
            alertType: 'LOW_POD',
            severity: metrics.proof.podCompletionRate < 70 ? 'CRITICAL' : 'WARNING',
            message: `Niedrige Zustellnachweis-Rate: ${metrics.proof.podCompletionRate}% (Minimum: ${PERFORMANCE_THRESHOLDS.minPodRate}%)`,
            currentValue: metrics.proof.podCompletionRate,
            threshold: PERFORMANCE_THRESHOLDS.minPodRate,
            period: periodStr,
          });
        }

        // Check delivery speed
        if (metrics.timing.averageMinutesPerDelivery > PERFORMANCE_THRESHOLDS.maxMinutesPerDelivery) {
          alerts.push({
            driverId: driver.id,
            driverName: metrics.driverName,
            alertType: 'SLOW_DELIVERIES',
            severity: metrics.timing.averageMinutesPerDelivery > 25 ? 'CRITICAL' : 'WARNING',
            message: `Langsame Zustellungen: ${metrics.timing.averageMinutesPerDelivery} min/Lieferung (Maximum: ${PERFORMANCE_THRESHOLDS.maxMinutesPerDelivery} min)`,
            currentValue: metrics.timing.averageMinutesPerDelivery,
            threshold: PERFORMANCE_THRESHOLDS.maxMinutesPerDelivery,
            period: periodStr,
          });
        }

        // Check fuel efficiency
        if (metrics.efficiency && metrics.efficiency.kmPerLiter < PERFORMANCE_THRESHOLDS.minKmPerLiter) {
          alerts.push({
            driverId: driver.id,
            driverName: metrics.driverName,
            alertType: 'FUEL_INEFFICIENT',
            severity: metrics.efficiency.kmPerLiter < 6 ? 'CRITICAL' : 'WARNING',
            message: `Niedriger Kraftstoffverbrauch: ${metrics.efficiency.kmPerLiter} km/L (Minimum: ${PERFORMANCE_THRESHOLDS.minKmPerLiter} km/L)`,
            currentValue: metrics.efficiency.kmPerLiter,
            threshold: PERFORMANCE_THRESHOLDS.minKmPerLiter,
            period: periodStr,
          });
        }
      } catch {
        // Skip driver if metrics can't be calculated
      }
    }

    // Sort by severity (CRITICAL first) then by driver name
    alerts.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'CRITICAL' ? -1 : 1;
      }
      return a.driverName.localeCompare(b.driverName);
    });

    return alerts;
  }

  // =================== PERFORMANCE TRENDS ===================

  /**
   * Get daily performance trends for a driver
   */
  async getDriverTrends(
    userId: string,
    driverId: string,
    from: Date,
    to: Date,
  ): Promise<PerformanceTrend[]> {
    this.logger.log(`Getting performance trends for driver ${driverId}`);

    // Verify driver exists
    const driver = await this.prisma.employee.findFirst({
      where: { id: driverId, userId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    // Get all routes in the period
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        driverId,
        userId,
        routeDate: { gte: from, lte: to },
      },
      include: {
        stops: true,
      },
      orderBy: { routeDate: 'asc' },
    });

    // Group by date
    const dailyStats: Map<string, {
      deliveries: number;
      completed: number;
      onTime: number;
      totalMinutes: number;
    }> = new Map();

    for (const route of routes) {
      const dateStr = route.routeDate.toISOString().split('T')[0];

      if (!dailyStats.has(dateStr)) {
        dailyStats.set(dateStr, {
          deliveries: 0,
          completed: 0,
          onTime: 0,
          totalMinutes: 0,
        });
      }

      const stats = dailyStats.get(dateStr)!;
      const deliveredStops = route.stops.filter(s => s.status === 'DELIVERED');

      stats.deliveries += route.stops.length;
      stats.completed += deliveredStops.length;

      // Calculate on-time deliveries
      for (const stop of deliveredStops) {
        if (stop.actualArrival && stop.estimatedArrival) {
          const actual = new Date(stop.actualArrival).getTime();
          const estimated = new Date(stop.estimatedArrival).getTime();
          if (actual <= estimated + 15 * 60 * 1000) {
            stats.onTime++;
          }
        }
      }

      // Calculate route duration
      if (route.actualStartTime && route.actualEndTime) {
        const minutes = (new Date(route.actualEndTime).getTime() - new Date(route.actualStartTime).getTime()) / 60000;
        stats.totalMinutes += minutes;
      }
    }

    // Convert to trend array
    const trends: PerformanceTrend[] = [];

    for (const [date, stats] of dailyStats.entries()) {
      const completionRate = stats.deliveries > 0
        ? Math.round((stats.completed / stats.deliveries) * 1000) / 10
        : 0;
      const onTimeRate = stats.completed > 0
        ? Math.round((stats.onTime / stats.completed) * 1000) / 10
        : 0;
      const avgMinutesPerDelivery = stats.completed > 0
        ? stats.totalMinutes / stats.completed
        : 0;
      const avgDeliveriesPerHour = avgMinutesPerDelivery > 0
        ? Math.round((60 / avgMinutesPerDelivery) * 10) / 10
        : 0;

      trends.push({
        date,
        deliveries: stats.deliveries,
        completionRate,
        onTimeRate,
        avgDeliveriesPerHour,
      });
    }

    return trends;
  }

  // =================== TEAM SUMMARY ===================

  /**
   * Get team performance summary
   */
  async getTeamSummary(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{
    totalDrivers: number;
    activeDrivers: number;
    totalDeliveries: number;
    avgCompletionRate: number;
    avgOnTimeRate: number;
    avgPodRate: number;
    topPerformer: { name: string; score: number } | null;
    alertCount: { warning: number; critical: number };
  }> {
    this.logger.log(`Getting team summary for user ${userId}`);

    // Get rankings
    const rankings = await this.getDriverRankings(userId, from, to, 100);

    // Get alerts
    const alerts = await this.getPerformanceAlerts(userId, from, to);

    // Calculate averages
    const activeDrivers = rankings.length;
    const totalDeliveries = await this.prisma.deliveryStop.count({
      where: {
        route: {
          userId,
          routeDate: { gte: from, lte: to },
        },
      },
    });

    const avgCompletionRate = activeDrivers > 0
      ? rankings.reduce((sum, r) => sum + r.metrics.completionRate, 0) / activeDrivers
      : 0;
    const avgOnTimeRate = activeDrivers > 0
      ? rankings.reduce((sum, r) => sum + r.metrics.onTimeRate, 0) / activeDrivers
      : 0;
    const avgPodRate = activeDrivers > 0
      ? rankings.reduce((sum, r) => sum + r.metrics.podRate, 0) / activeDrivers
      : 0;

    // Get total drivers count
    const totalDrivers = await this.prisma.employee.count({
      where: { userId, status: 'ACTIVE' },
    });

    return {
      totalDrivers,
      activeDrivers,
      totalDeliveries,
      avgCompletionRate: Math.round(avgCompletionRate * 10) / 10,
      avgOnTimeRate: Math.round(avgOnTimeRate * 10) / 10,
      avgPodRate: Math.round(avgPodRate * 10) / 10,
      topPerformer: rankings.length > 0
        ? { name: rankings[0].driverName, score: rankings[0].score }
        : null,
      alertCount: {
        warning: alerts.filter(a => a.severity === 'WARNING').length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
      },
    };
  }

  // =================== COMPARISON ===================

  /**
   * Compare two drivers' performance
   */
  async compareDrivers(
    userId: string,
    driverAId: string,
    driverBId: string,
    from: Date,
    to: Date,
  ): Promise<{
    driverA: DriverMetrics;
    driverB: DriverMetrics;
    comparison: {
      completionRateDiff: number;
      onTimeRateDiff: number;
      podRateDiff: number;
      deliveriesPerHourDiff: number;
      winner: 'A' | 'B' | 'TIE';
    };
  }> {
    this.logger.log(`Comparing drivers ${driverAId} vs ${driverBId}`);

    const [driverA, driverB] = await Promise.all([
      this.getDriverMetrics(userId, driverAId, from, to),
      this.getDriverMetrics(userId, driverBId, from, to),
    ]);

    const completionRateDiff = driverA.deliveries.completionRate - driverB.deliveries.completionRate;
    const onTimeRateDiff = driverA.timing.onTimeRate - driverB.timing.onTimeRate;
    const podRateDiff = driverA.proof.podCompletionRate - driverB.proof.podCompletionRate;
    const deliveriesPerHourDiff = driverA.timing.averageDeliveriesPerHour - driverB.timing.averageDeliveriesPerHour;

    // Calculate overall winner
    const scoreA = driverA.deliveries.completionRate * 0.4 +
      driverA.timing.onTimeRate * 0.3 +
      driverA.proof.podCompletionRate * 0.3;
    const scoreB = driverB.deliveries.completionRate * 0.4 +
      driverB.timing.onTimeRate * 0.3 +
      driverB.proof.podCompletionRate * 0.3;

    let winner: 'A' | 'B' | 'TIE';
    if (Math.abs(scoreA - scoreB) < 1) {
      winner = 'TIE';
    } else {
      winner = scoreA > scoreB ? 'A' : 'B';
    }

    return {
      driverA,
      driverB,
      comparison: {
        completionRateDiff: Math.round(completionRateDiff * 10) / 10,
        onTimeRateDiff: Math.round(onTimeRateDiff * 10) / 10,
        podRateDiff: Math.round(podRateDiff * 10) / 10,
        deliveriesPerHourDiff: Math.round(deliveriesPerHourDiff * 10) / 10,
        winner,
      },
    };
  }
}
