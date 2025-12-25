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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AssetMaintenanceService,
  MaintenanceType,
  MaintenancePriority,
  MaintenanceStatus,
  RecurrencePattern,
  MaintenancePart,
} from './asset-maintenance.service';

@ApiTags('Asset Management - Maintenance')
@Controller('assets/maintenance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssetMaintenanceController {
  constructor(private readonly maintenanceService: AssetMaintenanceService) {}

  // =================== SCHEDULES ===================

  @Post('schedules')
  @ApiOperation({ summary: 'Create maintenance schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createSchedule(
    @Request() req: any,
    @Body() body: {
      assetId: string;
      assetName: string;
      title: string;
      description?: string;
      type: MaintenanceType;
      priority?: MaintenancePriority;
      isRecurring?: boolean;
      recurrencePattern?: RecurrencePattern;
      recurrenceInterval?: number;
      scheduledDate: string;
      estimatedDuration?: number;
      estimatedCost?: number;
      assignedTo?: string;
      assignedToName?: string;
      vendorId?: string;
      vendorName?: string;
      checklist?: Array<{ task: string }>;
      requiredParts?: MaintenancePart[];
      instructions?: string;
      notifyBefore?: number;
    },
  ) {
    return this.maintenanceService.createSchedule({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
      scheduledDate: new Date(body.scheduledDate),
    });
  }

  @Get('schedules')
  @ApiOperation({ summary: 'Get maintenance schedules' })
  @ApiQuery({ name: 'assetId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Schedules list' })
  async getSchedules(
    @Request() req: any,
    @Query('assetId') assetId?: string,
    @Query('type') type?: MaintenanceType,
    @Query('status') status?: MaintenanceStatus,
    @Query('priority') priority?: MaintenancePriority,
    @Query('assignedTo') assignedTo?: string,
    @Query('vendorId') vendorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const schedules = await this.maintenanceService.getSchedules(req.user.tenantId, {
      assetId,
      type,
      status,
      priority,
      assignedTo,
      vendorId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { schedules, total: schedules.length };
  }

  @Get('schedules/:id')
  @ApiOperation({ summary: 'Get schedule details' })
  @ApiResponse({ status: 200, description: 'Schedule details' })
  async getSchedule(@Param('id') id: string) {
    const schedule = await this.maintenanceService.getSchedule(id);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  @Put('schedules/:id')
  @ApiOperation({ summary: 'Update schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updateSchedule(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      description?: string;
      priority?: MaintenancePriority;
      scheduledDate?: string;
      estimatedDuration?: number;
      estimatedCost?: number;
      assignedTo?: string;
      assignedToName?: string;
      vendorId?: string;
      vendorName?: string;
      instructions?: string;
      notifyBefore?: number;
    },
  ) {
    const updateData: any = { ...body };
    if (body.scheduledDate) {
      updateData.scheduledDate = new Date(body.scheduledDate);
    }

    const schedule = await this.maintenanceService.updateSchedule(id, updateData);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  @Post('schedules/:id/start')
  @ApiOperation({ summary: 'Start maintenance' })
  @ApiResponse({ status: 200, description: 'Maintenance started' })
  async startMaintenance(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const schedule = await this.maintenanceService.startMaintenance(id, req.user.id);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  @Put('schedules/:scheduleId/checklist/:itemId')
  @ApiOperation({ summary: 'Update checklist item' })
  @ApiResponse({ status: 200, description: 'Checklist item updated' })
  async updateChecklistItem(
    @Request() req: any,
    @Param('scheduleId') scheduleId: string,
    @Param('itemId') itemId: string,
    @Body() body: {
      completed: boolean;
      notes?: string;
    },
  ) {
    const item = await this.maintenanceService.updateChecklistItem(
      scheduleId,
      itemId,
      {
        completed: body.completed,
        completedBy: req.user.id,
        notes: body.notes,
      },
    );
    if (!item) {
      return { error: 'Schedule or checklist item not found' };
    }
    return item;
  }

  @Post('schedules/:id/cancel')
  @ApiOperation({ summary: 'Cancel maintenance schedule' })
  @ApiResponse({ status: 200, description: 'Schedule cancelled' })
  async cancelSchedule(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const schedule = await this.maintenanceService.cancelSchedule(id, body.reason);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  // =================== RECORDS ===================

  @Post('records')
  @ApiOperation({ summary: 'Complete maintenance and create record' })
  @ApiResponse({ status: 201, description: 'Maintenance record created' })
  async completeMaintenance(
    @Request() req: any,
    @Body() body: {
      assetId: string;
      assetName: string;
      scheduleId?: string;
      type: MaintenanceType;
      title: string;
      description?: string;
      duration?: number;
      laborCost?: number;
      partsCost?: number;
      partsUsed?: MaintenancePart[];
      findings?: string;
      recommendations?: string;
      nextMaintenanceDate?: string;
      meterReading?: number;
      conditionBefore?: string;
      conditionAfter?: string;
      status?: 'completed' | 'partial' | 'failed';
      attachments?: string[];
    },
  ) {
    return this.maintenanceService.completeMaintenance({
      tenantId: req.user.tenantId,
      performedBy: req.user.id,
      performedByName: req.user.name || req.user.email,
      ...body,
      nextMaintenanceDate: body.nextMaintenanceDate
        ? new Date(body.nextMaintenanceDate)
        : undefined,
    });
  }

  @Get('records')
  @ApiOperation({ summary: 'Get maintenance records' })
  @ApiQuery({ name: 'assetId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'performedBy', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Records list' })
  async getRecords(
    @Request() req: any,
    @Query('assetId') assetId?: string,
    @Query('type') type?: MaintenanceType,
    @Query('performedBy') performedBy?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: 'completed' | 'partial' | 'failed',
    @Query('limit') limit?: string,
  ) {
    const records = await this.maintenanceService.getMaintenanceRecords(
      req.user.tenantId,
      {
        assetId,
        type,
        performedBy,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        limit: limit ? parseInt(limit) : undefined,
      },
    );
    return { records, total: records.length };
  }

  @Get('records/asset/:assetId')
  @ApiOperation({ summary: 'Get asset maintenance history' })
  @ApiResponse({ status: 200, description: 'Asset maintenance history' })
  async getAssetHistory(@Param('assetId') assetId: string) {
    const records = await this.maintenanceService.getAssetMaintenanceHistory(assetId);
    return { records, total: records.length };
  }

  // =================== VENDORS ===================

  @Post('vendors')
  @ApiOperation({ summary: 'Create maintenance vendor' })
  @ApiResponse({ status: 201, description: 'Vendor created' })
  async createVendor(
    @Request() req: any,
    @Body() body: {
      name: string;
      contactPerson?: string;
      email?: string;
      phone?: string;
      address?: string;
      specializations?: string[];
      contractNumber?: string;
      contractExpiry?: string;
      hourlyRate?: number;
      responseTime?: number;
      notes?: string;
    },
  ) {
    return this.maintenanceService.createVendor({
      tenantId: req.user.tenantId,
      ...body,
      contractExpiry: body.contractExpiry ? new Date(body.contractExpiry) : undefined,
    });
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Get maintenance vendors' })
  @ApiQuery({ name: 'specialization', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiResponse({ status: 200, description: 'Vendors list' })
  async getVendors(
    @Request() req: any,
    @Query('specialization') specialization?: string,
    @Query('isActive') isActive?: string,
  ) {
    const vendors = await this.maintenanceService.getVendors(req.user.tenantId, {
      specialization,
      isActive: isActive ? isActive === 'true' : undefined,
    });
    return { vendors, total: vendors.length };
  }

  @Post('vendors/:id/rate')
  @ApiOperation({ summary: 'Rate vendor' })
  @ApiResponse({ status: 200, description: 'Vendor rated' })
  async rateVendor(
    @Param('id') id: string,
    @Body() body: { rating: number },
  ) {
    const vendor = await this.maintenanceService.updateVendorRating(id, body.rating);
    if (!vendor) {
      return { error: 'Vendor not found' };
    }
    return vendor;
  }

  // =================== ALERTS ===================

  @Get('alerts')
  @ApiOperation({ summary: 'Get maintenance alerts' })
  @ApiQuery({ name: 'acknowledged', required: false })
  @ApiQuery({ name: 'alertType', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'assetId', required: false })
  @ApiResponse({ status: 200, description: 'Alerts list' })
  async getAlerts(
    @Request() req: any,
    @Query('acknowledged') acknowledged?: string,
    @Query('alertType') alertType?: 'upcoming' | 'overdue' | 'warranty_expiring' | 'meter_based' | 'condition_based',
    @Query('priority') priority?: MaintenancePriority,
    @Query('assetId') assetId?: string,
  ) {
    const alerts = await this.maintenanceService.getAlerts(req.user.tenantId, {
      acknowledged: acknowledged ? acknowledged === 'true' : undefined,
      alertType,
      priority,
      assetId,
    });
    return { alerts, total: alerts.length };
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const alert = await this.maintenanceService.acknowledgeAlert(id, req.user.id);
    if (!alert) {
      return { error: 'Alert not found' };
    }
    return alert;
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get maintenance statistics' })
  @ApiResponse({ status: 200, description: 'Maintenance statistics' })
  async getStatistics(@Request() req: any) {
    return this.maintenanceService.getMaintenanceStatistics(req.user.tenantId);
  }
}
