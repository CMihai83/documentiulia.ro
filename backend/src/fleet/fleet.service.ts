import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  VehicleLocationUpdateDto,
  CreateDeliveryRouteDto,
  UpdateDeliveryRouteDto,
  CreateDeliveryStopDto,
  UpdateDeliveryStopDto,
  CreateFuelLogDto,
  CreateMaintenanceLogDto,
  FleetSummaryDto,
  RouteProgressDto,
} from './dto/fleet.dto';
import { VehicleStatus, RouteStatus, DeliveryStopStatus } from '@prisma/client';

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  // =================== VEHICLE OPERATIONS ===================

  async createVehicle(userId: string, dto: CreateVehicleDto, organizationId?: string) {
    // Check for duplicate license plate
    const existing = await this.prisma.vehicle.findUnique({
      where: { licensePlate: dto.licensePlate },
    });

    if (existing) {
      throw new BadRequestException(`Vehicle with license plate ${dto.licensePlate} already exists`);
    }

    return this.prisma.vehicle.create({
      data: {
        userId,
        organizationId,
        ...dto,
        maxPayloadKg: dto.maxPayloadKg,
        cargoVolumeM3: dto.cargoVolumeM3,
        monthlyLeaseCost: dto.monthlyLeaseCost,
        insuranceCost: dto.insuranceCost,
      },
      include: {
        assignedDriver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async getVehicles(userId: string, organizationId?: string) {
    return this.prisma.vehicle.findMany({
      where: {
        OR: [
          { userId },
          { organizationId: organizationId || undefined },
        ],
      },
      include: {
        assignedDriver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { licensePlate: 'asc' },
    });
  }

  async getVehicleById(id: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, userId },
      include: {
        assignedDriver: true,
        deliveryRoutes: {
          take: 5,
          orderBy: { routeDate: 'desc' },
        },
        fuelLogs: {
          take: 5,
          orderBy: { fueledAt: 'desc' },
        },
        maintenanceLogs: {
          take: 5,
          orderBy: { serviceDate: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async updateVehicle(id: string, userId: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
      include: {
        assignedDriver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async updateVehicleLocation(id: string, userId: string, dto: VehicleLocationUpdateDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        currentLat: dto.latitude,
        currentLng: dto.longitude,
        lastLocationAt: new Date(),
      },
    });
  }

  async deleteVehicle(id: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.vehicle.delete({ where: { id } });
  }

  // =================== DELIVERY ROUTE OPERATIONS ===================

  async createDeliveryRoute(userId: string, dto: CreateDeliveryRouteDto, organizationId?: string) {
    // Verify vehicle exists
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.deliveryRoute.create({
      data: {
        userId,
        organizationId,
        ...dto,
        routeDate: new Date(dto.routeDate),
        plannedDistanceKm: dto.plannedDistanceKm,
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getDeliveryRoutes(userId: string, filters?: { date?: string; vehicleId?: string; status?: RouteStatus }) {
    const where: any = { userId };

    if (filters?.date) {
      const targetDate = new Date(filters.date);
      where.routeDate = targetDate;
    }

    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.deliveryRoute.findMany({
      where,
      include: {
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        stops: { select: { id: true, status: true } },
      },
      orderBy: { routeDate: 'desc' },
    });
  }

  async getRouteById(id: string, userId: string) {
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { id, userId },
      include: {
        vehicle: true,
        driver: true,
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Delivery route not found');
    }

    return route;
  }

  async updateDeliveryRoute(id: string, userId: string, dto: UpdateDeliveryRouteDto) {
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { id, userId },
    });

    if (!route) {
      throw new NotFoundException('Delivery route not found');
    }

    return this.prisma.deliveryRoute.update({
      where: { id },
      data: {
        ...dto,
        routeDate: dto.routeDate ? new Date(dto.routeDate) : undefined,
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async startRoute(id: string, userId: string) {
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { id, userId },
    });

    if (!route) {
      throw new NotFoundException('Delivery route not found');
    }

    return this.prisma.deliveryRoute.update({
      where: { id },
      data: {
        status: RouteStatus.IN_PROGRESS,
        actualStartTime: new Date(),
      },
    });
  }

  async completeRoute(id: string, userId: string) {
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { id, userId },
      include: { stops: true },
    });

    if (!route) {
      throw new NotFoundException('Delivery route not found');
    }

    const completedStops = route.stops.filter(s => s.status === 'DELIVERED').length;
    const failedStops = route.stops.filter(s => s.status === 'FAILED' || s.status === 'RETURNED').length;

    return this.prisma.deliveryRoute.update({
      where: { id },
      data: {
        status: completedStops === route.stops.length ? RouteStatus.COMPLETED : RouteStatus.PARTIAL,
        actualEndTime: new Date(),
        completedStops,
        failedDeliveries: failedStops,
      },
    });
  }

  // =================== DELIVERY STOP OPERATIONS ===================

  async addDeliveryStop(userId: string, dto: CreateDeliveryStopDto) {
    // Verify route exists
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { id: dto.routeId, userId },
    });

    if (!route) {
      throw new NotFoundException('Delivery route not found');
    }

    const stop = await this.prisma.deliveryStop.create({
      data: {
        ...dto,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    // Update route stop count
    await this.prisma.deliveryRoute.update({
      where: { id: dto.routeId },
      data: {
        totalStops: { increment: 1 },
        totalParcels: { increment: dto.parcelCount || 1 },
      },
    });

    return stop;
  }

  async updateDeliveryStop(id: string, userId: string, dto: UpdateDeliveryStopDto) {
    const stop = await this.prisma.deliveryStop.findFirst({
      where: { id },
      include: { route: true },
    });

    if (!stop || stop.route.userId !== userId) {
      throw new NotFoundException('Delivery stop not found');
    }

    const updatedStop = await this.prisma.deliveryStop.update({
      where: { id },
      data: {
        ...dto,
        actualArrival: dto.status === DeliveryStopStatus.IN_PROGRESS ? new Date() : stop.actualArrival,
        completedAt: dto.status === DeliveryStopStatus.DELIVERED ? new Date() : stop.completedAt,
        attemptCount: dto.status === DeliveryStopStatus.ATTEMPTED ? { increment: 1 } : undefined,
      },
    });

    // Update route counters if status changed to DELIVERED or FAILED
    if (dto.status === DeliveryStopStatus.DELIVERED) {
      await this.prisma.deliveryRoute.update({
        where: { id: stop.routeId },
        data: {
          completedStops: { increment: 1 },
          deliveredParcels: { increment: stop.parcelCount },
        },
      });
    } else if (dto.status === DeliveryStopStatus.FAILED || dto.status === DeliveryStopStatus.RETURNED) {
      await this.prisma.deliveryRoute.update({
        where: { id: stop.routeId },
        data: {
          failedDeliveries: { increment: 1 },
        },
      });
    }

    return updatedStop;
  }

  // =================== FUEL LOG OPERATIONS ===================

  async addFuelLog(userId: string, dto: CreateFuelLogDto) {
    // Verify vehicle exists
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Get vehicle fuel type for the log
    const fuelLog = await this.prisma.fuelLog.create({
      data: {
        vehicleId: dto.vehicleId,
        fueledAt: new Date(dto.fuelDate),
        fuelType: vehicle.fuelType,
        liters: dto.liters,
        pricePerLiter: dto.pricePerLiter,
        totalCost: dto.totalCost,
        odometerReading: dto.odometerReading,
        stationName: dto.stationName,
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
      },
    });

    // Update vehicle mileage
    await this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: { mileage: dto.odometerReading },
    });

    return fuelLog;
  }

  async getFuelLogs(userId: string, vehicleId?: string) {
    const where: any = {};

    if (vehicleId) {
      where.vehicleId = vehicleId;
      where.vehicle = { userId };
    } else {
      where.vehicle = { userId };
    }

    return this.prisma.fuelLog.findMany({
      where,
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
      },
      orderBy: { fueledAt: 'desc' },
      take: 50,
    });
  }

  // =================== MAINTENANCE LOG OPERATIONS ===================

  async addMaintenanceLog(userId: string, dto: CreateMaintenanceLogDto) {
    // Verify vehicle exists
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const log = await this.prisma.maintenanceLog.create({
      data: {
        vehicleId: dto.vehicleId,
        serviceDate: new Date(dto.maintenanceDate),
        type: dto.maintenanceType,
        description: dto.description,
        totalCost: dto.cost,
        odometerReading: dto.odometerReading,
        vendorName: dto.serviceProvider,
        nextServiceDate: dto.nextMaintenanceDate ? new Date(dto.nextMaintenanceDate) : undefined,
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
      },
    });

    // Update vehicle maintenance info
    await this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: {
        mileage: dto.odometerReading,
        lastServiceDate: new Date(dto.maintenanceDate),
        nextServiceDate: dto.nextMaintenanceDate ? new Date(dto.nextMaintenanceDate) : undefined,
      },
    });

    return log;
  }

  async getMaintenanceLogs(userId: string, vehicleId?: string) {
    const where: any = {};

    if (vehicleId) {
      where.vehicleId = vehicleId;
      where.vehicle = { userId };
    } else {
      where.vehicle = { userId };
    }

    return this.prisma.maintenanceLog.findMany({
      where,
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
      },
      orderBy: { serviceDate: 'desc' },
      take: 50,
    });
  }

  // =================== DASHBOARD / SUMMARY ===================

  async getFleetSummary(userId: string): Promise<FleetSummaryDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Vehicle counts by status
    const vehicleCounts = await this.prisma.vehicle.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    // Today's routes
    const todayRoutes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: { stops: true },
    });

    // Monthly fuel costs
    const monthlyFuel = await this.prisma.fuelLog.aggregate({
      where: {
        vehicle: { userId },
        fueledAt: { gte: firstDayOfMonth },
      },
      _sum: { totalCost: true },
    });

    // Monthly maintenance costs
    const monthlyMaintenance = await this.prisma.maintenanceLog.aggregate({
      where: {
        vehicle: { userId },
        serviceDate: { gte: firstDayOfMonth },
      },
      _sum: { totalCost: true },
    });

    const statusMap = new Map(vehicleCounts.map(v => [v.status, v._count.status]));

    let todayDeliveries = 0;
    let todayCompletedDeliveries = 0;
    let todayFailedDeliveries = 0;

    for (const route of todayRoutes) {
      todayDeliveries += route.stops.length;
      todayCompletedDeliveries += route.stops.filter(s => s.status === 'DELIVERED').length;
      todayFailedDeliveries += route.stops.filter(s => s.status === 'FAILED' || s.status === 'RETURNED').length;
    }

    return {
      totalVehicles: (statusMap.get(VehicleStatus.AVAILABLE) || 0) +
                     (statusMap.get(VehicleStatus.IN_USE) || 0) +
                     (statusMap.get(VehicleStatus.MAINTENANCE) || 0),
      availableVehicles: statusMap.get(VehicleStatus.AVAILABLE) || 0,
      inUseVehicles: statusMap.get(VehicleStatus.IN_USE) || 0,
      maintenanceVehicles: statusMap.get(VehicleStatus.MAINTENANCE) || 0,
      todayRoutes: todayRoutes.length,
      todayDeliveries,
      todayCompletedDeliveries,
      todayFailedDeliveries,
      monthlyFuelCost: Number(monthlyFuel._sum?.totalCost || 0),
      monthlyMaintenanceCost: Number(monthlyMaintenance._sum?.totalCost || 0),
    };
  }

  async getLiveRouteProgress(userId: string): Promise<RouteProgressDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: [RouteStatus.PLANNED, RouteStatus.IN_PROGRESS] },
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, currentLat: true, currentLng: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        stops: { select: { status: true } },
      },
    });

    return routes.map(route => ({
      routeId: route.id,
      routeName: route.routeName || `Route ${route.id.slice(-6)}`,
      driverName: route.driver ? `${route.driver.firstName} ${route.driver.lastName}` : 'Unassigned',
      vehiclePlate: route.vehicle.licensePlate,
      totalStops: route.stops.length,
      completedStops: route.stops.filter(s => s.status === 'DELIVERED').length,
      pendingStops: route.stops.filter(s => s.status === 'PENDING' || s.status === 'IN_PROGRESS').length,
      failedStops: route.stops.filter(s => s.status === 'FAILED' || s.status === 'RETURNED').length,
      status: route.status,
      currentLat: route.vehicle.currentLat ? Number(route.vehicle.currentLat) : undefined,
      currentLng: route.vehicle.currentLng ? Number(route.vehicle.currentLng) : undefined,
    }));
  }
}
