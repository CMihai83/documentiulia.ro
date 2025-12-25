import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeofenceType, GeofenceEventType } from '@prisma/client';

// DTOs
export interface GpsPositionDto {
  vehicleId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  ignition?: boolean;
  engineRunning?: boolean;
  recordedAt?: Date;
  routeId?: string;
}

export interface CreateGeofenceDto {
  name: string;
  description?: string;
  type: GeofenceType;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  polygonPoints?: Array<{ lat: number; lng: number }>;
  alertOnEntry?: boolean;
  alertOnExit?: boolean;
  deliveryZone?: string;
}

export interface VehicleTrackingInfo {
  vehicleId: string;
  licensePlate: string;
  driverName?: string;
  currentPosition: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    updatedAt: Date;
  } | null;
  status: string;
  activeRoute?: {
    routeId: string;
    routeName: string;
    completedStops: number;
    totalStops: number;
    estimatedCompletion?: Date;
  };
}

export interface GeofenceAlert {
  geofenceId: string;
  geofenceName: string;
  vehicleId: string;
  licensePlate: string;
  eventType: 'ENTER' | 'EXIT';
  position: { lat: number; lng: number };
  occurredAt: Date;
}

export interface PositionHistoryOptions {
  from?: Date;
  to?: Date;
  limit?: number;
  routeId?: string;
}

// Munich delivery zone presets
export const MUNICH_DELIVERY_ZONES = {
  'Munich-Schwabing': { lat: 48.1716, lng: 11.5753, radius: 2000 },
  'Munich-Pasing': { lat: 48.1500, lng: 11.4537, radius: 2500 },
  'Munich-Bogenhausen': { lat: 48.1525, lng: 11.6205, radius: 2000 },
  'Munich-Sendling': { lat: 48.1188, lng: 11.5414, radius: 1800 },
  'Munich-Laim': { lat: 48.1414, lng: 11.5022, radius: 1500 },
  'Munich-Moosach': { lat: 48.1829, lng: 11.5180, radius: 2000 },
  'Munich-Haidhausen': { lat: 48.1299, lng: 11.5997, radius: 1800 },
  'Munich-Giesing': { lat: 48.1080, lng: 11.5765, radius: 2000 },
  'Munich-Trudering': { lat: 48.1218, lng: 11.6670, radius: 2500 },
  'Munich-Neuhausen': { lat: 48.1575, lng: 11.5355, radius: 1800 },
};

@Injectable()
export class GpsTrackingService {
  // In-memory cache for latest positions (for real-time updates)
  private positionCache: Map<string, GpsPositionDto & { updatedAt: Date }> = new Map();

  // Subscribers for real-time updates
  private subscribers: Map<string, ((position: GpsPositionDto) => void)[]> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // =================== POSITION TRACKING ===================

