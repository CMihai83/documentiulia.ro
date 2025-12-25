import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FileStorageService } from './file-storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [StorageController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class StorageModule {}
