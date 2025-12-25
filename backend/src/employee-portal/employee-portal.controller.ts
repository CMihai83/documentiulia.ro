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
  EmployeePortalService,
  LeaveType,
  LeaveRequestStatus,
  DocumentType,
  EmployeeDashboard,
  EmployeeProfile,
  LeaveBalance,
  LeaveRequest,
  Payslip,
  EmployeeDocument,
  EmployeeNotification,
  TeamMember,
} from './employee-portal.service';

// DTOs
class CreateLeaveRequestDto {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  replacementId?: string;
  attachments?: string[];
}

class UpdateProfileDto {
  phone?: string;
  address?: string;
  emergencyContact?: string;
}

class UploadDocumentDto {
  type: DocumentType;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

@ApiTags('Employee Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employee-portal')
export class EmployeePortalController {
  constructor(private readonly portalService: EmployeePortalService) {}

  // =================== DASHBOARD ===================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get employee dashboard with all key information' })
  @ApiResponse({ status: 200, description: 'Employee dashboard data' })
  async getDashboard(@Request() req: any): Promise<EmployeeDashboard> {
    return this.portalService.getDashboard(req.user.sub);
  }

  // =================== PROFILE ===================

  @Get('profile')
  @ApiOperation({ summary: 'Get employee profile' })
  @ApiResponse({ status: 200, description: 'Employee profile' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getProfile(@Request() req: any): Promise<EmployeeProfile> {
    return this.portalService.getEmployeeProfile(req.user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Request profile updates (requires HR approval)' })
  @ApiResponse({ status: 200, description: 'Update requests created' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.portalService.updateProfile(req.user.sub, dto);
  }

  // =================== LEAVE MANAGEMENT ===================

  @Get('leave/balance')
  @ApiOperation({ summary: 'Get leave balance' })
  @ApiResponse({ status: 200, description: 'Leave balance details' })
  async getLeaveBalance(@Request() req: any): Promise<LeaveBalance> {
    return this.portalService.getLeaveBalance(req.user.sub);
  }

  @Get('leave/requests')
  @ApiOperation({ summary: 'Get leave requests' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveRequestStatus })
  @ApiResponse({ status: 200, description: 'List of leave requests' })
  async getLeaveRequests(
    @Request() req: any,
    @Query('status') status?: LeaveRequestStatus,
  ): Promise<LeaveRequest[]> {
    return this.portalService.getLeaveRequests(req.user.sub, status);
  }

  @Get('leave/upcoming')
  @ApiOperation({ summary: 'Get upcoming approved leave' })
  @ApiResponse({ status: 200, description: 'Upcoming leave list' })
  async getUpcomingLeave(@Request() req: any): Promise<LeaveRequest[]> {
    return this.portalService.getUpcomingLeave(req.user.sub);
  }

  @Post('leave/requests')
  @ApiOperation({ summary: 'Create a new leave request' })
  @ApiResponse({ status: 201, description: 'Leave request created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createLeaveRequest(
    @Request() req: any,
    @Body() dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    return this.portalService.createLeaveRequest(req.user.sub, dto);
  }

  @Post('leave/requests/:requestId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a leave request' })
  @ApiParam({ name: 'requestId', description: 'Leave request ID' })
  @ApiResponse({ status: 200, description: 'Leave request cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel this request' })
  async cancelLeaveRequest(
    @Request() req: any,
    @Param('requestId') requestId: string,
  ): Promise<LeaveRequest> {
    return this.portalService.cancelLeaveRequest(req.user.sub, requestId);
  }

  @Get('leave/types')
  @ApiOperation({ summary: 'Get available leave types' })
  @ApiResponse({ status: 200, description: 'List of leave types' })
  getLeaveTypes() {
    return Object.values(LeaveType).map(type => ({
      value: type,
      label: this.getLeaveTypeLabel(type),
      labelEn: this.getLeaveTypeLabelEn(type),
    }));
  }

  private getLeaveTypeLabel(type: LeaveType): string {
    const labels: Record<LeaveType, string> = {
      [LeaveType.ANNUAL]: 'Concediu de Odihnă',
      [LeaveType.MEDICAL]: 'Concediu Medical',
      [LeaveType.UNPAID]: 'Concediu Fără Plată',
      [LeaveType.MATERNITY]: 'Concediu Maternitate',
      [LeaveType.PATERNITY]: 'Concediu Paternitate',
      [LeaveType.CHILDCARE]: 'Concediu Creștere Copil',
      [LeaveType.BEREAVEMENT]: 'Concediu Deces Familie',
      [LeaveType.MARRIAGE]: 'Concediu Căsătorie',
      [LeaveType.STUDY]: 'Concediu Studii',
      [LeaveType.SPECIAL]: 'Concediu Special',
    };
    return labels[type];
  }

  private getLeaveTypeLabelEn(type: LeaveType): string {
    const labels: Record<LeaveType, string> = {
      [LeaveType.ANNUAL]: 'Annual Leave',
      [LeaveType.MEDICAL]: 'Sick Leave',
      [LeaveType.UNPAID]: 'Unpaid Leave',
      [LeaveType.MATERNITY]: 'Maternity Leave',
      [LeaveType.PATERNITY]: 'Paternity Leave',
      [LeaveType.CHILDCARE]: 'Childcare Leave',
      [LeaveType.BEREAVEMENT]: 'Bereavement Leave',
      [LeaveType.MARRIAGE]: 'Marriage Leave',
      [LeaveType.STUDY]: 'Study Leave',
      [LeaveType.SPECIAL]: 'Special Leave',
    };
    return labels[type];
  }

  // =================== PAYSLIPS ===================

  @Get('payslips')
  @ApiOperation({ summary: 'Get all payslips' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of payslips' })
  async getPayslips(
    @Request() req: any,
    @Query('year') year?: string,
  ): Promise<Payslip[]> {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.portalService.getPayslips(req.user.sub, yearNum);
  }

  @Get('payslips/recent')
  @ApiOperation({ summary: 'Get most recent payslips' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent payslips' })
  async getRecentPayslips(
    @Request() req: any,
    @Query('limit') limit?: string,
  ): Promise<Payslip[]> {
    const limitNum = limit ? parseInt(limit, 10) : 3;
    return this.portalService.getRecentPayslips(req.user.sub, limitNum);
  }

  @Get('payslips/years')
  @ApiOperation({ summary: 'Get available payslip years' })
  @ApiResponse({ status: 200, description: 'List of years with payslips' })
  async getPayslipYears(@Request() req: any): Promise<number[]> {
    return this.portalService.getPayslipYears(req.user.sub);
  }

  @Get('payslips/:payslipId')
  @ApiOperation({ summary: 'Get payslip details' })
  @ApiParam({ name: 'payslipId', description: 'Payslip ID' })
  @ApiResponse({ status: 200, description: 'Payslip details' })
  @ApiResponse({ status: 404, description: 'Payslip not found' })
  async getPayslip(
    @Request() req: any,
    @Param('payslipId') payslipId: string,
  ): Promise<Payslip> {
    return this.portalService.getPayslip(req.user.sub, payslipId);
  }

  @Get('payslips/:payslipId/download')
  @ApiOperation({ summary: 'Download payslip PDF' })
  @ApiParam({ name: 'payslipId', description: 'Payslip ID' })
  @ApiResponse({ status: 200, description: 'Download URL and filename' })
  async downloadPayslip(
    @Request() req: any,
    @Param('payslipId') payslipId: string,
  ): Promise<{ url: string; filename: string }> {
    return this.portalService.downloadPayslip(req.user.sub, payslipId);
  }

  // =================== DOCUMENTS ===================

  @Get('documents')
  @ApiOperation({ summary: 'Get employee documents' })
  @ApiQuery({ name: 'type', required: false, enum: DocumentType })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async getDocuments(
    @Request() req: any,
    @Query('type') type?: DocumentType,
  ): Promise<EmployeeDocument[]> {
    return this.portalService.getDocuments(req.user.sub, type);
  }

  @Get('documents/:documentId')
  @ApiOperation({ summary: 'Get document details' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
  ): Promise<EmployeeDocument> {
    return this.portalService.getDocument(req.user.sub, documentId);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  async uploadDocument(
    @Request() req: any,
    @Body() dto: UploadDocumentDto,
  ): Promise<EmployeeDocument> {
    return this.portalService.uploadDocument(req.user.sub, dto);
  }

  @Get('documents/types')
  @ApiOperation({ summary: 'Get available document types' })
  @ApiResponse({ status: 200, description: 'List of document types' })
  getDocumentTypes() {
    return Object.values(DocumentType).map(type => ({
      value: type,
      label: this.getDocumentTypeLabel(type),
      labelEn: this.getDocumentTypeLabelEn(type),
    }));
  }

  private getDocumentTypeLabel(type: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      [DocumentType.CONTRACT]: 'Contract de Muncă',
      [DocumentType.ADDENDUM]: 'Act Adițional',
      [DocumentType.PAYSLIP]: 'Fluturaș Salariu',
      [DocumentType.CERTIFICATE]: 'Adeverință',
      [DocumentType.TRAINING_CERT]: 'Certificat Training',
      [DocumentType.MEDICAL_CERT]: 'Certificat Medical',
      [DocumentType.ID_DOCUMENT]: 'Document Identitate',
      [DocumentType.OTHER]: 'Altele',
    };
    return labels[type];
  }

  private getDocumentTypeLabelEn(type: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      [DocumentType.CONTRACT]: 'Employment Contract',
      [DocumentType.ADDENDUM]: 'Contract Addendum',
      [DocumentType.PAYSLIP]: 'Payslip',
      [DocumentType.CERTIFICATE]: 'Certificate',
      [DocumentType.TRAINING_CERT]: 'Training Certificate',
      [DocumentType.MEDICAL_CERT]: 'Medical Certificate',
      [DocumentType.ID_DOCUMENT]: 'ID Document',
      [DocumentType.OTHER]: 'Other',
    };
    return labels[type];
  }

  // =================== NOTIFICATIONS ===================

  @Get('notifications')
  @ApiOperation({ summary: 'Get notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<EmployeeNotification[]> {
    const unread = unreadOnly === 'true';
    return this.portalService.getNotifications(req.user.sub, unread);
  }

  @Get('notifications/unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread notifications' })
  async getUnreadNotifications(@Request() req: any): Promise<EmployeeNotification[]> {
    return this.portalService.getUnreadNotifications(req.user.sub);
  }

  @Get('notifications/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadNotificationCount(@Request() req: any): Promise<{ count: number }> {
    const notifications = await this.portalService.getUnreadNotifications(req.user.sub);
    return { count: notifications.length };
  }

  @Post('notifications/:notificationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markNotificationAsRead(
    @Request() req: any,
    @Param('notificationId') notificationId: string,
  ): Promise<EmployeeNotification> {
    return this.portalService.markNotificationAsRead(req.user.sub, notificationId);
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllNotificationsAsRead(@Request() req: any): Promise<{ count: number }> {
    const count = await this.portalService.markAllNotificationsAsRead(req.user.sub);
    return { count };
  }

  // =================== TEAM ===================

  @Get('team')
  @ApiOperation({ summary: 'Get team members' })
  @ApiResponse({ status: 200, description: 'List of team members' })
  async getTeamMembers(@Request() req: any): Promise<TeamMember[]> {
    return this.portalService.getTeamMembers(req.user.sub);
  }

  @Get('team/manager')
  @ApiOperation({ summary: 'Get direct manager' })
  @ApiResponse({ status: 200, description: 'Manager details or null' })
  async getManager(@Request() req: any): Promise<TeamMember | null> {
    return this.portalService.getManager(req.user.sub);
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get portal statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Portal statistics' })
  async getStatistics() {
    return this.portalService.getPortalStatistics();
  }

  @Get('pending-count')
  @ApiOperation({ summary: 'Get count of pending requests' })
  @ApiResponse({ status: 200, description: 'Pending requests count' })
  async getPendingCount(@Request() req: any): Promise<{ count: number }> {
    const count = await this.portalService.getPendingRequestsCount(req.user.sub);
    return { count };
  }

  // =================== QUICK ACTIONS ===================

  @Post('leave/quick-annual')
  @ApiOperation({ summary: 'Quick create annual leave request' })
  @ApiResponse({ status: 201, description: 'Annual leave request created' })
  async quickAnnualLeave(
    @Request() req: any,
    @Body() dto: { startDate: string; endDate: string; reason?: string },
  ): Promise<LeaveRequest> {
    return this.portalService.createLeaveRequest(req.user.sub, {
      type: LeaveType.ANNUAL,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
    });
  }

  @Post('leave/quick-medical')
  @ApiOperation({ summary: 'Quick create medical leave entry' })
  @ApiResponse({ status: 201, description: 'Medical leave created' })
  async quickMedicalLeave(
    @Request() req: any,
    @Body() dto: { startDate: string; endDate: string; attachments: string[] },
  ): Promise<LeaveRequest> {
    return this.portalService.createLeaveRequest(req.user.sub, {
      type: LeaveType.MEDICAL,
      startDate: dto.startDate,
      endDate: dto.endDate,
      attachments: dto.attachments,
    });
  }
}
