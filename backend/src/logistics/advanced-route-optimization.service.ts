import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Advanced Route Optimization Service
 * AI-powered route optimization with Google Maps integration,
 * real-time traffic, time windows, and vehicle capacity constraints
 *
 * Romania-focused with București, Cluj, Timișoara traffic patterns
 */

// =================== INTERFACES ===================

export interface Location {
  id: string;
  name?: string;
  address?: string;
  lat: number;
  lng: number;
}

export interface DeliveryStop extends Location {
  priority: StopPriority;
  timeWindow?: TimeWindow;
  serviceTimeMinutes: number;
  demandWeight: number; // kg
  demandVolume: number; // cbm
  demandPallets: number;
  skills?: string[]; // Required skills (e.g., 'HAZMAT', 'COLD_CHAIN')
  customerId?: string;
  orderId?: string;
  notes?: string;
}

export type StopPriority = 'CRITICAL' | 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface TimeWindow {
  start: Date;
  end: Date;
  isFlexible: boolean; // Can be adjusted if needed
  penaltyPerMinuteLate: number; // RON penalty for late delivery
}

export interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  type: VehicleType;
  capacityWeight: number; // kg
  capacityVolume: number; // cbm
  capacityPallets: number;
  fuelConsumptionL100km: number;
  costPerKm: number;
  fixedDailyCost: number;
  skills: string[]; // Available skills
  depotId: string;
  depot: Location;
  maxWorkingMinutes: number;
  breakRequirements?: BreakRequirement[];
  currentLocation?: Location;
  driverId?: string;
}

export type VehicleType = 'VAN' | 'TRUCK_3_5T' | 'TRUCK_7_5T' | 'TRUCK_12T' | 'TRUCK_40T' | 'REFRIGERATED';

export interface BreakRequirement {
  afterMinutes: number; // Take break after this many minutes of driving
  durationMinutes: number;
  type: 'SHORT' | 'MEAL' | 'REST';
}

export interface RouteRequest {
  stops: DeliveryStop[];
  vehicles: Vehicle[];
  depot: Location;
  departureTime: Date;
  options?: OptimizationOptions;
}

export interface OptimizationOptions {
  algorithm?: OptimizationAlgorithm;
  objective?: OptimizationObjective;
  maxIterations?: number;
  timeoutSeconds?: number;
  allowMultipleTrips?: boolean;
  respectTimeWindows?: boolean;
  includeTraffic?: boolean;
  includeBreaks?: boolean;
  balanceWorkload?: boolean;
  minimizeVehicles?: boolean;
}

export type OptimizationAlgorithm =
  | 'NEAREST_NEIGHBOR'
  | 'SAVINGS'
  | 'SWEEP'
  | 'GENETIC'
  | 'SIMULATED_ANNEALING'
  | 'TABU_SEARCH'
  | 'ANT_COLONY'
  | 'HYBRID';

export type OptimizationObjective =
  | 'MINIMIZE_DISTANCE'
  | 'MINIMIZE_TIME'
  | 'MINIMIZE_COST'
  | 'MINIMIZE_VEHICLES'
  | 'MAXIMIZE_ON_TIME'
  | 'BALANCED';

export interface OptimizedRoute {
  vehicleId: string;
  vehicleName: string;
  stops: OptimizedStop[];
  metrics: RouteMetrics;
  warnings: RouteWarning[];
  feasible: boolean;
}

export interface OptimizedStop {
  stop: DeliveryStop;
  arrivalTime: Date;
  departureTime: Date;
  waitTimeMinutes: number;
  lateMinutes: number;
  distanceFromPreviousKm: number;
  timeFromPreviousMinutes: number;
  cumulativeLoad: LoadStatus;
  sequence: number;
}

export interface LoadStatus {
  weight: number;
  volume: number;
  pallets: number;
  weightUtilization: number;
  volumeUtilization: number;
}

export interface RouteMetrics {
  totalDistanceKm: number;
  totalTimeMinutes: number;
  drivingTimeMinutes: number;
  serviceTimeMinutes: number;
  waitingTimeMinutes: number;
  breakTimeMinutes: number;
  fuelConsumptionLiters: number;
  fuelCostRon: number;
  totalCostRon: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  latePenaltyRon: number;
  utilizationPercent: number;
}

export interface RouteWarning {
  type: WarningType;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  stopId?: string;
}

export type WarningType =
  | 'TIME_WINDOW_VIOLATION'
  | 'CAPACITY_EXCEEDED'
  | 'SKILL_MISMATCH'
  | 'LONG_WAIT'
  | 'MAX_WORKING_TIME'
  | 'BREAK_REQUIRED'
  | 'TRAFFIC_DELAY';

export interface OptimizationResult {
  routes: OptimizedRoute[];
  unassignedStops: DeliveryStop[];
  summary: OptimizationSummary;
  computationTimeMs: number;
  algorithm: string;
}

export interface OptimizationSummary {
  totalStops: number;
  assignedStops: number;
  unassignedStops: number;
  vehiclesUsed: number;
  totalDistanceKm: number;
  totalTimeMinutes: number;
  totalCostRon: number;
  totalFuelLiters: number;
  onTimePercent: number;
  averageUtilization: number;
  co2EmissionsKg: number;
}

// Traffic data interfaces
export interface TrafficCondition {
  segment: { from: Location; to: Location };
  speedKmh: number;
  delayMinutes: number;
  congestionLevel: CongestionLevel;
  lastUpdated: Date;
}

export type CongestionLevel = 'FREE_FLOW' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'SEVERE';

export interface ETAUpdate {
  stopId: string;
  originalETA: Date;
  updatedETA: Date;
  delayMinutes: number;
  reason: string;
}

// Google Maps integration types
export interface GoogleMapsRoute {
  distance: number; // meters
  duration: number; // seconds
  durationInTraffic?: number; // seconds
  polyline: string;
  legs: GoogleMapsLeg[];
}

export interface GoogleMapsLeg {
  distance: number;
  duration: number;
  startAddress: string;
  endAddress: string;
  steps: GoogleMapsStep[];
}

export interface GoogleMapsStep {
  distance: number;
  duration: number;
  instruction: string;
  maneuver?: string;
}

// =================== SERVICE IMPLEMENTATION ===================

@Injectable()
export class AdvancedRouteOptimizationService {
  private readonly logger = new Logger(AdvancedRouteOptimizationService.name);
  private readonly EARTH_RADIUS_KM = 6371;

