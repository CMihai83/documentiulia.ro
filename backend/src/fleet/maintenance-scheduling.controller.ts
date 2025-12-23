import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  MaintenanceSchedulingService,
  MaintenanceType,
  MaintenancePriority,
} from './maintenance-scheduling.service';

@ApiTags('Fleet Maintenance')
@Controller('fleet/maintenance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MaintenanceSchedulingController {
  constructor(private readonly maintenanceService: MaintenanceSchedulingService) {}

  // =================== CONFIG ENDPOINTS ===================

  @Get('config/types')
  @ApiOperation({
    summary: 'Get maintenance types',
    description: 'Get available maintenance types / Tipurile de mentenanță disponibile',
  })
  getMaintenanceTypes() {
    return {
      success: true,
      data: [
        { value: 'OIL_CHANGE', label: 'Oil Change', labelRo: 'Schimb Ulei' },
        { value: 'BRAKE_SERVICE', label: 'Brake Service', labelRo: 'Service Frâne' },
        { value: 'TIRE_ROTATION', label: 'Tire Rotation', labelRo: 'Rotire Anvelope' },
        { value: 'SCHEDULED_SERVICE', label: 'Scheduled Service', labelRo: 'Service Programat' },
        { value: 'TUV_INSPECTION', label: 'TÜV Inspection', labelRo: 'Inspecție TÜV/ITP' },
        { value: 'REPAIR', label: 'Repair', labelRo: 'Reparație' },
        { value: 'UNSCHEDULED_REPAIR', label: 'Unscheduled Repair', labelRo: 'Reparație Neprogramată' },
        { value: 'CLEANING', label: 'Cleaning', labelRo: 'Curățenie' },
        { value: 'OTHER', label: 'Other', labelRo: 'Altele' },
      ],
    };
  }

  @Get('config/priorities')
  @ApiOperation({
    summary: 'Get maintenance priorities',
    description: 'Get maintenance priority levels / Nivelurile de prioritate pentru mentenanță',
  })
  getPriorities() {
    return {
      success: true,
      data: [
        { value: 'LOW', label: 'Low', labelRo: 'Scăzută', color: 'green' },
        { value: 'MEDIUM', label: 'Medium', labelRo: 'Medie', color: 'yellow' },
        { value: 'HIGH', label: 'High', labelRo: 'Înaltă', color: 'orange' },
        { value: 'CRITICAL', label: 'Critical', labelRo: 'Critică', color: 'red' },
      ],
    };
  }

  @Get('config/alert-types')
  @ApiOperation({
    summary: 'Get alert types',
    description: 'Get maintenance alert types / Tipurile de alerte pentru mentenanță',
  })
  getAlertTypes() {
    return {
      success: true,
      data: [
        { value: 'TUV_EXPIRY', label: 'TÜV/ITP Expiry', labelRo: 'Expirare TÜV/ITP' },
        { value: 'INSURANCE_EXPIRY', label: 'Insurance Expiry', labelRo: 'Expirare Asigurare' },
        { value: 'SERVICE_DUE', label: 'Service Due', labelRo: 'Service Scadent' },
        { value: 'MILEAGE_SERVICE', label: 'Mileage Service', labelRo: 'Service Kilometraj' },
      ],
    };
  }

  // =================== SUMMARY & OVERVIEW ===================

  @Get('summary')
  @ApiOperation({
    summary: 'Get maintenance summary',
    description: 'Get fleet maintenance summary with key metrics / Sumar mentenanță flotă cu metrici cheie',
  })
  @ApiResponse({ status: 200, description: 'Maintenance summary' })
  async getMaintenanceSummary(@Request() req: any) {
    const summary = await this.maintenanceService.getMaintenanceSummary(req.user.sub);
    return { success: true, data: summary };
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Get maintenance alerts',
    description: 'Get all active maintenance alerts / Toate alertele active de mentenanță',
  })
  @ApiResponse({ status: 200, description: 'Maintenance alerts sorted by severity' })
  async getMaintenanceAlerts(@Request() req: any) {
    const alerts = await this.maintenanceService.getMaintenanceAlerts(req.user.sub);
    return {
      success: true,
      data: alerts,
      counts: {
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        urgent: alerts.filter(a => a.severity === 'URGENT').length,
        warning: alerts.filter(a => a.severity === 'WARNING').length,
        info: alerts.filter(a => a.severity === 'INFO').length,
      },
    };
  }

  // =================== SCHEDULED TASKS ===================

  @Get('tasks')
  @ApiOperation({
    summary: 'Get all scheduled maintenance tasks',
    description: 'Get scheduled maintenance tasks with filtering / Sarcinile de mentenanță programate cu filtrare',
  })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filter by vehicle ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by maintenance type' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'scheduled', 'completed', 'overdue'] })
  @ApiQuery({ name: 'daysAhead', required: false, description: 'Days to look ahead (default: 90)' })
  @ApiQuery({ name: 'includeOverdue', required: false, description: 'Include overdue tasks (default: true)' })
  @ApiResponse({ status: 200, description: 'Scheduled maintenance tasks' })
  async getScheduledMaintenance(
    @Request() req: any,
    @Query('vehicleId') vehicleId?: string,
    @Query('type') type?: MaintenanceType,
    @Query('status') status?: 'pending' | 'scheduled' | 'completed' | 'overdue',
    @Query('daysAhead') daysAhead?: string,
    @Query('includeOverdue') includeOverdue?: string,
  ) {
    const tasks = await this.maintenanceService.getAllScheduledMaintenance(req.user.sub, {
      vehicleId,
      type,
      status,
      daysAhead: daysAhead ? parseInt(daysAhead) : 90,
      includeOverdue: includeOverdue !== 'false',
    });

    return {
      success: true,
      data: tasks,
      summary: {
        total: tasks.length,
        overdue: tasks.filter(t => t.isOverdue).length,
        critical: tasks.filter(t => t.priority === 'CRITICAL').length,
        high: tasks.filter(t => t.priority === 'HIGH').length,
        medium: tasks.filter(t => t.priority === 'MEDIUM').length,
        low: tasks.filter(t => t.priority === 'LOW').length,
      },
    };
  }

  // =================== VEHICLE-SPECIFIC ===================

  @Get('vehicle/:vehicleId/schedule')
  @ApiOperation({
    summary: 'Get vehicle maintenance schedule',
    description: 'Get complete maintenance schedule for a vehicle / Program complet de mentenanță pentru un vehicul',
  })
  @ApiResponse({ status: 200, description: 'Vehicle maintenance schedule with forecast' })
  async getVehicleMaintenanceSchedule(
    @Request() req: any,
    @Param('vehicleId') vehicleId: string,
  ) {
    const schedule = await this.maintenanceService.getVehicleMaintenanceSchedule(
      req.user.sub,
      vehicleId,
    );
    return { success: true, data: schedule };
  }

  @Get('vehicle/:vehicleId/history')
  @ApiOperation({
    summary: 'Get vehicle maintenance history',
    description: 'Get maintenance history for a vehicle / Istoricul mentenanței pentru un vehicul',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default: 100)' })
  @ApiResponse({ status: 200, description: 'Vehicle maintenance history' })
  async getMaintenanceHistory(
    @Request() req: any,
    @Param('vehicleId') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const history = await this.maintenanceService.getMaintenanceHistory(
      req.user.sub,
      vehicleId,
      {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        limit: limit ? parseInt(limit) : 100,
      },
    );
    return { success: true, data: history };
  }

  // =================== SCHEDULE & COMPLETE ===================

  @Post('schedule')
  @ApiOperation({
    summary: 'Schedule maintenance task',
    description: 'Schedule a new maintenance task for a vehicle / Programează o sarcină de mentenanță',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string', description: 'Vehicle ID' },
        type: {
          type: 'string',
          enum: ['OIL_CHANGE', 'BRAKE_SERVICE', 'TIRE_ROTATION', 'SCHEDULED_SERVICE', 'TUV_INSPECTION', 'REPAIR', 'UNSCHEDULED_REPAIR', 'CLEANING', 'OTHER'],
        },
        scheduledDate: { type: 'string', format: 'date-time' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        estimatedCostEur: { type: 'number' },
        notes: { type: 'string' },
        serviceProvider: { type: 'string' },
      },
      required: ['vehicleId', 'type', 'scheduledDate'],
    },
  })
  @ApiResponse({ status: 201, description: 'Maintenance task scheduled' })
  async scheduleMaintenanceTask(
    @Request() req: any,
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
    const result = await this.maintenanceService.scheduleMaintenanceTask(
      req.user.sub,
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
    return {
      success: true,
      data: result,
      message: 'Maintenance task scheduled / Sarcină de mentenanță programată',
    };
  }

  @Put('task/:taskId/complete')
  @ApiOperation({
    summary: 'Complete maintenance task',
    description: 'Mark a maintenance task as completed / Marchează o sarcină de mentenanță ca finalizată',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        actualCostEur: { type: 'number', description: 'Actual cost in EUR' },
        odometerReading: { type: 'number', description: 'Current odometer reading' },
        notes: { type: 'string', description: 'Service notes' },
        serviceProvider: { type: 'string', description: 'Service provider name' },
        invoiceNumber: { type: 'string', description: 'Invoice number' },
      },
      required: ['actualCostEur'],
    },
  })
  @ApiResponse({ status: 200, description: 'Maintenance task completed' })
  async completeMaintenanceTask(
    @Request() req: any,
    @Param('taskId') taskId: string,
    @Body() body: {
      actualCostEur: number;
      odometerReading?: number;
      notes?: string;
      serviceProvider?: string;
      invoiceNumber?: string;
    },
  ) {
    const result = await this.maintenanceService.completeMaintenanceTask(
      req.user.sub,
      taskId,
      body,
    );
    return {
      success: true,
      data: result,
      message: 'Maintenance task completed / Sarcină de mentenanță finalizată',
    };
  }

  // =================== COST FORECAST ===================

  @Get('forecast')
  @ApiOperation({
    summary: 'Get maintenance cost forecast',
    description: 'Get maintenance cost forecast for upcoming months / Prognoza costurilor de mentenanță',
  })
  @ApiQuery({ name: 'months', required: false, description: 'Months to forecast (default: 12)' })
  @ApiResponse({ status: 200, description: 'Maintenance cost forecast' })
  async getMaintenanceCostForecast(
    @Request() req: any,
    @Query('months') months?: string,
  ) {
    const forecast = await this.maintenanceService.getMaintenanceCostForecast(
      req.user.sub,
      months ? parseInt(months) : 12,
    );

    const totalForecastCost = forecast.reduce((sum, m) => sum + m.estimatedCostEur, 0);
    const totalMaintenanceCount = forecast.reduce((sum, m) => sum + m.maintenanceCount, 0);

    return {
      success: true,
      data: forecast,
      summary: {
        totalEstimatedCostEur: Math.round(totalForecastCost * 100) / 100,
        totalMaintenanceCount,
        averageMonthlyBudgetEur: Math.round((totalForecastCost / forecast.length) * 100) / 100,
      },
    };
  }
}
