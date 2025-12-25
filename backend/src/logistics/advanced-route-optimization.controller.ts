import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  AdvancedRouteOptimizationService,
  RouteRequest,
  OptimizationOptions,
  Location,
  DeliveryStop,
  Vehicle,
} from './advanced-route-optimization.service';

// Advanced Route Optimization Controller
// AI-powered route optimization with Google Maps, traffic, time windows

@Controller('logistics/route-optimization')
@UseGuards(ThrottlerGuard)
export class AdvancedRouteOptimizationController {
  constructor(
    private readonly routeOptimizationService: AdvancedRouteOptimizationService,
  ) {}

  // =================== ROUTE OPTIMIZATION ===================

  @Post('optimize')
  async optimizeRoutes(@Body() request: RouteRequest) {
    return this.routeOptimizationService.optimizeRoutes(request);
  }

  @Post('optimize/quick')
  async quickOptimize(
    @Body() body: {
      stops: DeliveryStop[];
      depot: Location;
      vehicleCapacityKg?: number;
      departureTime?: string;
    },
  ) {
    // Create a simple vehicle for quick optimization
    const vehicle: Vehicle = {
      id: 'default-vehicle',
      name: 'Vehicul Standard',
      licensePlate: 'B-000-XXX',
      type: 'VAN',
      capacityWeight: body.vehicleCapacityKg || 1500,
      capacityVolume: 10,
      capacityPallets: 4,
      fuelConsumptionL100km: 12,
      costPerKm: 1.5,
      fixedDailyCost: 100,
      skills: [],
      depotId: 'depot',
      depot: body.depot,
      maxWorkingMinutes: 600,
    };

    const request: RouteRequest = {
      stops: body.stops,
      vehicles: [vehicle],
      depot: body.depot,
      departureTime: body.departureTime ? new Date(body.departureTime) : new Date(),
      options: {
        algorithm: 'HYBRID',
        includeTraffic: true,
        respectTimeWindows: true,
      },
    };

    return this.routeOptimizationService.optimizeRoutes(request);
  }

  // =================== TRAFFIC ===================

  @Post('traffic')
  async getTrafficConditions(@Body('locations') locations: Location[]) {
    return this.routeOptimizationService.getTrafficConditions(locations);
  }

  // =================== ETA ===================

  @Post('eta/predict')
  async predictETA(
    @Body('from') from: Location,
    @Body('to') to: Location,
    @Body('departureTime') departureTime?: string,
  ) {
    return this.routeOptimizationService.predictETA(
      from,
      to,
      departureTime ? new Date(departureTime) : new Date(),
    );
  }

  // =================== GOOGLE MAPS ===================

  @Post('google-maps/route')
  async getGoogleMapsRoute(
    @Body('origin') origin: Location,
    @Body('destination') destination: Location,
    @Body('waypoints') waypoints?: Location[],
    @Body('departureTime') departureTime?: string,
  ) {
    return this.routeOptimizationService.getGoogleMapsRoute(
      origin,
      destination,
      waypoints,
      departureTime ? new Date(departureTime) : undefined,
    );
  }
}
