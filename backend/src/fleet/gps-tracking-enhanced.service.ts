import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Enhanced GPS Tracking Service
 * Real-time GPS tracking enhancements for fleet management.
 *
 * Features:
 * - Live ETA calculations with traffic estimation
 * - Speed violation detection and alerts
 * - Route deviation monitoring
 * - Driver behavior scoring (acceleration, braking, cornering)
 * - Fuel efficiency estimation
 * - GPS device health monitoring
 * - Historical playback with interpolation
 * - Proximity alerts
 */

export interface LiveETA {
  routeId: string;
  vehicleId: string;
  currentStopIndex: number;
  nextStop: {
    id: string;
    name: string;
    etaMinutes: number;
    etaTime: Date;
    distanceKm: number;
  } | null;
  remainingStops: number;
  routeCompletionEta: Date;
  estimatedTotalMinutes: number;
  delayMinutes: number;
  status: 'ON_TIME' | 'SLIGHTLY_DELAYED' | 'DELAYED' | 'SEVERELY_DELAYED';
}

export interface SpeedViolation {
  id: string;
  vehicleId: string;
  driverId?: string;
  currentSpeed: number;
  speedLimit: number;
  excessSpeed: number;
  duration?: number; // seconds
  position: { lat: number; lng: number };
  roadType?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  occurredAt: Date;
}

export interface RouteDeviation {
  id: string;
  routeId: string;
  vehicleId: string;
  deviationMeters: number;
  deviationDurationMinutes: number;
  position: { lat: number; lng: number };
  plannedPosition: { lat: number; lng: number };
  reason?: 'TRAFFIC' | 'ROAD_CLOSURE' | 'UNAUTHORIZED' | 'UNKNOWN';
  startedAt: Date;
  resolvedAt?: Date;
}

export interface DriverBehaviorScore {
  vehicleId: string;
  driverId?: string;
  driverName?: string;
  period: { from: Date; to: Date };
  overallScore: number; // 0-100
  categories: {
    acceleration: { score: number; events: number };
    braking: { score: number; events: number };
    cornering: { score: number; events: number };
    speeding: { score: number; events: number };
    idling: { score: number; minutes: number };
  };
  comparison: {
    fleetAverage: number;
    percentile: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
  recommendations: string[];
}

export interface FuelEfficiencyData {
  vehicleId: string;
  period: { from: Date; to: Date };
  totalDistanceKm: number;
  estimatedFuelLiters: number;
  averageConsumption: number; // L/100km
  efficientDrivingPercent: number;
  idleFuelWaste: number; // liters
  estimatedCostEur: number;
  comparison: {
    vehicleBaseline: number;
    fleetAverage: number;
    percentSavings: number;
  };
}

export interface GpsDeviceHealth {
  vehicleId: string;
  licensePlate: string;
  deviceId?: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN';
  lastSignal: Date;
  signalAge: number; // seconds
  batteryLevel?: number; // percent
  signalStrength?: number; // dBm or percentage
  gpsAccuracy?: number; // meters
  firmwareVersion?: string;
  issues: string[];
}

export interface PlaybackFrame {
  timestamp: Date;
  position: { lat: number; lng: number };
  speed: number;
  heading: number;
  isInterpolated: boolean;
  stopVisited?: string;
  event?: string;
}

export interface ProximityAlert {
  id: string;
  vehicleId: string;
  targetType: 'VEHICLE' | 'STOP' | 'GEOFENCE' | 'CUSTOMER';
  targetId: string;
  targetName: string;
  distanceMeters: number;
  etaMinutes: number;
  position: { lat: number; lng: number };
  alertedAt: Date;
}

// Munich area speed limits by road type
const SPEED_LIMITS = {
  RESIDENTIAL: 30,
  URBAN: 50,
  MAIN_ROAD: 60,
  HIGHWAY: 100,
  AUTOBAHN: 130,
  DEFAULT: 50, // Munich default
};

// Driver behavior thresholds
const BEHAVIOR_THRESHOLDS = {
  HARSH_ACCELERATION: 2.5, // m/s²
  HARSH_BRAKING: -3.0, // m/s²
  HARSH_CORNERING: 0.4, // g-force
  EXCESSIVE_IDLE: 5, // minutes
  SPEEDING_THRESHOLD: 10, // km/h over limit
};

@Injectable()
export class GpsTrackingEnhancedService {
  private readonly logger = new Logger(GpsTrackingEnhancedService.name);

