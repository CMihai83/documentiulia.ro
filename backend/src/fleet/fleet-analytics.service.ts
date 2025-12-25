import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Fleet Analytics Service
 * Advanced KPIs and reporting for logistics operations
 * Tracks: delivery performance, fuel efficiency, driver productivity, costs
 */
@Injectable()
export class FleetAnalyticsService {
  private readonly logger = new Logger(FleetAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =================== DELIVERY KPIs ===================

  /**
   * Get on-time delivery rate
   */
  async getOnTimeDeliveryRate(userId: string, period: { from: Date; to: Date }) {
    const stops = await this.prisma.deliveryStop.findMany({
      where: {
        route: {
          userId,
          routeDate: { gte: period.from, lte: period.to },
        },
      },
      select: {
        status: true,
        estimatedArrival: true,
        actualArrival: true,
        completedAt: true,
      },
    });

    const delivered = stops.filter(s => s.status === 'DELIVERED');
    const onTime = delivered.filter(s => {
      if (!s.estimatedArrival || !s.completedAt) return true;
      // Consider on-time if within 30 minutes of estimated arrival
      const diff = Math.abs(s.completedAt.getTime() - s.estimatedArrival.getTime());
      return diff <= 30 * 60 * 1000;
    });

    return {
      totalDeliveries: delivered.length,
      onTimeDeliveries: onTime.length,
      onTimeRate: delivered.length > 0 ? (onTime.length / delivered.length * 100).toFixed(1) : 0,
      lateDeliveries: delivered.length - onTime.length,
      period,
    };
  }

  /**
   * Get delivery success rate
   */
  async getDeliverySuccessRate(userId: string, period: { from: Date; to: Date }) {
    const stops = await this.prisma.deliveryStop.groupBy({
      by: ['status'],
      where: {
        route: {
          userId,
          routeDate: { gte: period.from, lte: period.to },
        },
      },
      _count: { status: true },
    });

    const statusCounts = new Map(stops.map(s => [s.status, s._count.status]));
    const total = stops.reduce((sum, s) => sum + s._count.status, 0);
    const delivered = statusCounts.get('DELIVERED') || 0;
    const failed = (statusCounts.get('FAILED') || 0) + (statusCounts.get('RETURNED') || 0);
    const attempted = statusCounts.get('ATTEMPTED') || 0;

    return {
      total,
      delivered,
      failed,
      attempted,
      pending: statusCounts.get('PENDING') || 0,
      successRate: total > 0 ? (delivered / total * 100).toFixed(1) : 0,
      failureRate: total > 0 ? (failed / total * 100).toFixed(1) : 0,
      period,
    };
  }

  /**
   * Get first attempt delivery rate
   */
  async getFirstAttemptRate(userId: string, period: { from: Date; to: Date }) {
    const stops = await this.prisma.deliveryStop.findMany({
      where: {
        route: {
          userId,
          routeDate: { gte: period.from, lte: period.to },
        },
        status: 'DELIVERED',
      },
      select: { attemptCount: true },
    });

    const firstAttempt = stops.filter(s => (s.attemptCount || 1) === 1).length;

    return {
      totalDelivered: stops.length,
      firstAttempt,
      firstAttemptRate: stops.length > 0 ? (firstAttempt / stops.length * 100).toFixed(1) : 0,
      multipleAttempts: stops.length - firstAttempt,
      period,
    };
  }

  // =================== FLEET EFFICIENCY KPIs ===================

  /**
   * Get fuel efficiency per vehicle
   */
  async getFuelEfficiency(userId: string, period: { from: Date; to: Date }) {
    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: {
        vehicle: { userId },
        fueledAt: { gte: period.from, lte: period.to },
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
      },
      orderBy: { fueledAt: 'asc' },
    });

    // Group by vehicle
    const byVehicle = new Map<string, {
      vehicle: any;
      logs: typeof fuelLogs;
      totalLiters: number;
      totalCost: number;
      kmDriven: number;
    }>();

