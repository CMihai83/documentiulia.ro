import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { AlertingService } from './alerting.service';
import { AlertingController } from './alerting.controller';
import { ClientLogsService } from './client-logs.service';
import { ClientLogsAdminController, ClientLogsIngestController } from './client-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [MonitoringController, AlertingController, ClientLogsIngestController, ClientLogsAdminController],
  providers: [MonitoringService, AlertingService, ClientLogsService],
  exports: [MonitoringService, AlertingService, ClientLogsService],
})
export class MonitoringModule {}
