import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RealtimeDashboardService } from './realtime-dashboard.service';
import { RealtimeDashboardController } from './realtime-dashboard.controller';
import { DashboardBuilderService } from './dashboard-builder.service';
import { DashboardBuilderController } from './dashboard-builder.controller';
import { MobileDashboardService } from './mobile-dashboard.service';
import { MobileDashboardController } from './mobile-dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DashboardController, RealtimeDashboardController, DashboardBuilderController, MobileDashboardController],
  providers: [DashboardService, RealtimeDashboardService, DashboardBuilderService, MobileDashboardService],
  exports: [DashboardService, RealtimeDashboardService, DashboardBuilderService, MobileDashboardService],
})
export class DashboardModule {}
