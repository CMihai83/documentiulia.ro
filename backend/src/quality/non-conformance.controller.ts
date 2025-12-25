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
  NonConformanceService,
  NonConformanceReport,
  NCRStatus,
  NCRType,
  NCRSeverity,
  NCRSource,
  CreateNCRDto,
  AddContainmentActionDto,
  SetDispositionDto,
  InvestigationDto,
  ContainmentAction,
} from './non-conformance.service';

@ApiTags('Non-Conformance Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('non-conformance')
export class NonConformanceController {
  constructor(private readonly ncrService: NonConformanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a non-conformance report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'NCR created successfully',
  })
  async createNCR(
    @Request() req: any,
    @Body() dto: CreateNCRDto,
  ): Promise<NonConformanceReport> {
    return this.ncrService.createNCR(req.user.tenantId, dto);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Open an NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NCR opened',
  })
  async openNCR(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<NonConformanceReport> {
    return this.ncrService.openNCR(req.user.tenantId, id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign NCR to user' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NCR assigned',
  })
  async assignNCR(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { assignedTo: string; assignedToName: string },
  ): Promise<NonConformanceReport> {
    return this.ncrService.assignNCR(
      req.user.tenantId,
      id,
      dto.assignedTo,
      dto.assignedToName,
    );
  }

  @Post(':id/containment-actions')
  @ApiOperation({ summary: 'Add containment action to NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Containment action added',
  })
  async addContainmentAction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AddContainmentActionDto,
  ): Promise<NonConformanceReport> {
    return this.ncrService.addContainmentAction(req.user.tenantId, id, dto);
  }

  @Put(':id/containment-actions/:actionId')
  @ApiOperation({ summary: 'Update containment action status' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiParam({ name: 'actionId', description: 'Action ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action updated',
  })
  async updateContainmentAction(
    @Request() req: any,
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() dto: { status: ContainmentAction['status']; notes?: string },
  ): Promise<NonConformanceReport> {
    return this.ncrService.updateContainmentAction(
      req.user.tenantId,
      id,
      actionId,
      dto.status,
      dto.notes,
    );
  }

  @Post(':id/investigation/start')
  @ApiOperation({ summary: 'Start investigation' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Investigation started',
  })
  async startInvestigation(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<NonConformanceReport> {
    return this.ncrService.startInvestigation(req.user.tenantId, id);
  }

  @Post(':id/investigation/complete')
  @ApiOperation({ summary: 'Record investigation findings' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Investigation recorded',
  })
  async recordInvestigation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: InvestigationDto,
  ): Promise<NonConformanceReport> {
    return this.ncrService.recordInvestigation(req.user.tenantId, id, dto);
  }

  @Post(':id/disposition')
  @ApiOperation({ summary: 'Set disposition for NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disposition set',
  })
  async setDisposition(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SetDispositionDto,
  ): Promise<NonConformanceReport> {
    return this.ncrService.setDisposition(req.user.tenantId, id, dto);
  }

  @Post(':id/disposition/implement')
  @ApiOperation({ summary: 'Implement disposition' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disposition implemented',
  })
  async implementDisposition(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { implementedBy: string; implementedByName: string },
  ): Promise<NonConformanceReport> {
    return this.ncrService.implementDisposition(
      req.user.tenantId,
      id,
      dto.implementedBy,
      dto.implementedByName,
    );
  }

  @Post(':id/verification/request')
  @ApiOperation({ summary: 'Request verification' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification requested',
  })
  async requestVerification(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<NonConformanceReport> {
    return this.ncrService.requestVerification(req.user.tenantId, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Verify and close NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NCR closed',
  })
  async verifyAndClose(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { verifierId: string; verifierName: string; notes?: string },
  ): Promise<NonConformanceReport> {
    return this.ncrService.verifyAndClose(
      req.user.tenantId,
      id,
      dto.verifierId,
      dto.verifierName,
      dto.notes,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NCR cancelled',
  })
  async cancelNCR(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<NonConformanceReport> {
    return this.ncrService.cancelNCR(req.user.tenantId, id, reason);
  }

  @Post(':id/link-capa')
  @ApiOperation({ summary: 'Link NCR to CAPA' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CAPA linked',
  })
  async linkToCAPA(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { capaId: string; capaNumber: string },
  ): Promise<NonConformanceReport> {
    return this.ncrService.linkToCAPA(
      req.user.tenantId,
      id,
      dto.capaId,
      dto.capaNumber,
    );
  }

  @Post(':id/cost')
  @ApiOperation({ summary: 'Set NCR cost' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cost set',
  })
  async setCost(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { cost: number; currency: string },
  ): Promise<NonConformanceReport> {
    return this.ncrService.setCost(req.user.tenantId, id, dto.cost, dto.currency);
  }

  @Get()
  @ApiOperation({ summary: 'List NCRs' })
  @ApiQuery({ name: 'status', enum: NCRStatus, required: false })
  @ApiQuery({ name: 'type', enum: NCRType, required: false })
  @ApiQuery({ name: 'severity', enum: NCRSeverity, required: false })
  @ApiQuery({ name: 'source', enum: NCRSource, required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'dateFrom', type: Date, required: false })
  @ApiQuery({ name: 'dateTo', type: Date, required: false })
  @ApiQuery({ name: 'hasCAPA', type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of NCRs',
  })
  async listNCRs(
    @Request() req: any,
    @Query('status') status?: NCRStatus,
    @Query('type') type?: NCRType,
    @Query('severity') severity?: NCRSeverity,
    @Query('source') source?: NCRSource,
    @Query('supplierId') supplierId?: string,
    @Query('customerId') customerId?: string,
    @Query('itemId') itemId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('hasCAPA') hasCAPA?: boolean,
  ): Promise<NonConformanceReport[]> {
    return this.ncrService.listNCRs(req.user.tenantId, {
      status,
      type,
      severity,
      source,
      supplierId,
      customerId,
      itemId,
      assignedTo,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      hasCAPA,
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get NCR metrics' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NCR metrics',
  })
  async getNCRMetrics(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any> {
    return this.ncrService.getNCRMetrics(
      req.user.tenantId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get NCR details' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NCR details',
  })
  async getNCR(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<NonConformanceReport> {
    return this.ncrService.getNCR(req.user.tenantId, id);
  }
}
