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
  HttpStatus,
  HttpCode,
  Header,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { VatService } from './vat.service';
import { CreateD300DeclarationDto } from './dto/create-d300-declaration.dto';
import { CreateD394DeclarationDto, Quarter } from './dto/create-d394-declaration.dto';
import { VatCalculationService, VatCalculationInput, VatCategory } from './services/vat-calculation.service';

/**
 * VAT Controller
 *
 * API endpoints for Romanian VAT compliance:
 * - D300 monthly VAT returns
 * - D394 quarterly EU transactions summary
 * - VAT calculations (19%/21%, 9%/11%, 5%)
 * - XML generation for ANAF submission
 * - VIES validation for EU transactions
 *
 * All endpoints require authentication (JWT)
 */
@ApiTags('VAT - Romanian Tax Compliance')
@Controller('vat')
@ApiBearerAuth()
export class VatController {
  constructor(
    private vatService: VatService,
    private vatCalculation: VatCalculationService,
  ) {}

  // ============================================================================
  // VAT RATES & INFORMATION
  // ============================================================================

  /**
   * Get current VAT rates
   * GET /api/vat/rates
   */
  @Get('rates')
  @ApiOperation({
    summary: 'Get current VAT rates',
    description: 'Returns current Romanian VAT rates (19%/21%, 9%/11%, 5%) based on Legea 141/2025',
  })
  @ApiResponse({ status: 200, description: 'VAT rates retrieved successfully' })
  getCurrentVatRates() {
    const rates = this.vatCalculation.getCurrentVatRates();
    const rateChangeMessage = this.vatCalculation.getVatRateChangeMessage('ro');

    return {
      success: true,
      data: {
        standard: rates.standard,
        reduced: rates.reduced,
        special: rates.special,
        zero: rates.zero,
        effectiveFrom: rates.effectiveFrom,
        effectiveTo: rates.effectiveTo,
        changeNotice: rateChangeMessage,
      },
    };
  }

  /**
   * Get VAT rates for a specific date
   * GET /api/vat/rates/date
   */
  @Get('rates/date')
  @ApiOperation({
    summary: 'Get VAT rates for a specific date',
    description: 'Returns applicable VAT rates for a transaction date',
  })
  @ApiQuery({ name: 'date', description: 'Transaction date (ISO format)', example: '2025-12-01' })
  @ApiResponse({ status: 200, description: 'VAT rates retrieved successfully' })
  getVatRatesForDate(@Query('date') dateStr: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO format (YYYY-MM-DD)');
    }

    const rates = this.vatCalculation.getVatRates(date);

