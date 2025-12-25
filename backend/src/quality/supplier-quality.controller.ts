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
  SupplierQualityService,
  SupplierQualification,
  SupplierQualificationStatus,
  SupplierRiskLevel,
  CreateSupplierQualificationDto,
  AddApprovedCategoryDto,
  AddCertificationDto,
  CreateEvaluationDto,
  ScheduleAuditDto,
  CompleteAuditDto,
  RecordPerformanceDto,
} from './supplier-quality.service';

@ApiTags('Supplier Quality')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('supplier-quality')
export class SupplierQualityController {
  constructor(private readonly supplierQualityService: SupplierQualityService) {}

  @Post()
  @ApiOperation({ summary: 'Create supplier qualification record' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Qualification created successfully',
  })
  async createSupplierQualification(
    @Request() req: any,
    @Body() dto: CreateSupplierQualificationDto,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.createSupplierQualification(
      req.user.tenantId,
      dto,
    );
  }

  @Post(':id/start-evaluation')
  @ApiOperation({ summary: 'Start supplier evaluation' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Evaluation started',
  })
  async startEvaluation(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.startEvaluation(req.user.tenantId, id);
  }

  @Post(':id/qualify')
  @ApiOperation({ summary: 'Qualify supplier' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier qualified',
  })
  async qualifySupplier(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    dto: {
      qualifiedBy: string;
      qualifiedByName: string;
      expirationDate?: Date;
      conditions?: string[];
    },
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.qualifySupplier(
      req.user.tenantId,
      id,
      dto.qualifiedBy,
      dto.qualifiedByName,
      dto.expirationDate,
      dto.conditions,
    );
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Put supplier on hold' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier on hold',
  })
  async putOnHold(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.putOnHold(req.user.tenantId, id, reason);
  }

  @Post(':id/disqualify')
  @ApiOperation({ summary: 'Disqualify supplier' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier disqualified',
  })
  async disqualifySupplier(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.disqualifySupplier(
      req.user.tenantId,
      id,
      reason,
    );
  }

  @Post(':id/risk-level')
  @ApiOperation({ summary: 'Set supplier risk level' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Risk level set',
  })
  async setRiskLevel(
    @Request() req: any,
    @Param('id') id: string,
    @Body('riskLevel') riskLevel: SupplierRiskLevel,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.setRiskLevel(
      req.user.tenantId,
      id,
      riskLevel,
    );
  }

  @Post(':id/categories')
  @ApiOperation({ summary: 'Add approved category' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category added',
  })
  async addApprovedCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AddApprovedCategoryDto,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.addApprovedCategory(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Post(':id/categories/:categoryId/remove')
  @ApiOperation({ summary: 'Remove approved category' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category removed',
  })
  async removeApprovedCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.removeApprovedCategory(
      req.user.tenantId,
      id,
      categoryId,
    );
  }

  @Post(':id/certifications')
  @ApiOperation({ summary: 'Add certification' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification added',
  })
  async addCertification(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AddCertificationDto,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.addCertification(req.user.tenantId, id, dto);
  }

  @Post(':id/certifications/:certificationId/verify')
  @ApiOperation({ summary: 'Verify certification' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiParam({ name: 'certificationId', description: 'Certification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification verified',
  })
  async verifyCertification(
    @Request() req: any,
    @Param('id') id: string,
    @Param('certificationId') certificationId: string,
    @Body('verifiedBy') verifiedBy: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.verifyCertification(
      req.user.tenantId,
      id,
      certificationId,
      verifiedBy,
    );
  }

  @Post(':id/evaluations')
  @ApiOperation({ summary: 'Create evaluation' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Evaluation created',
  })
  async createEvaluation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateEvaluationDto,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.createEvaluation(req.user.tenantId, id, dto);
  }

  @Post(':id/audits')
  @ApiOperation({ summary: 'Schedule audit' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit scheduled',
  })
  async scheduleAudit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ScheduleAuditDto,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.scheduleAudit(req.user.tenantId, id, dto);
  }

  @Post(':id/audits/:auditId/start')
  @ApiOperation({ summary: 'Start audit' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiParam({ name: 'auditId', description: 'Audit ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit started',
  })
  async startAudit(
    @Request() req: any,
    @Param('id') id: string,
    @Param('auditId') auditId: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.startAudit(req.user.tenantId, id, auditId);
  }

  @Post(':id/audits/:auditId/complete')
  @ApiOperation({ summary: 'Complete audit' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiParam({ name: 'auditId', description: 'Audit ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit completed',
  })
  async completeAudit(
    @Request() req: any,
    @Param('id') id: string,
    @Param('auditId') auditId: string,
    @Body() dto: CompleteAuditDto,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.completeAudit(
      req.user.tenantId,
      id,
      auditId,
      dto,
    );
  }

  @Post(':id/audits/:auditId/cancel')
  @ApiOperation({ summary: 'Cancel audit' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiParam({ name: 'auditId', description: 'Audit ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit cancelled',
  })
  async cancelAudit(
    @Request() req: any,
    @Param('id') id: string,
    @Param('auditId') auditId: string,
    @Body('reason') reason: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.cancelAudit(
      req.user.tenantId,
      id,
      auditId,
      reason,
    );
  }

  @Post(':id/performance')
  @ApiOperation({ summary: 'Record performance' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance recorded',
  })
  async recordPerformance(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RecordPerformanceDto,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.recordPerformance(req.user.tenantId, id, dto);
  }

  @Post(':id/link-ncr')
  @ApiOperation({ summary: 'Link NCR to supplier' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NCR linked',
  })
  async linkNCR(
    @Request() req: any,
    @Param('id') id: string,
    @Body('ncrId') ncrId: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.linkNCR(req.user.tenantId, id, ncrId);
  }

  @Post(':id/link-capa')
  @ApiOperation({ summary: 'Link CAPA to supplier' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CAPA linked',
  })
  async linkCAPA(
    @Request() req: any,
    @Param('id') id: string,
    @Body('capaId') capaId: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.linkCAPA(req.user.tenantId, id, capaId);
  }

  @Get()
  @ApiOperation({ summary: 'List supplier qualifications' })
  @ApiQuery({ name: 'status', enum: SupplierQualificationStatus, required: false })
  @ApiQuery({ name: 'riskLevel', enum: SupplierRiskLevel, required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'minScore', type: Number, required: false })
  @ApiQuery({ name: 'maxScore', type: Number, required: false })
  @ApiQuery({ name: 'expiringWithin', type: Number, required: false })
  @ApiQuery({ name: 'auditDueWithin', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of supplier qualifications',
  })
  async listSupplierQualifications(
    @Request() req: any,
    @Query('status') status?: SupplierQualificationStatus,
    @Query('riskLevel') riskLevel?: SupplierRiskLevel,
    @Query('categoryId') categoryId?: string,
    @Query('minScore') minScore?: number,
    @Query('maxScore') maxScore?: number,
    @Query('expiringWithin') expiringWithin?: number,
    @Query('auditDueWithin') auditDueWithin?: number,
  ): Promise<SupplierQualification[]> {
    return this.supplierQualityService.listSupplierQualifications(req.user.tenantId, {
      status,
      riskLevel,
      categoryId,
      minScore,
      maxScore,
      expiringWithin,
      auditDueWithin,
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get supplier quality metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier quality metrics',
  })
  async getSupplierQualityMetrics(@Request() req: any): Promise<any> {
    return this.supplierQualityService.getSupplierQualityMetrics(req.user.tenantId);
  }

  @Get('supplier/:supplierId')
  @ApiOperation({ summary: 'Get qualification by supplier' })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier qualification',
  })
  async getBySupplier(
    @Request() req: any,
    @Param('supplierId') supplierId: string,
  ): Promise<SupplierQualification | null> {
    return this.supplierQualityService.getBySupplier(req.user.tenantId, supplierId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier qualification details' })
  @ApiParam({ name: 'id', description: 'Qualification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Qualification details',
  })
  async getSupplierQualification(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SupplierQualification> {
    return this.supplierQualityService.getSupplierQualification(req.user.tenantId, id);
  }
}
