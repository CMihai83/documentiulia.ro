import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PdfGenerationService } from './pdf-generation.service';
import { PdfController } from './pdf.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [PdfController],
  providers: [PdfGenerationService],
  exports: [PdfGenerationService],
})
export class PdfModule {}
