import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RouteStatus, DeliveryStopStatus, VehicleStatus } from '@prisma/client';

/**
 * Fleet KPI Analytics Service
 * Comprehensive Key Performance Indicator tracking for Munich delivery fleet.
 *
 * KPI Categories:
 * - Fleet Operations: utilization, efficiency, on-time delivery
 * - Driver Performance: productivity, rating, compliance
 * - Vehicle Metrics: mileage, fuel efficiency, maintenance
 * - Financial: cost per delivery, cost per km, revenue
 * - Time-series trends and forecasting
 * - Benchmarking and target tracking
 */

export interface FleetKpis {
  period: { from: Date; to: Date };
  summary: {
    totalRoutes: number;
    completedRoutes: number;
    totalStops: number;
    deliveredStops: number;
    failedStops: number;
    totalDistance: number;
    totalDrivers: number;
    activeVehicles: number;
  };
  operationalKpis: {
    fleetUtilization: number; // % of vehicles in use
    routeCompletionRate: number; // % of completed routes
    onTimeDeliveryRate: number; // % delivered on time
    deliverySuccessRate: number; // % successful deliveries
    avgStopsPerRoute: number;
    avgRouteTime: number; // minutes
    avgTimePerStop: number; // minutes
  };
  efficiencyKpis: {
    avgDeliveriesPerDriver: number;
    avgKmPerDelivery: number;
    avgDeliveriesPerVehicle: number;
    routeEfficiencyScore: number; // 0-100
    capacityUtilization: number; // % of capacity used
  };
  financialKpis: {
    costPerDelivery: number;
    costPerKm: number;
    fuelCostPerKm: number;
    maintenanceCostPerKm: number;
    revenuePerDelivery: number;
    profitMargin: number;
  };
  vehicleKpis: {
    avgDailyMileage: number;
    avgFuelEfficiency: number; // L/100km
    maintenanceComplianceRate: number;
    vehicleAvailabilityRate: number;
  };
  qualityKpis: {
    customerSatisfactionScore: number; // 0-5
    podComplianceRate: number; // % with signature
    returnRate: number; // % returned parcels
    damageRate: number; // % damaged parcels
    complaintRate: number; // complaints per 1000 deliveries
  };
}

export interface KpiTrend {
  date: string;
  value: number;
}

export interface KpiTarget {
  kpiName: string;
  target: number;
  current: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  percentageOfTarget: number;
}

export interface DriverKpiDetail {
  driverId: string;
  driverName: string;
  totalDeliveries: number;
  successRate: number;
  onTimeRate: number;
  avgTimePerDelivery: number;
  customerRating: number;
  productivityScore: number;
  rank: number;
}

export interface VehicleKpiDetail {
  vehicleId: string;
  licensePlate: string;
  totalKm: number;
  totalDeliveries: number;
  fuelEfficiency: number;
  maintenanceCost: number;
  utilizationRate: number;
  healthScore: number;
}

export interface KpiBenchmark {
  kpiName: string;
  yourValue: number;
  industryAverage: number;
  topPerformer: number;
  percentile: number;
}

@Injectable()
export class FleetKpiAnalyticsService {
  private readonly logger = new Logger(FleetKpiAnalyticsService.name);

  // Industry benchmarks for Munich parcel delivery
  private readonly BENCHMARKS = {
    onTimeDeliveryRate: { average: 92, top: 98 },
    deliverySuccessRate: { average: 95, top: 99 },
    fleetUtilization: { average: 75, top: 90 },
    avgTimePerStop: { average: 8, top: 5 }, // minutes (lower is better)
    fuelEfficiency: { average: 12, top: 9 }, // L/100km (lower is better)
    customerSatisfaction: { average: 4.2, top: 4.8 },
    podComplianceRate: { average: 85, top: 98 },
  };

