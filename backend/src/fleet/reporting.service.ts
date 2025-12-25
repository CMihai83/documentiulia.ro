import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Report Types
export interface FleetPerformanceReport {
  period: { from: Date; to: Date };
  summary: {
    totalRoutes: number;
    completedRoutes: number;
    partialRoutes: number;
    cancelledRoutes: number;
    completionRate: number;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    deliverySuccessRate: number;
    totalDistanceKm: number;
    avgDistancePerRouteKm: number;
  };
  byVehicle: Array<{
    vehicleId: string;
    licensePlate: string;
    routesCompleted: number;
    deliveriesCompleted: number;
    deliverySuccessRate: number;
    totalDistanceKm: number;
    avgDeliveriesPerRoute: number;
  }>;
  byDriver: Array<{
    driverId: string;
    driverName: string;
    routesCompleted: number;
    deliveriesCompleted: number;
    deliverySuccessRate: number;
    avgTimePerDeliveryMin: number;
  }>;
  byZone: Array<{
    zone: string;
    deliveries: number;
    successRate: number;
  }>;
}

export interface FuelConsumptionReport {
  period: { from: Date; to: Date };
  summary: {
    totalLiters: number;
    totalCostEur: number;
    avgPricePerLiter: number;
    avgConsumptionLitersPer100km: number;
    totalDistanceKm: number;
  };
  byVehicle: Array<{
    vehicleId: string;
    licensePlate: string;
    make: string;
    model: string;
    fuelType: string;
    totalLiters: number;
    totalCostEur: number;
    distanceKm: number;
    consumptionLitersPer100km: number;
    fillUps: number;
  }>;
  byMonth: Array<{
    month: string;
    liters: number;
    costEur: number;
    avgPrice: number;
  }>;
}

export interface VehicleUtilizationReport {
  period: { from: Date; to: Date };
  summary: {
    totalVehicles: number;
    avgUtilizationPercent: number;
    totalWorkingDays: number;
    totalActiveDays: number;
    avgDaysActivePerVehicle: number;
  };
  byVehicle: Array<{
    vehicleId: string;
    licensePlate: string;
    status: string;
    activeDays: number;
    maintenanceDays: number;
    idleDays: number;
    utilizationPercent: number;
    routesCompleted: number;
    avgRoutesPerActiveDay: number;
  }>;
}

export interface MaintenanceCostReport {
  period: { from: Date; to: Date };
  summary: {
    totalCostEur: number;
    avgCostPerVehicle: number;
    scheduledCount: number;
    unscheduledCount: number;
    partsCostEur: number;
    laborCostEur: number;
  };
  byVehicle: Array<{
    vehicleId: string;
    licensePlate: string;
    totalCostEur: number;
    maintenanceCount: number;
    lastMaintenance?: Date;
    nextScheduled?: Date;
  }>;
  byType: Array<{
    type: string;
    count: number;
    totalCostEur: number;
    avgCostEur: number;
  }>;
}

export interface DriverPayoutReport {
  period: { from: Date; to: Date };
  summary: {
    totalDrivers: number;
    totalGrossEur: number;
    totalTaxWithholdingEur: number;
    totalNetEur: number;
    avgPayoutPerDriver: number;
    totalDeliveries: number;
    totalDistanceKm: number;
  };
  byDriver: Array<{
    driverId: string;
    driverName: string;
    routesCompleted: number;
    deliveries: number;
    parcels: number;
    distanceKm: number;
    grossPayEur: number;
    taxWithholdingEur: number;
    netPayEur: number;
    bonusesEur: number;
  }>;
}

export interface CourierReconciliationReport {
  period: { from: Date; to: Date };
  byProvider: Array<{
    provider: string;
    totalDeliveries: number;
    standardDeliveries: number;
    expressDeliveries: number;
    returns: number;
    failed: number;
    calculatedAmountEur: number;
    saturdayBonusEur: number;
    netPaymentEur: number;
  }>;
  totals: {
    totalDeliveries: number;
    totalPaymentEur: number;
  };
}

