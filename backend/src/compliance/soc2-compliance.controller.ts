import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  Soc2ComplianceService,
  ComplianceStatus,
  IncidentSeverity,
  IncidentStatus,
  DataClassification,
} from './soc2-compliance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

// =================== DTOs ===================

class UpdateControlStatusDto {
  status: ComplianceStatus;
  evidence?: string[];
  gaps?: string[];
  remediation?: string;
}

class ReportIncidentDto {
  title: string;
  description: string;
  severity: IncidentSeverity;
  affectedSystems: string[];
  affectedUsers?: number;
}

class UpdateIncidentDto {
  status: IncidentStatus;
  rootCause?: string;
  remediation?: string;
  lessonsLearned?: string;
}

class CreateAccessReviewDto {
  userId: string;
  accessLevel: string;
  isAppropriate: boolean;
  action: 'maintain' | 'revoke' | 'modify';
  notes?: string;
}

class CreateRiskAssessmentDto {
  name: string;
  description: string;
  category: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  mitigations: string[];
  owner: string;
}

class RegisterDataAssetDto {
  name: string;
  description: string;
  classification: DataClassification;
  owner: string;
  location: string;
  retentionPeriod: number;
  personalData?: boolean;
}

// =================== CONTROLLER ===================

@ApiTags('compliance')
@Controller('compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class Soc2ComplianceController {
  constructor(private readonly complianceService: Soc2ComplianceService) {}

  // =================== DASHBOARD ===================

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get compliance dashboard data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard data retrieved' })
  getDashboard() {
    return this.complianceService.getComplianceDashboard();
  }

  // =================== CONTROLS ===================

  @Get('controls')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all SOC 2 compliance controls' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of all controls' })
  getAllControls() {
    return this.complianceService.getAllControls();
  }

  @Get('controls/category/:category')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get controls by category (CC1-CC9)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Controls for category' })
  getControlsByCategory(@Param('category') category: string) {
    return this.complianceService.getControlsByCategory(category);
  }

  @Get('controls/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get compliance summary by category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Summary by category' })
  getComplianceSummary() {
    return this.complianceService.getComplianceSummaryByCategory();
  }

  @Get('controls/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get specific control by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Control details' })
  getControl(@Param('id') id: string) {
    return this.complianceService.getControl(id);
  }

  @Put('controls/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update control status and evidence' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Control updated' })
  updateControlStatus(
    @Param('id') id: string,
    @Body() dto: UpdateControlStatusDto,
  ) {
    return this.complianceService.updateControlStatus(
      id,
      dto.status,
      dto.evidence,
      dto.gaps,
      dto.remediation,
    );
  }

  // =================== INCIDENTS ===================

  @Get('incidents')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all security incidents' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of incidents' })
  getAllIncidents() {
    return this.complianceService.getAllIncidents();
  }

  @Get('incidents/open')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get open security incidents' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Open incidents' })
  getOpenIncidents() {
    return this.complianceService.getOpenIncidents();
  }

  @Get('incidents/metrics')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get incident metrics and statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Incident metrics' })
  getIncidentMetrics() {
    return this.complianceService.getIncidentMetrics();
  }

  @Get('incidents/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get incident by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Incident details' })
  getIncident(@Param('id') id: string) {
    return this.complianceService.getIncident(id);
  }

  @Post('incidents')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.USER)
  @ApiOperation({ summary: 'Report a new security incident' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Incident reported' })
  reportIncident(@Body() dto: ReportIncidentDto) {
    return this.complianceService.reportIncident(
      dto.title,
      dto.description,
      dto.severity,
      dto.affectedSystems,
      'system', // In production, get from authenticated user
      dto.affectedUsers,
    );
  }

  @Put('incidents/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update incident status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Incident updated' })
  updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.complianceService.updateIncidentStatus(id, dto.status, {
      rootCause: dto.rootCause,
      remediation: dto.remediation,
      lessonsLearned: dto.lessonsLearned,
    });
  }

  // =================== ACCESS REVIEWS ===================

  @Get('access-reviews')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all access reviews' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of access reviews' })
  getAllAccessReviews() {
    return this.complianceService.getAllAccessReviews();
  }

  @Get('access-reviews/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get access review statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Access review stats' })
  getAccessReviewStats() {
    return this.complianceService.getAccessReviewStats();
  }

  @Get('access-reviews/user/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get access reviews for specific user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User access reviews' })
  getAccessReviewsForUser(@Param('userId') userId: string) {
    return this.complianceService.getAccessReviewsForUser(userId);
  }

  @Post('access-reviews')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new access review' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Access review created' })
  createAccessReview(@Body() dto: CreateAccessReviewDto) {
    return this.complianceService.createAccessReview(
      dto.userId,
      'admin', // In production, get from authenticated user
      dto.accessLevel,
      dto.isAppropriate,
      dto.action,
      dto.notes,
    );
  }

  // =================== RISK ASSESSMENT ===================

  @Get('risks')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all risk assessments' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of risk assessments' })
  getAllRisks() {
    return this.complianceService.getAllRiskAssessments();
  }

  @Get('risks/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get risk summary and statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Risk summary' })
  getRiskSummary() {
    return this.complianceService.getRiskSummary();
  }

  @Get('risks/:id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get risk assessment by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Risk assessment details' })
  getRisk(@Param('id') id: string) {
    return this.complianceService.getRiskAssessment(id);
  }

  @Post('risks')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new risk assessment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Risk assessment created' })
  createRiskAssessment(@Body() dto: CreateRiskAssessmentDto) {
    return this.complianceService.createRiskAssessment(
      dto.name,
      dto.description,
      dto.category,
      dto.likelihood,
      dto.impact,
      dto.mitigations,
      dto.owner,
    );
  }

  // =================== DATA CLASSIFICATION ===================

  @Get('data-assets')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all registered data assets' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of data assets' })
  getAllDataAssets() {
    return this.complianceService.getAllDataAssets();
  }

  @Get('data-assets/summary')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get data classification summary' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Classification summary' })
  getDataClassificationSummary() {
    return this.complianceService.getDataClassificationSummary();
  }

  @Get('data-assets/classification/:classification')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get data assets by classification level' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assets by classification' })
  getDataAssetsByClassification(
    @Param('classification') classification: DataClassification,
  ) {
    return this.complianceService.getDataAssetsByClassification(classification);
  }

  @Post('data-assets')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register new data asset' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Data asset registered' })
  registerDataAsset(@Body() dto: RegisterDataAssetDto) {
    return this.complianceService.registerDataAsset(
      dto.name,
      dto.description,
      dto.classification,
      dto.owner,
      dto.location,
      dto.retentionPeriod,
      dto.personalData,
    );
  }

  // =================== REPORTING ===================

  @Get('reports/full')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate comprehensive compliance report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Report start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Report end date' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Full compliance report' })
  generateComplianceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.complianceService.generateComplianceReport(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('audit-logs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get compliance-related audit logs' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of logs to retrieve' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter end date' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance audit logs' })
  async getComplianceAuditLogs(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.complianceService.getComplianceAuditLogs(
      limit ? parseInt(limit, 10) : 100,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