  // In-memory caches
  private etaCache: Map<string, LiveETA> = new Map();
  private speedViolations: Map<string, SpeedViolation[]> = new Map();
  private routeDeviations: Map<string, RouteDeviation[]> = new Map();
  private behaviorEvents: Map<string, any[]> = new Map();
  private deviceHealth: Map<string, GpsDeviceHealth> = new Map();
  private proximityAlerts: Map<string, ProximityAlert[]> = new Map();

  private violationCounter = 0;
  private deviationCounter = 0;
  private alertCounter = 0;

  constructor(private readonly prisma: PrismaService) {}

  // =================== LIVE ETA ===================

  /**
   * Calculate live ETA for a route
   */
  async calculateLiveETA(
    routeId: string,
    currentPosition: { lat: number; lng: number },
  ): Promise<LiveETA> {
    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        vehicle: true,
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      throw new Error('Route not found');
    }

    // Find current stop (first non-delivered)
    const currentStopIndex = route.stops.findIndex(
      s => s.status !== 'DELIVERED' && s.status !== 'RETURNED',
    );

    const remainingStops = route.stops.filter(
      s => s.status !== 'DELIVERED' && s.status !== 'RETURNED',
    );

    // Calculate ETA to next stop
    let nextStopEta = null;
    if (remainingStops.length > 0 && remainingStops[0].latitude && remainingStops[0].longitude) {
      const nextStop = remainingStops[0];
      const distanceKm = this.haversineDistance(
        currentPosition.lat,
        currentPosition.lng,
        Number(nextStop.latitude),
        Number(nextStop.longitude),
      );

      // Average speed in Munich urban: 25 km/h with traffic
      const averageSpeedKmh = this.estimateAverageSpeed();
      const etaMinutes = Math.ceil((distanceKm / averageSpeedKmh) * 60);

      nextStopEta = {
        id: nextStop.id,
        name: nextStop.recipientName || `Stop ${nextStop.stopOrder}`,
        etaMinutes,
        etaTime: new Date(Date.now() + etaMinutes * 60 * 1000),
        distanceKm: Math.round(distanceKm * 10) / 10,
      };
    }

    // Calculate total remaining time
    let totalRemainingKm = 0;
    for (let i = 0; i < remainingStops.length; i++) {
      const stop = remainingStops[i];
      if (!stop.latitude || !stop.longitude) continue;

      if (i === 0) {
        totalRemainingKm += this.haversineDistance(
          currentPosition.lat,
          currentPosition.lng,
          Number(stop.latitude),
          Number(stop.longitude),
        );
      } else {
        const prevStop = remainingStops[i - 1];
        if (prevStop.latitude && prevStop.longitude) {
          totalRemainingKm += this.haversineDistance(
            Number(prevStop.latitude),
            Number(prevStop.longitude),
            Number(stop.latitude),
            Number(stop.longitude),
          );
        }
      }
    }

    // Add service time per stop (average 3 min)
    const serviceTimeMinutes = remainingStops.length * 3;
    const drivingTimeMinutes = Math.ceil((totalRemainingKm / this.estimateAverageSpeed()) * 60);
    const estimatedTotalMinutes = drivingTimeMinutes + serviceTimeMinutes;

    // Calculate delay
    const plannedEndTime = route.plannedEndTime || new Date(Date.now() + 4 * 60 * 60 * 1000);
    const estimatedEndTime = new Date(Date.now() + estimatedTotalMinutes * 60 * 1000);
    const delayMinutes = Math.max(0, Math.floor((estimatedEndTime.getTime() - plannedEndTime.getTime()) / 60000));

    // Determine status
    let status: LiveETA['status'] = 'ON_TIME';
    if (delayMinutes > 60) status = 'SEVERELY_DELAYED';
    else if (delayMinutes > 30) status = 'DELAYED';
    else if (delayMinutes > 10) status = 'SLIGHTLY_DELAYED';

    const eta: LiveETA = {
      routeId,
      vehicleId: route.vehicleId,
      currentStopIndex,
      nextStop: nextStopEta,
      remainingStops: remainingStops.length,
      routeCompletionEta: estimatedEndTime,
      estimatedTotalMinutes,
      delayMinutes,
      status,
    };

