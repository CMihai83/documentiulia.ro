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
  PickingPackingService,
  PickWave,
  PickTask,
  PackingSession,
  CreatePickWaveDto,
  CreatePickTaskDto,
  AssignTaskDto,
  CompletePickDto,
  CreatePackingSessionDto,
  AddContainerDto,
  PackItemDto,
  SealContainerDto,
  PickWaveStatus,
  PickTaskStatus,
  PackingStatus,
} from './picking-packing.service';

@ApiTags('Pick Waves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pick-waves')
export class PickWavesController {
  constructor(private readonly pickPackService: PickingPackingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a pick wave' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pick wave created successfully',
  })
  async createPickWave(
    @Request() req: any,
    @Body() dto: CreatePickWaveDto,
  ): Promise<PickWave> {
    return this.pickPackService.createPickWave(req.user.tenantId, dto);
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Add tasks to pick wave' })
  @ApiParam({ name: 'id', description: 'Wave ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tasks added successfully',
  })
  async addTasksToWave(
    @Request() req: any,
    @Param('id') id: string,
    @Body() tasks: CreatePickTaskDto[],
  ): Promise<PickWave> {
    return this.pickPackService.addTasksToWave(req.user.tenantId, id, tasks);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Release pick wave' })
  @ApiParam({ name: 'id', description: 'Wave ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wave released',
  })
  async releasePickWave(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PickWave> {
    return this.pickPackService.releasePickWave(req.user.tenantId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel pick wave' })
  @ApiParam({ name: 'id', description: 'Wave ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wave cancelled',
  })
  async cancelPickWave(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<PickWave> {
    return this.pickPackService.cancelPickWave(req.user.tenantId, id, reason);
  }

  @Get()
  @ApiOperation({ summary: 'List pick waves' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'status', enum: PickWaveStatus, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of pick waves',
  })
  async listPickWaves(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: PickWaveStatus,
  ): Promise<PickWave[]> {
    return this.pickPackService.listPickWaves(
      req.user.tenantId,
      warehouseId,
      status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pick wave details' })
  @ApiParam({ name: 'id', description: 'Wave ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wave details',
  })
  async getPickWave(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PickWave> {
    return this.pickPackService.getPickWave(req.user.tenantId, id);
  }
}

@ApiTags('Pick Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pick-tasks')
export class PickTasksController {
  constructor(private readonly pickPackService: PickingPackingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a pick task' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pick task created successfully',
  })
  async createPickTask(
    @Request() req: any,
    @Body() dto: CreatePickTaskDto,
  ): Promise<PickTask> {
    return this.pickPackService.createPickTask(req.user.tenantId, dto);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign pick task to picker' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task assigned',
  })
  async assignPickTask(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AssignTaskDto,
  ): Promise<PickTask> {
    return this.pickPackService.assignPickTask(req.user.tenantId, id, dto);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start pick task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task started',
  })
  async startPickTask(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PickTask> {
    return this.pickPackService.startPickTask(req.user.tenantId, id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete pick task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task completed',
  })
  async completePickTask(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CompletePickDto,
  ): Promise<PickTask> {
    return this.pickPackService.completePickTask(req.user.tenantId, id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List pick tasks' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'waveId', required: false })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'status', enum: PickTaskStatus, required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of pick tasks',
  })
  async listPickTasks(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('waveId') waveId?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: PickTaskStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('zoneId') zoneId?: string,
  ): Promise<PickTask[]> {
    return this.pickPackService.listPickTasks(req.user.tenantId, {
      warehouseId,
      waveId,
      orderId,
      status,
      assignedTo,
      zoneId,
    });
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Get assigned tasks for current picker' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of assigned tasks',
  })
  async getMyTasks(@Request() req: any): Promise<PickTask[]> {
    return this.pickPackService.getPickerTasks(
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pick task details' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task details',
  })
  async getPickTask(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PickTask> {
    return this.pickPackService.getPickTask(req.user.tenantId, id);
  }

  @Get('warehouse/:warehouseId/performance')
  @ApiOperation({ summary: 'Get picking performance analytics' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Picking performance data',
  })
  async getPickingPerformance(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any> {
    return this.pickPackService.getPickingPerformance(
      req.user.tenantId,
      warehouseId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}

@ApiTags('Packing Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('packing-sessions')
export class PackingSessionsController {
  constructor(private readonly pickPackService: PickingPackingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a packing session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Packing session created successfully',
  })
  async createPackingSession(
    @Request() req: any,
    @Body() dto: CreatePackingSessionDto,
  ): Promise<PackingSession> {
    return this.pickPackService.createPackingSession(req.user.tenantId, dto);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start packing session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session started',
  })
  async startPackingSession(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PackingSession> {
    return this.pickPackService.startPackingSession(req.user.tenantId, id);
  }

  @Post(':id/containers')
  @ApiOperation({ summary: 'Add container to session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Container added',
  })
  async addContainer(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AddContainerDto,
  ): Promise<PackingSession> {
    return this.pickPackService.addContainer(req.user.tenantId, id, dto);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Pack item into container' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item packed',
  })
  async packItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: PackItemDto,
  ): Promise<PackingSession> {
    return this.pickPackService.packItem(req.user.tenantId, id, dto);
  }

  @Post(':id/containers/:containerId/seal')
  @ApiOperation({ summary: 'Seal a container' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiParam({ name: 'containerId', description: 'Container ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Container sealed',
  })
  async sealContainer(
    @Request() req: any,
    @Param('id') id: string,
    @Param('containerId') containerId: string,
    @Body() dto: SealContainerDto,
  ): Promise<PackingSession> {
    return this.pickPackService.sealContainer(
      req.user.tenantId,
      id,
      containerId,
      dto,
    );
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete packing session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session completed',
  })
  async completePackingSession(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PackingSession> {
    return this.pickPackService.completePackingSession(req.user.tenantId, id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify packing session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session verified',
  })
  async verifyPackingSession(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PackingSession> {
    return this.pickPackService.verifyPackingSession(
      req.user.tenantId,
      id,
      req.user.userId,
    );
  }

  @Post(':id/shipping-label')
  @ApiOperation({ summary: 'Generate shipping label' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Label generated',
  })
  async generateShippingLabel(
    @Request() req: any,
    @Param('id') id: string,
    @Body('labelUrl') labelUrl: string,
  ): Promise<PackingSession> {
    return this.pickPackService.generateShippingLabel(
      req.user.tenantId,
      id,
      labelUrl,
    );
  }

  @Post(':id/ship')
  @ApiOperation({ summary: 'Mark session as shipped' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session shipped',
  })
  async markShipped(
    @Request() req: any,
    @Param('id') id: string,
    @Body('shipmentId') shipmentId: string,
  ): Promise<PackingSession> {
    return this.pickPackService.markShipped(req.user.tenantId, id, shipmentId);
  }

  @Get()
  @ApiOperation({ summary: 'List packing sessions' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'status', enum: PackingStatus, required: false })
  @ApiQuery({ name: 'packedBy', required: false })
  @ApiQuery({ name: 'dateFrom', type: Date, required: false })
  @ApiQuery({ name: 'dateTo', type: Date, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of packing sessions',
  })
  async listPackingSessions(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: PackingStatus,
    @Query('packedBy') packedBy?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<PackingSession[]> {
    return this.pickPackService.listPackingSessions(req.user.tenantId, {
      warehouseId,
      orderId,
      status,
      packedBy,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get packing session details' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session details',
  })
  async getPackingSession(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PackingSession> {
    return this.pickPackService.getPackingSession(req.user.tenantId, id);
  }

  @Get('warehouse/:warehouseId/performance')
  @ApiOperation({ summary: 'Get packing performance analytics' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Packing performance data',
  })
  async getPackingPerformance(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any> {
    return this.pickPackService.getPackingPerformance(
      req.user.tenantId,
      warehouseId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}
