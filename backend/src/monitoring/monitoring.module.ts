import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { AlertingService } from './alerting.service';
import { AlertingController } from './alerting.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [MonitoringController, AlertingController],
  providers: [MonitoringService, AlertingService],
  exports: [MonitoringService, AlertingService],
})
export class MonitoringModule {}