    this.etaCache.set(routeId, eta);
    return eta;
  }

  /**
   * Get all live ETAs for a user's fleet
   */
  async getFleetLiveETAs(userId: string): Promise<LiveETA[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: today },
        status: 'IN_PROGRESS',
      },
      include: {
        vehicle: true,
      },
    });

    const etas: LiveETA[] = [];
    for (const route of routes) {
      if (route.vehicle?.currentLat && route.vehicle?.currentLng) {
        try {
          const eta = await this.calculateLiveETA(route.id, {
            lat: Number(route.vehicle.currentLat),
            lng: Number(route.vehicle.currentLng),
          });
          etas.push(eta);
        } catch (error) {
          this.logger.warn(`Failed to calculate ETA for route ${route.id}: ${error}`);
        }
      }
    }

    return etas;
  }

  // =================== SPEED VIOLATIONS ===================

  /**
   * Check for speed violations
   */
  async checkSpeedViolation(
    vehicleId: string,
    currentSpeed: number,
    position: { lat: number; lng: number },
    roadType?: string,
  ): Promise<SpeedViolation | null> {
    const speedLimit = this.getSpeedLimit(roadType || 'URBAN', position);

    if (currentSpeed <= speedLimit + BEHAVIOR_THRESHOLDS.SPEEDING_THRESHOLD) {
      return null;
    }

    const excessSpeed = currentSpeed - speedLimit;
    let severity: SpeedViolation['severity'] = 'LOW';
    if (excessSpeed > 40) severity = 'CRITICAL';
    else if (excessSpeed > 25) severity = 'HIGH';
    else if (excessSpeed > 15) severity = 'MEDIUM';

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { assignedDriver: true },
    });

    const violation: SpeedViolation = {
      id: `spd-${++this.violationCounter}-${Date.now()}`,
      vehicleId,
      driverId: vehicle?.assignedDriverId || undefined,
      currentSpeed,
      speedLimit,
      excessSpeed,
      position,
      roadType,
      severity,
      occurredAt: new Date(),
    };

    const userViolations = this.speedViolations.get(vehicle?.userId || '') || [];
    userViolations.push(violation);
    this.speedViolations.set(vehicle?.userId || '', userViolations);

    this.logger.warn(`Speed violation: Vehicle ${vehicleId} at ${currentSpeed} km/h (limit: ${speedLimit})`);

    return violation;
  }

  /**
   * Get recent speed violations
   */
  async getSpeedViolations(
    userId: string,
    options?: { from?: Date; to?: Date; vehicleId?: string; severity?: SpeedViolation['severity'] },
  ): Promise<SpeedViolation[]> {
    let violations = this.speedViolations.get(userId) || [];

    if (options?.vehicleId) {
      violations = violations.filter(v => v.vehicleId === options.vehicleId);
    }
    if (options?.severity) {
      violations = violations.filter(v => v.severity === options.severity);
    }
    if (options?.from) {
      violations = violations.filter(v => v.occurredAt >= options.from!);
    }
    if (options?.to) {
      violations = violations.filter(v => v.occurredAt <= options.to!);
    }

    return violations.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  // =================== ROUTE DEVIATION ===================

  /**
   * Check for route deviation
   */
  async checkRouteDeviation(
    routeId: string,
    currentPosition: { lat: number; lng: number },
  ): Promise<RouteDeviation | null> {
    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) return null;

    // Get planned path (straight lines between stops for simplicity)
    const stops = route.stops.filter(s => s.latitude && s.longitude);
    if (stops.length < 2) return null;

    // Find minimum distance to planned route
    let minDistanceMeters = Infinity;
    let nearestPlannedPoint = { lat: 0, lng: 0 };

    for (let i = 0; i < stops.length - 1; i++) {
      const segmentStart = {
        lat: Number(stops[i].latitude),
        lng: Number(stops[i].longitude),
      };
      const segmentEnd = {
        lat: Number(stops[i + 1].latitude),
        lng: Number(stops[i + 1].longitude),
      };

      const { distance, nearestPoint } = this.distanceToSegment(
        currentPosition,
        segmentStart,
        segmentEnd,
      );

      if (distance < minDistanceMeters) {
        minDistanceMeters = distance;
        nearestPlannedPoint = nearestPoint;
      }
    }

    // Threshold: 500 meters deviation
    const deviationThreshold = 500;
    if (minDistanceMeters <= deviationThreshold) {
      return null;
    }

    // Check for existing ongoing deviation
    const existingDeviations = this.routeDeviations.get(routeId) || [];
    const ongoingDeviation = existingDeviations.find(d => !d.resolvedAt);

    if (ongoingDeviation) {
      // Update existing deviation
      ongoingDeviation.deviationMeters = Math.round(minDistanceMeters);
      ongoingDeviation.deviationDurationMinutes = Math.round(
        (Date.now() - ongoingDeviation.startedAt.getTime()) / 60000,
      );
      ongoingDeviation.position = currentPosition;
      return ongoingDeviation;
    }

    // Create new deviation
    const deviation: RouteDeviation = {
      id: `dev-${++this.deviationCounter}-${Date.now()}`,
      routeId,
      vehicleId: route.vehicleId,
      deviationMeters: Math.round(minDistanceMeters),
      deviationDurationMinutes: 0,
      position: currentPosition,
      plannedPosition: nearestPlannedPoint,
      reason: 'UNKNOWN',
      startedAt: new Date(),
    };

    existingDeviations.push(deviation);
    this.routeDeviations.set(routeId, existingDeviations);

    this.logger.warn(`Route deviation detected: ${route.id} - ${minDistanceMeters}m off route`);

    return deviation;
  }

  /**
   * Get route deviations
   */
  async getRouteDeviations(
    userId: string,
    options?: { routeId?: string; onlyActive?: boolean },
  ): Promise<RouteDeviation[]> {
    const routes = await this.prisma.deliveryRoute.findMany({
      where: { userId },
      select: { id: true },
    });

    let allDeviations: RouteDeviation[] = [];
    for (const route of routes) {
      const deviations = this.routeDeviations.get(route.id) || [];
      allDeviations.push(...deviations);
    }

    if (options?.routeId) {
      allDeviations = allDeviations.filter(d => d.routeId === options.routeId);
    }
    if (options?.onlyActive) {
      allDeviations = allDeviations.filter(d => !d.resolvedAt);
    }

    return allDeviations.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Resolve route deviation
   */
  async resolveRouteDeviation(routeId: string, deviationId: string): Promise<void> {
    const deviations = this.routeDeviations.get(routeId) || [];
    const deviation = deviations.find(d => d.id === deviationId);
    if (deviation) {
      deviation.resolvedAt = new Date();
    }
  }

  // =================== DRIVER BEHAVIOR SCORING ===================

  /**
   * Record a behavior event
   */
  async recordBehaviorEvent(
    vehicleId: string,
    eventType: 'HARSH_ACCELERATION' | 'HARSH_BRAKING' | 'HARSH_CORNERING' | 'SPEEDING' | 'EXCESSIVE_IDLE',
    value: number,
    position?: { lat: number; lng: number },
  ): Promise<void> {
    const events = this.behaviorEvents.get(vehicleId) || [];
    events.push({
      type: eventType,
      value,
      position,
      occurredAt: new Date(),
    });
    this.behaviorEvents.set(vehicleId, events);
  }

  /**
   * Calculate driver behavior score
   */
  async calculateDriverBehaviorScore(
    vehicleId: string,
    from: Date,
    to: Date,
  ): Promise<DriverBehaviorScore> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { assignedDriver: true },
    });

    const events = (this.behaviorEvents.get(vehicleId) || []).filter(
      e => e.occurredAt >= from && e.occurredAt <= to,
    );

    // Count events by type
    const accelerationEvents = events.filter(e => e.type === 'HARSH_ACCELERATION').length;
    const brakingEvents = events.filter(e => e.type === 'HARSH_BRAKING').length;
    const corneringEvents = events.filter(e => e.type === 'HARSH_CORNERING').length;
    const speedingEvents = events.filter(e => e.type === 'SPEEDING').length;
    const idleMinutes = events
      .filter(e => e.type === 'EXCESSIVE_IDLE')
      .reduce((sum, e) => sum + e.value, 0);

    // Calculate scores (100 = perfect, deduct for events)
    const accelerationScore = Math.max(0, 100 - accelerationEvents * 5);
    const brakingScore = Math.max(0, 100 - brakingEvents * 5);
    const corneringScore = Math.max(0, 100 - corneringEvents * 5);
    const speedingScore = Math.max(0, 100 - speedingEvents * 10);
    const idlingScore = Math.max(0, 100 - idleMinutes * 2);

    // Overall score (weighted average)
    const overallScore = Math.round(
      accelerationScore * 0.2 +
      brakingScore * 0.25 +
      corneringScore * 0.15 +
      speedingScore * 0.3 +
      idlingScore * 0.1,
    );

    // Generate recommendations
    const recommendations: string[] = [];
    if (accelerationScore < 70) {
      recommendations.push('Sanfteres Anfahren reduziert Kraftstoffverbrauch');
    }
    if (brakingScore < 70) {
      recommendations.push('Vorausschauendes Fahren ermöglicht gleichmäßiges Bremsen');
    }
    if (speedingScore < 70) {
      recommendations.push('Geschwindigkeitslimits einhalten für Sicherheit und Effizienz');
    }
    if (idlingScore < 80) {
      recommendations.push('Motor bei längeren Stopps abstellen');
    }

    return {
      vehicleId,
      driverId: vehicle?.assignedDriverId || undefined,
      driverName: vehicle?.assignedDriver
        ? `${vehicle.assignedDriver.firstName} ${vehicle.assignedDriver.lastName}`
        : undefined,
      period: { from, to },
      overallScore,
      categories: {
        acceleration: { score: accelerationScore, events: accelerationEvents },
        braking: { score: brakingScore, events: brakingEvents },
        cornering: { score: corneringScore, events: corneringEvents },
        speeding: { score: speedingScore, events: speedingEvents },
        idling: { score: idlingScore, minutes: idleMinutes },
      },
      comparison: {
        fleetAverage: 75, // Would calculate from all vehicles
        percentile: this.calculatePercentile(overallScore),
        trend: 'STABLE',
      },
      recommendations,
    };
  }

  /**
   * Get behavior scores for all drivers
   */
  async getFleetBehaviorScores(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<DriverBehaviorScore[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
    });

    const scores: DriverBehaviorScore[] = [];
    for (const vehicle of vehicles) {
      try {
        const score = await this.calculateDriverBehaviorScore(vehicle.id, from, to);
        scores.push(score);
      } catch (error) {
        this.logger.warn(`Failed to calculate behavior score for ${vehicle.id}`);
      }
    }

    return scores.sort((a, b) => b.overallScore - a.overallScore);
  }

  // =================== FUEL EFFICIENCY ===================

  /**
   * Estimate fuel efficiency
   */
  async estimateFuelEfficiency(
    vehicleId: string,
    from: Date,
    to: Date,
  ): Promise<FuelEfficiencyData> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    // Get position data
    const positions = await this.prisma.vehiclePosition.findMany({
      where: {
        vehicleId,
        recordedAt: { gte: from, lte: to },
      },
      orderBy: { recordedAt: 'asc' },
    });

    // Calculate total distance
    let totalDistanceKm = 0;
    let idleTimeMinutes = 0;
    let efficientDrivingMinutes = 0;
    let totalDrivingMinutes = 0;

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      const distance = this.haversineDistance(
        Number(prev.latitude),
        Number(prev.longitude),
        Number(curr.latitude),
        Number(curr.longitude),
      );
      totalDistanceKm += distance;

      const timeDiffMinutes = (curr.recordedAt.getTime() - prev.recordedAt.getTime()) / 60000;
      const speed = curr.speed ? Number(curr.speed) : 0;

      if (speed < 5 && curr.engineRunning) {
        idleTimeMinutes += timeDiffMinutes;
      } else if (speed > 0) {
        totalDrivingMinutes += timeDiffMinutes;
        // Efficient driving: 30-60 km/h in urban areas
        if (speed >= 30 && speed <= 60) {
          efficientDrivingMinutes += timeDiffMinutes;
        }
      }
    }

    // Estimate fuel consumption based on vehicle type and driving behavior
    const baseConsumption = 8.5; // L/100km baseline for delivery van
    const idleFuelRate = 0.8; // L/hour at idle
    const idleFuelWaste = (idleTimeMinutes / 60) * idleFuelRate;

    const behaviorEvents = (this.behaviorEvents.get(vehicleId) || []).filter(
      e => e.occurredAt >= from && e.occurredAt <= to,
    );
    const harshEvents = behaviorEvents.filter(
      e => e.type === 'HARSH_ACCELERATION' || e.type === 'HARSH_BRAKING',
    ).length;

    // Adjust consumption based on driving behavior
    const behaviorMultiplier = 1 + (harshEvents * 0.02);
    const estimatedConsumption = baseConsumption * behaviorMultiplier;
    const estimatedFuelLiters = (totalDistanceKm / 100) * estimatedConsumption + idleFuelWaste;

    // Fuel cost (Germany average ~1.70 EUR/L diesel)
    const fuelPriceEur = 1.70;
    const estimatedCostEur = estimatedFuelLiters * fuelPriceEur;

    return {
      vehicleId,
      period: { from, to },
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      estimatedFuelLiters: Math.round(estimatedFuelLiters * 10) / 10,
      averageConsumption: Math.round(estimatedConsumption * 10) / 10,
      efficientDrivingPercent: totalDrivingMinutes > 0
        ? Math.round((efficientDrivingMinutes / totalDrivingMinutes) * 100)
        : 0,
      idleFuelWaste: Math.round(idleFuelWaste * 10) / 10,
      estimatedCostEur: Math.round(estimatedCostEur * 100) / 100,
      comparison: {
        vehicleBaseline: baseConsumption,
        fleetAverage: 9.0,
        percentSavings: Math.round((1 - estimatedConsumption / 9.0) * 100),
      },
    };
  }

  // =================== GPS DEVICE HEALTH ===================

  /**
   * Update device health status
   */
  async updateDeviceHealth(
    vehicleId: string,
    healthData: {
      batteryLevel?: number;
      signalStrength?: number;
      gpsAccuracy?: number;
    },
  ): Promise<void> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) return;

    const existing = this.deviceHealth.get(vehicleId) || {
      vehicleId,
      licensePlate: vehicle.licensePlate,
      status: 'UNKNOWN' as const,
      lastSignal: new Date(),
      signalAge: 0,
      issues: [],
    };

    const issues: string[] = [];
    let status: GpsDeviceHealth['status'] = 'ONLINE';

    if (healthData.batteryLevel !== undefined && healthData.batteryLevel < 20) {
      issues.push('Niedrige Batterie');
      status = 'DEGRADED';
    }
    if (healthData.signalStrength !== undefined && healthData.signalStrength < 30) {
      issues.push('Schwaches Signal');
      status = 'DEGRADED';
    }
    if (healthData.gpsAccuracy !== undefined && healthData.gpsAccuracy > 50) {
      issues.push('Geringe GPS-Genauigkeit');
      status = 'DEGRADED';
    }

    this.deviceHealth.set(vehicleId, {
      ...existing,
      status,
      lastSignal: new Date(),
      signalAge: 0,
      batteryLevel: healthData.batteryLevel,
      signalStrength: healthData.signalStrength,
      gpsAccuracy: healthData.gpsAccuracy,
      issues,
    });
  }

  /**
   * Get fleet device health status
   */
  async getFleetDeviceHealth(userId: string): Promise<GpsDeviceHealth[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
    });

    const now = Date.now();
    const healthStatuses: GpsDeviceHealth[] = [];

    for (const vehicle of vehicles) {
      const existing = this.deviceHealth.get(vehicle.id);
      const lastSignal = existing?.lastSignal || vehicle.lastLocationAt || new Date(0);
      const signalAge = Math.floor((now - lastSignal.getTime()) / 1000);

      let status: GpsDeviceHealth['status'] = 'ONLINE';
      const issues: string[] = [...(existing?.issues || [])];

      if (signalAge > 3600) {
        status = 'OFFLINE';
        issues.push('Keine Signale seit über 1 Stunde');
      } else if (signalAge > 600) {
        status = 'DEGRADED';
        issues.push('Signal älter als 10 Minuten');
      }

      healthStatuses.push({
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        deviceId: existing?.deviceId,
        status,
        lastSignal,
        signalAge,
        batteryLevel: existing?.batteryLevel,
        signalStrength: existing?.signalStrength,
        gpsAccuracy: existing?.gpsAccuracy,
        firmwareVersion: existing?.firmwareVersion,
        issues,
      });
    }

    return healthStatuses.sort((a, b) => {
      const statusOrder = { OFFLINE: 0, DEGRADED: 1, UNKNOWN: 2, ONLINE: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }

  // =================== HISTORICAL PLAYBACK ===================

  /**
   * Get playback data with interpolation
   */
  async getPlaybackData(
    vehicleId: string,
    from: Date,
    to: Date,
    intervalSeconds: number = 5,
  ): Promise<PlaybackFrame[]> {
    const positions = await this.prisma.vehiclePosition.findMany({
      where: {
        vehicleId,
        recordedAt: { gte: from, lte: to },
      },
      orderBy: { recordedAt: 'asc' },
    });

    if (positions.length === 0) return [];

    const frames: PlaybackFrame[] = [];
    const intervalMs = intervalSeconds * 1000;

    let currentTime = from.getTime();
    const endTime = to.getTime();
    let posIndex = 0;

    while (currentTime <= endTime && posIndex < positions.length - 1) {
      const currentPos = positions[posIndex];
      const nextPos = positions[posIndex + 1];

      const currentPosTime = currentPos.recordedAt.getTime();
      const nextPosTime = nextPos.recordedAt.getTime();

      // Move to next position if we've passed it
      if (currentTime >= nextPosTime) {
        posIndex++;
        continue;
      }

      // Interpolate between positions
      const progress = (currentTime - currentPosTime) / (nextPosTime - currentPosTime);
      const isInterpolated = progress > 0 && progress < 1;

      const lat = Number(currentPos.latitude) +
        (Number(nextPos.latitude) - Number(currentPos.latitude)) * progress;
      const lng = Number(currentPos.longitude) +
        (Number(nextPos.longitude) - Number(currentPos.longitude)) * progress;
      const speed = (Number(currentPos.speed) || 0) +
        ((Number(nextPos.speed) || 0) - (Number(currentPos.speed) || 0)) * progress;
      const heading = this.interpolateHeading(
        currentPos.heading || 0,
        nextPos.heading || 0,
        progress,
      );

      frames.push({
        timestamp: new Date(currentTime),
        position: { lat, lng },
        speed: Math.round(speed),
        heading: Math.round(heading),
        isInterpolated,
      });

      currentTime += intervalMs;
    }

    return frames;
  }

  // =================== PROXIMITY ALERTS ===================

  /**
   * Check proximity to targets
   */
  async checkProximity(
    vehicleId: string,
    position: { lat: number; lng: number },
    alertDistanceMeters: number = 500,
  ): Promise<ProximityAlert[]> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        deliveryRoutes: {
          where: { status: 'IN_PROGRESS' },
          include: { stops: true },
          take: 1,
        },
      },
    });

    if (!vehicle) return [];

    const alerts: ProximityAlert[] = [];
    const activeRoute = vehicle.deliveryRoutes[0];

    // Check proximity to upcoming stops
    if (activeRoute) {
      const upcomingStops = activeRoute.stops.filter(
        s => s.status !== 'DELIVERED' && s.status !== 'RETURNED' && s.latitude && s.longitude,
      );

      for (const stop of upcomingStops) {
        const distance = this.haversineDistance(
          position.lat,
          position.lng,
          Number(stop.latitude),
          Number(stop.longitude),
        ) * 1000; // Convert to meters

        if (distance <= alertDistanceMeters) {
          const etaMinutes = Math.ceil(distance / 400); // ~400m/min walking pace

          alerts.push({
            id: `prox-${++this.alertCounter}`,
            vehicleId,
            targetType: 'STOP',
            targetId: stop.id,
            targetName: stop.recipientName || `Stop ${stop.stopOrder}`,
            distanceMeters: Math.round(distance),
            etaMinutes,
            position,
            alertedAt: new Date(),
          });
        }
      }
    }

    // Store alerts
    const existing = this.proximityAlerts.get(vehicle.userId) || [];
    existing.push(...alerts);
    this.proximityAlerts.set(vehicle.userId, existing.slice(-100)); // Keep last 100

    return alerts;
  }

  /**
   * Get recent proximity alerts
   */
  async getProximityAlerts(userId: string, limit: number = 50): Promise<ProximityAlert[]> {
    return (this.proximityAlerts.get(userId) || [])
      .sort((a, b) => b.alertedAt.getTime() - a.alertedAt.getTime())
      .slice(0, limit);
  }

  // =================== DASHBOARD ===================

  /**
   * Get real-time tracking dashboard
   */
  async getTrackingDashboard(userId: string): Promise<{
    activeVehicles: number;
    totalVehicles: number;
    onlineDevices: number;
    offlineDevices: number;
    activeRoutes: number;
    delayedRoutes: number;
    speedViolationsToday: number;
    activeDeviations: number;
    averageBehaviorScore: number;
    recentAlerts: any[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
    });

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: { gte: today },
      },
    });

    // Get ETAs
    const etas = await this.getFleetLiveETAs(userId);
    const delayedRoutes = etas.filter(e => e.status !== 'ON_TIME').length;

    // Get device health
    const deviceHealth = await this.getFleetDeviceHealth(userId);
    const onlineDevices = deviceHealth.filter(d => d.status === 'ONLINE').length;
    const offlineDevices = deviceHealth.filter(d => d.status === 'OFFLINE').length;

    // Get violations
    const violations = await this.getSpeedViolations(userId, { from: today });

    // Get deviations
    const deviations = await this.getRouteDeviations(userId, { onlyActive: true });

    // Get behavior scores
    const behaviors = await this.getFleetBehaviorScores(userId, today, new Date());
    const averageBehaviorScore = behaviors.length > 0
      ? Math.round(behaviors.reduce((sum, b) => sum + b.overallScore, 0) / behaviors.length)
      : 0;

    // Get recent alerts
    const recentAlerts = await this.getProximityAlerts(userId, 10);

    return {
      activeVehicles: vehicles.filter(v => v.status === 'AVAILABLE' || v.status === 'IN_USE').length,
      totalVehicles: vehicles.length,
      onlineDevices,
      offlineDevices,
      activeRoutes: routes.filter(r => r.status === 'IN_PROGRESS').length,
      delayedRoutes,
      speedViolationsToday: violations.length,
      activeDeviations: deviations.length,
      averageBehaviorScore,
      recentAlerts,
    };
  }

  // =================== PRIVATE HELPERS ===================

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

  private getSpeedLimit(roadType: string, position: { lat: number; lng: number }): number {
    // In real implementation, would use HERE Maps or similar API
    return SPEED_LIMITS[roadType as keyof typeof SPEED_LIMITS] || SPEED_LIMITS.DEFAULT;
  }

  private estimateAverageSpeed(): number {
    // Munich urban average with traffic: 22-28 km/h
    const hour = new Date().getHours();
    // Rush hours: 7-9 and 16-19
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      return 18; // Heavy traffic
    }
    return 25; // Normal traffic
  }

  private distanceToSegment(
    point: { lat: number; lng: number },
    segmentStart: { lat: number; lng: number },
    segmentEnd: { lat: number; lng: number },
  ): { distance: number; nearestPoint: { lat: number; lng: number } } {
    const dx = segmentEnd.lat - segmentStart.lat;
    const dy = segmentEnd.lng - segmentStart.lng;
    const l2 = dx * dx + dy * dy;

    if (l2 === 0) {
      const distance = this.haversineDistance(
        point.lat, point.lng,
        segmentStart.lat, segmentStart.lng,
      ) * 1000; // Convert to meters
      return { distance, nearestPoint: segmentStart };
    }

    let t = ((point.lat - segmentStart.lat) * dx + (point.lng - segmentStart.lng) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const nearestPoint = {
      lat: segmentStart.lat + t * dx,
      lng: segmentStart.lng + t * dy,
    };

    const distance = this.haversineDistance(
      point.lat, point.lng,
      nearestPoint.lat, nearestPoint.lng,
    ) * 1000; // Convert to meters

    return { distance, nearestPoint };
  }

  private calculatePercentile(score: number): number {
    // Simplified percentile calculation
    if (score >= 90) return 95;
    if (score >= 80) return 80;
    if (score >= 70) return 60;
    if (score >= 60) return 40;
    return 20;
  }

  private interpolateHeading(from: number, to: number, progress: number): number {
    // Handle wrap-around at 360 degrees
    let diff = to - from;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    let result = from + diff * progress;
    if (result < 0) result += 360;
    if (result >= 360) result -= 360;

    return result;
  }
}
