import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DocumentTemplateService } from './document-template.service';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [TemplatesController],
  providers: [DocumentTemplateService],
  exports: [DocumentTemplateService],
})
export class TemplatesModule {}