  async updatePosition(dto: GpsPositionDto): Promise<void> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${dto.vehicleId} not found`);
    }

    const recordedAt = dto.recordedAt || new Date();

    // Store in database
    await this.prisma.vehiclePosition.create({
      data: {
        vehicleId: dto.vehicleId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        altitude: dto.altitude,
        speed: dto.speed,
        heading: dto.heading,
        accuracy: dto.accuracy,
        ignition: dto.ignition ?? true,
        engineRunning: dto.engineRunning ?? true,
        routeId: dto.routeId,
        recordedAt,
      },
    });

    // Update vehicle current location
    await this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: {
        currentLat: dto.latitude,
        currentLng: dto.longitude,
        lastLocationAt: recordedAt,
      },
    });

    // Update cache
    this.positionCache.set(dto.vehicleId, {
      ...dto,
      updatedAt: recordedAt,
    });

    // Check geofences and trigger events
    await this.checkGeofences(dto);

    // Notify subscribers
    this.notifySubscribers(dto.vehicleId, dto);
  }

  async batchUpdatePositions(positions: GpsPositionDto[]): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const position of positions) {
      try {
        await this.updatePosition(position);
        updated++;
      } catch (error) {
        errors.push(`Vehicle ${position.vehicleId}: ${error.message}`);
      }
    }

    return { updated, errors };
  }

  async getLatestPosition(vehicleId: string): Promise<(GpsPositionDto & { updatedAt: Date }) | null> {
    // Check cache first
    const cached = this.positionCache.get(vehicleId);
    if (cached) {
      return cached;
    }

    // Fallback to database
    const position = await this.prisma.vehiclePosition.findFirst({
      where: { vehicleId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!position) {
      return null;
    }

    const result = {
      vehicleId: position.vehicleId,
      latitude: Number(position.latitude),
      longitude: Number(position.longitude),
      altitude: position.altitude ? Number(position.altitude) : undefined,
      speed: position.speed ? Number(position.speed) : undefined,
      heading: position.heading ?? undefined,
      accuracy: position.accuracy ? Number(position.accuracy) : undefined,
      ignition: position.ignition,
      engineRunning: position.engineRunning,
      routeId: position.routeId ?? undefined,
      updatedAt: position.recordedAt,
    };

    // Cache it
    this.positionCache.set(vehicleId, result);

    return result;
  }

  async getPositionHistory(
    vehicleId: string,
    options: PositionHistoryOptions = {},
  ): Promise<Array<GpsPositionDto & { recordedAt: Date }>> {
    const where: any = { vehicleId };

    if (options.from || options.to) {
      where.recordedAt = {};
      if (options.from) where.recordedAt.gte = options.from;
      if (options.to) where.recordedAt.lte = options.to;
    }

    if (options.routeId) {
      where.routeId = options.routeId;
    }

    const positions = await this.prisma.vehiclePosition.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: options.limit || 1000,
    });

    return positions.map(p => ({
      vehicleId: p.vehicleId,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      altitude: p.altitude ? Number(p.altitude) : undefined,
      speed: p.speed ? Number(p.speed) : undefined,
      heading: p.heading ?? undefined,
      accuracy: p.accuracy ? Number(p.accuracy) : undefined,
      ignition: p.ignition,
      engineRunning: p.engineRunning,
      routeId: p.routeId ?? undefined,
      recordedAt: p.recordedAt,
    }));
  }

  // =================== FLEET TRACKING ===================

  async getAllVehiclePositions(userId: string): Promise<VehicleTrackingInfo[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        assignedDriver: {
          select: { firstName: true, lastName: true },
        },
        deliveryRoutes: {
          where: {
            routeDate: {
              gte: today,
              lt: tomorrow,
            },
            status: { in: ['PLANNED', 'IN_PROGRESS'] },
          },
          include: {
            stops: {
              select: { status: true },
            },
          },
          take: 1,
        },
      },
    });

    return vehicles.map(v => {
      const route = v.deliveryRoutes[0];
      const completedStops = route?.stops.filter(s => s.status === 'DELIVERED').length || 0;
      const totalStops = route?.stops.length || 0;

      return {
        vehicleId: v.id,
        licensePlate: v.licensePlate,
        driverName: v.assignedDriver
          ? `${v.assignedDriver.firstName} ${v.assignedDriver.lastName}`
          : undefined,
        currentPosition: v.currentLat && v.currentLng
          ? {
              latitude: Number(v.currentLat),
              longitude: Number(v.currentLng),
              updatedAt: v.lastLocationAt || new Date(),
            }
          : null,
        status: v.status,
        activeRoute: route
          ? {
              routeId: route.id,
              routeName: route.routeName || `Route ${route.id.slice(-6)}`,
              completedStops,
              totalStops,
              estimatedCompletion: route.plannedEndTime || undefined,
            }
          : undefined,
      };
    });
  }

  async getRouteTrack(routeId: string): Promise<{
    positions: Array<{ lat: number; lng: number; recordedAt: Date }>;
    stops: Array<{
      id: string;
      order: number;
      lat: number;
      lng: number;
      status: string;
      recipientName: string;
    }>;
    totalDistanceKm: number;
  }> {
    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const positions = await this.prisma.vehiclePosition.findMany({
      where: { routeId },
      orderBy: { recordedAt: 'asc' },
    });

    // Calculate total distance from positions
    let totalDistanceKm = 0;
    for (let i = 1; i < positions.length; i++) {
      totalDistanceKm += this.haversineDistance(
        Number(positions[i - 1].latitude),
        Number(positions[i - 1].longitude),
        Number(positions[i].latitude),
        Number(positions[i].longitude),
      );
    }

    return {
      positions: positions.map(p => ({
        lat: Number(p.latitude),
        lng: Number(p.longitude),
        recordedAt: p.recordedAt,
      })),
      stops: route.stops
        .filter(s => s.latitude && s.longitude)
        .map(s => ({
          id: s.id,
          order: s.stopOrder,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          status: s.status,
          recipientName: s.recipientName,
        })),
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    };
  }

  // =================== GEOFENCING ===================

  async createGeofence(userId: string, dto: CreateGeofenceDto, organizationId?: string) {
    return this.prisma.geofence.create({
      data: {
        userId,
        organizationId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusMeters: dto.radiusMeters,
        polygonPoints: dto.polygonPoints,
        alertOnEntry: dto.alertOnEntry ?? true,
        alertOnExit: dto.alertOnExit ?? true,
        deliveryZone: dto.deliveryZone,
      },
    });
  }

  async getGeofences(userId: string) {
    return this.prisma.geofence.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createMunichDeliveryZones(userId: string, organizationId?: string): Promise<number> {
    const zones = Object.entries(MUNICH_DELIVERY_ZONES);
    let created = 0;

    for (const [name, config] of zones) {
      const existing = await this.prisma.geofence.findFirst({
        where: { userId, name },
      });

      if (!existing) {
        await this.prisma.geofence.create({
          data: {
            userId,
            organizationId,
            name,
            description: `Munich delivery zone: ${name}`,
            type: GeofenceType.CIRCLE,
            centerLat: config.lat,
            centerLng: config.lng,
            radiusMeters: config.radius,
            deliveryZone: name,
            alertOnEntry: true,
            alertOnExit: true,
          },
        });
        created++;
      }
    }

    return created;
  }

  async deleteGeofence(id: string, userId: string): Promise<void> {
    const geofence = await this.prisma.geofence.findFirst({
      where: { id, userId },
    });

    if (!geofence) {
      throw new NotFoundException('Geofence not found');
    }

    await this.prisma.geofence.delete({ where: { id } });
  }

  async getGeofenceEvents(
    userId: string,
    options: { from?: Date; to?: Date; vehicleId?: string; geofenceId?: string } = {},
  ): Promise<GeofenceAlert[]> {
    const where: any = {
      geofence: { userId },
    };

    if (options.from || options.to) {
      where.occurredAt = {};
      if (options.from) where.occurredAt.gte = options.from;
      if (options.to) where.occurredAt.lte = options.to;
    }

    if (options.vehicleId) {
      where.vehicleId = options.vehicleId;
    }

    if (options.geofenceId) {
      where.geofenceId = options.geofenceId;
    }

    const events = await this.prisma.geofenceEvent.findMany({
      where,
      include: {
        geofence: { select: { name: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });

    // Get vehicle info
    const vehicleIds = [...new Set(events.map(e => e.vehicleId))];
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, licensePlate: true },
    });
    const vehicleMap = new Map(vehicles.map(v => [v.id, v.licensePlate]));

    return events.map(e => ({
      geofenceId: e.geofenceId,
      geofenceName: e.geofence.name,
      vehicleId: e.vehicleId,
      licensePlate: vehicleMap.get(e.vehicleId) || 'Unknown',
      eventType: e.eventType as 'ENTER' | 'EXIT',
      position: { lat: Number(e.latitude), lng: Number(e.longitude) },
      occurredAt: e.occurredAt,
    }));
  }

  private async checkGeofences(position: GpsPositionDto): Promise<void> {
    // Get vehicle to find its user
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: position.vehicleId },
    });

    if (!vehicle) return;

    // Get active geofences for this user
    const geofences = await this.prisma.geofence.findMany({
      where: {
        userId: vehicle.userId,
        isActive: true,
      },
    });

    for (const geofence of geofences) {
      const isInside = this.isInsideGeofence(
        position.latitude,
        position.longitude,
        geofence,
      );

      // Get last event for this vehicle/geofence pair
      const lastEvent = await this.prisma.geofenceEvent.findFirst({
        where: {
          geofenceId: geofence.id,
          vehicleId: position.vehicleId,
        },
        orderBy: { occurredAt: 'desc' },
      });

      const wasInside = lastEvent?.eventType === GeofenceEventType.ENTER;

      // Detect entry
      if (isInside && !wasInside && geofence.alertOnEntry) {
        await this.prisma.geofenceEvent.create({
          data: {
            geofenceId: geofence.id,
            vehicleId: position.vehicleId,
            eventType: GeofenceEventType.ENTER,
            latitude: position.latitude,
            longitude: position.longitude,
          },
        });
      }

      // Detect exit
      if (!isInside && wasInside && geofence.alertOnExit) {
        await this.prisma.geofenceEvent.create({
          data: {
            geofenceId: geofence.id,
            vehicleId: position.vehicleId,
            eventType: GeofenceEventType.EXIT,
            latitude: position.latitude,
            longitude: position.longitude,
          },
        });
      }
    }
  }

  private isInsideGeofence(
    lat: number,
    lng: number,
    geofence: { type: GeofenceType; centerLat: any; centerLng: any; radiusMeters: number | null; polygonPoints: any },
  ): boolean {
    if (geofence.type === GeofenceType.CIRCLE) {
      if (!geofence.centerLat || !geofence.centerLng || !geofence.radiusMeters) {
        return false;
      }
      const distance = this.haversineDistance(
        lat,
        lng,
        Number(geofence.centerLat),
        Number(geofence.centerLng),
      );
      return distance * 1000 <= geofence.radiusMeters; // Convert km to meters
    }

    if (geofence.type === GeofenceType.POLYGON && geofence.polygonPoints) {
      const points = geofence.polygonPoints as Array<{ lat: number; lng: number }>;
      return this.isPointInPolygon(lat, lng, points);
    }

    return false;
  }

  private isPointInPolygon(
    lat: number,
    lng: number,
    polygon: Array<{ lat: number; lng: number }>,
  ): boolean {
    // Ray casting algorithm
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lat;
      const yi = polygon[i].lng;
      const xj = polygon[j].lat;
      const yj = polygon[j].lng;

      if (
        yi > lng !== yj > lng &&
        lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  // =================== ANALYTICS ===================

  async getVehicleStatistics(
    vehicleId: string,
    from: Date,
    to: Date,
  ): Promise<{
    totalDistanceKm: number;
    averageSpeedKmh: number;
    maxSpeedKmh: number;
    totalDrivingTimeMinutes: number;
    idleTimeMinutes: number;
    positionCount: number;
  }> {
    const positions = await this.prisma.vehiclePosition.findMany({
      where: {
        vehicleId,
        recordedAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { recordedAt: 'asc' },
    });

    if (positions.length === 0) {
      return {
        totalDistanceKm: 0,
        averageSpeedKmh: 0,
        maxSpeedKmh: 0,
        totalDrivingTimeMinutes: 0,
        idleTimeMinutes: 0,
        positionCount: 0,
      };
    }

    let totalDistanceKm = 0;
    let maxSpeedKmh = 0;
    let speedSum = 0;
    let speedCount = 0;
    let drivingTimeMs = 0;
    let idleTimeMs = 0;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const speed = pos.speed ? Number(pos.speed) : 0;

      if (speed > maxSpeedKmh) maxSpeedKmh = speed;
      if (speed > 0) {
        speedSum += speed;
        speedCount++;
      }

      if (i > 0) {
        const prevPos = positions[i - 1];
        const distance = this.haversineDistance(
          Number(prevPos.latitude),
          Number(prevPos.longitude),
          Number(pos.latitude),
          Number(pos.longitude),
        );
        totalDistanceKm += distance;

        const timeDiff = pos.recordedAt.getTime() - prevPos.recordedAt.getTime();
        if (speed > 5) {
          drivingTimeMs += timeDiff;
        } else if (pos.engineRunning) {
          idleTimeMs += timeDiff;
        }
      }
    }

    return {
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      averageSpeedKmh: speedCount > 0 ? Math.round(speedSum / speedCount) : 0,
      maxSpeedKmh: Math.round(maxSpeedKmh),
      totalDrivingTimeMinutes: Math.round(drivingTimeMs / 60000),
      idleTimeMinutes: Math.round(idleTimeMs / 60000),
      positionCount: positions.length,
    };
  }

  async getFleetHeatmap(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<Array<{ lat: number; lng: number; weight: number }>> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      select: { id: true },
    });

    const vehicleIds = vehicles.map(v => v.id);

    const positions = await this.prisma.vehiclePosition.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        recordedAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        latitude: true,
        longitude: true,
      },
    });

    // Grid-based aggregation (0.001 degree ~ 100m)
    const gridSize = 0.001;
    const grid: Map<string, number> = new Map();

    for (const pos of positions) {
      const lat = Math.round(Number(pos.latitude) / gridSize) * gridSize;
      const lng = Math.round(Number(pos.longitude) / gridSize) * gridSize;
      const key = `${lat},${lng}`;
      grid.set(key, (grid.get(key) || 0) + 1);
    }

    return Array.from(grid.entries())
      .map(([key, weight]) => {
        const [lat, lng] = key.split(',').map(Number);
        return { lat, lng, weight };
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 500); // Top 500 hotspots
  }

  // =================== REAL-TIME SUBSCRIPTIONS ===================

  subscribe(vehicleId: string, callback: (position: GpsPositionDto) => void): () => void {
    if (!this.subscribers.has(vehicleId)) {
      this.subscribers.set(vehicleId, []);
    }
    this.subscribers.get(vehicleId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(vehicleId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  subscribeAll(userId: string, callback: (position: GpsPositionDto) => void): () => void {
    const key = `user:${userId}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key)!.push(callback);

    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private async notifySubscribers(vehicleId: string, position: GpsPositionDto): Promise<void> {
    // Notify vehicle-specific subscribers
    const vehicleCallbacks = this.subscribers.get(vehicleId) || [];
    vehicleCallbacks.forEach(cb => cb(position));

    // Notify user-level subscribers
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { userId: true },
    });

    if (vehicle) {
      const userCallbacks = this.subscribers.get(`user:${vehicle.userId}`) || [];
      userCallbacks.forEach(cb => cb(position));
    }
  }

  // =================== UTILITIES ===================

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Clean up old position data (for maintenance)
  async cleanupOldPositions(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.vehiclePosition.deleteMany({
      where: {
        recordedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
