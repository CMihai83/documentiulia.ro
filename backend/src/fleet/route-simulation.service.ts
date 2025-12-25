import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus } from '@prisma/client';

/**
 * Route Simulation & Planning Service
 * Enables dispatchers to simulate and plan routes before execution.
 *
 * Features:
 * - Route simulation with cost/time estimates
 * - What-if scenarios (add/remove stops, change vehicle)
 * - Capacity planning and constraints
 * - Multi-route comparison
 * - Future route planning
 * - Traffic and time-of-day considerations
 */

export interface SimulationStop {
  id?: string;
  address: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  estimatedServiceTime?: number; // minutes
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  timeWindow?: { start: string; end: string }; // HH:mm format
  parcelCount?: number;
  weight?: number; // kg
}

export interface SimulationVehicle {
  id: string;
  licensePlate: string;
  capacity: number;
  maxWeight: number;
  fuelEfficiency: number; // L/100km
  costPerKm: number;
  available: boolean;
}

export interface RouteSimulationResult {
  id: string;
  name: string;
  vehicleId: string;
  vehiclePlate: string;
  stops: SimulatedStop[];
  metrics: RouteMetrics;
  constraints: ConstraintViolation[];
  isValid: boolean;
  createdAt: Date;
}

export interface SimulatedStop {
  order: number;
  address: string;
  city: string;
  arrivalTime: string; // HH:mm
  departureTime: string;
  serviceTime: number; // minutes
  distanceFromPrevious: number; // km
  timeFromPrevious: number; // minutes
  isWithinTimeWindow: boolean;
  cumulativeDistance: number;
  cumulativeTime: number;
}

export interface RouteMetrics {
  totalDistance: number; // km
  totalTime: number; // minutes
  totalStops: number;
  estimatedFuelUsage: number; // liters
  estimatedFuelCost: number; // EUR
  estimatedTotalCost: number; // EUR
  avgTimePerStop: number; // minutes
  avgDistanceBetweenStops: number; // km
  utilization: number; // % of vehicle capacity
  weightUtilization: number; // % of max weight
}

export interface ConstraintViolation {
  type: 'CAPACITY' | 'WEIGHT' | 'TIME_WINDOW' | 'DRIVER_HOURS' | 'VEHICLE_UNAVAILABLE';
  severity: 'ERROR' | 'WARNING';
  message: string;
  stopIndex?: number;
}

export interface RouteScenario {
  id: string;
  name: string;
  description?: string;
  baseRouteId?: string;
  modifications: ScenarioModification[];
  result?: RouteSimulationResult;
}

export interface ScenarioModification {
  type: 'ADD_STOP' | 'REMOVE_STOP' | 'REORDER_STOPS' | 'CHANGE_VEHICLE' | 'CHANGE_START_TIME';
  data: any;
}

export interface RoutePlan {
  id: string;
  userId: string;
  name: string;
  planDate: Date;
  status: 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'CANCELLED';
  routes: PlannedRoute[];
  totalMetrics: RouteMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlannedRoute {
  vehicleId: string;
  driverId?: string;
  stops: SimulationStop[];
  startTime: string; // HH:mm
  simulation?: RouteSimulationResult;
}

@Injectable()
export class RouteSimulationService {
  private readonly logger = new Logger(RouteSimulationService.name);

  // In-memory storage for simulations and plans
  private simulations: Map<string, RouteSimulationResult> = new Map();
  private scenarios: Map<string, RouteScenario[]> = new Map();
  private plans: Map<string, RoutePlan[]> = new Map();
  private simulationCounter = 0;
  private scenarioCounter = 0;
  private planCounter = 0;

  // Munich average speeds by time of day (km/h)
  private readonly SPEED_PROFILES = {
    RUSH_HOUR: 18, // 7-9, 16-19
    NORMAL: 28,
    OFF_PEAK: 35, // 10-15, 20-6
  };

  // Default service times (minutes)
  private readonly SERVICE_TIMES = {
    RESIDENTIAL: 3,
    BUSINESS: 5,
    PICKUP_POINT: 2,
  };

