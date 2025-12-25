import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Route Optimization Service
 * AI-powered route optimization for delivery fleet
 * Uses nearest-neighbor heuristic + 2-opt improvement
 */
@Injectable()
export class RouteOptimizationService {
  private readonly logger = new Logger(RouteOptimizationService.name);

  // Munich area coordinates for distance calculations
  private readonly EARTH_RADIUS_KM = 6371;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Optimize a delivery route using AI algorithms
   * Returns reordered stops with estimated savings
   */
  async optimizeRoute(
    routeId: string,
    options: OptimizeRouteOptions = {},
  ): Promise<RouteOptimizationResult> {
    this.logger.log(`Optimizing route ${routeId}`);

    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: {
          where: { status: 'PENDING' },
          orderBy: { stopOrder: 'asc' },
        },
        vehicle: true,
      },
    });

    if (!route) {
      throw new NotFoundException(`Route ${routeId} not found`);
    }

    if (route.stops.length < 2) {
      return {
        routeId,
        originalOrder: route.stops.map(s => s.id),
        optimizedOrder: route.stops.map(s => s.id),
        distanceSavedKm: 0,
        timeSavedMinutes: 0,
        fuelSavedLiters: 0,
        applied: false,
        algorithm: 'none',
        message: 'Route has fewer than 2 pending stops, no optimization needed',
      };
    }

    // Extract stop coordinates
    // Priority is inferred from parcel count (more parcels = higher priority)
    const stops: StopLocation[] = route.stops.map(s => ({
      id: s.id,
      lat: s.latitude?.toNumber() || 0,
      lng: s.longitude?.toNumber() || 0,
      priority: s.parcelCount > 5 ? 'HIGH' : 'NORMAL',
      timeWindow: s.estimatedArrival ? {
        start: s.estimatedArrival,
        end: new Date(s.estimatedArrival.getTime() + 2 * 60 * 60 * 1000), // 2hr window
      } : undefined,
    }));

    // Get depot location (start point) - default to Munich center
    // In production, this would come from organization settings or vehicle's home base
    const depot: StopLocation = {
      id: 'depot',
      lat: 48.1351, // Munich center default
      lng: 11.5820,
      priority: 'NORMAL',
    };

    // Calculate original distance
    const originalDistance = this.calculateTotalDistance([depot, ...stops, depot]);

    // Apply optimization algorithm
    let optimizedStops: StopLocation[];
    let algorithm: string;

    if (options.algorithm === 'genetic') {
      optimizedStops = this.geneticAlgorithm(stops, depot, options);
      algorithm = 'genetic';
    } else if (options.algorithm === 'simulated_annealing') {
      optimizedStops = this.simulatedAnnealing(stops, depot, options);
      algorithm = 'simulated_annealing';
    } else {
      // Default: Nearest neighbor + 2-opt improvement
      optimizedStops = this.nearestNeighbor(stops, depot);
      optimizedStops = this.twoOptImprovement(optimizedStops, depot);
      algorithm = 'nearest_neighbor_2opt';
    }

    // Apply priority constraints (urgent deliveries first)
    optimizedStops = this.applyPriorityConstraints(optimizedStops);

    // Calculate optimized distance
    const optimizedDistance = this.calculateTotalDistance([depot, ...optimizedStops, depot]);

    // Calculate savings
    const distanceSavedKm = Math.max(0, originalDistance - optimizedDistance);
    const timeSavedMinutes = distanceSavedKm * 2; // Approx 2 min per km in city
    const fuelSavedLiters = distanceSavedKm * 0.12; // Approx 12L/100km for delivery van

    const result: RouteOptimizationResult = {
      routeId,
      originalOrder: stops.map(s => s.id),
      optimizedOrder: optimizedStops.map(s => s.id),
      distanceSavedKm: Math.round(distanceSavedKm * 100) / 100,
      timeSavedMinutes: Math.round(timeSavedMinutes),
      fuelSavedLiters: Math.round(fuelSavedLiters * 100) / 100,
      applied: false,
      algorithm,
      originalDistanceKm: Math.round(originalDistance * 100) / 100,
      optimizedDistanceKm: Math.round(optimizedDistance * 100) / 100,
      improvementPercent: originalDistance > 0
        ? Math.round((distanceSavedKm / originalDistance) * 10000) / 100
        : 0,
    };

    // Auto-apply if requested and savings are significant (>5%)
    if (options.autoApply && (result.improvementPercent || 0) >= 5) {
      await this.applyOptimization(routeId, optimizedStops);
      result.applied = true;
      result.message = `Route optimized with ${result.improvementPercent}% improvement`;
    } else if (options.autoApply) {
      result.message = `Optimization available (${result.improvementPercent}% improvement) but below threshold`;
    }

    this.logger.log(`Route ${routeId} optimized: ${result.improvementPercent}% improvement`);
    return result;
  }

  /**
   * Apply optimization to database
   */
  async applyOptimization(routeId: string, optimizedStops: StopLocation[]): Promise<void> {
    // Update stop order in database
    await this.prisma.$transaction(
      optimizedStops.map((stop, index) =>
        this.prisma.deliveryStop.update({
          where: { id: stop.id },
          data: { stopOrder: index + 1 },
        }),
      ),
    );

    this.logger.log(`Applied optimization to route ${routeId}`);
  }

  /**
   * Batch optimize all pending routes for a user
   */
  async optimizeAllRoutes(
    userId: string,
    options: OptimizeRouteOptions = {},
  ): Promise<BatchOptimizationResult> {
    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        userId,
        status: 'PLANNED',
        routeDate: { gte: new Date() },
      },
      select: { id: true },
    });

    const results: RouteOptimizationResult[] = [];
    let totalDistanceSaved = 0;
    let totalTimeSaved = 0;
    let totalFuelSaved = 0;

    for (const route of routes) {
      try {
        const result = await this.optimizeRoute(route.id, options);
        results.push(result);
        totalDistanceSaved += result.distanceSavedKm;
        totalTimeSaved += result.timeSavedMinutes;
        totalFuelSaved += result.fuelSavedLiters;
      } catch (error) {
        this.logger.warn(`Failed to optimize route ${route.id}: ${error.message}`);
      }
    }

    return {
      routesOptimized: results.length,
      totalDistanceSavedKm: Math.round(totalDistanceSaved * 100) / 100,
      totalTimeSavedMinutes: Math.round(totalTimeSaved),
      totalFuelSavedLiters: Math.round(totalFuelSaved * 100) / 100,
      estimatedCostSavingsEur: Math.round(totalFuelSaved * 1.50 * 100) / 100, // ~1.50 EUR/L diesel
      results,
    };
  }

  // =================== OPTIMIZATION ALGORITHMS ===================

  /**
   * Nearest Neighbor Algorithm
   * Greedy approach: always go to the closest unvisited stop
   */
  private nearestNeighbor(stops: StopLocation[], depot: StopLocation): StopLocation[] {
    const unvisited = [...stops];
    const route: StopLocation[] = [];
    let current = depot;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = this.haversineDistance(current, unvisited[i]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      current = unvisited[nearestIdx];
      route.push(current);
      unvisited.splice(nearestIdx, 1);
    }

    return route;
  }

  /**
   * 2-Opt Improvement
   * Iteratively remove crossing edges by reversing segments
   */
  private twoOptImprovement(stops: StopLocation[], depot: StopLocation): StopLocation[] {
    let route = [...stops];
    let improved = true;
    let iterations = 0;
    const maxIterations = 1000;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 0; i < route.length - 1; i++) {
        for (let j = i + 2; j < route.length; j++) {
          const newRoute = this.twoOptSwap(route, i, j);
          const currentDist = this.calculateTotalDistance([depot, ...route, depot]);
          const newDist = this.calculateTotalDistance([depot, ...newRoute, depot]);

          if (newDist < currentDist) {
            route = newRoute;
            improved = true;
          }
        }
      }
    }

    return route;
  }

  private twoOptSwap(route: StopLocation[], i: number, j: number): StopLocation[] {
    const newRoute = [...route.slice(0, i + 1)];
    for (let k = j; k > i; k--) {
      newRoute.push(route[k]);
    }
    newRoute.push(...route.slice(j + 1));
    return newRoute;
  }

  /**
   * Genetic Algorithm (for complex routes)
   */
  private geneticAlgorithm(
    stops: StopLocation[],
    depot: StopLocation,
    options: OptimizeRouteOptions,
  ): StopLocation[] {
    const populationSize = options.populationSize || 50;
    const generations = options.generations || 100;
    const mutationRate = options.mutationRate || 0.1;

    // Initialize population with random permutations
    let population = this.initializePopulation(stops, populationSize);

    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness (shorter = better)
      const fitness = population.map(route => ({
        route,
        fitness: 1 / this.calculateTotalDistance([depot, ...route, depot]),
      }));

      // Sort by fitness (descending)
      fitness.sort((a, b) => b.fitness - a.fitness);

      // Select top 50% as parents
      const parents = fitness.slice(0, Math.floor(populationSize / 2)).map(f => f.route);

      // Create new population
      const newPopulation: StopLocation[][] = [...parents];

      while (newPopulation.length < populationSize) {
        const parent1 = parents[Math.floor(Math.random() * parents.length)];
        const parent2 = parents[Math.floor(Math.random() * parents.length)];
        let child = this.crossover(parent1, parent2);

        if (Math.random() < mutationRate) {
          child = this.mutate(child);
        }

        newPopulation.push(child);
      }

      population = newPopulation;
    }

    // Return best route
    return population.reduce((best, current) =>
      this.calculateTotalDistance([depot, ...current, depot]) <
      this.calculateTotalDistance([depot, ...best, depot])
        ? current
        : best,
    );
  }

  /**
   * Simulated Annealing
   */
  private simulatedAnnealing(
    stops: StopLocation[],
    depot: StopLocation,
    options: OptimizeRouteOptions,
  ): StopLocation[] {
    let current = this.nearestNeighbor(stops, depot);
    let best = [...current];
    let temperature = options.initialTemperature || 10000;
    const coolingRate = options.coolingRate || 0.995;
    const minTemperature = 1;

    while (temperature > minTemperature) {
      // Generate neighbor by swapping two random stops
      const neighbor = [...current];
      const i = Math.floor(Math.random() * neighbor.length);
      const j = Math.floor(Math.random() * neighbor.length);
      [neighbor[i], neighbor[j]] = [neighbor[j], neighbor[i]];

      const currentDist = this.calculateTotalDistance([depot, ...current, depot]);
      const neighborDist = this.calculateTotalDistance([depot, ...neighbor, depot]);
      const delta = neighborDist - currentDist;

      // Accept if better, or probabilistically if worse
      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        current = neighbor;
        if (neighborDist < this.calculateTotalDistance([depot, ...best, depot])) {
          best = [...neighbor];
        }
      }

      temperature *= coolingRate;
    }

    return best;
  }

  // =================== HELPER METHODS ===================

  private initializePopulation(stops: StopLocation[], size: number): StopLocation[][] {
    const population: StopLocation[][] = [];
    for (let i = 0; i < size; i++) {
      population.push(this.shuffleArray([...stops]));
    }
    return population;
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private crossover(parent1: StopLocation[], parent2: StopLocation[]): StopLocation[] {
    // Order Crossover (OX)
    const start = Math.floor(Math.random() * parent1.length);
    const end = Math.floor(Math.random() * (parent1.length - start)) + start;

    const child: (StopLocation | null)[] = new Array(parent1.length).fill(null);

    // Copy segment from parent1
    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
    }

    // Fill remaining from parent2
    let j = 0;
    for (let i = 0; i < parent1.length; i++) {
      if (child[i] === null) {
        while (child.some(c => c?.id === parent2[j].id)) {
          j++;
        }
        child[i] = parent2[j];
        j++;
      }
    }

    return child as StopLocation[];
  }

  private mutate(route: StopLocation[]): StopLocation[] {
    const mutated = [...route];
    const i = Math.floor(Math.random() * mutated.length);
    const j = Math.floor(Math.random() * mutated.length);
    [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
    return mutated;
  }

  private applyPriorityConstraints(stops: StopLocation[]): StopLocation[] {
    // Move URGENT priority stops to the beginning
    const urgent = stops.filter(s => s.priority === 'URGENT');
    const normal = stops.filter(s => s.priority !== 'URGENT');
    return [...urgent, ...normal];
  }

  /**
   * Haversine distance between two points (in km)
   */
  private haversineDistance(a: StopLocation, b: StopLocation): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);

    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return 2 * this.EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  }

  private calculateTotalDistance(stops: StopLocation[]): number {
    let total = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      total += this.haversineDistance(stops[i], stops[i + 1]);
    }
    return total;
  }

  /**
   * Estimate route with traffic patterns (Munich)
   */
  async estimateRouteWithTraffic(
    routeId: string,
    departureTime: Date,
  ): Promise<TrafficEstimate> {
    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: { stops: { orderBy: { stopOrder: 'asc' } } },
    });

    if (!route) {
      throw new NotFoundException(`Route ${routeId} not found`);
    }

    // Munich traffic multipliers by hour
    const trafficMultipliers: Record<number, number> = {
      6: 1.2, 7: 1.5, 8: 1.8, 9: 1.4, // Morning rush
      10: 1.1, 11: 1.0, 12: 1.1, 13: 1.0, 14: 1.0,
      15: 1.1, 16: 1.4, 17: 1.7, 18: 1.5, 19: 1.2, // Evening rush
      20: 1.0, 21: 1.0, 22: 1.0,
    };

    const hour = departureTime.getHours();
    const multiplier = trafficMultipliers[hour] || 1.0;

    // Calculate base time (assume 30 km/h average in city)
    const stops = route.stops.map(s => ({
      id: s.id,
      lat: s.latitude?.toNumber() || 0,
      lng: s.longitude?.toNumber() || 0,
      priority: 'NORMAL' as const,
    }));

    // Default Munich depot location
    const depot = {
      id: 'depot',
      lat: 48.1351,
      lng: 11.5820,
      priority: 'NORMAL' as const,
    };

    const totalDistance = this.calculateTotalDistance([depot, ...stops, depot]);
    const baseTimeMinutes = (totalDistance / 30) * 60; // 30 km/h base speed
    const estimatedTimeMinutes = baseTimeMinutes * multiplier;

    // Add service time per stop (5 min average)
    const serviceTime = stops.length * 5;

    return {
      routeId,
      departureTime,
      totalDistanceKm: Math.round(totalDistance * 100) / 100,
      baseTimeMinutes: Math.round(baseTimeMinutes),
      trafficMultiplier: multiplier,
      estimatedTimeMinutes: Math.round(estimatedTimeMinutes + serviceTime),
      estimatedArrivalTime: new Date(
        departureTime.getTime() + (estimatedTimeMinutes + serviceTime) * 60 * 1000,
      ),
      trafficLevel: multiplier >= 1.5 ? 'HEAVY' : multiplier >= 1.2 ? 'MODERATE' : 'LIGHT',
    };
  }
}

