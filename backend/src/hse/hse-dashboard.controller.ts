import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  HSEDashboardService,
  ISOStandard,
  AuditType,
  AuditStatus,
  FindingType,
  NCRStatus,
  NCRPriority,
  ReviewStatus,
  AuditorInfo,
  RootCauseAnalysis,
  CorrectiveActionPlan,
  VerificationRecord,
  ManagementReviewAgenda,
  ManagementReviewInputs,
  ManagementReviewOutputs,
  ManagementReviewAction,
} from './hse-dashboard.service';

// HSE Dashboard & Audit Controller
// ISO 45001:2018 and ISO 14001:2015 compliance management

@Controller('hse/dashboard')
@UseGuards(ThrottlerGuard)
export class HSEDashboardController {
  constructor(private readonly dashboardService: HSEDashboardService) {}

  // ===== DASHBOARD =====

  @Get()
  async getDashboard(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.dashboardService.generateHSEDashboard({
      from: new Date(fromDate),
      to: new Date(toDate),
    });
  }

  // ===== KPIs =====

  @Post('kpis/safety')
  async calculateSafetyKPIs(
    @Body('fromDate') fromDate: string,
    @Body('toDate') toDate: string,
    @Body('hoursWorked', ParseIntPipe) hoursWorked: number,
    @Body('totalIncidents', ParseIntPipe) totalIncidents: number,
    @Body('recordableIncidents', ParseIntPipe) recordableIncidents: number,
    @Body('lostTimeIncidents', ParseIntPipe) lostTimeIncidents: number,
    @Body('nearMisses', ParseIntPipe) nearMisses: number,
    @Body('firstAidCases', ParseIntPipe) firstAidCases: number,
    @Body('lostDays', ParseIntPipe) lostDays: number,
    @Body('restrictedDays', ParseIntPipe) restrictedDays: number,
  ) {
    return this.dashboardService.calculateSafetyKPIs(
      { from: new Date(fromDate), to: new Date(toDate) },
      {
        hoursWorked,
        totalIncidents,
        recordableIncidents,
        lostTimeIncidents,
        nearMisses,
        firstAidCases,
        lostDays,
        restrictedDays,
      },
    );
  }

  @Post('kpis/environmental')
  async calculateEnvironmentalKPIs(
    @Body('fromDate') fromDate: string,
    @Body('toDate') toDate: string,
    @Body('wasteTotal') wasteTotal: number,
    @Body('wasteRecycled') wasteRecycled: number,
    @Body('wasteHazardous') wasteHazardous: number,
    @Body('energyConsumption') energyConsumption: number,
    @Body('energyRenewable') energyRenewable: number,
    @Body('waterConsumption') waterConsumption: number,
    @Body('waterRecycled') waterRecycled: number,
    @Body('co2Total') co2Total: number,
    @Body('co2Scope1') co2Scope1: number,
    @Body('co2Scope2') co2Scope2: number,
    @Body('co2Scope3') co2Scope3: number,
    @Body('spillCount', ParseIntPipe) spillCount: number,
    @Body('spillVolume') spillVolume: number,
  ) {
    return this.dashboardService.calculateEnvironmentalKPIs(
      { from: new Date(fromDate), to: new Date(toDate) },
      {
        wasteTotal,
        wasteRecycled,
        wasteHazardous,
        energyConsumption,
        energyRenewable,
        waterConsumption,
        waterRecycled,
        co2Total,
        co2Scope1,
        co2Scope2,
        co2Scope3,
        spillCount,
        spillVolume,
      },
    );
  }

  // ===== ISO CLAUSES =====

  @Get('clauses/:standard')
  async getISOClauses(@Param('standard') standard: ISOStandard) {
    return this.dashboardService.getISOClauses(standard);
  }

  // ===== AUDITS =====

  @Post('audits')
  async createAudit(
    @Body('standard') standard: ISOStandard,
    @Body('type') type: AuditType,
    @Body('title') title: string,
    @Body('scope') scope: string,
    @Body('scheduledDate') scheduledDate: string,
    @Body('endDate') endDate: string,
    @Body('location') location: string,
    @Body('leadAuditor') leadAuditor: AuditorInfo,
    @Body('auditTeam') auditTeam: AuditorInfo[],
    @Body('auditees') auditees: string[],
  ) {
    return this.dashboardService.createAudit({
      standard,
      type,
      title,
      scope,
      scheduledDate: new Date(scheduledDate),
      endDate: new Date(endDate),
      location,
      leadAuditor,
      auditTeam,
      auditees,
    });
  }

