import { Module } from '@nestjs/common';
import { DocumentTemplateService } from './document-template.service';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [],
  controllers: [TemplatesController],
  providers: [DocumentTemplateService],
  exports: [DocumentTemplateService],
})
export class TemplatesModule {}
