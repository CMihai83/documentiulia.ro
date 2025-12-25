import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { DocumentGeneratorService } from './document-generator.service';
import { TemplateEngineService } from './template-engine.service';
import { PDFGeneratorService } from './pdf-generator.service';
import { ESignatureService } from './e-signature.service';
import { DocumentVersioningService } from './document-versioning.service';
import { DocumentWorkflowService } from './document-workflow.service';

// Controllers
import { DocumentGeneratorController } from './document-generator.controller';
import { TemplateEngineController } from './template-engine.controller';
import { PDFGeneratorController } from './pdf-generator.controller';
import { ESignatureController } from './e-signature.controller';
import { DocumentVersioningController } from './document-versioning.controller';
import { DocumentWorkflowController } from './document-workflow.controller';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    DocumentGeneratorController,
    TemplateEngineController,
    PDFGeneratorController,
    ESignatureController,
    DocumentVersioningController,
    DocumentWorkflowController,
  ],
  providers: [
    DocumentGeneratorService,
    TemplateEngineService,
    PDFGeneratorService,
    ESignatureService,
    DocumentVersioningService,
    DocumentWorkflowService,
  ],
  exports: [
    DocumentGeneratorService,
    TemplateEngineService,
    PDFGeneratorService,
    ESignatureService,
    DocumentVersioningService,
    DocumentWorkflowService,
  ],
})
export class DocumentGenerationModule {}
