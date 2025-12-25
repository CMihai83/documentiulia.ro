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
  CAPAService,
  CAPA,
  CAPAStatus,
  CAPAType,
  CAPAPriority,
  CAPASource,
  CreateCAPADto,
  RootCauseAnalysisDto,
  AddActionDto,
  CompleteActionDto,
  VerifyActionDto,
  CAPAVerificationDto,
  ScheduleEffectivenessCheckDto,
  CompleteEffectivenessCheckDto,
} from './capa.service';

@ApiTags('CAPA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('capa')
export class CAPAController {
  constructor(private readonly capaService: CAPAService) {}

  @Post()
  @ApiOperation({ summary: 'Create a CAPA' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'CAPA created successfully',
  })
  async createCAPA(@Request() req: any, @Body() dto: CreateCAPADto): Promise<CAPA> {
    return this.capaService.createCAPA(req.user.tenantId, dto);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Open a CAPA' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CAPA opened',
  })
  async openCAPA(@Request() req: any, @Param('id') id: string): Promise<CAPA> {
    return this.capaService.openCAPA(req.user.tenantId, id);
  }

  @Post(':id/investigation/start')
  @ApiOperation({ summary: 'Start CAPA investigation' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Investigation started',
  })
  async startInvestigation(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<CAPA> {
    return this.capaService.startInvestigation(req.user.tenantId, id);
  }

  @Post(':id/root-cause-analysis')
  @ApiOperation({ summary: 'Record root cause analysis' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Root cause analysis recorded',
  })
  async recordRootCauseAnalysis(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RootCauseAnalysisDto,
  ): Promise<CAPA> {
    return this.capaService.recordRootCauseAnalysis(req.user.tenantId, id, dto);
  }

  @Post(':id/actions')
  @ApiOperation({ summary: 'Add action to CAPA' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action added',
  })
  async addAction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AddActionDto,
  ): Promise<CAPA> {
    return this.capaService.addAction(req.user.tenantId, id, dto);
  }

  @Post(':id/implementation/start')
  @ApiOperation({ summary: 'Start CAPA implementation' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Implementation started',
  })
  async startImplementation(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<CAPA> {
    return this.capaService.startImplementation(req.user.tenantId, id);
  }

  @Post(':id/actions/:actionId/start')
  @ApiOperation({ summary: 'Start an action' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiParam({ name: 'actionId', description: 'Action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action started',
  })
  async startAction(
    @Request() req: any,
    @Param('id') id: string,
    @Param('actionId') actionId: string,
  ): Promise<CAPA> {
    return this.capaService.startAction(req.user.tenantId, id, actionId);
  }

  @Post(':id/actions/:actionId/complete')
  @ApiOperation({ summary: 'Complete an action' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiParam({ name: 'actionId', description: 'Action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action completed',
  })
  async completeAction(
    @Request() req: any,
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() dto: CompleteActionDto,
  ): Promise<CAPA> {
    return this.capaService.completeAction(req.user.tenantId, id, actionId, dto);
  }

  @Post(':id/actions/:actionId/verify')
  @ApiOperation({ summary: 'Verify an action' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiParam({ name: 'actionId', description: 'Action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action verified',
  })
  async verifyAction(
    @Request() req: any,
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() dto: VerifyActionDto,
  ): Promise<CAPA> {
    return this.capaService.verifyAction(req.user.tenantId, id, actionId, dto);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify CAPA' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CAPA verified',
  })
  async verifyCAPA(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CAPAVerificationDto,
  ): Promise<CAPA> {
    return this.capaService.verifyCapa(req.user.tenantId, id, dto);
  }

  @Post(':id/effectiveness-check/schedule')
  @ApiOperation({ summary: 'Schedule effectiveness check' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Effectiveness check scheduled',
  })
  async scheduleEffectivenessCheck(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ScheduleEffectivenessCheckDto,
  ): Promise<CAPA> {
    return this.capaService.scheduleEffectivenessCheck(req.user.tenantId, id, dto);
  }

  @Post(':id/effectiveness-check/complete')
  @ApiOperation({ summary: 'Complete effectiveness check' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Effectiveness check completed',
  })
  async completeEffectivenessCheck(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteEffectivenessCheckDto,
  ): Promise<CAPA> {
    return this.capaService.completeEffectivenessCheck(req.user.tenantId, id, dto);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close CAPA' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CAPA closed',
  })
  async closeCAPA(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { closedBy: string; closedByName: string; notes?: string },
  ): Promise<CAPA> {
    return this.capaService.closeCAPA(
      req.user.tenantId,
      id,
      dto.closedBy,
      dto.closedByName,
      dto.notes,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel CAPA' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CAPA cancelled',
  })
  async cancelCAPA(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<CAPA> {
    return this.capaService.cancelCAPA(req.user.tenantId, id, reason);
  }

  @Post(':id/cost')
  @ApiOperation({ summary: 'Set CAPA cost' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cost set',
  })
  async setCost(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { actualCost: number; currency: string },
  ): Promise<CAPA> {
    return this.capaService.setCost(
      req.user.tenantId,
      id,
      dto.actualCost,
      dto.currency,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List CAPAs' })
  @ApiQuery({ name: 'status', enum: CAPAStatus, required: false })
  @ApiQuery({ name: 'type', enum: CAPAType, required: false })
  @ApiQuery({ name: 'priority', enum: CAPAPriority, required: false })
  @ApiQuery({ name: 'source', enum: CAPASource, required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'ncrId', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'processId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'dateFrom', type: Date, required: false })
  @ApiQuery({ name: 'dateTo', type: Date, required: false })
  @ApiQuery({ name: 'overdue', type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of CAPAs',
  })
  async listCAPAs(
    @Request() req: any,
    @Query('status') status?: CAPAStatus,
    @Query('type') type?: CAPAType,
    @Query('priority') priority?: CAPAPriority,
    @Query('source') source?: CAPASource,
    @Query('ownerId') ownerId?: string,
    @Query('ncrId') ncrId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('productId') productId?: string,
    @Query('processId') processId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('overdue') overdue?: boolean,
  ): Promise<CAPA[]> {
    return this.capaService.listCAPAs(req.user.tenantId, {
      status,
      type,
      priority,
      source,
      ownerId,
      ncrId,
      supplierId,
      productId,
      processId,
      departmentId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      overdue,
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get CAPA metrics' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CAPA metrics',
  })
  async getCAPAMetrics(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any> {
    return this.capaService.getCAPAMetrics(
      req.user.tenantId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get CAPA details' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CAPA details',
  })
  async getCAPA(@Request() req: any, @Param('id') id: string): Promise<CAPA> {
    return this.capaService.getCAPA(req.user.tenantId, id);
  }
}
