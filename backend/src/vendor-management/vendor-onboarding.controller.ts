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
  VendorOnboardingService,
  OnboardingStatus,
  OnboardingStep,
  RequiredDocument,
  ComplianceCheck,
  ComplianceStatus,
  RiskFactor,
} from './vendor-onboarding.service';

@ApiTags('Vendor Management - Onboarding')
@Controller('vendors/onboarding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorOnboardingController {
  constructor(private readonly onboardingService: VendorOnboardingService) {}

  // =================== WORKFLOWS ===================

  @Post('workflows')
  @ApiOperation({ summary: 'Create onboarding workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async createWorkflow(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      vendorTypes?: string[];
      steps: Omit<OnboardingStep, 'id'>[];
      requiredDocuments: Omit<RequiredDocument, 'id'>[];
      complianceChecks: Omit<ComplianceCheck, 'id'>[];
      approvalRequired?: boolean;
      approverRoles?: string[];
      isDefault?: boolean;
    },
  ) {
    return this.onboardingService.createWorkflow({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Get onboarding workflows' })
  @ApiResponse({ status: 200, description: 'Workflows list' })
  async getWorkflows(@Request() req: any) {
    const workflows = await this.onboardingService.getWorkflows(req.user.tenantId);
    return { workflows, total: workflows.length };
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  async getWorkflow(@Param('id') id: string) {
    const workflow = await this.onboardingService.getWorkflow(id);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  // =================== ONBOARDING ===================

  @Post('start/:vendorId')
  @ApiOperation({ summary: 'Start vendor onboarding' })
  @ApiResponse({ status: 201, description: 'Onboarding started' })
  async startOnboarding(
    @Request() req: any,
    @Param('vendorId') vendorId: string,
    @Body() body: { workflowId?: string },
  ) {
    try {
      return await this.onboardingService.startOnboarding({
        tenantId: req.user.tenantId,
        vendorId,
        workflowId: body.workflowId,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all onboardings' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Onboardings list' })
  async getOnboardings(
    @Request() req: any,
    @Query('status') status?: OnboardingStatus,
  ) {
    const onboardings = await this.onboardingService.getOnboardings(
      req.user.tenantId,
      status,
    );
    return { onboardings, total: onboardings.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get onboarding by ID' })
  @ApiResponse({ status: 200, description: 'Onboarding details' })
  async getOnboarding(@Param('id') id: string) {
    const onboarding = await this.onboardingService.getOnboarding(id);
    if (!onboarding) {
      return { error: 'Onboarding not found' };
    }
    return onboarding;
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get vendor onboarding' })
  @ApiResponse({ status: 200, description: 'Vendor onboarding details' })
  async getVendorOnboarding(@Param('vendorId') vendorId: string) {
    const onboarding = await this.onboardingService.getVendorOnboarding(vendorId);
    if (!onboarding) {
      return { error: 'Onboarding not found for this vendor' };
    }
    return onboarding;
  }

  @Post(':id/steps/:stepId/complete')
  @ApiOperation({ summary: 'Complete onboarding step' })
  @ApiResponse({ status: 200, description: 'Step completed' })
  async completeStep(
    @Request() req: any,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() body: { notes?: string },
  ) {
    const onboarding = await this.onboardingService.completeStep(
      id,
      stepId,
      req.user.id,
      body.notes,
    );
    if (!onboarding) {
      return { error: 'Onboarding or step not found' };
    }
    return onboarding;
  }

  @Put(':id/documents/:documentId')
  @ApiOperation({ summary: 'Update document progress' })
  @ApiResponse({ status: 200, description: 'Document progress updated' })
  async updateDocumentProgress(
    @Request() req: any,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() body: {
      status: 'pending' | 'uploaded' | 'verified' | 'rejected';
      uploadedDocumentId?: string;
      rejectionReason?: string;
    },
  ) {
    const onboarding = await this.onboardingService.updateDocumentProgress(
      id,
      documentId,
      body.status,
      body.uploadedDocumentId,
      body.status === 'verified' ? req.user.id : undefined,
      body.rejectionReason,
    );
    if (!onboarding) {
      return { error: 'Onboarding or document not found' };
    }
    return onboarding;
  }

  @Put(':id/compliance/:checkId')
  @ApiOperation({ summary: 'Update compliance progress' })
  @ApiResponse({ status: 200, description: 'Compliance progress updated' })
  async updateComplianceProgress(
    @Request() req: any,
    @Param('id') id: string,
    @Param('checkId') checkId: string,
    @Body() body: {
      status: ComplianceStatus;
      expirationDate?: string;
      notes?: string;
    },
  ) {
    const onboarding = await this.onboardingService.updateComplianceProgress(
      id,
      checkId,
      body.status,
      req.user.id,
      body.expirationDate ? new Date(body.expirationDate) : undefined,
      body.notes,
    );
    if (!onboarding) {
      return { error: 'Onboarding or compliance check not found' };
    }
    return onboarding;
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve onboarding' })
  @ApiResponse({ status: 200, description: 'Onboarding approved' })
  async approveOnboarding(@Request() req: any, @Param('id') id: string) {
    const onboarding = await this.onboardingService.approveOnboarding(id, req.user.id);
    if (!onboarding) {
      return { error: 'Onboarding not found or not pending review' };
    }
    return onboarding;
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject onboarding' })
  @ApiResponse({ status: 200, description: 'Onboarding rejected' })
  async rejectOnboarding(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const onboarding = await this.onboardingService.rejectOnboarding(
      id,
      req.user.id,
      body.reason,
    );
    if (!onboarding) {
      return { error: 'Onboarding not found or cannot be rejected' };
    }
    return onboarding;
  }

  // =================== RISK ASSESSMENT ===================

  @Post('risk-assessment/:vendorId')
  @ApiOperation({ summary: 'Create risk assessment' })
  @ApiResponse({ status: 201, description: 'Risk assessment created' })
  async createRiskAssessment(
    @Request() req: any,
    @Param('vendorId') vendorId: string,
    @Body() body: {
      factors: Omit<RiskFactor, 'riskLevel'>[];
      recommendations?: string[];
      nextReviewDate?: string;
    },
  ) {
    return this.onboardingService.createRiskAssessment({
      vendorId,
      factors: body.factors,
      recommendations: body.recommendations,
      assessedBy: req.user.id,
      nextReviewDate: body.nextReviewDate ? new Date(body.nextReviewDate) : undefined,
    });
  }

  @Get('risk-assessment/:vendorId')
  @ApiOperation({ summary: 'Get vendor risk assessment' })
  @ApiResponse({ status: 200, description: 'Risk assessment details' })
  async getRiskAssessment(@Param('vendorId') vendorId: string) {
    const assessment = await this.onboardingService.getVendorRiskAssessment(vendorId);
    if (!assessment) {
      return { error: 'Risk assessment not found' };
    }
    return assessment;
  }

  // =================== COMPLIANCE REQUIREMENTS ===================

  @Post('compliance-requirements')
  @ApiOperation({ summary: 'Create compliance requirement' })
  @ApiResponse({ status: 201, description: 'Requirement created' })
  async createComplianceRequirement(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      category: string;
      type: ComplianceCheck['type'];
      vendorTypes?: string[];
      isRequired?: boolean;
      validityPeriodDays?: number;
      reminderDays?: number;
      verificationMethod?: string;
      documentationRequired?: string[];
    },
  ) {
    return this.onboardingService.createComplianceRequirement({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('compliance-requirements')
  @ApiOperation({ summary: 'Get compliance requirements' })
  @ApiQuery({ name: 'vendorType', required: false })
  @ApiResponse({ status: 200, description: 'Requirements list' })
  async getComplianceRequirements(
    @Request() req: any,
    @Query('vendorType') vendorType?: string,
  ) {
    const requirements = await this.onboardingService.getComplianceRequirements(
      req.user.tenantId,
      vendorType,
    );
    return { requirements, total: requirements.length };
  }

  // =================== VENDOR COMPLIANCE ===================

  @Post('vendor-compliance/:vendorId')
  @ApiOperation({ summary: 'Record vendor compliance' })
  @ApiResponse({ status: 201, description: 'Compliance recorded' })
  async recordVendorCompliance(
    @Request() req: any,
    @Param('vendorId') vendorId: string,
    @Body() body: {
      requirementId: string;
      status: ComplianceStatus;
      expirationDate?: string;
      documentIds?: string[];
      notes?: string;
    },
  ) {
    return this.onboardingService.recordVendorCompliance({
      vendorId,
      requirementId: body.requirementId,
      status: body.status,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : undefined,
      verifiedBy: req.user.id,
      verifiedByName: req.user.name || req.user.email,
      documentIds: body.documentIds,
      notes: body.notes,
    });
  }

  @Get('vendor-compliance/:vendorId')
  @ApiOperation({ summary: 'Get vendor compliance status' })
  @ApiResponse({ status: 200, description: 'Vendor compliance status' })
  async getVendorComplianceStatus(@Param('vendorId') vendorId: string) {
    const compliance = await this.onboardingService.getVendorComplianceStatus(vendorId);
    return { compliance, total: compliance.length };
  }

  @Get('compliance/expiring')
  @ApiOperation({ summary: 'Get expiring compliance' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Expiring compliance list' })
  async getExpiringCompliance(
    @Request() req: any,
    @Query('daysAhead') daysAhead?: string,
  ) {
    const compliance = await this.onboardingService.getExpiringCompliance(
      req.user.tenantId,
      daysAhead ? parseInt(daysAhead) : 30,
    );
    return { compliance, total: compliance.length };
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get onboarding statistics' })
  @ApiResponse({ status: 200, description: 'Onboarding statistics' })
  async getStatistics(@Request() req: any) {
    return this.onboardingService.getOnboardingStatistics(req.user.tenantId);
  }
}