    return {
      success: true,
      data: rates,
    };
  }

  // ============================================================================
  // VAT CALCULATIONS
  // ============================================================================

  /**
   * Calculate VAT for a transaction
   * POST /api/vat/calculate
   */
  @Post('calculate')
  @ApiOperation({
    summary: 'Calculate VAT for a transaction',
    description: 'Calculate VAT amount, taxable base, and total based on Romanian rates',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 1000 },
        category: { type: 'string', enum: Object.values(VatCategory), example: 'STANDARD' },
        date: { type: 'string', format: 'date', example: '2025-12-01' },
        includesVat: { type: 'boolean', example: false },
        reverseCharge: { type: 'boolean', example: false },
        intraCommunity: { type: 'boolean', example: false },
      },
      required: ['amount', 'category', 'date'],
    },
  })
  @ApiResponse({ status: 200, description: 'VAT calculated successfully' })
  @HttpCode(HttpStatus.OK)
  calculateVat(@Body() input: VatCalculationInput) {
    const result = this.vatCalculation.calculateVat(input);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Calculate VAT for multiple line items
   * POST /api/vat/calculate/bulk
   */
  @Post('calculate/bulk')
  @ApiOperation({
    summary: 'Calculate VAT for multiple items',
    description: 'Calculate VAT for multiple line items with category totals',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              category: { type: 'string', enum: Object.values(VatCategory) },
              date: { type: 'string', format: 'date' },
              includesVat: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'VAT calculated successfully' })
  @HttpCode(HttpStatus.OK)
  calculateVatBulk(@Body() body: { items: VatCalculationInput[] }) {
    const result = this.vatCalculation.calculateVatForItems(body.items);

    return {
      success: true,
      data: result,
    };
  }

  // ============================================================================
  // D300 MONTHLY VAT RETURN ENDPOINTS
  // ============================================================================

  /**
   * Create D300 declaration
   * POST /api/vat/d300
   */
  @Post('d300')
  @ApiOperation({
    summary: 'Create D300 monthly VAT return',
    description: 'Submit a new D300 monthly VAT return declaration',
  })
  @ApiBody({ type: CreateD300DeclarationDto })
  @ApiResponse({ status: 201, description: 'D300 declaration created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or calculation mismatch' })
  @HttpCode(HttpStatus.CREATED)
  async createD300Declaration(@Request() req: any, @Body() body: CreateD300DeclarationDto) {
    const userId = req.user?.id || 'test-user-id';
    const result = await this.vatService.createD300Declaration(userId, body);

    return {
      success: true,
      data: result,
      message: 'Declarația D300 a fost creată cu succes',
    };
  }

  /**
   * Get all D300 declarations for user
   * GET /api/vat/d300
   */
  @Get('d300')
  @ApiOperation({
    summary: 'List D300 declarations',
    description: 'Get all D300 monthly VAT returns for the authenticated user',
  })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by year' })
  @ApiQuery({ name: 'month', required: false, description: 'Filter by month' })
  @ApiResponse({ status: 200, description: 'D300 declarations retrieved successfully' })
  async listD300Declarations(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const userId = req.user?.id || 'test-user-id';
    const declarations = await this.vatService.listD300Declarations(
      userId,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );

    return {
      success: true,
      data: declarations,
      count: declarations.length,
    };
  }

  /**
   * Get D300 declaration by ID
   * GET /api/vat/d300/:id
   */
  @Get('d300/:id')
  @ApiOperation({
    summary: 'Get D300 declaration details',
    description: 'Get details and status of a specific D300 declaration',
  })
  @ApiResponse({ status: 200, description: 'D300 declaration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Declaration not found' })
  async getD300Declaration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const declaration = await this.vatService.getD300Declaration(id, userId);

    return {
      success: true,
      data: declaration,
    };
  }

  /**
   * Update D300 declaration
   * PUT /api/vat/d300/:id
   */
  @Put('d300/:id')
  @ApiOperation({
    summary: 'Update D300 declaration',
    description: 'Update D300 declaration (only in DRAFT status)',
  })
  @ApiResponse({ status: 200, description: 'D300 declaration updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update - declaration already submitted' })
  async updateD300Declaration(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<CreateD300DeclarationDto>,
  ) {
    const userId = req.user?.id || 'test-user-id';
    const declaration = await this.vatService.updateD300Declaration(id, userId, body);

    return {
      success: true,
      data: declaration,
      message: 'Declarația D300 a fost actualizată',
    };
  }

  /**
   * Generate D300 XML
   * GET /api/vat/d300/:id/xml
   */
  @Get('d300/:id/xml')
  @ApiOperation({
    summary: 'Download D300 XML',
    description: 'Generate and download D300 XML file for ANAF submission',
  })
  @ApiResponse({ status: 200, description: 'XML generated successfully' })
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename="d300.xml"')
  async downloadD300Xml(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const xml = await this.vatService.generateD300Xml(id, userId);

    return xml;
  }

  /**
   * Submit D300 to ANAF
   * POST /api/vat/d300/:id/submit
   */
  @Post('d300/:id/submit')
  @ApiOperation({
    summary: 'Submit D300 to ANAF',
    description: 'Submit D300 declaration to ANAF SPV portal',
  })
  @ApiResponse({ status: 200, description: 'Declaration submitted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot submit - validation failed or already submitted' })
  async submitD300ToAnaf(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const result = await this.vatService.submitD300ToAnaf(id, userId);

    return {
      success: true,
      data: result,
      message: 'Declarația D300 a fost trimisă la ANAF',
    };
  }

  /**
   * Delete D300 declaration
   * DELETE /api/vat/d300/:id
   */
  @Delete('d300/:id')
  @ApiOperation({
    summary: 'Delete D300 declaration',
    description: 'Delete a D300 declaration (only DRAFT status)',
  })
  @ApiResponse({ status: 200, description: 'Declaration deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete - declaration already submitted' })
  async deleteD300Declaration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    await this.vatService.deleteD300Declaration(id, userId);

    return {
      success: true,
      message: 'Declarația D300 a fost ștearsă',
    };
  }

  // ============================================================================
  // D394 QUARTERLY VAT RETURN ENDPOINTS
  // ============================================================================

  /**
   * Create D394 declaration
   * POST /api/vat/d394
   */
  @Post('d394')
  @ApiOperation({
    summary: 'Create D394 quarterly VAT return',
    description: 'Submit a new D394 quarterly EU transactions summary',
  })
  @ApiBody({ type: CreateD394DeclarationDto })
  @ApiResponse({ status: 201, description: 'D394 declaration created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or reconciliation mismatch' })
  @HttpCode(HttpStatus.CREATED)
  async createD394Declaration(@Request() req: any, @Body() body: CreateD394DeclarationDto) {
    const userId = req.user?.id || 'test-user-id';
    const result = await this.vatService.createD394Declaration(userId, body);

    return {
      success: true,
      data: result,
      message: 'Declarația D394 a fost creată cu succes',
    };
  }

  /**
   * Get all D394 declarations for user
   * GET /api/vat/d394
   */
  @Get('d394')
  @ApiOperation({
    summary: 'List D394 declarations',
    description: 'Get all D394 quarterly VAT returns for the authenticated user',
  })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by year' })
  @ApiQuery({ name: 'quarter', required: false, description: 'Filter by quarter (1-4)' })
  @ApiResponse({ status: 200, description: 'D394 declarations retrieved successfully' })
  async listD394Declarations(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
  ) {
    const userId = req.user?.id || 'test-user-id';
    const declarations = await this.vatService.listD394Declarations(
      userId,
      year ? parseInt(year) : undefined,
      quarter ? (parseInt(quarter) as Quarter) : undefined,
    );

    return {
      success: true,
      data: declarations,
      count: declarations.length,
    };
  }

  /**
   * Get D394 declaration by ID
   * GET /api/vat/d394/:id
   */
  @Get('d394/:id')
  @ApiOperation({
    summary: 'Get D394 declaration details',
    description: 'Get details and status of a specific D394 declaration',
  })
  @ApiResponse({ status: 200, description: 'D394 declaration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Declaration not found' })
  async getD394Declaration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const declaration = await this.vatService.getD394Declaration(id, userId);

    return {
      success: true,
      data: declaration,
    };
  }

  /**
   * Update D394 declaration
   * PUT /api/vat/d394/:id
   */
  @Put('d394/:id')
  @ApiOperation({
    summary: 'Update D394 declaration',
    description: 'Update D394 declaration (only in DRAFT status)',
  })
  @ApiResponse({ status: 200, description: 'D394 declaration updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update - declaration already submitted' })
  async updateD394Declaration(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<CreateD394DeclarationDto>,
  ) {
    const userId = req.user?.id || 'test-user-id';
    const declaration = await this.vatService.updateD394Declaration(id, userId, body);

    return {
      success: true,
      data: declaration,
      message: 'Declarația D394 a fost actualizată',
    };
  }

  /**
   * Generate D394 XML
   * GET /api/vat/d394/:id/xml
   */
  @Get('d394/:id/xml')
  @ApiOperation({
    summary: 'Download D394 XML',
    description: 'Generate and download D394 XML file for ANAF submission',
  })
  @ApiResponse({ status: 200, description: 'XML generated successfully' })
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename="d394.xml"')
  async downloadD394Xml(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const xml = await this.vatService.generateD394Xml(id, userId);

    return xml;
  }

  /**
   * Submit D394 to ANAF
   * POST /api/vat/d394/:id/submit
   */
  @Post('d394/:id/submit')
  @ApiOperation({
    summary: 'Submit D394 to ANAF',
    description: 'Submit D394 declaration to ANAF SPV portal',
  })
  @ApiResponse({ status: 200, description: 'Declaration submitted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot submit - validation failed or already submitted' })
  async submitD394ToAnaf(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    const result = await this.vatService.submitD394ToAnaf(id, userId);

    return {
      success: true,
      data: result,
      message: 'Declarația D394 a fost trimisă la ANAF',
    };
  }

  /**
   * Delete D394 declaration
   * DELETE /api/vat/d394/:id
   */
  @Delete('d394/:id')
  @ApiOperation({
    summary: 'Delete D394 declaration',
    description: 'Delete a D394 declaration (only DRAFT status)',
  })
  @ApiResponse({ status: 200, description: 'Declaration deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete - declaration already submitted' })
  async deleteD394Declaration(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id || 'test-user-id';
    await this.vatService.deleteD394Declaration(id, userId);

    return {
      success: true,
      message: 'Declarația D394 a fost ștearsă',
    };
  }

  // ============================================================================
  // VIES VALIDATION (EU VAT NUMBER VERIFICATION)
  // ============================================================================

  /**
   * Validate EU VAT ID in VIES
   * GET /api/vat/vies/validate
   */
  @Get('vies/validate')
  @ApiOperation({
    summary: 'Validate EU VAT number in VIES',
    description: 'Verify if an EU VAT number is valid and active in VIES system',
  })
  @ApiQuery({ name: 'vatId', description: 'EU VAT ID (e.g., DE123456789)', example: 'DE123456789' })
  @ApiResponse({ status: 200, description: 'VAT ID validated successfully' })
  async validateVies(@Query('vatId') vatId: string) {
    const result = await this.vatService.validateViesNumber(vatId);

    return {
      success: true,
      data: result,
    };
  }
}
