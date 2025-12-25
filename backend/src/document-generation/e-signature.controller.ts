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
  ESignatureService,
  SignatureStatus,
  SignerRole,
  SignatureField,
  AdditionalField,
  SignatureSettings,
} from './e-signature.service';

@ApiTags('Document Generation - E-Signature')
@Controller('esignature')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ESignatureController {
  constructor(private readonly signatureService: ESignatureService) {}

  // =================== SIGNATURE REQUESTS ===================

  @Post('requests')
  @ApiOperation({ summary: 'Create signature request' })
  @ApiResponse({ status: 201, description: 'Request created' })
  async createRequest(
    @Request() req: any,
    @Body() body: {
      documentId: string;
      documentName: string;
      signers: Array<{
        name: string;
        email: string;
        phone?: string;
        role?: SignerRole;
        order?: number;
      }>;
      message?: string;
      subject?: string;
      expiresInDays?: number;
      settings?: Partial<SignatureSettings>;
    },
  ) {
    return this.signatureService.createSignatureRequest({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get signature requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'documentId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Requests list' })
  async getRequests(
    @Request() req: any,
    @Query('status') status?: SignatureStatus,
    @Query('documentId') documentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const requests = await this.signatureService.getSignatureRequests(req.user.tenantId, {
      status,
      documentId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { requests, total: requests.length };
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get request details' })
  @ApiResponse({ status: 200, description: 'Request details' })
  async getRequest(@Param('id') id: string) {
    const request = await this.signatureService.getSignatureRequest(id);
    if (!request) {
      return { error: 'Request not found' };
    }
    return request;
  }

  @Post('requests/:id/send')
  @ApiOperation({ summary: 'Send for signature' })
  @ApiResponse({ status: 200, description: 'Request sent' })
  async sendRequest(@Request() req: any, @Param('id') id: string) {
    try {
      return await this.signatureService.sendForSignature(id, req.user.id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  async cancelRequest(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    try {
      return await this.signatureService.cancelRequest(id, req.user.id, body.reason);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('requests/:id/remind')
  @ApiOperation({ summary: 'Send reminder' })
  @ApiResponse({ status: 200, description: 'Reminder sent' })
  async sendReminder(
    @Param('id') id: string,
    @Body() body: { signerId?: string },
  ) {
    try {
      await this.signatureService.sendReminder(id, body.signerId);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== FIELDS ===================

  @Post('requests/:id/signers/:signerId/signature-fields')
  @ApiOperation({ summary: 'Add signature field' })
  @ApiResponse({ status: 201, description: 'Field added' })
  async addSignatureField(
    @Param('id') id: string,
    @Param('signerId') signerId: string,
    @Body() field: Omit<SignatureField, 'id' | 'signerId'>,
  ) {
    try {
      return await this.signatureService.addSignatureField(id, signerId, field);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('requests/:id/signers/:signerId/fields')
  @ApiOperation({ summary: 'Add additional field' })
  @ApiResponse({ status: 201, description: 'Field added' })
  async addAdditionalField(
    @Param('id') id: string,
    @Param('signerId') signerId: string,
    @Body() field: Omit<AdditionalField, 'id' | 'signerId'>,
  ) {
    try {
      return await this.signatureService.addAdditionalField(id, signerId, field);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== SIGNING ===================

  @Post('requests/:id/view')
  @ApiOperation({ summary: 'Record document view' })
  @ApiResponse({ status: 200, description: 'View recorded' })
  async recordView(
    @Param('id') id: string,
    @Body() body: { signerId: string; ipAddress?: string; userAgent?: string },
  ) {
    try {
      await this.signatureService.recordSignerView(id, body.signerId, {
        ipAddress: body.ipAddress,
        userAgent: body.userAgent,
      });
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('requests/:id/sign')
  @ApiOperation({ summary: 'Sign document' })
  @ApiResponse({ status: 200, description: 'Document signed' })
  async signDocument(
    @Param('id') id: string,
    @Body() body: {
      signerId: string;
      signatures: Array<{
        fieldId: string;
        value: string;
        timestamp: Date;
      }>;
      fieldValues?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    try {
      return await this.signatureService.signDocument(
        id,
        body.signerId,
        body.signatures,
        body.fieldValues,
        { ipAddress: body.ipAddress, userAgent: body.userAgent },
      );
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('requests/:id/decline')
  @ApiOperation({ summary: 'Decline to sign' })
  @ApiResponse({ status: 200, description: 'Signing declined' })
  async declineToSign(
    @Param('id') id: string,
    @Body() body: {
      signerId: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    try {
      return await this.signatureService.declineToSign(
        id,
        body.signerId,
        body.reason,
        { ipAddress: body.ipAddress, userAgent: body.userAgent },
      );
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== AUDIT TRAIL ===================

  @Get('requests/:id/audit')
  @ApiOperation({ summary: 'Get audit trail' })
  @ApiResponse({ status: 200, description: 'Audit trail' })
  async getAuditTrail(@Param('id') id: string) {
    const auditTrail = await this.signatureService.getAuditTrail(id);
    return { auditTrail, total: auditTrail.length };
  }

  // =================== CERTIFICATES ===================

  @Get('certificates/:id')
  @ApiOperation({ summary: 'Get certificate' })
  @ApiResponse({ status: 200, description: 'Certificate details' })
  async getCertificate(@Param('id') id: string) {
    const certificate = await this.signatureService.getCertificate(id);
    if (!certificate) {
      return { error: 'Certificate not found' };
    }
    return certificate;
  }

  @Get('verify/:id')
  @ApiOperation({ summary: 'Verify certificate' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyCertificate(@Param('id') id: string) {
    return this.signatureService.verifyCertificate(id);
  }

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create signature template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      documentId?: string;
      roles: Array<{ name: string; role: SignerRole; order: number }>;
      fields?: any[];
      additionalFields?: any[];
      settings?: Partial<SignatureSettings>;
    },
  ) {
    return this.signatureService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get signature templates' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const templates = await this.signatureService.getTemplates(req.user.tenantId, {
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.signatureService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Post('templates/:id/create-request')
  @ApiOperation({ summary: 'Create request from template' })
  @ApiResponse({ status: 201, description: 'Request created from template' })
  async createRequestFromTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      documentId: string;
      documentName: string;
      signers: Array<{
        roleName: string;
        name: string;
        email: string;
        phone?: string;
      }>;
      message?: string;
      subject?: string;
    },
  ) {
    try {
      return await this.signatureService.createRequestFromTemplate(id, {
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
        ...body,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get e-signature stats' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStats(@Request() req: any) {
    return this.signatureService.getStats(req.user.tenantId);
  }
}
