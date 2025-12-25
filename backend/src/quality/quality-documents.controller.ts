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
  QualityDocumentsService,
  QualityDocument,
  Certification,
  QualityDocumentType,
  DocumentStatus,
  CertificationType,
  CertificationStatus,
  CreateDocumentDto,
  UpdateDocumentDto,
  SubmitForReviewDto,
  ReviewDocumentDto,
  ApproveDocumentDto,
  ReviseDocumentDto,
  CreateCertificationDto,
  RecordAuditDto,
  RenewCertificationDto,
} from './quality-documents.service';

@ApiTags('Quality Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality-documents')
export class QualityDocumentsController {
  constructor(private readonly documentsService: QualityDocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a quality document' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document created successfully',
  })
  async createDocument(
    @Request() req: any,
    @Body() dto: CreateDocumentDto,
  ): Promise<QualityDocument> {
    return this.documentsService.createDocument(req.user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document updated',
  })
  async updateDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<QualityDocument> {
    return this.documentsService.updateDocument(req.user.tenantId, id, dto);
  }

  @Post(':id/submit-for-review')
  @ApiOperation({ summary: 'Submit document for review' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document submitted for review',
  })
  async submitForReview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitForReviewDto,
  ): Promise<QualityDocument> {
    return this.documentsService.submitForReview(req.user.tenantId, id, dto);
  }

  @Post(':id/start-review')
  @ApiOperation({ summary: 'Start document review' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review started',
  })
  async startReview(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityDocument> {
    return this.documentsService.startReview(req.user.tenantId, id);
  }

  @Post(':id/complete-review')
  @ApiOperation({ summary: 'Complete document review' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review completed',
  })
  async completeReview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewDocumentDto,
  ): Promise<QualityDocument> {
    return this.documentsService.completeReview(req.user.tenantId, id, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document approved',
  })
  async approveDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveDocumentDto,
  ): Promise<QualityDocument> {
    return this.documentsService.approveDocument(
      req.user.tenantId,
      id,
      req.user.userId,
      req.user.userName || 'Approver',
      dto,
    );
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Release document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document released',
  })
  async releaseDocument(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityDocument> {
    return this.documentsService.releaseDocument(
      req.user.tenantId,
      id,
      req.user.userId,
      req.user.userName || 'Releaser',
    );
  }

  @Post(':id/revise')
  @ApiOperation({ summary: 'Revise document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document revised',
  })
  async reviseDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviseDocumentDto,
  ): Promise<QualityDocument> {
    return this.documentsService.reviseDocument(req.user.tenantId, id, dto);
  }

  @Post(':id/obsolete')
  @ApiOperation({ summary: 'Mark document as obsolete' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document obsoleted',
  })
  async obsoleteDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { supersededBy?: string; reason?: string },
  ): Promise<QualityDocument> {
    return this.documentsService.obsoleteDocument(
      req.user.tenantId,
      id,
      dto.supersededBy,
      dto.reason,
    );
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document archived',
  })
  async archiveDocument(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityDocument> {
    return this.documentsService.archiveDocument(req.user.tenantId, id);
  }

  @Get()
  @ApiOperation({ summary: 'List documents' })
  @ApiQuery({ name: 'type', enum: QualityDocumentType, required: false })
  @ApiQuery({ name: 'status', enum: DocumentStatus, required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'accessLevel', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of documents',
  })
  async listDocuments(
    @Request() req: any,
    @Query('type') type?: QualityDocumentType,
    @Query('status') status?: DocumentStatus,
    @Query('category') category?: string,
    @Query('department') department?: string,
    @Query('ownerId') ownerId?: string,
    @Query('accessLevel') accessLevel?: QualityDocument['accessLevel'],
    @Query('search') search?: string,
  ): Promise<QualityDocument[]> {
    return this.documentsService.listDocuments(req.user.tenantId, {
      type,
      status,
      category,
      department,
      ownerId,
      accessLevel,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document details',
  })
  async getDocument(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityDocument> {
    return this.documentsService.getDocument(req.user.tenantId, id);
  }
}

@ApiTags('Certifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('certifications')
export class CertificationsController {
  constructor(private readonly documentsService: QualityDocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a certification' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Certification created successfully',
  })
  async createCertification(
    @Request() req: any,
    @Body() dto: CreateCertificationDto,
  ): Promise<Certification> {
    return this.documentsService.createCertification(req.user.tenantId, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate certification' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification activated',
  })
  async activateCertification(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<Certification> {
    return this.documentsService.activateCertification(req.user.tenantId, id);
  }

  @Post(':id/audits')
  @ApiOperation({ summary: 'Record an audit' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit recorded',
  })
  async recordAudit(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RecordAuditDto,
  ): Promise<Certification> {
    return this.documentsService.recordAudit(req.user.tenantId, id, dto);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew certification' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification renewed',
  })
  async renewCertification(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RenewCertificationDto,
  ): Promise<Certification> {
    return this.documentsService.renewCertification(req.user.tenantId, id, dto);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend certification' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification suspended',
  })
  async suspendCertification(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<Certification> {
    return this.documentsService.suspendCertification(req.user.tenantId, id, reason);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw certification' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification withdrawn',
  })
  async withdrawCertification(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<Certification> {
    return this.documentsService.withdrawCertification(req.user.tenantId, id, reason);
  }

  @Post('update-statuses')
  @ApiOperation({ summary: 'Update certification statuses based on expiry dates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Number of certifications updated',
  })
  async updateCertificationStatuses(@Request() req: any): Promise<{ updated: number }> {
    const updated = await this.documentsService.updateCertificationStatus(
      req.user.tenantId,
    );
    return { updated };
  }

  @Get()
  @ApiOperation({ summary: 'List certifications' })
  @ApiQuery({ name: 'type', enum: CertificationType, required: false })
  @ApiQuery({ name: 'status', enum: CertificationStatus, required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'equipmentId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'expiringWithin', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of certifications',
  })
  async listCertifications(
    @Request() req: any,
    @Query('type') type?: CertificationType,
    @Query('status') status?: CertificationStatus,
    @Query('supplierId') supplierId?: string,
    @Query('productId') productId?: string,
    @Query('equipmentId') equipmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('expiringWithin') expiringWithin?: number,
  ): Promise<Certification[]> {
    return this.documentsService.listCertifications(req.user.tenantId, {
      type,
      status,
      supplierId,
      productId,
      equipmentId,
      employeeId,
      expiringWithin,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certification details' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Certification details',
  })
  async getCertification(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<Certification> {
    return this.documentsService.getCertification(req.user.tenantId, id);
  }
}
