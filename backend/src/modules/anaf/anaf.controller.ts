/**
 * ANAF Integration Controller
 * REST endpoints for e-Factura/D406/SAF-T
 *
 * @author DocumentIulia Team
 * @version 1.0.0
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AnafService } from './anaf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import * as path from 'path';

// DTOs
class SubmitEFacturaDto {
  xml: string;
  cui: string;
  standard?: 'FACT1' | 'FCN';
}

class ValidateD406Dto {
  xml: string;
  schema?: 'SAF-T' | 'EFACTURA' | 'D406';
}

class PilotStatusDto {
  cui: string;
  companyType: 'small' | 'non-resident' | 'quarterly' | 'exempt';
}

@ApiTags('ANAF Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/anaf')
export class AnafController {
  private readonly logger = new Logger(AnafController.name);

  constructor(private readonly anafService: AnafService) {}

  /**
   * OAuth Authentication with ANAF
   * POST /api/anaf/auth
   */
  @Post('auth')
  @ApiOperation({ summary: 'Authenticate with ANAF via OAuth 2.0' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async authenticate() {
    this.logger.log('ANAF OAuth authentication request');
    return this.anafService.authenticate();
  }

  /**
   * Submit e-Factura to ANAF SPV
   * POST /api/anaf/submit-efactura
   *
   * Per audit: B2B mandatory mid-2026
   */
  @Post('submit-efactura')
  @ApiOperation({
    summary: 'Submit e-Factura to ANAF SPV',
    description: 'Submit UBL 2.1 XML invoice to ANAF e-Factura system. B2B mandatory mid-2026.',
  })
  @ApiResponse({ status: 200, description: 'e-Factura submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async submitEFactura(@Body() dto: SubmitEFacturaDto) {
    this.logger.log(`Submitting e-Factura for CUI: ${dto.cui}`);
    return this.anafService.submitEFactura(
      dto.xml,
      dto.cui,
      dto.standard || 'FACT1',
    );
  }

  /**
   * Validate D406 XML per Order 1783/2021
   * POST /api/anaf/validate-d406
   */
  @Post('validate-d406')
  @ApiOperation({
    summary: 'Validate D406/SAF-T XML per OPANAF 1783/2021',
    description: 'Validates XML against ANAF schema. Monthly for small/non-residents from Jan 2025.',
  })
  @ApiResponse({ status: 200, description: 'Validation result returned' })
  async validateD406(@Body() dto: ValidateD406Dto) {
    this.logger.log(`Validating XML against schema: ${dto.schema || 'D406'}`);
    return this.anafService.validateD406(dto.xml, dto.schema || 'D406');
  }

  /**
   * Check pilot reconciliation status
   * GET /api/anaf/pilot-status
   *
   * Pilot: Sept 2025 - Aug 2026 with 6-month grace
   */
  @Get('pilot-status')
  @ApiOperation({
    summary: 'Check SAF-T pilot reconciliation status',
    description: 'Returns pilot status for Sept 2025 - Aug 2026 period with 6-month grace.',
  })
  @ApiResponse({ status: 200, description: 'Pilot status returned' })
  async getPilotStatus(
    @Query('cui') cui: string,
    @Query('companyType') companyType: 'small' | 'non-resident' | 'quarterly' | 'exempt',
  ) {
    this.logger.log(`Checking pilot status for CUI: ${cui}, type: ${companyType}`);
    return this.anafService.checkPilotStatus(cui, companyType);
  }

  /**
   * Upload document to ANAF
   * POST /api/anaf/upload
   *
   * Supports PDF/XML <500MB
   */
  @Post('upload')
  @ApiOperation({
    summary: 'Upload PDF/XML document to ANAF',
    description: 'Upload fiscal document to ANAF. Maximum file size: 500MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Document uploaded' })
  @ApiResponse({ status: 400, description: 'File too large or invalid' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/anaf',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf' && ext !== '.xml') {
          return cb(new Error('Only PDF and XML files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Query('documentType') documentType: 'efactura' | 'saft' | 'd406',
    @Query('cui') cui: string,
  ) {
    this.logger.log(`Uploading ${documentType} document for CUI: ${cui}`);
    return this.anafService.uploadDocument(file.path, documentType, cui);
  }

  /**
   * Get submission status
   * GET /api/anaf/status/:indexIncarcare
   */
  @Get('status/:indexIncarcare')
  @ApiOperation({ summary: 'Get e-Factura submission status from ANAF' })
  @ApiResponse({ status: 200, description: 'Status returned' })
  async getSubmissionStatus(@Param('indexIncarcare') indexIncarcare: string) {
    this.logger.log(`Getting status for submission: ${indexIncarcare}`);
    return this.anafService.getSubmissionStatus(indexIncarcare);
  }

  /**
   * VAT rates reference per Law 141/2025
   * GET /api/anaf/vat-rates
   */
  @Get('vat-rates')
  @ApiOperation({
    summary: 'Get current VAT rates per Law 141/2025',
    description: 'Returns valid VAT rates: 21% standard, 11% reduced, 5% special, 0% exempt',
  })
  @ApiResponse({ status: 200, description: 'VAT rates returned' })
  getVatRates() {
    return {
      effectiveDate: '2025-08-01',
      law: 'Law 141/2025',
      rates: [
        {
          rate: 21,
          type: 'standard',
          description: 'Standard rate for most goods and services',
          previousRate: 19,
        },
        {
          rate: 11,
          type: 'reduced',
          description: 'Reduced rate for food, books, medicines, etc.',
          previousRate: 9,
        },
        {
          rate: 5,
          type: 'special',
          description: 'Special rate for social housing, cultural events',
          previousRate: 5,
        },
        {
          rate: 0,
          type: 'exempt',
          description: 'Exempt rate for exports, intra-EU supplies',
          previousRate: 0,
        },
      ],
      source: 'https://legislatie.just.ro/Public/DetaliiDocument/283456',
    };
  }

  /**
   * D406 reporting schedule per Order 1783/2021
   * GET /api/anaf/d406-schedule
   */
  @Get('d406-schedule')
  @ApiOperation({
    summary: 'Get D406 reporting schedule per OPANAF 1783/2021',
    description: 'Returns reporting deadlines for different company types',
  })
  @ApiResponse({ status: 200, description: 'Schedule returned' })
  getD406Schedule() {
    return {
      order: 'OPANAF 1783/2021', // Corrected from 2024 per audit
      schedule: [
        {
          companyType: 'small',
          frequency: 'monthly',
          startDate: '2025-01-01',
          deadline: '25th of following month',
        },
        {
          companyType: 'non-resident',
          frequency: 'monthly',
          startDate: '2025-01-01',
          deadline: '25th of following month',
        },
        {
          companyType: 'quarterly',
          frequency: 'quarterly',
          startDate: '2025-09-01',
          deadline: '25th of month following quarter end',
          pilotPeriod: 'Sept 2025 - Aug 2026',
          gracePeriod: '6 months after pilot',
        },
        {
          companyType: 'large',
          frequency: 'annual',
          startDate: '2026-01-01',
          deadline: 'February 25th',
        },
      ],
      notes: [
        'Pilot reconciliation: Sept 2025 - Aug 2026',
        '6-month grace period after pilot',
        'DUKIntegrator recommended for XML validation',
        'Maximum file size: 500MB for PDF/XML uploads',
      ],
    };
  }
}