  // Cost factors
  private readonly COST_FACTORS = {
    FUEL_PRICE_PER_LITER: 1.80, // EUR
    DRIVER_COST_PER_HOUR: 25, // EUR
    VEHICLE_DEPRECIATION_PER_KM: 0.15, // EUR
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Simulate a route with given stops and vehicle
   */
  async simulateRoute(
    userId: string,
    params: {
      name?: string;
      vehicleId: string;
      stops: SimulationStop[];
      startTime?: string; // HH:mm, default 08:00
      returnToDepot?: boolean;
      depotAddress?: string;
    },
  ): Promise<RouteSimulationResult> {
    const { vehicleId, stops, startTime = '08:00', returnToDepot = true } = params;

    // Get vehicle info
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });

    if (!vehicle) {
      throw new BadRequestException('Fahrzeug nicht gefunden');
    }

    const id = `sim-${++this.simulationCounter}-${Date.now()}`;

    // Simulate the route
    const simulatedStops = this.calculateRouteSimulation(stops, startTime);
    const metrics = this.calculateRouteMetrics(simulatedStops, vehicle);
    const constraints = this.checkConstraints(stops, vehicle, simulatedStops, metrics);

    const result: RouteSimulationResult = {
      id,
      name: params.name || `Simulation ${new Date().toLocaleString('de-DE')}`,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.licensePlate,
      stops: simulatedStops,
      metrics,
      constraints,
      isValid: !constraints.some(c => c.severity === 'ERROR'),
      createdAt: new Date(),
    };

    // Store simulation
    const userSims = this.simulations.get(userId) || new Map();
    this.simulations.set(id, result);

    this.logger.log(`Route simulation ${id}: ${stops.length} stops, ${metrics.totalDistance.toFixed(1)}km, valid=${result.isValid}`);

    return result;
  }

  /**
   * Get a simulation by ID
   */
  async getSimulation(simulationId: string): Promise<RouteSimulationResult | null> {
    return this.simulations.get(simulationId) || null;
  }

  /**
   * Compare multiple route options
   */
  async compareRoutes(
    userId: string,
    simulations: { vehicleId: string; stops: SimulationStop[]; startTime?: string }[],
  ): Promise<{
    routes: RouteSimulationResult[];
    comparison: {
      bestTime: string;
      bestDistance: string;
      bestCost: string;
      recommendation: string;
    };
  }> {
    const results: RouteSimulationResult[] = [];

    for (let i = 0; i < simulations.length; i++) {
      const sim = simulations[i];
      const result = await this.simulateRoute(userId, {
        name: `Option ${i + 1}`,
        vehicleId: sim.vehicleId,
        stops: sim.stops,
        startTime: sim.startTime,
      });
      results.push(result);
    }

    // Find best options
    const validResults = results.filter(r => r.isValid);
    if (validResults.length === 0) {
      return {
        routes: results,
        comparison: {
          bestTime: 'N/A',
          bestDistance: 'N/A',
          bestCost: 'N/A',
          recommendation: 'Keine gültigen Routen gefunden. Bitte Einschränkungen prüfen.',
        },
      };
    }

    const bestTimeRoute = validResults.reduce((a, b) =>
      a.metrics.totalTime < b.metrics.totalTime ? a : b,
    );
    const bestDistanceRoute = validResults.reduce((a, b) =>
      a.metrics.totalDistance < b.metrics.totalDistance ? a : b,
    );
    const bestCostRoute = validResults.reduce((a, b) =>
      a.metrics.estimatedTotalCost < b.metrics.estimatedTotalCost ? a : b,
    );

    // Determine recommendation
    let recommendation = '';
    if (bestTimeRoute.id === bestCostRoute.id) {
      recommendation = `Route "${bestTimeRoute.name}" ist optimal für Zeit und Kosten.`;
    } else {
      recommendation = `Route "${bestCostRoute.name}" ist am kostengünstigsten (${bestCostRoute.metrics.estimatedTotalCost.toFixed(2)}€), Route "${bestTimeRoute.name}" ist am schnellsten (${bestTimeRoute.metrics.totalTime} min).`;
    }

    return {
      routes: results,
      comparison: {
        bestTime: bestTimeRoute.name,
        bestDistance: bestDistanceRoute.name,
        bestCost: bestCostRoute.name,
        recommendation,
      },
    };
  }