  @Get('audits')
  async listAudits(
    @Query('standard') standard?: ISOStandard,
    @Query('type') type?: AuditType,
    @Query('status') status?: AuditStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.dashboardService.listAudits({
      standard,
      type,
      status,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('audits/:auditId')
  async getAudit(@Param('auditId') auditId: string) {
    return this.dashboardService.getAudit(auditId);
  }

  @Post('audits/:auditId/start')
  async startAudit(@Param('auditId') auditId: string) {
    return this.dashboardService.startAudit(auditId);
  }

  @Put('audits/:auditId/checklist/:itemId')
  async updateChecklistItem(
    @Param('auditId') auditId: string,
    @Param('itemId') itemId: string,
    @Body('status') status: 'CONFORMING' | 'MINOR_NC' | 'MAJOR_NC' | 'NOT_APPLICABLE' | 'NOT_AUDITED',
    @Body('evidence') evidence: string[],
    @Body('notes') notes: string,
  ) {
    return this.dashboardService.updateChecklistItem(auditId, itemId, {
      status,
      evidence,
      notes,
    });
  }

  @Post('audits/:auditId/findings')
  async addAuditFinding(
    @Param('auditId') auditId: string,
    @Body('type') type: FindingType,
    @Body('clauseNumber') clauseNumber: string,
    @Body('description') description: string,
    @Body('evidence') evidence: string[],
    @Body('correctiveAction') correctiveAction: string,
    @Body('dueDate') dueDate: string,
    @Body('assignedTo') assignedTo: string,
  ) {
    return this.dashboardService.addAuditFinding(auditId, {
      type,
      clauseNumber,
      description,
      evidence,
      correctiveAction,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedTo,
    });
  }

  @Post('audits/:auditId/complete')
  async completeAudit(
    @Param('auditId') auditId: string,
    @Body('executiveSummary') executiveSummary: string,
    @Body('recommendation') recommendation: 'CERTIFY' | 'CONDITIONAL' | 'NOT_CERTIFY' | 'MAINTAIN' | 'SUSPEND' | 'N/A',
  ) {
    return this.dashboardService.completeAudit(auditId, {
      executiveSummary,
      recommendation,
    });
  }

  @Get('audits/:auditId/report')
  async generateAuditReport(@Param('auditId') auditId: string) {
    return this.dashboardService.generateAuditReport(auditId);
  }

  // ===== NON-CONFORMANCE REPORTS =====

  @Post('ncrs')
  async createNCR(
    @Body('standard') standard: ISOStandard,
    @Body('source') source: 'AUDIT' | 'INCIDENT' | 'COMPLAINT' | 'INSPECTION' | 'SELF_IDENTIFIED',
    @Body('sourceReference') sourceReference: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('clauseNumber') clauseNumber: string,
    @Body('priority') priority: NCRPriority,
    @Body('detectedBy') detectedBy: string,
    @Body('department') department: string,
    @Body('location') location: string,
    @Body('immediateAction') immediateAction: string,
    @Body('dueDate') dueDate: string,
  ) {
    return this.dashboardService.createNCR({
      standard,
      source,
      sourceReference,
      title,
      description,
      clauseNumber,
      priority,
      detectedBy,
      department,
      location,
      immediateAction,
      dueDate: new Date(dueDate),
    });
  }

  @Get('ncrs')
  async listNCRs(
    @Query('standard') standard?: ISOStandard,
    @Query('status') status?: NCRStatus,
    @Query('priority') priority?: NCRPriority,
    @Query('source') source?: 'AUDIT' | 'INCIDENT' | 'COMPLAINT' | 'INSPECTION' | 'SELF_IDENTIFIED',
    @Query('overdueOnly') overdueOnly?: string,
  ) {
    return this.dashboardService.listNCRs({
      standard,
      status,
      priority,
      source,
      overdueOnly: overdueOnly === 'true',
    });
  }

  @Get('ncrs/statistics')
  async getNCRStatistics() {
    return this.dashboardService.getNCRStatistics();
  }

  @Get('ncrs/:ncrId')
  async getNCR(@Param('ncrId') ncrId: string) {
    return this.dashboardService.getNCR(ncrId);
  }

  @Post('ncrs/:ncrId/root-cause')
  async addRootCauseAnalysis(
    @Param('ncrId') ncrId: string,
    @Body() rca: RootCauseAnalysis,
  ) {
    return this.dashboardService.addRootCauseAnalysis(ncrId, rca);
  }

  @Post('ncrs/:ncrId/corrective-action')
  async addCorrectiveActionPlan(
    @Param('ncrId') ncrId: string,
    @Body() plan: CorrectiveActionPlan,
  ) {
    return this.dashboardService.addCorrectiveActionPlan(ncrId, plan);
  }

  @Put('ncrs/:ncrId/actions/:actionId')
  async updateCorrectiveActionStatus(
    @Param('ncrId') ncrId: string,
    @Param('actionId') actionId: string,
    @Body('status') status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE',
    @Body('evidence') evidence: string[],
  ) {
    return this.dashboardService.updateCorrectiveActionStatus(ncrId, actionId, status, evidence);
  }

  @Post('ncrs/:ncrId/verify')
  async verifyNCR(
    @Param('ncrId') ncrId: string,
    @Body() verification: VerificationRecord,
  ) {
    return this.dashboardService.verifyNCR(ncrId, verification);
  }

  @Get('ncrs/report')
  async generateNCRReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.dashboardService.generateNCRReport({
      from: new Date(fromDate),
      to: new Date(toDate),
    });
  }

  // ===== MANAGEMENT REVIEWS =====

  @Post('reviews')
  async createManagementReview(
    @Body('standard') standard: ISOStandard,
    @Body('fromDate') fromDate: string,
    @Body('toDate') toDate: string,
    @Body('scheduledDate') scheduledDate: string,
    @Body('chairperson') chairperson: string,
    @Body('attendees') attendees: string[],
    @Body('agenda') agenda: ManagementReviewAgenda,
  ) {
    return this.dashboardService.createManagementReview({
      standard,
      period: { from: new Date(fromDate), to: new Date(toDate) },
      scheduledDate: new Date(scheduledDate),
      chairperson,
      attendees,
      agenda,
    });
  }

  @Get('reviews')
  async listManagementReviews(
    @Query('standard') standard?: ISOStandard,
    @Query('status') status?: ReviewStatus,
    @Query('year') year?: string,
  ) {
    return this.dashboardService.listManagementReviews({
      standard,
      status,
      year: year ? parseInt(year) : undefined,
    });
  }

  @Get('reviews/:reviewId')
  async getManagementReview(@Param('reviewId') reviewId: string) {
    return this.dashboardService.getManagementReview(reviewId);
  }

  @Put('reviews/:reviewId/inputs')
  async updateManagementReviewInputs(
    @Param('reviewId') reviewId: string,
    @Body() inputs: Partial<ManagementReviewInputs>,
  ) {
    return this.dashboardService.updateManagementReviewInputs(reviewId, inputs);
  }

  @Post('reviews/:reviewId/complete')
  async recordManagementReviewOutputs(
    @Param('reviewId') reviewId: string,
    @Body('outputs') outputs: ManagementReviewOutputs,
    @Body('minutes') minutes: string,
  ) {
    return this.dashboardService.recordManagementReviewOutputs(reviewId, outputs, minutes);
  }

  @Post('reviews/:reviewId/actions')
  async addManagementReviewAction(
    @Param('reviewId') reviewId: string,
    @Body('action') action: string,
    @Body('assignedTo') assignedTo: string,
    @Body('dueDate') dueDate: string,
    @Body('priority') priority: 'HIGH' | 'MEDIUM' | 'LOW',
  ) {
    return this.dashboardService.addManagementReviewAction(reviewId, {
      action,
      assignedTo,
      dueDate: new Date(dueDate),
      priority,
    });
  }

  @Post('reviews/:reviewId/approve')
  async approveManagementReview(
    @Param('reviewId') reviewId: string,
    @Body('approvedBy') approvedBy: string,
  ) {
    return this.dashboardService.approveManagementReview(reviewId, approvedBy);
  }
}