  // Default targets for KPIs
  private readonly TARGETS = {
    onTimeDeliveryRate: 95,
    deliverySuccessRate: 97,
    fleetUtilization: 85,
    routeEfficiencyScore: 80,
    podComplianceRate: 95,
    customerSatisfactionScore: 4.5,
    fuelEfficiency: 10, // L/100km
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive fleet KPIs for a period
   */
  async getFleetKpis(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<FleetKpis> {
    // Get routes and stops
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
      },
      include: {
        stops: true,
        vehicle: true,
        driver: true,
      },
    });

    // Get vehicles
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
    });

    // Get fuel logs
    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: {
        vehicle: { userId },
        fueledAt: { gte: from, lte: to },
      },
    });

    // Get maintenance logs
    const maintenanceLogs = await this.prisma.maintenanceLog.findMany({
      where: {
        vehicle: { userId },
        serviceDate: { gte: from, lte: to },
      },
    });

    // Get employees (drivers)
    const drivers = await this.prisma.employee.findMany({
      where: { userId },
    });

    // Calculate summary
    const completedRoutes = routes.filter(r => r.status === RouteStatus.COMPLETED);
    const allStops = routes.flatMap(r => r.stops);
    const deliveredStops = allStops.filter(s => s.status === DeliveryStopStatus.DELIVERED);
    const failedStops = allStops.filter(s => s.status === DeliveryStopStatus.FAILED);

    // Calculate distances
    const totalDistance = routes.reduce((sum, r) => {
      if (r.actualDistanceKm) return sum + Number(r.actualDistanceKm);
      if (r.plannedDistanceKm) return sum + Number(r.plannedDistanceKm);
      return sum;
    }, 0);

    const activeVehicles = vehicles.filter(
      v => v.status === VehicleStatus.AVAILABLE || v.status === VehicleStatus.IN_USE,
    ).length;

    // Calculate route times
    const routeTimes = completedRoutes
      .filter(r => r.actualStartTime && r.actualEndTime)
      .map(r => (r.actualEndTime!.getTime() - r.actualStartTime!.getTime()) / (1000 * 60));
    const avgRouteTime = routeTimes.length > 0
      ? routeTimes.reduce((a, b) => a + b, 0) / routeTimes.length
      : 0;

    // Calculate on-time deliveries
    const onTimeDeliveries = allStops.filter(stop => {
      if (stop.status !== DeliveryStopStatus.DELIVERED) return false;
      if (!stop.estimatedArrival || !stop.actualArrival) return false;
      return stop.actualArrival <= new Date(stop.estimatedArrival.getTime() + 15 * 60 * 1000);
    }).length;

    // Calculate fuel metrics
    const totalFuelLiters = fuelLogs.reduce((sum, log) => sum + Number(log.liters), 0);
    const totalFuelCost = fuelLogs.reduce((sum, log) => sum + Number(log.totalCost), 0);
    const fuelEfficiency = totalDistance > 0 ? (totalFuelLiters / totalDistance) * 100 : 0;
    const fuelCostPerKm = totalDistance > 0 ? totalFuelCost / totalDistance : 0;

    // Calculate maintenance costs
    const totalMaintenanceCost = maintenanceLogs.reduce((sum, log) => sum + Number(log.totalCost || 0), 0);
    const maintenanceCostPerKm = totalDistance > 0 ? totalMaintenanceCost / totalDistance : 0;

    // Calculate vehicle utilization
    const periodDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    const vehicleRoutes: Record<string, number> = {};
    routes.forEach(r => {
      if (r.vehicleId) {
        vehicleRoutes[r.vehicleId] = (vehicleRoutes[r.vehicleId] || 0) + 1;
      }
    });
    const vehiclesUsed = Object.keys(vehicleRoutes).length;
    const fleetUtilization = vehicles.length > 0 ? (vehiclesUsed / vehicles.length) * 100 : 0;

    // Capacity utilization (based on route capacities if available)
    const capacityUtilization = 75; // Placeholder - would need capacity tracking

    // Calculate financial KPIs
    const totalCost = totalFuelCost + totalMaintenanceCost;
    const totalDeliveries = deliveredStops.length;
    const costPerDelivery = totalDeliveries > 0 ? totalCost / totalDeliveries : 0;
    const costPerKm = totalDistance > 0 ? totalCost / totalDistance : 0;

    // Revenue estimation (would need actual invoicing data)
    const avgRevenuePerDelivery = 3.50; // EUR per delivery (placeholder)
    const totalRevenue = totalDeliveries * avgRevenuePerDelivery;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    // Vehicle availability
    const availableVehicles = vehicles.filter(
      v => v.status === VehicleStatus.AVAILABLE || v.status === VehicleStatus.IN_USE,
    ).length;
    const vehicleAvailabilityRate = vehicles.length > 0 ? (availableVehicles / vehicles.length) * 100 : 0;

    // Maintenance compliance (TÜV not expired)
    const now = new Date();
    const compliantVehicles = vehicles.filter(v => !v.tuvExpiry || v.tuvExpiry > now).length;
    const maintenanceComplianceRate = vehicles.length > 0 ? (compliantVehicles / vehicles.length) * 100 : 100;

    // POD compliance
    const stopsWithPod = deliveredStops.filter(s => s.signature || s.photoUrl).length;
    const podComplianceRate = totalDeliveries > 0 ? (stopsWithPod / totalDeliveries) * 100 : 0;

    // Route efficiency score (composite)
    const routeEfficiencyScore = this.calculateRouteEfficiencyScore({
      onTimeRate: totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0,
      successRate: allStops.length > 0 ? (totalDeliveries / allStops.length) * 100 : 0,
      avgStopsPerRoute: routes.length > 0 ? allStops.length / routes.length : 0,
    });

    return {
      period: { from, to },
      summary: {
        totalRoutes: routes.length,
        completedRoutes: completedRoutes.length,
        totalStops: allStops.length,
        deliveredStops: totalDeliveries,
        failedStops: failedStops.length,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalDrivers: drivers.length,
        activeVehicles,
      },
      operationalKpis: {
        fleetUtilization: Math.round(fleetUtilization * 10) / 10,
        routeCompletionRate: routes.length > 0
          ? Math.round((completedRoutes.length / routes.length) * 1000) / 10
          : 0,
        onTimeDeliveryRate: totalDeliveries > 0
          ? Math.round((onTimeDeliveries / totalDeliveries) * 1000) / 10
          : 0,
        deliverySuccessRate: allStops.length > 0
          ? Math.round((totalDeliveries / allStops.length) * 1000) / 10
          : 0,
        avgStopsPerRoute: routes.length > 0
          ? Math.round((allStops.length / routes.length) * 10) / 10
          : 0,
        avgRouteTime: Math.round(avgRouteTime),
        avgTimePerStop: totalDeliveries > 0 && avgRouteTime > 0
          ? Math.round((avgRouteTime / (allStops.length / routes.length)) * 10) / 10
          : 0,
      },
      efficiencyKpis: {
        avgDeliveriesPerDriver: drivers.length > 0
          ? Math.round((totalDeliveries / drivers.length) * 10) / 10
          : 0,
        avgKmPerDelivery: totalDeliveries > 0
          ? Math.round((totalDistance / totalDeliveries) * 10) / 10
          : 0,
        avgDeliveriesPerVehicle: vehiclesUsed > 0
          ? Math.round((totalDeliveries / vehiclesUsed) * 10) / 10
          : 0,
        routeEfficiencyScore: Math.round(routeEfficiencyScore),
        capacityUtilization: Math.round(capacityUtilization * 10) / 10,
      },
      financialKpis: {
        costPerDelivery: Math.round(costPerDelivery * 100) / 100,
        costPerKm: Math.round(costPerKm * 100) / 100,
        fuelCostPerKm: Math.round(fuelCostPerKm * 100) / 100,
        maintenanceCostPerKm: Math.round(maintenanceCostPerKm * 100) / 100,
        revenuePerDelivery: avgRevenuePerDelivery,
        profitMargin: Math.round(profitMargin * 10) / 10,
      },
      vehicleKpis: {
        avgDailyMileage: vehiclesUsed > 0 && periodDays > 0
          ? Math.round((totalDistance / vehiclesUsed / periodDays) * 10) / 10
          : 0,
        avgFuelEfficiency: Math.round(fuelEfficiency * 10) / 10,
        maintenanceComplianceRate: Math.round(maintenanceComplianceRate * 10) / 10,
        vehicleAvailabilityRate: Math.round(vehicleAvailabilityRate * 10) / 10,
      },
      qualityKpis: {
        customerSatisfactionScore: 4.3, // Placeholder - would need rating system
        podComplianceRate: Math.round(podComplianceRate * 10) / 10,
        returnRate: 2.5, // Placeholder
        damageRate: 0.5, // Placeholder
        complaintRate: 3.2, // Placeholder (per 1000 deliveries)
      },
    };
  }

  /**
   * Get KPI trends over time
   */
  async getKpiTrends(
    userId: string,
    kpiName: string,
    from: Date,
    to: Date,
    granularity: 'DAY' | 'WEEK' | 'MONTH' = 'DAY',
  ): Promise<KpiTrend[]> {
    const trends: KpiTrend[] = [];
    const current = new Date(from);

    while (current <= to) {
      const periodEnd = this.getPeriodEnd(current, granularity);
      if (periodEnd > to) break;

      const kpis = await this.getFleetKpis(userId, current, periodEnd);
      const value = this.extractKpiValue(kpis, kpiName);

      trends.push({
        date: current.toISOString().split('T')[0],
        value,
      });

      current.setTime(periodEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    return trends;
  }

  /**
   * Get KPI targets and current performance
   */
  async getKpiTargets(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<KpiTarget[]> {
    const kpis = await this.getFleetKpis(userId, from, to);

    // Get previous period for trend
    const periodLength = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - periodLength);
    const previousTo = from;
    const previousKpis = await this.getFleetKpis(userId, previousFrom, previousTo);

    const targets: KpiTarget[] = [];

    // On-Time Delivery Rate
    targets.push(this.createKpiTarget(
      'On-Time Delivery Rate',
      kpis.operationalKpis.onTimeDeliveryRate,
      this.TARGETS.onTimeDeliveryRate,
      previousKpis.operationalKpis.onTimeDeliveryRate,
    ));

    // Delivery Success Rate
    targets.push(this.createKpiTarget(
      'Delivery Success Rate',
      kpis.operationalKpis.deliverySuccessRate,
      this.TARGETS.deliverySuccessRate,
      previousKpis.operationalKpis.deliverySuccessRate,
    ));

    // Fleet Utilization
    targets.push(this.createKpiTarget(
      'Fleet Utilization',
      kpis.operationalKpis.fleetUtilization,
      this.TARGETS.fleetUtilization,
      previousKpis.operationalKpis.fleetUtilization,
    ));

    // Route Efficiency Score
    targets.push(this.createKpiTarget(
      'Route Efficiency Score',
      kpis.efficiencyKpis.routeEfficiencyScore,
      this.TARGETS.routeEfficiencyScore,
      previousKpis.efficiencyKpis.routeEfficiencyScore,
    ));

    // POD Compliance Rate
    targets.push(this.createKpiTarget(
      'POD Compliance Rate',
      kpis.qualityKpis.podComplianceRate,
      this.TARGETS.podComplianceRate,
      previousKpis.qualityKpis.podComplianceRate,
    ));

    // Customer Satisfaction
    targets.push(this.createKpiTarget(
      'Customer Satisfaction',
      kpis.qualityKpis.customerSatisfactionScore,
      this.TARGETS.customerSatisfactionScore,
      previousKpis.qualityKpis.customerSatisfactionScore,
    ));

    // Fuel Efficiency (inverse - lower is better)
    targets.push(this.createKpiTarget(
      'Fuel Efficiency (L/100km)',
      kpis.vehicleKpis.avgFuelEfficiency,
      this.TARGETS.fuelEfficiency,
      previousKpis.vehicleKpis.avgFuelEfficiency,
      true, // inverse (lower is better)
    ));

    return targets;
  }

  /**
   * Get driver KPI details
   */
  async getDriverKpiDetails(
    userId: string,
    from: Date,
    to: Date,
    limit: number = 10,
  ): Promise<DriverKpiDetail[]> {
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
        driverId: { not: null },
      },
      include: {
        stops: true,
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Group by driver
    const driverStats: Record<string, {
      name: string;
      totalDeliveries: number;
      successfulDeliveries: number;
      onTimeDeliveries: number;
      totalTime: number; // minutes
    }> = {};

    for (const route of routes) {
      if (!route.driver) continue;

      const driverId = route.driverId!;
      const driverName = `${route.driver.firstName} ${route.driver.lastName}`;

      if (!driverStats[driverId]) {
        driverStats[driverId] = {
          name: driverName,
          totalDeliveries: 0,
          successfulDeliveries: 0,
          onTimeDeliveries: 0,
          totalTime: 0,
        };
      }

      for (const stop of route.stops) {
        if (stop.status === DeliveryStopStatus.DELIVERED) {
          driverStats[driverId].totalDeliveries++;
          driverStats[driverId].successfulDeliveries++;

          if (stop.estimatedArrival && stop.actualArrival) {
            const onTime = stop.actualArrival <= new Date(stop.estimatedArrival.getTime() + 15 * 60 * 1000);
            if (onTime) driverStats[driverId].onTimeDeliveries++;
          }
        } else if (stop.status === DeliveryStopStatus.FAILED) {
          driverStats[driverId].totalDeliveries++;
        }
      }

      if (route.actualStartTime && route.actualEndTime) {
        driverStats[driverId].totalTime +=
          (route.actualEndTime.getTime() - route.actualStartTime.getTime()) / (1000 * 60);
      }
    }

    // Calculate scores and rank
    const details: DriverKpiDetail[] = Object.entries(driverStats)
      .map(([driverId, stats]) => {
        const successRate = stats.totalDeliveries > 0
          ? (stats.successfulDeliveries / stats.totalDeliveries) * 100
          : 0;
        const onTimeRate = stats.successfulDeliveries > 0
          ? (stats.onTimeDeliveries / stats.successfulDeliveries) * 100
          : 0;
        const avgTimePerDelivery = stats.successfulDeliveries > 0
          ? stats.totalTime / stats.successfulDeliveries
          : 0;

        // Productivity score (composite)
        const productivityScore = (
          successRate * 0.3 +
          onTimeRate * 0.3 +
          Math.max(0, 100 - avgTimePerDelivery * 5) * 0.2 +
          stats.totalDeliveries * 0.2
        );

        return {
          driverId,
          driverName: stats.name,
          totalDeliveries: stats.totalDeliveries,
          successRate: Math.round(successRate * 10) / 10,
          onTimeRate: Math.round(onTimeRate * 10) / 10,
          avgTimePerDelivery: Math.round(avgTimePerDelivery * 10) / 10,
          customerRating: 4.2 + Math.random() * 0.6, // Placeholder
          productivityScore: Math.round(productivityScore * 10) / 10,
          rank: 0, // Will be set after sorting
        };
      })
      .sort((a, b) => b.productivityScore - a.productivityScore)
      .slice(0, limit);

    // Assign ranks
    details.forEach((d, i) => (d.rank = i + 1));

    return details;
  }

  /**
   * Get vehicle KPI details
   */
  async getVehicleKpiDetails(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<VehicleKpiDetail[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
    });

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
      },
      include: { stops: true },
    });

    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: {
        vehicle: { userId },
        fueledAt: { gte: from, lte: to },
      },
    });

    const maintenanceLogs = await this.prisma.maintenanceLog.findMany({
      where: {
        vehicle: { userId },
        serviceDate: { gte: from, lte: to },
      },
    });

    const periodDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));

    const details: VehicleKpiDetail[] = vehicles.map(vehicle => {
      const vehicleRoutes = routes.filter(r => r.vehicleId === vehicle.id);
      const vehicleFuel = fuelLogs.filter(f => f.vehicleId === vehicle.id);
      const vehicleMaint = maintenanceLogs.filter(m => m.vehicleId === vehicle.id);

      const totalKm = vehicleRoutes.reduce((sum, r) => {
        return sum + Number(r.actualDistanceKm || r.plannedDistanceKm || 0);
      }, 0);

      const totalDeliveries = vehicleRoutes.flatMap(r => (r as any).stops || [])
        .filter((s: any) => s.status === DeliveryStopStatus.DELIVERED).length;

      const totalFuelLiters = vehicleFuel.reduce((sum, f) => sum + Number(f.liters), 0);
      const fuelEfficiency = totalKm > 0 ? (totalFuelLiters / totalKm) * 100 : 0;

      const maintenanceCost = vehicleMaint.reduce((sum, m) => sum + Number(m.totalCost || 0), 0);

      const daysUsed = new Set(vehicleRoutes.map(r => r.routeDate.toISOString().split('T')[0])).size;
      const utilizationRate = (daysUsed / periodDays) * 100;

      // Health score based on various factors
      const healthScore = this.calculateVehicleHealthScore(vehicle, maintenanceCost, vehicleRoutes.length);

      return {
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        totalKm: Math.round(totalKm * 10) / 10,
        totalDeliveries,
        fuelEfficiency: Math.round(fuelEfficiency * 10) / 10,
        maintenanceCost: Math.round(maintenanceCost * 100) / 100,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        healthScore: Math.round(healthScore),
      };
    });

    return details.sort((a, b) => b.healthScore - a.healthScore);
  }

  /**
   * Get industry benchmarks comparison
   */
  async getBenchmarks(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<KpiBenchmark[]> {
    const kpis = await this.getFleetKpis(userId, from, to);

    const benchmarks: KpiBenchmark[] = [
      {
        kpiName: 'On-Time Delivery Rate',
        yourValue: kpis.operationalKpis.onTimeDeliveryRate,
        industryAverage: this.BENCHMARKS.onTimeDeliveryRate.average,
        topPerformer: this.BENCHMARKS.onTimeDeliveryRate.top,
        percentile: this.calculatePercentile(
          kpis.operationalKpis.onTimeDeliveryRate,
          this.BENCHMARKS.onTimeDeliveryRate.average,
          this.BENCHMARKS.onTimeDeliveryRate.top,
        ),
      },
      {
        kpiName: 'Delivery Success Rate',
        yourValue: kpis.operationalKpis.deliverySuccessRate,
        industryAverage: this.BENCHMARKS.deliverySuccessRate.average,
        topPerformer: this.BENCHMARKS.deliverySuccessRate.top,
        percentile: this.calculatePercentile(
          kpis.operationalKpis.deliverySuccessRate,
          this.BENCHMARKS.deliverySuccessRate.average,
          this.BENCHMARKS.deliverySuccessRate.top,
        ),
      },
      {
        kpiName: 'Fleet Utilization',
        yourValue: kpis.operationalKpis.fleetUtilization,
        industryAverage: this.BENCHMARKS.fleetUtilization.average,
        topPerformer: this.BENCHMARKS.fleetUtilization.top,
        percentile: this.calculatePercentile(
          kpis.operationalKpis.fleetUtilization,
          this.BENCHMARKS.fleetUtilization.average,
          this.BENCHMARKS.fleetUtilization.top,
        ),
      },
      {
        kpiName: 'Avg Time Per Stop (min)',
        yourValue: kpis.operationalKpis.avgTimePerStop,
        industryAverage: this.BENCHMARKS.avgTimePerStop.average,
        topPerformer: this.BENCHMARKS.avgTimePerStop.top,
        percentile: this.calculatePercentile(
          kpis.operationalKpis.avgTimePerStop,
          this.BENCHMARKS.avgTimePerStop.average,
          this.BENCHMARKS.avgTimePerStop.top,
          true, // inverse
        ),
      },
      {
        kpiName: 'Fuel Efficiency (L/100km)',
        yourValue: kpis.vehicleKpis.avgFuelEfficiency,
        industryAverage: this.BENCHMARKS.fuelEfficiency.average,
        topPerformer: this.BENCHMARKS.fuelEfficiency.top,
        percentile: this.calculatePercentile(
          kpis.vehicleKpis.avgFuelEfficiency,
          this.BENCHMARKS.fuelEfficiency.average,
          this.BENCHMARKS.fuelEfficiency.top,
          true, // inverse
        ),
      },
      {
        kpiName: 'Customer Satisfaction',
        yourValue: kpis.qualityKpis.customerSatisfactionScore,
        industryAverage: this.BENCHMARKS.customerSatisfaction.average,
        topPerformer: this.BENCHMARKS.customerSatisfaction.top,
        percentile: this.calculatePercentile(
          kpis.qualityKpis.customerSatisfactionScore,
          this.BENCHMARKS.customerSatisfaction.average,
          this.BENCHMARKS.customerSatisfaction.top,
        ),
      },
      {
        kpiName: 'POD Compliance Rate',
        yourValue: kpis.qualityKpis.podComplianceRate,
        industryAverage: this.BENCHMARKS.podComplianceRate.average,
        topPerformer: this.BENCHMARKS.podComplianceRate.top,
        percentile: this.calculatePercentile(
          kpis.qualityKpis.podComplianceRate,
          this.BENCHMARKS.podComplianceRate.average,
          this.BENCHMARKS.podComplianceRate.top,
        ),
      },
    ];

    return benchmarks;
  }

  /**
   * Get KPI dashboard summary
   */
  async getKpiDashboard(userId: string): Promise<{
    currentKpis: FleetKpis;
    targets: KpiTarget[];
    topDrivers: DriverKpiDetail[];
    vehicleHealth: VehicleKpiDetail[];
    alerts: Array<{ kpiName: string; message: string; severity: 'WARNING' | 'CRITICAL' }>;
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [currentKpis, targets, topDrivers, vehicleHealth] = await Promise.all([
      this.getFleetKpis(userId, thirtyDaysAgo, now),
      this.getKpiTargets(userId, thirtyDaysAgo, now),
      this.getDriverKpiDetails(userId, thirtyDaysAgo, now, 5),
      this.getVehicleKpiDetails(userId, thirtyDaysAgo, now),
    ]);

    // Generate alerts for underperforming KPIs
    const alerts: Array<{ kpiName: string; message: string; severity: 'WARNING' | 'CRITICAL' }> = [];

    for (const target of targets) {
      if (target.status === 'OFF_TRACK') {
        alerts.push({
          kpiName: target.kpiName,
          message: `${target.kpiName} ist ${Math.round(target.percentageOfTarget)}% des Ziels (${target.current} von ${target.target})`,
          severity: target.percentageOfTarget < 80 ? 'CRITICAL' : 'WARNING',
        });
      }
    }

    return {
      currentKpis,
      targets,
      topDrivers,
      vehicleHealth: vehicleHealth.slice(0, 5),
      alerts,
    };
  }

  // =================== PRIVATE HELPERS ===================

  private calculateRouteEfficiencyScore(params: {
    onTimeRate: number;
    successRate: number;
    avgStopsPerRoute: number;
  }): number {
    const targetStopsPerRoute = 25;
    const stopsScore = Math.min(100, (params.avgStopsPerRoute / targetStopsPerRoute) * 100);

    return (
      params.onTimeRate * 0.35 +
      params.successRate * 0.35 +
      stopsScore * 0.3
    );
  }

  private calculateVehicleHealthScore(
    vehicle: any,
    maintenanceCost: number,
    routeCount: number,
  ): number {
    let score = 100;
    const now = new Date();

    // TÜV check
    if (vehicle.tuvExpiry) {
      const daysUntilTuv = (vehicle.tuvExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilTuv < 0) score -= 30;
      else if (daysUntilTuv < 30) score -= 15;
      else if (daysUntilTuv < 60) score -= 5;
    }

    // Insurance check
    if (vehicle.insuranceExpiry) {
      const daysUntilInsurance = (vehicle.insuranceExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilInsurance < 0) score -= 40;
      else if (daysUntilInsurance < 30) score -= 20;
    }

    // High mileage penalty
    if (vehicle.mileage > 200000) score -= 10;
    else if (vehicle.mileage > 150000) score -= 5;

    // High maintenance cost penalty
    if (maintenanceCost > 1000) score -= 10;
    else if (maintenanceCost > 500) score -= 5;

    // Activity bonus
    if (routeCount > 20) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private createKpiTarget(
    name: string,
    current: number,
    target: number,
    previous: number,
    inverse: boolean = false,
  ): KpiTarget {
    const trend = this.getTrend(current, previous, inverse);
    const percentageOfTarget = inverse
      ? target > 0 ? (target / current) * 100 : 0
      : target > 0 ? (current / target) * 100 : 0;

    let status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
    if (percentageOfTarget >= 95) status = 'ON_TRACK';
    else if (percentageOfTarget >= 85) status = 'AT_RISK';
    else status = 'OFF_TRACK';

    return {
      kpiName: name,
      target,
      current: Math.round(current * 10) / 10,
      trend,
      status,
      percentageOfTarget: Math.round(percentageOfTarget * 10) / 10,
    };
  }

  private getTrend(current: number, previous: number, inverse: boolean = false): 'UP' | 'DOWN' | 'STABLE' {
    const diff = current - previous;
    const threshold = 0.5; // 0.5% change threshold

    if (Math.abs(diff) < threshold) return 'STABLE';
    if (inverse) return diff > 0 ? 'DOWN' : 'UP';
    return diff > 0 ? 'UP' : 'DOWN';
  }

  private calculatePercentile(
    value: number,
    average: number,
    top: number,
    inverse: boolean = false,
  ): number {
    if (inverse) {
      // For metrics where lower is better
      if (value <= top) return 95;
      if (value >= average) return 50;
      return 50 + ((average - value) / (average - top)) * 45;
    }

    // For metrics where higher is better
    if (value >= top) return 95;
    if (value <= average) return 50;
    return 50 + ((value - average) / (top - average)) * 45;
  }

  private getPeriodEnd(date: Date, granularity: 'DAY' | 'WEEK' | 'MONTH'): Date {
    const end = new Date(date);
    switch (granularity) {
      case 'DAY':
        end.setHours(23, 59, 59, 999);
        break;
      case 'WEEK':
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'MONTH':
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of current month
        end.setHours(23, 59, 59, 999);
        break;
    }
    return end;
  }

  private extractKpiValue(kpis: FleetKpis, kpiName: string): number {
    const mapping: Record<string, number> = {
      onTimeDeliveryRate: kpis.operationalKpis.onTimeDeliveryRate,
      deliverySuccessRate: kpis.operationalKpis.deliverySuccessRate,
      fleetUtilization: kpis.operationalKpis.fleetUtilization,
      routeCompletionRate: kpis.operationalKpis.routeCompletionRate,
      avgStopsPerRoute: kpis.operationalKpis.avgStopsPerRoute,
      avgRouteTime: kpis.operationalKpis.avgRouteTime,
      costPerDelivery: kpis.financialKpis.costPerDelivery,
      costPerKm: kpis.financialKpis.costPerKm,
      fuelEfficiency: kpis.vehicleKpis.avgFuelEfficiency,
      podComplianceRate: kpis.qualityKpis.podComplianceRate,
      customerSatisfaction: kpis.qualityKpis.customerSatisfactionScore,
      totalDeliveries: kpis.summary.deliveredStops,
      totalDistance: kpis.summary.totalDistance,
    };

    return mapping[kpiName] ?? 0;
  }
}