  /**
   * Create a what-if scenario
   */
  async createScenario(
    userId: string,
    params: {
      name: string;
      description?: string;
      baseSimulationId?: string;
      modifications: ScenarioModification[];
    },
  ): Promise<RouteScenario> {
    const id = `scenario-${++this.scenarioCounter}-${Date.now()}`;

    const scenario: RouteScenario = {
      id,
      name: params.name,
      description: params.description,
      baseRouteId: params.baseSimulationId,
      modifications: params.modifications,
    };

    // If there's a base simulation, apply modifications
    if (params.baseSimulationId) {
      const baseSim = await this.getSimulation(params.baseSimulationId);
      if (baseSim) {
        const modifiedStops = this.applyModifications(
          baseSim.stops.map(s => ({
            address: s.address,
            city: s.city,
            postalCode: '',
          })),
          params.modifications,
        );

        const result = await this.simulateRoute(userId, {
          name: `${params.name} (Szenario)`,
          vehicleId: baseSim.vehicleId,
          stops: modifiedStops,
        });

        scenario.result = result;
      }
    }

    const userScenarios = this.scenarios.get(userId) || [];
    userScenarios.push(scenario);
    this.scenarios.set(userId, userScenarios);

    return scenario;
  }

  /**
   * Get scenarios for user
   */
  async getScenarios(userId: string): Promise<RouteScenario[]> {
    return this.scenarios.get(userId) || [];
  }

