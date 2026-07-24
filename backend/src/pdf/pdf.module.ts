import { Module } from '@nestjs/common';
import { PdfGenerationService } from './pdf-generation.service';
import { PdfController } from './pdf.controller';

@Module({
  imports: [],
  controllers: [PdfController],
  providers: [PdfGenerationService],
  exports: [PdfGenerationService],
})
export class PdfModule {}