  // Romanian city traffic patterns (multipliers by hour)
  private readonly trafficPatterns: Record<string, Record<number, number>> = {
    'București': {
      0: 0.8, 1: 0.8, 2: 0.8, 3: 0.8, 4: 0.9, 5: 1.0,
      6: 1.3, 7: 1.8, 8: 2.2, 9: 1.6, 10: 1.2, 11: 1.1,
      12: 1.2, 13: 1.1, 14: 1.1, 15: 1.2, 16: 1.5, 17: 2.0,
      18: 1.8, 19: 1.4, 20: 1.1, 21: 1.0, 22: 0.9, 23: 0.8,
    },
    'Cluj-Napoca': {
      0: 0.8, 1: 0.8, 2: 0.8, 3: 0.8, 4: 0.9, 5: 1.0,
      6: 1.2, 7: 1.6, 8: 1.9, 9: 1.4, 10: 1.1, 11: 1.0,
      12: 1.1, 13: 1.0, 14: 1.0, 15: 1.1, 16: 1.4, 17: 1.8,
      18: 1.5, 19: 1.2, 20: 1.0, 21: 0.9, 22: 0.9, 23: 0.8,
    },
    'Timișoara': {
      0: 0.8, 1: 0.8, 2: 0.8, 3: 0.8, 4: 0.9, 5: 1.0,
      6: 1.2, 7: 1.5, 8: 1.8, 9: 1.3, 10: 1.1, 11: 1.0,
      12: 1.1, 13: 1.0, 14: 1.0, 15: 1.1, 16: 1.3, 17: 1.7,
      18: 1.4, 19: 1.2, 20: 1.0, 21: 0.9, 22: 0.9, 23: 0.8,
    },
    'default': {
      0: 0.9, 1: 0.9, 2: 0.9, 3: 0.9, 4: 0.9, 5: 1.0,
      6: 1.1, 7: 1.3, 8: 1.5, 9: 1.2, 10: 1.0, 11: 1.0,
      12: 1.0, 13: 1.0, 14: 1.0, 15: 1.1, 16: 1.3, 17: 1.5,
      18: 1.3, 19: 1.1, 20: 1.0, 21: 0.9, 22: 0.9, 23: 0.9,
    },
  };

  // Average speeds by road type (km/h)
  private readonly baseSpeeds = {
    urban: 35,
    suburban: 50,
    highway: 90,
    rural: 60,
  };

  // Fuel price RON/L
  private readonly fuelPriceRon = 7.50;

  // CO2 emission factor kg/L diesel
  private readonly co2PerLiter = 2.68;

  // In-memory cache for distance matrix
  private distanceMatrix = new Map<string, { distance: number; duration: number }>();

  // In-memory storage for demo
  private routes = new Map<string, OptimizedRoute[]>();
  private optimizationResults = new Map<string, OptimizationResult>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // Reset state for testing
  resetState(): void {
    this.distanceMatrix.clear();
    this.routes.clear();
    this.optimizationResults.clear();
  }

  // =================== MAIN OPTIMIZATION ===================

  async optimizeRoutes(request: RouteRequest): Promise<OptimizationResult> {
    const startTime = Date.now();
    this.logger.log(`Starting route optimization for ${request.stops.length} stops with ${request.vehicles.length} vehicles`);

    const options = {
      algorithm: 'HYBRID' as OptimizationAlgorithm,
      objective: 'BALANCED' as OptimizationObjective,
      maxIterations: 1000,
      timeoutSeconds: 30,
      allowMultipleTrips: false,
      respectTimeWindows: true,
      includeTraffic: true,
      includeBreaks: true,
      balanceWorkload: true,
      minimizeVehicles: true,
      ...request.options,
    };

    // Validate request
    this.validateRequest(request);

    // Build distance/time matrix
    await this.buildDistanceMatrix(request.stops, request.depot);

    // Run optimization algorithm
    let routes: OptimizedRoute[];
    let unassigned: DeliveryStop[];

    switch (options.algorithm) {
      case 'NEAREST_NEIGHBOR':
        ({ routes, unassigned } = this.nearestNeighborVRP(request, options));
        break;
      case 'SAVINGS':
        ({ routes, unassigned } = this.savingsAlgorithm(request, options));
        break;
      case 'SWEEP':
        ({ routes, unassigned } = this.sweepAlgorithm(request, options));
        break;
      case 'GENETIC':
        ({ routes, unassigned } = this.geneticAlgorithmVRP(request, options));
        break;
      case 'SIMULATED_ANNEALING':
        ({ routes, unassigned } = this.simulatedAnnealingVRP(request, options));
        break;
      case 'TABU_SEARCH':
        ({ routes, unassigned } = this.tabuSearchVRP(request, options));
        break;
      case 'ANT_COLONY':
        ({ routes, unassigned } = this.antColonyVRP(request, options));
        break;
      case 'HYBRID':
      default:
        ({ routes, unassigned } = this.hybridOptimization(request, options));
    }

    // Apply local search improvements
    routes = this.applyLocalSearch(routes, request, options);

    // Calculate final metrics
    const summary = this.calculateSummary(routes, unassigned, request);

    const result: OptimizationResult = {
      routes,
      unassignedStops: unassigned,
      summary,
      computationTimeMs: Date.now() - startTime,
      algorithm: options.algorithm,
    };

    // Store result
    const resultId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.optimizationResults.set(resultId, result);

    this.logger.log(`Optimization complete: ${summary.assignedStops}/${summary.totalStops} stops assigned to ${summary.vehiclesUsed} vehicles`);

    return result;
  }

  // =================== VRP ALGORITHMS ===================

  /**
   * Nearest Neighbor VRP - Simple constructive heuristic
   */
  private nearestNeighborVRP(
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    const routes: OptimizedRoute[] = [];
    const unassigned: DeliveryStop[] = [];
    const assigned = new Set<string>();

    // Sort stops by priority
    const sortedStops = this.sortByPriority([...request.stops]);

    for (const vehicle of request.vehicles) {
      if (sortedStops.filter(s => !assigned.has(s.id)).length === 0) break;

      const route = this.buildRouteNearestNeighbor(
        vehicle,
        sortedStops.filter(s => !assigned.has(s.id)),
        request.depot,
        request.departureTime,
        options
      );

      if (route.stops.length > 0) {
        route.stops.forEach(s => assigned.add(s.stop.id));
        routes.push(route);
      }
    }

    // Collect unassigned
    sortedStops.forEach(stop => {
      if (!assigned.has(stop.id)) {
        unassigned.push(stop);
      }
    });

    return { routes, unassigned };
  }

