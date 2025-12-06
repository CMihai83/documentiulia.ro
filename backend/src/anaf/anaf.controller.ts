import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnafService } from './anaf.service';
import { SaftService } from './saft.service';
import { EfacturaService } from './efactura.service';

@ApiTags('anaf')
@ApiBearerAuth()
@Controller('anaf')
export class AnafController {
  constructor(
    private readonly anafService: AnafService,
    private readonly saftService: SaftService,
    private readonly efacturaService: EfacturaService,
  ) {}

  @Get('validate-cui/:cui')
  @ApiOperation({ summary: 'Validate Romanian CUI and get company info' })
  async validateCUI(@Param('cui') cui: string) {
    return this.anafService.validateCUI(cui);
  }

  @Post('saft/generate')
  @ApiOperation({ summary: 'Generate SAF-T D406 XML per Order 1783/2021' })
  async generateSAFT(
    @Body() body: { userId: string; period: string },
  ) {
    const xml = await this.saftService.generateD406(body.userId, body.period);
    const sizeValidation = this.saftService.validateXmlSize(xml);
    return { xml, ...sizeValidation };
  }

  @Post('saft/submit')
  @ApiOperation({ summary: 'Submit SAF-T D406 to ANAF SPV' })
  async submitSAFT(
    @Body() body: { xml: string; cui: string; period: string },
  ) {
    return this.anafService.submitSAFT(body.xml, body.cui, body.period);
  }

  @Get('deadlines')
  @ApiOperation({ summary: 'Get ANAF submission deadlines' })
  getDeadlines(@Query('companyType') companyType: 'small' | 'large' | 'non-resident') {
    return this.anafService.getDeadlines(companyType);
  }

  @Post('efactura/generate')
  @ApiOperation({ summary: 'Generate e-Factura UBL XML' })
  generateEfactura(@Body() invoice: any) {
    const xml = this.efacturaService.generateUBL(invoice);
    return { xml };
  }

  @Post('efactura/submit')
  @ApiOperation({ summary: 'Submit e-Factura to ANAF SPV' })
  async submitEfactura(@Body() body: { xml: string; cui: string }) {
    return this.efacturaService.submitToSPV(body.xml, body.cui);
  }

  @Get('efactura/status/:uploadIndex')
  @ApiOperation({ summary: 'Check e-Factura submission status' })
  async checkEfacturaStatus(@Param('uploadIndex') uploadIndex: string) {
    return this.efacturaService.checkStatus(uploadIndex);
  }

  @Get('efactura/received')
  @ApiOperation({ summary: 'Download received e-Facturi' })
  async downloadReceived(@Query('cui') cui: string, @Query('days') days: number) {
    return this.efacturaService.downloadReceived(cui, days);
  }
}
