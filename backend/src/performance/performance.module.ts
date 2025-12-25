import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { QueryOptimizerService } from './query-optimizer.service';
import { QueryOptimizerController } from './query-optimizer.controller';
import { BackgroundJobsService } from './background-jobs.service';
import { BackgroundJobsController } from './background-jobs.controller';
import { PerformanceMetricsService } from './performance-metrics.service';
import { PerformanceMetricsController } from './performance-metrics.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
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