    for (const log of fuelLogs) {
      if (!byVehicle.has(log.vehicleId)) {
        byVehicle.set(log.vehicleId, {
          vehicle: log.vehicle,
          logs: [],
          totalLiters: 0,
          totalCost: 0,
          kmDriven: 0,
        });
      }
      const entry = byVehicle.get(log.vehicleId)!;
      entry.logs.push(log);
      entry.totalLiters += Number(log.liters) || 0;
      entry.totalCost += Number(log.totalCost) || 0;
    }

    // Calculate km driven between fuel stops
    for (const [, entry] of byVehicle) {
      if (entry.logs.length >= 2) {
        const firstOdometer = entry.logs[0].odometerReading || 0;
        const lastOdometer = entry.logs[entry.logs.length - 1].odometerReading || 0;
        entry.kmDriven = lastOdometer - firstOdometer;
      }
    }

    const results = Array.from(byVehicle.values()).map(entry => ({
      vehicleId: entry.vehicle.id,
      licensePlate: entry.vehicle.licensePlate,
      vehicleName: `${entry.vehicle.make} ${entry.vehicle.model}`,
      totalLiters: Math.round(entry.totalLiters * 10) / 10,
      totalCost: Math.round(entry.totalCost * 100) / 100,
      kmDriven: entry.kmDriven,
      litersPerKm: entry.kmDriven > 0 ? (entry.totalLiters / entry.kmDriven * 100).toFixed(2) : null,
      costPerKm: entry.kmDriven > 0 ? (entry.totalCost / entry.kmDriven).toFixed(2) : null,
      refuelCount: entry.logs.length,
    }));

    // Calculate fleet average
    const totalKm = results.reduce((sum, r) => sum + r.kmDriven, 0);
    const totalLiters = results.reduce((sum, r) => sum + r.totalLiters, 0);
    const totalCost = results.reduce((sum, r) => sum + r.totalCost, 0);

