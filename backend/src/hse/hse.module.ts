import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HSEController } from './hse.controller';
import { HSEService } from './hse.service';
import { IncidentController } from './incident.controller';
import { IncidentService } from './incident.service';
import { HSETrainingController } from './hse-training.controller';
import { HSETrainingService } from './hse-training.service';
import { HSEDashboardController } from './hse-dashboard.controller';
import { HSEDashboardService } from './hse-dashboard.service';
import { HSEPredictiveController } from './hse-predictive.controller';
import { HSEPredictiveService } from './hse-predictive.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [HSEController, IncidentController, HSETrainingController, HSEDashboardController, HSEPredictiveController],
  providers: [HSEService, IncidentService, HSETrainingService, HSEDashboardService, HSEPredictiveService],
  exports: [HSEService, IncidentService, HSETrainingService, HSEDashboardService, HSEPredictiveService],
})
export class HSEModule {}
