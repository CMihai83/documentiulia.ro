import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { FleetService } from './fleet.service';
import { RouteOptimizationService } from './route-optimization.service';
import { GpsTrackingService, GpsPositionDto, CreateGeofenceDto } from './gps-tracking.service';
import { ReportingService, ExportFormat } from './reporting.service';
import { MaintenanceSchedulingService, MaintenanceType, MaintenancePriority } from './maintenance-scheduling.service';
import { ProofOfDeliveryService } from './proof-of-delivery.service';
import { DriverPerformanceService } from './driver-performance.service';
import { RouteHistoryService } from './route-history.service';
import { FuelCardService, FuelCardProvider, FuelCardStatus } from './fuel-card.service';
import { DeliveryInvoiceService, CreateInvoiceDto, InvoiceStatus } from './delivery-invoice.service';
import { SubcontractorManagementService, SubcontractorStatus } from './subcontractor-management.service';
import { FleetDashboardWidgetsService } from './fleet-dashboard-widgets.service';
import { DispatchAlertsService, AlertType, AlertSeverity, AlertStatus } from './dispatch-alerts.service';
import { FleetKpiAnalyticsService } from './fleet-kpi-analytics.service';
import { ComplianceAuditService, AuditAction, AuditEntity } from './compliance-audit.service';
import { RouteSimulationService, SimulationStop, PlannedRoute } from './route-simulation.service';
import { FleetTenantIsolationService } from './fleet-tenant-isolation.service';
import { FleetFinanceIntegrationService, ExpenseCategory } from './fleet-finance-integration.service';
import { AutomatedInvoicingService, BillingFrequency, PricingModel, VolumeDiscount } from './automated-invoicing.service';
import { GpsTrackingEnhancedService } from './gps-tracking-enhanced.service';
import { FleetReportsExportService, ExtendedExportFormat } from './fleet-reports-export.service';
import { PredictiveMaintenanceService, RiskLevel } from './predictive-maintenance.service';
import { DashboardAnalyticsWidgetsService, TimeRange, WidgetType } from './dashboard-analytics-widgets.service';
import { Tier } from '@prisma/client';
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
  VehicleResponseDto,
  FleetSummaryDto,
  RouteProgressDto,
} from './dto/fleet.dto';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    userId?: string;
    sub?: string;
    role: UserRole;
  };
}

