import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { ExportService, ReportExportData } from './export.service';

interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

@ApiTags('export')
@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // ===== Invoice Exports =====

  @Get('invoices/excel')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Export invoices to Excel' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async exportInvoicesToExcel(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<void> {
    const buffer = await this.exportService.exportInvoicesToExcel(
      req.user.userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    const filename = `facturi_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get('invoices/:id/pdf')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Export single invoice to PDF' })
  async exportInvoiceToPdf(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Param('id') invoiceId: string,
  ): Promise<void> {
    const buffer = await this.exportService.exportInvoiceToPdf(invoiceId, req.user.userId);

    const filename = `factura_${invoiceId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  // ===== Report Exports =====

  @Post('report/excel')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Export custom report to Excel' })
  async exportReportToExcel(
    @Body() reportData: ReportExportData,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportService.exportReportToExcel(reportData);

    const filename = `raport_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Post('report/pdf')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Export custom report to PDF' })
  async exportReportToPdf(
    @Body() reportData: ReportExportData,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportService.exportReportToPdf(reportData);

    const filename = `raport_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
