import { Module } from '@nestjs/common';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { PredictiveAnalyticsController } from './predictive-analytics.controller';
import { MobileAnalyticsService } from './mobile-analytics.service';
import { MobileAnalyticsController } from './mobile-analytics.controller';
import { FinancialConsolidationService } from './financial-consolidation.service';
import { FinancialConsolidationController } from './financial-consolidation.controller';
import { ForecastingService } from './forecasting.service';
import { ForecastingController } from './forecasting.controller';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { AnomalyDetectionController } from './anomaly-detection.controller';
import { DashboardAnalyticsService } from './dashboard-analytics.service';
import { DashboardAnalyticsController } from './dashboard-analytics.controller';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AnalyticsController,
    PredictiveAnalyticsController,
    MobileAnalyticsController,
    FinancialConsolidationController,
    ForecastingController,
    AnomalyDetectionController,
    DashboardAnalyticsController,
  ],
  providers: [
    PredictiveAnalyticsService,
    MobileAnalyticsService,
    FinancialConsolidationService,
    ForecastingService,
    AnomalyDetectionService,
    DashboardAnalyticsService,
  ],
  exports: [
    PredictiveAnalyticsService,
    MobileAnalyticsService,
    FinancialConsolidationService,
    ForecastingService,
    AnomalyDetectionService,
    DashboardAnalyticsService,
  ],
})
export class AnalyticsModule {}
