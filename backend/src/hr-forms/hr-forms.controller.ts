import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  HRFormsService,
  FormCategory,
  FormStatus,
  SubmissionStatus,
  ApprovalAction,
  FormTemplate,
  FormSubmission,
} from './hr-forms.service';

// DTOs
class CreateSubmissionDto {
  formId: string;
  data: Record<string, any>;
  employeeId?: string;
}

class UpdateSubmissionDto {
  data: Record<string, any>;
}

class ProcessApprovalDto {
  action: ApprovalAction;
  comment?: string;
}

class AddCommentDto {
  content: string;
}

class AddAttachmentDto {
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

class CreateTemplateDto {
  name: string;
  nameEn: string;
  description: string;
  category: FormCategory;
  fields: any[];
  workflow?: any;
  settings?: any;
}

@ApiTags('HR Forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr-forms')
export class HRFormsController {
  constructor(private readonly hrFormsService: HRFormsService) {}

  // =================== TEMPLATE ENDPOINTS ===================

  @Get('templates')
  @ApiOperation({ summary: 'Get all form templates' })
  @ApiQuery({ name: 'category', required: false, enum: FormCategory })
  @ApiQuery({ name: 'status', required: false, enum: FormStatus })
  @ApiResponse({ status: 200, description: 'List of form templates' })
  getTemplates(
    @Query('category') category?: FormCategory,
    @Query('status') status?: FormStatus,
  ): FormTemplate[] {
    return this.hrFormsService.getTemplates(category, status);
  }

  @Get('templates/categories')
  @ApiOperation({ summary: 'Get all form categories with counts' })
  @ApiResponse({ status: 200, description: 'List of categories with template counts' })
  getCategories(): { category: FormCategory; count: number; label: string }[] {
    return this.hrFormsService.getCategories();
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get a specific form template' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Form template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getTemplate(@Param('templateId') templateId: string): FormTemplate {
    return this.hrFormsService.getTemplate(templateId);
  }

  // =================== LEAVE FORM SHORTCUTS ===================

  @Get('templates/leave/annual')
  @ApiOperation({ summary: 'Get annual leave request template' })
  @ApiResponse({ status: 200, description: 'Annual leave template' })
  getAnnualLeaveTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-leave-annual');
  }

