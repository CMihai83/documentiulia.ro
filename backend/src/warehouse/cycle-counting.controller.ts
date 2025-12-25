import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CycleCountingService,
  CycleCountPlan,
  CountTask,
  InventoryAdjustment,
  CreateCycleCountPlanDto,
  AddCountTaskDto,
  RecordCountDto,
  CreateAdjustmentDto,
  CycleCountStatus,
  CountType,
  AdjustmentStatus,
  AdjustmentType,
} from './cycle-counting.service';

@ApiTags('Cycle Counts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cycle-counts')
export class CycleCountsController {
  constructor(private readonly cycleCountingService: CycleCountingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a cycle count plan' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Cycle count plan created successfully',
  })
  async createCycleCountPlan(
    @Request() req: any,
    @Body() dto: CreateCycleCountPlanDto,
  ): Promise<CycleCountPlan> {
    return this.cycleCountingService.createCycleCountPlan(req.user.tenantId, dto);
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Add tasks to cycle count plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tasks added successfully',
  })
  async addTasksToPlan(
    @Request() req: any,
    @Param('id') id: string,
    @Body() tasks: AddCountTaskDto[],
  ): Promise<CycleCountPlan> {
    return this.cycleCountingService.addTasksToPlan(req.user.tenantId, id, tasks);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start cycle count' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cycle count started',
  })
  async startCycleCount(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<CycleCountPlan> {
    return this.cycleCountingService.startCycleCount(req.user.tenantId, id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit cycle count for approval' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Submitted for approval',
  })
  async submitForApproval(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<CycleCountPlan> {
    return this.cycleCountingService.submitPlanForApproval(req.user.tenantId, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve cycle count' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cycle count approved',
  })
  async approveCycleCount(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<CycleCountPlan> {
    return this.cycleCountingService.approveCycleCount(
      req.user.tenantId,
      id,
      req.user.userId,
    );
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete cycle count and create adjustments' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cycle count completed',
  })
  async completeCycleCount(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ plan: CycleCountPlan; adjustments: InventoryAdjustment[] }> {
    return this.cycleCountingService.completeCycleCount(req.user.tenantId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel cycle count' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cycle count cancelled',
  })
  async cancelCycleCount(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<CycleCountPlan> {
    return this.cycleCountingService.cancelCycleCount(
      req.user.tenantId,
      id,
      reason,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List cycle count plans' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', enum: CycleCountStatus, required: false })
  @ApiQuery({ name: 'countType', enum: CountType, required: false })
  @ApiQuery({ name: 'dateFrom', type: Date, required: false })
  @ApiQuery({ name: 'dateTo', type: Date, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of cycle count plans',
  })
  async listCycleCountPlans(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: CycleCountStatus,
    @Query('countType') countType?: CountType,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<CycleCountPlan[]> {
    return this.cycleCountingService.listCycleCountPlans(req.user.tenantId, {
      warehouseId,
      status,
      countType,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cycle count plan details' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan details',
  })
  async getCycleCountPlan(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<CycleCountPlan> {
    return this.cycleCountingService.getCycleCountPlan(req.user.tenantId, id);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'List count tasks for plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of count tasks',
  })
  async listCountTasks(
    @Request() req: any,
    @Param('id') id: string,
    @Query('status') status?: CountTask['status'],
    @Query('assignedTo') assignedTo?: string,
    @Query('zoneId') zoneId?: string,
  ): Promise<CountTask[]> {
    return this.cycleCountingService.listCountTasks(req.user.tenantId, id, {
      status,
      assignedTo,
      zoneId,
    });
  }

  @Get('warehouse/:warehouseId/analytics')
  @ApiOperation({ summary: 'Get cycle count analytics' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cycle count analytics',
  })
  async getCycleCountAnalytics(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any> {
    return this.cycleCountingService.getCycleCountAnalytics(
      req.user.tenantId,
      warehouseId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}

@ApiTags('Count Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('count-tasks')
export class CountTasksController {
  constructor(private readonly cycleCountingService: CycleCountingService) {}

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign count task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task assigned',
  })
  async assignCountTask(
    @Request() req: any,
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
    @Body('assignedToName') assignedToName: string,
  ): Promise<CountTask> {
    return this.cycleCountingService.assignCountTask(
      req.user.tenantId,
      id,
      assignedTo,
      assignedToName,
    );
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start count task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task started',
  })
  async startCountTask(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<CountTask> {
    return this.cycleCountingService.startCountTask(req.user.tenantId, id);
  }

  @Post(':id/count')
  @ApiOperation({ summary: 'Record count' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Count recorded',
  })
  async recordCount(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RecordCountDto,
  ): Promise<CountTask> {
    return this.cycleCountingService.recordCount(req.user.tenantId, id, dto);
  }

  @Post(':id/recount')
  @ApiOperation({ summary: 'Request recount' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recount requested',
  })
  async requestRecount(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<CountTask> {
    return this.cycleCountingService.requestRecount(
      req.user.tenantId,
      id,
      reason,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get count task details' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task details',
  })
  async getCountTask(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<CountTask> {
    return this.cycleCountingService.getCountTask(req.user.tenantId, id);
  }
}

@ApiTags('Inventory Adjustments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory-adjustments')
export class InventoryAdjustmentsController {
  constructor(private readonly cycleCountingService: CycleCountingService) {}

  @Post()
  @ApiOperation({ summary: 'Create inventory adjustment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Adjustment created successfully',
  })
  async createAdjustment(
    @Request() req: any,
    @Body() dto: CreateAdjustmentDto,
  ): Promise<InventoryAdjustment> {
    return this.cycleCountingService.createAdjustment(req.user.tenantId, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve adjustment' })
  @ApiParam({ name: 'id', description: 'Adjustment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Adjustment approved',
  })
  async approveAdjustment(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<InventoryAdjustment> {
    return this.cycleCountingService.approveAdjustment(
      req.user.tenantId,
      id,
      req.user.userId,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject adjustment' })
  @ApiParam({ name: 'id', description: 'Adjustment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Adjustment rejected',
  })
  async rejectAdjustment(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<InventoryAdjustment> {
    return this.cycleCountingService.rejectAdjustment(
      req.user.tenantId,
      id,
      req.user.userId,
      reason,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post approved adjustment' })
  @ApiParam({ name: 'id', description: 'Adjustment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Adjustment posted',
  })
  async postAdjustment(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<InventoryAdjustment> {
    return this.cycleCountingService.postAdjustment(req.user.tenantId, id);
  }

  @Get()
  @ApiOperation({ summary: 'List inventory adjustments' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', enum: AdjustmentStatus, required: false })
  @ApiQuery({ name: 'type', enum: AdjustmentType, required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'dateFrom', type: Date, required: false })
  @ApiQuery({ name: 'dateTo', type: Date, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of adjustments',
  })
  async listAdjustments(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: AdjustmentStatus,
    @Query('type') type?: AdjustmentType,
    @Query('itemId') itemId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<InventoryAdjustment[]> {
    return this.cycleCountingService.listAdjustments(req.user.tenantId, {
      warehouseId,
      status,
      type,
      itemId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get adjustment details' })
  @ApiParam({ name: 'id', description: 'Adjustment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Adjustment details',
  })
  async getAdjustment(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<InventoryAdjustment> {
    return this.cycleCountingService.getAdjustment(req.user.tenantId, id);
  }

  @Get('warehouse/:warehouseId/analytics')
  @ApiOperation({ summary: 'Get adjustment analytics' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Adjustment analytics',
  })
  async getAdjustmentAnalytics(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any> {
    return this.cycleCountingService.getAdjustmentAnalytics(
      req.user.tenantId,
      warehouseId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}
