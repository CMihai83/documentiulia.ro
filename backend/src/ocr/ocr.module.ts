import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OCRService } from './ocr.service';
import { OCRController } from './ocr.controller';
import { TemplateService } from './templates/template.service';
import { TemplateController } from './templates/template.controller';
import { PreprocessingService } from './preprocessing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [OCRController, TemplateController],
  providers: [OCRService, TemplateService, PreprocessingService],
  exports: [OCRService, TemplateService, PreprocessingService],
})
export class OcrModule implements OnModuleInit {
  private readonly logger = new Logger(OcrModule.name);

  constructor(private readonly templateService: TemplateService) {}

  async onModuleInit() {
    this.logger.log('Seeding system OCR templates...');
    await this.templateService.seedSystemTemplates();
    this.logger.log('System OCR templates seeded successfully');
  }
}
