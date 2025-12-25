import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { SystemSettingsService } from './system-settings.service';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { UserImpersonationService } from './user-impersonation.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [AdminController, FeatureFlagsController],
  providers: [
    FeatureFlagsService,
    SystemSettingsService,
    PlatformAnalyticsService,
    UserImpersonationService,
  ],
  exports: [
    FeatureFlagsService,
    SystemSettingsService,
    PlatformAnalyticsService,
    UserImpersonationService,
  ],
})
export class AdminModule {}
