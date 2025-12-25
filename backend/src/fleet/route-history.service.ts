import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Route History & Replay Service
 * Provides historical route data for analysis and replay visualization
 * for the Munich delivery fleet.
 *
 * Features:
 * - Route history retrieval with filters
 * - GPS track replay data
 * - Planned vs actual comparison
 * - Route timeline events
 * - Historical analytics
 */

export interface RouteHistoryItem {
  id: string;
  routeName: string;
  routeDate: Date;
  driverName: string;
  vehiclePlate: string;
  status: string;
  totalStops: number;
  completedStops: number;
  failedStops: number;
  plannedDistanceKm: number;
  actualDistanceKm: number;
  plannedDurationMin: number;
  actualDurationMin: number;
  startTime: Date | null;
  endTime: Date | null;
  deliveryZone: string | null;
}

export interface RouteReplayData {
  routeId: string;
  routeName: string;
  routeDate: Date;
  driver: {
    id: string;
    name: string;
  };
  vehicle: {
    id: string;
    plate: string;
  };
  timeline: RouteTimelineEvent[];
  gpsTrack: GpsTrackPoint[];
  stops: ReplayStop[];
  summary: {
    totalDurationMin: number;
    totalDistanceKm: number;
    avgSpeedKmh: number;
    deliveryRate: number;
    onTimeRate: number;
  };
}

export interface RouteTimelineEvent {
  timestamp: Date;
  eventType: 'ROUTE_STARTED' | 'STOP_ARRIVED' | 'STOP_COMPLETED' | 'STOP_FAILED' | 'BREAK_STARTED' | 'BREAK_ENDED' | 'ROUTE_COMPLETED';
  stopId?: string;
  stopName?: string;
  address?: string;
  details?: string;
  latitude?: number;
  longitude?: number;
}

export interface GpsTrackPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}

export interface ReplayStop {
  id: string;
  sequence: number;
  recipientName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  plannedArrival: Date | null;
  actualArrival: Date | null;
  completedAt: Date | null;
  delayMinutes: number;
  hasPOD: boolean;
}

export interface PlannedVsActualComparison {
  routeId: string;
  routeName: string;
  routeDate: Date;
  distance: {
    planned: number;
    actual: number;
    differenceKm: number;
    differencePercent: number;
  };
  duration: {
    planned: number;
    actual: number;
    differenceMin: number;
    differencePercent: number;
  };
  stops: {
    planned: number;
    completed: number;
    failed: number;
    completionRate: number;
  };
  timing: {
    plannedStart: Date | null;
    actualStart: Date | null;
    startDelayMin: number;
    plannedEnd: Date | null;
    actualEnd: Date | null;
    endDelayMin: number;
  };
  stopsComparison: StopComparison[];
}

export interface StopComparison {
  stopId: string;
  sequence: number;
  recipientName: string;
  plannedArrival: Date | null;
  actualArrival: Date | null;
  delayMinutes: number;
  status: string;
  wasOnTime: boolean;
}

export interface RouteHistoryFilters {
  driverId?: string;
  vehicleId?: string;
  status?: string;
  deliveryZone?: string;
  from?: Date;
  to?: Date;
}

export interface RouteStatsSummary {
  totalRoutes: number;
  completedRoutes: number;
  inProgressRoutes: number;
  cancelledRoutes: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  avgDeliveryRate: number;
  avgDistanceKm: number;
  avgDurationMin: number;
  totalDistanceKm: number;
}

