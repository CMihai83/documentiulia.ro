import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PwaService } from './pwa.service';
import { PwaController } from './pwa.controller';
import { OfflineSyncService } from './offline-sync.service';
import { OfflineSyncController } from './offline-sync.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PwaController, OfflineSyncController],
  providers: [PwaService, OfflineSyncService],
  exports: [PwaService, OfflineSyncService],
})
export class PwaModule {}
