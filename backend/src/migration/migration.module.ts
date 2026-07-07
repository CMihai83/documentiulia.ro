import { Module } from '@nestjs/common';
import { MigrationImportService } from './migration-import.service';
import { MigrationImportController } from './migration-import.controller';

@Module({
  controllers: [MigrationImportController],
  providers: [MigrationImportService],
  exports: [MigrationImportService],
})
export class MigrationModule {}
