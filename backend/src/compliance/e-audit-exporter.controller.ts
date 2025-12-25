import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { EAuditExporterService, EAuditExportConfig } from './e-audit-exporter.service';

@Controller('compliance/e-audit')
export class EAuditExporterController {
  constructor(private readonly eAuditService: EAuditExporterService) {}

  @Post('export')
  async exportAuditTrail(
    @Request() req: any,
    @Body() body: {
      startDate: string;
      endDate: string;
      format?: 'xml' | 'json' | 'csv' | 'oecd-saf-t';
      includeAttachments?: boolean;
      includeSignatures?: boolean;
      auditStandard?: 'iso27001' | 'soc2' | 'gdpr' | 'anaf' | 'all';
    },
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    if (!body.startDate || !body.endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const config: EAuditExportConfig = {
      tenantId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      format: body.format || 'json',
      includeAttachments: body.includeAttachments,
      includeSignatures: body.includeSignatures,
      auditStandard: body.auditStandard || 'all',
    };

    const exportRecord = await this.eAuditService.exportAuditTrail(config);

    return {
      success: true,
      data: exportRecord,
    };
  }

  @Get('exports')
  async getExportHistory(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const exports = await this.eAuditService.getExportHistory(tenantId);

    return {
      success: true,
      data: { exports },
    };
  }

  @Get('exports/:id')
  async getExport(@Param('id') id: string) {
    const exportRecord = await this.eAuditService.getExport(id);
    if (!exportRecord) {
      throw new BadRequestException('Export not found');
    }

    return {
      success: true,
      data: exportRecord,
    };
  }

  @Post('exports/:id/sign')
  async signExport(
    @Param('id') id: string,
    @Body() body: { signedBy: string; certificate: string },
  ) {
    if (!body.signedBy || !body.certificate) {
      throw new BadRequestException('Signed by and certificate are required');
    }

    const exportRecord = await this.eAuditService.signExport(
      id,
      body.signedBy,
      body.certificate,
    );

    if (!exportRecord) {
      throw new BadRequestException('Export not found');
    }

    return {
      success: true,
      data: exportRecord,
    };
  }

  @Get('integrity')
  async verifyChainIntegrity(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const integrity = await this.eAuditService.verifyChainIntegrity(tenantId);

    return {
      success: true,
      data: integrity,
    };
  }

  @Get('stats')
  async getAuditStats(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const stats = await this.eAuditService.getAuditStats(tenantId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('formats')
  async getSupportedFormats() {
    return {
      success: true,
      data: {
        formats: [
          { id: 'json', name: 'JSON', description: 'Standard JSON format' },
          { id: 'xml', name: 'XML', description: 'XML format for document systems' },
          { id: 'csv', name: 'CSV', description: 'CSV for spreadsheet import' },
          { id: 'oecd-saf-t', name: 'OECD SAF-T', description: 'OECD Standard Audit File format' },
        ],
        auditStandards: [
          { id: 'iso27001', name: 'ISO 27001', description: 'Information Security Management' },
          { id: 'soc2', name: 'SOC 2', description: 'Service Organization Control' },
          { id: 'gdpr', name: 'GDPR', description: 'General Data Protection Regulation' },
          { id: 'anaf', name: 'ANAF', description: 'Romanian Tax Authority requirements' },
          { id: 'all', name: 'All Standards', description: 'Combined comprehensive audit' },
        ],
      },
    };
  }
}