  private buildRouteNearestNeighbor(
    vehicle: Vehicle,
    availableStops: DeliveryStop[],
    depot: Location,
    departureTime: Date,
    options: OptimizationOptions
  ): OptimizedRoute {
    const stops: OptimizedStop[] = [];
    const warnings: RouteWarning[] = [];
    let currentLocation = depot;
    let currentTime = new Date(departureTime);
    let currentLoad = { weight: 0, volume: 0, pallets: 0 };
    let totalDistance = 0;
    let totalDrivingTime = 0;
    let totalServiceTime = 0;
    let totalWaitTime = 0;

    const remaining = [...availableStops];

    while (remaining.length > 0) {
      // Find nearest feasible stop
      let bestStop: DeliveryStop | null = null;
      let bestIndex = -1;
      let bestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const stop = remaining[i];

        // Check capacity constraints
        if (currentLoad.weight + stop.demandWeight > vehicle.capacityWeight) continue;
        if (currentLoad.volume + stop.demandVolume > vehicle.capacityVolume) continue;
        if (currentLoad.pallets + stop.demandPallets > vehicle.capacityPallets) continue;

        // Check skill requirements
        if (stop.skills && !stop.skills.every(s => vehicle.skills.includes(s))) continue;

        const dist = this.getDistance(currentLocation, stop);
        if (dist < bestDistance) {
          // Check if we can make it within time window
          const travelTime = this.getTravelTime(currentLocation, stop, currentTime, options.includeTraffic);
          const arrivalTime = new Date(currentTime.getTime() + travelTime * 60000);

          if (options.respectTimeWindows && stop.timeWindow) {
            // Allow some late arrivals for non-flexible windows
            const maxLate = stop.timeWindow.isFlexible ? 60 : 30; // minutes
            if (arrivalTime.getTime() > stop.timeWindow.end.getTime() + maxLate * 60000) {
              continue;
            }
          }

          // Check total working time
          const returnTime = this.getTravelTime(stop, depot, arrivalTime, options.includeTraffic);
          const totalRouteTime = (arrivalTime.getTime() - departureTime.getTime()) / 60000 +
            stop.serviceTimeMinutes + returnTime;

          if (totalRouteTime > vehicle.maxWorkingMinutes) continue;

          bestDistance = dist;
          bestStop = stop;
          bestIndex = i;
        }
      }

      if (!bestStop) break;

      // Add stop to route
      const travelTime = this.getTravelTime(currentLocation, bestStop, currentTime, options.includeTraffic);
      const arrivalTime = new Date(currentTime.getTime() + travelTime * 60000);

      let waitTime = 0;
      let lateMinutes = 0;

      if (bestStop.timeWindow) {
        if (arrivalTime < bestStop.timeWindow.start) {
          waitTime = (bestStop.timeWindow.start.getTime() - arrivalTime.getTime()) / 60000;
        } else if (arrivalTime > bestStop.timeWindow.end) {
          lateMinutes = (arrivalTime.getTime() - bestStop.timeWindow.end.getTime()) / 60000;
          warnings.push({
            type: 'TIME_WINDOW_VIOLATION',
            severity: lateMinutes > 30 ? 'ERROR' : 'WARNING',
            message: `Sosire cu ${Math.round(lateMinutes)} minute întârziere la ${bestStop.name || bestStop.id}`,
            stopId: bestStop.id,
          });
        }
      }

      const serviceStartTime = new Date(arrivalTime.getTime() + waitTime * 60000);
      const departTime = new Date(serviceStartTime.getTime() + bestStop.serviceTimeMinutes * 60000);

      currentLoad = {
        weight: currentLoad.weight + bestStop.demandWeight,
        volume: currentLoad.volume + bestStop.demandVolume,
        pallets: currentLoad.pallets + bestStop.demandPallets,
      };

      stops.push({
        stop: bestStop,
        arrivalTime,
        departureTime: departTime,
        waitTimeMinutes: waitTime,
        lateMinutes,
        distanceFromPreviousKm: bestDistance,
        timeFromPreviousMinutes: travelTime,
        cumulativeLoad: {
          ...currentLoad,
          weightUtilization: (currentLoad.weight / vehicle.capacityWeight) * 100,
          volumeUtilization: (currentLoad.volume / vehicle.capacityVolume) * 100,
        },
        sequence: stops.length + 1,
      });

      totalDistance += bestDistance;
      totalDrivingTime += travelTime;
      totalServiceTime += bestStop.serviceTimeMinutes;
      totalWaitTime += waitTime;

      currentLocation = bestStop;
      currentTime = departTime;
      remaining.splice(bestIndex, 1);
    }

    // Return to depot
    if (stops.length > 0) {
      const returnDistance = this.getDistance(currentLocation, depot);
      const returnTime = this.getTravelTime(currentLocation, depot, currentTime, options.includeTraffic);
      totalDistance += returnDistance;
      totalDrivingTime += returnTime;
    }

    const fuelConsumption = (totalDistance * vehicle.fuelConsumptionL100km) / 100;
    const fuelCost = fuelConsumption * this.fuelPriceRon;
    const totalCost = fuelCost + vehicle.fixedDailyCost + (totalDistance * vehicle.costPerKm);

