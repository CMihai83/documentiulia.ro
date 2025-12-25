import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { DocumentRetentionService, RetentionPolicy } from './document-retention.service';

@Controller('compliance/retention')
export class DocumentRetentionController {
  constructor(private readonly retentionService: DocumentRetentionService) {}

  // Policies
  @Get('policies')
  async getPolicies(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const policies = await this.retentionService.getPolicies(tenantId);

    return {
      success: true,
      data: { policies },
    };
  }

  @Post('policies')
  async createPolicy(
    @Request() req: any,
    @Body() body: Omit<RetentionPolicy, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    if (!body.name || !body.documentTypes || !body.retentionPeriod) {
      throw new BadRequestException('Name, document types, and retention period are required');
    }

    const policy = await this.retentionService.createPolicy(tenantId, body);

    return {
      success: true,
      data: policy,
    };
  }

  @Get('policies/:id')
  async getPolicy(@Param('id') id: string) {
    const policy = await this.retentionService.getPolicy(id);
    if (!policy) {
      throw new BadRequestException('Policy not found');
    }

    return {
      success: true,
      data: policy,
    };
  }

  @Put('policies/:id')
  async updatePolicy(
    @Param('id') id: string,
    @Body() body: Partial<Omit<RetentionPolicy, 'id' | 'tenantId' | 'createdAt'>>,
  ) {
    const policy = await this.retentionService.updatePolicy(id, body);
    if (!policy) {
      throw new BadRequestException('Policy not found');
    }

    return {
      success: true,
      data: policy,
    };
  }

  @Delete('policies/:id')
  async deletePolicy(@Param('id') id: string) {
    const deleted = await this.retentionService.deletePolicy(id);

    return {
      success: true,
      data: { deleted },
    };
  }

  // Documents
  @Post('documents')
  async assignDocument(
    @Request() req: any,
    @Body() body: {
      documentId: string;
      documentType: string;
      documentName: string;
      policyId?: string;
    },
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    if (!body.documentId || !body.documentType || !body.documentName) {
      throw new BadRequestException('Document ID, type, and name are required');
    }

    const record = await this.retentionService.assignDocument(
      body.documentId,
      body.documentType,
      body.documentName,
      tenantId,
      body.policyId,
    );

    return {
      success: true,
      data: record,
    };
  }

  @Get('documents')
  async getRetentionRecords(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('documentType') documentType?: string,
    @Query('expiringWithin') expiringWithin?: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    const records = await this.retentionService.getRetentionRecords(tenantId, {
      status,
      documentType,
      expiringWithin: expiringWithin ? parseInt(expiringWithin) : undefined,
    });

    return {
      success: true,
      data: { records },
    };
  }

  // Legal Holds
  @Get('legal-holds')
  async getLegalHolds(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const holds = await this.retentionService.getLegalHolds(tenantId);

    return {
      success: true,
      data: { holds },
    };
  }

  @Post('legal-holds')
  async createLegalHold(
    @Request() req: any,
    @Body() body: {
      name: string;
      reason: string;
      caseReference?: string;
      documentIds: string[];
    },
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const userId = req.user?.id || 'system';

    if (!body.name || !body.reason || !body.documentIds?.length) {
      throw new BadRequestException('Name, reason, and document IDs are required');
    }

    const hold = await this.retentionService.createLegalHold(tenantId, {
      ...body,
      createdBy: userId,
    });

    return {
      success: true,
      data: hold,
    };
  }

  @Post('legal-holds/:id/release')
  async releaseLegalHold(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'system';

    const hold = await this.retentionService.releaseLegalHold(id, userId);
    if (!hold) {
      throw new BadRequestException('Legal hold not found');
    }

    return {
      success: true,
      data: hold,
    };
  }

  // Stats & Reports
  @Get('stats')
  async getRetentionStats(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const stats = await this.retentionService.getRetentionStats(tenantId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('compliance-report')
  async getComplianceReport(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const report = await this.retentionService.getComplianceReport(tenantId);

    return {
      success: true,
      data: report,
    };
  }

  @Get('document-types')
  async getDocumentTypes() {
    return {
      success: true,
      data: {
        types: [
          { id: 'invoice', name: 'Invoice', retention: '10 years' },
          { id: 'receipt', name: 'Receipt', retention: '10 years' },
          { id: 'credit_note', name: 'Credit Note', retention: '10 years' },
          { id: 'debit_note', name: 'Debit Note', retention: '10 years' },
          { id: 'contract', name: 'Contract', retention: '10 years' },
          { id: 'employment_contract', name: 'Employment Contract', retention: '75 years' },
          { id: 'payslip', name: 'Payslip', retention: '75 years' },
          { id: 'vat_return', name: 'VAT Return', retention: '10 years' },
          { id: 'd406', name: 'D406 SAF-T', retention: '10 years' },
          { id: 'efactura', name: 'e-Factura', retention: '10 years' },
          { id: 'consent_form', name: 'GDPR Consent', retention: '5 years' },
          { id: 'audit_report', name: 'Audit Report', retention: '10 years' },
        ],
      },
    };
  }
}
