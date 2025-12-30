import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { SrlRegistrationService } from './srl-registration.service';
import { PfaRegistrationService } from './pfa-registration.service';
import { DocumentGenerationService } from './document-generation.service';
import { OnrcIntegrationService } from './onrc-integration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfModule } from '../pdf/pdf.module';

/**
 * Services Module for DocumentIulia.ro
 *
 * Provides business formation and registration services for Romanian entities:
 * - SRL (Societate cu Răspundere Limitată) - Limited Liability Company
 * - PFA (Persoană Fizică Autorizată) - Authorized Natural Person
 * - Other legal forms (SA, SCS, PF, etc.)
 *
 * Features:
 * - Step-by-step registration wizards
 * - Document generation (Articles of Association, Founding Acts, etc.)
 * - ONRC (Romanian Companies Register) integration
 * - CUI/CIF validation and reservation
 * - Payment processing (€99-€299 per service)
 * - Status tracking and notifications
 *
 * Business Value: Primary revenue driver, high-margin service
 */
@Module({
  imports: [PrismaModule, PdfModule],
  controllers: [ServicesController],
  providers: [
    ServicesService,
    SrlRegistrationService,
    PfaRegistrationService,
    DocumentGenerationService,
    OnrcIntegrationService,
  ],
  exports: [
    ServicesService,
    SrlRegistrationService,
    PfaRegistrationService,
    DocumentGenerationService,
  ],
})
export class ServicesModule {}
