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
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  WorkspaceService,
  Workspace,
  WorkspaceMember,
  WorkspaceSettings,
  TimeEntry,
  Task,
  NDADocument,
  IPAgreement,
} from './workspace.service';

// Time Tracking & Project Workspaces Controller
// Shared workspaces with time tracking, NDA auto-generation, and IP clause management

@Controller('workspaces')
@UseGuards(ThrottlerGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // ===== WORKSPACE MANAGEMENT =====

  @Post()
  async createWorkspace(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('projectId') projectId: string,
    @Body('ownerId') ownerId: string,
    @Body('ownerType') ownerType: 'CLIENT' | 'AGENCY',
    @Body('contractId') contractId?: string,
    @Body('settings') settings?: Partial<WorkspaceSettings>,
  ) {
    return this.workspaceService.createWorkspace({
      name,
      description,
      projectId,
      contractId,
      ownerId,
      ownerType,
      settings,
    });
  }

  @Get(':workspaceId')
  async getWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getWorkspace(workspaceId);
  }

  @Put(':workspaceId')
  async updateWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Body() updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>,
  ) {
    return this.workspaceService.updateWorkspace(workspaceId, updates);
  }

  @Post(':workspaceId/members')
  async addMember(
    @Param('workspaceId') workspaceId: string,
    @Body('userId') userId: string,
    @Body('role') role: WorkspaceMember['role'],
    @Body('hourlyRate') hourlyRate?: number,
    @Body('currency') currency?: string,
  ) {
    return this.workspaceService.addWorkspaceMember(
      workspaceId,
      userId,
      role,
      hourlyRate,
      currency,
    );
  }

  @Delete(':workspaceId/members/:userId')
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.workspaceService.removeWorkspaceMember(workspaceId, userId);
  }

  // ===== TIME TRACKING =====

  @Post(':workspaceId/time/start')
  async startTimeTracking(
    @Param('workspaceId') workspaceId: string,
    @Body('userId') userId: string,
    @Body('description') description: string,
    @Body('hourlyRate') hourlyRate: number,
    @Body('currency') currency: string,
    @Body('taskId') taskId?: string,
  ) {
    return this.workspaceService.startTimeTracking({
      workspaceId,
      userId,
      taskId,
      description,
      hourlyRate,
      currency,
    });
  }

  @Post('time/:entryId/pause')
  async pauseTimeTracking(@Param('entryId') entryId: string) {
    return this.workspaceService.pauseTimeTracking(entryId);
  }

  @Post('time/:entryId/resume')
  async resumeTimeTracking(@Param('entryId') entryId: string) {
    return this.workspaceService.resumeTimeTracking(entryId);
  }

  @Post('time/:entryId/stop')
  async stopTimeTracking(@Param('entryId') entryId: string) {
    return this.workspaceService.stopTimeTracking(entryId);
  }

  @Post('time/:entryId/screenshot')
  async addScreenshot(
    @Param('entryId') entryId: string,
    @Body('timestamp') timestamp: string,
    @Body('url') url: string,
    @Body('activityLevel') activityLevel: number,
    @Body('blurred') blurred: boolean,
    @Body('thumbnailUrl') thumbnailUrl?: string,
    @Body('flagged') flagged?: boolean,
    @Body('flagReason') flagReason?: string,
  ) {
    return this.workspaceService.addScreenshot(entryId, {
      timestamp: new Date(timestamp),
      url,
      thumbnailUrl,
      activityLevel,
      blurred,
      flagged: flagged ?? false,
      flagReason,
    });
  }

  @Post('time/:entryId/approve')
  async approveTimeEntry(
    @Param('entryId') entryId: string,
    @Body('approverId') approverId: string,
  ) {
    return this.workspaceService.approveTimeEntry(entryId, approverId);
  }

  @Post('time/:entryId/reject')
  async rejectTimeEntry(
    @Param('entryId') entryId: string,
    @Body('reason') reason: string,
  ) {
    return this.workspaceService.rejectTimeEntry(entryId, reason);
  }

  @Get('time/:entryId')
  async getTimeEntry(@Param('entryId') entryId: string) {
    return this.workspaceService.getTimeEntry(entryId);
  }

  @Get(':workspaceId/time')
  async getTimeEntries(
    @Param('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
    @Query('taskId') taskId?: string,
    @Query('status') status?: TimeEntry['status'],
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.workspaceService.getTimeEntriesForWorkspace(workspaceId, {
      userId,
      taskId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post(':workspaceId/time/manual')
  async createManualTimeEntry(
    @Param('workspaceId') workspaceId: string,
    @Body('userId') userId: string,
    @Body('description') description: string,
    @Body('startTime') startTime: string,
    @Body('endTime') endTime: string,
    @Body('hourlyRate') hourlyRate: number,
    @Body('currency') currency: string,
    @Body('taskId') taskId?: string,
    @Body('notes') notes?: string,
  ) {
    return this.workspaceService.createManualTimeEntry({
      workspaceId,
      userId,
      taskId,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      hourlyRate,
      currency,
      notes,
    });
  }

  // ===== TASK MANAGEMENT =====

  @Post(':workspaceId/tasks')
  async createTask(
    @Param('workspaceId') workspaceId: string,
    @Body('title') title: string,
    @Body('createdBy') createdBy: string,
    @Body('priority') priority: Task['priority'],
    @Body('description') description?: string,
    @Body('assigneeId') assigneeId?: string,
    @Body('estimatedHours') estimatedHours?: number,
    @Body('dueDate') dueDate?: string,
    @Body('tags') tags?: string[],
  ) {
    return this.workspaceService.createTask({
      workspaceId,
      title,
      description,
      assigneeId,
      estimatedHours,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags,
      createdBy,
    });
  }

  @Get('tasks/:taskId')
  async getTask(@Param('taskId') taskId: string) {
    return this.workspaceService.getTask(taskId);
  }

  @Put('tasks/:taskId')
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() updates: Partial<Omit<Task, 'id' | 'workspaceId' | 'createdBy' | 'createdAt'>>,
  ) {
    return this.workspaceService.updateTask(taskId, updates);
  }

  @Get(':workspaceId/tasks')
  async getTasks(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: Task['status'],
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: Task['priority'],
  ) {
    return this.workspaceService.getTasksForWorkspace(workspaceId, {
      status,
      assigneeId,
      priority,
    });
  }

  @Post('tasks/:taskId/attachments')
  async addTaskAttachment(
    @Param('taskId') taskId: string,
    @Body('filename') filename: string,
    @Body('url') url: string,
    @Body('size') size: number,
    @Body('mimeType') mimeType: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.workspaceService.addTaskAttachment(taskId, {
      filename,
      url,
      size,
      mimeType,
      uploadedBy,
      uploadedAt: new Date(),
    });
  }

  // ===== NDA MANAGEMENT =====

  @Post(':workspaceId/nda')
  async generateNDA(
    @Param('workspaceId') workspaceId: string,
    @Body('templateType') templateType: NDADocument['templateType'],
    @Body('parties') parties: Array<{
      type: 'DISCLOSER' | 'RECIPIENT' | 'MUTUAL';
      name: string;
      email: string;
      company?: string;
      address?: string;
    }>,
    @Body('confidentialityPeriod') confidentialityPeriod?: number,
    @Body('governingLaw') governingLaw?: string,
    @Body('jurisdiction') jurisdiction?: string,
    @Body('perpetual') perpetual?: boolean,
    @Body('expirationDate') expirationDate?: string,
  ) {
    return this.workspaceService.generateNDA({
      workspaceId,
      templateType,
      parties,
      confidentialityPeriod,
      governingLaw,
      jurisdiction,
      perpetual,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
    });
  }

  @Get('nda/:ndaId')
  async getNDA(@Param('ndaId') ndaId: string) {
    return this.workspaceService.getNDA(ndaId);
  }

  @Get(':workspaceId/nda')
  async getNDAs(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getNDAsForWorkspace(workspaceId);
  }

  @Post('nda/:ndaId/send')
  async sendNDAForSignature(@Param('ndaId') ndaId: string) {
    return this.workspaceService.sendNDAForSignature(ndaId);
  }

  @Post('nda/:ndaId/sign')
  async signNDA(
    @Param('ndaId') ndaId: string,
    @Body('partyEmail') partyEmail: string,
    @Body('signatureHash') signatureHash: string,
    @Body('ipAddress') ipAddress?: string,
  ) {
    return this.workspaceService.signNDA(ndaId, partyEmail, signatureHash, ipAddress);
  }

  // ===== IP AGREEMENT MANAGEMENT =====

  @Post(':workspaceId/ip-agreement')
  async createIPAgreement(
    @Param('workspaceId') workspaceId: string,
    @Body('type') type: IPAgreement['type'],
    @Body('ownership') ownership: IPAgreement['ownership'],
    @Body('scope') scope: string,
    @Body('parties') parties: Array<{
      role: 'CREATOR' | 'ASSIGNEE' | 'LICENSOR' | 'LICENSEE';
      name: string;
      email: string;
      company?: string;
    }>,
    @Body('contractId') contractId?: string,
    @Body('exclusions') exclusions?: string[],
    @Body('licensedRights') licensedRights?: {
      commercial: boolean;
      modification: boolean;
      distribution: boolean;
      sublicensing: boolean;
      territory: 'WORLDWIDE' | 'REGIONAL' | 'COUNTRY_SPECIFIC';
      countries?: string[];
      duration: 'PERPETUAL' | 'LIMITED';
      years?: number;
    },
    @Body('customTerms') customTerms?: string,
  ) {
    return this.workspaceService.createIPAgreement({
      workspaceId,
      contractId,
      type,
      ownership,
      scope,
      exclusions,
      licensedRights,
      customTerms,
      parties,
    });
  }

  @Get('ip-agreement/:agreementId')
  async getIPAgreement(@Param('agreementId') agreementId: string) {
    return this.workspaceService.getIPAgreement(agreementId);
  }

  @Get(':workspaceId/ip-agreements')
  async getIPAgreements(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getIPAgreementsForWorkspace(workspaceId);
  }

  @Post('ip-agreement/:agreementId/acknowledge')
  async acknowledgeIPAgreement(
    @Param('agreementId') agreementId: string,
    @Body('partyEmail') partyEmail: string,
  ) {
    return this.workspaceService.acknowledgeIPAgreement(agreementId, partyEmail);
  }

  // ===== ACTIVITY FEED =====

  @Get(':workspaceId/activity')
  async getActivityFeed(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.workspaceService.getActivityFeed(
      workspaceId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // ===== INVOICING =====

  @Post(':workspaceId/invoices')
  async generateInvoice(
    @Param('workspaceId') workspaceId: string,
    @Body('freelancerId') freelancerId: string,
    @Body('clientId') clientId: string,
    @Body('periodStart') periodStart: string,
    @Body('periodEnd') periodEnd: string,
    @Body('vatRate') vatRate?: number,
    @Body('notes') notes?: string,
  ) {
    return this.workspaceService.generateInvoiceFromTimeEntries({
      workspaceId,
      freelancerId,
      clientId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      vatRate,
      notes,
    });
  }

  @Get('invoices/:invoiceId')
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    return this.workspaceService.getInvoice(invoiceId);
  }

  @Get(':workspaceId/invoices')
  async getInvoices(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getInvoicesForWorkspace(workspaceId);
  }

  @Put('invoices/:invoiceId/status')
  async updateInvoiceStatus(
    @Param('invoiceId') invoiceId: string,
    @Body('status') status: 'DRAFT' | 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED',
    @Body('eFacturaId') eFacturaId?: string,
  ) {
    return this.workspaceService.updateInvoiceStatus(invoiceId, status, eFacturaId);
  }

  // ===== REPORTS =====

  @Get(':workspaceId/reports/time')
  async getTimeReport(
    @Param('workspaceId') workspaceId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.workspaceService.generateTimeReport(
      workspaceId,
      new Date(periodStart),
      new Date(periodEnd),
    );
  }

  // ===== REFERENCE DATA =====

  @Get('reference/default-settings')
  getDefaultSettings() {
    return this.workspaceService.getDefaultWorkspaceSettings();
  }

  @Get('reference/ip-agreement-types')
  getIPAgreementTypes() {
    return this.workspaceService.getIPAgreementTypes();
  }

  @Get('reference/nda-template-types')
  getNDATemplateTypes() {
    return this.workspaceService.getNDATemplateTypes();
  }
}