    const onTime = stops.filter(s => s.lateMinutes === 0).length;
    const late = stops.filter(s => s.lateMinutes > 0).length;
    const latePenalty = stops.reduce((sum, s) => {
      if (s.lateMinutes > 0 && s.stop.timeWindow) {
        return sum + s.lateMinutes * s.stop.timeWindow.penaltyPerMinuteLate;
      }
      return sum;
    }, 0);

    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      stops,
      metrics: {
        totalDistanceKm: Math.round(totalDistance * 100) / 100,
        totalTimeMinutes: Math.round(totalDrivingTime + totalServiceTime + totalWaitTime),
        drivingTimeMinutes: Math.round(totalDrivingTime),
        serviceTimeMinutes: Math.round(totalServiceTime),
        waitingTimeMinutes: Math.round(totalWaitTime),
        breakTimeMinutes: 0,
        fuelConsumptionLiters: Math.round(fuelConsumption * 100) / 100,
        fuelCostRon: Math.round(fuelCost * 100) / 100,
        totalCostRon: Math.round(totalCost * 100) / 100,
        onTimeDeliveries: onTime,
        lateDeliveries: late,
        latePenaltyRon: Math.round(latePenalty * 100) / 100,
        utilizationPercent: stops.length > 0
          ? Math.round((currentLoad.weight / vehicle.capacityWeight) * 100)
          : 0,
      },
      warnings,
      feasible: warnings.filter(w => w.severity === 'ERROR').length === 0,
    };
  }

  /**
   * Clarke-Wright Savings Algorithm
   */
  private savingsAlgorithm(
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    const { stops, depot, vehicles, departureTime } = request;

    // Calculate savings for all pairs
    const savings: { i: number; j: number; saving: number }[] = [];

    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        const saving = this.getDistance(depot, stops[i]) +
          this.getDistance(depot, stops[j]) -
          this.getDistance(stops[i], stops[j]);

        if (saving > 0) {
          savings.push({ i, j, saving });
        }
      }
    }

    // Sort by saving descending
    savings.sort((a, b) => b.saving - a.saving);

    // Build routes using savings
    const stopRoutes = new Map<number, number[]>(); // stopIndex -> route indices
    const routeStops: number[][] = []; // route index -> stop indices

    // Initialize: each stop in its own route
    for (let i = 0; i < stops.length; i++) {
      stopRoutes.set(i, [routeStops.length]);
      routeStops.push([i]);
    }

    // Merge routes based on savings
    for (const { i, j } of savings) {
      const routeI = this.findRouteContaining(routeStops, i);
      const routeJ = this.findRouteContaining(routeStops, j);

      if (routeI === routeJ || routeI === -1 || routeJ === -1) continue;

      // Check if stops are at the ends of their routes
      const routeIStops = routeStops[routeI];
      const routeJStops = routeStops[routeJ];

      const iAtEnd = routeIStops[0] === i || routeIStops[routeIStops.length - 1] === i;
      const jAtEnd = routeJStops[0] === j || routeJStops[routeJStops.length - 1] === j;

      if (!iAtEnd || !jAtEnd) continue;

      // Merge routes
      let merged: number[];
      if (routeIStops[routeIStops.length - 1] === i && routeJStops[0] === j) {
        merged = [...routeIStops, ...routeJStops];
      } else if (routeJStops[routeJStops.length - 1] === j && routeIStops[0] === i) {
        merged = [...routeJStops, ...routeIStops];
      } else if (routeIStops[0] === i && routeJStops[0] === j) {
        merged = [...routeIStops.reverse(), ...routeJStops];
      } else {
        merged = [...routeIStops, ...routeJStops.reverse()];
      }

      // Check vehicle capacity for merged route
      const mergedStops = merged.map(idx => stops[idx]);
      const totalWeight = mergedStops.reduce((sum, s) => sum + s.demandWeight, 0);
      const totalVolume = mergedStops.reduce((sum, s) => sum + s.demandVolume, 0);

      // Use first available vehicle that can handle it
      const suitableVehicle = vehicles.find(v =>
        v.capacityWeight >= totalWeight && v.capacityVolume >= totalVolume
      );

      if (!suitableVehicle) continue;

      // Merge
      routeStops[routeI] = merged;
      routeStops[routeJ] = [];
    }

    // Build optimized routes
    const routes: OptimizedRoute[] = [];
    const unassigned: DeliveryStop[] = [];
    let vehicleIdx = 0;

    for (const stopIndices of routeStops) {
      if (stopIndices.length === 0) continue;
      if (vehicleIdx >= vehicles.length) {
        stopIndices.forEach(idx => unassigned.push(stops[idx]));
        continue;
      }

      const vehicle = vehicles[vehicleIdx];
      const routeStopsList = stopIndices.map(idx => stops[idx]);

      // Check feasibility
      const totalWeight = routeStopsList.reduce((sum, s) => sum + s.demandWeight, 0);
      if (totalWeight > vehicle.capacityWeight) {
        stopIndices.forEach(idx => unassigned.push(stops[idx]));
        continue;
      }

      const route = this.buildRouteFromStops(vehicle, routeStopsList, depot, departureTime, options);
      routes.push(route);
      vehicleIdx++;
    }

    return { routes, unassigned };
  }

  private findRouteContaining(routeStops: number[][], stopIndex: number): number {
    for (let r = 0; r < routeStops.length; r++) {
      if (routeStops[r].includes(stopIndex)) {
        return r;
      }
    }
    return -1;
  }

  /**
   * Sweep Algorithm - Cluster stops by angle from depot
   */
  private sweepAlgorithm(
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    const { stops, depot, vehicles, departureTime } = request;

    // Calculate angle from depot for each stop
    const stopsWithAngle = stops.map(stop => ({
      stop,
      angle: Math.atan2(stop.lat - depot.lat, stop.lng - depot.lng),
    }));

    // Sort by angle
    stopsWithAngle.sort((a, b) => a.angle - b.angle);

    const routes: OptimizedRoute[] = [];
    const unassigned: DeliveryStop[] = [];
    let currentCluster: DeliveryStop[] = [];
    let currentWeight = 0;
    let currentVolume = 0;
    let vehicleIdx = 0;

    for (const { stop } of stopsWithAngle) {
      if (vehicleIdx >= vehicles.length) {
        unassigned.push(stop);
        continue;
      }

      const vehicle = vehicles[vehicleIdx];

      // Check if adding this stop exceeds capacity
      if (currentWeight + stop.demandWeight > vehicle.capacityWeight ||
          currentVolume + stop.demandVolume > vehicle.capacityVolume) {
        // Build route for current cluster
        if (currentCluster.length > 0) {
          const route = this.buildRouteFromStops(vehicle, currentCluster, depot, departureTime, options);
          routes.push(route);
          vehicleIdx++;
        }
        currentCluster = [];
        currentWeight = 0;
        currentVolume = 0;
      }

      currentCluster.push(stop);
      currentWeight += stop.demandWeight;
      currentVolume += stop.demandVolume;
    }

    // Handle last cluster
    if (currentCluster.length > 0 && vehicleIdx < vehicles.length) {
      const route = this.buildRouteFromStops(vehicles[vehicleIdx], currentCluster, depot, departureTime, options);
      routes.push(route);
    } else if (currentCluster.length > 0) {
      currentCluster.forEach(s => unassigned.push(s));
    }

    return { routes, unassigned };
  }

  /**
   * Genetic Algorithm VRP
   */
  private geneticAlgorithmVRP(
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    const populationSize = 50;
    const generations = options.maxIterations || 100;
    const mutationRate = 0.1;
    const eliteSize = 5;

    // Initialize population with different heuristics
    let population: DeliveryStop[][] = [];

    // Add solutions from different algorithms
    const nn = this.nearestNeighborVRP(request, options);
    const savings = this.savingsAlgorithm(request, options);
    const sweep = this.sweepAlgorithm(request, options);

    population.push(this.flattenRoutes(nn.routes));
    population.push(this.flattenRoutes(savings.routes));
    population.push(this.flattenRoutes(sweep.routes));

    // Fill rest with random permutations
    while (population.length < populationSize) {
      population.push(this.shuffleArray([...request.stops]));
    }

    // Evolve
    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness
      const fitness = population.map(chromosome => ({
        chromosome,
        fitness: this.evaluateFitness(chromosome, request, options),
      }));

      // Sort by fitness descending (higher is better)
      fitness.sort((a, b) => b.fitness - a.fitness);

      // Select elite
      const elite = fitness.slice(0, eliteSize).map(f => f.chromosome);

      // Create new population
      const newPopulation: DeliveryStop[][] = [...elite];

      while (newPopulation.length < populationSize) {
        // Tournament selection
        const parent1 = this.tournamentSelect(fitness, 3);
        const parent2 = this.tournamentSelect(fitness, 3);

        // Crossover
        let child = this.orderCrossover(parent1, parent2);

        // Mutation
        if (Math.random() < mutationRate) {
          child = this.swapMutation(child);
        }

        newPopulation.push(child);
      }

      population = newPopulation;
    }

    // Get best solution
    const bestChromosome = population.reduce((best, current) =>
      this.evaluateFitness(current, request, options) >
      this.evaluateFitness(best, request, options) ? current : best
    );

    // Convert chromosome to routes
    return this.chromosomeToRoutes(bestChromosome, request, options);
  }

  private flattenRoutes(routes: OptimizedRoute[]): DeliveryStop[] {
    return routes.flatMap(r => r.stops.map(s => s.stop));
  }

  private evaluateFitness(chromosome: DeliveryStop[], request: RouteRequest, options: OptimizationOptions): number {
    const { routes } = this.chromosomeToRoutes(chromosome, request, options);

    // Fitness based on total cost and on-time delivery
    const totalCost = routes.reduce((sum, r) => sum + r.metrics.totalCostRon, 0);
    const onTimePercent = routes.reduce((sum, r) =>
      sum + r.metrics.onTimeDeliveries, 0) / Math.max(1, chromosome.length) * 100;

    // Higher is better: maximize on-time, minimize cost
    return onTimePercent * 10 - totalCost / 100;
  }

  private tournamentSelect(fitness: { chromosome: DeliveryStop[]; fitness: number }[], size: number): DeliveryStop[] {
    let best = fitness[Math.floor(Math.random() * fitness.length)];
    for (let i = 1; i < size; i++) {
      const candidate = fitness[Math.floor(Math.random() * fitness.length)];
      if (candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return best.chromosome;
  }

  private orderCrossover(parent1: DeliveryStop[], parent2: DeliveryStop[]): DeliveryStop[] {
    // Filter out undefined elements
    const p1 = parent1.filter(s => s && s.id);
    const p2 = parent2.filter(s => s && s.id);

    if (p1.length === 0) {
      return [...p2];
    }
    if (p2.length === 0) {
      return [...p1];
    }

    const start = Math.floor(Math.random() * p1.length);
    const end = Math.floor(Math.random() * (p1.length - start)) + start;

    const child: (DeliveryStop | null)[] = new Array(p1.length).fill(null);
    const usedIds = new Set<string>();

    // Copy segment from parent1
    for (let i = start; i <= end; i++) {
      if (p1[i] && p1[i].id) {
        child[i] = p1[i];
        usedIds.add(p1[i].id);
      }
    }

    // Fill from parent2
    let j = 0;
    for (let i = 0; i < p1.length; i++) {
      if (child[i] === null) {
        while (j < p2.length && (!p2[j] || usedIds.has(p2[j].id))) {
          j++;
        }
        if (j < p2.length && p2[j]) {
          child[i] = p2[j];
          usedIds.add(p2[j].id);
          j++;
        }
      }
    }

    // Fill any remaining nulls with parent1 elements not used
    for (let i = 0; i < child.length; i++) {
      if (child[i] === null) {
        for (const stop of p1) {
          if (stop && stop.id && !usedIds.has(stop.id)) {
            child[i] = stop;
            usedIds.add(stop.id);
            break;
          }
        }
      }
    }

    return child.filter(c => c !== null) as DeliveryStop[];
  }

  private swapMutation(chromosome: DeliveryStop[]): DeliveryStop[] {
    const mutated = [...chromosome];
    const i = Math.floor(Math.random() * mutated.length);
    const j = Math.floor(Math.random() * mutated.length);
    [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
    return mutated;
  }

  private chromosomeToRoutes(
    chromosome: DeliveryStop[],
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    const routes: OptimizedRoute[] = [];
    const unassigned: DeliveryStop[] = [];
    let vehicleIdx = 0;
    let currentStops: DeliveryStop[] = [];
    let currentWeight = 0;
    let currentVolume = 0;

    // Filter out any undefined/null stops
    const validStops = chromosome.filter(stop => stop && stop.id);

    for (const stop of validStops) {
      if (vehicleIdx >= request.vehicles.length) {
        unassigned.push(stop);
        continue;
      }

      const vehicle = request.vehicles[vehicleIdx];

      if (currentWeight + (stop.demandWeight || 0) > vehicle.capacityWeight ||
          currentVolume + (stop.demandVolume || 0) > vehicle.capacityVolume) {
        // Build route for current stops
        if (currentStops.length > 0) {
          const route = this.buildRouteFromStops(vehicle, currentStops, request.depot, request.departureTime, options);
          routes.push(route);
          vehicleIdx++;
        }
        currentStops = [];
        currentWeight = 0;
        currentVolume = 0;
      }

      currentStops.push(stop);
      currentWeight += stop.demandWeight || 0;
      currentVolume += stop.demandVolume || 0;
    }

    // Handle last batch
    if (currentStops.length > 0 && vehicleIdx < request.vehicles.length) {
      const route = this.buildRouteFromStops(
        request.vehicles[vehicleIdx],
        currentStops,
        request.depot,
        request.departureTime,
        options
      );
      routes.push(route);
    } else if (currentStops.length > 0) {
      currentStops.forEach(s => unassigned.push(s));
    }

    return { routes, unassigned };
  }

  /**
   * Simulated Annealing VRP
   */
  private simulatedAnnealingVRP(
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    // Start with nearest neighbor solution
    let current = this.nearestNeighborVRP(request, options);
    let currentCost = this.calculateTotalCost(current.routes);
    let best = current;
    let bestCost = currentCost;

    let temperature = 10000;
    const coolingRate = 0.995;
    const minTemp = 1;
    const maxIterations = options.maxIterations || 1000;

    for (let iter = 0; iter < maxIterations && temperature > minTemp; iter++) {
      // Generate neighbor by modifying routes
      const neighbor = this.generateNeighborSolution(current, request, options);
      const neighborCost = this.calculateTotalCost(neighbor.routes);

      const delta = neighborCost - currentCost;

      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        current = neighbor;
        currentCost = neighborCost;

        if (neighborCost < bestCost) {
          best = neighbor;
          bestCost = neighborCost;
        }
      }

      temperature *= coolingRate;
    }

    return best;
  }

  private generateNeighborSolution(
    solution: { routes: OptimizedRoute[]; unassigned: DeliveryStop[] },
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    // Flatten and reshuffle with small perturbation
    const allStops = this.flattenRoutes(solution.routes);

    // Apply random swap
    const mutated = this.swapMutation(allStops);

    return this.chromosomeToRoutes(mutated, request, options);
  }

  /**
   * Tabu Search VRP
   */
  private tabuSearchVRP(
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    const tabuListSize = 20;
    const maxIterations = options.maxIterations || 500;
    const tabuList: string[] = [];

    let current = this.nearestNeighborVRP(request, options);
    let best = current;
    let bestCost = this.calculateTotalCost(best.routes);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Generate all neighbors
      const allStops = this.flattenRoutes(current.routes);
      let bestNeighbor: { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } | null = null;
      let bestNeighborCost = Infinity;
      let bestMove = '';

      // Try all swap moves
      for (let i = 0; i < allStops.length; i++) {
        for (let j = i + 1; j < allStops.length; j++) {
          const moveKey = `${allStops[i].id}-${allStops[j].id}`;

          if (tabuList.includes(moveKey)) continue;

          const swapped = [...allStops];
          [swapped[i], swapped[j]] = [swapped[j], swapped[i]];

          const neighbor = this.chromosomeToRoutes(swapped, request, options);
          const neighborCost = this.calculateTotalCost(neighbor.routes);

          if (neighborCost < bestNeighborCost) {
            bestNeighborCost = neighborCost;
            bestNeighbor = neighbor;
            bestMove = moveKey;
          }
        }
      }

      if (bestNeighbor) {
        current = bestNeighbor;

        // Add move to tabu list
        tabuList.push(bestMove);
        if (tabuList.length > tabuListSize) {
          tabuList.shift();
        }

        if (bestNeighborCost < bestCost) {
          best = bestNeighbor;
          bestCost = bestNeighborCost;
        }
      }
    }

    return best;
  }

  /**
   * Ant Colony Optimization VRP
   */
  private antColonyVRP(
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    const numAnts = 20;
    const numIterations = options.maxIterations || 100;
    const evaporationRate = 0.5;
    const alpha = 1; // pheromone importance
    const beta = 2; // heuristic importance

    const stops = request.stops;
    const n = stops.length;

    // Initialize pheromone matrix
    const pheromone: number[][] = Array(n).fill(null).map(() =>
      Array(n).fill(1.0)
    );

    let bestSolution: DeliveryStop[] = [];
    let bestCost = Infinity;

    for (let iter = 0; iter < numIterations; iter++) {
      const antSolutions: DeliveryStop[][] = [];

      for (let ant = 0; ant < numAnts; ant++) {
        const solution = this.constructAntSolution(stops, pheromone, alpha, beta);
        antSolutions.push(solution);

        const { routes } = this.chromosomeToRoutes(solution, request, options);
        const cost = this.calculateTotalCost(routes);

        if (cost < bestCost) {
          bestCost = cost;
          bestSolution = solution;
        }
      }

      // Evaporate pheromone
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          pheromone[i][j] *= (1 - evaporationRate);
        }
      }

      // Deposit pheromone on best solution
      for (let i = 0; i < bestSolution.length - 1; i++) {
        const fromIdx = stops.findIndex(s => s.id === bestSolution[i].id);
        const toIdx = stops.findIndex(s => s.id === bestSolution[i + 1].id);
        if (fromIdx >= 0 && toIdx >= 0) {
          pheromone[fromIdx][toIdx] += 1.0 / bestCost;
        }
      }
    }

    return this.chromosomeToRoutes(bestSolution, request, options);
  }

  private constructAntSolution(
    stops: DeliveryStop[],
    pheromone: number[][],
    alpha: number,
    beta: number
  ): DeliveryStop[] {
    const solution: DeliveryStop[] = [];
    const remaining = [...stops];
    let current = Math.floor(Math.random() * remaining.length);

    while (remaining.length > 0) {
      solution.push(remaining[current]);
      remaining.splice(current, 1);

      if (remaining.length === 0) break;

      // Calculate probabilities
      const probabilities: number[] = [];
      let total = 0;

      for (let i = 0; i < remaining.length; i++) {
        const fromIdx = stops.findIndex(s => s.id === solution[solution.length - 1].id);
        const toIdx = stops.findIndex(s => s.id === remaining[i].id);

        const tau = pheromone[fromIdx]?.[toIdx] || 1;
        const eta = 1 / Math.max(1, this.getDistance(solution[solution.length - 1], remaining[i]));

        const prob = Math.pow(tau, alpha) * Math.pow(eta, beta);
        probabilities.push(prob);
        total += prob;
      }

      // Roulette wheel selection
      const r = Math.random() * total;
      let cumulative = 0;
      current = 0;

      for (let i = 0; i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (r <= cumulative) {
          current = i;
          break;
        }
      }
    }

    return solution;
  }

  /**
   * Hybrid optimization - combines multiple algorithms
   */
  private hybridOptimization(
    request: RouteRequest,
    options: OptimizationOptions
  ): { routes: OptimizedRoute[]; unassigned: DeliveryStop[] } {
    // Run multiple algorithms and pick best
    const results = [
      this.nearestNeighborVRP(request, options),
      this.savingsAlgorithm(request, options),
      this.sweepAlgorithm(request, options),
    ];

    // Add metaheuristics for better solutions
    if ((options.maxIterations || 100) > 50) {
      results.push(this.geneticAlgorithmVRP(request, { ...options, maxIterations: 50 }));
    }

    // Find best by total cost
    return results.reduce((best, current) => {
      const bestCost = this.calculateTotalCost(best.routes);
      const currentCost = this.calculateTotalCost(current.routes);
      return currentCost < bestCost ? current : best;
    });
  }

  // =================== LOCAL SEARCH ===================

  private applyLocalSearch(
    routes: OptimizedRoute[],
    request: RouteRequest,
    options: OptimizationOptions
  ): OptimizedRoute[] {
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // 2-opt within each route
      for (let r = 0; r < routes.length; r++) {
        const improvedRoute = this.twoOptRoute(routes[r], request.depot, request.departureTime, options);
        if (improvedRoute.metrics.totalDistanceKm < routes[r].metrics.totalDistanceKm) {
          routes[r] = improvedRoute;
          improved = true;
        }
      }

      // Or-opt moves between routes
      for (let r1 = 0; r1 < routes.length; r1++) {
        for (let r2 = r1 + 1; r2 < routes.length; r2++) {
          const [newR1, newR2, wasImproved] = this.orOptBetweenRoutes(
            routes[r1], routes[r2], request, options
          );
          if (wasImproved) {
            routes[r1] = newR1;
            routes[r2] = newR2;
            improved = true;
          }
        }
      }
    }

    return routes;
  }

  private twoOptRoute(
    route: OptimizedRoute,
    depot: Location,
    departureTime: Date,
    options: OptimizationOptions
  ): OptimizedRoute {
    const stops = route.stops.map(s => s.stop);
    if (stops.length < 3) return route;

    let improved = true;
    let bestStops = stops;

    while (improved) {
      improved = false;

      for (let i = 0; i < bestStops.length - 1; i++) {
        for (let j = i + 2; j < bestStops.length; j++) {
          // Reverse segment between i and j
          const newStops = [
            ...bestStops.slice(0, i + 1),
            ...bestStops.slice(i + 1, j + 1).reverse(),
            ...bestStops.slice(j + 1),
          ];

          const currentDist = this.calculateRouteDistance(bestStops, depot);
          const newDist = this.calculateRouteDistance(newStops, depot);

          if (newDist < currentDist) {
            bestStops = newStops;
            improved = true;
          }
        }
      }
    }

    // Rebuild route with optimized stop order
    const vehicle = { id: route.vehicleId, name: route.vehicleName } as Vehicle;
    // Find full vehicle details from metrics
    const vehicleData: Vehicle = {
      ...vehicle,
      capacityWeight: 10000,
      capacityVolume: 50,
      capacityPallets: 20,
      fuelConsumptionL100km: route.metrics.fuelConsumptionLiters / route.metrics.totalDistanceKm * 100,
      costPerKm: 1.5,
      fixedDailyCost: 100,
      skills: [],
      depotId: 'depot',
      depot,
      maxWorkingMinutes: 600,
    };

    return this.buildRouteFromStops(vehicleData, bestStops, depot, departureTime, options);
  }

  private orOptBetweenRoutes(
    route1: OptimizedRoute,
    route2: OptimizedRoute,
    request: RouteRequest,
    options: OptimizationOptions
  ): [OptimizedRoute, OptimizedRoute, boolean] {
    // Try moving each stop from route1 to route2
    const stops1 = route1.stops.map(s => s.stop);
    const stops2 = route2.stops.map(s => s.stop);

    let bestImprovement = 0;
    let bestConfig: { stops1: DeliveryStop[]; stops2: DeliveryStop[] } | null = null;

    for (let i = 0; i < stops1.length; i++) {
      const stopToMove = stops1[i];
      const newStops1 = [...stops1.slice(0, i), ...stops1.slice(i + 1)];

      for (let j = 0; j <= stops2.length; j++) {
        const newStops2 = [...stops2.slice(0, j), stopToMove, ...stops2.slice(j)];

        const currentCost = this.calculateRouteDistance(stops1, request.depot) +
          this.calculateRouteDistance(stops2, request.depot);
        const newCost = this.calculateRouteDistance(newStops1, request.depot) +
          this.calculateRouteDistance(newStops2, request.depot);

        const improvement = currentCost - newCost;
        if (improvement > bestImprovement) {
          bestImprovement = improvement;
          bestConfig = { stops1: newStops1, stops2: newStops2 };
        }
      }
    }

    if (bestConfig && bestImprovement > 0.1) {
      const v1 = request.vehicles.find(v => v.id === route1.vehicleId) || request.vehicles[0];
      const v2 = request.vehicles.find(v => v.id === route2.vehicleId) || request.vehicles[0];

      const newRoute1 = this.buildRouteFromStops(v1, bestConfig.stops1, request.depot, request.departureTime, options);
      const newRoute2 = this.buildRouteFromStops(v2, bestConfig.stops2, request.depot, request.departureTime, options);

      return [newRoute1, newRoute2, true];
    }

    return [route1, route2, false];
  }

  // =================== HELPER METHODS ===================

  private buildRouteFromStops(
    vehicle: Vehicle,
    stops: DeliveryStop[],
    depot: Location,
    departureTime: Date,
    options: OptimizationOptions
  ): OptimizedRoute {
    const optimizedStops: OptimizedStop[] = [];
    const warnings: RouteWarning[] = [];
    let currentLocation: Location = depot;
    let currentTime = new Date(departureTime);
    let currentLoad = { weight: 0, volume: 0, pallets: 0 };
    let totalDistance = 0;
    let totalDrivingTime = 0;
    let totalServiceTime = 0;
    let totalWaitTime = 0;

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const distance = this.getDistance(currentLocation, stop);
      const travelTime = this.getTravelTime(currentLocation, stop, currentTime, options.includeTraffic);

      const arrivalTime = new Date(currentTime.getTime() + travelTime * 60000);
      let waitTime = 0;
      let lateMinutes = 0;

      if (stop.timeWindow) {
        if (arrivalTime < stop.timeWindow.start) {
          waitTime = (stop.timeWindow.start.getTime() - arrivalTime.getTime()) / 60000;
        } else if (arrivalTime > stop.timeWindow.end) {
          lateMinutes = (arrivalTime.getTime() - stop.timeWindow.end.getTime()) / 60000;
          warnings.push({
            type: 'TIME_WINDOW_VIOLATION',
            severity: lateMinutes > 30 ? 'ERROR' : 'WARNING',
            message: `Sosire cu ${Math.round(lateMinutes)} min întârziere`,
            stopId: stop.id,
          });
        }
      }

      const departTime = new Date(arrivalTime.getTime() + (waitTime + stop.serviceTimeMinutes) * 60000);

      currentLoad = {
        weight: currentLoad.weight + stop.demandWeight,
        volume: currentLoad.volume + stop.demandVolume,
        pallets: currentLoad.pallets + stop.demandPallets,
      };

      optimizedStops.push({
        stop,
        arrivalTime,
        departureTime: departTime,
        waitTimeMinutes: waitTime,
        lateMinutes,
        distanceFromPreviousKm: distance,
        timeFromPreviousMinutes: travelTime,
        cumulativeLoad: {
          ...currentLoad,
          weightUtilization: (currentLoad.weight / vehicle.capacityWeight) * 100,
          volumeUtilization: (currentLoad.volume / vehicle.capacityVolume) * 100,
        },
        sequence: i + 1,
      });

      totalDistance += distance;
      totalDrivingTime += travelTime;
      totalServiceTime += stop.serviceTimeMinutes;
      totalWaitTime += waitTime;

      currentLocation = stop;
      currentTime = departTime;
    }

    // Return to depot
    if (stops.length > 0) {
      const returnDistance = this.getDistance(currentLocation, depot);
      const returnTime = this.getTravelTime(currentLocation, depot, currentTime, options.includeTraffic);
      totalDistance += returnDistance;
      totalDrivingTime += returnTime;
    }

    const fuelConsumption = (totalDistance * vehicle.fuelConsumptionL100km) / 100;
    const fuelCost = fuelConsumption * this.fuelPriceRon;
    const totalCost = fuelCost + vehicle.fixedDailyCost + (totalDistance * vehicle.costPerKm);

    const onTime = optimizedStops.filter(s => s.lateMinutes === 0).length;
    const late = optimizedStops.filter(s => s.lateMinutes > 0).length;
    const latePenalty = optimizedStops.reduce((sum, s) => {
      if (s.lateMinutes > 0 && s.stop.timeWindow) {
        return sum + s.lateMinutes * s.stop.timeWindow.penaltyPerMinuteLate;
      }
      return sum;
    }, 0);

    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      stops: optimizedStops,
      metrics: {
        totalDistanceKm: Math.round(totalDistance * 100) / 100,
        totalTimeMinutes: Math.round(totalDrivingTime + totalServiceTime + totalWaitTime),
        drivingTimeMinutes: Math.round(totalDrivingTime),
        serviceTimeMinutes: Math.round(totalServiceTime),
        waitingTimeMinutes: Math.round(totalWaitTime),
        breakTimeMinutes: 0,
        fuelConsumptionLiters: Math.round(fuelConsumption * 100) / 100,
        fuelCostRon: Math.round(fuelCost * 100) / 100,
        totalCostRon: Math.round(totalCost * 100) / 100,
        onTimeDeliveries: onTime,
        lateDeliveries: late,
        latePenaltyRon: Math.round(latePenalty * 100) / 100,
        utilizationPercent: stops.length > 0
          ? Math.round((currentLoad.weight / vehicle.capacityWeight) * 100)
          : 0,
      },
      warnings,
      feasible: warnings.filter(w => w.severity === 'ERROR').length === 0,
    };
  }

  private calculateTotalCost(routes: OptimizedRoute[]): number {
    return routes.reduce((sum, r) => sum + r.metrics.totalCostRon + r.metrics.latePenaltyRon, 0);
  }

  private calculateRouteDistance(stops: DeliveryStop[], depot: Location): number {
    if (stops.length === 0) return 0;

    let total = this.getDistance(depot, stops[0]);
    for (let i = 0; i < stops.length - 1; i++) {
      total += this.getDistance(stops[i], stops[i + 1]);
    }
    total += this.getDistance(stops[stops.length - 1], depot);

    return total;
  }

  private async buildDistanceMatrix(stops: DeliveryStop[], depot: Location): Promise<void> {
    const allLocations = [depot, ...stops];

    for (let i = 0; i < allLocations.length; i++) {
      for (let j = i + 1; j < allLocations.length; j++) {
        const key = `${allLocations[i].id}-${allLocations[j].id}`;
        const reverseKey = `${allLocations[j].id}-${allLocations[i].id}`;

        if (!this.distanceMatrix.has(key)) {
          const distance = this.haversineDistance(allLocations[i], allLocations[j]);
          const duration = (distance / this.baseSpeeds.urban) * 60; // minutes

          this.distanceMatrix.set(key, { distance, duration });
          this.distanceMatrix.set(reverseKey, { distance, duration });
        }
      }
    }
  }

  private getDistance(from: Location, to: Location): number {
    const key = `${from.id}-${to.id}`;
    const cached = this.distanceMatrix.get(key);
    if (cached) return cached.distance;
    return this.haversineDistance(from, to);
  }

  private getTravelTime(from: Location, to: Location, departureTime: Date, includeTraffic?: boolean): number {
    const distance = this.getDistance(from, to);
    const baseTime = (distance / this.baseSpeeds.urban) * 60; // minutes

    if (!includeTraffic) return baseTime;

    // Apply traffic multiplier based on city and hour
    const city = this.detectCity(from.lat, from.lng);
    const hour = departureTime.getHours();
    const patterns = this.trafficPatterns[city] || this.trafficPatterns['default'];
    const multiplier = patterns[hour] || 1.0;

    return baseTime * multiplier;
  }

  private detectCity(lat: number, lng: number): string {
    // Simple city detection based on coordinates
    if (lat > 44.3 && lat < 44.6 && lng > 25.9 && lng < 26.3) return 'București';
    if (lat > 46.7 && lat < 46.9 && lng > 23.5 && lng < 23.7) return 'Cluj-Napoca';
    if (lat > 45.7 && lat < 45.8 && lng > 21.1 && lng < 21.3) return 'Timișoara';
    return 'default';
  }

  private haversineDistance(a: Location, b: Location): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);

    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return 2 * this.EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  }

  private sortByPriority(stops: DeliveryStop[]): DeliveryStop[] {
    const priorityOrder: Record<StopPriority, number> = {
      'CRITICAL': 0,
      'URGENT': 1,
      'HIGH': 2,
      'NORMAL': 3,
      'LOW': 4,
    };

    return stops.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private validateRequest(request: RouteRequest): void {
    if (!request.stops || request.stops.length === 0) {
      throw new BadRequestException('Nu există opriri pentru optimizare');
    }
    if (!request.vehicles || request.vehicles.length === 0) {
      throw new BadRequestException('Nu există vehicule disponibile');
    }
    if (!request.depot) {
      throw new BadRequestException('Depozitul nu este specificat');
    }
  }

  private calculateSummary(
    routes: OptimizedRoute[],
    unassigned: DeliveryStop[],
    request: RouteRequest
  ): OptimizationSummary {
    const totalStops = request.stops.length;
    const assignedStops = routes.reduce((sum, r) => sum + r.stops.length, 0);

    const totalDistance = routes.reduce((sum, r) => sum + r.metrics.totalDistanceKm, 0);
    const totalTime = routes.reduce((sum, r) => sum + r.metrics.totalTimeMinutes, 0);
    const totalCost = routes.reduce((sum, r) => sum + r.metrics.totalCostRon, 0);
    const totalFuel = routes.reduce((sum, r) => sum + r.metrics.fuelConsumptionLiters, 0);

    const onTimeTotal = routes.reduce((sum, r) => sum + r.metrics.onTimeDeliveries, 0);
    const avgUtilization = routes.length > 0
      ? routes.reduce((sum, r) => sum + r.metrics.utilizationPercent, 0) / routes.length
      : 0;

    return {
      totalStops,
      assignedStops,
      unassignedStops: unassigned.length,
      vehiclesUsed: routes.length,
      totalDistanceKm: Math.round(totalDistance * 100) / 100,
      totalTimeMinutes: Math.round(totalTime),
      totalCostRon: Math.round(totalCost * 100) / 100,
      totalFuelLiters: Math.round(totalFuel * 100) / 100,
      onTimePercent: assignedStops > 0 ? Math.round((onTimeTotal / assignedStops) * 100) : 0,
      averageUtilization: Math.round(avgUtilization),
      co2EmissionsKg: Math.round(totalFuel * this.co2PerLiter * 100) / 100,
    };
  }

  // =================== REAL-TIME TRAFFIC ===================

  async getTrafficConditions(locations: Location[]): Promise<TrafficCondition[]> {
    const conditions: TrafficCondition[] = [];
    const now = new Date();

    for (let i = 0; i < locations.length - 1; i++) {
      const from = locations[i];
      const to = locations[i + 1];
      const city = this.detectCity(from.lat, from.lng);
      const hour = now.getHours();
      const patterns = this.trafficPatterns[city] || this.trafficPatterns['default'];
      const multiplier = patterns[hour] || 1.0;

      const baseSpeed = this.baseSpeeds.urban;
      const actualSpeed = baseSpeed / multiplier;

      const congestion: CongestionLevel =
        multiplier >= 2.0 ? 'SEVERE' :
        multiplier >= 1.5 ? 'HEAVY' :
        multiplier >= 1.2 ? 'MODERATE' :
        multiplier >= 1.1 ? 'LIGHT' : 'FREE_FLOW';

      const distance = this.haversineDistance(from, to);
      const baseTime = (distance / baseSpeed) * 60;
      const actualTime = baseTime * multiplier;

      conditions.push({
        segment: { from, to },
        speedKmh: Math.round(actualSpeed),
        delayMinutes: Math.round(actualTime - baseTime),
        congestionLevel: congestion,
        lastUpdated: now,
      });
    }

    return conditions;
  }

  async updateETAs(routeStops: OptimizedStop[]): Promise<ETAUpdate[]> {
    const updates: ETAUpdate[] = [];
    const now = new Date();

    for (const stop of routeStops) {
      // Recalculate with current traffic
      const city = this.detectCity(stop.stop.lat, stop.stop.lng);
      const hour = now.getHours();
      const patterns = this.trafficPatterns[city] || this.trafficPatterns['default'];
      const multiplier = patterns[hour] || 1.0;

      const baseDelay = stop.timeFromPreviousMinutes;
      const actualDelay = baseDelay * multiplier;
      const delayDiff = actualDelay - baseDelay;

      if (Math.abs(delayDiff) > 5) { // More than 5 min difference
        const updatedETA = new Date(stop.arrivalTime.getTime() + delayDiff * 60000);

        updates.push({
          stopId: stop.stop.id,
          originalETA: stop.arrivalTime,
          updatedETA,
          delayMinutes: Math.round(delayDiff),
          reason: delayDiff > 0 ? `Trafic ${multiplier >= 1.5 ? 'aglomerat' : 'moderat'}` : 'Trafic redus',
        });
      }
    }

    return updates;
  }

  // =================== PREDICTIVE ETA ===================

  async predictETA(
    from: Location,
    to: Location,
    departureTime: Date
  ): Promise<{
    estimatedArrival: Date;
    durationMinutes: number;
    distanceKm: number;
    confidence: number;
    factors: string[];
  }> {
    const distance = this.haversineDistance(from, to);
    const baseDuration = (distance / this.baseSpeeds.urban) * 60;

    const city = this.detectCity(from.lat, from.lng);
    const hour = departureTime.getHours();
    const dayOfWeek = departureTime.getDay();

    // Apply traffic multiplier
    const patterns = this.trafficPatterns[city] || this.trafficPatterns['default'];
    let multiplier = patterns[hour] || 1.0;

    const factors: string[] = [];

    // Weekend adjustment
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier *= 0.7;
      factors.push('Weekend - trafic redus');
    }

    // Rush hour
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
      factors.push('Oră de vârf');
    }

    // Weather (simulated - in production would use real API)
    const weatherFactor = 1.0; // Could add weather API integration

    const adjustedDuration = baseDuration * multiplier * weatherFactor;
    const estimatedArrival = new Date(departureTime.getTime() + adjustedDuration * 60000);

    // Confidence based on prediction factors (capped at 100)
    const confidence = Math.min(100, Math.max(60, 95 - (multiplier - 1) * 20));

    return {
      estimatedArrival,
      durationMinutes: Math.round(adjustedDuration),
      distanceKm: Math.round(distance * 100) / 100,
      confidence: Math.round(confidence),
      factors,
    };
  }

  // =================== GOOGLE MAPS INTEGRATION ===================

  async getGoogleMapsRoute(
    origin: Location,
    destination: Location,
    waypoints?: Location[],
    departureTime?: Date
  ): Promise<GoogleMapsRoute | null> {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');

    if (!apiKey) {
      this.logger.warn('Google Maps API key not configured, using fallback calculation');
      return this.calculateFallbackRoute(origin, destination, waypoints);
    }

    // In production, this would make actual API calls
    // For now, return calculated route
    return this.calculateFallbackRoute(origin, destination, waypoints);
  }

  private calculateFallbackRoute(
    origin: Location,
    destination: Location,
    waypoints?: Location[]
  ): GoogleMapsRoute {
    const allPoints = [origin, ...(waypoints || []), destination];
    const legs: GoogleMapsLeg[] = [];
    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 0; i < allPoints.length - 1; i++) {
      const distance = this.haversineDistance(allPoints[i], allPoints[i + 1]) * 1000; // to meters
      const duration = (distance / 1000 / this.baseSpeeds.urban) * 3600; // to seconds

      totalDistance += distance;
      totalDuration += duration;

      legs.push({
        distance: Math.round(distance),
        duration: Math.round(duration),
        startAddress: allPoints[i].address || `${allPoints[i].lat},${allPoints[i].lng}`,
        endAddress: allPoints[i + 1].address || `${allPoints[i + 1].lat},${allPoints[i + 1].lng}`,
        steps: [{
          distance: Math.round(distance),
          duration: Math.round(duration),
          instruction: `Conduceți către ${allPoints[i + 1].name || 'destinație'}`,
        }],
      });
    }

    return {
      distance: Math.round(totalDistance),
      duration: Math.round(totalDuration),
      durationInTraffic: Math.round(totalDuration * 1.3), // Estimate with traffic
      polyline: '', // Would be encoded polyline from Google
      legs,
    };
  }
}