@Injectable()
export class RouteHistoryService {
  private readonly logger = new Logger(RouteHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =================== ROUTE HISTORY ===================

  /**
   * Get route history with filters and pagination
   */
  async getRouteHistory(
    userId: string,
    filters: RouteHistoryFilters = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    routes: RouteHistoryItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    this.logger.log(`Getting route history for user ${userId}`);

    const where: any = { userId };

    if (filters.driverId) {
      where.driverId = filters.driverId;
    }
    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.deliveryZone) {
      where.deliveryZone = filters.deliveryZone;
    }
    if (filters.from || filters.to) {
      where.routeDate = {};
      if (filters.from) where.routeDate.gte = filters.from;
      if (filters.to) where.routeDate.lte = filters.to;
    }

    const [routes, total] = await Promise.all([
      this.prisma.deliveryRoute.findMany({
        where,
        include: {
          driver: { select: { firstName: true, lastName: true } },
          vehicle: { select: { licensePlate: true } },
          stops: { select: { status: true } },
        },
        orderBy: { routeDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deliveryRoute.count({ where }),
    ]);

    const routeItems: RouteHistoryItem[] = routes.map(route => {
      const completedStops = route.stops.filter(s => s.status === 'DELIVERED').length;
      const failedStops = route.stops.filter(s => s.status === 'FAILED').length;

      return {
        id: route.id,
        routeName: route.routeName || `Route ${route.id.slice(-6)}`,
        routeDate: route.routeDate,
        driverName: route.driver
          ? `${route.driver.firstName} ${route.driver.lastName}`
          : 'Unassigned',
        vehiclePlate: route.vehicle.licensePlate,
        status: route.status,
        totalStops: route.stops.length,
        completedStops,
        failedStops,
        plannedDistanceKm: route.plannedDistanceKm?.toNumber() || 0,
        actualDistanceKm: route.actualDistanceKm?.toNumber() || 0,
        plannedDurationMin: route.plannedDurationMin || 0,
        actualDurationMin: route.actualDurationMin || 0,
        startTime: route.actualStartTime,
        endTime: route.actualEndTime,
        deliveryZone: route.deliveryZone,
      };
    });

    return {
      routes: routeItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // =================== ROUTE REPLAY ===================

  /**
   * Get route replay data for visualization
   */
  async getRouteReplayData(routeId: string): Promise<RouteReplayData> {
    this.logger.log(`Getting replay data for route ${routeId}`);

    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { id: true, licensePlate: true } },
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException(`Route ${routeId} not found`);
    }

    // Build timeline events
    const timeline = this.buildRouteTimeline(route);

    // Build GPS track (simulated from stop locations for now)
    const gpsTrack = this.buildGpsTrack(route.stops);

    // Build stops for replay
    const stops: ReplayStop[] = route.stops.map(stop => {
      const delayMinutes = stop.estimatedArrival && stop.actualArrival
        ? Math.round((new Date(stop.actualArrival).getTime() - new Date(stop.estimatedArrival).getTime()) / 60000)
        : 0;

      return {
        id: stop.id,
        sequence: stop.stopOrder,
        recipientName: stop.recipientName,
        address: `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`,
        latitude: stop.latitude?.toNumber() || null,
        longitude: stop.longitude?.toNumber() || null,
        status: stop.status,
        plannedArrival: stop.estimatedArrival,
        actualArrival: stop.actualArrival,
        completedAt: stop.completedAt,
        delayMinutes,
        hasPOD: !!(stop.signature || stop.photoUrl),
      };
    });

    // Calculate summary
    const completedStops = route.stops.filter(s => s.status === 'DELIVERED');
    const onTimeStops = completedStops.filter(s => {
      if (!s.estimatedArrival || !s.actualArrival) return true;
      const delay = (new Date(s.actualArrival).getTime() - new Date(s.estimatedArrival).getTime()) / 60000;
      return delay <= 15; // 15 min grace period
    });

    const totalDurationMin = route.actualStartTime && route.actualEndTime
      ? Math.round((new Date(route.actualEndTime).getTime() - new Date(route.actualStartTime).getTime()) / 60000)
      : 0;

    const totalDistanceKm = route.actualDistanceKm?.toNumber() || 0;
    const avgSpeedKmh = totalDurationMin > 0 ? (totalDistanceKm / totalDurationMin) * 60 : 0;

    return {
      routeId: route.id,
      routeName: route.routeName || `Route ${route.id.slice(-6)}`,
      routeDate: route.routeDate,
      driver: {
        id: route.driver?.id || '',
        name: route.driver ? `${route.driver.firstName} ${route.driver.lastName}` : 'Unassigned',
      },
      vehicle: {
        id: route.vehicle.id,
        plate: route.vehicle.licensePlate,
      },
      timeline,
      gpsTrack,
      stops,
      summary: {
        totalDurationMin,
        totalDistanceKm,
        avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
        deliveryRate: route.stops.length > 0
          ? Math.round((completedStops.length / route.stops.length) * 1000) / 10
          : 0,
        onTimeRate: completedStops.length > 0
          ? Math.round((onTimeStops.length / completedStops.length) * 1000) / 10
          : 0,
      },
    };
  }

  private buildRouteTimeline(route: any): RouteTimelineEvent[] {
    const timeline: RouteTimelineEvent[] = [];

    // Route started event
    if (route.actualStartTime) {
      timeline.push({
        timestamp: route.actualStartTime,
        eventType: 'ROUTE_STARTED',
        details: `Route started from depot`,
      });
    }

    // Stop events
    for (const stop of route.stops) {
      if (stop.actualArrival) {
        timeline.push({
          timestamp: stop.actualArrival,
          eventType: 'STOP_ARRIVED',
          stopId: stop.id,
          stopName: stop.recipientName,
          address: `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`,
          latitude: stop.latitude?.toNumber(),
          longitude: stop.longitude?.toNumber(),
        });
      }

      if (stop.completedAt) {
        const eventType = stop.status === 'DELIVERED' ? 'STOP_COMPLETED' : 'STOP_FAILED';
        timeline.push({
          timestamp: stop.completedAt,
          eventType,
          stopId: stop.id,
          stopName: stop.recipientName,
          details: stop.status === 'FAILED' ? stop.failureNote : undefined,
          latitude: stop.latitude?.toNumber(),
          longitude: stop.longitude?.toNumber(),
        });
      }
    }

    // Route completed event
    if (route.actualEndTime) {
      timeline.push({
        timestamp: route.actualEndTime,
        eventType: 'ROUTE_COMPLETED',
        details: `Route completed`,
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return timeline;
  }

  private buildGpsTrack(stops: any[]): GpsTrackPoint[] {
    // Build GPS track from stop locations
    // In production, this would come from real GPS tracking data
    const track: GpsTrackPoint[] = [];

    for (const stop of stops) {
      if (stop.latitude && stop.longitude) {
        // Add arrival point
        if (stop.actualArrival) {
          track.push({
            timestamp: stop.actualArrival,
            latitude: stop.latitude.toNumber(),
            longitude: stop.longitude.toNumber(),
            speed: 0, // Arrived, so speed is 0
          });
        }

        // Add departure point
        if (stop.completedAt) {
          track.push({
            timestamp: stop.completedAt,
            latitude: stop.latitude.toNumber(),
            longitude: stop.longitude.toNumber(),
            speed: 30, // Assume average city speed when departing
          });
        }
      }
    }

    // Sort by timestamp
    track.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return track;
  }

  // =================== PLANNED VS ACTUAL ===================

  /**
   * Compare planned vs actual route metrics
   */
  async getPlannedVsActual(routeId: string): Promise<PlannedVsActualComparison> {
    this.logger.log(`Getting planned vs actual comparison for route ${routeId}`);

    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException(`Route ${routeId} not found`);
    }

    const plannedDistance = route.plannedDistanceKm?.toNumber() || 0;
    const actualDistance = route.actualDistanceKm?.toNumber() || 0;
    const distanceDiff = actualDistance - plannedDistance;

    const plannedDuration = route.plannedDurationMin || 0;
    const actualDuration = route.actualDurationMin || 0;
    const durationDiff = actualDuration - plannedDuration;

    const completedStops = route.stops.filter(s => s.status === 'DELIVERED').length;
    const failedStops = route.stops.filter(s => s.status === 'FAILED').length;

    const startDelayMin = route.plannedStartTime && route.actualStartTime
      ? Math.round((new Date(route.actualStartTime).getTime() - new Date(route.plannedStartTime).getTime()) / 60000)
      : 0;

    const endDelayMin = route.plannedEndTime && route.actualEndTime
      ? Math.round((new Date(route.actualEndTime).getTime() - new Date(route.plannedEndTime).getTime()) / 60000)
      : 0;

    // Build stop comparisons
    const stopsComparison: StopComparison[] = route.stops.map(stop => {
      const delayMinutes = stop.estimatedArrival && stop.actualArrival
        ? Math.round((new Date(stop.actualArrival).getTime() - new Date(stop.estimatedArrival).getTime()) / 60000)
        : 0;

      return {
        stopId: stop.id,
        sequence: stop.stopOrder,
        recipientName: stop.recipientName,
        plannedArrival: stop.estimatedArrival,
        actualArrival: stop.actualArrival,
        delayMinutes,
        status: stop.status,
        wasOnTime: delayMinutes <= 15,
      };
    });

    return {
      routeId: route.id,
      routeName: route.routeName || `Route ${route.id.slice(-6)}`,
      routeDate: route.routeDate,
      distance: {
        planned: plannedDistance,
        actual: actualDistance,
        differenceKm: Math.round(distanceDiff * 10) / 10,
        differencePercent: plannedDistance > 0
          ? Math.round((distanceDiff / plannedDistance) * 1000) / 10
          : 0,
      },
      duration: {
        planned: plannedDuration,
        actual: actualDuration,
        differenceMin: durationDiff,
        differencePercent: plannedDuration > 0
          ? Math.round((durationDiff / plannedDuration) * 1000) / 10
          : 0,
      },
      stops: {
        planned: route.stops.length,
        completed: completedStops,
        failed: failedStops,
        completionRate: route.stops.length > 0
          ? Math.round((completedStops / route.stops.length) * 1000) / 10
          : 0,
      },
      timing: {
        plannedStart: route.plannedStartTime,
        actualStart: route.actualStartTime,
        startDelayMin,
        plannedEnd: route.plannedEndTime,
        actualEnd: route.actualEndTime,
        endDelayMin,
      },
      stopsComparison,
    };
  }

  // =================== ROUTE STATISTICS ===================

  /**
   * Get route statistics summary for a period
   */
  async getRouteStats(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<RouteStatsSummary> {
    this.logger.log(`Getting route stats for user ${userId}`);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: from, lte: to },
      },
      include: {
        stops: { select: { status: true } },
      },
    });

    const completedRoutes = routes.filter(r => r.status === 'COMPLETED').length;
    const inProgressRoutes = routes.filter(r => r.status === 'IN_PROGRESS').length;
    const cancelledRoutes = routes.filter(r => r.status === 'CANCELLED').length;

    let totalDeliveries = 0;
    let successfulDeliveries = 0;
    let failedDeliveries = 0;
    let totalDistanceKm = 0;
    let totalDurationMin = 0;
    let routesWithData = 0;

    for (const route of routes) {
      totalDeliveries += route.stops.length;
      successfulDeliveries += route.stops.filter(s => s.status === 'DELIVERED').length;
      failedDeliveries += route.stops.filter(s => s.status === 'FAILED').length;

      const distance = route.actualDistanceKm?.toNumber() || 0;
      const duration = route.actualDurationMin || 0;

      if (distance > 0 || duration > 0) {
        totalDistanceKm += distance;
        totalDurationMin += duration;
        routesWithData++;
      }
    }

    return {
      totalRoutes: routes.length,
      completedRoutes,
      inProgressRoutes,
      cancelledRoutes,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      avgDeliveryRate: totalDeliveries > 0
        ? Math.round((successfulDeliveries / totalDeliveries) * 1000) / 10
        : 0,
      avgDistanceKm: routesWithData > 0
        ? Math.round((totalDistanceKm / routesWithData) * 10) / 10
        : 0,
      avgDurationMin: routesWithData > 0
        ? Math.round(totalDurationMin / routesWithData)
        : 0,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    };
  }

  // =================== ROUTE SEARCH ===================

  /**
   * Search routes by various criteria
   */
  async searchRoutes(
    userId: string,
    query: string,
    limit: number = 10,
  ): Promise<RouteHistoryItem[]> {
    this.logger.log(`Searching routes for user ${userId} with query: ${query}`);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        OR: [
          { routeName: { contains: query, mode: 'insensitive' } },
          { deliveryZone: { contains: query, mode: 'insensitive' } },
          { driver: { firstName: { contains: query, mode: 'insensitive' } } },
          { driver: { lastName: { contains: query, mode: 'insensitive' } } },
          { vehicle: { licensePlate: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        driver: { select: { firstName: true, lastName: true } },
        vehicle: { select: { licensePlate: true } },
        stops: { select: { status: true } },
      },
      orderBy: { routeDate: 'desc' },
      take: limit,
    });

    return routes.map(route => {
      const completedStops = route.stops.filter(s => s.status === 'DELIVERED').length;
      const failedStops = route.stops.filter(s => s.status === 'FAILED').length;

      return {
        id: route.id,
        routeName: route.routeName || `Route ${route.id.slice(-6)}`,
        routeDate: route.routeDate,
        driverName: route.driver
          ? `${route.driver.firstName} ${route.driver.lastName}`
          : 'Unassigned',
        vehiclePlate: route.vehicle.licensePlate,
        status: route.status,
        totalStops: route.stops.length,
        completedStops,
        failedStops,
        plannedDistanceKm: route.plannedDistanceKm?.toNumber() || 0,
        actualDistanceKm: route.actualDistanceKm?.toNumber() || 0,
        plannedDurationMin: route.plannedDurationMin || 0,
        actualDurationMin: route.actualDurationMin || 0,
        startTime: route.actualStartTime,
        endTime: route.actualEndTime,
        deliveryZone: route.deliveryZone,
      };
    });
  }

  // =================== DELIVERY ZONES ===================

  /**
   * Get list of delivery zones with route counts
   */
  async getDeliveryZones(
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<{ zone: string; routeCount: number; deliveryCount: number }[]> {
    this.logger.log(`Getting delivery zones for user ${userId}`);

    const where: any = { userId, deliveryZone: { not: null } };
    if (from || to) {
      where.routeDate = {};
      if (from) where.routeDate.gte = from;
      if (to) where.routeDate.lte = to;
    }

    const routes = await this.prisma.deliveryRoute.findMany({
      where,
      select: {
        deliveryZone: true,
        stops: { select: { id: true } },
      },
    });

    // Group by zone
    const zoneStats: Map<string, { routeCount: number; deliveryCount: number }> = new Map();

    for (const route of routes) {
      const zone = route.deliveryZone || 'Unknown';
      if (!zoneStats.has(zone)) {
        zoneStats.set(zone, { routeCount: 0, deliveryCount: 0 });
      }
      const stats = zoneStats.get(zone)!;
      stats.routeCount++;
      stats.deliveryCount += route.stops.length;
    }

    return Array.from(zoneStats.entries())
      .map(([zone, stats]) => ({
        zone,
        routeCount: stats.routeCount,
        deliveryCount: stats.deliveryCount,
      }))
      .sort((a, b) => b.routeCount - a.routeCount);
  }
}
