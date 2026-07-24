import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [],
  controllers: [StorageController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class StorageModule {}
