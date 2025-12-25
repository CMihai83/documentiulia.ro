import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ClientPortalService } from './client-portal.service';

@ApiTags('client-portal')
@Controller('client-portal')
export class ClientPortalController {
  constructor(private readonly portalService: ClientPortalService) {}

  // Dashboard
  @Get(':clientId/dashboard')
  @ApiOperation({ summary: 'Get client portal dashboard' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getDashboard(@Param('clientId') clientId: string) {
    return this.portalService.getPortalDashboard(clientId);
  }

  // Profile
  @Get(':clientId/profile')
  @ApiOperation({ summary: 'Get client profile' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Client profile' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getProfile(@Param('clientId') clientId: string) {
    const profile = await this.portalService.getClientProfile(clientId);
    if (!profile) {
      return { error: 'Client not found', statusCode: 404 };
    }
    return profile;
  }

  @Put(':clientId/profile')
  @ApiOperation({ summary: 'Update client profile' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @Param('clientId') clientId: string,
    @Body() body: { phone?: string; address?: string; city?: string },
  ) {
    const profile = await this.portalService.updateClientProfile(clientId, body);
    if (!profile) {
      return { error: 'Client not found', statusCode: 404 };
    }
    return profile;
  }

  // Documents
  @Get(':clientId/documents')
  @ApiOperation({ summary: 'Get client documents' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiQuery({ name: 'type', required: false, enum: ['invoice', 'contract', 'report', 'statement', 'tax_document', 'other'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async getDocuments(
    @Param('clientId') clientId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.portalService.getClientDocuments(clientId, type, limit, offset);
  }

  @Get(':clientId/documents/:documentId')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentById(
    @Param('clientId') clientId: string,
    @Param('documentId') documentId: string,
  ) {
    const document = await this.portalService.getDocumentById(clientId, documentId);
    if (!document) {
      return { error: 'Document not found', statusCode: 404 };
    }
    return document;
  }

  @Post(':clientId/documents')
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'type', 'category'],
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['invoice', 'contract', 'report', 'statement', 'tax_document', 'other'] },
        category: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  async uploadDocument(
    @Param('clientId') clientId: string,
    @Body() body: {
      name: string;
      type: 'invoice' | 'contract' | 'report' | 'statement' | 'tax_document' | 'other';
      category: string;
      tags?: string[];
    },
  ) {
    return this.portalService.uploadDocument(clientId, body);
  }

  // Invoices
  @Get(':clientId/invoices')
  @ApiOperation({ summary: 'Get client invoices' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  async getInvoices(
    @Param('clientId') clientId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.portalService.getClientInvoices(clientId, status, limit, offset);
  }

  @Get(':clientId/invoices/summary')
  @ApiOperation({ summary: 'Get invoice summary' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'Invoice summary' })
  async getInvoiceSummary(@Param('clientId') clientId: string) {
    return this.portalService.getInvoiceSummary(clientId);
  }

  @Get(':clientId/invoices/:invoiceId')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceById(
    @Param('clientId') clientId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    const invoice = await this.portalService.getInvoiceById(clientId, invoiceId);
    if (!invoice) {
      return { error: 'Invoice not found', statusCode: 404 };
    }
    return invoice;
  }

  // Statements
  @Get(':clientId/statements')
  @ApiOperation({ summary: 'Get account statements' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'List of statements' })
  async getStatements(@Param('clientId') clientId: string) {
    return this.portalService.getStatements(clientId);
  }

  @Post(':clientId/statements')
  @ApiOperation({ summary: 'Generate a new account statement' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['periodStart', 'periodEnd'],
      properties: {
        periodStart: { type: 'string', format: 'date' },
        periodEnd: { type: 'string', format: 'date' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Statement generated' })
  async generateStatement(
    @Param('clientId') clientId: string,
    @Body() body: { periodStart: string; periodEnd: string },
  ) {
    return this.portalService.generateStatement(
      clientId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
    );
  }

  // Messages
  @Get(':clientId/messages')
  @ApiOperation({ summary: 'Get messages' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('clientId') clientId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.portalService.getMessages(clientId, limit, offset);
  }

  @Post(':clientId/messages')
  @ApiOperation({ summary: 'Send a new message' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['subject', 'content'],
      properties: {
        subject: { type: 'string' },
        content: { type: 'string' },
        attachments: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Param('clientId') clientId: string,
    @Body() body: { subject: string; content: string; attachments?: string[] },
  ) {
    return this.portalService.sendMessage(clientId, body);
  }

  @Post(':clientId/messages/:messageId/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  @HttpCode(HttpStatus.OK)
  async markMessageAsRead(
    @Param('clientId') clientId: string,
    @Param('messageId') messageId: string,
  ) {
    const result = await this.portalService.markMessageAsRead(clientId, messageId);
    return { success: result };
  }

  // Notifications
  @Get(':clientId/notifications')
  @ApiOperation({ summary: 'Get notifications' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @Param('clientId') clientId: string,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('limit') limit?: number,
  ) {
    return this.portalService.getNotifications(clientId, unreadOnly, limit);
  }

  @Post(':clientId/notifications/:notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @HttpCode(HttpStatus.OK)
  async markNotificationAsRead(
    @Param('clientId') clientId: string,
    @Param('notificationId') notificationId: string,
  ) {
    const result = await this.portalService.markNotificationAsRead(clientId, notificationId);
    return { success: result };
  }

  @Post(':clientId/notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @HttpCode(HttpStatus.OK)
  async markAllNotificationsAsRead(@Param('clientId') clientId: string) {
    const count = await this.portalService.markAllNotificationsAsRead(clientId);
    return { success: true, markedAsRead: count };
  }

  // Activity Log
  @Get(':clientId/activity')
  @ApiOperation({ summary: 'Get activity log' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Activity log' })
  async getActivityLog(
    @Param('clientId') clientId: string,
    @Query('limit') limit?: number,
  ) {
    return this.portalService.getActivityLog(clientId, limit);
  }
}
