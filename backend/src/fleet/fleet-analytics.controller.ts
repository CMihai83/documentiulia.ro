import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FleetAnalyticsService } from './fleet-analytics.service';

@ApiTags('Fleet Analytics')
@Controller('fleet/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FleetAnalyticsController {
  constructor(private readonly analyticsService: FleetAnalyticsService) {}

  // =================== DELIVERY KPIs ===================

  @Get('delivery/on-time-rate')
  @ApiOperation({
    summary: 'Get on-time delivery rate',
    description: 'Get percentage of deliveries completed on time / Procentul livrarilor efectuate la timp',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'On-time delivery statistics' })
  async getOnTimeDeliveryRate(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.analyticsService.getOnTimeDeliveryRate(
      req.user.sub,
      { from: new Date(from), to: new Date(to) },
    );
    return { success: true, data };
  }

  @Get('delivery/success-rate')
  @ApiOperation({
    summary: 'Get delivery success rate',
    description: 'Get percentage of successful deliveries / Procentul livrarilor de succes',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'Delivery success statistics' })
  async getDeliverySuccessRate(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.analyticsService.getDeliverySuccessRate(
      req.user.sub,
      { from: new Date(from), to: new Date(to) },
    );
    return { success: true, data };
  }

  @Get('delivery/first-attempt-rate')
  @ApiOperation({
    summary: 'Get first attempt delivery rate',
    description: 'Get percentage of deliveries completed on first attempt / Procentul livrarilor la prima incercare',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'First attempt delivery statistics' })
  async getFirstAttemptRate(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.analyticsService.getFirstAttemptRate(
      req.user.sub,
      { from: new Date(from), to: new Date(to) },
    );
    return { success: true, data };
  }

  // =================== FLEET EFFICIENCY KPIs ===================

  @Get('fuel/efficiency')
  @ApiOperation({
    summary: 'Get fuel efficiency per vehicle',
    description: 'Get fuel consumption and cost per kilometer / Consum si cost per kilometru',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'Fuel efficiency by vehicle' })
  async getFuelEfficiency(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.analyticsService.getFuelEfficiency(
      req.user.sub,
      { from: new Date(from), to: new Date(to) },
    );
    return { success: true, data };
  }

  @Get('vehicle/utilization')
  @ApiOperation({
    summary: 'Get vehicle utilization rate',
    description: 'Get percentage of working days each vehicle was used / Procentul zilelor in care fiecare vehicul a fost utilizat',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'Vehicle utilization statistics' })
  async getVehicleUtilization(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.analyticsService.getVehicleUtilization(
      req.user.sub,
      { from: new Date(from), to: new Date(to) },
    );
    return { success: true, data };
  }

  // =================== DRIVER PERFORMANCE KPIs ===================

  @Get('driver/performance')
  @ApiOperation({
    summary: 'Get driver performance metrics',
    description: 'Get delivery success and on-time rates by driver / Performanta soferilor',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'Driver performance statistics' })
  async getDriverPerformance(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.analyticsService.getDriverPerformance(
      req.user.sub,
      { from: new Date(from), to: new Date(to) },
    );
    return { success: true, data };
  }

  @Get('driver/hours')
  @ApiOperation({
    summary: 'Get driver hours summary',
    description: 'Get working hours and overtime by driver / Ore lucrate si suplimentare per sofer',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'Driver hours statistics' })
  async getDriverHoursSummary(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.analyticsService.getDriverHoursSummary(
      req.user.sub,
      { from: new Date(from), to: new Date(to) },
    );
    return { success: true, data };
  }

  // =================== COST ANALYSIS KPIs ===================

  @Get('costs/operating')
  @ApiOperation({
    summary: 'Get fleet operating costs',
    description: 'Get total fuel, maintenance, lease, and insurance costs / Costuri totale de operare',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'Fleet operating cost breakdown' })
  async getFleetOperatingCosts(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.analyticsService.getFleetOperatingCosts(
      req.user.sub,
      { from: new Date(from), to: new Date(to) },
    );
    return { success: true, data };
  }

  @Get('costs/per-delivery')
  @ApiOperation({
    summary: 'Get cost per delivery',
    description: 'Get average cost per successful delivery / Cost mediu per livrare',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'Cost per delivery statistics' })
  async getCostPerDelivery(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const data = await this.analyticsService.getCostPerDelivery(
      req.user.sub,
      { from: new Date(from), to: new Date(to) },
    );
    return { success: true, data };
  }

  // =================== TREND ANALYSIS ===================

  @Get('trends/daily')
  @ApiOperation({
    summary: 'Get daily delivery trend',
    description: 'Get daily delivery counts and success rates / Tendinta zilnica a livrarilor',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default 30)' })
  @ApiResponse({ status: 200, description: 'Daily delivery trend' })
  async getDailyDeliveryTrend(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    const data = await this.analyticsService.getDailyDeliveryTrend(
      req.user.sub,
      days ? parseInt(days) : 30,
    );
    return { success: true, data };
  }

  // =================== SUMMARY ENDPOINTS ===================

  @Get('summary')
  @ApiOperation({
    summary: 'Get fleet analytics summary',
    description: 'Get all key fleet KPIs in one call / Toate KPI-urile importante intr-un singur apel',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO)' })
  @ApiResponse({ status: 200, description: 'Fleet analytics summary' })
  async getFleetSummary(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const period = { from: new Date(from), to: new Date(to) };
    const userId = req.user.sub;

    const [
      onTimeRate,
      successRate,
      fuelEfficiency,
      vehicleUtilization,
      operatingCosts,
      dailyTrend,
    ] = await Promise.all([
      this.analyticsService.getOnTimeDeliveryRate(userId, period),
      this.analyticsService.getDeliverySuccessRate(userId, period),
      this.analyticsService.getFuelEfficiency(userId, period),
      this.analyticsService.getVehicleUtilization(userId, period),
      this.analyticsService.getFleetOperatingCosts(userId, period),
      this.analyticsService.getDailyDeliveryTrend(userId, 7),
    ]);

    return {
      success: true,
      data: {
        delivery: {
          onTimeRate: onTimeRate.onTimeRate,
          successRate: successRate.successRate,
          totalDeliveries: successRate.total,
        },
        fleet: {
          avgUtilization: vehicleUtilization.fleetAverage.avgUtilizationRate,
          avgFuelPerKm: fuelEfficiency.fleetAverage.avgLitersPerKm,
          vehicleCount: operatingCosts.vehicleCount,
        },
        costs: {
          total: operatingCosts.total,
          fuel: operatingCosts.fuel,
          maintenance: operatingCosts.maintenance,
        },
        trend: dailyTrend.trend.slice(-7),
        period,
      },
    };
  }

  @Get('config/kpi-types')
  @ApiOperation({
    summary: 'Get available KPI types',
    description: 'Get list of available fleet KPIs / Lista KPI-urilor de flota disponibile',
  })
  getKpiTypes() {
    return {
      success: true,
      data: [
        { value: 'on-time-rate', label: 'On-Time Delivery Rate', labelRo: 'Rata Livrari La Timp', category: 'delivery' },
        { value: 'success-rate', label: 'Delivery Success Rate', labelRo: 'Rata Succes Livrari', category: 'delivery' },
        { value: 'first-attempt-rate', label: 'First Attempt Rate', labelRo: 'Rata Prima Incercare', category: 'delivery' },
        { value: 'fuel-efficiency', label: 'Fuel Efficiency', labelRo: 'Eficienta Combustibil', category: 'efficiency' },
        { value: 'vehicle-utilization', label: 'Vehicle Utilization', labelRo: 'Utilizare Vehicule', category: 'efficiency' },
        { value: 'driver-performance', label: 'Driver Performance', labelRo: 'Performanta Soferi', category: 'drivers' },
        { value: 'operating-costs', label: 'Operating Costs', labelRo: 'Costuri Operationale', category: 'costs' },
        { value: 'cost-per-delivery', label: 'Cost Per Delivery', labelRo: 'Cost Per Livrare', category: 'costs' },
      ],
    };
  }
}
