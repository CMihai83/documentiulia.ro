import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataImportExportService } from './data-import-export.service';
import { DataImportExportController } from './data-import-export.controller';

@Module({
  imports: [ConfigModule],
  controllers: [DataImportExportController],
  providers: [DataImportExportService],
  exports: [DataImportExportService],
})
export class DataModule {}
