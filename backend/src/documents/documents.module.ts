import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentAiService } from './document-ai.service';
import { DocumentAiController } from './document-ai.controller';
import { DocumentVersioningService } from './document-versioning.service';
import { DocumentVersioningController } from './document-versioning.controller';

@Module({
  controllers: [DocumentsController, DocumentAiController, DocumentVersioningController],
  providers: [DocumentsService, DocumentAiService, DocumentVersioningService],
  exports: [DocumentsService, DocumentAiService, DocumentVersioningService],
})
export class DocumentsModule {}
