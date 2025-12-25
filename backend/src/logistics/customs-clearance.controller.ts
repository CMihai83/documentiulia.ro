import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  CustomsClearanceService,
  DeclarationType,
  DeclarationStatus,
  TransportMode,
  Company,
  CustomsGoods,
  DocumentType,
} from './customs-clearance.service';

// Customs Clearance Controller
// EU/RO border customs with VIES validation, Intrastat, DAU generation

@Controller('logistics/customs')
@UseGuards(ThrottlerGuard)
export class CustomsClearanceController {
  constructor(private readonly customsService: CustomsClearanceService) {}

  // =================== VIES & EORI VALIDATION ===================

  @Post('vies/validate')
  async validateVatNumber(@Body('vatNumber') vatNumber: string) {
    if (!vatNumber) {
      throw new HttpException('VAT number is required', HttpStatus.BAD_REQUEST);
    }
    return this.customsService.validateVatNumber(vatNumber);
  }

  @Post('vies/batch-validate')
  async batchValidateVatNumbers(@Body('vatNumbers') vatNumbers: string[]) {
    if (!vatNumbers || vatNumbers.length === 0) {
      throw new HttpException('VAT numbers are required', HttpStatus.BAD_REQUEST);
    }
    if (vatNumbers.length > 50) {
      throw new HttpException('Maximum 50 VAT numbers per request', HttpStatus.BAD_REQUEST);
    }
    return this.customsService.batchValidateVatNumbers(vatNumbers);
  }

  @Post('eori/validate')
  async validateEoriNumber(@Body('eoriNumber') eoriNumber: string) {
    if (!eoriNumber) {
      throw new HttpException('EORI number is required', HttpStatus.BAD_REQUEST);
    }
    return this.customsService.validateEoriNumber(eoriNumber);
  }

  // =================== HS CODE CLASSIFICATION ===================