// Export formats
export type ExportFormat = 'json' | 'csv' | 'pdf';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  // =================== FLEET PERFORMANCE ===================

  async generateFleetPerformanceReport(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<FleetPerformanceReport> {
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        stops: true,
      },
    });

    // Summary calculations
    const totalRoutes = routes.length;
    const completedRoutes = routes.filter(r => r.status === 'COMPLETED').length;
    const partialRoutes = routes.filter(r => r.status === 'PARTIAL').length;
    const cancelledRoutes = routes.filter(r => r.status === 'CANCELLED').length;

    let totalDeliveries = 0;
    let successfulDeliveries = 0;
    let failedDeliveries = 0;
    let totalDistanceKm = 0;

    for (const route of routes) {
      totalDeliveries += route.stops.length;
      successfulDeliveries += route.stops.filter(s => s.status === 'DELIVERED').length;
      failedDeliveries += route.stops.filter(s => s.status === 'FAILED' || s.status === 'RETURNED').length;
      totalDistanceKm += route.actualDistanceKm ? Number(route.actualDistanceKm) : 0;
    }

    // By vehicle
    const vehicleMap = new Map<string, {
      licensePlate: string;
      routesCompleted: number;
      deliveriesCompleted: number;
      totalDeliveries: number;
      totalDistanceKm: number;
    }>();

    for (const route of routes) {
      const key = route.vehicleId;
      const existing = vehicleMap.get(key) || {
        licensePlate: route.vehicle.licensePlate,
        routesCompleted: 0,
        deliveriesCompleted: 0,
        totalDeliveries: 0,
        totalDistanceKm: 0,
      };

      if (route.status === 'COMPLETED' || route.status === 'PARTIAL') {
        existing.routesCompleted++;
      }
      existing.deliveriesCompleted += route.stops.filter(s => s.status === 'DELIVERED').length;
      existing.totalDeliveries += route.stops.length;
      existing.totalDistanceKm += route.actualDistanceKm ? Number(route.actualDistanceKm) : 0;

      vehicleMap.set(key, existing);
    }

    const byVehicle = Array.from(vehicleMap.entries()).map(([vehicleId, data]) => ({
      vehicleId,
      licensePlate: data.licensePlate,
      routesCompleted: data.routesCompleted,
      deliveriesCompleted: data.deliveriesCompleted,
      deliverySuccessRate: data.totalDeliveries > 0
        ? Math.round((data.deliveriesCompleted / data.totalDeliveries) * 100)
        : 0,
      totalDistanceKm: Math.round(data.totalDistanceKm * 10) / 10,
      avgDeliveriesPerRoute: data.routesCompleted > 0
        ? Math.round((data.deliveriesCompleted / data.routesCompleted) * 10) / 10
        : 0,
    }));

    // By driver
    const driverMap = new Map<string, {
      driverName: string;
      routesCompleted: number;
      deliveriesCompleted: number;
      totalDeliveries: number;
      totalDurationMin: number;
    }>();

    for (const route of routes) {
      if (!route.driverId || !route.driver) continue;

      const key = route.driverId;
      const existing = driverMap.get(key) || {
        driverName: `${route.driver.firstName} ${route.driver.lastName}`,
        routesCompleted: 0,
        deliveriesCompleted: 0,
        totalDeliveries: 0,
        totalDurationMin: 0,
      };

      if (route.status === 'COMPLETED' || route.status === 'PARTIAL') {
        existing.routesCompleted++;
      }
      existing.deliveriesCompleted += route.stops.filter(s => s.status === 'DELIVERED').length;
      existing.totalDeliveries += route.stops.length;
      existing.totalDurationMin += route.actualDurationMin || 0;

      driverMap.set(key, existing);
    }

    const byDriver = Array.from(driverMap.entries()).map(([driverId, data]) => ({
      driverId,
      driverName: data.driverName,
      routesCompleted: data.routesCompleted,
      deliveriesCompleted: data.deliveriesCompleted,
      deliverySuccessRate: data.totalDeliveries > 0
        ? Math.round((data.deliveriesCompleted / data.totalDeliveries) * 100)
        : 0,
      avgTimePerDeliveryMin: data.deliveriesCompleted > 0
        ? Math.round((data.totalDurationMin / data.deliveriesCompleted) * 10) / 10
        : 0,
    }));

    // By zone
    const zoneMap = new Map<string, { total: number; successful: number }>();
    for (const route of routes) {
      const zone = route.deliveryZone || 'Unknown';
      const existing = zoneMap.get(zone) || { total: 0, successful: 0 };
      existing.total += route.stops.length;
      existing.successful += route.stops.filter(s => s.status === 'DELIVERED').length;
      zoneMap.set(zone, existing);
    }

    const byZone = Array.from(zoneMap.entries()).map(([zone, data]) => ({
      zone,
      deliveries: data.total,
      successRate: data.total > 0 ? Math.round((data.successful / data.total) * 100) : 0,
    }));

    return {
      period: { from, to },
      summary: {
        totalRoutes,
        completedRoutes,
        partialRoutes,
        cancelledRoutes,
        completionRate: totalRoutes > 0 ? Math.round((completedRoutes / totalRoutes) * 100) : 0,
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        deliverySuccessRate: totalDeliveries > 0
          ? Math.round((successfulDeliveries / totalDeliveries) * 100)
          : 0,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        avgDistancePerRouteKm: totalRoutes > 0
          ? Math.round((totalDistanceKm / totalRoutes) * 10) / 10
          : 0,
      },
      byVehicle,
      byDriver,
      byZone,
    };
  }

  // =================== FUEL CONSUMPTION ===================

  async generateFuelConsumptionReport(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<FuelConsumptionReport> {
    const fuelLogs = await this.prisma.fuelLog.findMany({
      where: {
        vehicle: { userId },
        fueledAt: { gte: from, lte: to },
      },
      include: {
        vehicle: {
          select: { id: true, licensePlate: true, make: true, model: true, fuelType: true },
        },
      },
    });

    // Get vehicle distances from routes in this period
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
      },
      select: {
        vehicleId: true,
        actualDistanceKm: true,
      },
    });

    const vehicleDistances = new Map<string, number>();
    for (const route of routes) {
      const existing = vehicleDistances.get(route.vehicleId) || 0;
      vehicleDistances.set(route.vehicleId, existing + (route.actualDistanceKm ? Number(route.actualDistanceKm) : 0));
    }

    // Summary
    let totalLiters = 0;
    let totalCost = 0;
    let totalDistance = 0;

    // By vehicle
    const vehicleMap = new Map<string, {
      licensePlate: string;
      make: string;
      model: string;
      fuelType: string;
      liters: number;
      cost: number;
      fillUps: number;
    }>();

    for (const log of fuelLogs) {
      const liters = Number(log.liters);
      const cost = Number(log.totalCost);
      totalLiters += liters;
      totalCost += cost;

      const key = log.vehicleId;
      const existing = vehicleMap.get(key) || {
        licensePlate: log.vehicle.licensePlate,
        make: log.vehicle.make,
        model: log.vehicle.model,
        fuelType: log.vehicle.fuelType,
        liters: 0,
        cost: 0,
        fillUps: 0,
      };

      existing.liters += liters;
      existing.cost += cost;
      existing.fillUps++;

      vehicleMap.set(key, existing);
    }

    const byVehicle = Array.from(vehicleMap.entries()).map(([vehicleId, data]) => {
      const distance = vehicleDistances.get(vehicleId) || 0;
      totalDistance += distance;
      return {
        vehicleId,
        licensePlate: data.licensePlate,
        make: data.make,
        model: data.model,
        fuelType: data.fuelType,
        totalLiters: Math.round(data.liters * 10) / 10,
        totalCostEur: Math.round(data.cost * 100) / 100,
        distanceKm: Math.round(distance * 10) / 10,
        consumptionLitersPer100km: distance > 0
          ? Math.round((data.liters / distance) * 1000) / 10
          : 0,
        fillUps: data.fillUps,
      };
    });

    // By month
    const monthMap = new Map<string, { liters: number; cost: number; count: number }>();
    for (const log of fuelLogs) {
      const month = log.fueledAt.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthMap.get(month) || { liters: 0, cost: 0, count: 0 };
      existing.liters += Number(log.liters);
      existing.cost += Number(log.totalCost);
      existing.count++;
      monthMap.set(month, existing);
    }

    const byMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        liters: Math.round(data.liters * 10) / 10,
        costEur: Math.round(data.cost * 100) / 100,
        avgPrice: data.liters > 0
          ? Math.round((data.cost / data.liters) * 1000) / 1000
          : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      period: { from, to },
      summary: {
        totalLiters: Math.round(totalLiters * 10) / 10,
        totalCostEur: Math.round(totalCost * 100) / 100,
        avgPricePerLiter: totalLiters > 0
          ? Math.round((totalCost / totalLiters) * 1000) / 1000
          : 0,
        avgConsumptionLitersPer100km: totalDistance > 0
          ? Math.round((totalLiters / totalDistance) * 1000) / 10
          : 0,
        totalDistanceKm: Math.round(totalDistance * 10) / 10,
      },
      byVehicle,
      byMonth,
    };
  }

  // =================== VEHICLE UTILIZATION ===================

  async generateVehicleUtilizationReport(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<VehicleUtilizationReport> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      select: {
        id: true,
        licensePlate: true,
        status: true,
      },
    });

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
      },
      select: {
        vehicleId: true,
        routeDate: true,
        status: true,
      },
    });

    const maintenance = await this.prisma.maintenanceLog.findMany({
      where: {
        vehicle: { userId },
        serviceDate: { gte: from, lte: to },
      },
      select: {
        vehicleId: true,
        serviceDate: true,
      },
    });

    // Calculate working days in period
    const totalWorkingDays = this.countWorkingDays(from, to);

    // Track active days and maintenance days per vehicle
    const vehicleStats = new Map<string, {
      activeDays: Set<string>;
      maintenanceDays: Set<string>;
      routesCompleted: number;
    }>();

    for (const vehicle of vehicles) {
      vehicleStats.set(vehicle.id, {
        activeDays: new Set(),
        maintenanceDays: new Set(),
        routesCompleted: 0,
      });
    }

    for (const route of routes) {
      const stats = vehicleStats.get(route.vehicleId);
      if (stats) {
        const dateKey = route.routeDate.toISOString().slice(0, 10);
        stats.activeDays.add(dateKey);
        if (route.status === 'COMPLETED' || route.status === 'PARTIAL') {
          stats.routesCompleted++;
        }
      }
    }

    for (const m of maintenance) {
      const stats = vehicleStats.get(m.vehicleId);
      if (stats) {
        stats.maintenanceDays.add(m.serviceDate.toISOString().slice(0, 10));
      }
    }

    let totalActiveDays = 0;
    const byVehicle = vehicles.map(vehicle => {
      const stats = vehicleStats.get(vehicle.id)!;
      const activeDays = stats.activeDays.size;
      const maintenanceDays = stats.maintenanceDays.size;
      const idleDays = totalWorkingDays - activeDays - maintenanceDays;
      totalActiveDays += activeDays;

      return {
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        status: vehicle.status,
        activeDays,
        maintenanceDays,
        idleDays: Math.max(0, idleDays),
        utilizationPercent: totalWorkingDays > 0
          ? Math.round((activeDays / totalWorkingDays) * 100)
          : 0,
        routesCompleted: stats.routesCompleted,
        avgRoutesPerActiveDay: activeDays > 0
          ? Math.round((stats.routesCompleted / activeDays) * 10) / 10
          : 0,
      };
    });

    return {
      period: { from, to },
      summary: {
        totalVehicles: vehicles.length,
        avgUtilizationPercent: vehicles.length > 0 && totalWorkingDays > 0
          ? Math.round((totalActiveDays / (vehicles.length * totalWorkingDays)) * 100)
          : 0,
        totalWorkingDays,
        totalActiveDays,
        avgDaysActivePerVehicle: vehicles.length > 0
          ? Math.round((totalActiveDays / vehicles.length) * 10) / 10
          : 0,
      },
      byVehicle,
    };
  }

  // =================== MAINTENANCE COSTS ===================

  async generateMaintenanceCostReport(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<MaintenanceCostReport> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      select: {
        id: true,
        licensePlate: true,
        nextServiceDate: true,
      },
    });

    const maintenance = await this.prisma.maintenanceLog.findMany({
      where: {
        vehicle: { userId },
        serviceDate: { gte: from, lte: to },
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
      },
    });

    // Summary
    let totalCost = 0;
    let partsCost = 0;
    let laborCost = 0;
    let scheduledCount = 0;
    let unscheduledCount = 0;

    // By vehicle
    const vehicleMap = new Map<string, {
      licensePlate: string;
      cost: number;
      count: number;
      lastMaintenance?: Date;
    }>();

    // By type
    const typeMap = new Map<string, { count: number; cost: number }>();

    for (const m of maintenance) {
      const cost = m.totalCost ? Number(m.totalCost) : 0;
      totalCost += cost;
      partsCost += m.partsCost ? Number(m.partsCost) : 0;
      laborCost += m.laborCost ? Number(m.laborCost) : 0;

      if (m.type === 'SCHEDULED_SERVICE' || m.type === 'TUV_INSPECTION') {
        scheduledCount++;
      } else {
        unscheduledCount++;
      }

      // Vehicle stats
      const existing = vehicleMap.get(m.vehicleId) || {
        licensePlate: m.vehicle.licensePlate,
        cost: 0,
        count: 0,
      };
      existing.cost += cost;
      existing.count++;
      if (!existing.lastMaintenance || m.serviceDate > existing.lastMaintenance) {
        existing.lastMaintenance = m.serviceDate;
      }
      vehicleMap.set(m.vehicleId, existing);

      // Type stats
      const typeData = typeMap.get(m.type) || { count: 0, cost: 0 };
      typeData.count++;
      typeData.cost += cost;
      typeMap.set(m.type, typeData);
    }

    const byVehicle = vehicles.map(vehicle => {
      const data = vehicleMap.get(vehicle.id) || {
        licensePlate: vehicle.licensePlate,
        cost: 0,
        count: 0,
      };
      return {
        vehicleId: vehicle.id,
        licensePlate: data.licensePlate,
        totalCostEur: Math.round(data.cost * 100) / 100,
        maintenanceCount: data.count,
        lastMaintenance: data.lastMaintenance,
        nextScheduled: vehicle.nextServiceDate || undefined,
      };
    });

    const byType = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      totalCostEur: Math.round(data.cost * 100) / 100,
      avgCostEur: data.count > 0 ? Math.round((data.cost / data.count) * 100) / 100 : 0,
    }));

    return {
      period: { from, to },
      summary: {
        totalCostEur: Math.round(totalCost * 100) / 100,
        avgCostPerVehicle: vehicles.length > 0
          ? Math.round((totalCost / vehicles.length) * 100) / 100
          : 0,
        scheduledCount,
        unscheduledCount,
        partsCostEur: Math.round(partsCost * 100) / 100,
        laborCostEur: Math.round(laborCost * 100) / 100,
      },
      byVehicle,
      byType,
    };
  }

  // =================== EXPORT FUNCTIONS ===================

  formatAsCsv<T extends Record<string, any>>(data: T[], headers?: string[]): string {
    if (data.length === 0) return '';

    const keys = headers || Object.keys(data[0]);
    const csvRows = [keys.join(',')];

    for (const row of data) {
      const values = keys.map(key => {
        const val = row[key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        if (val instanceof Date) return val.toISOString();
        return String(val);
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  async exportReport(
    report: any,
    format: ExportFormat,
    reportType: string,
  ): Promise<{ data: string | object; contentType: string; filename: string }> {
    const timestamp = new Date().toISOString().slice(0, 10);
    const baseFilename = `${reportType}_${timestamp}`;

    switch (format) {
      case 'json':
        return {
          data: report,
          contentType: 'application/json',
          filename: `${baseFilename}.json`,
        };

      case 'csv':
        // Flatten report for CSV
        let csvData: any[] = [];
        if (report.byVehicle) {
          csvData = report.byVehicle;
        } else if (report.byDriver) {
          csvData = report.byDriver;
        } else if (report.byProvider) {
          csvData = report.byProvider;
        } else if (Array.isArray(report)) {
          csvData = report;
        }

        return {
          data: this.formatAsCsv(csvData),
          contentType: 'text/csv',
          filename: `${baseFilename}.csv`,
        };

      case 'pdf':
        // For PDF, we'd use a library like pdfkit or puppeteer
        // For now, return JSON with a note
        return {
          data: { ...report, _note: 'PDF generation requires additional implementation' },
          contentType: 'application/json',
          filename: `${baseFilename}.json`,
        };

      default:
        return {
          data: report,
          contentType: 'application/json',
          filename: `${baseFilename}.json`,
        };
    }
  }

  // =================== DRIVER PAYOUTS ===================

  async generateDriverPayoutReport(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<DriverPayoutReport> {
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
        status: { in: ['COMPLETED', 'PARTIAL'] },
      },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true } },
        stops: true,
      },
    });

    // German tax rate: 19% MwSt standard
    const TAX_RATE = 0.19;

    // Pay rates for Munich delivery (per delivery)
    const RATES = {
      standardDelivery: 1.20,   // €1.20 per standard parcel
      expressDelivery: 2.00,    // €2.00 per express
      perKm: 0.35,              // €0.35 per km
      saturdayBonus: 0.50,      // €0.50 extra per delivery on Saturday
    };

    const driverMap = new Map<string, {
      driverName: string;
      routesCompleted: number;
      deliveries: number;
      parcels: number;
      distanceKm: number;
      grossPay: number;
      bonuses: number;
    }>();

    for (const route of routes) {
      if (!route.driverId || !route.driver) continue;

      const key = route.driverId;
      const existing = driverMap.get(key) || {
        driverName: `${route.driver.firstName} ${route.driver.lastName}`,
        routesCompleted: 0,
        deliveries: 0,
        parcels: 0,
        distanceKm: 0,
        grossPay: 0,
        bonuses: 0,
      };

      existing.routesCompleted++;

      const deliveredStops = route.stops.filter(s => s.status === 'DELIVERED');
      const deliveryCount = deliveredStops.length;
      const parcelCount = deliveredStops.reduce((sum, s) => sum + (s.parcelCount || 1), 0);
      const distanceKm = route.actualDistanceKm ? Number(route.actualDistanceKm) : 0;

      existing.deliveries += deliveryCount;
      existing.parcels += parcelCount;
      existing.distanceKm += distanceKm;

      // Calculate pay
      const deliveryPay = parcelCount * RATES.standardDelivery;
      const distancePay = distanceKm * RATES.perKm;
      existing.grossPay += deliveryPay + distancePay;

      // Saturday bonus
      const isSaturday = route.routeDate.getDay() === 6;
      if (isSaturday) {
        existing.bonuses += deliveryCount * RATES.saturdayBonus;
      }

      driverMap.set(key, existing);
    }

    let totalGross = 0;
    let totalTax = 0;
    let totalNet = 0;
    let totalDeliveries = 0;
    let totalDistance = 0;

    const byDriver = Array.from(driverMap.entries()).map(([driverId, data]) => {
      const grossWithBonus = data.grossPay + data.bonuses;
      const tax = Math.round(grossWithBonus * TAX_RATE * 100) / 100;
      const net = Math.round((grossWithBonus - tax) * 100) / 100;

      totalGross += grossWithBonus;
      totalTax += tax;
      totalNet += net;
      totalDeliveries += data.deliveries;
      totalDistance += data.distanceKm;

      return {
        driverId,
        driverName: data.driverName,
        routesCompleted: data.routesCompleted,
        deliveries: data.deliveries,
        parcels: data.parcels,
        distanceKm: Math.round(data.distanceKm * 10) / 10,
        grossPayEur: Math.round(grossWithBonus * 100) / 100,
        taxWithholdingEur: tax,
        netPayEur: net,
        bonusesEur: Math.round(data.bonuses * 100) / 100,
      };
    });

    return {
      period: { from, to },
      summary: {
        totalDrivers: driverMap.size,
        totalGrossEur: Math.round(totalGross * 100) / 100,
        totalTaxWithholdingEur: Math.round(totalTax * 100) / 100,
        totalNetEur: Math.round(totalNet * 100) / 100,
        avgPayoutPerDriver: driverMap.size > 0
          ? Math.round((totalNet / driverMap.size) * 100) / 100
          : 0,
        totalDeliveries,
        totalDistanceKm: Math.round(totalDistance * 10) / 10,
      },
      byDriver,
    };
  }

  // =================== COURIER RECONCILIATION ===================

  async generateCourierReconciliationReport(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<CourierReconciliationReport> {
    // Get courier deliveries for the period
    const deliveries = await this.prisma.courierDelivery.findMany({
      where: {
        userId,
        createdAt: { gte: from, lte: to },
      },
    });

    // Courier provider rates (DPD/GLS Germany)
    const RATES = {
      DPD: {
        standard: 4.50,
        express: 8.90,
        return: 5.20,
        saturdayMultiplier: 1.3,
      },
      GLS: {
        standard: 4.30,
        express: 8.50,
        return: 4.90,
        saturdayMultiplier: 1.25,
      },
    };

    const providerMap = new Map<string, {
      total: number;
      standard: number;
      express: number;
      returns: number;
      failed: number;
      calculatedAmount: number;
      saturdayBonus: number;
    }>();

    for (const delivery of deliveries) {
      const provider = delivery.provider || 'DPD';
      const existing = providerMap.get(provider) || {
        total: 0,
        standard: 0,
        express: 0,
        returns: 0,
        failed: 0,
        calculatedAmount: 0,
        saturdayBonus: 0,
      };

      existing.total++;

      const rates = RATES[provider as keyof typeof RATES] || RATES.DPD;
      const isSaturday = delivery.createdAt.getDay() === 6;

      // Check status for classification
      const statusUpper = (delivery.status || '').toUpperCase();

      if (statusUpper === 'RETURNED' || statusUpper === 'RETURN') {
        existing.returns++;
        existing.calculatedAmount += rates.return;
      } else if (statusUpper === 'FAILED' || statusUpper === 'UNDELIVERED') {
        existing.failed++;
        // No charge for failed deliveries
      } else if (statusUpper.includes('EXPRESS')) {
        existing.express++;
        let rate = rates.express;
        if (isSaturday) {
          const saturdayExtra = rate * (rates.saturdayMultiplier - 1);
          existing.saturdayBonus += saturdayExtra;
          rate = rate * rates.saturdayMultiplier;
        }
        existing.calculatedAmount += rate;
      } else {
        // Standard delivery (DELIVERED, IN_TRANSIT, etc.)
        existing.standard++;
        let rate = rates.standard;
        if (isSaturday) {
          const saturdayExtra = rate * (rates.saturdayMultiplier - 1);
          existing.saturdayBonus += saturdayExtra;
          rate = rate * rates.saturdayMultiplier;
        }
        existing.calculatedAmount += rate;
      }

      providerMap.set(provider, existing);
    }

    let totalDeliveries = 0;
    let totalPayment = 0;

    const byProvider = Array.from(providerMap.entries()).map(([provider, data]) => {
      const netPayment = data.calculatedAmount;
      totalDeliveries += data.total;
      totalPayment += netPayment;

      return {
        provider,
        totalDeliveries: data.total,
        standardDeliveries: data.standard,
        expressDeliveries: data.express,
        returns: data.returns,
        failed: data.failed,
        calculatedAmountEur: Math.round(data.calculatedAmount * 100) / 100,
        saturdayBonusEur: Math.round(data.saturdayBonus * 100) / 100,
        netPaymentEur: Math.round(netPayment * 100) / 100,
      };
    });

    return {
      period: { from, to },
      byProvider,
      totals: {
        totalDeliveries,
        totalPaymentEur: Math.round(totalPayment * 100) / 100,
      },
    };
  }

  // =================== SCHEDULED REPORTS ===================

  async getAvailableReportTypes(): Promise<Array<{
    type: string;
    name: string;
    description: string;
    exportFormats: ExportFormat[];
  }>> {
    return [
      {
        type: 'fleet_performance',
        name: 'Fleet Performance Report',
        description: 'Route completion rates, delivery success, and distance by vehicle/driver',
        exportFormats: ['json', 'csv', 'pdf'],
      },
      {
        type: 'fuel_consumption',
        name: 'Fuel Consumption Report',
        description: 'Fuel usage, costs, and efficiency by vehicle',
        exportFormats: ['json', 'csv', 'pdf'],
      },
      {
        type: 'vehicle_utilization',
        name: 'Vehicle Utilization Report',
        description: 'Vehicle active days, idle time, and utilization percentage',
        exportFormats: ['json', 'csv', 'pdf'],
      },
      {
        type: 'maintenance_cost',
        name: 'Maintenance Cost Report',
        description: 'Maintenance expenses by vehicle and type',
        exportFormats: ['json', 'csv', 'pdf'],
      },
      {
        type: 'driver_payout',
        name: 'Driver Payout Report',
        description: 'Driver earnings, deliveries, and tax withholdings',
        exportFormats: ['json', 'csv', 'pdf'],
      },
      {
        type: 'courier_reconciliation',
        name: 'Courier Reconciliation Report',
        description: 'DPD/GLS courier service costs and reconciliation',
        exportFormats: ['json', 'csv', 'pdf'],
      },
    ];
  }

  async generateReport(
    userId: string,
    reportType: string,
    from: Date,
    to: Date,
    format: ExportFormat = 'json',
  ): Promise<{ data: string | object; contentType: string; filename: string }> {
    let report: any;

    switch (reportType) {
      case 'fleet_performance':
        report = await this.generateFleetPerformanceReport(userId, from, to);
        break;
      case 'fuel_consumption':
        report = await this.generateFuelConsumptionReport(userId, from, to);
        break;
      case 'vehicle_utilization':
        report = await this.generateVehicleUtilizationReport(userId, from, to);
        break;
      case 'maintenance_cost':
        report = await this.generateMaintenanceCostReport(userId, from, to);
        break;
      case 'driver_payout':
        report = await this.generateDriverPayoutReport(userId, from, to);
        break;
      case 'courier_reconciliation':
        report = await this.generateCourierReconciliationReport(userId, from, to);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    return this.exportReport(report, format, reportType);
  }

  // =================== UTILITIES ===================

  private countWorkingDays(from: Date, to: Date): number {
    let count = 0;
    const current = new Date(from);

    while (current <= to) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Not Sunday (0) or Saturday (6)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }
}
