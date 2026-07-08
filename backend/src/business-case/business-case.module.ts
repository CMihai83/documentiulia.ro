import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentGenerationModule } from '../document-generation/document-generation.module';
import { BusinessCaseController } from './business-case.controller';
import { BusinessCaseService } from './business-case.service';

/**
 * BC-101..107 — Business-Case studio module.
 * ChartService is provided globally (ChartsModule); PDFGeneratorService comes
 * from DocumentGenerationModule (BC-107 deliverable generation).
 */
@Module({
  imports: [PrismaModule, DocumentGenerationModule],
  controllers: [BusinessCaseController],
  providers: [BusinessCaseService],
  exports: [BusinessCaseService],
})
export class BusinessCaseModule {}
