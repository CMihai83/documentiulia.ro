import { Module } from '@nestjs/common';
import { QueryOptimizerService } from './query-optimizer.service';
import { QueryOptimizerController } from './query-optimizer.controller';
import { BackgroundJobsService } from './background-jobs.service';
import { BackgroundJobsController } from './background-jobs.controller';
import { PerformanceMetricsService } from './performance-metrics.service';
import { PerformanceMetricsController } from './performance-metrics.controller';

@Module({
  imports: [],
  controllers: [
    QueryOptimizerController,
    BackgroundJobsController,
    PerformanceMetricsController,
  ],
  providers: [
    QueryOptimizerService,
    BackgroundJobsService,
    PerformanceMetricsService,
  ],
  exports: [
    QueryOptimizerService,
    BackgroundJobsService,
    PerformanceMetricsService,
  ],
})
export class PerformanceModule {}