  /**
   * Get available vehicles for planning
   */
  async getAvailableVehicles(
    userId: string,
    date: Date,
  ): Promise<SimulationVehicle[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        userId,
        status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.IN_USE] },
      },
    });

    // Check which vehicles are already assigned on this date
    const assignedVehicles = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        routeDate: date,
      },
      select: { vehicleId: true },
    });

    const assignedIds = new Set(assignedVehicles.map(r => r.vehicleId));

    return vehicles.map(v => ({
      id: v.id,
      licensePlate: v.licensePlate,
      capacity: 100, // Default capacity (would come from vehicle specs)
      maxWeight: 1500, // Default max weight in kg
      fuelEfficiency: 10, // L/100km default
      costPerKm: this.COST_FACTORS.VEHICLE_DEPRECIATION_PER_KM +
        (10 * this.COST_FACTORS.FUEL_PRICE_PER_LITER / 100),
      available: !assignedIds.has(v.id),
    }));
  }

  /**
   * Create a route plan for a future date
   */
  async createRoutePlan(
    userId: string,
    params: {
      name: string;
      planDate: Date;
      routes: PlannedRoute[];
    },
  ): Promise<RoutePlan> {
    const id = `plan-${++this.planCounter}-${Date.now()}`;

    // Simulate each route in the plan
    const simulatedRoutes: PlannedRoute[] = [];
    let totalMetrics: RouteMetrics = {
      totalDistance: 0,
      totalTime: 0,
      totalStops: 0,
      estimatedFuelUsage: 0,
      estimatedFuelCost: 0,
      estimatedTotalCost: 0,
      avgTimePerStop: 0,
      avgDistanceBetweenStops: 0,
      utilization: 0,
      weightUtilization: 0,
    };

    for (const route of params.routes) {
      const simulation = await this.simulateRoute(userId, {
        vehicleId: route.vehicleId,
        stops: route.stops,
        startTime: route.startTime,
      });

      simulatedRoutes.push({
        ...route,
        simulation,
      });

      // Aggregate metrics
      totalMetrics.totalDistance += simulation.metrics.totalDistance;
      totalMetrics.totalTime += simulation.metrics.totalTime;
      totalMetrics.totalStops += simulation.metrics.totalStops;
      totalMetrics.estimatedFuelUsage += simulation.metrics.estimatedFuelUsage;
      totalMetrics.estimatedFuelCost += simulation.metrics.estimatedFuelCost;
      totalMetrics.estimatedTotalCost += simulation.metrics.estimatedTotalCost;
    }

    // Calculate averages
    if (simulatedRoutes.length > 0) {
      totalMetrics.avgTimePerStop = totalMetrics.totalTime / totalMetrics.totalStops;
      totalMetrics.avgDistanceBetweenStops = totalMetrics.totalDistance / totalMetrics.totalStops;
      totalMetrics.utilization = simulatedRoutes.reduce((sum, r) =>
        sum + (r.simulation?.metrics.utilization || 0), 0) / simulatedRoutes.length;
    }

    const plan: RoutePlan = {
      id,
      userId,
      name: params.name,
      planDate: params.planDate,
      status: 'DRAFT',
      routes: simulatedRoutes,
      totalMetrics,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userPlans = this.plans.get(userId) || [];
    userPlans.push(plan);
    this.plans.set(userId, userPlans);

    this.logger.log(`Route plan ${id} created: ${simulatedRoutes.length} routes, ${totalMetrics.totalStops} total stops`);

    return plan;
  }

  /**
   * Get route plans for user
   */
  async getRoutePlans(
    userId: string,
    options?: {
      status?: 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'CANCELLED';
      fromDate?: Date;
      toDate?: Date;
    },
  ): Promise<RoutePlan[]> {
    let plans = this.plans.get(userId) || [];

    if (options?.status) {
      plans = plans.filter(p => p.status === options.status);
    }
    if (options?.fromDate) {
      plans = plans.filter(p => p.planDate >= options.fromDate!);
    }
    if (options?.toDate) {
      plans = plans.filter(p => p.planDate <= options.toDate!);
    }

    return plans.sort((a, b) => b.planDate.getTime() - a.planDate.getTime());
  }

  /**
   * Update plan status
   */
  async updatePlanStatus(
    userId: string,
    planId: string,
    status: 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'CANCELLED',
  ): Promise<RoutePlan | null> {
    const plans = this.plans.get(userId) || [];
    const plan = plans.find(p => p.id === planId);

    if (!plan) return null;

    plan.status = status;
    plan.updatedAt = new Date();

    return plan;
  }

  /**
   * Get planning dashboard summary
   */
  async getPlanningDashboard(userId: string): Promise<{
    upcomingPlans: RoutePlan[];
    totalPlannedRoutes: number;
    totalPlannedStops: number;
    estimatedCosts: number;
    vehicleUtilization: { vehicleId: string; plate: string; plannedDays: number }[];
  }> {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const plans = await this.getRoutePlans(userId, {
      status: 'APPROVED',
      fromDate: now,
      toDate: nextWeek,
    });

    // Calculate totals
    let totalRoutes = 0;
    let totalStops = 0;
    let totalCosts = 0;
    const vehicleDays: Record<string, { plate: string; days: Set<string> }> = {};

    for (const plan of plans) {
      totalRoutes += plan.routes.length;
      totalStops += plan.totalMetrics.totalStops;
      totalCosts += plan.totalMetrics.estimatedTotalCost;

      for (const route of plan.routes) {
        if (!vehicleDays[route.vehicleId]) {
          vehicleDays[route.vehicleId] = {
            plate: route.simulation?.vehiclePlate || 'Unknown',
            days: new Set(),
          };
        }
        vehicleDays[route.vehicleId].days.add(plan.planDate.toISOString().split('T')[0]);
      }
    }

    return {
      upcomingPlans: plans.slice(0, 5),
      totalPlannedRoutes: totalRoutes,
      totalPlannedStops: totalStops,
      estimatedCosts: Math.round(totalCosts * 100) / 100,
      vehicleUtilization: Object.entries(vehicleDays).map(([id, data]) => ({
        vehicleId: id,
        plate: data.plate,
        plannedDays: data.days.size,
      })),
    };
  }

  // =================== PRIVATE HELPERS ===================

  private calculateRouteSimulation(
    stops: SimulationStop[],
    startTime: string,
  ): SimulatedStop[] {
    const result: SimulatedStop[] = [];
    let currentTime = this.parseTime(startTime);
    let cumulativeDistance = 0;
    let cumulativeTime = 0;

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const prevStop = i > 0 ? stops[i - 1] : null;

      // Calculate distance and time from previous stop
      const distance = this.estimateDistance(prevStop, stop);
      const travelTime = this.estimateTravelTime(distance, currentTime);

      cumulativeDistance += distance;
      cumulativeTime += travelTime;
      currentTime += travelTime;

      const arrivalTime = this.formatTime(currentTime);
      const serviceTime = stop.estimatedServiceTime || this.SERVICE_TIMES.RESIDENTIAL;
      const departureTime = this.formatTime(currentTime + serviceTime);

      // Check time window
      let isWithinTimeWindow = true;
      if (stop.timeWindow) {
        const windowStart = this.parseTime(stop.timeWindow.start);
        const windowEnd = this.parseTime(stop.timeWindow.end);
        isWithinTimeWindow = currentTime >= windowStart && currentTime <= windowEnd;
      }

      result.push({
        order: i + 1,
        address: stop.address,
        city: stop.city,
        arrivalTime,
        departureTime,
        serviceTime,
        distanceFromPrevious: Math.round(distance * 10) / 10,
        timeFromPrevious: Math.round(travelTime),
        isWithinTimeWindow,
        cumulativeDistance: Math.round(cumulativeDistance * 10) / 10,
        cumulativeTime: Math.round(cumulativeTime),
      });

      currentTime += serviceTime;
      cumulativeTime += serviceTime;
    }

    return result;
  }

  private calculateRouteMetrics(
    stops: SimulatedStop[],
    vehicle: any,
  ): RouteMetrics {
    if (stops.length === 0) {
      return {
        totalDistance: 0,
        totalTime: 0,
        totalStops: 0,
        estimatedFuelUsage: 0,
        estimatedFuelCost: 0,
        estimatedTotalCost: 0,
        avgTimePerStop: 0,
        avgDistanceBetweenStops: 0,
        utilization: 0,
        weightUtilization: 0,
      };
    }

    const lastStop = stops[stops.length - 1];
    const totalDistance = lastStop.cumulativeDistance;
    const totalTime = lastStop.cumulativeTime;

    // Estimate fuel usage (L/100km default efficiency)
    const fuelEfficiency = 10; // Would come from vehicle data
    const estimatedFuelUsage = (totalDistance / 100) * fuelEfficiency;
    const estimatedFuelCost = estimatedFuelUsage * this.COST_FACTORS.FUEL_PRICE_PER_LITER;

    // Total cost including driver and depreciation
    const driverCost = (totalTime / 60) * this.COST_FACTORS.DRIVER_COST_PER_HOUR;
    const depreciationCost = totalDistance * this.COST_FACTORS.VEHICLE_DEPRECIATION_PER_KM;
    const estimatedTotalCost = estimatedFuelCost + driverCost + depreciationCost;

    return {
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalTime: Math.round(totalTime),
      totalStops: stops.length,
      estimatedFuelUsage: Math.round(estimatedFuelUsage * 10) / 10,
      estimatedFuelCost: Math.round(estimatedFuelCost * 100) / 100,
      estimatedTotalCost: Math.round(estimatedTotalCost * 100) / 100,
      avgTimePerStop: Math.round(totalTime / stops.length),
      avgDistanceBetweenStops: Math.round((totalDistance / stops.length) * 10) / 10,
      utilization: 75, // Placeholder - would need actual parcel counts
      weightUtilization: 60, // Placeholder - would need actual weights
    };
  }

  private checkConstraints(
    inputStops: SimulationStop[],
    vehicle: any,
    simulatedStops: SimulatedStop[],
    metrics: RouteMetrics,
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Check vehicle availability
    if (vehicle.status === VehicleStatus.MAINTENANCE ||
        vehicle.status === VehicleStatus.OUT_OF_SERVICE) {
      violations.push({
        type: 'VEHICLE_UNAVAILABLE',
        severity: 'ERROR',
        message: `Fahrzeug ${vehicle.licensePlate} ist nicht verfügbar (${vehicle.status})`,
      });
    }

    // Check time windows
    for (let i = 0; i < simulatedStops.length; i++) {
      if (!simulatedStops[i].isWithinTimeWindow && inputStops[i].timeWindow) {
        violations.push({
          type: 'TIME_WINDOW',
          severity: 'WARNING',
          message: `Stopp ${i + 1} (${simulatedStops[i].address}): Ankunft ${simulatedStops[i].arrivalTime} außerhalb Zeitfenster ${inputStops[i].timeWindow!.start}-${inputStops[i].timeWindow!.end}`,
          stopIndex: i,
        });
      }
    }

    // Check driver hours (EU regulation: max 9h driving)
    if (metrics.totalTime > 540) { // 9 hours
      violations.push({
        type: 'DRIVER_HOURS',
        severity: 'ERROR',
        message: `Routenzeit ${Math.round(metrics.totalTime / 60)}h überschreitet maximale Lenkzeit von 9h`,
      });
    } else if (metrics.totalTime > 480) { // 8 hours warning
      violations.push({
        type: 'DRIVER_HOURS',
        severity: 'WARNING',
        message: `Routenzeit ${Math.round(metrics.totalTime / 60)}h nähert sich der Grenze`,
      });
    }

    // Check capacity (placeholder - would need actual parcel counts)
    const totalParcels = inputStops.reduce((sum, s) => sum + (s.parcelCount || 1), 0);
    const vehicleCapacity = 100; // Would come from vehicle specs
    if (totalParcels > vehicleCapacity) {
      violations.push({
        type: 'CAPACITY',
        severity: 'ERROR',
        message: `Paketanzahl ${totalParcels} überschreitet Kapazität ${vehicleCapacity}`,
      });
    }

    // Check weight
    const totalWeight = inputStops.reduce((sum, s) => sum + (s.weight || 5), 0);
    const maxWeight = 1500; // kg, would come from vehicle specs
    if (totalWeight > maxWeight) {
      violations.push({
        type: 'WEIGHT',
        severity: 'ERROR',
        message: `Gesamtgewicht ${totalWeight}kg überschreitet Maximum ${maxWeight}kg`,
      });
    }

    return violations;
  }

  private applyModifications(
    stops: SimulationStop[],
    modifications: ScenarioModification[],
  ): SimulationStop[] {
    let result = [...stops];

    for (const mod of modifications) {
      switch (mod.type) {
        case 'ADD_STOP':
          const insertIndex = mod.data.afterIndex ?? result.length;
          result.splice(insertIndex, 0, mod.data.stop);
          break;
        case 'REMOVE_STOP':
          result = result.filter((_, i) => i !== mod.data.stopIndex);
          break;
        case 'REORDER_STOPS':
          if (mod.data.newOrder) {
            const reordered: SimulationStop[] = [];
            for (const idx of mod.data.newOrder) {
              if (result[idx]) reordered.push(result[idx]);
            }
            result = reordered;
          }
          break;
      }
    }

    return result;
  }

  private estimateDistance(from: SimulationStop | null, to: SimulationStop): number {
    // Simple distance estimation based on different cities/areas
    // In production, would use actual coordinates or routing API
    if (!from) return 5; // Distance from depot

    if (from.city !== to.city) {
      return 15 + Math.random() * 10; // Different cities
    }

    if (from.postalCode !== to.postalCode) {
      return 3 + Math.random() * 5; // Different postal codes
    }

    return 0.5 + Math.random() * 2; // Same area
  }

  private estimateTravelTime(distance: number, currentMinutes: number): number {
    // Get speed based on time of day
    const hour = Math.floor(currentMinutes / 60);
    let speed: number;

    if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 19)) {
      speed = this.SPEED_PROFILES.RUSH_HOUR;
    } else if (hour >= 10 && hour < 16) {
      speed = this.SPEED_PROFILES.NORMAL;
    } else {
      speed = this.SPEED_PROFILES.OFF_PEAK;
    }

    return (distance / speed) * 60; // Convert to minutes
  }

  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = Math.round(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
