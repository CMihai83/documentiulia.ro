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
import { D394Service } from './d394.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Compliance - D394')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance/d394')
export class D394Controller {
  constructor(private readonly d394Service: D394Service) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Get transactions for D394 declaration' })
  @ApiQuery({ name: 'period', required: true, description: 'Period in YYYY-MM format' })
  async getTransactionsForD394(
    @Request() req: any,
    @Query('period') period: string,
  ) {
    const transactions = await this.d394Service.getTransactionsForD394(
      req.user.sub,
      period,
    );
    const totals = this.d394Service.calculateTotals(transactions);

    return {
      period,
      transactions,
      totals,
      count: transactions.length,
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate D394 data before submission' })
  async validateData(
    @Request() req: any,
    @Body() body: { period: string },
  ) {
    const transactions = await this.d394Service.getTransactionsForD394(
      req.user.sub,
      body.period,
    );
    const validation = this.d394Service.validateD394Data(transactions, body.period);
    const totals = this.d394Service.calculateTotals(transactions);

    return {
      valid: validation.valid,
      errors: validation.errors,
      transactionCount: transactions.length,
      totals,
    };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate D394 XML file' })
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
      };
    },
  ) {
    const transactions = await this.d394Service.getTransactionsForD394(
      req.user.sub,
      body.period,
    );

    const validation = this.d394Service.validateD394Data(transactions, body.period);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    const xml = await this.d394Service.generateD394Xml(
      req.user.sub,
      body.period,
      transactions,
      body.companyData,
    );
    const totals = this.d394Service.calculateTotals(transactions);

    return {
      success: true,
      xml,
      totals,
      transactionCount: transactions.length,
      fileName: `d394_${body.period}.xml`,
    };
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit D394 to ANAF' })
  async submit(
    @Request() req: any,
    @Body() body: {
      period: string;
      xmlContent: string;
      totals: {
        totalBazaLivrari: number;
        totalTVAColectata: number;
        totalBazaAchizitii: number;
        totalTVADeductibila: number;
        diferentaTVA: number;
        numarTranzactii: number;
      };
    },
  ) {
    const submission = await this.d394Service.submitToANAF(
      req.user.sub,
      body.period,
      body.xmlContent,
      body.totals,
    );

    return {
      success: true,
      submission,
      message: 'D394 trimis cu succes catre ANAF',
    };
  }

  @Get('download')
  @ApiOperation({ summary: 'Download generated D394 XML' })
  @ApiQuery({ name: 'period', required: true })
  async downloadXml(
    @Request() req: any,
    @Res() res: Response,
    @Query('period') period: string,
  ) {
    const transactions = await this.d394Service.getTransactionsForD394(
      req.user.sub,
      period,
    );

    const user = await this.d394Service['prisma'].user.findUnique({
      where: { id: req.user.sub },
    });

    const xml = await this.d394Service.generateD394Xml(
      req.user.sub,
      period,
      transactions,
      {
        cui: user?.cui || 'RO00000000',
        denumire: user?.company || 'Company Name',
        judet: 'Bucuresti',
        localitate: 'Bucuresti',
        strada: 'N/A',
        numar: '1',
      },
    );

    const fileName = `d394_${period}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(HttpStatus.OK).send(xml);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get D394 submission history' })
  async getHistory(@Request() req: any) {
    const history = await this.d394Service.getSubmissionHistory(req.user.sub);
    return { submissions: history };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get D394 status for a period' })
  @ApiQuery({ name: 'period', required: true })
  async getStatus(
    @Request() req: any,
    @Query('period') period: string,
  ) {
    return await this.d394Service.getStatus(req.user.sub, period);
  }

  @Get('vat-summary')
  @ApiOperation({ summary: 'Get VAT summary for D394' })
  @ApiQuery({ name: 'period', required: true })
  async getVatSummary(
    @Request() req: any,
    @Query('period') period: string,
  ) {
    const transactions = await this.d394Service.getTransactionsForD394(
      req.user.sub,
      period,
    );
    const totals = this.d394Service.calculateTotals(transactions);

    return {
      period,
      tvaColectata: totals.totalTVAColectata,
      tvaDeductibila: totals.totalTVADeductibila,
      diferenta: totals.diferentaTVA,
      status: totals.diferentaTVA > 0 ? 'TVA de plata' : 'TVA de recuperat',
      valoare: Math.abs(totals.diferentaTVA),
    };
  }
}
