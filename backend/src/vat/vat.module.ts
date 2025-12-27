import { Module } from '@nestjs/common';
import { VatController } from './vat.controller';
import { VatService } from './vat.service';
import { VatCalculationService } from './services/vat-calculation.service';
import { VatXmlGeneratorService } from './services/vat-xml-generator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AnafModule } from '../anaf/anaf.module';

/**
 * VAT Module
 *
 * Complete Romanian VAT compliance system:
 * - D300 monthly VAT returns
 * - D394 quarterly EU transactions summary
 * - VAT calculations (19%/21%, 9%/11%, 5%)
 * - XML generation for ANAF submission
 * - VIES validation for EU VAT numbers
 *
 * Compliance:
 * - Legea 141/2025 (VAT rate changes effective August 1, 2025)
 * - Order 1783/2021 (SAF-T standard)
 * - ANAF SPV requirements
 * - RO_CIUS UBL 2.1 XML format
 *
 * Usage:
 * 1. Import VatModule in AppModule
 * 2. Add Prisma models for vatD300Declaration and vatD394Declaration
 * 3. Configure ANAF credentials for production submission
 *
 * API Endpoints:
 * - GET /api/vat/rates - Get current VAT rates
 * - POST /api/vat/calculate - Calculate VAT for transaction
 * - POST /api/vat/d300 - Create D300 monthly return
 * - GET /api/vat/d300 - List D300 declarations
 * - GET /api/vat/d300/:id - Get D300 details
 * - PUT /api/vat/d300/:id - Update D300 (DRAFT only)
 * - GET /api/vat/d300/:id/xml - Download D300 XML
 * - POST /api/vat/d300/:id/submit - Submit to ANAF
 * - DELETE /api/vat/d300/:id - Delete D300 (DRAFT only)
 * - POST /api/vat/d394 - Create D394 quarterly return
 * - GET /api/vat/d394 - List D394 declarations
 * - GET /api/vat/d394/:id - Get D394 details
 * - PUT /api/vat/d394/:id - Update D394 (DRAFT only)
 * - GET /api/vat/d394/:id/xml - Download D394 XML
 * - POST /api/vat/d394/:id/submit - Submit to ANAF
 * - DELETE /api/vat/d394/:id - Delete D394 (DRAFT only)
 * - GET /api/vat/vies/validate - Validate EU VAT number
 */
@Module({
  imports: [
    PrismaModule, // Database access
    AnafModule, // ANAF SPV integration
  ],
  controllers: [VatController],
  providers: [
    VatService,
    VatCalculationService,
    VatXmlGeneratorService,
  ],
  exports: [
    VatService,
    VatCalculationService,
    VatXmlGeneratorService,
  ],
})
export class VatModule {}
