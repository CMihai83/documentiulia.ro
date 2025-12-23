import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RouteOptimizationService, OptimizeRouteOptions } from './route-optimization.service';

@ApiTags('Route Optimization')
@Controller('fleet/routes/optimization')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RouteOptimizationController {
  constructor(private readonly optimizationService: RouteOptimizationService) {}

  // =================== CONFIG ENDPOINTS ===================

  @Get('config/algorithms')
  @ApiOperation({
    summary: 'Get available optimization algorithms',
    description: 'Get list of available route optimization algorithms / Algoritmi de optimizare disponibili',
  })
  getAlgorithms() {
    return {
      success: true,
      data: [
        {
          value: 'nearest_neighbor_2opt',
          label: 'Nearest Neighbor + 2-Opt',
          labelRo: 'Cel Mai Apropiat Vecin + 2-Opt',
          description: 'Fast heuristic algorithm suitable for most routes',
          descriptionRo: 'Algoritm euristic rapid potrivit pentru majoritatea rutelor',
          recommended: true,
        },
        {
          value: 'genetic',
          label: 'Genetic Algorithm',
          labelRo: 'Algoritm Genetic',
          description: 'Evolutionary algorithm for complex routes with many stops',
          descriptionRo: 'Algoritm evolutiv pentru rute complexe cu multe opriri',
          recommended: false,
        },
        {
          value: 'simulated_annealing',
          label: 'Simulated Annealing',
          labelRo: 'Recoacere Simulată',
          description: 'Probabilistic algorithm that avoids local optima',
          descriptionRo: 'Algoritm probabilistic care evită optimele locale',
          recommended: false,
        },
      ],
    };
  }

  @Get('config/traffic-levels')
  @ApiOperation({
    summary: 'Get traffic level definitions',
    description: 'Get traffic level definitions and multipliers / Definițiile nivelurilor de trafic',
  })
  getTrafficLevels() {
    return {
      success: true,
      data: [
        { value: 'LIGHT', label: 'Light Traffic', labelRo: 'Trafic Ușor', multiplier: '1.0-1.2x' },
        { value: 'MODERATE', label: 'Moderate Traffic', labelRo: 'Trafic Moderat', multiplier: '1.2-1.5x' },
        { value: 'HEAVY', label: 'Heavy Traffic', labelRo: 'Trafic Intens', multiplier: '1.5-1.8x' },
      ],
    };
  }

  // =================== SINGLE ROUTE OPTIMIZATION ===================

  @Post('route/:routeId')
  @ApiOperation({
    summary: 'Optimize a single route',
    description: 'Optimize delivery route using AI algorithms / Optimizează ruta de livrare folosind algoritmi AI',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        algorithm: {
          type: 'string',
          enum: ['nearest_neighbor_2opt', 'genetic', 'simulated_annealing'],
          description: 'Algorithm to use (default: nearest_neighbor_2opt)',
        },
        autoApply: {
          type: 'boolean',
          description: 'Automatically apply optimization if improvement >= 5%',
        },
        populationSize: { type: 'number', description: 'For genetic algorithm (default: 50)' },
        generations: { type: 'number', description: 'For genetic algorithm (default: 100)' },
        mutationRate: { type: 'number', description: 'For genetic algorithm (default: 0.1)' },
        initialTemperature: { type: 'number', description: 'For simulated annealing (default: 10000)' },
        coolingRate: { type: 'number', description: 'For simulated annealing (default: 0.995)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Route optimization result' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async optimizeRoute(
    @Param('routeId') routeId: string,
    @Body() options: OptimizeRouteOptions,
  ) {
    const result = await this.optimizationService.optimizeRoute(routeId, options);
    return {
      success: true,
      data: result,
      message: result.applied
        ? `Route optimized and applied / Rută optimizată și aplicată`
        : `Optimization calculated / Optimizare calculată`,
    };
  }

  @Post('route/:routeId/apply')
  @ApiOperation({
    summary: 'Apply optimization to route',
    description: 'Apply a previously calculated optimization / Aplică o optimizare calculată anterior',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        optimizedOrder: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of stop IDs in optimized order',
        },
      },
      required: ['optimizedOrder'],
    },
  })
  @ApiResponse({ status: 200, description: 'Optimization applied' })
  async applyOptimization(
    @Param('routeId') routeId: string,
    @Body() body: { optimizedOrder: string[] },
  ) {
    const stops = body.optimizedOrder.map(id => ({ id, lat: 0, lng: 0, priority: 'NORMAL' as const }));
    await this.optimizationService.applyOptimization(routeId, stops);
    return {
      success: true,
      message: 'Optimization applied successfully / Optimizare aplicată cu succes',
    };
  }

  // =================== BATCH OPTIMIZATION ===================

  @Post('all')
  @ApiOperation({
    summary: 'Optimize all pending routes',
    description: 'Batch optimize all pending routes for the user / Optimizează toate rutele în așteptare',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        algorithm: {
          type: 'string',
          enum: ['nearest_neighbor_2opt', 'genetic', 'simulated_annealing'],
        },
        autoApply: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Batch optimization result' })
  async optimizeAllRoutes(
    @Request() req: any,
    @Body() options: OptimizeRouteOptions,
  ) {
    const result = await this.optimizationService.optimizeAllRoutes(req.user.sub, options);
    return {
      success: true,
      data: result,
      message: `${result.routesOptimized} routes optimized / rute optimizate`,
    };
  }

  // =================== TRAFFIC ESTIMATION ===================

  @Get('route/:routeId/traffic-estimate')
  @ApiOperation({
    summary: 'Get route with traffic estimate',
    description: 'Estimate route duration considering traffic patterns / Estimează durata rutei considerând traficul',
  })
  @ApiQuery({ name: 'departureTime', required: false, description: 'Departure time (ISO format, default: now)' })
  @ApiResponse({ status: 200, description: 'Traffic estimate' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async getTrafficEstimate(
    @Param('routeId') routeId: string,
    @Query('departureTime') departureTime?: string,
  ) {
    const departure = departureTime ? new Date(departureTime) : new Date();
    const estimate = await this.optimizationService.estimateRouteWithTraffic(routeId, departure);
    return {
      success: true,
      data: estimate,
    };
  }

  // =================== QUICK ANALYZE ===================

  @Get('route/:routeId/analyze')
  @ApiOperation({
    summary: 'Analyze route without applying',
    description: 'Analyze potential optimization savings without applying / Analizează economiile potențiale fără a aplica',
  })
  @ApiResponse({ status: 200, description: 'Route analysis' })
  async analyzeRoute(@Param('routeId') routeId: string) {
    const result = await this.optimizationService.optimizeRoute(routeId, { autoApply: false });
    return {
      success: true,
      data: {
        routeId: result.routeId,
        currentDistanceKm: result.originalDistanceKm,
        optimizedDistanceKm: result.optimizedDistanceKm,
        potentialSavings: {
          distanceKm: result.distanceSavedKm,
          timeMinutes: result.timeSavedMinutes,
          fuelLiters: result.fuelSavedLiters,
          fuelCostEur: Math.round(result.fuelSavedLiters * 1.50 * 100) / 100,
        },
        improvementPercent: result.improvementPercent,
        algorithm: result.algorithm,
        recommendation: (result.improvementPercent || 0) >= 5
          ? 'Optimization recommended / Optimizare recomandată'
          : 'Current route is efficient / Ruta curentă este eficientă',
      },
    };
  }
}
