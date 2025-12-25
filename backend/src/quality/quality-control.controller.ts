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
  QualityControlService,
  QualityInspection,
  QualityChecklist,
  DefectCode,
  CreateInspectionDto,
  RecordCheckResultDto,
  RecordDefectDto,
  CompleteInspectionDto,
  CreateChecklistDto,
  CreateDefectCodeDto,
  InspectionType,
  InspectionStatus,
  InspectionResult,
  InspectionCheck,
  DefectSeverity,
} from './quality-control.service';

@ApiTags('Quality Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality-inspections')
export class QualityInspectionsController {
  constructor(private readonly qualityService: QualityControlService) {}

  @Post()
  @ApiOperation({ summary: 'Create a quality inspection' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Inspection created successfully',
  })
  async createInspection(
    @Request() req: any,
    @Body() dto: CreateInspectionDto,
  ): Promise<QualityInspection> {
    return this.qualityService.createInspection(req.user.tenantId, dto);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start an inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection started',
  })
  async startInspection(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityInspection> {
    return this.qualityService.startInspection(req.user.tenantId, id);
  }

  @Post(':id/checks')
  @ApiOperation({ summary: 'Add a check to inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Check added',
  })
  async addCheck(
    @Request() req: any,
    @Param('id') id: string,
    @Body() check: Omit<InspectionCheck, 'id' | 'result'>,
  ): Promise<QualityInspection> {
    return this.qualityService.addCheck(req.user.tenantId, id, check);
  }

  @Post(':id/checks/result')
  @ApiOperation({ summary: 'Record check result' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Result recorded',
  })
  async recordCheckResult(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RecordCheckResultDto,
  ): Promise<QualityInspection> {
    return this.qualityService.recordCheckResult(req.user.tenantId, id, dto);
  }

  @Post(':id/defects')
  @ApiOperation({ summary: 'Record a defect' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Defect recorded',
  })
  async recordDefect(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RecordDefectDto,
  ): Promise<QualityInspection> {
    return this.qualityService.recordDefect(req.user.tenantId, id, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection completed',
  })
  async completeInspection(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteInspectionDto,
  ): Promise<QualityInspection> {
    return this.qualityService.completeInspection(req.user.tenantId, id, dto);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection reviewed',
  })
  async reviewInspection(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { approved: boolean; notes?: string },
  ): Promise<QualityInspection> {
    return this.qualityService.reviewInspection(
      req.user.tenantId,
      id,
      dto.approved,
      req.user.userId,
      req.user.userName || 'Reviewer',
      dto.notes,
    );
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Put inspection on hold' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection on hold',
  })
  async putOnHold(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<QualityInspection> {
    return this.qualityService.putOnHold(req.user.tenantId, id, reason);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Release inspection from hold' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection released',
  })
  async releaseFromHold(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityInspection> {
    return this.qualityService.releaseFromHold(req.user.tenantId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection cancelled',
  })
  async cancelInspection(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<QualityInspection> {
    return this.qualityService.cancelInspection(req.user.tenantId, id, reason);
  }

  @Get()
  @ApiOperation({ summary: 'List inspections' })
  @ApiQuery({ name: 'type', enum: InspectionType, required: false })
  @ApiQuery({ name: 'status', enum: InspectionStatus, required: false })
  @ApiQuery({ name: 'result', enum: InspectionResult, required: false })
  @ApiQuery({ name: 'referenceType', required: false })
  @ApiQuery({ name: 'referenceId', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'dateFrom', type: Date, required: false })
  @ApiQuery({ name: 'dateTo', type: Date, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of inspections',
  })
  async listInspections(
    @Request() req: any,
    @Query('type') type?: InspectionType,
    @Query('status') status?: InspectionStatus,
    @Query('result') result?: InspectionResult,
    @Query('referenceType') referenceType?: QualityInspection['referenceType'],
    @Query('referenceId') referenceId?: string,
    @Query('itemId') itemId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<QualityInspection[]> {
    return this.qualityService.listInspections(req.user.tenantId, {
      type,
      status,
      result,
      referenceType,
      referenceId,
      itemId,
      supplierId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get quality metrics' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quality metrics',
  })
  async getQualityMetrics(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('supplierId') supplierId?: string,
    @Query('itemId') itemId?: string,
  ): Promise<any> {
    return this.qualityService.getQualityMetrics(
      req.user.tenantId,
      new Date(dateFrom),
      new Date(dateTo),
      { supplierId, itemId },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inspection details' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inspection details',
  })
  async getInspection(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityInspection> {
    return this.qualityService.getInspection(req.user.tenantId, id);
  }
}

@ApiTags('Quality Checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality-checklists')
export class QualityChecklistsController {
  constructor(private readonly qualityService: QualityControlService) {}

  @Post()
  @ApiOperation({ summary: 'Create a quality checklist' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Checklist created successfully',
  })
  async createChecklist(
    @Request() req: any,
    @Body() dto: CreateChecklistDto,
  ): Promise<QualityChecklist> {
    return this.qualityService.createChecklist(req.user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a checklist' })
  @ApiParam({ name: 'id', description: 'Checklist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Checklist updated',
  })
  async updateChecklist(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateChecklistDto>,
  ): Promise<QualityChecklist> {
    return this.qualityService.updateChecklist(req.user.tenantId, id, dto);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle checklist active status' })
  @ApiParam({ name: 'id', description: 'Checklist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Checklist toggled',
  })
  async toggleChecklist(
    @Request() req: any,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<QualityChecklist> {
    return this.qualityService.toggleChecklist(req.user.tenantId, id, isActive);
  }

  @Get()
  @ApiOperation({ summary: 'List checklists' })
  @ApiQuery({ name: 'inspectionType', enum: InspectionType, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of checklists',
  })
  async listChecklists(
    @Request() req: any,
    @Query('inspectionType') inspectionType?: InspectionType,
    @Query('isActive') isActive?: boolean,
  ): Promise<QualityChecklist[]> {
    return this.qualityService.listChecklists(req.user.tenantId, {
      inspectionType,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get checklist details' })
  @ApiParam({ name: 'id', description: 'Checklist ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Checklist details',
  })
  async getChecklist(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityChecklist> {
    return this.qualityService.getChecklist(req.user.tenantId, id);
  }
}

@ApiTags('Defect Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('defect-codes')
export class DefectCodesController {
  constructor(private readonly qualityService: QualityControlService) {}

  @Post()
  @ApiOperation({ summary: 'Create a defect code' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Defect code created successfully',
  })
  async createDefectCode(
    @Request() req: any,
    @Body() dto: CreateDefectCodeDto,
  ): Promise<DefectCode> {
    return this.qualityService.createDefectCode(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List defect codes' })
  @ApiQuery({ name: 'severity', enum: DefectSeverity, required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of defect codes',
  })
  async listDefectCodes(
    @Request() req: any,
    @Query('severity') severity?: DefectSeverity,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<DefectCode[]> {
    return this.qualityService.listDefectCodes(req.user.tenantId, {
      severity,
      category,
      isActive,
    });
  }
}