  @Get('hs-codes/search')
  searchHSCodes(
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
    }
    return this.customsService.searchHSCodes(query, limit ? parseInt(limit) : 20);
  }

  @Get('hs-codes/:code')
  getHSCode(@Param('code') code: string) {
    const hsCode = this.customsService.getHSCode(code);
    if (!hsCode) {
      throw new HttpException('HS code not found', HttpStatus.NOT_FOUND);
    }
    return hsCode;
  }

  @Post('hs-codes/suggest')
  suggestHSCode(@Body('description') description: string) {
    if (!description) {
      throw new HttpException('Product description is required', HttpStatus.BAD_REQUEST);
    }
    return this.customsService.suggestHSCode(description);
  }

  // =================== TARIFF & DUTIES ===================

  @Get('tariffs/:hsCode')
  getTariff(@Param('hsCode') hsCode: string) {
    const tariff = this.customsService.getTariff(hsCode);
    if (!tariff) {
      throw new HttpException('Tariff not found for HS code', HttpStatus.NOT_FOUND);
    }
    return tariff;
  }

  @Post('duties/calculate')
  calculateDuties(
    @Body('goods') goods: CustomsGoods[],
    @Body('destinationCountry') destinationCountry?: string,
    @Body('preferentialOrigin') preferentialOrigin?: string,
  ) {
    if (!goods || goods.length === 0) {
      throw new HttpException('Goods are required', HttpStatus.BAD_REQUEST);
    }
    return this.customsService.calculateDutiesAndTaxes(
      goods,
      destinationCountry || 'RO',
      preferentialOrigin,
    );
  }

  // =================== CUSTOMS DECLARATIONS ===================

  @Post('declarations')
  createDeclaration(
    @Body() body: {
      type: DeclarationType;
      declarant: Company;
      consignor: Company;
      consignee: Company;
      goods: CustomsGoods[];
      procedureCode: string;
      customsOffice: string;
      transportMode: TransportMode;
      transportDocument?: string;
      containerNumbers?: string[];
    },
  ) {
    if (!body.type || !body.declarant || !body.consignor || !body.consignee) {
      throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
    }
    if (!body.goods || body.goods.length === 0) {
      throw new HttpException('At least one goods item is required', HttpStatus.BAD_REQUEST);
    }
    return this.customsService.createDeclaration(body);
  }

  @Get('declarations')
  listDeclarations(
    @Query('type') type?: DeclarationType,
    @Query('status') status?: DeclarationStatus,
    @Query('declarantId') declarantId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.customsService.listDeclarations({
      type,
      status,
      declarantId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('declarations/:id')
  getDeclaration(@Param('id') id: string) {
    const declaration = this.customsService.getDeclaration(id);
    if (!declaration) {
      throw new HttpException('Declaration not found', HttpStatus.NOT_FOUND);
    }
    return declaration;
  }

  @Get('declarations/lrn/:lrn')
  getDeclarationByLRN(@Param('lrn') lrn: string) {
    const declaration = this.customsService.getDeclarationByLRN(lrn);
    if (!declaration) {
      throw new HttpException('Declaration not found', HttpStatus.NOT_FOUND);
    }
    return declaration;
  }

  @Get('declarations/mrn/:mrn')
  getDeclarationByMRN(@Param('mrn') mrn: string) {
    const declaration = this.customsService.getDeclarationByMRN(mrn);
    if (!declaration) {
      throw new HttpException('Declaration not found', HttpStatus.NOT_FOUND);
    }
    return declaration;
  }

  @Post('declarations/:id/validate')
  validateDeclaration(@Param('id') id: string) {
    const result = this.customsService.validateDeclaration(id);
    if (result.errors.includes('Declaration not found')) {
      throw new HttpException('Declaration not found', HttpStatus.NOT_FOUND);
    }
    return result;
  }

  @Post('declarations/:id/submit')
  submitDeclaration(@Param('id') id: string) {
    const result = this.customsService.submitDeclaration(id);
    if (!result.success) {
      throw new HttpException(result.error!, HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Put('declarations/:id/accept')
  acceptDeclaration(@Param('id') id: string) {
    const declaration = this.customsService.acceptDeclaration(id);
    if (!declaration) {
      throw new HttpException('Declaration not found or cannot be accepted', HttpStatus.BAD_REQUEST);
    }
    return declaration;
  }

  @Put('declarations/:id/release')
  releaseDeclaration(@Param('id') id: string) {
    const declaration = this.customsService.releaseDeclaration(id);
    if (!declaration) {
      throw new HttpException('Declaration not found or cannot be released', HttpStatus.BAD_REQUEST);
    }
    return declaration;
  }

  @Post('declarations/:id/documents')
  addDocument(
    @Param('id') id: string,
    @Body() body: {
      type: DocumentType;
      reference: string;
      issueDate: string;
      expiryDate?: string;
      issuingAuthority?: string;
      filePath?: string;
    },
  ) {
    const document = this.customsService.addDocument(id, {
      type: body.type,
      reference: body.reference,
      issueDate: new Date(body.issueDate),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      issuingAuthority: body.issuingAuthority,
      filePath: body.filePath,
    });
    if (!document) {
      throw new HttpException('Declaration not found', HttpStatus.NOT_FOUND);
    }
    return document;
  }

  @Get('declarations/:id/dau')
  generateDAU(@Param('id') id: string) {
    try {
      const dau = this.customsService.generateDAU(id);
      return { content: dau, format: 'text' };
    } catch (error) {
      throw new HttpException((error as Error).message, HttpStatus.NOT_FOUND);
    }
  }

  // =================== INTRASTAT ===================

  @Post('intrastat')
  createIntrastatDeclaration(
    @Body() body: {
      type: 'ARRIVALS' | 'DISPATCHES';
      period: string;
      reportingCompany: Company;
      items: Array<{
        hsCode: string;
        description: string;
        partnerCountry: string;
        regionOfOrigin?: string;
        transactionNature: string;
        deliveryTerms: string;
        transportMode: TransportMode;
        quantity: number;
        supplementaryUnit?: number;
        supplementaryUnitCode?: string;
        netWeight: number;
        invoiceValue: number;
        statisticalValue: number;
        partnerVatNumber?: string;
      }>;
    },
  ) {
    if (!body.type || !body.period || !body.reportingCompany) {
      throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
    }
    if (!body.items || body.items.length === 0) {
      throw new HttpException('At least one item is required', HttpStatus.BAD_REQUEST);
    }
    return this.customsService.createIntrastatDeclaration(body);
  }

  @Get('intrastat')
  listIntrastatDeclarations(
    @Query('type') type?: 'ARRIVALS' | 'DISPATCHES',
    @Query('period') period?: string,
    @Query('companyId') companyId?: string,
    @Query('status') status?: 'DRAFT' | 'VALIDATED' | 'SUBMITTED' | 'ACCEPTED' | 'CORRECTED',
  ) {
    return this.customsService.listIntrastatDeclarations({
      type,
      period,
      companyId,
      status,
    });
  }

  @Get('intrastat/:id')
  getIntrastatDeclaration(@Param('id') id: string) {
    const declaration = this.customsService.getIntrastatDeclaration(id);
    if (!declaration) {
      throw new HttpException('Intrastat declaration not found', HttpStatus.NOT_FOUND);
    }
    return declaration;
  }

  @Post('intrastat/:id/validate')
  validateIntrastatDeclaration(@Param('id') id: string) {
    const result = this.customsService.validateIntrastatDeclaration(id);
    if (result.errors.includes('Declaration not found')) {
      throw new HttpException('Intrastat declaration not found', HttpStatus.NOT_FOUND);
    }
    return result;
  }

  @Post('intrastat/:id/submit')
  submitIntrastatDeclaration(@Param('id') id: string) {
    const result = this.customsService.submitIntrastatDeclaration(id);
    if (!result.success) {
      throw new HttpException(result.error!, HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Get('intrastat/:id/xml')
  generateIntrastatXML(@Param('id') id: string) {
    try {
      const xml = this.customsService.generateIntrastatXML(id);
      return { content: xml, format: 'xml' };
    } catch (error) {
      throw new HttpException((error as Error).message, HttpStatus.NOT_FOUND);
    }
  }

  // =================== CUSTOMS OFFICES ===================

  @Get('offices')
  getCustomsOffices(
    @Query('country') country?: string,
    @Query('type') type?: 'ENTRY' | 'EXIT' | 'INLAND' | 'TRANSIT',
    @Query('capability') capability?: string,
  ) {
    return this.customsService.getCustomsOffices({ country, type, capability });
  }

  @Get('offices/:code')
  getCustomsOffice(@Param('code') code: string) {
    const office = this.customsService.getCustomsOffice(code);
    if (!office) {
      throw new HttpException('Customs office not found', HttpStatus.NOT_FOUND);
    }
    return office;
  }

  // =================== REFERENCE DATA ===================

  @Get('reference/transaction-nature-codes')
  getTransactionNatureCodes() {
    return this.customsService.getTransactionNatureCodes();
  }

  @Get('reference/delivery-terms')
  getDeliveryTerms() {
    return this.customsService.getDeliveryTerms();
  }

  @Get('reference/vat-rates')
  getEUVatRates() {
    return this.customsService.getEUVatRates();
  }

  // =================== STATISTICS ===================

  @Get('statistics/declarations')
  getDeclarationStatistics(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const period = fromDate && toDate
      ? { from: new Date(fromDate), to: new Date(toDate) }
      : undefined;
    return this.customsService.getDeclarationStatistics(period);
  }

  @Get('statistics/intrastat/:year')
  getIntrastatStatistics(@Param('year') year: string) {
    return this.customsService.getIntrastatStatistics(parseInt(year));
  }
}