    return {
      byVehicle: results,
      fleetAverage: {
        totalKm,
        totalLiters: Math.round(totalLiters * 10) / 10,
        totalCost: Math.round(totalCost * 100) / 100,
        avgLitersPerKm: totalKm > 0 ? (totalLiters / totalKm * 100).toFixed(2) : null,
        avgCostPerKm: totalKm > 0 ? (totalCost / totalKm).toFixed(2) : null,
      },
      period,
    };
  }

  /**
   * Get vehicle utilization rate
   */
  async getVehicleUtilization(userId: string, period: { from: Date; to: Date }) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId, status: { not: 'RETIRED' } },
      select: { id: true, licensePlate: true },
    });

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: period.from, lte: period.to },
      },
      select: {
        vehicleId: true,
        routeDate: true,
        status: true,
      },
    });

    // Calculate working days in period
    const workingDays = this.countWorkingDays(period.from, period.to);

    const utilization = vehicles.map(vehicle => {
      const vehicleRoutes = routes.filter(r => r.vehicleId === vehicle.id);
      const uniqueDays = new Set(vehicleRoutes.map(r => r.routeDate.toDateString())).size;
      const completedRoutes = vehicleRoutes.filter(r => r.status === 'COMPLETED').length;

      return {
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        totalRoutes: vehicleRoutes.length,
        completedRoutes,
        daysUsed: uniqueDays,
        utilizationRate: workingDays > 0 ? (uniqueDays / workingDays * 100).toFixed(1) : 0,
      };
    });

    const avgUtilization = utilization.length > 0
      ? utilization.reduce((sum, v) => sum + parseFloat(v.utilizationRate as string), 0) / utilization.length
      : 0;

    return {
      byVehicle: utilization,
      fleetAverage: {
        workingDays,
        avgUtilizationRate: avgUtilization.toFixed(1),
        totalRoutes: routes.length,
      },
      period,
    };
  }

  // =================== DRIVER PERFORMANCE KPIs ===================

  /**
   * Get driver performance metrics
   */
  async getDriverPerformance(userId: string, period: { from: Date; to: Date }) {
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: period.from, lte: period.to },
        driverId: { not: null },
      },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true } },
        stops: { select: { status: true, completedAt: true, estimatedArrival: true } },
      },
    });

    // Group by driver
    const byDriver = new Map<string, {
      driver: any;
      routeCount: number;
      deliveredCount: number;
      failedCount: number;
      onTimeCount: number;
    }>();

    for (const route of routes) {
      if (!route.driverId) continue;

      if (!byDriver.has(route.driverId)) {
        byDriver.set(route.driverId, {
          driver: route.driver,
          routeCount: 0,
          deliveredCount: 0,
          failedCount: 0,
          onTimeCount: 0,
        });
      }

      const entry = byDriver.get(route.driverId)!;
      entry.routeCount++;

      for (const stop of route.stops) {
        if (stop.status === 'DELIVERED') {
          entry.deliveredCount++;
          if (stop.estimatedArrival && stop.completedAt) {
            const diff = Math.abs(stop.completedAt.getTime() - stop.estimatedArrival.getTime());
            if (diff <= 30 * 60 * 1000) entry.onTimeCount++;
          } else {
            entry.onTimeCount++; // No planned time = on time
          }
        } else if (stop.status === 'FAILED' || stop.status === 'RETURNED') {
          entry.failedCount++;
        }
      }
    }

    const results = Array.from(byDriver.values()).map(entry => {
      const total = entry.deliveredCount + entry.failedCount;
      return {
        driverId: entry.driver?.id,
        driverName: entry.driver ? `${entry.driver.firstName} ${entry.driver.lastName}` : 'Unknown',
        totalRoutes: entry.routeCount,
        deliveredCount: entry.deliveredCount,
        failedCount: entry.failedCount,
        successRate: total > 0 ? (entry.deliveredCount / total * 100).toFixed(1) : 0,
        onTimeRate: entry.deliveredCount > 0
          ? (entry.onTimeCount / entry.deliveredCount * 100).toFixed(1)
          : 0,
      };
    });

    // Sort by success rate
    results.sort((a, b) => parseFloat(b.successRate as string) - parseFloat(a.successRate as string));

    return {
      drivers: results,
      topPerformer: results[0] || null,
      period,
    };
  }

  /**
   * Get driver hours summary
   */
  async getDriverHoursSummary(userId: string, period: { from: Date; to: Date }) {
    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        employee: { userId },
        date: { gte: period.from, lte: period.to },
        status: 'APPROVED',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, salary: true } },
      },
    });

    // Group by employee
    const byEmployee = new Map<string, {
      employee: any;
      totalHours: number;
      daysWorked: number;
      avgHoursPerDay: number;
      overtime: number;
    }>();

    for (const ts of timesheets) {
      if (!byEmployee.has(ts.employeeId)) {
        byEmployee.set(ts.employeeId, {
          employee: ts.employee,
          totalHours: 0,
          daysWorked: 0,
          avgHoursPerDay: 0,
          overtime: 0,
        });
      }
      const entry = byEmployee.get(ts.employeeId)!;
      entry.totalHours += ts.workedHours || 0;

      // Track overtime (over 8h/day)
      if ((ts.workedHours || 0) > 8) {
        entry.overtime += (ts.workedHours || 0) - 8;
      }
    }

    // Calculate days worked
    for (const [employeeId, entry] of byEmployee) {
      const employeeTimesheets = timesheets.filter(ts => ts.employeeId === employeeId);
      const uniqueDays = new Set(employeeTimesheets.map(ts => ts.date.toDateString())).size;
      entry.daysWorked = uniqueDays;
      entry.avgHoursPerDay = uniqueDays > 0 ? entry.totalHours / uniqueDays : 0;
    }

    const results = Array.from(byEmployee.values()).map(entry => ({
      employeeId: entry.employee.id,
      employeeName: `${entry.employee.firstName} ${entry.employee.lastName}`,
      totalHours: Math.round(entry.totalHours * 10) / 10,
      daysWorked: entry.daysWorked,
      avgHoursPerDay: Math.round(entry.avgHoursPerDay * 10) / 10,
      overtime: Math.round(entry.overtime * 10) / 10,
      hourlySalary: entry.employee.salary ? Number(entry.employee.salary) / 160 : null, // Assume 160h/month
    }));

    return {
      drivers: results,
      totalHours: results.reduce((sum, r) => sum + r.totalHours, 0),
      totalOvertime: results.reduce((sum, r) => sum + r.overtime, 0),
      period,
    };
  }

  // =================== COST ANALYSIS KPIs ===================

  /**
   * Get total fleet operating costs
   */
  async getFleetOperatingCosts(userId: string, period: { from: Date; to: Date }) {
    const [fuelCosts, maintenanceCosts, vehicles] = await Promise.all([
      this.prisma.fuelLog.aggregate({
        where: {
          vehicle: { userId },
          fueledAt: { gte: period.from, lte: period.to },
        },
        _sum: { totalCost: true },
      }),
      this.prisma.maintenanceLog.aggregate({
        where: {
          vehicle: { userId },
          serviceDate: { gte: period.from, lte: period.to },
        },
        _sum: { totalCost: true },
      }),
      this.prisma.vehicle.findMany({
        where: { userId, status: { not: 'RETIRED' } },
        select: { monthlyLeaseCost: true, insuranceCost: true },
      }),
    ]);

    // Calculate lease and insurance costs for the period
    const daysInPeriod = Math.ceil((period.to.getTime() - period.from.getTime()) / (1000 * 60 * 60 * 24));
    const monthsInPeriod = daysInPeriod / 30;

    let totalLeaseCost = 0;
    let totalInsuranceCost = 0;
    for (const v of vehicles) {
      totalLeaseCost += (Number(v.monthlyLeaseCost) || 0) * monthsInPeriod;
      totalInsuranceCost += (Number(v.insuranceCost) || 0) * monthsInPeriod;
    }

    const fuelTotal = Number(fuelCosts._sum.totalCost) || 0;
    const maintenanceTotal = Number(maintenanceCosts._sum.totalCost) || 0;

    return {
      fuel: Math.round(fuelTotal * 100) / 100,
      maintenance: Math.round(maintenanceTotal * 100) / 100,
      lease: Math.round(totalLeaseCost * 100) / 100,
      insurance: Math.round(totalInsuranceCost * 100) / 100,
      total: Math.round((fuelTotal + maintenanceTotal + totalLeaseCost + totalInsuranceCost) * 100) / 100,
      breakdown: {
        fuelPercent: 0,
        maintenancePercent: 0,
        leasePercent: 0,
        insurancePercent: 0,
      },
      period,
      vehicleCount: vehicles.length,
    };
  }

  /**
   * Get cost per delivery
   */
  async getCostPerDelivery(userId: string, period: { from: Date; to: Date }) {
    const [costs, deliveries] = await Promise.all([
      this.getFleetOperatingCosts(userId, period),
      this.prisma.deliveryStop.count({
        where: {
          route: {
            userId,
            routeDate: { gte: period.from, lte: period.to },
          },
          status: 'DELIVERED',
        },
      }),
    ]);

    return {
      totalCosts: costs.total,
      totalDeliveries: deliveries,
      costPerDelivery: deliveries > 0 ? (costs.total / deliveries).toFixed(2) : null,
      period,
    };
  }

  // =================== TREND ANALYSIS ===================

  /**
   * Get daily delivery trend
   */
  async getDailyDeliveryTrend(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const stops = await this.prisma.deliveryStop.findMany({
      where: {
        route: {
          userId,
          routeDate: { gte: since },
        },
        status: { in: ['DELIVERED', 'FAILED'] },
      },
      include: {
        route: { select: { routeDate: true } },
      },
    });

    // Group by date
    const byDate = new Map<string, { delivered: number; failed: number }>();

    for (const stop of stops) {
      const dateStr = stop.route.routeDate.toISOString().split('T')[0];
      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, { delivered: 0, failed: 0 });
      }
      const entry = byDate.get(dateStr)!;
      if (stop.status === 'DELIVERED') {
        entry.delivered++;
      } else {
        entry.failed++;
      }
    }

    // Convert to sorted array
    const trend = Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        delivered: data.delivered,
        failed: data.failed,
        total: data.delivered + data.failed,
        successRate: ((data.delivered / (data.delivered + data.failed)) * 100).toFixed(1),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      trend,
      days,
      avgDailyDeliveries: trend.length > 0
        ? Math.round(trend.reduce((sum, t) => sum + t.delivered, 0) / trend.length)
        : 0,
    };
  }

  // =================== HELPER METHODS ===================

  private countWorkingDays(from: Date, to: Date): number {
    let count = 0;
    const current = new Date(from);

    while (current <= to) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Not Sunday or Saturday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }
}
