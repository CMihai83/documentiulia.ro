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
  VendorPortalService,
  PortalUserRole,
  PortalPermission,
  MessagePriority,
  MessageStatus,
  RequestType,
  RequestStatus,
  NotificationType,
  MessageAttachment,
  ProfileChange,
} from './vendor-portal.service';

@ApiTags('Vendor Management - Portal')
@Controller('vendors/portal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorPortalController {
  constructor(private readonly portalService: VendorPortalService) {}

  // =================== PORTAL USERS ===================

  @Post('users')
  @ApiOperation({ summary: 'Create portal user' })
  @ApiResponse({ status: 201, description: 'Portal user created' })
  async createPortalUser(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: PortalUserRole;
      phone?: string;
      jobTitle?: string;
      department?: string;
      permissions?: PortalPermission[];
    },
  ) {
    try {
      return await this.portalService.createPortalUser({
        ...body,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get portal user by ID' })
  @ApiResponse({ status: 200, description: 'Portal user details' })
  async getPortalUser(@Param('id') id: string) {
    const user = await this.portalService.getPortalUser(id);
    if (!user) {
      return { error: 'Portal user not found' };
    }
    return user;
  }

  @Get('vendor/:vendorId/users')
  @ApiOperation({ summary: 'Get vendor portal users' })
  @ApiResponse({ status: 200, description: 'Vendor portal users list' })
  async getVendorPortalUsers(@Param('vendorId') vendorId: string) {
    const users = await this.portalService.getVendorPortalUsers(vendorId);
    return { users, total: users.length };
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update portal user' })
  @ApiResponse({ status: 200, description: 'Portal user updated' })
  async updatePortalUser(
    @Param('id') id: string,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      role?: PortalUserRole;
      phone?: string;
      jobTitle?: string;
      department?: string;
      permissions?: PortalPermission[];
      mfaEnabled?: boolean;
      mfaMethod?: 'email' | 'sms' | 'authenticator';
    },
  ) {
    const user = await this.portalService.updatePortalUser(id, body);
    if (!user) {
      return { error: 'Portal user not found' };
    }
    return user;
  }

  @Post('users/:id/activate')
  @ApiOperation({ summary: 'Activate portal user' })
  @ApiResponse({ status: 200, description: 'Portal user activated' })
  async activatePortalUser(@Param('id') id: string) {
    const user = await this.portalService.activatePortalUser(id);
    if (!user) {
      return { error: 'Portal user not found or not pending' };
    }
    return user;
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend portal user' })
  @ApiResponse({ status: 200, description: 'Portal user suspended' })
  async suspendPortalUser(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const user = await this.portalService.suspendPortalUser(id, body.reason);
    if (!user) {
      return { error: 'Portal user not found or not active' };
    }
    return user;
  }

  @Post('users/:id/login')
  @ApiOperation({ summary: 'Record user login' })
  @ApiResponse({ status: 200, description: 'Login recorded' })
  async recordLogin(@Param('id') id: string) {
    const user = await this.portalService.recordLogin(id);
    if (!user) {
      return { error: 'Portal user not found' };
    }
    return user;
  }

  // =================== INVITATIONS ===================

  @Post('invitations')
  @ApiOperation({ summary: 'Create portal invitation' })
  @ApiResponse({ status: 201, description: 'Invitation created' })
  async createInvitation(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      email: string;
      role: PortalUserRole;
      permissions?: PortalPermission[];
      message?: string;
      expiresInDays?: number;
    },
  ) {
    return this.portalService.createInvitation({
      ...body,
      invitedBy: req.user.id,
      invitedByName: req.user.name || req.user.email,
    });
  }

  @Get('invitations/:id')
  @ApiOperation({ summary: 'Get invitation by ID' })
  @ApiResponse({ status: 200, description: 'Invitation details' })
  async getInvitation(@Param('id') id: string) {
    const invitation = await this.portalService.getInvitation(id);
    if (!invitation) {
      return { error: 'Invitation not found' };
    }
    return invitation;
  }

  @Get('invitations/token/:token')
  @ApiOperation({ summary: 'Get invitation by token' })
  @ApiResponse({ status: 200, description: 'Invitation details' })
  async getInvitationByToken(@Param('token') token: string) {
    const invitation = await this.portalService.getInvitationByToken(token);
    if (!invitation) {
      return { error: 'Invitation not found or expired' };
    }
    return invitation;
  }

  @Get('vendor/:vendorId/invitations')
  @ApiOperation({ summary: 'Get vendor invitations' })
  @ApiResponse({ status: 200, description: 'Vendor invitations list' })
  async getVendorInvitations(@Param('vendorId') vendorId: string) {
    const invitations = await this.portalService.getVendorInvitations(vendorId);
    return { invitations, total: invitations.length };
  }

  @Post('invitations/:token/accept')
  @ApiOperation({ summary: 'Accept invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  async acceptInvitation(
    @Param('token') token: string,
    @Body() body: { userId: string },
  ) {
    const invitation = await this.portalService.acceptInvitation(token, body.userId);
    if (!invitation) {
      return { error: 'Invitation not found, already used, or expired' };
    }
    return invitation;
  }

  @Post('invitations/:id/revoke')
  @ApiOperation({ summary: 'Revoke invitation' })
  @ApiResponse({ status: 200, description: 'Invitation revoked' })
  async revokeInvitation(@Param('id') id: string) {
    const invitation = await this.portalService.revokeInvitation(id);
    if (!invitation) {
      return { error: 'Invitation not found or not pending' };
    }
    return invitation;
  }

  // =================== MESSAGING ===================

  @Post('messages')
  @ApiOperation({ summary: 'Send message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      subject: string;
      body: string;
      priority?: MessagePriority;
      fromVendor: boolean;
      recipientId?: string;
      recipientName?: string;
      parentMessageId?: string;
      attachments?: Omit<MessageAttachment, 'id'>[];
    },
  ) {
    return this.portalService.sendMessage({
      ...body,
      tenantId: req.user.tenantId,
      senderId: req.user.id,
      senderName: req.user.name || req.user.email,
    });
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get message by ID' })
  @ApiResponse({ status: 200, description: 'Message details' })
  async getMessage(@Param('id') id: string) {
    const message = await this.portalService.getMessage(id);
    if (!message) {
      return { error: 'Message not found' };
    }
    return message;
  }

  @Get('vendor/:vendorId/messages')
  @ApiOperation({ summary: 'Get vendor messages' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fromVendor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vendor messages list' })
  async getVendorMessages(
    @Param('vendorId') vendorId: string,
    @Query('status') status?: MessageStatus,
    @Query('fromVendor') fromVendor?: string,
    @Query('limit') limit?: string,
  ) {
    const messages = await this.portalService.getVendorMessages(vendorId, {
      status,
      fromVendor: fromVendor ? fromVendor === 'true' : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { messages, total: messages.length };
  }

  @Get('messages/thread/:threadId')
  @ApiOperation({ summary: 'Get message thread' })
  @ApiResponse({ status: 200, description: 'Message thread' })
  async getMessageThread(@Param('threadId') threadId: string) {
    const messages = await this.portalService.getMessageThread(threadId);
    return { messages, total: messages.length };
  }

  @Post('messages/:id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markMessageAsRead(@Request() req: any, @Param('id') id: string) {
    const message = await this.portalService.markMessageAsRead(id, req.user.id);
    if (!message) {
      return { error: 'Message not found' };
    }
    return message;
  }

  @Post('messages/:id/archive')
  @ApiOperation({ summary: 'Archive message' })
  @ApiResponse({ status: 200, description: 'Message archived' })
  async archiveMessage(@Param('id') id: string) {
    const message = await this.portalService.archiveMessage(id);
    if (!message) {
      return { error: 'Message not found' };
    }
    return message;
  }

  // =================== NOTIFICATIONS ===================

  @Post('notifications')
  @ApiOperation({ summary: 'Create notification' })
  @ApiResponse({ status: 201, description: 'Notification created' })
  async createNotification(
    @Body() body: {
      vendorId: string;
      userId?: string;
      type: NotificationType;
      title: string;
      message: string;
      actionUrl?: string;
      actionLabel?: string;
      relatedEntity?: { type: string; id: string };
      expiresInDays?: number;
    },
  ) {
    return this.portalService.createNotification(body);
  }

  @Get('vendor/:vendorId/notifications')
  @ApiOperation({ summary: 'Get vendor notifications' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vendor notifications list' })
  async getVendorNotifications(
    @Param('vendorId') vendorId: string,
    @Query('userId') userId?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: string,
  ) {
    const notifications = await this.portalService.getVendorNotifications(vendorId, {
      userId,
      unreadOnly: unreadOnly ? unreadOnly === 'true' : undefined,
      type,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { notifications, total: notifications.length };
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markNotificationAsRead(@Param('id') id: string) {
    const notification = await this.portalService.markNotificationAsRead(id);
    if (!notification) {
      return { error: 'Notification not found' };
    }
    return notification;
  }

  @Post('vendor/:vendorId/notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markAllNotificationsAsRead(
    @Param('vendorId') vendorId: string,
    @Query('userId') userId?: string,
  ) {
    const count = await this.portalService.markAllNotificationsAsRead(vendorId, userId);
    return { markedAsRead: count };
  }

  // =================== SUPPORT REQUESTS ===================

  @Post('requests')
  @ApiOperation({ summary: 'Create support request' })
  @ApiResponse({ status: 201, description: 'Request created' })
  async createRequest(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      type: RequestType;
      subject: string;
      description: string;
      priority?: MessagePriority;
      attachments?: Omit<MessageAttachment, 'id'>[];
    },
  ) {
    return this.portalService.createRequest({
      ...body,
      tenantId: req.user.tenantId,
      requestedBy: req.user.id,
      requestedByName: req.user.name || req.user.email,
    });
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get request by ID' })
  @ApiResponse({ status: 200, description: 'Request details' })
  async getRequest(@Param('id') id: string) {
    const request = await this.portalService.getRequest(id);
    if (!request) {
      return { error: 'Request not found' };
    }
    return request;
  }

  @Get('vendor/:vendorId/requests')
  @ApiOperation({ summary: 'Get vendor requests' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vendor requests list' })
  async getVendorRequests(
    @Param('vendorId') vendorId: string,
    @Query('type') type?: RequestType,
    @Query('status') status?: RequestStatus,
    @Query('limit') limit?: string,
  ) {
    const requests = await this.portalService.getVendorRequests(vendorId, {
      type,
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { requests, total: requests.length };
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get all requests (tenant)' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Requests list' })
  async getTenantRequests(
    @Request() req: any,
    @Query('vendorId') vendorId?: string,
    @Query('type') type?: RequestType,
    @Query('status') status?: RequestStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit?: string,
  ) {
    const requests = await this.portalService.getTenantRequests(req.user.tenantId, {
      vendorId,
      type,
      status,
      assignedTo,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { requests, total: requests.length };
  }

  @Post('requests/:id/assign')
  @ApiOperation({ summary: 'Assign request' })
  @ApiResponse({ status: 200, description: 'Request assigned' })
  async assignRequest(
    @Param('id') id: string,
    @Body() body: { assignedTo: string; assignedToName: string },
  ) {
    const request = await this.portalService.assignRequest(
      id,
      body.assignedTo,
      body.assignedToName,
    );
    if (!request) {
      return { error: 'Request not found' };
    }
    return request;
  }

  @Post('requests/:id/comments')
  @ApiOperation({ summary: 'Add comment to request' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addRequestComment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      content: string;
      fromVendor: boolean;
      attachments?: Omit<MessageAttachment, 'id'>[];
    },
  ) {
    const request = await this.portalService.addRequestComment(id, {
      ...body,
      authorId: req.user.id,
      authorName: req.user.name || req.user.email,
    });
    if (!request) {
      return { error: 'Request not found' };
    }
    return request;
  }

  @Post('requests/:id/resolve')
  @ApiOperation({ summary: 'Resolve request' })
  @ApiResponse({ status: 200, description: 'Request resolved' })
  async resolveRequest(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { resolution: string },
  ) {
    const request = await this.portalService.resolveRequest(
      id,
      body.resolution,
      req.user.id,
    );
    if (!request) {
      return { error: 'Request not found' };
    }
    return request;
  }

  @Post('requests/:id/close')
  @ApiOperation({ summary: 'Close request' })
  @ApiResponse({ status: 200, description: 'Request closed' })
  async closeRequest(@Param('id') id: string) {
    const request = await this.portalService.closeRequest(id);
    if (!request) {
      return { error: 'Request not found or not resolved' };
    }
    return request;
  }

  // =================== DOCUMENT SUBMISSIONS ===================

  @Post('documents')
  @ApiOperation({ summary: 'Submit document' })
  @ApiResponse({ status: 201, description: 'Document submitted' })
  async submitDocument(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      documentType: string;
      name: string;
      description?: string;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      expiresAt?: string;
      relatedEntity?: { type: string; id: string };
    },
  ) {
    return this.portalService.submitDocument({
      ...body,
      tenantId: req.user.tenantId,
      submittedBy: req.user.id,
      submittedByName: req.user.name || req.user.email,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document submission by ID' })
  @ApiResponse({ status: 200, description: 'Document submission details' })
  async getDocumentSubmission(@Param('id') id: string) {
    const submission = await this.portalService.getDocumentSubmission(id);
    if (!submission) {
      return { error: 'Document submission not found' };
    }
    return submission;
  }

  @Get('vendor/:vendorId/documents')
  @ApiOperation({ summary: 'Get vendor document submissions' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'documentType', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vendor document submissions list' })
  async getVendorDocumentSubmissions(
    @Param('vendorId') vendorId: string,
    @Query('status') status?: 'pending_review' | 'approved' | 'rejected',
    @Query('documentType') documentType?: string,
    @Query('limit') limit?: string,
  ) {
    const submissions = await this.portalService.getVendorDocumentSubmissions(vendorId, {
      status,
      documentType,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { submissions, total: submissions.length };
  }

  @Post('documents/:id/review')
  @ApiOperation({ summary: 'Review document submission' })
  @ApiResponse({ status: 200, description: 'Document reviewed' })
  async reviewDocumentSubmission(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      approved: boolean;
      rejectionReason?: string;
    },
  ) {
    const submission = await this.portalService.reviewDocumentSubmission(id, {
      approved: body.approved,
      reviewedBy: req.user.id,
      reviewedByName: req.user.name || req.user.email,
      rejectionReason: body.rejectionReason,
    });
    if (!submission) {
      return { error: 'Document submission not found or already reviewed' };
    }
    return submission;
  }

  // =================== PROFILE UPDATE REQUESTS ===================

  @Post('profile-updates')
  @ApiOperation({ summary: 'Request profile update' })
  @ApiResponse({ status: 201, description: 'Profile update requested' })
  async requestProfileUpdate(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      changes: ProfileChange[];
    },
  ) {
    return this.portalService.requestProfileUpdate({
      ...body,
      tenantId: req.user.tenantId,
      requestedBy: req.user.id,
      requestedByName: req.user.name || req.user.email,
    });
  }

  @Get('profile-updates/:id')
  @ApiOperation({ summary: 'Get profile update request by ID' })
  @ApiResponse({ status: 200, description: 'Profile update request details' })
  async getProfileUpdateRequest(@Param('id') id: string) {
    const request = await this.portalService.getProfileUpdateRequest(id);
    if (!request) {
      return { error: 'Profile update request not found' };
    }
    return request;
  }

  @Get('vendor/:vendorId/profile-updates')
  @ApiOperation({ summary: 'Get vendor profile update requests' })
  @ApiResponse({ status: 200, description: 'Vendor profile update requests list' })
  async getVendorProfileUpdateRequests(@Param('vendorId') vendorId: string) {
    const requests = await this.portalService.getVendorProfileUpdateRequests(vendorId);
    return { requests, total: requests.length };
  }

  @Post('profile-updates/:id/review')
  @ApiOperation({ summary: 'Review profile update request' })
  @ApiResponse({ status: 200, description: 'Profile update reviewed' })
  async reviewProfileUpdate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      approvedChanges: string[];
      rejectedChanges: { field: string; reason: string }[];
      comments?: string;
    },
  ) {
    const request = await this.portalService.reviewProfileUpdate(id, {
      ...body,
      reviewedBy: req.user.id,
      reviewedByName: req.user.name || req.user.email,
    });
    if (!request) {
      return { error: 'Profile update request not found or already reviewed' };
    }
    return request;
  }

  // =================== PORTAL SETTINGS ===================

  @Get('vendor/:vendorId/settings')
  @ApiOperation({ summary: 'Get vendor portal settings' })
  @ApiResponse({ status: 200, description: 'Portal settings' })
  async getPortalSettings(@Param('vendorId') vendorId: string) {
    const settings = await this.portalService.getPortalSettings(vendorId);
    if (!settings) {
      // Return default settings
      return this.portalService.updatePortalSettings(vendorId, {});
    }
    return settings;
  }

  @Put('vendor/:vendorId/settings')
  @ApiOperation({ summary: 'Update vendor portal settings' })
  @ApiResponse({ status: 200, description: 'Portal settings updated' })
  async updatePortalSettings(
    @Param('vendorId') vendorId: string,
    @Body() body: {
      allowedFeatures?: string[];
      customBranding?: {
        logoUrl?: string;
        primaryColor?: string;
        accentColor?: string;
      };
      notificationPreferences?: {
        type: string;
        email: boolean;
        portal: boolean;
        sms: boolean;
      }[];
      dataVisibility?: {
        showPaymentHistory: boolean;
        showPerformanceScores: boolean;
        showContractDetails: boolean;
        showComplianceStatus: boolean;
      };
    },
  ) {
    return this.portalService.updatePortalSettings(vendorId, body as any);
  }

  // =================== DASHBOARD ===================

  @Get('vendor/:vendorId/dashboard')
  @ApiOperation({ summary: 'Get vendor dashboard' })
  @ApiResponse({ status: 200, description: 'Vendor dashboard data' })
  async getVendorDashboard(@Param('vendorId') vendorId: string) {
    return this.portalService.getVendorDashboard(vendorId);
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get portal statistics' })
  @ApiResponse({ status: 200, description: 'Portal statistics' })
  async getStatistics(@Request() req: any) {
    return this.portalService.getPortalStatistics(req.user.tenantId);
  }
}