@ApiTags('Fleet Management')
@ApiBearerAuth()
@Controller('fleet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FleetController {
  constructor(
    private readonly fleetService: FleetService,
    private readonly routeOptimizationService: RouteOptimizationService,
    private readonly gpsTrackingService: GpsTrackingService,
    private readonly reportingService: ReportingService,
    private readonly maintenanceSchedulingService: MaintenanceSchedulingService,
    private readonly proofOfDeliveryService: ProofOfDeliveryService,
    private readonly driverPerformanceService: DriverPerformanceService,
    private readonly routeHistoryService: RouteHistoryService,
    private readonly fuelCardService: FuelCardService,
    private readonly deliveryInvoiceService: DeliveryInvoiceService,
    private readonly subcontractorService: SubcontractorManagementService,
    private readonly dashboardWidgetsService: FleetDashboardWidgetsService,
    private readonly dispatchAlertsService: DispatchAlertsService,
    private readonly kpiAnalyticsService: FleetKpiAnalyticsService,
    private readonly complianceAuditService: ComplianceAuditService,
    private readonly routeSimulationService: RouteSimulationService,
    private readonly tenantIsolationService: FleetTenantIsolationService,
    private readonly financeIntegrationService: FleetFinanceIntegrationService,
    private readonly automatedInvoicingService: AutomatedInvoicingService,
    private readonly gpsEnhancedService: GpsTrackingEnhancedService,
    private readonly reportsExportService: FleetReportsExportService,
    private readonly predictiveMaintenanceService: PredictiveMaintenanceService,
    private readonly dashboardAnalyticsService: DashboardAnalyticsWidgetsService,
  ) {}

  private getUserId(req: AuthenticatedRequest): string {
    return req.user?.id || req.user?.userId || req.user?.sub || '';
  }

  // ============== VEHICLES ==============

  @Post('vehicles')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Vehicle created successfully' })
  async createVehicle(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateVehicleDto,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.createVehicle(userId, dto);
  }

  @Get('vehicles')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all vehicles with optional filters' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by vehicle status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by vehicle type' })
  @ApiResponse({ status: HttpStatus.OK, type: [VehicleResponseDto] })
  async getVehicles(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.fleetService.getVehicles(userId);
  }

  @Get('vehicles/:id')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get vehicle by ID with full details' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  async getVehicleById(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.getVehicleById(id, userId);
  }

  @Put('vehicles/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update vehicle details' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  async updateVehicle(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.updateVehicle(id, userId, dto);
  }

  @Put('vehicles/:id/location')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Update vehicle GPS location (from driver app)' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  async updateVehicleLocation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: VehicleLocationUpdateDto,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.updateVehicleLocation(id, userId, dto);
  }

  @Delete('vehicles/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a vehicle (soft delete)' })
  @ApiParam({ name: 'id', description: 'Vehicle ID' })
  async deleteVehicle(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.deleteVehicle(id, userId);
  }

  // ============== DELIVERY ROUTES ==============

  @Post('routes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new delivery route' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Route created successfully' })
  async createRoute(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDeliveryRouteDto,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.createDeliveryRoute(userId, dto);
  }

  @Get('routes')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get delivery routes with optional date filter' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by route date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by route status' })
  async getRoutes(
    @Req() req: AuthenticatedRequest,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.getDeliveryRoutes(userId, { date });
  }

  @Get('routes/:id')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get route by ID with all stops' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  async getRouteById(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.getRouteById(id, userId);
  }

  @Put('routes/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update route details' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  async updateRoute(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryRouteDto,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.updateDeliveryRoute(id, userId, dto);
  }

  @Post('routes/:id/start')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Start a route (driver begins deliveries)' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  async startRoute(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.startRoute(id, userId);
  }

  @Post('routes/:id/complete')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Complete a route (all deliveries finished)' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  async completeRoute(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.completeRoute(id, userId);
  }

  // ============== DELIVERY STOPS ==============

  @Post('stops')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a delivery stop to a route' })
  async addDeliveryStop(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDeliveryStopDto,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.addDeliveryStop(userId, dto);
  }

  @Put('stops/:id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Update delivery stop status (mark delivered, failed, etc.)' })
  @ApiParam({ name: 'id', description: 'Stop ID' })
  async updateDeliveryStop(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStopDto,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.updateDeliveryStop(id, userId, dto);
  }

  // ============== FUEL LOGS ==============

  @Post('fuel')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Log a fuel purchase' })
  async addFuelLog(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFuelLogDto,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.addFuelLog(userId, dto);
  }

  @Get('fuel')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fuel logs for a vehicle' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Vehicle ID' })
  async getFuelLogs(
    @Req() req: AuthenticatedRequest,
    @Query('vehicleId') vehicleId?: string,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.getFuelLogs(userId, vehicleId);
  }

  // ============== MAINTENANCE ==============

  @Post('maintenance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Log vehicle maintenance' })
  async addMaintenanceLog(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateMaintenanceLogDto,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.addMaintenanceLog(userId, dto);
  }

  @Get('maintenance')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get maintenance history for a vehicle' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Vehicle ID' })
  async getMaintenanceLogs(
    @Req() req: AuthenticatedRequest,
    @Query('vehicleId') vehicleId?: string,
  ) {
    const userId = this.getUserId(req);
    return this.fleetService.getMaintenanceLogs(userId, vehicleId);
  }

  // ============== DASHBOARD ==============

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fleet dashboard summary' })
  @ApiResponse({ status: HttpStatus.OK, type: FleetSummaryDto })
  async getFleetSummary(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.fleetService.getFleetSummary(userId);
  }

  @Get('live-tracking')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get live route progress for all active routes' })
  @ApiResponse({ status: HttpStatus.OK, type: [RouteProgressDto] })
  async getLiveRouteProgress(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.fleetService.getLiveRouteProgress(userId);
  }

  // ============== AI ROUTE OPTIMIZATION ==============

  @Post('routes/:id/optimize')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'AI-optimize a delivery route for efficiency' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  @ApiQuery({ name: 'algorithm', required: false, description: 'Algorithm: nearest_neighbor_2opt, genetic, simulated_annealing' })
  @ApiQuery({ name: 'autoApply', required: false, description: 'Auto-apply if improvement > 5%' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route optimization result' })
  async optimizeRoute(
    @Param('id') routeId: string,
    @Query('algorithm') algorithm?: string,
    @Query('autoApply') autoApply?: string,
  ) {
    return this.routeOptimizationService.optimizeRoute(routeId, {
      algorithm: algorithm as any,
      autoApply: autoApply === 'true',
    });
  }

  @Post('routes/:id/optimize/apply')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Apply optimization result to route' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  async applyRouteOptimization(
    @Param('id') routeId: string,
    @Body() body: { optimizedOrder: string[] },
  ) {
    const stops = body.optimizedOrder.map(id => ({ id, lat: 0, lng: 0, priority: 'NORMAL' as const }));
    await this.routeOptimizationService.applyOptimization(routeId, stops);
    return { success: true, message: 'Optimization applied' };
  }

  @Post('optimize-all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Batch optimize all pending routes' })
  @ApiQuery({ name: 'autoApply', required: false, description: 'Auto-apply optimizations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Batch optimization results' })
  async optimizeAllRoutes(
    @Req() req: AuthenticatedRequest,
    @Query('autoApply') autoApply?: string,
  ) {
    const userId = this.getUserId(req);
    return this.routeOptimizationService.optimizeAllRoutes(userId, {
      autoApply: autoApply === 'true',
    });
  }

  @Get('routes/:id/traffic-estimate')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get traffic-adjusted time estimate for a route' })
  @ApiParam({ name: 'id', description: 'Route ID' })
  @ApiQuery({ name: 'departureTime', required: false, description: 'Departure time (ISO format)' })
  async getTrafficEstimate(
    @Param('id') routeId: string,
    @Query('departureTime') departureTime?: string,
  ) {
    const departure = departureTime ? new Date(departureTime) : new Date();
    return this.routeOptimizationService.estimateRouteWithTraffic(routeId, departure);
  }

  // ============== GPS TRACKING ==============

  @Post('gps/position')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Update vehicle GPS position' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Position updated' })
  async updateGpsPosition(@Body() dto: GpsPositionDto) {
    await this.gpsTrackingService.updatePosition(dto);
    return { success: true, message: 'Position updated' };
  }

  @Post('gps/positions/batch')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Batch update GPS positions (for offline sync)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Batch update result' })
  async batchUpdateGpsPositions(@Body() body: { positions: GpsPositionDto[] }) {
    return this.gpsTrackingService.batchUpdatePositions(body.positions);
  }

  @Get('gps/vehicles/:vehicleId/position')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get latest GPS position for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  async getVehiclePosition(@Param('vehicleId') vehicleId: string) {
    const position = await this.gpsTrackingService.getLatestPosition(vehicleId);
    return position || { error: 'No position data available' };
  }

  @Get('gps/vehicles/:vehicleId/history')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get GPS position history for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max records to return' })
  @ApiQuery({ name: 'routeId', required: false, description: 'Filter by route ID' })
  async getPositionHistory(
    @Param('vehicleId') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('routeId') routeId?: string,
  ) {
    return this.gpsTrackingService.getPositionHistory(vehicleId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      routeId,
    });
  }

  @Get('gps/fleet')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get all vehicle positions for the fleet' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet tracking info' })
  async getFleetTracking(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.gpsTrackingService.getAllVehiclePositions(userId);
  }

  @Get('gps/routes/:routeId/track')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get GPS track for a route with stops' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  async getRouteTrack(@Param('routeId') routeId: string) {
    return this.gpsTrackingService.getRouteTrack(routeId);
  }

  @Get('gps/vehicles/:vehicleId/statistics')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get vehicle driving statistics' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  async getVehicleStatistics(
    @Param('vehicleId') vehicleId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.gpsTrackingService.getVehicleStatistics(
      vehicleId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('gps/heatmap')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get fleet activity heatmap data' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  async getFleetHeatmap(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.gpsTrackingService.getFleetHeatmap(userId, new Date(from), new Date(to));
  }

  // ============== GEOFENCING ==============

  @Post('geofences')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a geofence' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Geofence created' })
  async createGeofence(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateGeofenceDto,
  ) {
    const userId = this.getUserId(req);
    return this.gpsTrackingService.createGeofence(userId, dto);
  }

  @Get('geofences')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get all geofences' })
  async getGeofences(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.gpsTrackingService.getGeofences(userId);
  }

  @Post('geofences/munich-zones')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create predefined Munich delivery zones' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Munich zones created' })
  async createMunichZones(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const created = await this.gpsTrackingService.createMunichDeliveryZones(userId);
    return { success: true, zonesCreated: created };
  }

  @Delete('geofences/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a geofence' })
  @ApiParam({ name: 'id', description: 'Geofence ID' })
  async deleteGeofence(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    await this.gpsTrackingService.deleteGeofence(id, userId);
    return { success: true, message: 'Geofence deleted' };
  }

  @Get('geofences/events')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get geofence entry/exit events' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filter by vehicle' })
  @ApiQuery({ name: 'geofenceId', required: false, description: 'Filter by geofence' })
  async getGeofenceEvents(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('geofenceId') geofenceId?: string,
  ) {
    const userId = this.getUserId(req);
    return this.gpsTrackingService.getGeofenceEvents(userId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      vehicleId,
      geofenceId,
    });
  }

  // ============== REPORTS ==============

  @Get('reports/types')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get available report types' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of available report types' })
  async getReportTypes() {
    return this.reportingService.getAvailableReportTypes();
  }

  @Get('reports/generate')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate a report' })
  @ApiQuery({ name: 'type', required: true, description: 'Report type (fleet_performance, fuel_consumption, etc.)' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'format', required: false, description: 'Export format (json, csv, pdf)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Generated report' })
  async generateReport(
    @Req() req: AuthenticatedRequest,
    @Query('type') type: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format?: string,
  ) {
    const userId = this.getUserId(req);
    return this.reportingService.generateReport(
      userId,
      type,
      new Date(from),
      new Date(to),
      (format as ExportFormat) || 'json',
    );
  }

  @Get('reports/fleet-performance')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fleet performance report' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet performance report' })
  async getFleetPerformanceReport(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.reportingService.generateFleetPerformanceReport(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('reports/fuel-consumption')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fuel consumption report' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fuel consumption report' })
  async getFuelConsumptionReport(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.reportingService.generateFuelConsumptionReport(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('reports/vehicle-utilization')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get vehicle utilization report' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle utilization report' })
  async getVehicleUtilizationReport(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.reportingService.generateVehicleUtilizationReport(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('reports/maintenance-cost')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get maintenance cost report' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Maintenance cost report' })
  async getMaintenanceCostReport(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.reportingService.generateMaintenanceCostReport(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('reports/driver-payout')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get driver payout report with German tax calculations' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver payout report' })
  async getDriverPayoutReport(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.reportingService.generateDriverPayoutReport(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('reports/courier-reconciliation')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get DPD/GLS courier reconciliation report' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Courier reconciliation report' })
  async getCourierReconciliationReport(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.reportingService.generateCourierReconciliationReport(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  // ============== MAINTENANCE SCHEDULING ==============

  @Get('maintenance/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get maintenance scheduling summary for fleet' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Maintenance summary with upcoming tasks and alerts' })
  async getMaintenanceSummary(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.maintenanceSchedulingService.getMaintenanceSummary(userId);
  }

  @Get('maintenance/scheduled')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all scheduled maintenance tasks' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filter by vehicle ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (pending, scheduled, completed, overdue)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of scheduled maintenance tasks' })
  async getScheduledMaintenance(
    @Req() req: AuthenticatedRequest,
    @Query('vehicleId') vehicleId?: string,
    @Query('status') status?: string,
  ) {
    const userId = this.getUserId(req);
    return this.maintenanceSchedulingService.getAllScheduledMaintenance(userId, {
      vehicleId,
      status: status as any,
    });
  }

  @Get('maintenance/alerts')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get maintenance alerts for all vehicles' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of maintenance alerts sorted by severity' })
  async getMaintenanceAlerts(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.maintenanceSchedulingService.getMaintenanceAlerts(userId);
  }

  @Post('maintenance/schedule')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Schedule a maintenance task for a vehicle' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Maintenance task scheduled' })
  async scheduleMaintenanceTask(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      vehicleId: string;
      type: MaintenanceType;
      scheduledDate: string;
      priority?: MaintenancePriority;
      estimatedCostEur?: number;
      notes?: string;
      serviceProvider?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.maintenanceSchedulingService.scheduleMaintenanceTask(
      userId,
      body.vehicleId,
      {
        type: body.type,
        scheduledDate: new Date(body.scheduledDate),
        priority: body.priority,
        estimatedCostEur: body.estimatedCostEur,
        notes: body.notes,
        serviceProvider: body.serviceProvider,
      },
    );
  }

  @Put('maintenance/:id/complete')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark a maintenance task as completed' })
  @ApiParam({ name: 'id', description: 'Maintenance task ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Maintenance task completed' })
  async completeMaintenanceTask(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: {
      actualCostEur: number;
      notes?: string;
      odometerReading?: number;
      serviceProvider?: string;
      invoiceNumber?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.maintenanceSchedulingService.completeMaintenanceTask(userId, id, body);
  }

  @Get('maintenance/history')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get maintenance history for a vehicle' })
  @ApiQuery({ name: 'vehicleId', required: true, description: 'Vehicle ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle maintenance history' })
  async getMaintenanceHistory(
    @Req() req: AuthenticatedRequest,
    @Query('vehicleId') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.maintenanceSchedulingService.getMaintenanceHistory(userId, vehicleId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('maintenance/forecast')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get maintenance cost forecast for upcoming months' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to forecast (default: 6)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Maintenance cost forecast' })
  async getMaintenanceForecast(
    @Req() req: AuthenticatedRequest,
    @Query('months') months?: string,
  ) {
    const userId = this.getUserId(req);
    return this.maintenanceSchedulingService.getMaintenanceCostForecast(
      userId,
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get('maintenance/vehicles/:vehicleId/schedule')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get maintenance schedule for a specific vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle maintenance schedule' })
  async getVehicleMaintenanceSchedule(
    @Req() req: AuthenticatedRequest,
    @Param('vehicleId') vehicleId: string,
  ) {
    const userId = this.getUserId(req);
    return this.maintenanceSchedulingService.getVehicleMaintenanceSchedule(userId, vehicleId);
  }

  // ============== PROOF OF DELIVERY ==============

  @Post('pod/signature/:stopId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Capture signature for a delivery stop' })
  @ApiParam({ name: 'stopId', description: 'Delivery stop ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Signature captured successfully' })
  async captureSignature(
    @Param('stopId') stopId: string,
    @Body() body: { signatureBase64: string; signedBy?: string },
  ) {
    return this.proofOfDeliveryService.captureSignature(
      stopId,
      body.signatureBase64,
      body.signedBy,
    );
  }

  @Delete('pod/signature/:stopId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear signature for a delivery stop' })
  @ApiParam({ name: 'stopId', description: 'Delivery stop ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Signature cleared' })
  async clearSignature(@Param('stopId') stopId: string) {
    return this.proofOfDeliveryService.clearSignature(stopId);
  }

  @Post('pod/photo/:stopId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Capture photo proof for a delivery stop' })
  @ApiParam({ name: 'stopId', description: 'Delivery stop ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Photo captured successfully' })
  async capturePhoto(
    @Param('stopId') stopId: string,
    @Body() body: { photoUrl: string; geoLocation?: { latitude: number; longitude: number } },
  ) {
    return this.proofOfDeliveryService.capturePhoto(
      stopId,
      body.photoUrl,
      body.geoLocation,
    );
  }

  @Delete('pod/photo/:stopId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear photo for a delivery stop' })
  @ApiParam({ name: 'stopId', description: 'Delivery stop ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Photo cleared' })
  async clearPhoto(@Param('stopId') stopId: string) {
    return this.proofOfDeliveryService.clearPhoto(stopId);
  }

  @Post('pod/note/:stopId')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Add recipient note for a delivery stop' })
  @ApiParam({ name: 'stopId', description: 'Delivery stop ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Note added successfully' })
  async addRecipientNote(
    @Param('stopId') stopId: string,
    @Body() body: { note: string },
  ) {
    return this.proofOfDeliveryService.addRecipientNote(stopId, body.note);
  }

  @Get('pod/:stopId')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get proof of delivery for a stop' })
  @ApiParam({ name: 'stopId', description: 'Delivery stop ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Proof of delivery data' })
  async getProofOfDelivery(@Param('stopId') stopId: string) {
    return this.proofOfDeliveryService.getProofOfDelivery(stopId);
  }

  @Get('pod/:stopId/document')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate POD document for a stop' })
  @ApiParam({ name: 'stopId', description: 'Delivery stop ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'POD document generated' })
  async generatePODDocument(@Param('stopId') stopId: string) {
    return this.proofOfDeliveryService.generatePODDocument(stopId);
  }

  @Get('pod/route/:routeId/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get POD summary for a route' })
  @ApiParam({ name: 'routeId', description: 'Delivery route ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route POD summary' })
  async getRoutePODSummary(@Param('routeId') routeId: string) {
    return this.proofOfDeliveryService.getRoutePODSummary(routeId);
  }

  @Get('pod/route/:routeId/missing')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get stops missing POD for a route' })
  @ApiParam({ name: 'routeId', description: 'Delivery route ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stops missing POD' })
  async getStopsMissingPOD(@Param('routeId') routeId: string) {
    return this.proofOfDeliveryService.getStopsMissingPOD(routeId);
  }

  @Get('pod/stats')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get POD statistics for a date range' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'POD statistics' })
  async getPODStats(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.proofOfDeliveryService.getPODStats(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  // ============== DRIVER PERFORMANCE ==============

  @Get('performance/driver/:driverId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get performance metrics for a driver' })
  @ApiParam({ name: 'driverId', description: 'Driver/Employee ID' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver performance metrics' })
  async getDriverMetrics(
    @Req() req: AuthenticatedRequest,
    @Param('driverId') driverId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.driverPerformanceService.getDriverMetrics(
      userId,
      driverId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('performance/driver/:driverId/trends')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get daily performance trends for a driver' })
  @ApiParam({ name: 'driverId', description: 'Driver/Employee ID' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver performance trends' })
  async getDriverTrends(
    @Req() req: AuthenticatedRequest,
    @Param('driverId') driverId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.driverPerformanceService.getDriverTrends(
      userId,
      driverId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('performance/rankings')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get driver performance rankings' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of drivers to return (default: 10)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver rankings' })
  async getDriverRankings(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.driverPerformanceService.getDriverRankings(
      userId,
      new Date(from),
      new Date(to),
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('performance/alerts')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get performance alerts for underperforming drivers' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Performance alerts' })
  async getPerformanceAlerts(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.driverPerformanceService.getPerformanceAlerts(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('performance/team')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get team performance summary' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Team performance summary' })
  async getTeamSummary(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.driverPerformanceService.getTeamSummary(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('performance/compare')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Compare two drivers performance' })
  @ApiQuery({ name: 'driverA', required: true, description: 'First driver ID' })
  @ApiQuery({ name: 'driverB', required: true, description: 'Second driver ID' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver comparison' })
  async compareDrivers(
    @Req() req: AuthenticatedRequest,
    @Query('driverA') driverA: string,
    @Query('driverB') driverB: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.driverPerformanceService.compareDrivers(
      userId,
      driverA,
      driverB,
      new Date(from),
      new Date(to),
    );
  }

  // ============== ROUTE HISTORY & REPLAY ==============

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get route history with filters' })
  @ApiQuery({ name: 'driverId', required: false, description: 'Filter by driver ID' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filter by vehicle ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'deliveryZone', required: false, description: 'Filter by delivery zone' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route history with pagination' })
  async getRouteHistory(
    @Req() req: AuthenticatedRequest,
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('status') status?: string,
    @Query('deliveryZone') deliveryZone?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.routeHistoryService.getRouteHistory(
      userId,
      {
        driverId,
        vehicleId,
        status,
        deliveryZone,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      },
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('history/search')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Search routes by query' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default: 10)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Matching routes' })
  async searchRoutes(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.routeHistoryService.searchRoutes(
      userId,
      query,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('history/stats')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get route statistics for a period' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route statistics summary' })
  async getRouteStats(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.routeHistoryService.getRouteStats(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('history/zones')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get delivery zones with route counts' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery zones with stats' })
  async getDeliveryZones(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.routeHistoryService.getDeliveryZones(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('history/:routeId/replay')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get route replay data for visualization' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route replay data' })
  async getRouteReplayData(@Param('routeId') routeId: string) {
    return this.routeHistoryService.getRouteReplayData(routeId);
  }

  @Get('history/:routeId/comparison')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get planned vs actual comparison for a route' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Planned vs actual comparison' })
  async getPlannedVsActual(@Param('routeId') routeId: string) {
    return this.routeHistoryService.getPlannedVsActual(routeId);
  }

  // ============== FUEL CARDS ==============

  @Get('fuel-cards/providers')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get supported fuel card providers (Shell, DKV, UTA, etc.)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of supported providers' })
  async getFuelCardProviders() {
    return this.fuelCardService.getProviders();
  }

  @Post('fuel-cards')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new fuel card' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Fuel card registered' })
  async registerFuelCard(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      cardNumber: string;
      provider: FuelCardProvider;
      vehicleId?: string;
      driverId?: string;
      expiryDate: string;
      monthlyLimit: number;
      pinRequired?: boolean;
    },
  ) {
    const userId = this.getUserId(req);
    return this.fuelCardService.registerCard(userId, {
      ...body,
      expiryDate: new Date(body.expiryDate),
    });
  }

  @Get('fuel-cards')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all fuel cards' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of fuel cards' })
  async getFuelCards(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.fuelCardService.getCards(userId);
  }

  @Get('fuel-cards/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fuel card summary (utilization, limits)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fuel card summary' })
  async getFuelCardSummary(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.fuelCardService.getCardSummary(userId);
  }

  @Get('fuel-cards/alerts')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fuel card alerts (expiring, limits, unusual spending)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fuel alerts' })
  async getFuelAlerts(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.fuelCardService.checkAlerts(userId);
  }

  @Get('fuel-cards/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fuel card by ID' })
  @ApiParam({ name: 'id', description: 'Fuel card ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fuel card details' })
  async getFuelCard(@Param('id') id: string) {
    return this.fuelCardService.getCard(id);
  }

  @Put('fuel-cards/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update fuel card' })
  @ApiParam({ name: 'id', description: 'Fuel card ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fuel card updated' })
  async updateFuelCard(
    @Param('id') id: string,
    @Body() body: {
      vehicleId?: string;
      driverId?: string;
      status?: FuelCardStatus;
      monthlyLimit?: number;
    },
  ) {
    return this.fuelCardService.updateCard(id, body);
  }

  @Post('fuel-cards/:id/block')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Block a fuel card' })
  @ApiParam({ name: 'id', description: 'Fuel card ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fuel card blocked' })
  async blockFuelCard(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.fuelCardService.blockCard(id, body.reason);
  }

  @Post('fuel-cards/:id/transactions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Import fuel transactions for a card' })
  @ApiParam({ name: 'id', description: 'Fuel card ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transactions imported' })
  async importFuelTransactions(
    @Req() req: AuthenticatedRequest,
    @Param('id') cardId: string,
    @Body() body: {
      transactions: Array<{
        transactionDate: string;
        stationName: string;
        stationAddress?: string;
        fuelType: string;
        liters: number;
        pricePerLiter: number;
        odometerReading?: number;
        receiptNumber?: string;
      }>;
    },
  ) {
    const userId = this.getUserId(req);
    const transactions = body.transactions.map(tx => ({
      ...tx,
      transactionDate: new Date(tx.transactionDate),
    }));
    return this.fuelCardService.importTransactions(userId, cardId, transactions);
  }

  @Get('fuel-cards/transactions/recent')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get recent fuel transactions' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filter by vehicle' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max transactions (default: 50)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Recent transactions' })
  async getRecentFuelTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('vehicleId') vehicleId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.fuelCardService.getRecentTransactions(userId, {
      vehicleId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('fuel-cards/analysis')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fuel spending analysis' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Spending analysis' })
  async getFuelSpendingAnalysis(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.fuelCardService.getSpendingAnalysis(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('fuel-cards/efficiency')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fuel efficiency report by vehicle' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Efficiency report' })
  async getFuelEfficiencyReport(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.fuelCardService.getEfficiencyReport(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  // ============== DELIVERY INVOICES ==============

  @Post('invoices')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create invoice from completed routes' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Invoice created' })
  async createInvoice(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInvoiceDto,
  ) {
    const userId = this.getUserId(req);
    return this.deliveryInvoiceService.createInvoiceFromRoutes(userId, dto);
  }

  @Get('invoices')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of invoices' })
  async getInvoices(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.deliveryInvoiceService.getInvoices(userId, {
      status: status as InvoiceStatus,
      customerId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('invoices/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get invoice summary statistics' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice summary' })
  async getInvoiceSummary(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.deliveryInvoiceService.getInvoiceSummary(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('invoices/unbilled-routes')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get unbilled completed routes' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unbilled routes' })
  async getUnbilledRoutes(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.deliveryInvoiceService.getUnbilledRoutes(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('invoices/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice details' })
  async getInvoice(@Param('id') id: string) {
    return this.deliveryInvoiceService.getInvoice(id);
  }

  @Get('invoices/:id/html')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate invoice HTML document' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice HTML' })
  async getInvoiceHtml(@Param('id') id: string) {
    const html = await this.deliveryInvoiceService.generateInvoiceHtml(id);
    return { html };
  }

  @Post('invoices/:id/send')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Mark invoice as sent' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice marked as sent' })
  async markInvoiceSent(@Param('id') id: string) {
    return this.deliveryInvoiceService.markAsSent(id);
  }

  @Post('invoices/:id/pay')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice marked as paid' })
  async markInvoicePaid(@Param('id') id: string) {
    return this.deliveryInvoiceService.markAsPaid(id);
  }

  @Post('invoices/:id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice cancelled' })
  async cancelInvoice(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.deliveryInvoiceService.cancelInvoice(id, body.reason);
  }

  @Get('invoices/customer/:customerId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get invoice history for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Customer invoice history' })
  async getCustomerInvoices(
    @Req() req: AuthenticatedRequest,
    @Param('customerId') customerId: string,
  ) {
    const userId = this.getUserId(req);
    return this.deliveryInvoiceService.getCustomerInvoices(userId, customerId);
  }

  @Post('invoices/check-overdue')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Check and update overdue invoices' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Overdue count' })
  async checkOverdueInvoices(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const overdueCount = await this.deliveryInvoiceService.checkOverdueInvoices(userId);
    return { overdueCount };
  }

  // ============== SUBCONTRACTOR MANAGEMENT ==============

  @Post('subcontractors')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new subcontractor' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Subcontractor registered' })
  async registerSubcontractor(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      companyName: string;
      contactName: string;
      email: string;
      phone: string;
      address: { street: string; postalCode: string; city: string };
      taxId?: string;
      capacity: {
        totalVehicles: number;
        availableVehicles: number;
        totalDrivers: number;
        availableDrivers: number;
        maxDailyRoutes: number;
        maxDailyDeliveries: number;
      };
      rates: {
        perDelivery: number;
        perKilometer: number;
        minimumDaily: number;
        currency: string;
      };
      serviceZones: string[];
    },
  ) {
    const userId = this.getUserId(req);
    return this.subcontractorService.registerSubcontractor(userId, body);
  }

  @Get('subcontractors')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all subcontractors' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'zone', required: false, description: 'Filter by service zone' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of subcontractors' })
  async getSubcontractors(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('zone') zone?: string,
  ) {
    const userId = this.getUserId(req);
    return this.subcontractorService.getSubcontractors(userId, {
      status: status as SubcontractorStatus,
      zone,
    });
  }

  @Get('subcontractors/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get subcontractor summary statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subcontractor summary' })
  async getSubcontractorSummary(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.subcontractorService.getSummary(userId);
  }

  @Get('subcontractors/available')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get available subcontractors for a zone' })
  @ApiQuery({ name: 'zone', required: true, description: 'Delivery zone' })
  @ApiQuery({ name: 'capacity', required: false, description: 'Required capacity (vehicles)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Available subcontractors' })
  async getAvailableSubcontractors(
    @Req() req: AuthenticatedRequest,
    @Query('zone') zone: string,
    @Query('capacity') capacity?: string,
  ) {
    const userId = this.getUserId(req);
    return this.subcontractorService.getAvailableForZone(
      userId,
      zone,
      capacity ? parseInt(capacity, 10) : 1,
    );
  }

  @Get('subcontractors/cost-comparison')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get in-house vs subcontractor cost comparison' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cost comparison' })
  async getCostComparison(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.subcontractorService.getCostComparison(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('subcontractors/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get subcontractor by ID' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subcontractor details' })
  async getSubcontractor(@Param('id') id: string) {
    return this.subcontractorService.getSubcontractor(id);
  }

  @Put('subcontractors/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update subcontractor details' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subcontractor updated' })
  async updateSubcontractor(
    @Param('id') id: string,
    @Body() body: {
      contactName?: string;
      email?: string;
      phone?: string;
      address?: { street: string; postalCode: string; city: string };
      capacity?: {
        totalVehicles: number;
        availableVehicles: number;
        totalDrivers: number;
        availableDrivers: number;
        maxDailyRoutes: number;
        maxDailyDeliveries: number;
      };
      rates?: {
        perDelivery: number;
        perKilometer: number;
        minimumDaily: number;
        currency: string;
      };
      serviceZones?: string[];
    },
  ) {
    return this.subcontractorService.updateSubcontractor(id, body);
  }

  @Post('subcontractors/:id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a pending subcontractor' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subcontractor approved' })
  async approveSubcontractor(
    @Param('id') id: string,
    @Body() body: { contractStart: string; contractEnd: string },
  ) {
    return this.subcontractorService.approveSubcontractor(
      id,
      new Date(body.contractStart),
      new Date(body.contractEnd),
    );
  }

  @Post('subcontractors/:id/suspend')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspend a subcontractor' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subcontractor suspended' })
  async suspendSubcontractor(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.subcontractorService.suspendSubcontractor(id, body.reason);
  }

  @Put('subcontractors/:id/capacity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update subcontractor capacity' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Capacity updated' })
  async updateSubcontractorCapacity(
    @Param('id') id: string,
    @Body() body: {
      totalVehicles?: number;
      availableVehicles?: number;
      totalDrivers?: number;
      availableDrivers?: number;
      maxDailyRoutes?: number;
      maxDailyDeliveries?: number;
    },
  ) {
    return this.subcontractorService.updateCapacity(id, body);
  }

  @Post('subcontractors/:id/rate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Rate a subcontractor' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rating submitted' })
  async rateSubcontractor(
    @Param('id') id: string,
    @Body() body: { rating: number },
  ) {
    return this.subcontractorService.rateSubcontractor(id, body.rating);
  }

  @Get('subcontractors/:id/performance')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get subcontractor performance metrics' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Performance metrics' })
  async getSubcontractorPerformance(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.subcontractorService.getPerformance(
      id,
      new Date(from),
      new Date(to),
    );
  }

  // ============== SUBCONTRACTOR ASSIGNMENTS ==============

  @Post('subcontractors/:id/assign-route')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a route to a subcontractor' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Route assigned' })
  async assignRouteToSubcontractor(
    @Req() req: AuthenticatedRequest,
    @Param('id') subcontractorId: string,
    @Body() body: { routeId: string; agreedRate?: number },
  ) {
    const userId = this.getUserId(req);
    return this.subcontractorService.assignRoute(
      userId,
      subcontractorId,
      body.routeId,
      body.agreedRate,
    );
  }

  @Get('subcontractors/:id/assignments')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get assignments for a subcontractor' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subcontractor assignments' })
  async getSubcontractorAssignments(
    @Param('id') subcontractorId: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.subcontractorService.getSubcontractorAssignments(subcontractorId, {
      status: status as any,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post('assignments/:id/accept')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Accept an assignment (by subcontractor)' })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment accepted' })
  async acceptAssignment(@Param('id') id: string) {
    return this.subcontractorService.acceptAssignment(id);
  }

  @Post('assignments/:id/reject')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Reject an assignment (by subcontractor)' })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment rejected' })
  async rejectAssignment(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.subcontractorService.rejectAssignment(id, body.reason);
  }

  @Post('assignments/:id/start')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Start an assignment' })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment started' })
  async startAssignment(@Param('id') id: string) {
    return this.subcontractorService.startAssignment(id);
  }

  @Post('assignments/:id/complete')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Complete an assignment' })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment completed' })
  async completeAssignment(
    @Param('id') id: string,
    @Body() body: { actualCost?: number },
  ) {
    return this.subcontractorService.completeAssignment(id, body.actualCost);
  }

  @Post('assignments/:id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel an assignment' })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment cancelled' })
  async cancelAssignment(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.subcontractorService.cancelAssignment(id, body.reason);
  }

  // ============== DASHBOARD WIDGETS ==============

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get complete fleet dashboard summary' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard summary with all widgets' })
  async getDashboard(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getDashboardSummary(userId);
  }

  @Get('widgets/active-routes')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get active routes widget data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active routes widget' })
  async getActiveRoutesWidget(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getActiveRoutesWidget(userId);
  }

  @Get('widgets/vehicle-status')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get vehicle status widget data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle status widget' })
  async getVehicleStatusWidget(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getVehicleStatusWidget(userId);
  }

  @Get('widgets/delivery-metrics')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get delivery metrics widget data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery metrics widget' })
  async getDeliveryMetricsWidget(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getDeliveryMetricsWidget(userId);
  }

  @Get('widgets/fuel-efficiency')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fuel efficiency widget data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fuel efficiency widget' })
  async getFuelEfficiencyWidget(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getFuelEfficiencyWidget(userId);
  }

  @Get('widgets/maintenance-alerts')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get maintenance alerts widget data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Maintenance alerts widget' })
  async getMaintenanceAlertsWidget(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getMaintenanceAlertWidget(userId);
  }

  @Get('widgets/driver-performance')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get driver performance widget data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver performance widget' })
  async getDriverPerformanceWidget(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getDriverPerformanceWidget(userId);
  }

  @Get('widgets/recent-activity')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get recent activity widget data' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of activities (default: 10)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Recent activity widget' })
  async getRecentActivityWidget(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getRecentActivityWidget(
      userId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('widgets/daily-trends')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get daily trends widget data (last 7 days)' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 7)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Daily trends widget' })
  async getDailyTrendsWidget(
    @Req() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getDailyTrendsWidget(
      userId,
      days ? parseInt(days, 10) : 7,
    );
  }

  @Get('widgets/zone-performance')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get zone performance widget data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Zone performance widget' })
  async getZonePerformanceWidget(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardWidgetsService.getZonePerformanceWidget(userId);
  }

  // ============== DISPATCH ALERTS ==============

  @Get('alerts/dispatch-dashboard')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get dispatch dashboard with alert overview' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dispatch dashboard data' })
  async getDispatchDashboard(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.getDispatchDashboard(userId);
  }

  @Post('alerts')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Create a new dispatch alert' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Alert created' })
  async createAlert(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      type: AlertType;
      severity: AlertSeverity;
      title: string;
      message: string;
      data?: Record<string, any>;
      vehicleId?: string;
      routeId?: string;
      driverId?: string;
      stopId?: string;
      location?: { lat: number; lng: number };
      expiresInMinutes?: number;
    },
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.createAlert(userId, body);
  }

  @Get('alerts/active')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all active dispatch alerts' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by alert type' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filter by vehicle' })
  @ApiQuery({ name: 'routeId', required: false, description: 'Filter by route' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active alerts' })
  async getActiveAlerts(
    @Req() req: AuthenticatedRequest,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('routeId') routeId?: string,
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.getActiveAlerts(userId, {
      type: type as AlertType,
      severity: severity as AlertSeverity,
      vehicleId,
      routeId,
    });
  }

  @Get('alerts/history')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get alert history' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by alert type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default: 50)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert history' })
  async getAlertHistory(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.getAlertHistory(userId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      type: type as AlertType,
      status: status as AlertStatus,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('alerts/stats')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert statistics' })
  async getAlertStats(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.getAlertStats(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('alerts/:id')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert details' })
  async getAlert(@Param('id') id: string) {
    return this.dispatchAlertsService.getAlert(id);
  }

  @Post('alerts/:id/acknowledge')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.acknowledgeAlert(id, userId);
  }

  @Post('alerts/:id/in-progress')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Mark alert as in progress' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert marked in progress' })
  async markAlertInProgress(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.markInProgress(id, userId);
  }

  @Post('alerts/:id/resolve')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert resolved' })
  async resolveAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { resolutionNote?: string },
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.resolveAlert(id, userId, body.resolutionNote);
  }

  @Post('alerts/:id/dismiss')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Dismiss an alert (false positive)' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert dismissed' })
  async dismissAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.dismissAlert(id, userId, body.reason);
  }

  // ============== ALERT RULES ==============

  @Post('alerts/rules')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create an alert rule' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Alert rule created' })
  async createAlertRule(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      name: string;
      type: AlertType;
      enabled: boolean;
      conditions: {
        threshold?: number;
        duration?: number;
        zones?: string[];
      };
      actions: {
        notify: boolean;
        escalate: boolean;
        autoResolve: boolean;
        escalationDelayMinutes?: number;
      };
    },
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.createAlertRule(userId, body);
  }

  @Get('alerts/rules')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all alert rules' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert rules' })
  async getAlertRules(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.getAlertRules(userId);
  }

  @Put('alerts/rules/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an alert rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert rule updated' })
  async updateAlertRule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      enabled?: boolean;
      conditions?: {
        threshold?: number;
        duration?: number;
        zones?: string[];
      };
      actions?: {
        notify?: boolean;
        escalate?: boolean;
        autoResolve?: boolean;
        escalationDelayMinutes?: number;
      };
    },
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.updateAlertRule(userId, id, body as any);
  }

  @Delete('alerts/rules/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an alert rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert rule deleted' })
  async deleteAlertRule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    await this.dispatchAlertsService.deleteAlertRule(userId, id);
    return { success: true, message: 'Rule deleted' };
  }

  // ============== NOTIFICATION PREFERENCES ==============

  @Get('alerts/preferences')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification preferences' })
  async getNotificationPreferences(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.getNotificationPreferences(userId);
  }

  @Put('alerts/preferences')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Preferences updated' })
  async updateNotificationPreferences(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      channels?: {
        inApp?: boolean;
        email?: boolean;
        sms?: boolean;
        push?: boolean;
      };
      alertTypes?: Partial<Record<AlertType, boolean>>;
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
      };
      escalationEnabled?: boolean;
    },
  ) {
    const userId = this.getUserId(req);
    return this.dispatchAlertsService.updateNotificationPreferences(userId, body as any);
  }

  // ============== AUTOMATED ALERT CHECKS ==============

  @Post('alerts/check-delays')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Check for route delays and create alerts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delay check result' })
  async checkRouteDelays(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const alertsCreated = await this.dispatchAlertsService.checkRouteDelays(userId);
    return { success: true, alertsCreated };
  }

  @Post('alerts/check-failed-deliveries')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Check for failed deliveries and create alerts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Failed delivery check result' })
  async checkFailedDeliveries(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const alertsCreated = await this.dispatchAlertsService.checkFailedDeliveries(userId);
    return { success: true, alertsCreated };
  }

  @Post('alerts/check-maintenance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Check vehicle maintenance status and create alerts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Maintenance check result' })
  async checkMaintenanceAlerts(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const alertsCreated = await this.dispatchAlertsService.checkMaintenanceAlerts(userId);
    return { success: true, alertsCreated };
  }

  // ============== KPI ANALYTICS ==============

  @Get('kpi/dashboard')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get comprehensive KPI dashboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'KPI dashboard data' })
  async getKpiDashboard(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.kpiAnalyticsService.getKpiDashboard(userId);
  }

  @Get('kpi/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fleet KPIs for a period' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet KPIs' })
  async getFleetKpis(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.kpiAnalyticsService.getFleetKpis(userId, new Date(from), new Date(to));
  }

  @Get('kpi/targets')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get KPI targets and current performance' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'KPI targets' })
  async getKpiTargets(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.kpiAnalyticsService.getKpiTargets(userId, new Date(from), new Date(to));
  }

  @Get('kpi/trends')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get KPI trends over time' })
  @ApiQuery({ name: 'kpi', required: true, description: 'KPI name (e.g., onTimeDeliveryRate, costPerDelivery)' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'granularity', required: false, description: 'DAY, WEEK, or MONTH (default: DAY)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'KPI trends' })
  async getKpiTrends(
    @Req() req: AuthenticatedRequest,
    @Query('kpi') kpiName: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('granularity') granularity?: string,
  ) {
    const userId = this.getUserId(req);
    return this.kpiAnalyticsService.getKpiTrends(
      userId,
      kpiName,
      new Date(from),
      new Date(to),
      (granularity as 'DAY' | 'WEEK' | 'MONTH') || 'DAY',
    );
  }

  @Get('kpi/drivers')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get driver KPI details' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of drivers (default: 10)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver KPIs' })
  async getDriverKpis(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.kpiAnalyticsService.getDriverKpiDetails(
      userId,
      new Date(from),
      new Date(to),
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('kpi/vehicles')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get vehicle KPI details' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle KPIs' })
  async getVehicleKpis(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.kpiAnalyticsService.getVehicleKpiDetails(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  @Get('kpi/benchmarks')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get industry benchmark comparisons' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Benchmark comparisons' })
  async getBenchmarks(
    @Req() req: AuthenticatedRequest,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.kpiAnalyticsService.getBenchmarks(
      userId,
      new Date(from),
      new Date(to),
    );
  }

  // ============== COMPLIANCE & AUDIT ==============

  @Get('compliance/status')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get overall compliance status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance status' })
  async getComplianceStatus(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.complianceAuditService.getComplianceStatus(userId);
  }

  @Get('compliance/report')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get comprehensive compliance report' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance report' })
  async getComplianceReport(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.complianceAuditService.getComplianceReport(userId);
  }

  @Post('compliance/check')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Run all compliance checks' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance check results' })
  async runComplianceChecks(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const issues = await this.complianceAuditService.runComplianceChecks(userId);
    return { success: true, issuesFound: issues.length, issues };
  }

  @Get('compliance/issues')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get compliance issues' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance issues' })
  async getComplianceIssues(
    @Req() req: AuthenticatedRequest,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
  ) {
    const userId = this.getUserId(req);
    return this.complianceAuditService.getComplianceIssues(userId, {
      type: type as any,
      severity: severity as any,
      status: status as any,
    });
  }

  @Put('compliance/issues/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update compliance issue status' })
  @ApiParam({ name: 'id', description: 'Issue ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Issue updated' })
  async updateComplianceIssue(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WAIVED'; resolution?: string },
  ) {
    const userId = this.getUserId(req);
    const issue = await this.complianceAuditService.updateIssueStatus(
      userId,
      id,
      body.status,
      body.resolution,
    );
    return issue || { error: 'Issue not found' };
  }

  @Get('compliance/driver-hours')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all drivers hours compliance' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver hours compliance' })
  async getAllDriversHoursCompliance(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.complianceAuditService.getAllDriversHoursCompliance(userId);
  }

  @Get('compliance/driver-hours/:driverId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get specific driver hours compliance' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver hours detail' })
  async getDriverHoursDetail(
    @Req() req: AuthenticatedRequest,
    @Param('driverId') driverId: string,
    @Query('date') date?: string,
  ) {
    const userId = this.getUserId(req);
    return this.complianceAuditService.getDriverHoursDetail(
      userId,
      driverId,
      date ? new Date(date) : undefined,
    );
  }

  @Get('compliance/document-retention')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get document retention status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document retention list' })
  async getDocumentRetention(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.complianceAuditService.getDocumentRetention(userId);
  }

  // ============== AUDIT LOGS ==============

  @Post('audit/log')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Log an audit event' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Audit entry created' })
  async logAudit(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      action: AuditAction;
      entity: AuditEntity;
      entityId: string;
      entityName?: string;
      changes?: { field: string; oldValue: any; newValue: any }[];
      metadata?: Record<string, any>;
    },
  ) {
    const userId = this.getUserId(req);
    return this.complianceAuditService.logAudit(userId, {
      performedBy: userId,
      performerName: (req.user as any)?.name || userId,
      ...body,
    });
  }

  @Get('audit/logs')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action' })
  @ApiQuery({ name: 'entity', required: false, description: 'Filter by entity' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Audit logs' })
  async getAuditLogs(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = this.getUserId(req);
    return this.complianceAuditService.getAuditLogs(userId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      action: action as AuditAction,
      entity: entity as AuditEntity,
      entityId,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('audit/entity/:entity/:entityId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get audit history for specific entity' })
  @ApiParam({ name: 'entity', description: 'Entity type' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Entity audit history' })
  async getEntityHistory(
    @Req() req: AuthenticatedRequest,
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    const userId = this.getUserId(req);
    return this.complianceAuditService.getEntityHistory(
      userId,
      entity as AuditEntity,
      entityId,
    );
  }

  // ============== ROUTE SIMULATION & PLANNING ==============

  @Post('simulation/route')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Simulate a route with given stops and vehicle' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Route simulation result' })
  async simulateRoute(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name?: string;
      vehicleId: string;
      stops: SimulationStop[];
      startTime?: string;
      returnToDepot?: boolean;
      depotAddress?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.routeSimulationService.simulateRoute(userId, body);
  }

  @Get('simulation/:simulationId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get simulation by ID' })
  @ApiParam({ name: 'simulationId', description: 'Simulation ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Simulation details' })
  async getSimulation(@Param('simulationId') simulationId: string) {
    return this.routeSimulationService.getSimulation(simulationId);
  }

  @Post('simulation/compare')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Compare multiple route options' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route comparison result' })
  async compareRoutes(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      simulations: { vehicleId: string; stops: SimulationStop[]; startTime?: string }[];
    },
  ) {
    const userId = this.getUserId(req);
    return this.routeSimulationService.compareRoutes(userId, body.simulations);
  }

  @Post('simulation/scenario')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a what-if scenario' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Scenario created' })
  async createScenario(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      description?: string;
      baseSimulationId?: string;
      modifications: {
        type: 'ADD_STOP' | 'REMOVE_STOP' | 'REORDER_STOPS' | 'CHANGE_VEHICLE' | 'CHANGE_START_TIME';
        data: any;
      }[];
    },
  ) {
    const userId = this.getUserId(req);
    return this.routeSimulationService.createScenario(userId, body);
  }

  @Get('simulation/scenarios')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get scenarios for user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User scenarios' })
  async getScenarios(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.routeSimulationService.getScenarios(userId);
  }

  @Get('simulation/vehicles/available')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get available vehicles for planning' })
  @ApiQuery({ name: 'date', required: true, description: 'Date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Available vehicles' })
  async getAvailableVehicles(
    @Req() req: AuthenticatedRequest,
    @Query('date') date: string,
  ) {
    const userId = this.getUserId(req);
    return this.routeSimulationService.getAvailableVehicles(userId, new Date(date));
  }

  @Post('plans')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a route plan for a future date' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Route plan created' })
  async createRoutePlan(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      planDate: string;
      routes: PlannedRoute[];
    },
  ) {
    const userId = this.getUserId(req);
    return this.routeSimulationService.createRoutePlan(userId, {
      name: body.name,
      planDate: new Date(body.planDate),
      routes: body.routes,
    });
  }

  @Get('plans')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get route plans' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route plans' })
  async getRoutePlans(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.routeSimulationService.getRoutePlans(userId, {
      status: status as 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'CANCELLED',
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
    });
  }

  @Put('plans/:planId/status')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update plan status' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Plan status updated' })
  async updatePlanStatus(
    @Req() req: AuthenticatedRequest,
    @Param('planId') planId: string,
    @Body() body: { status: 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'CANCELLED' },
  ) {
    const userId = this.getUserId(req);
    return this.routeSimulationService.updatePlanStatus(userId, planId, body.status);
  }

  @Get('plans/dashboard')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get planning dashboard summary' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Planning dashboard data' })
  async getPlanningDashboard(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.routeSimulationService.getPlanningDashboard(userId);
  }

  // ============== TENANT ISOLATION ==============

  @Get('tenant/context/:organizationId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fleet tenant context with resource limits' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet tenant context' })
  async getFleetTenantContext(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId') organizationId: string,
  ) {
    const userId = this.getUserId(req);
    return this.tenantIsolationService.getFleetTenantContext(userId, organizationId);
  }

  @Get('tenant/usage')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get tenant usage statistics' })
  @ApiQuery({ name: 'tier', required: false, description: 'Tier (FREE, PRO, BUSINESS, ENTERPRISE)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tenant usage stats' })
  async getTenantUsageStats(
    @Req() req: AuthenticatedRequest,
    @Query('tier') tier?: string,
  ) {
    const userId = this.getUserId(req);
    return this.tenantIsolationService.getTenantUsageStats(
      userId,
      (tier as Tier) || Tier.FREE,
    );
  }

  @Get('tenant/limits/:tier')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get resource limits for a tier' })
  @ApiParam({ name: 'tier', description: 'Tier level' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Resource limits' })
  async getResourceLimits(@Param('tier') tier: string) {
    return this.tenantIsolationService.getResourceLimits(tier as Tier);
  }

  @Post('tenant/access/grant')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Grant cross-tenant access to a resource' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Access granted' })
  async grantCrossTenantAccess(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      sourceOrgId: string;
      targetOrgId: string;
      resourceType: 'VEHICLE' | 'DRIVER' | 'ROUTE';
      resourceId: string;
      accessLevel: 'VIEW' | 'OPERATE' | 'MANAGE';
      validUntil?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.tenantIsolationService.grantCrossTenantAccess(
      body.sourceOrgId,
      body.targetOrgId,
      body.resourceType,
      body.resourceId,
      body.accessLevel,
      userId,
      body.validUntil ? new Date(body.validUntil) : undefined,
    );
  }

  @Delete('tenant/access/revoke')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revoke cross-tenant access' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Access revoked' })
  async revokeCrossTenantAccess(
    @Body()
    body: {
      sourceOrgId: string;
      targetOrgId: string;
      resourceId: string;
    },
  ) {
    return this.tenantIsolationService.revokeCrossTenantAccess(
      body.sourceOrgId,
      body.targetOrgId,
      body.resourceId,
    );
  }

  @Get('tenant/access/:organizationId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get cross-tenant access grants' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cross-tenant access grants' })
  async getCrossTenantAccessGrants(@Param('organizationId') organizationId: string) {
    return this.tenantIsolationService.getCrossTenantAccessGrants(organizationId);
  }

  @Get('tenant/violations')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get isolation violations' })
  @ApiQuery({ name: 'type', required: false, description: 'Violation type' })
  @ApiQuery({ name: 'resourceType', required: false, description: 'Resource type' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Isolation violations' })
  async getIsolationViolations(
    @Query('type') type?: string,
    @Query('resourceType') resourceType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantIsolationService.getViolations({
      type: type as any,
      resourceType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('tenant/validate/vehicle/:vehicleId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Validate vehicle access' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Access validation result' })
  async validateVehicleAccess(
    @Req() req: AuthenticatedRequest,
    @Param('vehicleId') vehicleId: string,
    @Body() body: { organizationId: string },
  ) {
    const userId = this.getUserId(req);
    const hasAccess = await this.tenantIsolationService.validateVehicleAccess(
      vehicleId,
      body.organizationId,
      userId,
    );
    return { hasAccess };
  }

  @Post('tenant/validate/batch')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Validate batch resource access' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Batch validation result' })
  async validateBatchIsolation(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      organizationId: string;
      resourceType: 'VEHICLE' | 'DRIVER' | 'ROUTE';
      resourceIds: string[];
    },
  ) {
    const userId = this.getUserId(req);
    return this.tenantIsolationService.validateBatchIsolation(
      userId,
      body.organizationId,
      body.resourceType,
      body.resourceIds,
    );
  }

  @Get('tenant/can-create/vehicle')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Check if tenant can create a vehicle' })
  @ApiQuery({ name: 'tier', required: false, description: 'Tier level' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Can create check result' })
  async canCreateVehicle(
    @Req() req: AuthenticatedRequest,
    @Query('tier') tier?: string,
  ) {
    const userId = this.getUserId(req);
    return this.tenantIsolationService.canCreateVehicle(
      userId,
      (tier as Tier) || Tier.FREE,
    );
  }

  @Get('tenant/can-create/route')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Check if tenant can create a route' })
  @ApiQuery({ name: 'tier', required: false, description: 'Tier level' })
  @ApiQuery({ name: 'date', required: false, description: 'Route date' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Can create check result' })
  async canCreateRoute(
    @Req() req: AuthenticatedRequest,
    @Query('tier') tier?: string,
    @Query('date') date?: string,
  ) {
    const userId = this.getUserId(req);
    return this.tenantIsolationService.canCreateRoute(
      userId,
      (tier as Tier) || Tier.FREE,
      date ? new Date(date) : new Date(),
    );
  }

  @Get('tenant/feature-check/:feature')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Check if feature is allowed for tier' })
  @ApiParam({ name: 'feature', description: 'Feature name' })
  @ApiQuery({ name: 'tier', required: false, description: 'Tier level' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feature check result' })
  async isFeatureAllowed(
    @Param('feature') feature: string,
    @Query('tier') tier?: string,
  ) {
    return {
      feature,
      allowed: this.tenantIsolationService.isFeatureAllowed(
        (tier as Tier) || Tier.FREE,
        feature,
      ),
    };
  }

  // ============== FINANCE INTEGRATION ==============

  @Get('finance/costs/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fleet cost summary' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'vehicleIds', required: false, description: 'Comma-separated vehicle IDs' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet cost summary' })
  async getFleetCostSummary(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('vehicleIds') vehicleIds?: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.getFleetCostSummary(userId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      vehicleIds: vehicleIds ? vehicleIds.split(',') : undefined,
    });
  }

  @Get('finance/costs/vehicle/:vehicleId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get vehicle cost report' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle cost report' })
  async getVehicleCostReport(
    @Req() req: AuthenticatedRequest,
    @Param('vehicleId') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.getVehicleCostReport(userId, vehicleId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('finance/costs/vehicles/comparison')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Compare costs across vehicles' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle cost comparison' })
  async getVehiclesCostComparison(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.getVehiclesCostComparison(userId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('finance/profitability/route/:routeId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get route profitability' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route profitability analysis' })
  async getRouteProfitability(
    @Req() req: AuthenticatedRequest,
    @Param('routeId') routeId: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.getRouteProfitability(userId, routeId);
  }

  @Get('finance/profitability/customer/:customerId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get customer profitability' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Customer profitability analysis' })
  async getCustomerProfitability(
    @Req() req: AuthenticatedRequest,
    @Param('customerId') customerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.getCustomerProfitability(userId, customerId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post('finance/expenses')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a fleet expense' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Expense created' })
  async createExpense(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      date: string;
      category: ExpenseCategory;
      description: string;
      amount: number;
      vehicleId?: string;
      routeId?: string;
      driverId?: string;
      supplierId?: string;
      invoiceNumber?: string;
      vatRate?: number;
    },
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.createExpense(userId, {
      ...body,
      date: new Date(body.date),
    });
  }

  @Get('finance/expenses')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fleet expenses' })
  @ApiQuery({ name: 'category', required: false, description: 'Expense category' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Vehicle ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Expense status' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet expenses' })
  async getExpenses(
    @Req() req: AuthenticatedRequest,
    @Query('category') category?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.getExpenses(userId, {
      category: category as ExpenseCategory,
      vehicleId,
      status: status as any,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Put('finance/expenses/:expenseId/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve an expense' })
  @ApiParam({ name: 'expenseId', description: 'Expense ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expense approved' })
  async approveExpense(
    @Req() req: AuthenticatedRequest,
    @Param('expenseId') expenseId: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.approveExpense(userId, expenseId);
  }

  @Put('finance/expenses/:expenseId/post')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Post expense to accounting' })
  @ApiParam({ name: 'expenseId', description: 'Expense ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expense posted' })
  async postExpenseToAccounting(
    @Req() req: AuthenticatedRequest,
    @Param('expenseId') expenseId: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.postExpenseToAccounting(userId, expenseId);
  }

  @Post('finance/budgets')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a fleet budget' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Budget created' })
  async createBudget(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      period: string;
      budgetedAmount: number;
      allocations: Partial<Record<ExpenseCategory, number>>;
    },
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.createBudget(userId, body);
  }

  @Get('finance/budgets/:period')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get budget with actuals' })
  @ApiParam({ name: 'period', description: 'Budget period (YYYY-MM)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Budget with actuals' })
  async getBudgetWithActuals(
    @Req() req: AuthenticatedRequest,
    @Param('period') period: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.getBudgetWithActuals(userId, period);
  }

  @Get('finance/vat')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Calculate fleet VAT' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet VAT summary' })
  async calculateFleetVAT(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.calculateFleetVAT(userId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('finance/dashboard')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get financial dashboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Financial dashboard data' })
  async getFinancialDashboard(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.getFinancialDashboard(userId);
  }

  @Get('finance/export')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Export financial data for accounting' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'format', required: false, description: 'Export format (CSV, JSON, DATEV)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Exported financial data' })
  async exportForAccounting(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
  ) {
    const userId = this.getUserId(req);
    return this.financeIntegrationService.exportForAccounting(userId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      format: format as 'CSV' | 'JSON' | 'DATEV',
    });
  }

  // =================== AUTOMATED INVOICING ===================

  @Post('invoicing/billing-configs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create billing configuration for a customer' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Billing configuration created' })
  async createBillingConfig(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      customerId: string;
      customerName: string;
      billingFrequency: BillingFrequency;
      pricingModel: PricingModel;
      baseRate?: number;
      perDeliveryRate?: number;
      perKmRate?: number;
      perHourRate?: number;
      minimumCharge?: number;
      volumeDiscounts?: VolumeDiscount[];
      paymentTermsDays?: number;
      autoGenerateInvoice?: boolean;
      autoSendInvoice?: boolean;
      emailRecipients?: string[];
      vatRate?: number;
      notes?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.createBillingConfig(userId, body);
  }

  @Get('invoicing/billing-configs')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all billing configurations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Billing configurations' })
  async getAllBillingConfigs(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.getAllBillingConfigs(userId);
  }

  @Get('invoicing/billing-configs/:customerId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get billing configuration for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Billing configuration' })
  async getBillingConfig(
    @Req() req: AuthenticatedRequest,
    @Param('customerId') customerId: string,
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.getBillingConfig(userId, customerId);
  }

  @Put('invoicing/billing-configs/:configId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update billing configuration' })
  @ApiParam({ name: 'configId', description: 'Configuration ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Billing configuration updated' })
  async updateBillingConfig(
    @Req() req: AuthenticatedRequest,
    @Param('configId') configId: string,
    @Body() body: Partial<{
      billingFrequency: BillingFrequency;
      pricingModel: PricingModel;
      baseRate: number;
      perDeliveryRate: number;
      perKmRate: number;
      perHourRate: number;
      minimumCharge: number;
      volumeDiscounts: VolumeDiscount[];
      paymentTermsDays: number;
      autoGenerateInvoice: boolean;
      autoSendInvoice: boolean;
      emailRecipients: string[];
      vatRate: number;
      notes: string;
    }>,
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.updateBillingConfig(userId, configId, body);
  }

  @Post('invoicing/templates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create invoice template' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Invoice template created' })
  async createInvoiceTemplate(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      name: string;
      headerText?: string;
      footerText?: string;
      logoUrl?: string;
      primaryColor?: string;
      bankDetails: {
        bankName: string;
        iban: string;
        bic: string;
        accountHolder: string;
      };
      companyDetails: {
        name: string;
        address: string;
        postalCode: string;
        city: string;
        country?: string;
        vatId: string;
        registrationNumber?: string;
        phone?: string;
        email?: string;
        website?: string;
      };
      isDefault?: boolean;
    },
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.createTemplate(userId, body);
  }

  @Get('invoicing/templates')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get invoice templates' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice templates' })
  async getInvoiceTemplates(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.getTemplates(userId);
  }

  @Get('invoicing/templates/default')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get default invoice template' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Default invoice template' })
  async getDefaultInvoiceTemplate(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.getDefaultTemplate(userId);
  }

  @Post('invoicing/generate')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate invoice for a customer' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Invoice generated' })
  async generateInvoice(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      customerId: string;
      routeIds?: string[];
      periodStart?: string;
      periodEnd?: string;
      templateId?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.generateInvoice(userId, {
      customerId: body.customerId,
      routeIds: body.routeIds,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      templateId: body.templateId,
    });
  }

  @Post('invoicing/batch-generate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Batch generate invoices for all eligible customers' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Batch invoices generated' })
  async batchGenerateInvoices(
    @Req() req: AuthenticatedRequest,
    @Body()
    body?: {
      billingFrequency?: BillingFrequency;
      periodEnd?: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.batchGenerateInvoices(userId, {
      billingFrequency: body?.billingFrequency,
      periodEnd: body?.periodEnd ? new Date(body.periodEnd) : undefined,
    });
  }

  @Get('invoicing/uninvoiced-summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get summary of uninvoiced routes by customer' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Uninvoiced routes summary' })
  async getUninvoicedSummary(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.getUninvoicedSummary(userId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('invoicing/invoices')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get auto-generated invoices' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Customer ID filter' })
  @ApiQuery({ name: 'status', required: false, description: 'Invoice status filter' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Auto-generated invoices' })
  async getAutoGeneratedInvoices(
    @Req() req: AuthenticatedRequest,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.getInvoices(userId, {
      customerId,
      status: status as any,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('invoicing/invoices/:invoiceId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get auto-generated invoice by ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Auto-generated invoice details' })
  async getAutoGeneratedInvoice(
    @Req() req: AuthenticatedRequest,
    @Param('invoiceId') invoiceId: string,
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.getInvoice(userId, invoiceId);
  }

  @Put('invoicing/invoices/:invoiceId/send')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark auto-generated invoice as sent' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice marked as sent' })
  async markAutoInvoiceSent(
    @Req() req: AuthenticatedRequest,
    @Param('invoiceId') invoiceId: string,
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.markInvoiceSent(userId, invoiceId);
  }

  @Put('invoicing/invoices/:invoiceId/pay')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark auto-generated invoice as paid' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice marked as paid' })
  async markAutoInvoicePaid(
    @Req() req: AuthenticatedRequest,
    @Param('invoiceId') invoiceId: string,
  ) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.markInvoicePaid(userId, invoiceId);
  }

  @Get('invoicing/overdue')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get overdue invoices for payment reminders' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Overdue invoices' })
  async getOverdueInvoices(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.getOverdueInvoices(userId);
  }

  @Get('invoicing/dashboard')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get invoicing dashboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoicing dashboard data' })
  async getInvoicingDashboard(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.automatedInvoicingService.getInvoicingDashboard(userId);
  }

  // =================== GPS TRACKING ENHANCED ===================

  @Post('gps-enhanced/routes/:routeId/eta')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Calculate live ETA for a route' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Live ETA data' })
  async calculateLiveETA(
    @Param('routeId') routeId: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.gpsEnhancedService.calculateLiveETA(routeId, body);
  }

  @Get('gps-enhanced/fleet-eta')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get live ETAs for all fleet routes' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet live ETAs' })
  async getFleetLiveETAs(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.gpsEnhancedService.getFleetLiveETAs(userId);
  }

  @Post('gps-enhanced/speed-check')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Check for speed violation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Speed violation check result' })
  async checkSpeedViolation(
    @Body()
    body: {
      vehicleId: string;
      currentSpeed: number;
      lat: number;
      lng: number;
      roadType?: string;
    },
  ) {
    return this.gpsEnhancedService.checkSpeedViolation(
      body.vehicleId,
      body.currentSpeed,
      { lat: body.lat, lng: body.lng },
      body.roadType,
    );
  }

  @Get('gps-enhanced/speed-violations')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get speed violations' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Vehicle ID filter' })
  @ApiQuery({ name: 'severity', required: false, description: 'Severity filter' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Speed violations' })
  async getSpeedViolations(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('severity') severity?: string,
  ) {
    const userId = this.getUserId(req);
    return this.gpsEnhancedService.getSpeedViolations(userId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      vehicleId,
      severity: severity as any,
    });
  }

  @Post('gps-enhanced/routes/:routeId/deviation-check')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Check for route deviation' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route deviation check result' })
  async checkRouteDeviation(
    @Param('routeId') routeId: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.gpsEnhancedService.checkRouteDeviation(routeId, body);
  }

  @Get('gps-enhanced/deviations')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get route deviations' })
  @ApiQuery({ name: 'routeId', required: false, description: 'Route ID filter' })
  @ApiQuery({ name: 'onlyActive', required: false, description: 'Only active deviations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route deviations' })
  async getRouteDeviations(
    @Req() req: AuthenticatedRequest,
    @Query('routeId') routeId?: string,
    @Query('onlyActive') onlyActive?: string,
  ) {
    const userId = this.getUserId(req);
    return this.gpsEnhancedService.getRouteDeviations(userId, {
      routeId,
      onlyActive: onlyActive === 'true',
    });
  }

  @Put('gps-enhanced/routes/:routeId/deviations/:deviationId/resolve')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Resolve route deviation' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiParam({ name: 'deviationId', description: 'Deviation ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Deviation resolved' })
  async resolveRouteDeviation(
    @Param('routeId') routeId: string,
    @Param('deviationId') deviationId: string,
  ) {
    return this.gpsEnhancedService.resolveRouteDeviation(routeId, deviationId);
  }

  @Post('gps-enhanced/behavior-event')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Record driver behavior event' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Behavior event recorded' })
  async recordBehaviorEvent(
    @Body()
    body: {
      vehicleId: string;
      eventType: 'HARSH_ACCELERATION' | 'HARSH_BRAKING' | 'HARSH_CORNERING' | 'SPEEDING' | 'EXCESSIVE_IDLE';
      value: number;
      lat?: number;
      lng?: number;
    },
  ) {
    await this.gpsEnhancedService.recordBehaviorEvent(
      body.vehicleId,
      body.eventType,
      body.value,
      body.lat && body.lng ? { lat: body.lat, lng: body.lng } : undefined,
    );
    return { success: true };
  }

  @Get('gps-enhanced/vehicles/:vehicleId/behavior-score')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get driver behavior score for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver behavior score' })
  async getDriverBehaviorScore(
    @Param('vehicleId') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    return this.gpsEnhancedService.calculateDriverBehaviorScore(vehicleId, fromDate, toDate);
  }

  @Get('gps-enhanced/fleet-behavior-scores')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get behavior scores for entire fleet' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet behavior scores' })
  async getFleetBehaviorScores(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = this.getUserId(req);
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    return this.gpsEnhancedService.getFleetBehaviorScores(userId, fromDate, toDate);
  }

  @Get('gps-enhanced/vehicles/:vehicleId/fuel-efficiency')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get fuel efficiency data for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fuel efficiency data' })
  async getFuelEfficiency(
    @Param('vehicleId') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    return this.gpsEnhancedService.estimateFuelEfficiency(vehicleId, fromDate, toDate);
  }

  @Put('gps-enhanced/vehicles/:vehicleId/device-health')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Update GPS device health status' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Device health updated' })
  async updateDeviceHealth(
    @Param('vehicleId') vehicleId: string,
    @Body()
    body: {
      batteryLevel?: number;
      signalStrength?: number;
      gpsAccuracy?: number;
    },
  ) {
    await this.gpsEnhancedService.updateDeviceHealth(vehicleId, body);
    return { success: true };
  }

  @Get('gps-enhanced/device-health')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get GPS device health for fleet' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet device health status' })
  async getFleetDeviceHealth(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.gpsEnhancedService.getFleetDeviceHealth(userId);
  }

  @Get('gps-enhanced/vehicles/:vehicleId/playback')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get historical playback data with interpolation' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'interval', required: false, description: 'Interval in seconds (default 5)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Playback frames' })
  async getPlaybackData(
    @Param('vehicleId') vehicleId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('interval') interval?: string,
  ) {
    return this.gpsEnhancedService.getPlaybackData(
      vehicleId,
      new Date(from),
      new Date(to),
      interval ? parseInt(interval) : 5,
    );
  }

  @Post('gps-enhanced/proximity-check')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Check proximity to targets' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Proximity alerts' })
  async checkProximity(
    @Body()
    body: {
      vehicleId: string;
      lat: number;
      lng: number;
      alertDistanceMeters?: number;
    },
  ) {
    return this.gpsEnhancedService.checkProximity(
      body.vehicleId,
      { lat: body.lat, lng: body.lng },
      body.alertDistanceMeters,
    );
  }

  @Get('gps-enhanced/proximity-alerts')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get recent proximity alerts' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default 50)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Proximity alerts' })
  async getProximityAlerts(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.gpsEnhancedService.getProximityAlerts(userId, limit ? parseInt(limit) : 50);
  }

  @Get('gps-enhanced/tracking-dashboard')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get real-time tracking dashboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tracking dashboard data' })
  async getTrackingDashboard(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.gpsEnhancedService.getTrackingDashboard(userId);
  }

  // ============== REPORTS EXPORT ==============

  @Get('reports/export')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Export a fleet report' })
  @ApiQuery({ name: 'type', required: true, description: 'Report type (fleet_performance, fuel_consumption, etc.)' })
  @ApiQuery({ name: 'format', required: false, description: 'Export format (json, csv, xlsx, pdf, html)' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Exported report data' })
  async exportReport(
    @Req() req: AuthenticatedRequest,
    @Query('type') reportType: string,
    @Query('format') format: ExtendedExportFormat = 'json',
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = this.getUserId(req);
    return this.reportsExportService.exportReport(userId, {
      reportType,
      format,
      from: new Date(from),
      to: new Date(to),
    });
  }

  @Post('reports/bulk-export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk export multiple reports' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bulk export results' })
  async bulkExportReports(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      reportTypes: string[];
      format: ExtendedExportFormat;
      from: string;
      to: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.reportsExportService.bulkExport(
      userId,
      body.reportTypes,
      body.format,
      new Date(body.from),
      new Date(body.to),
    );
  }

  @Get('reports/export-history')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get report export history' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default 20)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Export history' })
  async getExportHistory(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.reportsExportService.getExportHistory(userId, limit ? parseInt(limit) : 20);
  }

  @Get('reports/quick-summary')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get quick summary for dashboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quick summary data' })
  async getQuickSummary(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.reportsExportService.getQuickSummary(userId);
  }

  // ============== REPORT TEMPLATES ==============

  @Post('reports/templates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a report template' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Template created' })
  async createReportTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      name: string;
      reportType: string;
      format: ExtendedExportFormat;
      periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
      customPeriodDays?: number;
      filters?: { vehicleIds?: string[]; driverIds?: string[]; zones?: string[] };
      includeCharts: boolean;
      emailRecipients?: string[];
    },
  ) {
    const userId = this.getUserId(req);
    return this.reportsExportService.createTemplate(userId, body);
  }

  @Get('reports/templates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all report templates' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Templates list' })
  async getReportTemplates(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.reportsExportService.getTemplates(userId);
  }

  @Get('reports/templates/:templateId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a report template' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template details' })
  async getReportTemplate(@Param('templateId') templateId: string) {
    return this.reportsExportService.getTemplate(templateId);
  }

  @Put('reports/templates/:templateId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a report template' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template updated' })
  async updateReportTemplate(
    @Param('templateId') templateId: string,
    @Body() body: {
      name?: string;
      format?: ExtendedExportFormat;
      periodType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
      customPeriodDays?: number;
      filters?: { vehicleIds?: string[]; driverIds?: string[]; zones?: string[] };
      includeCharts?: boolean;
      emailRecipients?: string[];
    },
  ) {
    return this.reportsExportService.updateTemplate(templateId, body);
  }

  @Delete('reports/templates/:templateId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a report template' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template deleted' })
  async deleteReportTemplate(@Param('templateId') templateId: string) {
    const deleted = await this.reportsExportService.deleteTemplate(templateId);
    return { success: deleted };
  }

  // ============== SCHEDULED REPORTS ==============

  @Post('reports/schedules')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Schedule a report' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Report scheduled' })
  async scheduleReport(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      templateId: string;
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      dayOfWeek?: number;
      dayOfMonth?: number;
      time: string;
      nextRunAt: string;
    },
  ) {
    const userId = this.getUserId(req);
    return this.reportsExportService.scheduleReport(userId, {
      ...body,
      nextRunAt: new Date(body.nextRunAt),
    });
  }

  @Get('reports/schedules')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get scheduled reports' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Scheduled reports list' })
  async getScheduledReports(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.reportsExportService.getScheduledReports(userId);
  }

  @Put('reports/schedules/:scheduleId/pause')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Pause a scheduled report' })
  @ApiParam({ name: 'scheduleId', description: 'Schedule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Schedule paused' })
  async pauseScheduledReport(@Param('scheduleId') scheduleId: string) {
    await this.reportsExportService.pauseScheduledReport(scheduleId);
    return { success: true };
  }

  @Put('reports/schedules/:scheduleId/resume')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resume a scheduled report' })
  @ApiParam({ name: 'scheduleId', description: 'Schedule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Schedule resumed' })
  async resumeScheduledReport(@Param('scheduleId') scheduleId: string) {
    await this.reportsExportService.resumeScheduledReport(scheduleId);
    return { success: true };
  }

  @Delete('reports/schedules/:scheduleId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a scheduled report' })
  @ApiParam({ name: 'scheduleId', description: 'Schedule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Schedule deleted' })
  async deleteScheduledReport(@Param('scheduleId') scheduleId: string) {
    const deleted = await this.reportsExportService.deleteScheduledReport(scheduleId);
    return { success: deleted };
  }

  @Post('reports/schedules/run-due')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Run due scheduled reports (typically called by cron)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reports executed' })
  async runDueScheduledReports() {
    const count = await this.reportsExportService.runDueScheduledReports();
    return { executed: count };
  }

  // ============== PREDICTIVE MAINTENANCE ==============

  @Get('predictive-maintenance/fleet-analytics')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fleet-wide predictive maintenance analytics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet predictive analytics' })
  async getFleetPredictiveAnalytics(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.predictiveMaintenanceService.getFleetPredictiveAnalytics(userId);
  }

  @Get('predictive-maintenance/vehicles/:vehicleId/health')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get vehicle health profile with component analysis' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle health profile' })
  async getVehicleHealthProfile(
    @Req() req: AuthenticatedRequest,
    @Param('vehicleId') vehicleId: string,
  ) {
    const userId = this.getUserId(req);
    return this.predictiveMaintenanceService.getVehicleHealthProfile(userId, vehicleId);
  }

  @Get('predictive-maintenance/predictions')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get failure predictions for fleet' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filter by vehicle ID' })
  @ApiQuery({ name: 'daysAhead', required: false, description: 'Days to look ahead (default: 90)' })
  @ApiQuery({ name: 'minProbability', required: false, description: 'Minimum probability (0-1, default: 0.3)' })
  @ApiQuery({ name: 'riskLevel', required: false, enum: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Failure predictions list' })
  async getFailurePredictions(
    @Req() req: AuthenticatedRequest,
    @Query('vehicleId') vehicleId?: string,
    @Query('daysAhead') daysAhead?: string,
    @Query('minProbability') minProbability?: string,
    @Query('riskLevel') riskLevel?: RiskLevel,
  ) {
    const userId = this.getUserId(req);
    return this.predictiveMaintenanceService.getFailurePredictions(userId, {
      vehicleId,
      daysAhead: daysAhead ? parseInt(daysAhead, 10) : undefined,
      minProbability: minProbability ? parseFloat(minProbability) : undefined,
      riskLevel,
    });
  }

  @Get('predictive-maintenance/vehicles/:vehicleId/components/:component/trends')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get component health trends for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiParam({ name: 'component', description: 'Component name (e.g., brake_pads, engine_oil)' })
  @ApiQuery({ name: 'months', required: false, description: 'Months of history (default: 12)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Component health trends' })
  async getComponentHealthTrends(
    @Req() req: AuthenticatedRequest,
    @Param('vehicleId') vehicleId: string,
    @Param('component') component: string,
    @Query('months') months?: string,
  ) {
    const userId = this.getUserId(req);
    return this.predictiveMaintenanceService.getComponentHealthTrends(
      userId,
      vehicleId,
      component,
      months ? parseInt(months, 10) : undefined,
    );
  }

  @Get('predictive-maintenance/optimized-schedule')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get optimized maintenance schedule for fleet' })
  @ApiQuery({ name: 'vehicleIds', required: false, description: 'Comma-separated vehicle IDs' })
  @ApiQuery({ name: 'daysAhead', required: false, description: 'Days to schedule ahead (default: 30)' })
  @ApiQuery({ name: 'maxDowntimePerDay', required: false, description: 'Max downtime hours per day (default: 8)' })
  @ApiQuery({ name: 'preferredDays', required: false, description: 'Comma-separated preferred days (0=Sun, 1=Mon...)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Optimized maintenance schedule' })
  async getOptimizedMaintenanceSchedule(
    @Req() req: AuthenticatedRequest,
    @Query('vehicleIds') vehicleIds?: string,
    @Query('daysAhead') daysAhead?: string,
    @Query('maxDowntimePerDay') maxDowntimePerDay?: string,
    @Query('preferredDays') preferredDays?: string,
  ) {
    const userId = this.getUserId(req);
    return this.predictiveMaintenanceService.getOptimizedMaintenanceSchedule(userId, {
      vehicleIds: vehicleIds?.split(',').filter(Boolean),
      daysAhead: daysAhead ? parseInt(daysAhead, 10) : undefined,
      maxDowntimePerDay: maxDowntimePerDay ? parseFloat(maxDowntimePerDay) : undefined,
      preferredDays: preferredDays?.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d)),
    });
  }

  @Get('predictive-maintenance/vehicles/:vehicleId/anomalies')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Detect maintenance anomalies for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Detected anomalies' })
  async detectMaintenanceAnomalies(
    @Req() req: AuthenticatedRequest,
    @Param('vehicleId') vehicleId: string,
  ) {
    const userId = this.getUserId(req);
    return this.predictiveMaintenanceService.detectMaintenanceAnomalies(userId, vehicleId);
  }

  // ============== DASHBOARD ANALYTICS WIDGETS ==============

  @Get('dashboard-analytics/full')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get full dashboard with all analytics widgets' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Full dashboard data' })
  async getFullDashboard(
    @Req() req: AuthenticatedRequest,
    @Query('timeRange') timeRange?: TimeRange,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getFullDashboard(userId, timeRange || 'TODAY');
  }

  @Get('dashboard-analytics/kpi-cards')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get KPI summary cards' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'KPI cards data' })
  async getKpiCards(
    @Req() req: AuthenticatedRequest,
    @Query('timeRange') timeRange?: TimeRange,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getKpiCards(userId, timeRange || 'TODAY');
  }

  @Get('dashboard-analytics/trends/deliveries')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get delivery trend chart data' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery trend data' })
  async getDeliveryTrendChart(
    @Req() req: AuthenticatedRequest,
    @Query('timeRange') timeRange?: TimeRange,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getDeliveryTrendChart(userId, timeRange || 'WEEK');
  }

  @Get('dashboard-analytics/trends/revenue')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get revenue trend chart data' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Revenue trend data' })
  async getRevenueTrendChart(
    @Req() req: AuthenticatedRequest,
    @Query('timeRange') timeRange?: TimeRange,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getRevenueTrendChart(userId, timeRange || 'WEEK');
  }

  @Get('dashboard-analytics/trends/fuel')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get fuel consumption trend chart data' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fuel consumption trend data' })
  async getFuelConsumptionTrend(
    @Req() req: AuthenticatedRequest,
    @Query('timeRange') timeRange?: TimeRange,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getFuelConsumptionTrend(userId, timeRange || 'MONTH');
  }

  @Get('dashboard-analytics/comparisons')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get comparison widgets (day-over-day)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comparison data' })
  async getComparisonWidgets(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getComparisonWidgets(userId);
  }

  @Get('dashboard-analytics/rankings/drivers')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get driver performance ranking' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of top drivers (default: 10)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver ranking data' })
  async getDriverPerformanceRanking(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getDriverPerformanceRanking(
      userId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('dashboard-analytics/rankings/vehicles')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get vehicle utilization ranking' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of top vehicles (default: 10)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle ranking data' })
  async getVehicleUtilizationRanking(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getVehicleUtilizationRanking(
      userId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('dashboard-analytics/gauges/fleet-health')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get fleet health gauge widget' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet health gauge data' })
  async getFleetHealthGauge(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getFleetHealthGauge(userId);
  }

  @Get('dashboard-analytics/gauges/on-time-rate')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get on-time delivery rate gauge widget' })
  @ApiResponse({ status: HttpStatus.OK, description: 'On-time rate gauge data' })
  async getOnTimeDeliveryGauge(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getOnTimeDeliveryGauge(userId);
  }

  @Get('dashboard-analytics/status/vehicles')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get vehicle status grid widget' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Vehicle status grid data' })
  async getVehicleStatusGrid(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getVehicleStatusGrid(userId);
  }

  @Get('dashboard-analytics/heatmap/deliveries')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get delivery activity heatmap' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery heatmap data' })
  async getDeliveryHeatmap(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getDeliveryHeatmap(userId);
  }

  @Get('dashboard-analytics/pie-charts/delivery-status')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get delivery status distribution pie chart' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery status pie chart data' })
  async getDeliveryStatusPieChart(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getDeliveryStatusPieChart(userId);
  }

  @Get('dashboard-analytics/pie-charts/cost-breakdown')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get cost breakdown pie chart' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cost breakdown pie chart data' })
  async getCostBreakdownPieChart(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.dashboardAnalyticsService.getCostBreakdownPieChart(userId);
  }
}
