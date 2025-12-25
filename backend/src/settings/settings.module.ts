import { Module } from '@nestjs/common';
import { SettingsManagementService } from './settings-management.service';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [SettingsManagementService],
  exports: [SettingsManagementService],
})
export class SettingsModule {}