  @Get('templates/leave/medical')
  @ApiOperation({ summary: 'Get medical leave template' })
  @ApiResponse({ status: 200, description: 'Medical leave template' })
  getMedicalLeaveTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-leave-medical');
  }

  @Get('templates/leave/unpaid')
  @ApiOperation({ summary: 'Get unpaid leave template' })
  @ApiResponse({ status: 200, description: 'Unpaid leave template' })
  getUnpaidLeaveTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-leave-unpaid');
  }

  @Get('templates/leave/maternity')
  @ApiOperation({ summary: 'Get maternity leave template' })
  @ApiResponse({ status: 200, description: 'Maternity leave template' })
  getMaternityLeaveTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-leave-maternity');
  }

  @Get('templates/leave/paternity')
  @ApiOperation({ summary: 'Get paternity leave template' })
  @ApiResponse({ status: 200, description: 'Paternity leave template' })
  getPaternityLeaveTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-leave-paternity');
  }

  // =================== PERFORMANCE FORM SHORTCUTS ===================

  @Get('templates/performance/annual-review')
  @ApiOperation({ summary: 'Get annual performance review template' })
  @ApiResponse({ status: 200, description: 'Annual review template' })
  getAnnualReviewTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-perf-annual-review');
  }

  @Get('templates/performance/360-feedback')
  @ApiOperation({ summary: 'Get 360° feedback template' })
  @ApiResponse({ status: 200, description: '360° feedback template' })
  get360FeedbackTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-perf-360-feedback');
  }

  @Get('templates/performance/probation-review')
  @ApiOperation({ summary: 'Get probation review template' })
  @ApiResponse({ status: 200, description: 'Probation review template' })
  getProbationReviewTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-perf-probation-review');
  }

  // =================== ONBOARDING FORM SHORTCUTS ===================

  @Get('templates/onboarding/personal-info')
  @ApiOperation({ summary: 'Get personal info form template' })
  @ApiResponse({ status: 200, description: 'Personal info template' })
  getPersonalInfoTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-onboard-personal-info');
  }

  @Get('templates/onboarding/bank-details')
  @ApiOperation({ summary: 'Get bank details form template' })
  @ApiResponse({ status: 200, description: 'Bank details template' })
  getBankDetailsTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-onboard-bank-details');
  }

  @Get('templates/onboarding/it-access')
  @ApiOperation({ summary: 'Get IT access request template' })
  @ApiResponse({ status: 200, description: 'IT access template' })
  getITAccessTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-onboard-it-access');
  }

  @Get('templates/onboarding/checklist')
  @ApiOperation({ summary: 'Get onboarding checklist template' })
  @ApiResponse({ status: 200, description: 'Onboarding checklist template' })
  getOnboardingChecklistTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-onboard-checklist');
  }

  // =================== OFFBOARDING FORM SHORTCUTS ===================

  @Get('templates/offboarding/resignation')
  @ApiOperation({ summary: 'Get resignation form template' })
  @ApiResponse({ status: 200, description: 'Resignation template' })
  getResignationTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-offboard-resignation');
  }

  @Get('templates/offboarding/exit-interview')
  @ApiOperation({ summary: 'Get exit interview template' })
  @ApiResponse({ status: 200, description: 'Exit interview template' })
  getExitInterviewTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-offboard-exit-interview');
  }

  @Get('templates/offboarding/clearance')
  @ApiOperation({ summary: 'Get clearance form template' })
  @ApiResponse({ status: 200, description: 'Clearance template' })
  getClearanceTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-offboard-clearance');
  }

  // =================== OTHER FORM SHORTCUTS ===================

  @Get('templates/training/request')
  @ApiOperation({ summary: 'Get training request template' })
  @ApiResponse({ status: 200, description: 'Training request template' })
  getTrainingRequestTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-train-request');
  }

  @Get('templates/expense/report')
  @ApiOperation({ summary: 'Get expense report template' })
  @ApiResponse({ status: 200, description: 'Expense report template' })
  getExpenseReportTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-expense-report');
  }

  @Get('templates/compliance/hse-incident')
  @ApiOperation({ summary: 'Get HSE incident report template' })
  @ApiResponse({ status: 200, description: 'HSE incident template' })
  getHSEIncidentTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-hse-incident');
  }

  @Get('templates/compliance/gdpr-consent')
  @ApiOperation({ summary: 'Get GDPR consent template' })
  @ApiResponse({ status: 200, description: 'GDPR consent template' })
  getGDPRConsentTemplate(): FormTemplate {
    return this.hrFormsService.getTemplate('tpl-gdpr-consent');
  }

  // =================== SUBMISSION ENDPOINTS ===================

  @Post('submissions')
  @ApiOperation({ summary: 'Create a new form submission (draft)' })
  @ApiResponse({ status: 201, description: 'Submission created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createSubmission(
    @Request() req: any,
    @Body() dto: CreateSubmissionDto,
  ): Promise<FormSubmission> {
    return this.hrFormsService.createSubmission(
      req.user.sub,
      dto.formId,
      dto.data,
      dto.employeeId,
    );
  }

  @Get('submissions')
  @ApiOperation({ summary: 'Get user submissions' })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatus })
  @ApiResponse({ status: 200, description: 'List of user submissions' })
  getUserSubmissions(
    @Request() req: any,
    @Query('status') status?: SubmissionStatus,
  ): FormSubmission[] {
    return this.hrFormsService.getUserSubmissions(req.user.sub, status);
  }

  @Get('submissions/pending-approvals')
  @ApiOperation({ summary: 'Get submissions pending approval' })
  @ApiResponse({ status: 200, description: 'List of pending approvals' })
  getPendingApprovals(@Request() req: any): FormSubmission[] {
    return this.hrFormsService.getPendingApprovals(req.user.sub);
  }

  @Get('submissions/:submissionId')
  @ApiOperation({ summary: 'Get a specific submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'Submission details' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  getSubmission(@Param('submissionId') submissionId: string): FormSubmission {
    return this.hrFormsService.getSubmission(submissionId);
  }

  @Put('submissions/:submissionId')
  @ApiOperation({ summary: 'Update a draft submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'Submission updated' })
  @ApiResponse({ status: 400, description: 'Cannot update non-draft submission' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async updateSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: UpdateSubmissionDto,
  ): Promise<FormSubmission> {
    const submission = this.hrFormsService.getSubmission(submissionId);
    if (submission.status !== SubmissionStatus.DRAFT) {
      throw new Error('Cannot update non-draft submission');
    }
    // Update data in submission
    Object.assign(submission.data, dto.data);
    submission.updatedAt = new Date();
    return submission;
  }

  @Post('submissions/:submissionId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a draft form for approval' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'Form submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async submitForm(
    @Param('submissionId') submissionId: string,
  ): Promise<FormSubmission> {
    return this.hrFormsService.submitForm(submissionId);
  }

  @Post('submissions/:submissionId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process approval action on a submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'Approval processed' })
  @ApiResponse({ status: 400, description: 'Invalid approval action' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async processApproval(
    @Request() req: any,
    @Param('submissionId') submissionId: string,
    @Body() dto: ProcessApprovalDto,
  ): Promise<FormSubmission> {
    return this.hrFormsService.processApproval(
      submissionId,
      req.user.sub,
      req.user.name || req.user.email || 'Unknown',
      dto.action,
      dto.comment,
    );
  }

  @Post('submissions/:submissionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'Submission cancelled' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async cancelSubmission(
    @Param('submissionId') submissionId: string,
  ): Promise<FormSubmission> {
    const submission = this.hrFormsService.getSubmission(submissionId);
    if (submission.status === SubmissionStatus.COMPLETED ||
        submission.status === SubmissionStatus.CANCELLED) {
      throw new Error('Cannot cancel completed or already cancelled submission');
    }
    submission.status = SubmissionStatus.CANCELLED;
    submission.updatedAt = new Date();
    return submission;
  }

  // =================== QUICK CREATE ENDPOINTS ===================

  @Post('leave/annual')
  @ApiOperation({ summary: 'Quick create annual leave request' })
  @ApiResponse({ status: 201, description: 'Leave request created' })
  async createAnnualLeaveRequest(
    @Request() req: any,
    @Body() data: { startDate: string; endDate: string; workingDays: number; reason?: string; replacement?: string },
  ): Promise<FormSubmission> {
    return this.hrFormsService.createSubmission(req.user.sub, 'tpl-leave-annual', data);
  }

  @Post('leave/medical')
  @ApiOperation({ summary: 'Quick create medical leave entry' })
  @ApiResponse({ status: 201, description: 'Medical leave created' })
  async createMedicalLeave(
    @Request() req: any,
    @Body() data: { startDate: string; endDate: string; certificateNumber: string; issueDate: string; medicalUnit: string },
  ): Promise<FormSubmission> {
    return this.hrFormsService.createSubmission(req.user.sub, 'tpl-leave-medical', data);
  }

  @Post('expense/report')
  @ApiOperation({ summary: 'Quick create expense report' })
  @ApiResponse({ status: 201, description: 'Expense report created' })
  async createExpenseReport(
    @Request() req: any,
    @Body() data: { expenseDate: string; category: string; amount: number; description: string },
  ): Promise<FormSubmission> {
    return this.hrFormsService.createSubmission(req.user.sub, 'tpl-expense-report', data);
  }

  @Post('training/request')
  @ApiOperation({ summary: 'Quick create training request' })
  @ApiResponse({ status: 201, description: 'Training request created' })
  async createTrainingRequest(
    @Request() req: any,
    @Body() data: { trainingName: string; provider: string; startDate: string; endDate: string; cost: number; justification: string },
  ): Promise<FormSubmission> {
    return this.hrFormsService.createSubmission(req.user.sub, 'tpl-train-request', data);
  }

  @Post('compliance/hse-incident')
  @ApiOperation({ summary: 'Quick report HSE incident' })
  @ApiResponse({ status: 201, description: 'HSE incident reported' })
  async reportHSEIncident(
    @Request() req: any,
    @Body() data: { incidentDate: string; location: string; type: string; severity: string; description: string; immediateActions: string },
  ): Promise<FormSubmission> {
    return this.hrFormsService.createSubmission(req.user.sub, 'tpl-hse-incident', data);
  }

  @Post('offboarding/resignation')
  @ApiOperation({ summary: 'Quick submit resignation' })
  @ApiResponse({ status: 201, description: 'Resignation submitted' })
  async submitResignation(
    @Request() req: any,
    @Body() data: { resignationDate: string; lastWorkingDay: string; reason?: string; noticePeriod?: number },
  ): Promise<FormSubmission> {
    return this.hrFormsService.createSubmission(req.user.sub, 'tpl-offboard-resignation', data);
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get HR forms statistics' })
  @ApiResponse({ status: 200, description: 'Forms statistics' })
  getStatistics(): {
    totalTemplates: number;
    totalSubmissions: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    return this.hrFormsService.getStatistics();
  }

  // =================== SEARCH ===================

  @Get('search')
  @ApiOperation({ summary: 'Search form templates' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  searchTemplates(@Query('q') query: string): FormTemplate[] {
    const allTemplates = this.hrFormsService.getTemplates();
    const lowerQuery = query.toLowerCase();

    return allTemplates.filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.nameEn.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
    );
  }
}
