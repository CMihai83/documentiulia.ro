import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  InventoryReconciliationService,
  StockCountSession,
  CountType,
  CountSessionStatus,
  VarianceReport,
  InventoryAdjustment,
  AdjustmentReason,
  AdjustmentStatus,
  ReconciliationSchedule,
  ReconciliationFrequency,
  ItemSelectionCriteria,
} from './inventory-reconciliation.service';

// DTOs
class CreateCountSessionDto {
  warehouseId: string;
  type: CountType;
  scheduledDate: string;
  notes?: string;
  itemSelection?: ItemSelectionCriteria;
}

class RecordCountDto {
  countedQuantity: number;
  countedBy: string;
  notes?: string;
}

class CreateAdjustmentDto {
  itemId: string;
  sku: string;
  reason: AdjustmentReason;
  previousQuantity: number;
  newQuantity: number;
  unitCost: number;
  sessionId?: string;
  notes?: string;
}

class CreateScheduleDto {
  warehouseId: string;
  countType: CountType;
  frequency: ReconciliationFrequency;
  itemSelection: ItemSelectionCriteria;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

@ApiTags('Inventory Reconciliation / Reconciliere Stocuri')
@ApiBearerAuth()
@Controller('inventory/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class InventoryReconciliationController {
  constructor(private readonly reconciliationService: InventoryReconciliationService) {}

  // ===== Count Sessions =====

  @Get(':userId/sessions')
  @ApiOperation({
    summary: 'Get all count sessions',
    description: 'Retrieve all stock count sessions for a user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse' })
  @ApiQuery({ name: 'status', required: false, enum: ['SCHEDULED', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'type', required: false, enum: ['FULL', 'CYCLE', 'SPOT', 'ANNUAL', 'PERPETUAL'] })
  @ApiResponse({ status: 200, description: 'List of count sessions' })
  async getCountSessions(
    @Param('userId') userId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: CountSessionStatus,
    @Query('type') type?: CountType,
  ): Promise<StockCountSession[]> {
    return this.reconciliationService.getCountSessions(userId, { warehouseId, status, type });
  }

  @Post(':userId/sessions')
  @ApiOperation({
    summary: 'Create count session',
    description: 'Create a new stock count session',
  })
  @ApiBody({ type: CreateCountSessionDto })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createCountSession(
    @Param('userId') userId: string,
    @Body() dto: CreateCountSessionDto,
  ): Promise<StockCountSession> {
    return this.reconciliationService.createCountSession(
      userId,
      dto.warehouseId,
      dto.type,
      new Date(dto.scheduledDate),
      { notes: dto.notes, itemSelection: dto.itemSelection }
    );
  }

  @Get(':userId/sessions/:sessionId')
  @ApiOperation({
    summary: 'Get count session details',
    description: 'Get detailed information about a specific count session',
  })
  @ApiResponse({ status: 200, description: 'Session details' })
  async getCountSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<StockCountSession> {
    return this.reconciliationService.getCountSession(sessionId);
  }

  @Post(':userId/sessions/:sessionId/start')
  @ApiOperation({
    summary: 'Start count session',
    description: 'Start a scheduled count session',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['countedBy'],
      properties: {
        countedBy: { type: 'string', description: 'Name/ID of person performing the count' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Session started' })
  async startCountSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: { countedBy: string },
  ): Promise<StockCountSession> {
    return this.reconciliationService.startCountSession(sessionId, body.countedBy);
  }

  @Post(':userId/sessions/:sessionId/items/:itemId/count')
  @ApiOperation({
    summary: 'Record item count',
    description: 'Record the physical count for an item in a session',
  })
  @ApiBody({ type: RecordCountDto })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Count recorded' })
  async recordCount(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @Param('itemId') itemId: string,
    @Body() dto: RecordCountDto,
  ) {
    return this.reconciliationService.recordCount(
      sessionId,
      itemId,
      dto.countedQuantity,
      dto.countedBy,
      dto.notes
    );
  }

  @Post(':userId/sessions/:sessionId/complete')
  @ApiOperation({
    summary: 'Complete count session',
    description: 'Complete a count session and generate final report',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['verifiedBy'],
      properties: {
        verifiedBy: { type: 'string', description: 'Name/ID of person verifying the count' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Session completed' })
  async completeCountSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: { verifiedBy: string },
  ): Promise<StockCountSession> {
    return this.reconciliationService.completeCountSession(sessionId, body.verifiedBy);
  }

  // ===== Variance Reports =====

  @Get(':userId/sessions/:sessionId/variance-report')
  @ApiOperation({
    summary: 'Get variance report',
    description: 'Generate variance analysis report for a count session',
  })
  @ApiResponse({ status: 200, description: 'Variance report' })
  async getVarianceReport(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<VarianceReport> {
    return this.reconciliationService.generateVarianceReport(sessionId);
  }

  // ===== Adjustments =====

  @Get(':userId/adjustments')
  @ApiOperation({
    summary: 'Get adjustments',
    description: 'Get all inventory adjustments for a user',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED'] })
  @ApiQuery({ name: 'reason', required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiResponse({ status: 200, description: 'List of adjustments' })
  async getAdjustments(
    @Param('userId') userId: string,
    @Query('status') status?: AdjustmentStatus,
    @Query('reason') reason?: AdjustmentReason,
    @Query('sessionId') sessionId?: string,
  ): Promise<InventoryAdjustment[]> {
    return this.reconciliationService.getAdjustments(userId, { status, reason, sessionId });
  }

  @Post(':userId/adjustments')
  @ApiOperation({
    summary: 'Create adjustment',
    description: 'Create a new inventory adjustment',
  })
  @ApiBody({ type: CreateAdjustmentDto })
  @ApiResponse({ status: 201, description: 'Adjustment created' })
  async createAdjustment(
    @Param('userId') userId: string,
    @Body() dto: CreateAdjustmentDto,
  ): Promise<InventoryAdjustment> {
    return this.reconciliationService.createAdjustment(
      userId,
      dto.itemId,
      dto.sku,
      dto.reason,
      dto.previousQuantity,
      dto.newQuantity,
      dto.unitCost,
      { sessionId: dto.sessionId, notes: dto.notes }
    );
  }

  @Post(':userId/adjustments/:adjustmentId/approve')
  @ApiOperation({
    summary: 'Approve adjustment',
    description: 'Approve a pending inventory adjustment',
  })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['approvedBy'],
      properties: {
        approvedBy: { type: 'string', description: 'Name/ID of approver' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Adjustment approved' })
  async approveAdjustment(
    @Param('userId') userId: string,
    @Param('adjustmentId') adjustmentId: string,
    @Body() body: { approvedBy: string },
  ): Promise<InventoryAdjustment> {
    return this.reconciliationService.approveAdjustment(adjustmentId, body.approvedBy);
  }

  @Post(':userId/adjustments/:adjustmentId/apply')
  @ApiOperation({
    summary: 'Apply adjustment',
    description: 'Apply an approved adjustment to update inventory',
  })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Adjustment applied' })
  async applyAdjustment(
    @Param('userId') userId: string,
    @Param('adjustmentId') adjustmentId: string,
  ): Promise<InventoryAdjustment> {
    return this.reconciliationService.applyAdjustment(adjustmentId);
  }

  // ===== Schedules =====

  @Get(':userId/schedules')
  @ApiOperation({
    summary: 'Get reconciliation schedules',
    description: 'Get all active reconciliation schedules',
  })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  async getSchedules(
    @Param('userId') userId: string,
  ): Promise<ReconciliationSchedule[]> {
    return this.reconciliationService.getSchedules(userId);
  }

  @Post(':userId/schedules')
  @ApiOperation({
    summary: 'Create schedule',
    description: 'Create a new reconciliation schedule',
  })
  @ApiBody({ type: CreateScheduleDto })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createSchedule(
    @Param('userId') userId: string,
    @Body() dto: CreateScheduleDto,
  ): Promise<ReconciliationSchedule> {
    return this.reconciliationService.createSchedule(
      userId,
      dto.warehouseId,
      dto.countType,
      dto.frequency,
      dto.itemSelection,
      { dayOfWeek: dto.dayOfWeek, dayOfMonth: dto.dayOfMonth }
    );
  }

  // ===== Dashboard =====

  @Get(':userId/dashboard')
  @ApiOperation({
    summary: 'Get reconciliation dashboard',
    description: 'Get dashboard with active sessions, pending adjustments, and stats',
  })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@Param('userId') userId: string) {
    return this.reconciliationService.getDashboard(userId);
  }
}
