import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RevisalService } from './revisal.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Compliance - REVISAL')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance/revisal')
export class RevisalController {
  constructor(private readonly revisalService: RevisalService) {}

  @Get('employees')
  @ApiOperation({ summary: 'Get employees for REVISAL submission' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getEmployeesForRevisal(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options = {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    };

    const employees = await this.revisalService.getEmployeesForRevisal(
      req.user.sub,
      options,
    );

    return {
      employees,
      count: employees.length,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate REVISAL data before submission' })
  async validateData(@Request() req: any, @Body() body: { employeeIds?: string[] }) {
    const employees = await this.revisalService.getEmployeesForRevisal(req.user.sub);
    const validation = this.revisalService.validateRevisalData(employees);

    return {
      valid: validation.valid,
      errors: validation.errors,
      employeeCount: employees.length,
    };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate REVISAL XML file' })
  async generateXml(
    @Request() req: any,
    @Body() body: {
      companyData: {
        cui: string;
        denumire: string;
        judet: string;
        localitate: string;
        strada: string;
        numar: string;
      };
      employeeIds?: string[];
    },
  ) {
    const employees = await this.revisalService.getEmployeesForRevisal(req.user.sub);

    // Validate first
    const validation = this.revisalService.validateRevisalData(employees);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    const xml = await this.revisalService.generateRevisalXml(
      req.user.sub,
      employees,
      body.companyData,
    );

    return {
      success: true,
      xml,
      employeeCount: employees.length,
      fileName: `revisal_${new Date().toISOString().split('T')[0]}.xml`,
    };
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit REVISAL to ITM' })
  async submit(
    @Request() req: any,
    @Body() body: {
      xmlContent: string;
      employeeCount: number;
    },
  ) {
    const submission = await this.revisalService.submitToITM(
      req.user.sub,
      body.xmlContent,
      body.employeeCount,
    );

    return {
      success: true,
      submission,
      message: 'REVISAL trimis cu succes către ITM',
    };
  }

  @Get('download')
  @ApiOperation({ summary: 'Download generated REVISAL XML' })
  async downloadXml(
    @Request() req: any,
    @Res() res: Response,
    @Query('submissionId') submissionId: string,
  ) {
    const employees = await this.revisalService.getEmployeesForRevisal(req.user.sub);

    // Get user profile for company data
    const user = await this.revisalService['prisma'].user.findUnique({
      where: { id: req.user.sub },
    });

    const xml = await this.revisalService.generateRevisalXml(
      req.user.sub,
      employees,
      {
        cui: user?.cui || 'RO00000000',
        denumire: user?.company || 'Company Name',
        judet: 'Bucuresti',
        localitate: 'Bucuresti',
        strada: 'N/A',
        numar: '1',
      },
    );

    const fileName = `revisal_${new Date().toISOString().split('T')[0]}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(HttpStatus.OK).send(xml);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get REVISAL submission history' })
  async getHistory(@Request() req: any) {
    const history = await this.revisalService.getSubmissionHistory(req.user.sub);
    return { submissions: history };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current REVISAL compliance status' })
  async getStatus(@Request() req: any) {
    const employees = await this.revisalService.getEmployeesForRevisal(req.user.sub);
    const history = await this.revisalService.getSubmissionHistory(req.user.sub);
    const lastSubmission = history[0];

    const pendingChanges = employees.filter(
      emp => emp.tipOperatiune === 'ANGAJARE' || emp.tipOperatiune === 'INCETARE'
    );

    return {
      totalEmployees: employees.length,
      pendingChanges: pendingChanges.length,
      lastSubmission: lastSubmission ? {
        date: lastSubmission.submittedAt,
        employeeCount: lastSubmission.employeeCount,
        status: lastSubmission.status,
      } : null,
      needsSubmission: pendingChanges.length > 0,
      nextDeadline: this.getNextDeadline(),
    };
  }

  private getNextDeadline(): string {
    // REVISAL must be submitted within 24 hours of hiring/termination
    // For regular updates, by the 25th of the following month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 25);
    return nextMonth.toISOString().split('T')[0];
  }
}