// =================== TYPES ===================

interface StopLocation {
  id: string;
  lat: number;
  lng: number;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  timeWindow?: {
    start: Date;
    end: Date;
  };
}

interface OptimizeRouteOptions {
  algorithm?: 'nearest_neighbor_2opt' | 'genetic' | 'simulated_annealing';
  autoApply?: boolean;
  populationSize?: number;
  generations?: number;
  mutationRate?: number;
  initialTemperature?: number;
  coolingRate?: number;
}

interface RouteOptimizationResult {
  routeId: string;
  originalOrder: string[];
  optimizedOrder: string[];
  distanceSavedKm: number;
  timeSavedMinutes: number;
  fuelSavedLiters: number;
  applied: boolean;
  algorithm: string;
  originalDistanceKm?: number;
  optimizedDistanceKm?: number;
  improvementPercent?: number;
  message?: string;
}

interface BatchOptimizationResult {
  routesOptimized: number;
  totalDistanceSavedKm: number;
  totalTimeSavedMinutes: number;
  totalFuelSavedLiters: number;
  estimatedCostSavingsEur: number;
  results: RouteOptimizationResult[];
}

interface TrafficEstimate {
  routeId: string;
  departureTime: Date;
  totalDistanceKm: number;
  baseTimeMinutes: number;
  trafficMultiplier: number;
  estimatedTimeMinutes: number;
  estimatedArrivalTime: Date;
  trafficLevel: 'LIGHT' | 'MODERATE' | 'HEAVY';
}

export {
  RouteOptimizationResult,
  BatchOptimizationResult,
  TrafficEstimate,
  OptimizeRouteOptions,
};
