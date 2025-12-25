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
import { D112Service } from './d112.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Compliance - D112')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance/d112')
export class D112Controller {
  constructor(private readonly d112Service: D112Service) {}

  @Get('employees')
  @ApiOperation({ summary: 'Get employees for D112 declaration' })
  @ApiQuery({ name: 'period', required: true, description: 'Period in YYYY-MM format' })
  async getEmployeesForD112(
    @Request() req: any,
    @Query('period') period: string,
  ) {
    const employees = await this.d112Service.getEmployeesForD112(
      req.user.sub,
      period,
    );
    const totals = this.d112Service.calculateTotals(employees);

    return {
      period,
      employees,
      totals,
      count: employees.length,
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate D112 data before submission' })
  async validateData(
    @Request() req: any,
    @Body() body: { period: string },
  ) {
    const employees = await this.d112Service.getEmployeesForD112(
      req.user.sub,
      body.period,
    );
    const validation = this.d112Service.validateD112Data(employees, body.period);
    const totals = this.d112Service.calculateTotals(employees);

    return {
      valid: validation.valid,
      errors: validation.errors,
      employeeCount: employees.length,
      totals,
    };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate D112 XML file' })
  async generateXml(
    @Request() req: any,
    @Body() body: {
      period: string;
      companyData: {
        cui: string;
        denumire: string;
        judet: string;
        localitate: string;
        strada: string;
        numar: string;
        caen: string;
      };
    },
  ) {
    const employees = await this.d112Service.getEmployeesForD112(
      req.user.sub,
      body.period,
    );

    // Validate first
    const validation = this.d112Service.validateD112Data(employees, body.period);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    const xml = await this.d112Service.generateD112Xml(
      req.user.sub,
      body.period,
      employees,
      body.companyData,
    );
    const totals = this.d112Service.calculateTotals(employees);

    return {
      success: true,
      xml,
      totals,
      employeeCount: employees.length,
      fileName: `d112_${body.period}.xml`,
    };
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit D112 to ANAF' })
  async submit(
    @Request() req: any,
    @Body() body: {
      period: string;
      xmlContent: string;
      totals: {
        totalSalariuBrut: number;
        totalSalariuNet: number;
        totalCAS: number;
        totalCASS: number;
        totalImpozit: number;
        totalCAM: number;
        numarAngajati: number;
      };
    },
  ) {
    const submission = await this.d112Service.submitToANAF(
      req.user.sub,
      body.period,
      body.xmlContent,
      body.totals,
    );

    return {
      success: true,
      submission,
      message: 'D112 trimis cu succes catre ANAF',
    };
  }

  @Get('download')
  @ApiOperation({ summary: 'Download generated D112 XML' })
  @ApiQuery({ name: 'period', required: true })
  async downloadXml(
    @Request() req: any,
    @Res() res: Response,
    @Query('period') period: string,
  ) {
    const employees = await this.d112Service.getEmployeesForD112(
      req.user.sub,
      period,
    );

    // Get user profile for company data
    const user = await this.d112Service['prisma'].user.findUnique({
      where: { id: req.user.sub },
    });

    const xml = await this.d112Service.generateD112Xml(
      req.user.sub,
      period,
      employees,
      {
        cui: user?.cui || 'RO00000000',
        denumire: user?.company || 'Company Name',
        judet: 'Bucuresti',
        localitate: 'Bucuresti',
        strada: 'N/A',
        numar: '1',
        caen: '6201', // Default software dev
      },
    );

    const fileName = `d112_${period}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(HttpStatus.OK).send(xml);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get D112 submission history' })
  async getHistory(@Request() req: any) {
    const history = await this.d112Service.getSubmissionHistory(req.user.sub);
    return { submissions: history };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get D112 status for a period (defaults to current month)' })
  @ApiQuery({ name: 'period', required: false, description: 'Period in YYYY-MM format. Defaults to current month.' })
  async getStatus(
    @Request() req: any,
    @Query('period') period?: string,
  ) {
    return await this.d112Service.getStatus(req.user.sub, period);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get D112 annual summary' })
  @ApiQuery({ name: 'year', required: true })
  async getAnnualSummary(
    @Request() req: any,
    @Query('year') year: string,
  ) {
    const history = await this.d112Service.getSubmissionHistory(req.user.sub);
    const yearSubmissions = history.filter(h => h.period?.startsWith(year));

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, '0');
      const period = `${year}-${month}`;
      const submission = yearSubmissions.find(s => s.period === period);

      return {
        month: period,
        submitted: !!submission,
        totals: submission?.totals || null,
        submittedAt: submission?.submittedAt || null,
      };
    });

    return {
      year,
      monthlyData,
      submittedCount: yearSubmissions.length,
      pendingCount: 12 - yearSubmissions.length,
    };
  }
}
